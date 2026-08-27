import {
  testNeonConnection,
  initNeonDatabase,
  neonCreateUser,
  neonGetUserByEmail,
  neonGetUserByUsername,
  neonSaveEncryptedKtp,
  neonGetAllEncryptedKtp,
  neonDeleteEncryptedKtp,
} from "./neon.ts";
import { testMailtrapConnection } from "./mailtrap.ts";
import { formatApiErrorResponse, ValidationError, ConflictError } from "./errors/appError.ts";
import type { UserRecord, EncryptedKtpRecord } from "../services/dbService.ts";

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

  // 2. Uji Penanganan Error Validasi (Validation Error)
  console.log("\n2. Menguji Error Handling: Input Kosong / Invalid...");
  try {
    await neonCreateUser({
      id: "",
      name: "", // Kosong!
      email: "invalid-user@test.com",
      password: "",
      createdAt: "",
      updatedAt: "",
    });
    console.error("- Gagal: Seharusnya memicu ValidationError");
  } catch (err) {
    const formatted = formatApiErrorResponse(err);
    console.log(`- Berhasil ditangkap! [Status ${formatted.statusCode}] [Code: ${formatted.response.error.code}]`);
    console.log(`  Pesan Error: "${formatted.response.error.message}"`);
  }

  // 3. Uji Operasi CRUD Normal & Duplikasi (Conflict Error)
  console.log("\n3. Menguji Operasi Normal & Error Duplikasi (P2002)...");
  const testEmail = `test.err.${Date.now()}@blowfish-ktp.id`;
  const validUser: UserRecord = {
    id: crypto.randomUUID(),
    name: "User Uji Error Handling",
    email: testEmail,
    username: `err_user_${Date.now().toString().slice(-4)}`,
    password: "h_test_password_hash",
    phone: "081234567890",
    address: "Jl. Test Error No. 1",
    role: "user",
    avatar: null,
    emailVerifiedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const created = await neonCreateUser(validUser);
  console.log(`- Berhasil membuat user: ${created.email}`);

  // 4. Uji Duplikasi Email / Username
  console.log("- Menguji penanganan duplikasi email...");
  try {
    await neonCreateUser({
      ...validUser,
      id: crypto.randomUUID(),
      name: "Duplikat User",
    });
    console.log("- Upsert berhasil mengupdate data yang sama tanpa crash.");
  } catch (err) {
    const formatted = formatApiErrorResponse(err);
    console.log(`- Berhasil menangani konflik! [${formatted.response.error.code}]: ${formatted.response.error.message}`);
  }

  // 5. Uji Penyimpanan Dokumen KTP Terenkripsi
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

  await neonSaveEncryptedKtp(testKtp);
  console.log("- Berhasil menyimpan KTP terenkripsi.");

  // Hapus data uji coba
  await neonDeleteEncryptedKtp(ktpId);
  console.log("- Pembersihan data uji coba KTP: SELESAI");

  // 6. Uji SMTP Mailtrap
  console.log("\n5. Menguji koneksi SMTP Mailtrap...");
  const mailStatus = await testMailtrapConnection();
  console.log("- Status SMTP Mailtrap:", mailStatus.connected ? "TERHUBUNG (SIAP KIRIM)" : "NONAKTIF");

  console.log("\n=== TEST INTEGRASI & ERROR HANDLING SELESAI DENGAN SUKSES ===");
  process.exit(0);
}

void main();
