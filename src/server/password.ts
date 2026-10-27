/**
 * Server-side Password Hashing (scrypt)
 *
 * Format hash: scrypt$N$r$p$saltBase64$hashBase64
 * Hash lama (FNV-1a 32-bit, "h_xxxxxxxx") tetap didukung agar akun yang
 * sudah ada tidak terkunci. Hash lama otomatis di-upgrade saat login sukses.
 */

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;
const PREFIX = "scrypt";

function legacyHash(password: string): string {
  let hash = 0x811c9dc5;
  const str = `BLOWFISH_APP_SALT_${password}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash ^ str.charCodeAt(i)) >>> 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return "h_" + hash.toString(16).padStart(8, "0");
}

export function hashPassword(password: string): string {
  if (!password) {
    throw new Error("Kata sandi tidak boleh kosong.");
  }
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: 64 * 1024 * 1024,
  });
  return [
    PREFIX,
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("base64"),
    derived.toString("base64"),
  ].join("$");
}

export interface PasswordVerification {
  valid: boolean;
  /** true jika hash lama/lemah dan sebaiknya segera diganti dengan scrypt. */
  needsRehash: boolean;
}

/**
 * Verifikasi kata sandi terhadap hash tersimpan.
 * Mendukung scrypt modern dan hash legacy FNV ("h_xxxxxxxx").
 */
export function verifyPassword(
  password: string,
  stored: string | null | undefined,
): PasswordVerification {
  if (!stored) {
    return { valid: false, needsRehash: false };
  }

  if (stored.startsWith(`${PREFIX}$`)) {
    const parts = stored.split("$");
    if (parts.length !== 6) {
      return { valid: false, needsRehash: false };
    }

    const [, nRaw, rRaw, pRaw, saltRaw, hashRaw] = parts;
    const n = Number(nRaw);
    const r = Number(rRaw);
    const p = Number(pRaw);
    if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p)) {
      return { valid: false, needsRehash: false };
    }

    try {
      const salt = Buffer.from(saltRaw ?? "", "base64");
      const expected = Buffer.from(hashRaw ?? "", "base64");
      if (salt.length === 0 || expected.length === 0) {
        return { valid: false, needsRehash: false };
      }

      const actual = scryptSync(password, salt, expected.length, {
        N: n,
        r,
        p,
        maxmem: 64 * 1024 * 1024,
      });

      if (actual.length !== expected.length) {
        return { valid: false, needsRehash: false };
      }

      return {
        valid: timingSafeEqual(actual, expected),
        needsRehash: false,
      };
    } catch {
      return { valid: false, needsRehash: false };
    }
  }

  // Legacy FNV hash (tanpa salt). Bandingkan versi apa adanya dan versi trim.
  const candidates = [legacyHash(password), legacyHash(password.trim())];
  const valid = candidates.includes(stored);
  return { valid, needsRehash: valid };
}
