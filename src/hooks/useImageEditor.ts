import { useCallback, useState } from "react";
import { KTP_ASPECT_RATIO } from "@/types/ktp";
import {
  defaultAdjustments,
  renderProcessedImage,
  type CropRect,
  type ImageAdjustments,
} from "@/utils/imageProcessor";

const defaultCrop: CropRect = { x: 0.05, y: 0.1, width: 0.9, height: 0.8 };

export function useImageEditor() {
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [crop, setCrop] = useState<CropRect>(defaultCrop);
  const [adjustments, setAdjustments] = useState<ImageAdjustments>({ ...defaultAdjustments });

  const setAdjustment = useCallback(
    <K extends keyof ImageAdjustments>(key: K, value: ImageAdjustments[K]) => {
      setAdjustments((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const zoomIn = useCallback(() => setZoom((z) => Math.min(2.5, +(z + 0.1).toFixed(2))), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2))), []);
  const resetZoom = useCallback(() => setZoom(1), []);

  const resetAll = useCallback(() => {
    setRotation(0);
    setZoom(1);
    setCrop({ ...defaultCrop });
    setAdjustments({ ...defaultAdjustments });
  }, []);

  const render = useCallback(
    (src: string) => renderProcessedImage(src, { rotation, crop, adjustments, maxWidth: 2000 }),
    [rotation, crop, adjustments],
  );

  return {
    rotation,
    setRotation,
    zoom,
    zoomIn,
    zoomOut,
    resetZoom,
    crop,
    setCrop,
    adjustments,
    setAdjustment,
    resetAll,
    render,
    aspectRatio: KTP_ASPECT_RATIO,
  };
}
