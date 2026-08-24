import { useCallback, useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Header } from "@/components/Header";
import { UploadKtp } from "@/components/UploadKtp";
import { ImageEditor } from "@/components/ImageEditor";
import { OCRProgress } from "@/components/OCRProgress";
import { OCRResult } from "@/components/OCRResult";
import { useKtpStore } from "@/store/ktpStore";
import { useOCR } from "@/hooks/useOCR";
import type { KtpData } from "@/types/ktp";

export function Home() {
  const store = useKtpStore();
  const { scan, isRunning } = useOCR();
  const [cameraAvailable, setCameraAvailable] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return;
    void navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => setCameraAvailable(devices.some((d) => d.kind === "videoinput")))
      .catch(() => setCameraAvailable(false));
  }, []);

  const handleImageReady = useCallback(
    (dataUrl: string) => {
      store.setSourceImage(dataUrl);
      store.setError(null);
      store.setStep("editor");
    },
    [store],
  );

  const handleConfirmImage = useCallback(
    async (dataUrl: string) => {
      store.setProcessedImage(dataUrl);
      await scan(dataUrl);
    },
    [scan, store],
  );

  const handleSubmitData = useCallback((values: KtpData) => store.setData(values), [store]);

  const showProgress =
    isRunning || (store.step === "editor" && store.progress.stage !== "idle" && store.progress.stage !== "error");

  return (
    <div className="min-h-screen bg-background">
      <Header cameraAvailable={cameraAvailable} onReset={store.reset} />

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        {store.error && (
          <Alert variant="destructive" className="mx-auto mb-4 max-w-3xl">
            <AlertTriangle className="size-4" />
            <AlertTitle>Proses OCR gagal</AlertTitle>
            <AlertDescription>{store.error}</AlertDescription>
          </Alert>
        )}

        {store.step === "upload" && (
          <UploadKtp
            onImageReady={handleImageReady}
            useMockEngine={store.useMockEngine}
            onToggleMock={store.toggleMockEngine}
          />
        )}

        {store.step === "editor" && store.sourceImage && (
          <div className="space-y-5">
            <ImageEditor
              src={store.sourceImage}
              busy={isRunning}
              onCancel={store.reset}
              onConfirm={(dataUrl) => void handleConfirmImage(dataUrl)}
            />
            {showProgress && <OCRProgress progress={store.progress} />}
          </div>
        )}

        {store.step === "result" && (
          <OCRResult
            image={store.processedImage}
            data={store.data}
            confidences={store.confidences}
            rawText={store.rawText}
            warnings={store.warnings}
            onSubmitData={handleSubmitData}
            onRescan={() => store.setStep("editor")}
            onClear={store.reset}
          />
        )}
      </main>
    </div>
  );
}
