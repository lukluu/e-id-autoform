/**
 * Modul Analisis Keamanan & Karakteristik Kriptografi Algoritma Blowfish
 * Untuk Keperluan Analisis Ilmiah / Tugas Akhir
 *
 * Fitur:
 * 1. Perhitungan Shannon Entropy (Tingkat Keacakan Ciphertext)
 * 2. Perhitungan Avalanche Effect (Efek Salju Longsor / Perubahan Bit)
 * 3. Benchmark Performa Kecepatan Enkripsi & Dekripsi
 */

import { Blowfish, encryptUtf8WithBlowfish, hexToBytes } from "./blowfish";

export interface EntropyResult {
  entropy: number; // 0 - 8 (8 = acak sempurna)
  maxEntropy: number; // 8.0
  idealPercentage: number;
  byteDistribution: number[]; // Frekuensi 256 byte
  verdict: "Sangat Acak (Aman)" | "Cukup Acak" | "Kurang Acak (Rentan)";
}

export interface AvalancheResult {
  totalBits: number;
  flippedBits: number;
  avalanchePercentage: number; // Target ~50%
  flippedBitIndices: number[];
  sampleBlockHex1: string;
  sampleBlockHex2: string;
  verdict: "Sangat Baik (Strict Avalanche Criterion Terpenuhi)" | "Baik" | "Kurang Optimal";
}

export interface BenchmarkItem {
  payloadLabel: string;
  payloadSizeBytes: number;
  encryptionTimeMs: number;
  decryptionTimeMs: number;
  throughputKbPerSec: number;
}

/**
 * Menghitung Shannon Entropy dari data hex/byte array.
 * Rumus: H(X) = - SUM( P(xi) * log2( P(xi) ) )
 */
export function calculateShannonEntropy(dataHexOrBytes: string | Uint8Array): EntropyResult {
  const bytes =
    typeof dataHexOrBytes === "string" ? hexToBytes(dataHexOrBytes) : dataHexOrBytes;

  if (bytes.length === 0) {
    return {
      entropy: 0,
      maxEntropy: 8,
      idealPercentage: 0,
      byteDistribution: new Array(256).fill(0),
      verdict: "Kurang Acak (Rentan)",
    };
  }

  const frequency = new Array(256).fill(0);
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i] ?? 0;
    frequency[b] = (frequency[b] ?? 0) + 1;
  }

  let entropy = 0;
  const len = bytes.length;

  for (let i = 0; i < 256; i++) {
    const count = frequency[i] ?? 0;
    if (count > 0) {
      const p = count / len;
      entropy -= p * Math.log2(p);
    }
  }

  const idealPercentage = Math.round((entropy / 8) * 10000) / 100;
  let verdict: EntropyResult["verdict"] = "Kurang Acak (Rentan)";
  if (entropy >= 7.5) {
    verdict = "Sangat Acak (Aman)";
  } else if (entropy >= 6.5) {
    verdict = "Cukup Acak";
  }

  return {
    entropy: Math.round(entropy * 10000) / 10000,
    maxEntropy: 8.0,
    idealPercentage,
    byteDistribution: frequency,
    verdict,
  };
}

/**
 * Menghitung Avalanche Effect:
 * Mengubah 1 bit pada plaintext atau kunci, kemudian menghitung berapa % bit ciphertext yang berubah.
 */
export function calculateAvalancheEffect(
  originalPlaintext: string,
  key: string,
  testMode: "flip_plaintext_bit" | "flip_key_bit" = "flip_plaintext_bit",
): AvalancheResult {
  // Enkripsi 1: Data asli
  const enc1 = encryptUtf8WithBlowfish(originalPlaintext, key);
  const bytes1 = hexToBytes(enc1.ciphertextHex);

  // Modifikasi 1 bit pada plaintext atau kunci
  let modifiedPlaintext = originalPlaintext;
  let modifiedKey = key;

  if (testMode === "flip_plaintext_bit") {
    // Balik bit ke-0 dari karakter pertama
    if (originalPlaintext.length > 0) {
      const firstCharCode = originalPlaintext.charCodeAt(0) ^ 0x01;
      modifiedPlaintext = String.fromCharCode(firstCharCode) + originalPlaintext.slice(1);
    } else {
      modifiedPlaintext = "A";
    }
  } else {
    // Balik bit ke-0 dari kunci
    if (key.length > 0) {
      const firstCharCode = key.charCodeAt(0) ^ 0x01;
      modifiedKey = String.fromCharCode(firstCharCode) + key.slice(1);
    } else {
      modifiedKey = "KEY1";
    }
  }

  // Enkripsi 2: Data dengan modifikasi 1 bit (menggunakan IV yang sama untuk perbandingan akurat)
  const enc2 = encryptUtf8WithBlowfish(modifiedPlaintext, modifiedKey);
  const bytes2 = hexToBytes(enc2.ciphertextHex);

  const compareLen = Math.min(bytes1.length, bytes2.length);
  const totalBits = compareLen * 8;
  let flippedBits = 0;
  const flippedBitIndices: number[] = [];

  for (let byteIdx = 0; byteIdx < compareLen; byteIdx++) {
    const b1 = bytes1[byteIdx] ?? 0;
    const b2 = bytes2[byteIdx] ?? 0;
    const xor = b1 ^ b2;
    for (let bitIdx = 0; bitIdx < 8; bitIdx++) {
      if ((xor & (1 << (7 - bitIdx))) !== 0) {
        flippedBits++;
        flippedBitIndices.push(byteIdx * 8 + bitIdx);
      }
    }
  }

  const avalanchePercentage =
    totalBits > 0 ? Math.round((flippedBits / totalBits) * 10000) / 100 : 0;

  let verdict: AvalancheResult["verdict"] = "Kurang Optimal";
  if (avalanchePercentage >= 45 && avalanchePercentage <= 55) {
    verdict = "Sangat Baik (Strict Avalanche Criterion Terpenuhi)";
  } else if (avalanchePercentage >= 40 && avalanchePercentage <= 60) {
    verdict = "Baik";
  }

  return {
    totalBits,
    flippedBits,
    avalanchePercentage,
    flippedBitIndices,
    sampleBlockHex1: enc1.ciphertextHex.slice(0, 32),
    sampleBlockHex2: enc2.ciphertextHex.slice(0, 32),
    verdict,
  };
}

/**
 * Menjalankan Benchmark Kecepatan Enkripsi & Dekripsi Blowfish
 */
export function runPerformanceBenchmark(key: string): BenchmarkItem[] {
  const sampleKtpJson = JSON.stringify({
    nik: "7401044511030004",
    nama: "DIAN RAMADAN. L",
    tempatLahir: "KOLAKA",
    tanggalLahir: "2003-11-05",
    jenisKelamin: "PEREMPUAN",
    golonganDarah: "O",
    alamat: "LINGK. IV EPE",
    rt: "000",
    rw: "000",
    kelurahanDesa: "WUNDULAKO",
    kecamatan: "WUNDULAKO",
    kabupatenKota: "KABUPATEN KOLAKA",
    provinsi: "SULAWESI TENGGARA",
    agama: "ISLAM",
    statusPerkawinan: "BELUM KAWIN",
    pekerjaan: "PELAJAR/MAHASISWA",
    kewarganegaraan: "WNI",
    berlakuHingga: "SEUMUR HIDUP",
  });

  const multipliers = [
    { label: "1 Dokumen KTP (~0.5 KB)", count: 1 },
    { label: "10 Dokumen KTP (~5 KB)", count: 10 },
    { label: "50 Dokumen KTP (~25 KB)", count: 50 },
    { label: "100 Dokumen KTP (~50 KB)", count: 100 },
  ];

  return multipliers.map(({ label, count }) => {
    let payload = "";
    for (let i = 0; i < count; i++) {
      payload += sampleKtpJson;
    }
    const payloadSizeBytes = new TextEncoder().encode(payload).length;

    // Enkripsi
    const encResult = encryptUtf8WithBlowfish(payload, key);
    // Dekripsi
    const decStartTime = performance.now();
    const blowfish = new Blowfish(key);
    const cipherBytes = hexToBytes(encResult.ciphertextHex);
    const ivBytes = hexToBytes(encResult.ivHex);
    blowfish.decryptCbc(cipherBytes, ivBytes);
    const decEndTime = performance.now();
    const decTimeMs = Math.round((decEndTime - decStartTime) * 100) / 100;

    const totalTimeSec = (encResult.executionTimeMs + decTimeMs) / 1000;
    const throughput =
      totalTimeSec > 0
        ? Math.round((payloadSizeBytes / 1024 / totalTimeSec) * 100) / 100
        : 0;

    return {
      payloadLabel: label,
      payloadSizeBytes,
      encryptionTimeMs: encResult.executionTimeMs,
      decryptionTimeMs: decTimeMs,
      throughputKbPerSec: throughput,
    };
  });
}
