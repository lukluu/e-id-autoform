import type { OcrEngine, OcrResult } from "@/types/ktp";
import { parseKtpText, enrichWithWilayah, validateIsKtpDocument } from "@/services/ktpParser";
import { enhanceForOcr } from "@/utils/imageProcessor";

// Tesseract dimuat dari CDN dengan versi & SRI yang dipatok agar tidak
// bisa disisipi kode pihak ketiga (supply-chain).
const TESSERACT_VERSION = "5.1.1";
const TESSERACT_SRI = "sha384-GJqSu7vueQ9qN0E9yLPb3Wtpd7OrgK8KmYzC8T1IysG1bcvxvIO4qtYR/D3A991F";
const TESSERACT_CDN = `https://cdn.jsdelivr.net/npm/tesseract.js@${TESSERACT_VERSION}/dist/tesseract.min.js`;
const TESSERACT_CDN_FALLBACK = `https://unpkg.com/tesseract.js@${TESSERACT_VERSION}/dist/tesseract.min.js`;

interface TesseractRecognitionResult {
  data: { text: string; confidence?: number };
}

interface TesseractLibrary {
  recognize(
    image: Blob,
    langs: string,
    options?: { logger?: (m: { status: string; progress: number }) => void },
  ): Promise<TesseractRecognitionResult>;
}

type TesseractWindow = Window & { Tesseract?: TesseractLibrary };

let tesseractScriptPromise: Promise<TesseractLibrary> | null = null;

function loadTesseractScript(src: string): Promise<TesseractLibrary> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.integrity = TESSERACT_SRI;
    script.onload = () => {
      const instance = (window as TesseractWindow).Tesseract;
      if (instance) resolve(instance);
      else reject(new Error("Pustaka Tesseract berhasil diunduh namun objek tidak ditemukan"));
    };
    script.onerror = () => reject(new Error(`Gagal memuat pustaka OCR dari ${src}`));
    document.head.appendChild(script);
  });
}

// Helper to reliably obtain a browser-compatible Tesseract instance
async function getBrowserTesseract(): Promise<TesseractLibrary> {
  if (typeof window === "undefined") {
    throw new Error("Lingkungan bukan browser");
  }
  const existing = (window as TesseractWindow).Tesseract;
  if (existing) {
    return existing;
  }

  if (!tesseractScriptPromise) {
    tesseractScriptPromise = loadTesseractScript(TESSERACT_CDN)
      .catch(() => loadTesseractScript(TESSERACT_CDN_FALLBACK))
      .catch((err) => {
        // Izinkan percobaan ulang pada aksi pengguna berikutnya.
        tesseractScriptPromise = null;
        throw err;
      });
  }

  return tesseractScriptPromise;
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
    throw new Error("OCR tidak menemukan teks apa pun pada gambar. Pastikan Anda mengunggah foto KTP yang jelas.");
  }

  options.onStage("extract", 85);
  const parsed = parseKtpText(text, Math.max(0.55, confidence));

  // Validasi keaslian dokumen: apakah citra ini benar-benar e-KTP Indonesia?
  const validation = validateIsKtpDocument(text, parsed.data);
  if (!validation.isKtp) {
    throw new Error(
      validation.reason || "Dokumen KTP tidak terdeteksi. Silakan coba unggah foto KTP yang jelas.",
    );
  }

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
