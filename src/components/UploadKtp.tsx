import { useRef, useState } from "react";
import { Camera, ImagePlus, ShieldCheck, Sparkles, UploadCloud, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CameraCapture } from "@/components/CameraCapture";
import { fileToDataUrl, validateImageFile } from "@/utils/imageProcessor";

interface UploadKtpProps {
  onImageReady: (dataUrl: string) => void;
  useMockEngine: boolean;
  onToggleMock: (value: boolean) => void;
}

export function UploadKtp({ onImageReady, useMockEngine, onToggleMock }: UploadKtpProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const invalid = validateImageFile(file);
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);
    try {
      onImageReady(await fileToDataUrl(file));
    } catch {
      setError("Gagal membaca berkas gambar. Coba gambar lain.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <Card className="overflow-hidden">
        <CardContent className="space-y-5 p-5 sm:p-8">
          <div className="space-y-1.5 text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Scan KTP Indonesia
            </h2>
            <p className="text-sm text-muted-foreground">
              Unggah gambar KTP atau gunakan kamera. Data diproses langsung di perangkat Anda.
            </p>
          </div>

          {cameraOpen ? (
            <CameraCapture
              onCapture={(shot) => {
                setCameraOpen(false);
                onImageReady(shot);
              }}
              onClose={() => setCameraOpen(false)}
            />
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button size="lg" className="h-12 gap-2" onClick={() => inputRef.current?.click()}>
                  <ImagePlus className="size-4" /> Upload dari Galeri
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  className="h-12 gap-2"
                  onClick={() => setCameraOpen(true)}
                >
                  <Camera className="size-4" /> Buka Kamera
                </Button>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  void handleFile(e.dataTransfer.files[0]);
                }}
                onClick={() => inputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
                  dragging
                    ? "border-primary bg-primary/5"
                    : "border-border bg-muted/40 hover:border-primary/50"
                }`}
              >
                <UploadCloud className="size-8 text-muted-foreground" />
                <p className="text-sm font-medium">atau drag &amp; drop gambar KTP di sini</p>
                <p className="text-xs text-muted-foreground">Format JPG, JPEG, PNG — maks. 12MB</p>
              </div>
            </>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            className="hidden"
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
            <div className="flex items-start gap-2.5">
              <Sparkles className="mt-0.5 size-4 text-primary" />
              <div>
                <Label htmlFor="mock-engine" className="text-sm font-medium">
                  Mode demo (mock OCR)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Uji alur tanpa mengunduh model OCR.
                </p>
              </div>
            </div>
            <Switch id="mock-engine" checked={useMockEngine} onCheckedChange={onToggleMock} />
          </div>
        </CardContent>
      </Card>

      <p className="flex items-start justify-center gap-2 text-center text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
        Gambar dan data KTP hanya disimpan sementara di memori browser, tidak dikirim ke server dan
        akan hilang saat halaman dimuat ulang.
      </p>
    </div>
  );
}
