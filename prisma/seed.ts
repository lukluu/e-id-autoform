/**
 * Prisma Database Seeder for Neon PostgreSQL
 * Seeds default administrator account
 */

import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Menjalankan Seeder Database Neon PostgreSQL...");

  // Seed default admin user
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@blowfish-ktp.id" },
    update: {
      name: "Peneliti Kriptografi KTP",
      username: "admin",
      password: "h_234bf995", // password default: admin123
      phone: "081234567890",
      address: "Pusat Riset Kriptografi Nasional",
      role: "admin",
      emailVerifiedAt: new Date(),
      updatedAt: new Date(),
    },
    create: {
      name: "Peneliti Kriptografi KTP",
      email: "admin@blowfish-ktp.id",
      username: "admin",
      password: "h_234bf995",
      phone: "081234567890",
      address: "Pusat Riset Kriptografi Nasional",
      role: "admin",
      emailVerifiedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log(`✅ User Admin Default berhasil disiapkan: ${adminUser.email} (ID: ${adminUser.id})`);
  console.log(`   - Username: ${adminUser.username}`);
  console.log(`   - Role: ${adminUser.role}`);
  console.log(`   - Password: admin123`);

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
