import { useCallback, useEffect, useRef, useState } from "react";
import { KTP_ASPECT_RATIO } from "@/types/ktp";
import {
  adjustmentsToCssFilter,
  type CropRect,
  type ImageAdjustments,
} from "@/utils/imageProcessor";

type Handle = "nw" | "ne" | "sw" | "se";

interface CropperProps {
  src: string;
  rotation: number;
  zoom: number;
  adjustments: ImageAdjustments;
  crop: CropRect;
  lockAspect: boolean;
  onCropChange: (crop: CropRect) => void;
  onImageLoad?: (size: { width: number; height: number }) => void;
}

const MIN_SIZE = 0.08;

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function Cropper({
  src,
  rotation,
  zoom,
  adjustments,
  crop,
  lockAspect,
  onCropChange,
  onImageLoad,
}: CropperProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const dragRef = useRef<{
    mode: "move" | Handle;
    startX: number;
    startY: number;
    start: CropRect;
    stageW: number;
    stageH: number;
  } | null>(null);

  const rad = (rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const rotW = natural.width * cos + natural.height * sin;
  const rotH = natural.width * sin + natural.height * cos;
  const stageAspect = rotW && rotH ? rotW / rotH : KTP_ASPECT_RATIO;
  const innerScale = rotW ? Math.min(rotW / natural.width, rotH / natural.height) : 1;

  const onPointerDown = useCallback(
    (event: React.PointerEvent, mode: "move" | Handle) => {
      event.preventDefault();
      event.stopPropagation();
      const rect = stageRef.current?.getBoundingClientRect();
      if (!rect) return;

      try {
        (event.target as Element).setPointerCapture?.(event.pointerId);
      } catch {
        // fallback jika pointer capture tidak didukung
      }

      dragRef.current = {
        mode,
        startX: event.clientX,
        startY: event.clientY,
        start: { ...crop },
        stageW: rect.width || 1,
        stageH: rect.height || 1,
      };
    },
    [crop],
  );

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      // Hitung delta koordinat relatif terhadap ukuran stage kanvas saat drag dimulai
      const dx = (event.clientX - drag.startX) / drag.stageW;
      const dy = (event.clientY - drag.startY) / drag.stageH;
      const s = drag.start;
      const aspectInStage = lockAspect ? (KTP_ASPECT_RATIO * rotH) / (rotW || 1) : 0;

      if (drag.mode === "move") {
        onCropChange({
          ...s,
          x: clamp(s.x + dx, 0, 1 - s.width),
          y: clamp(s.y + dy, 0, 1 - s.height),
        });
        return;
      }

      let { x, y, width, height } = s;
      if (drag.mode === "se" || drag.mode === "ne") width = clamp(s.width + dx, MIN_SIZE, 1 - s.x);
      if (drag.mode === "sw" || drag.mode === "nw") {
        width = clamp(s.width - dx, MIN_SIZE, s.x + s.width);
        x = s.x + s.width - width;
      }
      if (lockAspect && aspectInStage > 0) {
        height = clamp(width / aspectInStage, MIN_SIZE, 1);
        width = height * aspectInStage;
      } else {
        if (drag.mode === "se" || drag.mode === "sw")
          height = clamp(s.height + dy, MIN_SIZE, 1 - s.y);
        if (drag.mode === "ne" || drag.mode === "nw") {
          height = clamp(s.height - dy, MIN_SIZE, s.y + s.height);
        }
      }
      if (drag.mode === "ne" || drag.mode === "nw") y = s.y + s.height - height;
      x = clamp(x, 0, 1 - width);
      y = clamp(y, 0, 1 - height);
      onCropChange({ x, y, width, height });
    };

    const handleUp = (event: PointerEvent) => {
      if (dragRef.current) {
        try {
          (event.target as Element)?.releasePointerCapture?.(event.pointerId);
        } catch {
          // ignore
        }
        dragRef.current = null;
      }
    };

    window.addEventListener("pointermove", handleMove, { passive: true });
    window.addEventListener("pointerup", handleUp, { passive: true });
    window.addEventListener("pointercancel", handleUp, { passive: true });

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [lockAspect, onCropChange, rotH, rotW]);

  const handles: Handle[] = ["nw", "ne", "sw", "se"];
  const handlePos: Record<Handle, string> = {
    nw: "-left-2 -top-2 cursor-nwse-resize",
    ne: "-right-2 -top-2 cursor-nesw-resize",
    sw: "-left-2 -bottom-2 cursor-nesw-resize",
    se: "-right-2 -bottom-2 cursor-nwse-resize",
  };

  return (
    <div className="flex min-h-[260px] w-full max-h-[65vh] items-center justify-center overflow-hidden rounded-xl bg-editor-canvas p-2 sm:p-4 touch-none select-none">
      <div
        ref={stageRef}
        className="relative select-none touch-none"
        style={{
          aspectRatio: String(stageAspect),
          width: `min(100%, calc(58vh * ${stageAspect}))`,
          maxWidth: "100%",
          maxHeight: "58vh",
          transform: `scale(${zoom})`,
          transformOrigin: "center center",
          touchAction: "none",
        }}
      >
        <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
          <img
            src={src}
            alt="Pratinjau KTP"
            draggable={false}
            onLoad={(e) => {
              const el = e.currentTarget;
              const size = { width: el.naturalWidth, height: el.naturalHeight };
              setNatural(size);
              onImageLoad?.(size);
            }}
            className="absolute left-1/2 top-1/2 max-w-none origin-center pointer-events-none select-none"
            style={{
              width: `${(natural.width / (rotW || 1)) * 100}%`,
              transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(${innerScale})`,
              filter: adjustmentsToCssFilter(adjustments),
            }}
          />
        </div>

        {/* Overlay gelap di luar area crop */}
        <div
          className="pointer-events-none absolute inset-0 rounded-lg"
          style={{
            boxShadow: "0 0 0 9999px rgba(2, 12, 22, 0.55) inset",
            clipPath: `polygon(0% 0%,0% 100%,${crop.x * 100}% 100%,${crop.x * 100}% ${crop.y * 100}%,${(crop.x + crop.width) * 100}% ${crop.y * 100}%,${(crop.x + crop.width) * 100}% ${(crop.y + crop.height) * 100}%,${crop.x * 100}% ${(crop.y + crop.height) * 100}%,${crop.x * 100}% 100%,100% 100%,100% 0%)`,
          }}
        />

        {/* Kotak Crop Interaktif */}
        <div
          onPointerDown={(e) => onPointerDown(e, "move")}
          className="absolute cursor-move border-2 border-primary shadow-[0_0_0_1px_rgba(255,255,255,0.45)] touch-none select-none"
          style={{
            left: `${crop.x * 100}%`,
            top: `${crop.y * 100}%`,
            width: `${crop.width * 100}%`,
            height: `${crop.height * 100}%`,
            touchAction: "none",
          }}
        >
          {/* Grid Panduan 3x3 */}
          <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="border border-primary/20" />
            ))}
          </div>

          {/* 4 Titik Handle Sudut */}
          {handles.map((h) => (
            <span
              key={h}
              onPointerDown={(e) => onPointerDown(e, h)}
              className={`absolute size-4 sm:size-3.5 rounded-full border-2 border-primary bg-card shadow-sm ${handlePos[h]} touch-none`}
              style={{ touchAction: "none" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
