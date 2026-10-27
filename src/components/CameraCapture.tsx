import { useEffect } from "react";
import { Camera, RefreshCw, SwitchCamera, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CameraSelector } from "@/components/CameraSelector";
import { useCamera } from "@/hooks/useCamera";

interface CameraCaptureProps {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const camera = useCamera();
  const { start, stop } = camera;

  useEffect(() => {
    void start();
    return () => stop();
  }, [start, stop]);

  const handleCapture = () => {
    const shot = camera.capture();
    if (!shot) return;
    stop();
    onCapture(shot);
  };

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-xl bg-editor-canvas">
        <video
          ref={camera.videoRef}
          playsInline
          muted
          className="aspect-video w-full object-contain"
        />
        {camera.status !== "ready" && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            {camera.status === "requesting" ? "Membuka kamera..." : "Kamera belum aktif"}
          </div>
        )}
        <div className="pointer-events-none absolute inset-6 rounded-lg border border-dashed border-primary/50" />
      </div>

      {camera.error && (
        <div className="space-y-2">
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertDescription className="text-xs">{camera.error}</AlertDescription>
          </Alert>
          {camera.status === "unavailable" && (
            <div className="space-y-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs">
              <p className="font-medium text-foreground">
                Browser memblokir webcam langsung pada koneksi HTTP non-localhost.
              </p>
              <p className="text-[11px] text-muted-foreground">
                Anda tetap dapat mengambil foto KTP dengan kamera bawaan ponsel melalui tombol di
                bawah.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <CameraSelector
          devices={camera.devices}
          activeDeviceId={camera.activeDeviceId}
          onSelect={(id) => void camera.selectDevice(id)}
        />
        <div className="flex items-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            title="Muat ulang daftar kamera"
            onClick={() => void camera.refreshDevices()}
          >
            <RefreshCw className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            title="Ganti kamera"
            disabled={camera.devices.length < 2}
            onClick={() => void camera.switchCamera()}
          >
            <SwitchCamera className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          className="flex-1 gap-2"
          disabled={camera.status !== "ready"}
          onClick={handleCapture}
        >
          <Camera className="size-4" /> Ambil Gambar
        </Button>
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={() => {
            stop();
            onClose();
          }}
        >
          <X className="size-4" /> Tutup
        </Button>
      </div>
    </div>
  );
}
