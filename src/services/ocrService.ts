import type { OcrEngine, OcrResult } from "@/types/ktp";
import { parseKtpText } from "@/services/ktpParser";
import { enhanceForOcr } from "@/utils/imageProcessor";

/**
 * OCR dibuat modular: seluruh aplikasi hanya memanggil `runOcr`.
 * Untuk berpindah ke backend (Node/Flask/FastAPI), cukup panggil
 * `setOcrEngine(createApiEngine("https://api.example.com/ocr"))`.
 */

export const tesseractEngine: OcrEngine = {
  name: "tesseract",
  async recognize(image, onProgress) {
    const { default: Tesseract } = await import("tesseract.js");
    const result = await Tesseract.recognize(image, "ind+eng", {
      logger: (m: { status: string; progress: number }) => {
        if (m.status === "recognizing text") {
          onProgress(m.progress, "Membaca teks KTP");
        }
      },
    });
    return {
      text: result.data.text,
      confidence: Math.max(0, Math.min(1, (result.data.confidence ?? 70) / 100)),
    };
  },
};

/** Engine tiruan agar aplikasi bisa diuji tanpa backend / tanpa unduhan model. */
export const mockEngine: OcrEngine = {
  name: "mock",
  async recognize(_image, onProgress) {
    const steps = [0.2, 0.45, 0.7, 0.9, 1];
    for (const step of steps) {
      await new Promise((r) => setTimeout(r, 260));
      onProgress(step, "Membaca teks KTP");
    }
    return {
      text: `PROVINSI SULAWESI TENGGARA
KOTA KENDARI
NIK : 7371234509870001
Nama : LUKMAN ODE
Tempat/Tgl Lahir : KENDARI, 01-01-2000
Jenis Kelamin : LAKI-LAKI      Gol. Darah : O
Alamat : JL. CONTOH NO 123
RT/RW : 001/002
Kel/Desa : BARABARAYA
Kecamatan : KENDARI BARAT
Agama : ISLAM
Status Perkawinan : BELUM KAWIN
Pekerjaan : PROGRAMMER
Kewarganegaraan : WNI
Berlaku Hingga : SEUMUR HIDUP`,
      confidence: 0.92,
    };
  },
};

/** Engine backend HTTP (opsional). Response diharapkan { text, confidence }. */
export function createApiEngine(endpoint: string): OcrEngine {
  return {
    name: "api",
    async recognize(image, onProgress) {
      onProgress(0.2, "Mengirim gambar ke server OCR");
      const body = new FormData();
      body.append("image", image, "ktp.png");
      const response = await fetch(endpoint, { method: "POST", body });
      if (!response.ok) throw new Error("Server OCR gagal memproses gambar.");
      const json = (await response.json()) as { text?: string; confidence?: number };
      onProgress(1, "Membaca teks KTP");
      return { text: json.text ?? "", confidence: json.confidence ?? 0.7 };
    },
  };
}

let activeEngine: OcrEngine = tesseractEngine;

export function setOcrEngine(engine: OcrEngine): void {
  activeEngine = engine;
}

export function getOcrEngine(): OcrEngine {
  return activeEngine;
}

export interface RunOcrOptions {
  engine?: OcrEngine;
  onStage: (stage: "prepare" | "enhance" | "read" | "extract" | "fill", progress: number) => void;
}

export async function runOcr(dataUrl: string, options: RunOcrOptions): Promise<OcrResult> {
  const engine = options.engine ?? activeEngine;

  options.onStage("prepare", 5);
  await new Promise((r) => setTimeout(r, 150));

  options.onStage("enhance", 18);
  const blob = await enhanceForOcr(dataUrl);

  options.onStage("read", 30);
  const { text, confidence } = await engine.recognize(blob, (p) => {
    options.onStage("read", 30 + Math.round(p * 50));
  });

  if (!text.trim()) {
    throw new Error("OCR tidak menemukan teks apa pun pada gambar.");
  }

  options.onStage("extract", 88);
  const parsed = parseKtpText(text, Math.max(0.55, confidence));

  options.onStage("fill", 98);
  const values = Object.values(parsed.confidences);
  const overall = values.length
    ? values.reduce((sum, c) => sum + c.confidence, 0) / values.length
    : 0;

  return {
    rawText: text,
    data: parsed.data,
    confidences: parsed.confidences,
    overallConfidence: overall,
    warnings: parsed.warnings,
  };
}
