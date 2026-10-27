/**
 * Jembatan API untuk Vite Dev Server.
 * Semua logika endpoint berada di apiHandler.ts (Web Fetch API) agar perilaku
 * development dan production identik. File ini hanya mengonversi
 * IncomingMessage/ServerResponse Node menjadi Request/Response.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { Buffer } from "node:buffer";
import { handleUniversalApiFetch } from "./apiHandler";
import { formatApiErrorResponse } from "./errors/appError";

const MAX_BODY_BYTES = 1024 * 1024; // 1MB

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;

    req.on("data", (chunk: Buffer | string) => {
      const buffer = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
      total += buffer.length;
      if (total > MAX_BODY_BYTES) {
        reject(new Error("Payload request terlalu besar (maksimal 1MB)."));
        req.destroy();
        return;
      }
      chunks.push(buffer);
    });

    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", (err) => reject(err));
  });
}

function toHeaders(req: IncomingMessage): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    headers.set(key, Array.isArray(value) ? value.join(", ") : value);
  }
  return headers;
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

  const method = (req.method || "GET").toUpperCase();

  try {
    const body = method === "GET" || method === "HEAD" ? undefined : await readBody(req);
    const host = req.headers.host || "localhost:3000";
    const protocol = req.headers["x-forwarded-proto"] === "https" ? "https" : "http";

    const init: RequestInit = { method, headers: toHeaders(req) };
    if (body && body.length > 0) {
      init.body = new Uint8Array(body);
    }
    const request = new Request(`${protocol}://${host}${url}`, init);

    const response = await handleUniversalApiFetch(request);
    if (!response) {
      return next();
    }

    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    const responseBody = Buffer.from(await response.arrayBuffer());
    res.end(responseBody);
  } catch (err) {
    const { statusCode, response } = formatApiErrorResponse(err);
    console.error(`[API ERROR ${statusCode}] [${method}] ${url}:`, response.error.message);
    res.statusCode = statusCode;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(response));
  }
}
