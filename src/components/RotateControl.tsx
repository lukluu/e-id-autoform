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
    const next = Math.round((((rotation + delta + 180) % 360) - 180) * 10) / 10;
    onChange(next === -180 ? 180 : next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Rotasi Kemiringan
        </Label>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold tabular-nums text-primary">{rotation}°</span>
          {rotation !== 0 && (
            <button
              type="button"
              onClick={() => onChange(0)}
              className="text-[10px] text-muted-foreground underline hover:text-foreground"
            >
              Reset 0°
            </button>
          )}
        </div>
      </div>

      {/* Tombol rotasi cepat & presisi */}
      <div className="grid grid-cols-4 gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-1 text-xs"
          onClick={() => step(-90)}
          title="Putar 90° ke kiri"
        >
          <RotateCcw className="mr-1 size-3" /> -90°
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-1 text-xs font-medium"
          onClick={() => step(-1)}
          title="Luruskan 1° ke kiri"
        >
          -1°
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-1 text-xs font-medium"
          onClick={() => step(1)}
          title="Luruskan 1° ke kanan"
        >
          +1°
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-1 text-xs"
          onClick={() => step(90)}
          title="Putar 90° ke kanan"
        >
          +90° <RotateCw className="ml-1 size-3" />
        </Button>
      </div>

      <Slider
        min={-180}
        max={180}
        step={0.5}
        value={[rotation]}
        onValueChange={(v) => onChange(v[0] ?? 0)}
        aria-label="Rotasi manual"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>-180°</span>
        <span>0°</span>
        <span>+180°</span>
      </div>
    </div>
  );
}
