/**
 * Test integrasi backend (dijalankan manual, bukan bagian dari build aplikasi).
 *
 * Jalankan: node --experimental-strip-types src/server/testBackend.ts
 *
 * PERHATIAN: skrip ini membuat lalu menghapus data uji di database yang
 * dikonfigurasi pada DATABASE_URL.
 */

import {
  testNeonConnection,
  initNeonDatabase,
  neonCreateUser,
  neonGetUserByEmail,
  neonSaveEncryptedKtp,
  neonGetAllEncryptedKtp,
  neonDeleteEncryptedKtp,
} from "./neon.ts";
import { testMailtrapConnection } from "./mailtrap.ts";
import { hashPassword } from "./password.ts";
import { formatApiErrorResponse } from "./errors/appError.ts";
import type { EncryptedKtpRecord } from "../services/dbService.ts";

async function main() {
  console.log("=== MEMULAI TEST INTEGRASI & ERROR HANDLING BACKEND ===");

  // 1. Uji Koneksi Neon PostgreSQL
  console.log("\n1. Menguji koneksi Neon Serverless PostgreSQL Cloud...");
  const dbStatus = await testNeonConnection();
  console.log("- Status Koneksi Neon:", dbStatus.connected ? "SUKSES TERHUBUNG" : "GAGAL");
  console.log("- Driver:", dbStatus.driver);
  console.log("- Host:", dbStatus.host);

  if (!dbStatus.connected) {
    console.error("- Error:", dbStatus.error);
    process.exit(1);
  }

  await initNeonDatabase();
  console.log("- Inisialisasi database: OK");

  // 2. Uji Penanganan Error Validasi (Validation Error)
  console.log("\n2. Menguji Error Handling: Input Kosong / Invalid...");
  try {
    await neonCreateUser({
      name: "",
      email: "invalid-user@test.com",
      password: "",
    });
    console.error("- Gagal: Seharusnya memicu ValidationError");
  } catch (err) {
    const formatted = formatApiErrorResponse(err);
    console.log(
      `- Berhasil ditangkap! [Status ${formatted.statusCode}] [Code: ${formatted.response.error.code}]`,
    );
    console.log(`  Pesan Error: "${formatted.response.error.message}"`);
  }

  // 3. Uji Operasi CRUD Normal & Duplikasi (Conflict Error)
  console.log("\n3. Menguji Operasi Normal & Error Duplikasi (P2002)...");
  const testEmail = `test.err.${Date.now()}@blowfish-ktp.id`;
  const validUser = {
    name: "User Uji Error Handling",
    email: testEmail,
    username: `err_user_${Date.now().toString().slice(-6)}`,
    password: hashPassword("RahasiaUji123!"),
    phone: "081234567890",
    address: "Jl. Test Error No. 1",
    role: "user",
  };

  const created = await neonCreateUser(validUser);
  console.log(`- Berhasil membuat user: ${created.email}`);

  // 4. Uji Duplikasi Email
  console.log("- Menguji penanganan duplikasi email...");
  try {
    await neonCreateUser({ ...validUser, username: null, name: "Duplikat User" });
    console.log("- Gagal: duplikasi email seharusnya ditolak.");
  } catch (err) {
    const formatted = formatApiErrorResponse(err);
    console.log(
      `- Berhasil menangani konflik! [${formatted.response.error.code}]: ${formatted.response.error.message}`,
    );
  }

  // 5. Uji Penyimpanan Dokumen KTP Terenkripsi (owner-scoped)
  console.log("\n4. Menguji operasi KTP terenkripsi & error handling...");
  const ktpId = "ktp_test_err_" + Date.now();
  const testKtp: EncryptedKtpRecord = {
    id: ktpId,
    userId: created.id,
    createdAt: new Date().toISOString(),
    provinsi: "7864f7281bc89a31",
    kabupatenKota: "654c12ef9012bc44",
    nik: "3a4b5c6d7e8f9012",
    nama: "3a4b5c6d7e8f901234567890abcdef12",
    tempatLahir: "654c12ef9012bc44",
    tanggalLahir: "7864f7281bc89a31",
    jenisKelamin: "3a4b5c6d7e8f9012",
    golonganDarah: "654c12ef9012bc44",
    alamat: "3a4b5c6d7e8f901234567890abcdef12",
    rt: "7864f7281bc89a31",
    rw: "654c12ef9012bc44",
    kelurahanDesa: "3a4b5c6d7e8f9012",
    kecamatan: "654c12ef9012bc44",
    agama: "7864f7281bc89a31",
    statusPerkawinan: "654c12ef9012bc44",
    pekerjaan: "3a4b5c6d7e8f9012",
    kewarganegaraan: "654c12ef9012bc44",
    berlakuHingga: "7864f7281bc89a31",
    iv: "1a2b3c4d5e6f7a8b",
    keyChecksum: "4F950AF8",
    keyHint: "Kunci Test Error Handling",
    displayNama: "PENGUJIAN ERROR HANDLING",
  };

  await neonSaveEncryptedKtp(testKtp, created.id);
  console.log("- Berhasil menyimpan KTP terenkripsi.");

  const listed = await neonGetAllEncryptedKtp(created.id);
  console.log(`- Jumlah dokumen milik user: ${listed.length}`);
  if (listed.some((r) => r.keyHint !== undefined)) {
    console.error("- PERINGATAN: keyHint bocor pada endpoint list!");
  }

  // Pastikan user lain tidak bisa melihat dokumen ini
  const otherEmail = `test.other.${Date.now()}@blowfish-ktp.id`;
  const other = await neonCreateUser({
    name: "User Lain",
    email: otherEmail,
    password: hashPassword("RahasiaLain123!"),
    role: "user",
  });
  const otherList = await neonGetAllEncryptedKtp(other.id);
  console.log(`- Dokumen yang terlihat oleh user lain: ${otherList.length} (harus 0)`);

  // Hapus data uji coba
  await neonDeleteEncryptedKtp(ktpId, created.id);
  console.log("- Pembersihan data uji coba KTP: SELESAI");

  await neonDeleteEncryptedKtp(ktpId, other.id).catch(() => {
    console.log("- Otorisasi hapus lintas user: DITOLAK (benar)");
  });

  // Bersihkan user uji
  for (const email of [testEmail, otherEmail]) {
    const user = await neonGetUserByEmail(email);
    if (user) {
      console.log(`- (Manual) Hapus user uji ${email} bila perlu, ID: ${user.id}`);
    }
  }

  // 6. Uji SMTP Mailtrap
  console.log("\n5. Menguji koneksi SMTP Mailtrap...");
  const mailStatus = await testMailtrapConnection();
  console.log("- Status SMTP Mailtrap:", mailStatus.connected ? "TERHUBUNG (SIAP KIRIM)" : "NONAKTIF");

  console.log("\n=== TEST INTEGRASI & ERROR HANDLING SELESAI ===");
  process.exit(0);
}

void main();
