/**
 * API Middleware Router untuk Vite Dev Server & TanStack Server
 * Menangani request endpoint /api/db/*, /api/mysql/* (alias) dan /api/mailtrap/*
 * Menggunakan Prisma ORM & Neon Serverless PostgreSQL
 * Dilengkapi dengan Penanganan Error Terpusat (Centralized Error Handling)
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import {
  testNeonConnection,
  initNeonDatabase,
  neonGetUserByIdentifier,
  neonGetUserByEmail,
  neonGetUserByUsername,
  neonGetUserById,
  neonCreateUser,
  neonUpdateUserPassword,
  neonUpdateUserProfile,
  neonGetAllEncryptedKtp,
  neonSaveEncryptedKtp,
  neonDeleteEncryptedKtp,
  neonSaveRecoveryCode,
  neonVerifyRecoveryCode,
  neonGetSetting,
  neonSetSetting,
  neonResetEntireDatabase,
} from "./neon";
import { sendMailtrapEmail, testMailtrapConnection } from "./mailtrap";
import { formatApiErrorResponse } from "./errors/appError";

function sendJson(res: ServerResponse, data: unknown, status = 200) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      // Guard against oversized payloads (max 10MB)
      if (body.length > 10 * 1024 * 1024) {
        req.destroy();
        reject(new Error("Payload terlalu besar (maksimal 10MB)."));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error("Format JSON body request tidak valid."));
      }
    });
    req.on("error", (err) => reject(err));
  });
}

export async function handleApiRequest(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
): Promise<void> {
  const url = req.url || "";

  if (!url.startsWith("/api/")) {
    return next();
  }

  const cleanUrl = url.split("?")[0] || "";

  try {
    // -----------------------------------------------------------
    // NEON POSTGRESQL & PRISMA ENDPOINTS (Support /api/db/ & /api/mysql/)
    // -----------------------------------------------------------

    if (cleanUrl === "/api/db/status" || cleanUrl === "/api/mysql/status") {
      const status = await testNeonConnection();
      return sendJson(res, status);
    }

    if ((cleanUrl === "/api/db/init" || cleanUrl === "/api/mysql/init") && req.method === "POST") {
      await initNeonDatabase();
      return sendJson(res, { success: true, message: "Database Neon PostgreSQL berhasil diinisialisasi." });
    }

    if ((cleanUrl === "/api/db/user-get" || cleanUrl === "/api/mysql/user-get") && req.method === "POST") {
      const body = await parseBody(req);
      const identifier = body.identifier || body.email || body.username;
      if (identifier) {
        const user = await neonGetUserByIdentifier(identifier);
        return sendJson(res, { success: true, user });
      }
      if (body.id) {
        const user = await neonGetUserById(body.id);
        return sendJson(res, { success: true, user });
      }
      return sendJson(res, { success: true, user: null });
    }

    if ((cleanUrl === "/api/db/user-create" || cleanUrl === "/api/mysql/user-create") && req.method === "POST") {
      const body = await parseBody(req);
      const user = await neonCreateUser(body.user);
      return sendJson(res, { success: true, user });
    }

    if ((cleanUrl === "/api/db/user-update-password" || cleanUrl === "/api/mysql/user-update-password") && req.method === "POST") {
      const body = await parseBody(req);
      const updated = await neonUpdateUserPassword(body.email, body.passwordHash);
      return sendJson(res, { success: updated });
    }

    if ((cleanUrl === "/api/db/user-update-profile" || cleanUrl === "/api/mysql/user-update-profile") && req.method === "POST") {
      const body = await parseBody(req);
      const user = await neonUpdateUserProfile(body.user);
      return sendJson(res, { success: Boolean(user), user });
    }

    if ((cleanUrl === "/api/db/ktp-list" || cleanUrl === "/api/mysql/ktp-list") && (req.method === "GET" || req.method === "POST")) {
      const records = await neonGetAllEncryptedKtp();
      return sendJson(res, { success: true, records });
    }

    if ((cleanUrl === "/api/db/ktp-save" || cleanUrl === "/api/mysql/ktp-save") && req.method === "POST") {
      const body = await parseBody(req);
      await neonSaveEncryptedKtp(body.record);
      return sendJson(res, { success: true });
    }

    if ((cleanUrl === "/api/db/ktp-delete" || cleanUrl === "/api/mysql/ktp-delete") && req.method === "POST") {
      const body = await parseBody(req);
      const deleted = await neonDeleteEncryptedKtp(body.id);
      return sendJson(res, { success: deleted });
    }

    if ((cleanUrl === "/api/db/recovery-save" || cleanUrl === "/api/mysql/recovery-save") && req.method === "POST") {
      const body = await parseBody(req);
      await neonSaveRecoveryCode(body.record);
      return sendJson(res, { success: true });
    }

    if ((cleanUrl === "/api/db/recovery-verify" || cleanUrl === "/api/mysql/recovery-verify") && req.method === "POST") {
      const body = await parseBody(req);
      const record = await neonVerifyRecoveryCode(body.email, body.code, body.type);
      return sendJson(res, { success: true, record, valid: Boolean(record) });
    }

    if ((cleanUrl === "/api/db/setting-get" || cleanUrl === "/api/mysql/setting-get") && req.method === "POST") {
      const body = await parseBody(req);
      const value = await neonGetSetting(body.key);
      return sendJson(res, { success: true, value });
    }

    if ((cleanUrl === "/api/db/setting-set" || cleanUrl === "/api/mysql/setting-set") && req.method === "POST") {
      const body = await parseBody(req);
      await neonSetSetting(body.key, body.value);
      return sendJson(res, { success: true });
    }

    if ((cleanUrl === "/api/db/reset-database" || cleanUrl === "/api/mysql/reset-database") && req.method === "POST") {
      await neonResetEntireDatabase();
      return sendJson(res, { success: true, message: "Seluruh isi database berhasil direset." });
    }

    // -----------------------------------------------------------
    // MAILTRAP ENDPOINTS
    // -----------------------------------------------------------

    if (cleanUrl === "/api/mailtrap/send" && req.method === "POST") {
      const body = await parseBody(req);
      const result = await sendMailtrapEmail(body);
      return sendJson(res, result);
    }

    if (cleanUrl === "/api/mailtrap/test" && req.method === "POST") {
      const body = await parseBody(req);
      const result = await testMailtrapConnection(body.config);
      return sendJson(res, result);
    }

    return next();
  } catch (err) {
    const { statusCode, response } = formatApiErrorResponse(err);
    console.error(`[API ERROR ${statusCode}] [${req.method}] ${cleanUrl}:`, response.error.message);
    return sendJson(res, response, statusCode);
  }
}
