import { create } from "zustand";
import {
  emptyKtpData,
  type ConfidenceMap,
  type KtpData,
  type OcrProgress,
} from "@/types/ktp";

export type AppStep = "upload" | "editor" | "result";

interface KtpState {
  step: AppStep;
  /** Gambar asli (data URL, hanya di memori — tidak disimpan permanen). */
  sourceImage: string | null;
  /** Gambar hasil crop/rotate yang dipakai OCR. */
  processedImage: string | null;
  data: KtpData;
  confidences: ConfidenceMap;
  rawText: string;
  warnings: string[];
  progress: OcrProgress;
  error: string | null;
  useMockEngine: boolean;

  setStep: (step: AppStep) => void;
  setSourceImage: (image: string | null) => void;
  setProcessedImage: (image: string | null) => void;
  setData: (data: KtpData) => void;
  setOcrOutput: (payload: {
    data: KtpData;
    confidences: ConfidenceMap;
    rawText: string;
    warnings: string[];
  }) => void;
  setProgress: (progress: OcrProgress) => void;
  setError: (error: string | null) => void;
  toggleMockEngine: (value: boolean) => void;
  reset: () => void;
}

const initialProgress: OcrProgress = { stage: "idle", progress: 0, message: "" };

export const useKtpStore = create<KtpState>((set) => ({
  step: "upload",
  sourceImage: null,
  processedImage: null,
  data: { ...emptyKtpData },
  confidences: {},
  rawText: "",
  warnings: [],
  progress: initialProgress,
  error: null,
  useMockEngine: false,

  setStep: (step) => set({ step }),
  setSourceImage: (sourceImage) => set({ sourceImage }),
  setProcessedImage: (processedImage) => set({ processedImage }),
  setData: (data) => set({ data }),
  setOcrOutput: ({ data, confidences, rawText, warnings }) =>
    set({ data, confidences, rawText, warnings }),
  setProgress: (progress) => set({ progress }),
  setError: (error) => set({ error }),
  toggleMockEngine: (useMockEngine) => set({ useMockEngine }),
  reset: () =>
    set({
      step: "upload",
      sourceImage: null,
      processedImage: null,
      data: { ...emptyKtpData },
      confidences: {},
      rawText: "",
      warnings: [],
      progress: initialProgress,
      error: null,
    }),
}));
