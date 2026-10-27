/**
 * Prisma Database Seeder for Neon PostgreSQL
 *
 * Seeder TIDAK lagi membuat akun admin dengan kata sandi hardcoded.
 * Akun admin hanya dibuat jika SEED_ADMIN_EMAIL dan SEED_ADMIN_PASSWORD
 * diisi secara eksplisit melalui environment variable.
 */

import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { hashPassword } from "../src/server/password.ts";

dotenv.config();

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env["SEED_ADMIN_EMAIL"]?.toLowerCase().trim() || "";
const ADMIN_PASSWORD = process.env["SEED_ADMIN_PASSWORD"] || "";
const ADMIN_NAME = process.env["SEED_ADMIN_NAME"]?.trim() || "Administrator Sistem";
const ADMIN_USERNAME = process.env["SEED_ADMIN_USERNAME"]?.toLowerCase().trim() || "admin";

async function seedAdmin(): Promise<void> {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.log(
      "ℹ️  SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD tidak diset — akun admin tidak dibuat.",
    );
    console.log(
      "   Untuk membuat admin: set kedua variabel tersebut lalu jalankan ulang `npm run prisma:seed`.",
    );
    return;
  }

  if (ADMIN_PASSWORD.length < 8) {
    throw new Error("SEED_ADMIN_PASSWORD minimal 8 karakter.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ADMIN_EMAIL)) {
    throw new Error("SEED_ADMIN_EMAIL tidak valid.");
  }

  const passwordHash = hashPassword(ADMIN_PASSWORD);

  const adminUser = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      name: ADMIN_NAME,
      username: ADMIN_USERNAME,
      password: passwordHash,
      role: "admin",
      emailVerifiedAt: new Date(),
      updatedAt: new Date(),
    },
    create: {
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      username: ADMIN_USERNAME,
      password: passwordHash,
      role: "admin",
      emailVerifiedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log(`✅ Akun admin siap: ${adminUser.email} (ID: ${adminUser.id})`);
  console.log(`   - Username: ${adminUser.username}`);
  console.log(`   - Role: ${adminUser.role}`);
  console.log("   - Password: (sesuai SEED_ADMIN_PASSWORD, tidak ditampilkan)");
}

async function main(): Promise<void> {
  console.log("🌱 Menjalankan Seeder Database Neon PostgreSQL...");

  await seedAdmin();

  // Seed default application settings
  await prisma.appSetting.upsert({
    where: { settingKey: "system_initialized" },
    update: {
      settingValue: "true",
      updatedAt: new Date(),
    },
    create: {
      settingKey: "system_initialized",
      settingValue: "true",
      updatedAt: new Date(),
    },
  });

  console.log("✅ App Settings default berhasil diinisialisasi.");
  console.log("🎉 Seeding Neon PostgreSQL selesai dengan sukses!");
}

main()
  .catch((e) => {
    console.error("❌ Gagal menjalankan seeder:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
