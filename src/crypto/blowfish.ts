/**
 * Implementasi Algoritma Kriptografi Blowfish Manual Murni (Tanpa Library Eksternal)
 * Bruce Schneier (1993)
 *
 * Spesifikasi:
 * - Ukuran Blok: 64-bit (8 byte: Left 32-bit, Right 32-bit)
 * - Ukuran Kunci: 32-bit hingga 448-bit (4 hingga 56 byte)
 * - Struktur: 16-putaran Jaringan Feistel (16-round Feistel Network)
 * - Mode Operasi: Cipher Block Chaining (CBC) dengan PKCS#7 Padding
 */

import { INITIAL_P_ARRAY, INITIAL_S_BOXES } from "./blowfishConstants";

export interface BlowfishEncryptionResult {
  ciphertextHex: string;
  ivHex: string;
  keyChecksum: string;
  executionTimeMs: number;
  blockSizeBytes: number;
  totalBlocks: number;
}

export interface BlowfishDecryptionResult {
  plainText: string;
  executionTimeMs: number;
  isValid: boolean;
}

export class Blowfish {
  private pArray: number[] = [];
  private sBoxes: number[][] = [];
  private rawKey: Uint8Array;

  /**
   * Menginisialisasi instance Blowfish dan menjalankan Key Expansion
   * @param key String kunci atau Uint8Array (panjang 4 - 56 byte)
   */
  constructor(key: string | Uint8Array) {
    if (typeof key === "string") {
      this.rawKey = new TextEncoder().encode(key);
    } else {
      this.rawKey = new Uint8Array(key);
    }

    if (this.rawKey.length === 0) {
      throw new Error("Kunci enkripsi tidak boleh kosong.");
    }

    if (this.rawKey.length > 56) {
      this.rawKey = this.rawKey.slice(0, 56);
    }

    this.expandKey();
  }

  /**
   * Fungsi Feistel F(xL):
   * Membagi 32-bit word menjadi empat 8-bit byte: a, b, c, d
   * F(a, b, c, d) = ((S1[a] + S2[b] mod 2^32) ^ S3[c]) + S4[d] mod 2^32
   */
  private f(xL: number): number {
    const a = (xL >>> 24) & 0xff;
    const b = (xL >>> 16) & 0xff;
    const c = (xL >>> 8) & 0xff;
    const d = xL & 0xff;

    const s0 = this.sBoxes[0]!;
    const s1 = this.sBoxes[1]!;
    const s2 = this.sBoxes[2]!;
    const s3 = this.sBoxes[3]!;

    const sum1 = (s0[a]! + s1[b]!) >>> 0;
    const xor = (sum1 ^ s2[c]!) >>> 0;
    const res = (xor + s3[d]!) >>> 0;
    return res;
  }

  /**
   * Key Expansion (Subkey Generation):
   * 1. Salin P-array awal (18 subkeys) dan 4 S-boxes awal (4x256)
   * 2. Lakukan XOR tiap elemen P-array dengan 32-bit potongan kunci
   * 3. Enkripsi blok nol secara berantai untuk memperbarui seluruh P-array dan S-boxes
   */
  private expandKey(): void {
    // 1. Copy initial constants
    this.pArray = [...INITIAL_P_ARRAY];
    this.sBoxes = INITIAL_S_BOXES.map((box) => [...box]);

    const keyLen = this.rawKey.length;
    let keyIdx = 0;

    // 2. XOR P-array with key bits
    for (let i = 0; i < 18; i++) {
      let data = 0;
      for (let k = 0; k < 4; k++) {
        data = ((data << 8) | (this.rawKey[keyIdx] ?? 0)) >>> 0;
        keyIdx = (keyIdx + 1) % keyLen;
      }
      this.pArray[i] = ((this.pArray[i] ?? 0) ^ data) >>> 0;
    }

    // 3. Repeatedly encrypt 64-bit zero block to replace P-array entries
    let block: [number, number] = [0, 0];
    for (let i = 0; i < 18; i += 2) {
      block = this.encryptBlock(block[0], block[1]);
      this.pArray[i] = block[0];
      this.pArray[i + 1] = block[1];
    }

    // 4. Update all 4 S-Boxes (1024 entries)
    for (let s = 0; s < 4; s++) {
      const box = this.sBoxes[s]!;
      for (let i = 0; i < 256; i += 2) {
        block = this.encryptBlock(block[0], block[1]);
        box[i] = block[0];
        box[i + 1] = block[1];
      }
    }
  }

  /**
   * Enkripsi blok tunggal 64-bit (L, R) dengan 16 putaran Feistel Network
   */
  public encryptBlock(L: number, R: number): [number, number] {
    let left = L >>> 0;
    let right = R >>> 0;

    for (let i = 0; i < 16; i++) {
      left = (left ^ this.pArray[i]!) >>> 0;
      right = (this.f(left) ^ right) >>> 0;

      // Swap L dan R
      const temp = left;
      left = right;
      right = temp;
    }

    // Batalkan swap terakhir
    const temp = left;
    left = right;
    right = temp;

    right = (right ^ this.pArray[16]!) >>> 0;
    left = (left ^ this.pArray[17]!) >>> 0;

    return [left, right];
  }

  /**
   * Dekripsi blok tunggal 64-bit (L, R) dengan 16 putaran Feistel terbalik
   */
  public decryptBlock(L: number, R: number): [number, number] {
    let left = L >>> 0;
    let right = R >>> 0;

    for (let i = 17; i > 1; i--) {
      left = (left ^ this.pArray[i]!) >>> 0;
      right = (this.f(left) ^ right) >>> 0;

      // Swap L dan R
      const temp = left;
      left = right;
      right = temp;
    }

    // Batalkan swap terakhir
    const temp = left;
    left = right;
    right = temp;

    right = (right ^ this.pArray[1]!) >>> 0;
    left = (left ^ this.pArray[0]!) >>> 0;

    return [left, right];
  }

  /**
   * Enkripsi data byte array menggunakan Mode CBC (Cipher Block Chaining) dan PKCS#7 Padding
   */
  public encryptCbc(plainBytes: Uint8Array, ivBytes: Uint8Array): Uint8Array {
    if (ivBytes.length !== 8) {
      throw new Error("IV untuk Blowfish CBC harus tepat 8 byte (64-bit).");
    }

    // 1. Terapkan PKCS#7 padding (ukuran blok 8 byte)
    const padLength = 8 - (plainBytes.length % 8);
    const padded = new Uint8Array(plainBytes.length + padLength);
    padded.set(plainBytes);
    padded.fill(padLength, plainBytes.length);

    const numBlocks = padded.length / 8;
    const cipherBytes = new Uint8Array(padded.length);

    let prevL = bytesToWord(ivBytes, 0);
    let prevR = bytesToWord(ivBytes, 4);

    for (let b = 0; b < numBlocks; b++) {
      const offset = b * 8;
      let blockL = bytesToWord(padded, offset);
      let blockR = bytesToWord(padded, offset + 4);

      // CBC: XOR dengan blok ciphertext sebelumnya (atau IV untuk blok 0)
      blockL = (blockL ^ prevL) >>> 0;
      blockR = (blockR ^ prevR) >>> 0;

      const [encL, encR] = this.encryptBlock(blockL, blockR);
      wordToBytes(encL, cipherBytes, offset);
      wordToBytes(encR, cipherBytes, offset + 4);

      prevL = encL;
      prevR = encR;
    }

    return cipherBytes;
  }

  /**
   * Dekripsi data byte array menggunakan Mode CBC dan verifikasi PKCS#7 Padding
   */
  public decryptCbc(cipherBytes: Uint8Array, ivBytes: Uint8Array): Uint8Array {
    if (cipherBytes.length % 8 !== 0) {
      throw new Error("Panjang ciphertext tidak valid (harus kelipatan 8 byte).");
    }
    if (ivBytes.length !== 8) {
      throw new Error("IV untuk Blowfish CBC harus tepat 8 byte (64-bit).");
    }

    const numBlocks = cipherBytes.length / 8;
    const decrypted = new Uint8Array(cipherBytes.length);

    let prevL = bytesToWord(ivBytes, 0);
    let prevR = bytesToWord(ivBytes, 4);

    for (let b = 0; b < numBlocks; b++) {
      const offset = b * 8;
      const curL = bytesToWord(cipherBytes, offset);
      const curR = bytesToWord(cipherBytes, offset + 4);

      const [decL, decR] = this.decryptBlock(curL, curR);

      // CBC: XOR dengan ciphertext blok sebelumnya
      const plainL = (decL ^ prevL) >>> 0;
      const plainR = (decR ^ prevR) >>> 0;

      wordToBytes(plainL, decrypted, offset);
      wordToBytes(plainR, decrypted, offset + 4);

      prevL = curL;
      prevR = curR;
    }

    // 2. Lepaskan PKCS#7 padding
    const lastByte = decrypted[decrypted.length - 1];
    if (lastByte === undefined || lastByte < 1 || lastByte > 8) {
      throw new Error("Kunci salah atau padding PKCS#7 rusak.");
    }
    const padLength = lastByte;
    for (let i = decrypted.length - padLength; i < decrypted.length; i++) {
      if (decrypted[i] !== padLength) {
        throw new Error("Kunci salah atau validasi padding PKCS#7 gagal.");
      }
    }

    return decrypted.slice(0, decrypted.length - padLength);
  }
}

// ----------------------------------------------------
// Helper Functions (Word & Byte Conversions)
// ----------------------------------------------------

function bytesToWord(bytes: Uint8Array, offset: number): number {
  const b0 = bytes[offset] ?? 0;
  const b1 = bytes[offset + 1] ?? 0;
  const b2 = bytes[offset + 2] ?? 0;
  const b3 = bytes[offset + 3] ?? 0;

  return ((b0 << 24) | (b1 << 16) | (b2 << 8) | b3) >>> 0;
}

function wordToBytes(word: number, target: Uint8Array, offset: number): void {
  target[offset] = (word >>> 24) & 0xff;
  target[offset + 1] = (word >>> 16) & 0xff;
  target[offset + 2] = (word >>> 8) & 0xff;
  target[offset + 3] = word & 0xff;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.replace(/[^0-9a-fA-F]/g, "");
  if (cleanHex.length % 2 !== 0) {
    throw new Error("Panjang string hex tidak valid.");
  }
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Menghasilkan IV acak 64-bit (8 byte)
 */
export function generateRandomIv(): Uint8Array {
  const iv = new Uint8Array(8);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(iv);
  } else {
    for (let i = 0; i < 8; i++) {
      iv[i] = Math.floor(Math.random() * 256);
    }
  }
  return iv;
}

/**
 * Menghasilkan hash checksum singkat dari kunci (untuk verifikasi kecocokan kunci)
 */
export function generateKeyChecksum(key: string): string {
  const bytes = new TextEncoder().encode(`BLOWFISH_SALT_${key}_EID_SECURE`);
  let hash = 0x811c9dc5; // FNV-1a 32-bit
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i] ?? 0;
    hash = (hash ^ b) >>> 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0").toUpperCase();
}

/**
 * High-level API: Enkripsi String UTF-8 dengan Blowfish CBC
 */
export function encryptUtf8WithBlowfish(
  plainText: string,
  key: string,
  customIvHex?: string,
): BlowfishEncryptionResult {
  const startTime = performance.now();
  const blowfish = new Blowfish(key);
  const iv = customIvHex ? hexToBytes(customIvHex) : generateRandomIv();
  const plainBytes = new TextEncoder().encode(plainText);
  const cipherBytes = blowfish.encryptCbc(plainBytes, iv);
  const endTime = performance.now();

  return {
    ciphertextHex: bytesToHex(cipherBytes),
    ivHex: bytesToHex(iv),
    keyChecksum: generateKeyChecksum(key),
    executionTimeMs: Math.round((endTime - startTime) * 100) / 100,
    blockSizeBytes: 8,
    totalBlocks: cipherBytes.length / 8,
  };
}

/**
 * High-level API: Dekripsi Ciphertext Hex dengan Blowfish CBC
 */
export function decryptUtf8WithBlowfish(
  ciphertextHex: string,
  ivHex: string,
  key: string,
  expectedKeyChecksum?: string,
): BlowfishDecryptionResult {
  const startTime = performance.now();

  // Validasi checksum kunci jika tersedia
  if (expectedKeyChecksum) {
    const currentChecksum = generateKeyChecksum(key);
    if (currentChecksum !== expectedKeyChecksum) {
      return {
        plainText: "",
        executionTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
        isValid: false,
      };
    }
  }

  try {
    const blowfish = new Blowfish(key);
    const cipherBytes = hexToBytes(ciphertextHex);
    const ivBytes = hexToBytes(ivHex);
    const plainBytes = blowfish.decryptCbc(cipherBytes, ivBytes);
    const plainText = new TextDecoder().decode(plainBytes);
    const endTime = performance.now();

    return {
      plainText,
      executionTimeMs: Math.round((endTime - startTime) * 100) / 100,
      isValid: true,
    };
  } catch {
    return {
      plainText: "",
      executionTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
      isValid: false,
    };
  }
}
