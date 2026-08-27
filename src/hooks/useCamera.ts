import { useCallback, useEffect, useRef, useState } from "react";

export interface CameraDeviceInfo {
  deviceId: string;
  label: string;
}

export type CameraStatus = "idle" | "requesting" | "ready" | "denied" | "unavailable" | "error";

interface UseCameraResult {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  devices: CameraDeviceInfo[];
  activeDeviceId: string | null;
  status: CameraStatus;
  error: string | null;
  start: (deviceId?: string) => Promise<void>;
  stop: () => void;
  selectDevice: (deviceId: string) => Promise<void>;
  switchCamera: () => Promise<void>;
  capture: () => string | null;
  refreshDevices: () => Promise<void>;
}

export function useCamera(): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [devices, setDevices] = useState<CameraDeviceInfo[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("idle");
  }, []);

  const refreshDevices = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return;
    const all = await navigator.mediaDevices.enumerateDevices();
    const cams = all
      .filter((d) => d.kind === "videoinput")
      .map((d, index) => ({
        deviceId: d.deviceId,
        label: d.label || `Kamera ${index + 1}`,
      }));
    setDevices(cams);
  }, []);

  const start = useCallback(
    async (deviceId?: string) => {
      setError(null);
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setStatus("unavailable");
        setError("Browser ini tidak mendukung akses kamera.");
        return;
      }
      setStatus("requesting");
      try {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        const constraints: MediaStreamConstraints = {
          video: deviceId
            ? { deviceId: { exact: deviceId }, width: { ideal: 1920 } }
            : { facingMode: { ideal: "environment" }, width: { ideal: 1920 } },
          audio: false,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        const track = stream.getVideoTracks()[0];
        setActiveDeviceId(track?.getSettings().deviceId ?? deviceId ?? null);
        setStatus("ready");
        await refreshDevices();
      } catch (err) {
        const name = err instanceof DOMException ? err.name : "";
        if (name === "NotAllowedError" || name === "SecurityError") {
          setStatus("denied");
          setError("Izin kamera ditolak. Aktifkan izin kamera pada browser Anda.");
        } else if (name === "NotFoundError" || name === "OverconstrainedError") {
          setStatus("unavailable");
          setError("Tidak ada kamera/webcam yang terdeteksi pada perangkat ini.");
        } else {
          setStatus("error");
          setError("Gagal membuka kamera. Tutup aplikasi lain yang sedang memakai kamera.");
        }
      }
    },
    [refreshDevices],
  );

  const selectDevice = useCallback(
    async (deviceId: string) => {
      setActiveDeviceId(deviceId);
      await start(deviceId);
    },
    [start],
  );

  const switchCamera = useCallback(async () => {
    if (devices.length < 2) return;
    const index = devices.findIndex((d) => d.deviceId === activeDeviceId);
    const next = devices[(index + 1) % devices.length];
    if (next) await selectDevice(next.deviceId);
  }, [devices, activeDeviceId, selectDevice]);

  const capture = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;

    // Batasi lebar maksimal tangkapan kamera ke 1600px agar tidak membebani memori HP
    const maxDimension = 1600;
    const scale = Math.min(1, maxDimension / Math.max(video.videoWidth, video.videoHeight));
    const width = Math.round(video.videoWidth * scale);
    const height = Math.round(video.videoHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.92);
  }, []);

  useEffect(() => {
    void refreshDevices();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [refreshDevices]);

  return {
    videoRef,
    devices,
    activeDeviceId,
    status,
    error,
    start,
    stop,
    selectDevice,
    switchCamera,
    capture,
    refreshDevices,
  };
}
