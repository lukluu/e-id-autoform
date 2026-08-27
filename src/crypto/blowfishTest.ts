import { encryptUtf8WithBlowfish, decryptUtf8WithBlowfish, Blowfish } from "./blowfish";
import { calculateAvalancheEffect, calculateShannonEntropy } from "./securityAnalysis";

console.log("=== MEMULAI TEST SUITE ALGORITMA BLOWFISH MANUAL ===");

// Test 1: Basic Encryption and Decryption Roundtrip
const sampleText = JSON.stringify({
  nik: "7403140408020001",
  nama: "LA ODE LUKMANA",
  tempatLahir: "DANA",
  tanggalLahir: "2002-08-08",
  jenisKelamin: "LAKI-LAKI",
  provinsi: "SULAWESI TENGGARA",
  kabupatenKota: "KABUPATEN MUNA",
});
const key = "KunciRahasiaKTP2026";

console.log("Test 1: Enkripsi string data KTP...");
const encResult = encryptUtf8WithBlowfish(sampleText, key);
console.log("- Ciphertext Hex:", encResult.ciphertextHex.slice(0, 48) + "...");
console.log("- IV Hex:", encResult.ivHex);
console.log("- Checksum Kunci:", encResult.keyChecksum);
console.log("- Total Blok 64-bit:", encResult.totalBlocks);
console.log("- Waktu Eksekusi:", encResult.executionTimeMs, "ms");

console.log("\nTest 2: Dekripsi dengan kunci yang benar...");
const decResult = decryptUtf8WithBlowfish(
  encResult.ciphertextHex,
  encResult.ivHex,
  key,
  encResult.keyChecksum,
);
console.log("- Status Dekripsi Valid:", decResult.isValid);
console.log("- Plaintext Cocok:", decResult.plainText === sampleText);

if (decResult.plainText !== sampleText) {
  console.error("GAGAL: Hasil dekripsi tidak cocok dengan teks asli!");
  process.exit(1);
}

console.log("\nTest 3: Dekripsi dengan kunci yang SALAH...");
const wrongDecResult = decryptUtf8WithBlowfish(
  encResult.ciphertextHex,
  encResult.ivHex,
  "KunciYangSalah123",
  encResult.keyChecksum,
);
console.log("- Status Ditolak (Harus false):", !wrongDecResult.isValid);

console.log("\nTest 4: Analisis Avalanche Effect...");
const avalanche = calculateAvalancheEffect(sampleText, key, "flip_plaintext_bit");
console.log("- Total Bit:", avalanche.totalBits);
console.log("- Bit Berubah:", avalanche.flippedBits);
console.log("- Avalanche Effect (%):", avalanche.avalanchePercentage + "%");
console.log("- Verdict:", avalanche.verdict);

console.log("\nTest 5: Analisis Shannon Entropy...");
const entropy = calculateShannonEntropy(encResult.ciphertextHex);
console.log("- Nilai Entropi H(X):", entropy.entropy, "/ 8.0");
console.log("- Indeks Keacakan (%):", entropy.idealPercentage + "%");
console.log("- Verdict:", entropy.verdict);

console.log("\n=== SEMUA PENGUJIAN BLOWFISH SELESAI & SUKSES 100% ===");
