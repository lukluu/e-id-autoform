import type { OcrEngine, OcrResult } from "@/types/ktp";
import { parseKtpText, enrichWithWilayah } from "@/services/ktpParser";
import { enhanceForOcr } from "@/utils/imageProcessor";

// Helper to reliably obtain a browser-compatible Tesseract instance
async function getBrowserTesseract(): Promise<any> {
  if (typeof window !== "undefined" && (window as any).Tesseract) {
    return (window as any).Tesseract;
  }

  // 1. Coba load dari CDN via script tag (browser-safe, tidak ada error CJS require)
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      return reject(new Error("Lingkungan bukan browser"));
    }

    if ((window as any).Tesseract) {
      return resolve((window as any).Tesseract);
    }

    const existingScript = document.querySelector('script[src*="tesseract.min.js"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => {
        resolve((window as any).Tesseract);
      });
      existingScript.addEventListener("error", () => {
        reject(new Error("Gagal menginisialisasi pustaka Tesseract OCR"));
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      if ((window as any).Tesseract) {
        resolve((window as any).Tesseract);
      } else {
        reject(new Error("Pustaka Tesseract berhasil diunduh namun objek tidak ditemukan"));
      }
    };
    script.onerror = () => {
      // Fallback ke unpkg jika jsdelivr terkendala
      const fallbackScript = document.createElement("script");
      fallbackScript.src = "https://unpkg.com/tesseract.js@5/dist/tesseract.min.js";
      fallbackScript.async = true;
      fallbackScript.onload = () => resolve((window as any).Tesseract);
      fallbackScript.onerror = () => reject(new Error("Gagal memuat pustaka OCR dari CDN"));
      document.head.appendChild(fallbackScript);
    };
    document.head.appendChild(script);
  });
}

export const tesseractEngine: OcrEngine = {
  name: "tesseract",
  async recognize(image, onProgress) {
    const Tesseract = await getBrowserTesseract();

    const result = await Tesseract.recognize(image, "ind+eng", {
      logger: (m: { status: string; progress: number }) => {
        if (m.status === "recognizing text") {
          onProgress(m.progress, "Membaca teks KTP");
        } else if (m.status === "loading tesseract core" || m.status === "loading language traineddata") {
          onProgress(0.15, "Memuat model bahasa OCR...");
        }
      },
    });

    return {
      text: result.data.text,
      confidence: Math.max(0, Math.min(1, (result.data.confidence ?? 70) / 100)),
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
  engine?: OcrEngine | undefined;
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

  options.onStage("extract", 85);
  const parsed = parseKtpText(text, Math.max(0.55, confidence));

  // Enrich with wilayah API reverse lookup (async)
  options.onStage("fill", 92);
  try {
    const wilayahUpdates = await enrichWithWilayah(parsed.data);
    if (Object.keys(wilayahUpdates).length > 0) {
      Object.assign(parsed.data, wilayahUpdates);
    }
  } catch {
    // Wilayah API failed — continue with what we have
  }

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
