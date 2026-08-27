/**
 * Backend Node.js Database Layer Powered by Prisma ORM & Neon Serverless PostgreSQL
 * Integrated with Structured AppError Handling
 * Database: Neon Cloud (ap-southeast-1 AWS Singapore)
 */

import { prisma } from "./db/prisma.ts";
import type { UserRecord, EncryptedKtpRecord, RecoveryCodeRecord } from "../services/dbService.ts";
import {
  handlePrismaError,
  ValidationError,
  NotFoundError,
  BadRequestError,
} from "./errors/appError.ts";

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
    // Jalankan query raw SELECT 1 untuk verifikasi koneksi live
    await prisma.$queryRaw`SELECT 1 as connected;`;

    const host = process.env.DATABASE_URL
      ? process.env.DATABASE_URL.split("@")[1]?.split("/")[0] || "neon.tech"
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
      host: "ep-withered-salad-az5r7iqs-pooler.c-3.ap-southeast-1.aws.neon.tech",
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

function mapUserRecord(user: {
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
}): UserRecord {
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

export async function neonGetUserByIdentifier(identifier: string): Promise<UserRecord | null> {
  if (!identifier || !identifier.trim()) {
    throw new ValidationError("Email atau username wajib diisi.");
  }

  const clean = identifier.toLowerCase().trim();
  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: clean },
          { username: clean },
        ],
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

export async function neonCreateUser(user: UserRecord): Promise<UserRecord> {
  if (!user.name || !user.name.trim()) {
    throw new ValidationError("Nama lengkap wajib diisi.");
  }
  if (!user.email || !user.email.trim()) {
    throw new ValidationError("Email wajib diisi.");
  }
  const cleanEmail = user.email.toLowerCase().trim();
  const cleanUsername = user.username?.trim().toLowerCase() || null;
  const passwordValue = user.password || user.passwordHash || "";

  if (!passwordValue) {
    throw new ValidationError("Kata sandi akun wajib diisi.");
  }

  try {
    const created = await prisma.user.upsert({
      where: { email: cleanEmail },
      update: {
        name: user.name.trim(),
        username: cleanUsername,
        password: passwordValue,
        phone: user.phone || null,
        address: user.address || null,
        role: user.role || "user",
        avatar: user.avatar || null,
        emailVerifiedAt: user.emailVerifiedAt ? new Date(user.emailVerifiedAt) : null,
        updatedAt: new Date(),
      },
      create: {
        id: user.id || undefined,
        name: user.name.trim(),
        email: cleanEmail,
        username: cleanUsername,
        password: passwordValue,
        phone: user.phone || null,
        address: user.address || null,
        role: user.role || "user",
        avatar: user.avatar || null,
        emailVerifiedAt: user.emailVerifiedAt ? new Date(user.emailVerifiedAt) : null,
        createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
        updatedAt: new Date(),
      },
    });

    return mapUserRecord(created);
  } catch (err) {
    throw handlePrismaError(err);
  }
}

export async function neonUpdateUserPassword(email: string, passwordHash: string): Promise<boolean> {
  if (!email || !email.trim()) {
    throw new ValidationError("Email pengguna wajib diisi.");
  }
  if (!passwordHash) {
    throw new ValidationError("Kata sandi baru wajib diisi.");
  }

  const cleanEmail = email.toLowerCase().trim();

  try {
    await prisma.user.update({
      where: { email: cleanEmail },
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
  user: Partial<UserRecord> & { email: string }
): Promise<UserRecord | null> {
  if (!user.email || !user.email.trim()) {
    throw new ValidationError("Email pengguna wajib disertakan untuk pembaruan profil.");
  }

  const cleanEmail = user.email.toLowerCase().trim();
  const cleanUsername = user.username ? user.username.trim().toLowerCase() : undefined;

  try {
    const updated = await prisma.user.update({
      where: { email: cleanEmail },
      data: {
        name: user.name ? user.name.trim() : undefined,
        username: cleanUsername,
        phone: user.phone !== undefined ? user.phone : undefined,
        address: user.address !== undefined ? user.address : undefined,
        avatar: user.avatar !== undefined ? user.avatar : undefined,
        updatedAt: new Date(),
      },
    });
    return mapUserRecord(updated);
  } catch (err) {
    throw handlePrismaError(err);
  }
}

// -------------------------------------------------------------------------
// ENCRYPTED KTP OPERATIONS DENGAN PRISMA ORM
// -------------------------------------------------------------------------

export async function neonSaveEncryptedKtp(record: EncryptedKtpRecord): Promise<void> {
  if (!record.id || !record.id.trim()) {
    throw new ValidationError("ID Dokumen KTP wajib diisi.");
  }
  if (!record.iv || !record.keyChecksum) {
    throw new ValidationError("Parameter enkripsi (IV dan Key Checksum) tidak lengkap.");
  }

  try {
    let validUserId: string | null = null;
    if (record.userId) {
      const existingUser = await prisma.user.findUnique({
        where: { id: record.userId },
      });
      if (existingUser) {
        validUserId = existingUser.id;
      }
    }

    await prisma.encryptedKtp.upsert({
      where: { id: record.id },
      update: {
        userId: validUserId,
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
      },
      create: {
        id: record.id,
        userId: validUserId,
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
      },
    });
  } catch (err) {
    throw handlePrismaError(err);
  }
}

export async function neonGetAllEncryptedKtp(): Promise<EncryptedKtpRecord[]> {
  try {
    const rows = await prisma.encryptedKtp.findMany({
      orderBy: { createdAt: "desc" },
    });

    return rows.map((r) => ({
      id: r.id,
      userId: r.userId || undefined,
      provinsi: r.provinsi,
      kabupatenKota: r.kabupatenKota,
      nik: r.nik,
      nama: r.nama,
      tempatLahir: r.tempatLahir,
      tanggalLahir: r.tanggalLahir,
      jenisKelamin: r.jenisKelamin,
      golonganDarah: r.golonganDarah,
      alamat: r.alamat,
      rt: r.rt,
      rw: r.rw,
      kelurahanDesa: r.kelurahanDesa,
      kecamatan: r.kecamatan,
      agama: r.agama,
      statusPerkawinan: r.statusPerkawinan,
      pekerjaan: r.pekerjaan,
      kewarganegaraan: r.kewarganegaraan,
      berlakuHingga: r.berlakuHingga,
      iv: r.iv,
      keyChecksum: r.keyChecksum,
      keyHint: r.keyHint || undefined,
      displayNama: r.displayNama || undefined,
      createdAt: r.createdAt.toISOString(),
    }));
  } catch (err) {
    throw handlePrismaError(err);
  }
}

export async function neonDeleteEncryptedKtp(id: string): Promise<boolean> {
  if (!id || !id.trim()) {
    throw new ValidationError("ID Dokumen KTP yang ingin dihapus wajib diisi.");
  }

  try {
    await prisma.encryptedKtp.delete({
      where: { id: id.trim() },
    });
    return true;
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
        id: record.id || undefined,
        type: record.type,
        email: record.email.toLowerCase().trim(),
        code: record.code,
        payload: (record.payload as any) || undefined,
        createdAt: new Date(record.createdAt),
        expiresAt: new Date(record.expiresAt),
        used: record.used,
      },
    });
  } catch (err) {
    throw handlePrismaError(err);
  }
}

export async function neonVerifyRecoveryCode(
  email: string,
  code: string,
  type: "PASSWORD_RESET" | "KEY_RECOVERY"
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
