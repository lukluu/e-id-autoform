/**
 * Backend Node.js Database Layer Powered by Prisma ORM & Neon Serverless PostgreSQL
 * Integrated with Structured AppError Handling
 * Database: Neon Cloud (ap-southeast-1 AWS Singapore)
 *
 * Catatan keamanan:
 * - Semua operasi KTP WAJIB menyertakan userId pemilik (owner-scoped).
 * - keyHint tidak pernah dikembalikan oleh endpoint list.
 * - Password hanya keluar dari layer ini untuk kebutuhan verifikasi login.
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "./db/prisma.ts";
import type { UserRecord, EncryptedKtpRecord, RecoveryCodeRecord } from "../services/dbService.ts";
import {
  handlePrismaError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
} from "./errors/appError.ts";

export type SafeUserRecord = Omit<UserRecord, "password" | "passwordHash">;

export interface CreateUserInput {
  name: string;
  email: string;
  /** Password yang SUDAH di-hash (scrypt). */
  password: string;
  username?: string | null;
  phone?: string | null;
  address?: string | null;
  role?: string;
  avatar?: string | null;
  emailVerifiedAt?: string | null;
}

/**
 * Uji koneksi live ke database Neon PostgreSQL via Prisma
 */
export async function testNeonConnection(): Promise<{
  connected: boolean;
  driver: string;
  database: string;
  host: string;
  error?: string;
}> {
  try {
    await prisma.$queryRaw`SELECT 1 as connected;`;

    const host = process.env["DATABASE_URL"]
      ? process.env["DATABASE_URL"].split("@")[1]?.split("/")[0] || "neon.tech"
      : "neon.tech";

    return {
      connected: true,
      driver: "neon_postgres",
      database: "neondb",
      host,
    };
  } catch (err) {
    const parsed = handlePrismaError(err);
    return {
      connected: false,
      driver: "neon_postgres",
      database: "neondb",
      host: "neon.tech",
      error: parsed.message,
    };
  }
}

/**
 * Inisialisasi awal database (hanya jika tabel pengaturan sistem kosong)
 */
export async function initNeonDatabase(): Promise<void> {
  try {
    await prisma.appSetting.upsert({
      where: { settingKey: "system_initialized" },
      update: { settingValue: "true", updatedAt: new Date() },
      create: { settingKey: "system_initialized", settingValue: "true", updatedAt: new Date() },
    });
  } catch (err) {
    console.warn("[Neon Init Warning]:", (err as Error).message);
  }
}

// -------------------------------------------------------------------------
// USER OPERATIONS DENGAN PRISMA ORM
// -------------------------------------------------------------------------

interface UserRow {
  id: string;
  name: string;
  email: string;
  username: string | null;
  password: string;
  phone: string | null;
  address: string | null;
  role: string;
  avatar: string | null;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function mapUserRecord(user: UserRow): UserRecord {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    password: user.password,
    passwordHash: user.password,
    phone: user.phone,
    address: user.address,
    role: user.role,
    avatar: user.avatar,
    emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

/** Bentuk user aman untuk dikirim ke klien (tanpa hash password). */
export function toSafeUserRecord(user: UserRecord): SafeUserRecord {
  const { password: _password, passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

export async function neonGetUserByIdentifier(identifier: string): Promise<UserRecord | null> {
  if (!identifier || !identifier.trim()) {
    throw new ValidationError("Email atau username wajib diisi.");
  }

  const clean = identifier.toLowerCase().trim();
  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: clean }, { username: clean }],
      },
    });

    if (!user) return null;
    return mapUserRecord(user);
  } catch (err) {
    throw handlePrismaError(err);
  }
}

export async function neonGetUserByEmail(email: string): Promise<UserRecord | null> {
  if (!email || !email.trim()) {
    throw new ValidationError("Email pengguna wajib diisi.");
  }

  const cleanEmail = email.toLowerCase().trim();
  try {
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) return null;
    return mapUserRecord(user);
  } catch (err) {
    throw handlePrismaError(err);
  }
}

export async function neonGetUserByUsername(username: string): Promise<UserRecord | null> {
  if (!username || !username.trim()) {
    throw new ValidationError("Username wajib diisi.");
  }

  const cleanUsername = username.toLowerCase().trim();
  try {
    const user = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (!user) return null;
    return mapUserRecord(user);
  } catch (err) {
    throw handlePrismaError(err);
  }
}

export async function neonGetUserById(id: string): Promise<UserRecord | null> {
  if (!id || !id.trim()) {
    throw new ValidationError("ID pengguna wajib diisi.");
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: id.trim() },
    });

    if (!user) return null;
    return mapUserRecord(user);
  } catch (err) {
    throw handlePrismaError(err);
  }
}

export async function neonCreateUser(user: CreateUserInput): Promise<UserRecord> {
  if (!user.name || !user.name.trim()) {
    throw new ValidationError("Nama lengkap wajib diisi.");
  }
  if (!user.email || !user.email.trim()) {
    throw new ValidationError("Email wajib diisi.");
  }
  if (!user.password) {
    throw new ValidationError("Kata sandi akun wajib diisi.");
  }

  const cleanEmail = user.email.toLowerCase().trim();
  const cleanUsername = user.username?.trim().toLowerCase() || null;

  try {
    const created = await prisma.user.create({
      data: {
        name: user.name.trim(),
        email: cleanEmail,
        username: cleanUsername,
        password: user.password,
        phone: user.phone || null,
        address: user.address || null,
        role: user.role || "user",
        avatar: user.avatar || null,
        emailVerifiedAt: user.emailVerifiedAt ? new Date(user.emailVerifiedAt) : null,
      },
    });

    return mapUserRecord(created);
  } catch (err) {
    throw handlePrismaError(err);
  }
}

export async function neonUpdateUserPassword(userId: string, passwordHash: string): Promise<boolean> {
  if (!userId || !userId.trim()) {
    throw new ValidationError("ID pengguna wajib diisi.");
  }
  if (!passwordHash) {
    throw new ValidationError("Kata sandi baru wajib diisi.");
  }

  try {
    await prisma.user.update({
      where: { id: userId.trim() },
      data: {
        password: passwordHash,
        updatedAt: new Date(),
      },
    });
    return true;
  } catch (err) {
    throw handlePrismaError(err);
  }
}

export async function neonUpdateUserProfile(
  userId: string,
  user: Partial<Pick<UserRecord, "name" | "username" | "phone" | "address" | "avatar">>,
): Promise<UserRecord | null> {
  if (!userId || !userId.trim()) {
    throw new ValidationError("ID pengguna wajib diisi.");
  }

  const data: Prisma.UserUpdateInput = { updatedAt: new Date() };

  if (user.name !== undefined) data.name = user.name.trim();
  if (user.username !== undefined) {
    const cleanUsername = user.username?.trim().toLowerCase() || "";
    data.username = cleanUsername || null;
  }
  if (user.phone !== undefined) data.phone = user.phone || null;
  if (user.address !== undefined) data.address = user.address || null;
  if (user.avatar !== undefined) data.avatar = user.avatar || null;

  try {
    const updated = await prisma.user.update({
      where: { id: userId.trim() },
      data,
    });
    return mapUserRecord(updated);
  } catch (err) {
    throw handlePrismaError(err);
  }
}

// -------------------------------------------------------------------------
// ENCRYPTED KTP OPERATIONS DENGAN PRISMA ORM (OWNER-SCOPED)
// -------------------------------------------------------------------------

interface KtpRow {
  id: string;
  userId: string | null;
  provinsi: string;
  kabupatenKota: string;
  nik: string;
  nama: string;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: string;
  golonganDarah: string;
  alamat: string;
  rt: string;
  rw: string;
  kelurahanDesa: string;
  kecamatan: string;
  agama: string;
  statusPerkawinan: string;
  pekerjaan: string;
  kewarganegaraan: string;
  berlakuHingga: string;
  iv: string;
  keyChecksum: string;
  keyHint: string | null;
  displayNama: string | null;
  createdAt: Date;
}

function mapKtpRecord(row: KtpRow, includeKeyHint = false): EncryptedKtpRecord {
  const record: EncryptedKtpRecord = {
    id: row.id,
    userId: row.userId || undefined,
    provinsi: row.provinsi,
    kabupatenKota: row.kabupatenKota,
    nik: row.nik,
    nama: row.nama,
    tempatLahir: row.tempatLahir,
    tanggalLahir: row.tanggalLahir,
    jenisKelamin: row.jenisKelamin,
    golonganDarah: row.golonganDarah,
    alamat: row.alamat,
    rt: row.rt,
    rw: row.rw,
    kelurahanDesa: row.kelurahanDesa,
    kecamatan: row.kecamatan,
    agama: row.agama,
    statusPerkawinan: row.statusPerkawinan,
    pekerjaan: row.pekerjaan,
    kewarganegaraan: row.kewarganegaraan,
    berlakuHingga: row.berlakuHingga,
    iv: row.iv,
    keyChecksum: row.keyChecksum,
    displayNama: row.displayNama || undefined,
    createdAt: row.createdAt.toISOString(),
  };

  if (includeKeyHint && row.keyHint) {
    record.keyHint = row.keyHint;
  }

  return record;
}

interface KtpPersistData {
  id: string;
  userId: string;
  provinsi: string;
  kabupatenKota: string;
  nik: string;
  nama: string;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: string;
  golonganDarah: string;
  alamat: string;
  rt: string;
  rw: string;
  kelurahanDesa: string;
  kecamatan: string;
  agama: string;
  statusPerkawinan: string;
  pekerjaan: string;
  kewarganegaraan: string;
  berlakuHingga: string;
  iv: string;
  keyChecksum: string;
  keyHint: string | null;
  displayNama: string | null;
  createdAt: Date;
}

function buildKtpData(record: EncryptedKtpRecord, userId: string): KtpPersistData {
  return {
    id: record.id,
    userId,
    provinsi: record.provinsi || "",
    kabupatenKota: record.kabupatenKota || "",
    nik: record.nik || "",
    nama: record.nama || "",
    tempatLahir: record.tempatLahir || "",
    tanggalLahir: record.tanggalLahir || "",
    jenisKelamin: record.jenisKelamin || "",
    golonganDarah: record.golonganDarah || "",
    alamat: record.alamat || "",
    rt: record.rt || "",
    rw: record.rw || "",
    kelurahanDesa: record.kelurahanDesa || "",
    kecamatan: record.kecamatan || "",
    agama: record.agama || "",
    statusPerkawinan: record.statusPerkawinan || "",
    pekerjaan: record.pekerjaan || "",
    kewarganegaraan: record.kewarganegaraan || "",
    berlakuHingga: record.berlakuHingga || "",
    iv: record.iv,
    keyChecksum: record.keyChecksum,
    keyHint: record.keyHint || null,
    displayNama: record.displayNama || null,
    createdAt: record.createdAt ? new Date(record.createdAt) : new Date(),
  };
}

export async function neonSaveEncryptedKtp(
  record: EncryptedKtpRecord,
  userId: string,
): Promise<void> {
  if (!record.id || !record.id.trim()) {
    throw new ValidationError("ID Dokumen KTP wajib diisi.");
  }
  if (!record.iv || !record.keyChecksum) {
    throw new ValidationError("Parameter enkripsi (IV dan Key Checksum) tidak lengkap.");
  }
  if (!userId || !userId.trim()) {
    throw new ValidationError("Pemilik dokumen KTP tidak valid.");
  }

  try {
    const owner = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!owner) {
      throw new ForbiddenError("Akun pemilik dokumen tidak ditemukan atau sudah dihapus.");
    }

    const existing = await prisma.encryptedKtp.findUnique({
      where: { id: record.id.trim() },
      select: { userId: true },
    });
    if (existing && existing.userId !== userId) {
      throw new ForbiddenError("Anda tidak berhak mengubah dokumen milik pengguna lain.");
    }

    const data = buildKtpData({ ...record, id: record.id.trim() }, userId);

    await prisma.encryptedKtp.upsert({
      where: { id: data.id },
      update: {
        userId: data.userId,
        provinsi: data.provinsi,
        kabupatenKota: data.kabupatenKota,
        nik: data.nik,
        nama: data.nama,
        tempatLahir: data.tempatLahir,
        tanggalLahir: data.tanggalLahir,
        jenisKelamin: data.jenisKelamin,
        golonganDarah: data.golonganDarah,
        alamat: data.alamat,
        rt: data.rt,
        rw: data.rw,
        kelurahanDesa: data.kelurahanDesa,
        kecamatan: data.kecamatan,
        agama: data.agama,
        statusPerkawinan: data.statusPerkawinan,
        pekerjaan: data.pekerjaan,
        kewarganegaraan: data.kewarganegaraan,
        berlakuHingga: data.berlakuHingga,
        iv: data.iv,
        keyChecksum: data.keyChecksum,
        keyHint: data.keyHint,
        displayNama: data.displayNama,
      },
      create: { ...data },
    });
  } catch (err) {
    throw handlePrismaError(err);
  }
}

export async function neonGetAllEncryptedKtp(userId: string): Promise<EncryptedKtpRecord[]> {
  if (!userId || !userId.trim()) {
    throw new ValidationError("ID pengguna wajib diisi.");
  }

  try {
    const rows = await prisma.encryptedKtp.findMany({
      where: { userId: userId.trim() },
      orderBy: { createdAt: "desc" },
    });

    // keyHint sengaja TIDAK disertakan pada list.
    return rows.map((row) => mapKtpRecord(row));
  } catch (err) {
    throw handlePrismaError(err);
  }
}

export async function neonGetEncryptedKtpById(
  id: string,
  userId: string,
): Promise<EncryptedKtpRecord | null> {
  if (!id || !id.trim()) {
    throw new ValidationError("ID Dokumen KTP wajib diisi.");
  }

  try {
    const row = await prisma.encryptedKtp.findFirst({
      where: { id: id.trim(), userId },
    });
    if (!row) return null;
    return mapKtpRecord(row, true);
  } catch (err) {
    throw handlePrismaError(err);
  }
}

export async function neonDeleteEncryptedKtp(id: string, userId: string): Promise<boolean> {
  if (!id || !id.trim()) {
    throw new ValidationError("ID Dokumen KTP yang ingin dihapus wajib diisi.");
  }

  try {
    const result = await prisma.encryptedKtp.deleteMany({
      where: { id: id.trim(), userId },
    });
    if (result.count === 0) {
      throw new NotFoundError("Dokumen KTP tidak ditemukan atau bukan milik Anda.");
    }
    return true;
  } catch (err) {
    throw handlePrismaError(err);
  }
}

export async function neonDeleteAllEncryptedKtp(userId: string): Promise<number> {
  if (!userId || !userId.trim()) {
    throw new ValidationError("ID pengguna wajib diisi.");
  }

  try {
    const result = await prisma.encryptedKtp.deleteMany({
      where: { userId: userId.trim() },
    });
    return result.count;
  } catch (err) {
    throw handlePrismaError(err);
  }
}

// -------------------------------------------------------------------------
// RECOVERY CODES OPERATIONS DENGAN PRISMA ORM
// -------------------------------------------------------------------------

export async function neonSaveRecoveryCode(record: RecoveryCodeRecord): Promise<void> {
  if (!record.email || !record.code) {
    throw new ValidationError("Email dan kode pemulihan wajib diisi.");
  }

  try {
    await prisma.recoveryCode.create({
      data: {
        ...(record.id ? { id: record.id } : {}),
        type: record.type,
        email: record.email.toLowerCase().trim(),
        code: record.code,
        ...(record.payload
          ? { payload: record.payload as unknown as Prisma.InputJsonValue }
          : {}),
        createdAt: new Date(record.createdAt),
        expiresAt: new Date(record.expiresAt),
        used: record.used,
      },
    });
  } catch (err) {
    throw handlePrismaError(err);
  }
}

/** Tandai semua kode lama sebagai terpakai agar hanya kode terbaru yang berlaku. */
export async function neonInvalidateRecoveryCodes(
  email: string,
  type: "PASSWORD_RESET" | "KEY_RECOVERY",
): Promise<void> {
  try {
    await prisma.recoveryCode.updateMany({
      where: { email: email.toLowerCase().trim(), type, used: false },
      data: { used: true },
    });
  } catch (err) {
    throw handlePrismaError(err);
  }
}

/** Cegah spam OTP: cek apakah ada kode yang dibuat dalam N detik terakhir. */
export async function neonHasRecentRecoveryCode(
  email: string,
  type: "PASSWORD_RESET" | "KEY_RECOVERY",
  windowSeconds: number,
): Promise<boolean> {
  try {
    const since = new Date(Date.now() - windowSeconds * 1000);
    const recent = await prisma.recoveryCode.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        type,
        createdAt: { gte: since },
      },
      select: { id: true },
    });
    return Boolean(recent);
  } catch (err) {
    throw handlePrismaError(err);
  }
}

export async function neonVerifyRecoveryCode(
  email: string,
  code: string,
  type: "PASSWORD_RESET" | "KEY_RECOVERY",
): Promise<{ valid: boolean; payload?: Record<string, unknown> }> {
  if (!email || !code) {
    throw new ValidationError("Email dan kode OTP wajib diisi untuk verifikasi.");
  }

  const cleanEmail = email.toLowerCase().trim();
  const now = new Date();

  try {
    const record = await prisma.recoveryCode.findFirst({
      where: {
        email: cleanEmail,
        code: code.trim(),
        type,
        used: false,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      return { valid: false };
    }

    await prisma.recoveryCode.update({
      where: { id: record.id },
      data: { used: true },
    });

    return {
      valid: true,
      payload: (record.payload as Record<string, unknown>) || undefined,
    };
  } catch (err) {
    throw handlePrismaError(err);
  }
}

// -------------------------------------------------------------------------
// APP SETTINGS
// -------------------------------------------------------------------------

export async function neonGetSetting(key: string): Promise<string | null> {
  if (!key) return null;
  try {
    const setting = await prisma.appSetting.findUnique({
      where: { settingKey: key },
    });
    return setting ? setting.settingValue : null;
  } catch (err) {
    throw handlePrismaError(err);
  }
}

export async function neonSetSetting(key: string, value: string): Promise<void> {
  if (!key) throw new ValidationError("Key pengaturan wajib diisi.");
  try {
    await prisma.appSetting.upsert({
      where: { settingKey: key },
      update: { settingValue: value, updatedAt: new Date() },
      create: { settingKey: key, settingValue: value, updatedAt: new Date() },
    });
  } catch (err) {
    throw handlePrismaError(err);
  }
}

// -------------------------------------------------------------------------
// RESET & BULK OPERATIONS
// -------------------------------------------------------------------------

export async function neonClearAllTables(): Promise<void> {
  try {
    await prisma.encryptedKtp.deleteMany({});
    await prisma.recoveryCode.deleteMany({});
    await prisma.appSetting.deleteMany({});
    await prisma.user.deleteMany({});
  } catch (err) {
    throw handlePrismaError(err);
  }
}

export async function neonResetEntireDatabase(): Promise<void> {
  await neonClearAllTables();
}
