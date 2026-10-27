/**
 * Autentikasi Server: HMAC-signed bearer token, otorisasi, dan escrow keyHint.
 *
 * Token bersifat stateless (mirip JWT sederhana) dan ditandatangani dengan
 * AUTH_SECRET. Token disimpan di localStorage klien dan dikirim lewat header
 * `Authorization: Bearer <token>`.
 */

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";
import { ForbiddenError, UnauthorizedError } from "./errors/appError";

const TOKEN_TTL_SECONDS = 12 * 60 * 60; // 12 jam
const TOKEN_VERSION = "v1";

let warnedMissingSecret = false;

function getSecret(): string {
  const secret = process.env["AUTH_SECRET"] || process.env["DATABASE_URL"];
  if (secret && secret.length >= 16) {
    return secret;
  }
  if (!warnedMissingSecret) {
    warnedMissingSecret = true;
    console.warn(
      "[AUTH WARNING] AUTH_SECRET belum diset (minimal 16 karakter). " +
        "Menggunakan secret pengembangan yang TIDAK AMAN untuk produksi.",
    );
  }
  return "insecure-development-auth-secret-please-set-AUTH_SECRET";
}

export interface AuthTokenPayload {
  sub: string;
  role: string;
  iat: number;
  exp: number;
}

export interface AuthContext {
  userId: string;
  role: string;
}

export interface SignedAuthToken {
  token: string;
  expiresAt: string;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(data: string): string {
  return createHmac("sha256", getSecret()).update(data).digest("base64url");
}

export function signAuthToken(userId: string, role: string): SignedAuthToken {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + TOKEN_TTL_SECONDS;
  const payload: AuthTokenPayload = {
    sub: userId,
    role,
    iat: issuedAt,
    exp: expiresAt,
  };

  const encodedPayload = base64url(JSON.stringify(payload));
  const signingInput = `${TOKEN_VERSION}.${encodedPayload}`;
  const signature = sign(signingInput);

  return {
    token: `${signingInput}.${signature}`,
    expiresAt: new Date(expiresAt * 1000).toISOString(),
  };
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [version, encodedPayload, signature] = parts;
  if (version !== TOKEN_VERSION || !encodedPayload || !signature) return null;

  const signingInput = `${version}.${encodedPayload}`;
  const expected = sign(signingInput);

  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(actualBuffer, expectedBuffer)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Partial<AuthTokenPayload>;

    if (
      typeof payload.sub !== "string" ||
      payload.sub.length === 0 ||
      typeof payload.role !== "string" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      sub: payload.sub,
      role: payload.role,
      iat: typeof payload.iat === "number" ? payload.iat : 0,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

export function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}

export function getAuthContext(request: Request): AuthContext | null {
  const token = getBearerToken(request);
  if (!token) return null;
  const payload = verifyAuthToken(token);
  if (!payload) return null;
  return { userId: payload.sub, role: payload.role };
}

export function requireAuth(request: Request): AuthContext {
  const context = getAuthContext(request);
  if (!context) {
    throw new UnauthorizedError("Sesi tidak valid atau telah berakhir. Silakan login kembali.");
  }
  return context;
}

export function requireAdmin(request: Request): AuthContext {
  const context = requireAuth(request);
  if (context.role !== "admin") {
    throw new ForbiddenError("Tindakan ini hanya dapat dilakukan oleh administrator.");
  }
  return context;
}

// ---------------------------------------------------------------------------
// Escrow keyHint (AES-256-GCM)
// ---------------------------------------------------------------------------

const KEY_HINT_PREFIX = "enc:v1:";

function getEscrowKey(): Buffer {
  return createHash("sha256").update(`keyhint:${getSecret()}`).digest();
}

/**
 * Mengenkripsi keyHint sebelum disimpan ke database.
 * keyHint tidak pernah dikembalikan lewat endpoint list.
 */
export function encryptKeyHint(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEscrowKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${KEY_HINT_PREFIX}${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

/**
 * Mendekripsi keyHint. Nilai lama yang masih plaintext (belum ber-prefix)
 * dikembalikan apa adanya agar data existing tetap bisa dipulihkan.
 */
export function decryptKeyHint(stored: string | null | undefined): string | undefined {
  if (!stored) return undefined;
  if (!stored.startsWith(KEY_HINT_PREFIX)) {
    return stored;
  }

  const payload = stored.slice(KEY_HINT_PREFIX.length);
  const parts = payload.split(":");
  if (parts.length !== 3) return undefined;

  const [ivRaw, tagRaw, cipherRaw] = parts;
  if (!ivRaw || !tagRaw || !cipherRaw) return undefined;

  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      getEscrowKey(),
      Buffer.from(ivRaw, "base64"),
    );
    decipher.setAuthTag(Buffer.from(tagRaw, "base64"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(cipherRaw, "base64")),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    return undefined;
  }
}

export function generateOtp(): string {
  return randomInt(100000, 1000000).toString();
}
