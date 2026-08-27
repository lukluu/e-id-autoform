import { useRef, useState } from "react";
import { Camera, ImagePlus, ShieldCheck, UploadCloud, AlertTriangle, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CameraCapture } from "@/components/CameraCapture";
import { fileToDataUrl, validateImageFile } from "@/utils/imageProcessor";

interface UploadKtpProps {
  onImageReady: (dataUrl: string) => void;
}

export function UploadKtp({ onImageReady }: UploadKtpProps) {
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
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

  const handleOpenCamera = () => {
    // Cek apakah browser mendukung WebRTC MediaDevices (hanya aktif di localhost / HTTPS)
    const hasMediaDevices = typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
    if (hasMediaDevices) {
      setCameraOpen(true);
    } else {
      // Fallback otomatis ke kamera native HP / sistem
      nativeCameraInputRef.current?.click();
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
            <div className="space-y-3">
              <CameraCapture
                onCapture={(shot) => {
                  setCameraOpen(false);
                  onImageReady(shot);
                }}
                onClose={() => setCameraOpen(false)}
              />
              <div className="text-center pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => nativeCameraInputRef.current?.click()}
                  className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
                >
                  <Smartphone className="size-3.5" />
                  Atau ambil foto dengan Aplikasi Kamera HP
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button size="lg" className="h-12 gap-2" onClick={() => galleryInputRef.current?.click()}>
                  <ImagePlus className="size-4" /> Upload dari Galeri
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  className="h-12 gap-2"
                  onClick={handleOpenCamera}
                >
                  <Camera className="size-4" /> Ambil Foto / Kamera
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
                onClick={() => galleryInputRef.current?.click()}
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

          {/* Hidden Input: Galeri File */}
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            className="hidden"
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />

          {/* Hidden Input: Native Camera Capture (Bekerja di semua browser HP via HTTP / IP) */}
          <input
            ref={nativeCameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
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
