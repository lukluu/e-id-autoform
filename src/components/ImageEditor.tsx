import { useCallback, useEffect, useState } from "react";
import {
  Contrast,
  Crop,
  Droplets,
  Loader2,
  RotateCcw,
  ScanLine,
  Sun,
  Wand2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Cropper } from "@/components/Cropper";
import { RotateControl } from "@/components/RotateControl";
import { KTP_ASPECT_RATIO } from "@/types/ktp";
import { useImageEditor } from "@/hooks/useImageEditor";

interface ImageEditorProps {
  src: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
}

export function ImageEditor({ src, busy, onCancel, onConfirm }: ImageEditorProps) {
  const editor = useImageEditor();
  const [lockAspect, setLockAspect] = useState(true);
  const [preparing, setPreparing] = useState(false);
  const { resetAll } = editor;

  useEffect(() => {
    resetAll();
  }, [src, resetAll]);

  const handleConfirm = useCallback(async () => {
    setPreparing(true);
    try {
      const result = await editor.render(src);
      onConfirm(result);
    } finally {
      setPreparing(false);
    }
  }, [editor, onConfirm, src]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="flex items-center gap-2">
            <Crop className="size-4 text-primary" />
            <h2 className="text-lg font-semibold tracking-tight">Image Editor</h2>
            <span className="ml-auto text-xs text-muted-foreground">
              Rasio KTP {KTP_ASPECT_RATIO.toFixed(3)} (85.60 × 53.98 mm)
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <Cropper
              src={src}
              rotation={editor.rotation}
              zoom={editor.zoom}
              adjustments={editor.adjustments}
              crop={editor.crop}
              lockAspect={lockAspect}
              onCropChange={editor.setCrop}
            />

            <div className="space-y-4 rounded-xl border border-border bg-muted/25 p-4">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="lock-aspect"
                  className="text-xs uppercase tracking-wide text-muted-foreground"
                >
                  Kunci rasio KTP
                </Label>
                <Switch id="lock-aspect" checked={lockAspect} onCheckedChange={setLockAspect} />
              </div>

              <Separator />
              <RotateControl rotation={editor.rotation} onChange={editor.setRotation} />

              <Separator />
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Zoom
                </Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={editor.zoomOut}
                  >
                    <ZoomOut className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={editor.zoomIn}
                  >
                    <ZoomIn className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={editor.resetZoom}
                  >
                    <RotateCcw className="size-4" />
                  </Button>
                </div>
              </div>

              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                    <Sun className="size-3.5" /> Brightness
                  </Label>
                  <span className="text-xs tabular-nums">{editor.adjustments.brightness}%</span>
                </div>
                <Slider
                  min={50}
                  max={180}
                  step={1}
                  value={[editor.adjustments.brightness]}
                  onValueChange={(v) => editor.setAdjustment("brightness", v[0] ?? 100)}
                />
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                    <Contrast className="size-3.5" /> Contrast
                  </Label>
                  <span className="text-xs tabular-nums">{editor.adjustments.contrast}%</span>
                </div>
                <Slider
                  min={50}
                  max={200}
                  step={1}
                  value={[editor.adjustments.contrast]}
                  onValueChange={(v) => editor.setAdjustment("contrast", v[0] ?? 100)}
                />
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="grayscale"
                    className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground"
                  >
                    <Droplets className="size-3.5" /> Grayscale
                  </Label>
                  <Switch
                    id="grayscale"
                    checked={editor.adjustments.grayscale}
                    onCheckedChange={(v) => editor.setAdjustment("grayscale", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="sharpen"
                    className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground"
                  >
                    <Wand2 className="size-3.5" /> Sharpen
                  </Label>
                  <Switch
                    id="sharpen"
                    checked={editor.adjustments.sharpen}
                    onCheckedChange={(v) => editor.setAdjustment("sharpen", v)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="gap-2" onClick={onCancel}>
              <X className="size-4" /> Batal
            </Button>
            <Button type="button" variant="outline" className="gap-2" onClick={editor.resetAll}>
              <RotateCcw className="size-4" /> Reset
            </Button>
            <Button
              type="button"
              className="ml-auto min-w-40 gap-2"
              disabled={busy || preparing}
              onClick={() => void handleConfirm()}
            >
              {busy || preparing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ScanLine className="size-4" />
              )}
              Scan KTP
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
