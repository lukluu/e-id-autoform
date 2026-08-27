/**
 * Reset & Kosongkan Seluruh Isi Database Neon PostgreSQL Tanpa Sisa
 */

import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Mengosongkan seluruh isi tabel di database Neon PostgreSQL...");

  // Hapus semua data
  const deletedKtp = await prisma.encryptedKtp.deleteMany({});
  console.log(`- Data KTP terhapus: ${deletedKtp.count}`);

  const deletedCodes = await prisma.recoveryCode.deleteMany({});
  console.log(`- Kode Pemulihan / OTP terhapus: ${deletedCodes.count}`);

  const deletedSettings = await prisma.appSetting.deleteMany({});
  console.log(`- Pengaturan aplikasi terhapus: ${deletedSettings.count}`);

  const deletedUsers = await prisma.user.deleteMany({});
  console.log(`- Akun pengguna terhapus: ${deletedUsers.count}`);

  console.log(`\n✅ Seluruh tabel di database Neon PostgreSQL telah BERSIH TOTAL (0 data)!`);
  console.log(`ℹ️  Jika Anda ingin membuat akun admin awal kembali, jalankan: npm run prisma:seed`);
}

main()
  .catch((e) => {
    console.error("❌ Gagal reset database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
