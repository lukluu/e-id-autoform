/**
 * Universal Web Fetch API Handler untuk Lingkungan Production (Vercel, Nitro, Cloudflare, Node)
 * Menangani seluruh endpoint /api/db/* dan /api/mailtrap/* secara native.
 *
 * Prinsip keamanan:
 * - Endpoint data WAJIB terautentikasi (Bearer token HMAC).
 * - Semua operasi KTP di-scope ke userId dari token (tidak percaya body).
 * - OTP dibuat & diverifikasi di server; kode tidak pernah dikembalikan ke klien.
 * - keyHint dienkripsi at-rest dan hanya dikembalikan lewat endpoint pemulihan ber-OTP.
 */

import { randomUUID } from "node:crypto";
import {
  testNeonConnection,
  initNeonDatabase,
  neonGetUserByIdentifier,
  neonGetUserById,
  neonGetUserByEmail,
  neonGetUserByUsername,
  neonCreateUser,
  neonUpdateUserPassword,
  neonUpdateUserProfile,
  neonGetAllEncryptedKtp,
  neonGetEncryptedKtpById,
  neonSaveEncryptedKtp,
  neonDeleteEncryptedKtp,
  neonDeleteAllEncryptedKtp,
  neonSaveRecoveryCode,
  neonInvalidateRecoveryCodes,
  neonHasRecentRecoveryCode,
  neonVerifyRecoveryCode,
  neonGetSetting,
  neonSetSetting,
  neonResetEntireDatabase,
  toSafeUserRecord,
} from "./neon";
import { sendMailtrapEmail, testMailtrapConnection } from "./mailtrap";
import { sendPasswordResetEmail, sendKeyRecoveryEmail } from "./emails";
import { hashPassword, verifyPassword } from "./password";
import {
  decryptKeyHint,
  encryptKeyHint,
  generateOtp,
  requireAdmin,
  requireAuth,
  signAuthToken,
} from "./auth";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
  formatApiErrorResponse,
} from "./errors/appError";
import type { EncryptedKtpRecord } from "../services/dbService";

const MAX_BODY_BYTES = 1024 * 1024; // 1MB
const OTP_TTL_MS = 15 * 60 * 1000;
const OTP_COOLDOWN_SECONDS = 60;

type JsonObject = Record<string, unknown>;

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function readJson(request: Request): Promise<JsonObject> {
  const contentLength = Number(request.headers.get("content-length") || "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    throw new BadRequestError("Payload request terlalu besar (maksimal 1MB).");
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    throw new BadRequestError("Payload request terlalu besar (maksimal 1MB).");
  }
  if (!raw.trim()) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new BadRequestError("Format JSON body request tidak valid.");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new BadRequestError("Body request harus berupa objek JSON.");
  }

  return parsed as JsonObject;
}

function asObject(value: unknown, field: string): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BadRequestError(`Field "${field}" tidak valid.`);
  }
  return value as JsonObject;
}

function readString(body: JsonObject, key: string): string {
  const value = body[key];
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalString(body: JsonObject, key: string): string | undefined {
  const value = body[key];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function readKtpField(raw: JsonObject, key: string): string {
  const value = raw[key];
  return typeof value === "string" ? value : "";
}

function recordRef(id: string): string {
  return id.length <= 6 ? id : id.slice(-6);
}

export async function handleUniversalApiFetch(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  // /api/mysql/* adalah alias lama untuk /api/db/*.
  const pathname = url.pathname.replace(/^\/api\/mysql\//, "/api/db/");

  if (!pathname.startsWith("/api/")) {
    return null;
  }

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        Allow: "GET, POST, OPTIONS",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    // -----------------------------------------------------------------
    // 1. Status & Inisialisasi Database (publik)
    // -----------------------------------------------------------------
    if (pathname === "/api/db/status" && request.method === "GET") {
      const status = await testNeonConnection();
      return jsonResponse(status);
    }

    if (pathname === "/api/db/init" && request.method === "POST") {
      await initNeonDatabase();
      return jsonResponse({
        success: true,
        message: "Database Neon PostgreSQL berhasil diinisialisasi.",
      });
    }

    // -----------------------------------------------------------------
    // 2. Autentikasi (publik)
    // -----------------------------------------------------------------
    if (pathname === "/api/db/auth-login" && request.method === "POST") {
      const body = await readJson(request);
      const identifier = readString(body, "identifier");
      const password = typeof body["password"] === "string" ? body["password"] : "";

      if (!identifier || !password) {
        throw new ValidationError("Email/username dan kata sandi wajib diisi.");
      }

      const user = await neonGetUserByIdentifier(identifier);
      const verification = verifyPassword(password, user?.password);

      if (!user || !verification.valid) {
        throw new UnauthorizedError("Email/username atau kata sandi yang dimasukkan salah.");
      }

      if (verification.needsRehash) {
        try {
          await neonUpdateUserPassword(user.id, hashPassword(password));
        } catch (rehashError) {
          console.warn("[AUTH] Gagal upgrade hash password:", (rehashError as Error).message);
        }
      }

      const role = user.role || "user";
      const { token, expiresAt } = signAuthToken(user.id, role);

      return jsonResponse({
        success: true,
        token,
        expiresAt,
        user: toSafeUserRecord(user),
      });
    }

    if (pathname === "/api/db/auth-register" && request.method === "POST") {
      const body = await readJson(request);
      const name = readString(body, "name");
      const email = readString(body, "email").toLowerCase();
      const password = typeof body["password"] === "string" ? body["password"] : "";
      const username = readOptionalString(body, "username")?.toLowerCase();
      const phone = readOptionalString(body, "phone");
      const address = readOptionalString(body, "address");

      if (!name) throw new ValidationError("Nama lengkap wajib diisi.");
      if (name.length > 100) throw new ValidationError("Nama lengkap maksimal 100 karakter.");
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new ValidationError("Format email tidak valid.");
      }
      if (email.length > 100) throw new ValidationError("Email maksimal 100 karakter.");
      if (password.length < 6) throw new ValidationError("Kata sandi minimal 6 karakter.");
      if (password.length > 255) {
        throw new ValidationError("Kata sandi terlalu panjang (maksimal 255 karakter).");
      }
      if (username) {
        if (username.length < 3 || username.length > 50) {
          throw new ValidationError("Username harus 3-50 karakter.");
        }
        if (!/^[a-z0-9._-]+$/.test(username)) {
          throw new ValidationError(
            "Username hanya boleh berisi huruf, angka, titik, garis bawah, atau strip.",
          );
        }
      }

      const existingEmail = await neonGetUserByEmail(email);
      if (existingEmail) {
        throw new ConflictError("Email sudah terdaftar. Silakan login atau reset kata sandi.");
      }
      if (username) {
        const existingUsername = await neonGetUserByUsername(username);
        if (existingUsername) {
          throw new ConflictError("Username sudah digunakan oleh pengguna lain.");
        }
      }

      const user = await neonCreateUser({
        name,
        email,
        password: hashPassword(password),
        username: username || null,
        phone: phone || null,
        address: address || null,
        role: "user",
      });

      const { token, expiresAt } = signAuthToken(user.id, user.role || "user");

      return jsonResponse(
        {
          success: true,
          token,
          expiresAt,
          user: toSafeUserRecord(user),
        },
        201,
      );
    }

    if (pathname === "/api/db/auth-forgot-password" && request.method === "POST") {
      const body = await readJson(request);
      const email = readString(body, "email").toLowerCase();

      if (!email) throw new ValidationError("Email wajib diisi.");

      const genericResponse = {
        success: true,
        message:
          "Jika email tersebut terdaftar, kode verifikasi telah dikirim. Periksa kotak masuk Anda.",
      };

      const user = await neonGetUserByEmail(email);
      if (!user) {
        return jsonResponse(genericResponse);
      }

      const recent = await neonHasRecentRecoveryCode(
        email,
        "PASSWORD_RESET",
        OTP_COOLDOWN_SECONDS,
      );
      if (recent) {
        return jsonResponse({
          ...genericResponse,
          message: "Kode verifikasi baru saja dikirim. Tunggu 1 menit sebelum meminta ulang.",
        });
      }

      const code = generateOtp();
      const now = new Date();
      await neonInvalidateRecoveryCodes(email, "PASSWORD_RESET");
      await neonSaveRecoveryCode({
        id: randomUUID(),
        type: "PASSWORD_RESET",
        email,
        code,
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + OTP_TTL_MS).toISOString(),
        used: false,
      });

      const delivery = await sendPasswordResetEmail(email, code);
      if (!delivery.sent) {
        console.warn("[AUTH] Gagal mengirim email reset kata sandi:", delivery.error);
        if (process.env["NODE_ENV"] !== "production") {
          console.log(`[AUTH DEV ONLY] OTP reset untuk ${email}: ${code}`);
        }
      }

      return jsonResponse({ ...genericResponse, emailSent: delivery.sent });
    }

    if (pathname === "/api/db/auth-reset-password" && request.method === "POST") {
      const body = await readJson(request);
      const email = readString(body, "email").toLowerCase();
      const code = readString(body, "code");
      const newPassword = typeof body["newPassword"] === "string" ? body["newPassword"] : "";

      if (!email || !code) throw new ValidationError("Email dan kode OTP wajib diisi.");
      if (newPassword.length < 6) throw new ValidationError("Kata sandi baru minimal 6 karakter.");
      if (newPassword.length > 255) {
        throw new ValidationError("Kata sandi terlalu panjang (maksimal 255 karakter).");
      }

      const user = await neonGetUserByEmail(email);
      if (!user) {
        throw new ValidationError("Kode verifikasi salah atau sudah kedaluwarsa.");
      }

      const verified = await neonVerifyRecoveryCode(email, code, "PASSWORD_RESET");
      if (!verified.valid) {
        throw new ValidationError("Kode verifikasi salah atau sudah kedaluwarsa (berlaku 15 menit).");
      }

      await neonUpdateUserPassword(user.id, hashPassword(newPassword));

      return jsonResponse({
        success: true,
        message: "Kata sandi berhasil diperbarui. Silakan login dengan kata sandi baru.",
      });
    }

    // -----------------------------------------------------------------
    // 3. Akun Pengguna (terautentikasi)
    // -----------------------------------------------------------------
    if (
      (pathname === "/api/db/auth-me" || pathname === "/api/db/user-get") &&
      (request.method === "GET" || request.method === "POST")
    ) {
      const context = requireAuth(request);
      const user = await neonGetUserById(context.userId);
      if (!user) {
        throw new UnauthorizedError("Akun tidak ditemukan atau sudah dihapus. Silakan login kembali.");
      }
      return jsonResponse({ success: true, user: toSafeUserRecord(user) });
    }

    if (pathname === "/api/db/user-update-profile" && request.method === "POST") {
      const context = requireAuth(request);
      const body = await readJson(request);
      const rawProfile = body["user"] !== undefined ? asObject(body["user"], "user") : body;

      const updatePayload: {
        name?: string;
        username?: string | null;
        phone?: string | null;
        address?: string | null;
        avatar?: string | null;
      } = {};

      if (typeof rawProfile["name"] === "string") updatePayload.name = rawProfile["name"].trim();
      if (typeof rawProfile["username"] === "string" || rawProfile["username"] === null) {
        updatePayload.username =
          typeof rawProfile["username"] === "string" ? rawProfile["username"].trim() : null;
      }
      if (typeof rawProfile["phone"] === "string" || rawProfile["phone"] === null) {
        updatePayload.phone =
          typeof rawProfile["phone"] === "string" ? rawProfile["phone"].trim() : null;
      }
      if (typeof rawProfile["address"] === "string" || rawProfile["address"] === null) {
        updatePayload.address =
          typeof rawProfile["address"] === "string" ? rawProfile["address"].trim() : null;
      }
      if (typeof rawProfile["avatar"] === "string" || rawProfile["avatar"] === null) {
        updatePayload.avatar =
          typeof rawProfile["avatar"] === "string" ? rawProfile["avatar"].trim() : null;
      }

      if (updatePayload.name !== undefined && !updatePayload.name) {
        throw new ValidationError("Nama lengkap tidak boleh kosong.");
      }

      const updated = await neonUpdateUserProfile(context.userId, updatePayload);
      if (!updated) throw new NotFoundError("Akun tidak ditemukan.");

      return jsonResponse({ success: true, user: toSafeUserRecord(updated) });
    }

    if (pathname === "/api/db/user-update-password" && request.method === "POST") {
      const context = requireAuth(request);
      const body = await readJson(request);
      const currentPassword =
        typeof body["currentPassword"] === "string" ? body["currentPassword"] : "";
      const newPassword = typeof body["newPassword"] === "string" ? body["newPassword"] : "";

      if (!currentPassword) throw new ValidationError("Kata sandi saat ini wajib diisi.");
      if (newPassword.length < 6) throw new ValidationError("Kata sandi baru minimal 6 karakter.");
      if (newPassword.length > 255) {
        throw new ValidationError("Kata sandi terlalu panjang (maksimal 255 karakter).");
      }

      const user = await neonGetUserById(context.userId);
      if (!user) throw new UnauthorizedError("Akun tidak ditemukan. Silakan login kembali.");

      const verification = verifyPassword(currentPassword, user.password);
      if (!verification.valid) {
        throw new UnauthorizedError("Kata sandi saat ini salah.");
      }

      await neonUpdateUserPassword(user.id, hashPassword(newPassword));

      return jsonResponse({ success: true, message: "Kata sandi berhasil diperbarui." });
    }

    // -----------------------------------------------------------------
    // 4. Dokumen KTP Terenkripsi (terautentikasi, owner-scoped)
    // -----------------------------------------------------------------
    if (
      pathname === "/api/db/ktp-list" &&
      (request.method === "GET" || request.method === "POST")
    ) {
      const context = requireAuth(request);
      const records = await neonGetAllEncryptedKtp(context.userId);
      return jsonResponse({ success: true, records });
    }

    if (pathname === "/api/db/ktp-save" && request.method === "POST") {
      const context = requireAuth(request);
      const body = await readJson(request);
      const raw = asObject(body["record"], "record");

      const id = readKtpField(raw, "id").trim();
      const iv = readKtpField(raw, "iv").trim();
      const keyChecksum = readKtpField(raw, "keyChecksum").trim();

      if (!id) throw new ValidationError("ID Dokumen KTP wajib diisi.");
      if (!iv || !keyChecksum) {
        throw new ValidationError("Parameter enkripsi (IV dan Key Checksum) tidak lengkap.");
      }

      const record: EncryptedKtpRecord = {
        id,
        userId: context.userId,
        provinsi: readKtpField(raw, "provinsi"),
        kabupatenKota: readKtpField(raw, "kabupatenKota"),
        nik: readKtpField(raw, "nik"),
        nama: readKtpField(raw, "nama"),
        tempatLahir: readKtpField(raw, "tempatLahir"),
        tanggalLahir: readKtpField(raw, "tanggalLahir"),
        jenisKelamin: readKtpField(raw, "jenisKelamin"),
        golonganDarah: readKtpField(raw, "golonganDarah"),
        alamat: readKtpField(raw, "alamat"),
        rt: readKtpField(raw, "rt"),
        rw: readKtpField(raw, "rw"),
        kelurahanDesa: readKtpField(raw, "kelurahanDesa"),
        kecamatan: readKtpField(raw, "kecamatan"),
        agama: readKtpField(raw, "agama"),
        statusPerkawinan: readKtpField(raw, "statusPerkawinan"),
        pekerjaan: readKtpField(raw, "pekerjaan"),
        kewarganegaraan: readKtpField(raw, "kewarganegaraan"),
        berlakuHingga: readKtpField(raw, "berlakuHingga"),
        iv,
        keyChecksum,
        createdAt:
          typeof raw["createdAt"] === "string" && raw["createdAt"]
            ? (raw["createdAt"] as string)
            : new Date().toISOString(),
      };

      const displayNama = readOptionalString(raw, "displayNama");
      if (displayNama) record.displayNama = displayNama;

      const keyHint = readOptionalString(raw, "keyHint");
      if (keyHint) record.keyHint = encryptKeyHint(keyHint);

      await neonSaveEncryptedKtp(record, context.userId);
      return jsonResponse({ success: true });
    }

    if (pathname === "/api/db/ktp-delete" && request.method === "POST") {
      const context = requireAuth(request);
      const body = await readJson(request);
      const id = readString(body, "id");
      if (!id) throw new ValidationError("ID Dokumen KTP wajib diisi.");

      await neonDeleteEncryptedKtp(id, context.userId);
      return jsonResponse({ success: true });
    }

    if (pathname === "/api/db/ktp-delete-all" && request.method === "POST") {
      const context = requireAuth(request);
      const deleted = await neonDeleteAllEncryptedKtp(context.userId);
      return jsonResponse({
        success: true,
        deleted,
        message: `${deleted} dokumen KTP milik Anda telah dihapus.`,
      });
    }

    // -----------------------------------------------------------------
    // 5. Pemulihan Kunci (terautentikasi + OTP via email)
    // -----------------------------------------------------------------
    if (pathname === "/api/db/key-recovery-request" && request.method === "POST") {
      const context = requireAuth(request);
      const body = await readJson(request);
      const recordId = readString(body, "recordId");

      if (!recordId) throw new ValidationError("ID Dokumen KTP wajib diisi.");

      const user = await neonGetUserById(context.userId);
      if (!user) throw new UnauthorizedError("Akun tidak ditemukan. Silakan login kembali.");

      const record = await neonGetEncryptedKtpById(recordId, context.userId);
      if (!record) throw new NotFoundError("Dokumen KTP tidak ditemukan atau bukan milik Anda.");
      if (!record.keyHint) {
        throw new NotFoundError("Dokumen ini tidak memiliki data pemulihan kunci enkripsi.");
      }

      if (!user.email) throw new ValidationError("Akun tidak memiliki alamat email.");

      const recent = await neonHasRecentRecoveryCode(
        user.email,
        "KEY_RECOVERY",
        OTP_COOLDOWN_SECONDS,
      );
      if (recent) {
        return jsonResponse({
          success: true,
          emailSent: true,
          message: "Kode pemulihan baru saja dikirim. Tunggu 1 menit sebelum meminta ulang.",
        });
      }

      const code = generateOtp();
      const now = new Date();
      await neonInvalidateRecoveryCodes(user.email, "KEY_RECOVERY");
      await neonSaveRecoveryCode({
        id: randomUUID(),
        type: "KEY_RECOVERY",
        email: user.email,
        code,
        payload: { recordId: record.id },
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + OTP_TTL_MS).toISOString(),
        used: false,
      });

      const delivery = await sendKeyRecoveryEmail(user.email, {
        displayName: record.displayNama || "Subjek KTP",
        recordRef: recordRef(record.id),
        code,
      });

      if (!delivery.sent) {
        console.warn("[AUTH] Gagal mengirim email pemulihan kunci:", delivery.error);
        if (process.env["NODE_ENV"] !== "production") {
          console.log(`[AUTH DEV ONLY] OTP pemulihan kunci untuk ${user.email}: ${code}`);
        }
      }

      return jsonResponse({
        success: true,
        emailSent: delivery.sent,
        message: `Kode pemulihan telah dikirim ke email (${user.email}).`,
      });
    }

    if (pathname === "/api/db/key-recovery" && request.method === "POST") {
      const context = requireAuth(request);
      const body = await readJson(request);
      const recordId = readString(body, "recordId");
      const code = readString(body, "code");

      if (!recordId || !code) throw new ValidationError("ID dokumen dan kode OTP wajib diisi.");

      const user = await neonGetUserById(context.userId);
      if (!user) throw new UnauthorizedError("Akun tidak ditemukan. Silakan login kembali.");

      const record = await neonGetEncryptedKtpById(recordId, context.userId);
      if (!record) throw new NotFoundError("Dokumen KTP tidak ditemukan atau bukan milik Anda.");

      const verified = await neonVerifyRecoveryCode(user.email, code, "KEY_RECOVERY");
      if (!verified.valid) {
        throw new ValidationError("Kode pemulihan salah atau sudah kedaluwarsa.");
      }

      const payloadRecordId = verified.payload?.["recordId"];
      if (typeof payloadRecordId === "string" && payloadRecordId !== record.id) {
        throw new ValidationError("Kode pemulihan tidak berlaku untuk dokumen ini.");
      }

      const keyHint = decryptKeyHint(record.keyHint);
      if (!keyHint) {
        throw new NotFoundError("Kunci rahasia tidak ditemukan untuk dokumen ini.");
      }

      return jsonResponse({ success: true, keyHint });
    }

    // -----------------------------------------------------------------
    // 6. Pengaturan Sistem (get: user login, set/reset: admin)
    // -----------------------------------------------------------------
    if (pathname === "/api/db/setting-get" && request.method === "POST") {
      requireAuth(request);
      const body = await readJson(request);
      const key = readString(body, "key");
      if (!key) throw new ValidationError("Key pengaturan wajib diisi.");
      const value = await neonGetSetting(key);
      return jsonResponse({ success: true, value });
    }

    if (pathname === "/api/db/setting-set" && request.method === "POST") {
      requireAdmin(request);
      const body = await readJson(request);
      const key = readString(body, "key");
      const value = typeof body["value"] === "string" ? body["value"] : "";
      if (!key) throw new ValidationError("Key pengaturan wajib diisi.");
      await neonSetSetting(key, value);
      return jsonResponse({ success: true });
    }

    if (pathname === "/api/db/reset-database" && request.method === "POST") {
      requireAdmin(request);
      await neonResetEntireDatabase();
      return jsonResponse({ success: true, message: "Seluruh isi database berhasil direset." });
    }

    // -----------------------------------------------------------------
    // 7. Layanan SMTP Mailtrap (admin-only, konfigurasi dari env)
    // -----------------------------------------------------------------
    if (pathname === "/api/mailtrap/send" && request.method === "POST") {
      requireAdmin(request);
      const body = await readJson(request);
      const to = readString(body, "to");
      const subject = readString(body, "subject");
      const html = typeof body["html"] === "string" ? body["html"] : "";

      if (!to || !subject || !html) {
        throw new ValidationError("Field to, subject, dan html wajib diisi.");
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
        throw new ValidationError("Alamat email tujuan tidak valid.");
      }

      const result = await sendMailtrapEmail({ to, subject, html });
      return jsonResponse(result);
    }

    if (pathname === "/api/mailtrap/test" && request.method === "POST") {
      requireAdmin(request);
      const result = await testMailtrapConnection();
      return jsonResponse(result);
    }

    return null;
  } catch (err) {
    const { statusCode, response } = formatApiErrorResponse(err);
    console.error(
      `[API FETCH ERROR ${statusCode}] [${request.method}] ${pathname}:`,
      response.error.message,
    );
    return jsonResponse(response, statusCode);
  }
}
