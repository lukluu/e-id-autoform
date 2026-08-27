/**
 * Centralized Application Error Classes & Prisma Error Formatter
 * Standardized Error Handling for Backend & API Endpoints
 */

import { Prisma } from "@prisma/client";

export type ErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "DATABASE_CONNECTION_ERROR"
  | "DATABASE_QUERY_ERROR"
  | "CRYPTO_ERROR"
  | "MAIL_ERROR"
  | "INTERNAL_SERVER_ERROR";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: ErrorCode;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode = 500,
    errorCode: ErrorCode = "INTERNAL_SERVER_ERROR",
    details?: unknown
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, "BAD_REQUEST", details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Autentikasi gagal atau sesi telah berakhir.", details?: unknown) {
    super(message, 401, "UNAUTHORIZED", details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Data yang diminta tidak ditemukan.", details?: unknown) {
    super(message, 404, "NOT_FOUND", details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 409, "CONFLICT", details);
  }
}

export class DatabaseError extends AppError {
  constructor(message = "Terjadi kesalahan pada database server.", details?: unknown) {
    super(message, 500, "DATABASE_QUERY_ERROR", details);
  }
}

export class CryptoError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, "CRYPTO_ERROR", details);
  }
}

/**
 * Menerjemahkan error Prisma ORM menjadi AppError yang jelas dan mudah dipahami
 */
export function handlePrismaError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  // 1. Prisma Known Request Errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002": {
        const target = (error.meta?.target as string[]) || [];
        const fieldName = target.join(", ") || "Data";
        return new ConflictError(
          `Terjadi duplikasi: ${fieldName} sudah digunakan. Harap gunakan data yang lain.`,
          { target, code: error.code }
        );
      }
      case "P2025":
        return new NotFoundError(
          "Data yang ditargetkan tidak ditemukan atau telah dihapus di database.",
          { code: error.code }
        );
      case "P2003": {
        const field = error.meta?.field_name as string;
        return new BadRequestError(
          `Relasi data tidak valid: Data referensi ${field || "terkait"} tidak ditemukan.`,
          { code: error.code }
        );
      }
      case "P1000":
      case "P1001":
        return new AppError(
          "Tidak dapat terhubung ke server database Neon PostgreSQL. Periksa koneksi internet atau status server Neon.",
          503,
          "DATABASE_CONNECTION_ERROR",
          { code: error.code }
        );
      case "P1002":
        return new AppError(
          "Koneksi database Neon mengalami timeout.",
          504,
          "DATABASE_CONNECTION_ERROR",
          { code: error.code }
        );
      case "P2000":
        return new ValidationError(
          "Nilai yang dimasukkan terlalu panjang untuk batas kolom database.",
          { code: error.code }
        );
      default:
        return new DatabaseError(`Kesalahan query database (${error.code}): ${error.message}`, {
          code: error.code,
        });
    }
  }

  // 2. Prisma Validation Error
  if (error instanceof Prisma.PrismaClientValidationError) {
    return new ValidationError(
      "Format data yang dikirim tidak sesuai dengan skema database Prisma.",
      { originalMessage: error.message }
    );
  }

  // 3. Prisma Initialization Error
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return new AppError(
      "Gagal menginisialisasi Prisma Client ke database Neon. Periksa DATABASE_URL di .env.",
      503,
      "DATABASE_CONNECTION_ERROR",
      { originalMessage: error.message }
    );
  }

  // 4. Standard Error
  if (error instanceof Error) {
    return new AppError(error.message, 500, "INTERNAL_SERVER_ERROR");
  }

  return new AppError("Terjadi kesalahan internal yang tidak diketahui.", 500);
}

/**
 * Format payload respon API untuk seluruh endpoint
 */
export function formatApiErrorResponse(error: unknown): {
  statusCode: number;
  response: {
    success: false;
    error: {
      code: ErrorCode;
      message: string;
      details?: unknown;
    };
    timestamp: string;
  };
} {
  const appError = handlePrismaError(error);

  return {
    statusCode: appError.statusCode,
    response: {
      success: false,
      error: {
        code: appError.errorCode,
        message: appError.message,
        details: appError.details || undefined,
      },
      timestamp: new Date().toISOString(),
    },
  };
}
