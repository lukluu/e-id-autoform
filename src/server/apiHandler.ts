/**
 * Universal Web Fetch API Handler untuk Lingkungan Production (Vercel, Nitro, Cloudflare, Node)
 * Menangani seluruh endpoint /api/db/* dan /api/mailtrap/* secara native
 */

import {
  testNeonConnection,
  initNeonDatabase,
  neonGetUserByIdentifier,
  neonGetUserById,
  neonCreateUser,
  neonUpdateUserPassword,
  neonUpdateUserProfile,
  neonGetAllEncryptedKtp,
  neonSaveEncryptedKtp,
  neonDeleteEncryptedKtp,
  neonSaveRecoveryCode,
  neonVerifyRecoveryCode,
  neonGetSetting,
  neonSetSetting,
  neonResetEntireDatabase,
} from "./neon";
import { sendMailtrapEmail, testMailtrapConnection } from "./mailtrap";
import { formatApiErrorResponse } from "./errors/appError";

export async function handleUniversalApiFetch(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (!pathname.startsWith("/api/")) {
    return null;
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  try {
    // 1. Status & Inisialisasi Database
    if (pathname === "/api/db/status" || pathname === "/api/mysql/status") {
      const status = await testNeonConnection();
      return json(status);
    }

    if ((pathname === "/api/db/init" || pathname === "/api/mysql/init") && request.method === "POST") {
      await initNeonDatabase();
      return json({ success: true, message: "Database Neon PostgreSQL berhasil diinisialisasi." });
    }

    // 2. Operasi User Akun
    if ((pathname === "/api/db/user-get" || pathname === "/api/mysql/user-get") && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as Record<string, any>;
      const identifier = body.identifier || body.email || body.username;
      if (identifier) {
        const user = await neonGetUserByIdentifier(identifier);
        return json({ success: true, user });
      }
      if (body.id) {
        const user = await neonGetUserById(body.id);
        return json({ success: true, user });
      }
      return json({ success: true, user: null });
    }

    if ((pathname === "/api/db/user-create" || pathname === "/api/mysql/user-create") && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as Record<string, any>;
      const user = await neonCreateUser(body.user);
      return json({ success: true, user });
    }

    if (
      (pathname === "/api/db/user-update-password" || pathname === "/api/mysql/user-update-password") &&
      request.method === "POST"
    ) {
      const body = (await request.json().catch(() => ({}))) as Record<string, any>;
      const updated = await neonUpdateUserPassword(body.email, body.passwordHash);
      return json({ success: updated });
    }

    if (
      (pathname === "/api/db/user-update-profile" || pathname === "/api/mysql/user-update-profile") &&
      request.method === "POST"
    ) {
      const body = (await request.json().catch(() => ({}))) as Record<string, any>;
      const user = await neonUpdateUserProfile(body.user);
      return json({ success: Boolean(user), user });
    }

    // 3. Dokumen KTP Terenkripsi
    if (pathname === "/api/db/ktp-list" || pathname === "/api/mysql/ktp-list") {
      const records = await neonGetAllEncryptedKtp();
      return json({ success: true, records });
    }

    if ((pathname === "/api/db/ktp-save" || pathname === "/api/mysql/ktp-save") && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as Record<string, any>;
      await neonSaveEncryptedKtp(body.record);
      return json({ success: true });
    }

    if ((pathname === "/api/db/ktp-delete" || pathname === "/api/mysql/ktp-delete") && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as Record<string, any>;
      const deleted = await neonDeleteEncryptedKtp(body.id);
      return json({ success: deleted });
    }

    // 4. Recovery Code / OTP
    if ((pathname === "/api/db/recovery-save" || pathname === "/api/mysql/recovery-save") && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as Record<string, any>;
      await neonSaveRecoveryCode(body.record);
      return json({ success: true });
    }

    if (
      (pathname === "/api/db/recovery-verify" || pathname === "/api/mysql/recovery-verify") &&
      request.method === "POST"
    ) {
      const body = (await request.json().catch(() => ({}))) as Record<string, any>;
      const result = await neonVerifyRecoveryCode(body.email, body.code, body.type);
      return json({ success: true, ...result });
    }

    // 5. Pengaturan Sistem & Reset
    if ((pathname === "/api/db/setting-get" || pathname === "/api/mysql/setting-get") && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as Record<string, any>;
      const value = await neonGetSetting(body.key);
      return json({ success: true, value });
    }

    if ((pathname === "/api/db/setting-set" || pathname === "/api/mysql/setting-set") && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as Record<string, any>;
      await neonSetSetting(body.key, body.value);
      return json({ success: true });
    }

    if (
      (pathname === "/api/db/reset-database" || pathname === "/api/mysql/reset-database") &&
      request.method === "POST"
    ) {
      await neonResetEntireDatabase();
      return json({ success: true, message: "Seluruh isi database berhasil direset." });
    }

    // 6. Layanan SMTP Mailtrap
    if (pathname === "/api/mailtrap/send" && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as Record<string, any>;
      const result = await sendMailtrapEmail(body as any);
      return json(result);
    }

    if (pathname === "/api/mailtrap/test" && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as Record<string, any>;
      const result = await testMailtrapConnection(body.config);
      return json(result);
    }

    return null;
  } catch (err) {
    const { statusCode, response } = formatApiErrorResponse(err);
    console.error(`[API FETCH ERROR ${statusCode}] [${request.method}] ${pathname}:`, response.error.message);
    return json(response, statusCode);
  }
}
