export interface KtpData {
  nik: string;
  nama: string;
  provinsi: string;
  kabupatenKota: string;
  tempatLahir: string;
  tanggalLahir: string; // ISO: YYYY-MM-DD
  jenisKelamin: string;
  golonganDarah: string;
  alamat: string;
  rt: string;
  rw: string;
  kelurahanDesa: string;
  kecamatan: string;
  agama: string;
  statusPerkawinan: string;
  pekerjaan: string;
  kewarganegaraan: string;
  berlakuHingga: string;
}

export type KtpField = keyof KtpData;

export type ConfidenceStatus = "high" | "medium" | "low";

export interface FieldConfidence {
  field: KtpField;
  confidence: number;
  status: ConfidenceStatus;
}

export type ConfidenceMap = Partial<Record<KtpField, FieldConfidence>>;

export interface OcrResult {
  rawText: string;
  data: KtpData;
  confidences: ConfidenceMap;
  overallConfidence: number;
  warnings: string[];
}

export type OcrStage =
  "idle" | "prepare" | "enhance" | "read" | "extract" | "fill" | "done" | "error";

export interface OcrProgress {
  stage: OcrStage;
  progress: number; // 0..100
  message: string;
}

export interface OcrEngine {
  name: string;
  recognize(
    image: Blob,
    onProgress: (progress: number, message: string) => void,
  ): Promise<{ text: string; confidence: number }>;
}

export const emptyKtpData: KtpData = {
  nik: "",
  nama: "",
  provinsi: "",
  kabupatenKota: "",
  tempatLahir: "",
  tanggalLahir: "",
  jenisKelamin: "",
  golonganDarah: "",
  alamat: "",
  rt: "",
  rw: "",
  kelurahanDesa: "",
  kecamatan: "",
  agama: "",
  statusPerkawinan: "",
  pekerjaan: "",
  kewarganegaraan: "",
  berlakuHingga: "",
};

export const JENIS_KELAMIN = ["LAKI-LAKI", "PEREMPUAN"] as const;
export const GOLONGAN_DARAH = ["-", "A", "B", "AB", "O", "TIDAK DIKETAHUI"] as const;
export const AGAMA = [
  "ISLAM",
  "KRISTEN",
  "KATOLIK",
  "HINDU",
  "BUDDHA",
  "KONGHUCU",
  "LAINNYA",
] as const;
export const STATUS_PERKAWINAN = ["BELUM KAWIN", "KAWIN", "CERAI HIDUP", "CERAI MATI"] as const;
export const KEWARGANEGARAAN = ["WNI", "WNA"] as const;

/** KTP Indonesia: 85.60 x 53.98 mm */
export const KTP_ASPECT_RATIO = 85.6 / 53.98;
