import { RotateCcw, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

interface RotateControlProps {
  rotation: number;
  onChange: (rotation: number) => void;
}

export function RotateControl({ rotation, onChange }: RotateControlProps) {
  const step = (delta: number) => {
    const next = ((rotation + delta + 180) % 360) - 180;
    onChange(next === -180 ? 180 : next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Rotasi
        </Label>
        <span className="text-xs font-semibold tabular-nums">{rotation}°</span>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => step(-90)}>
          <RotateCcw className="size-4" /> 90°
        </Button>
        <Button type="button" variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => step(90)}>
          <RotateCw className="size-4" /> 90°
        </Button>
      </div>
      <Slider
        min={-180}
        max={180}
        step={1}
        value={[rotation]}
        onValueChange={(v) => onChange(v[0] ?? 0)}
        aria-label="Rotasi manual"
      />
    </div>
  );
}
