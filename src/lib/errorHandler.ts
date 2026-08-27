/**
 * Frontend Error Handling Utilities & Toast Notifier
 * Memberikan pesan kesalahan yang ramah pengguna dalam Bahasa Indonesia
 */

import { toast } from "sonner";

export interface ApiErrorResponse {
  success: false;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  message?: string;
}

/**
 * Mengekstrak pesan kesalahan yang ramah pengguna dari respon API, Error object, atau string
 */
export function getErrorMessage(error: unknown, fallbackMessage = "Terjadi kesalahan yang tidak terduga."): string {
  if (!error) return fallbackMessage;

  if (typeof error === "string") {
    return error;
  }

  if (typeof error === "object") {
    const errObj = error as Record<string, any>;

    // 1. Respon terstruktur dari backend
    if (errObj.error && typeof errObj.error === "object" && typeof errObj.error.message === "string") {
      return errObj.error.message;
    }

    if (typeof errObj.error === "string") {
      return errObj.error;
    }

    if (typeof errObj.message === "string") {
      // Terjemahkan beberapa error browser umum
      if (errObj.message.includes("Failed to fetch") || errObj.message.includes("NetworkError")) {
        return "Koneksi jaringan terputus. Harap periksa koneksi internet Anda.";
      }
      return errObj.message;
    }
  }

  if (error instanceof Error) {
    if (error.message.includes("Failed to fetch")) {
      return "Gagal terhubung ke server backend atau jaringan offline.";
    }
    return error.message;
  }

  return fallbackMessage;
}

/**
 * Menampilkan pesan toast error
 */
export function showErrorToast(error: unknown, fallbackMessage?: string): void {
  const msg = getErrorMessage(error, fallbackMessage);
  toast.error("Terjadi Kesalahan", {
    description: msg,
    duration: 4500,
  });
}

/**
 * Menampilkan pesan toast sukses
 */
export function showSuccessToast(title: string, description?: string): void {
  toast.success(title, {
    description,
    duration: 3500,
  });
}
