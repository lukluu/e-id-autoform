import { useCallback, useState } from "react";
import { useKtpStore } from "@/store/ktpStore";
import { mockEngine, runOcr } from "@/services/ocrService";
import type { OcrStage } from "@/types/ktp";

const STAGE_MESSAGE: Record<OcrStage, string> = {
  idle: "",
  prepare: "Menyiapkan gambar",
  enhance: "Meningkatkan kualitas gambar",
  read: "Membaca teks KTP",
  extract: "Mengekstrak data",
  fill: "Mengisi form",
  done: "Selesai",
  error: "Gagal memproses",
};

export function useOCR() {
  const [isRunning, setIsRunning] = useState(false);
  const setProgress = useKtpStore((s) => s.setProgress);
  const setOcrOutput = useKtpStore((s) => s.setOcrOutput);
  const setError = useKtpStore((s) => s.setError);
  const setStep = useKtpStore((s) => s.setStep);
  const useMockEngine = useKtpStore((s) => s.useMockEngine);

  const scan = useCallback(
    async (imageDataUrl: string) => {
      setIsRunning(true);
      setError(null);
      setProgress({ stage: "prepare", progress: 2, message: STAGE_MESSAGE.prepare });
      try {
        const result = await runOcr(imageDataUrl, {
          engine: useMockEngine ? mockEngine : undefined,
          onStage: (stage, progress) =>
            setProgress({ stage, progress, message: STAGE_MESSAGE[stage] }),
        });
        setOcrOutput({
          data: result.data,
          confidences: result.confidences,
          rawText: result.rawText,
          warnings: result.warnings,
        });
        setProgress({ stage: "done", progress: 100, message: STAGE_MESSAGE.done });
        setStep("result");
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat memproses OCR. Coba lagi dengan gambar yang lebih jelas.";
        setError(message);
        setProgress({ stage: "error", progress: 0, message: STAGE_MESSAGE.error });
      } finally {
        setIsRunning(false);
      }
    },
    [setError, setOcrOutput, setProgress, setStep, useMockEngine],
  );

  return { scan, isRunning };
}
