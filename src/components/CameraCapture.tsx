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
        <div className="pointer-events-none absolute inset-6 rounded-lg border-2 border-dashed border-primary/60" />
      </div>

      {camera.error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertDescription>{camera.error}</AlertDescription>
        </Alert>
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
