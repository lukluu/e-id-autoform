import { Check, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import type { OcrProgress, OcrStage } from "@/types/ktp";

const STAGES: { stage: OcrStage; label: string }[] = [
  { stage: "prepare", label: "Menyiapkan gambar" },
  { stage: "enhance", label: "Meningkatkan kualitas gambar" },
  { stage: "read", label: "Membaca teks KTP" },
  { stage: "extract", label: "Mengekstrak data" },
  { stage: "fill", label: "Mengisi form" },
];

export function OCRProgress({ progress }: { progress: OcrProgress }) {
  const currentIndex = STAGES.findIndex((s) => s.stage === progress.stage);

  return (
    <Card className="mx-auto w-full max-w-xl">
      <CardContent className="space-y-5 p-6">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-medium">Memproses OCR...</p>
            <span className="text-lg font-semibold tabular-nums text-primary">
              {Math.round(progress.progress)}%
            </span>
          </div>
          <Progress value={progress.progress} />
        </div>
        <ul className="space-y-2.5">
          {STAGES.map((item, index) => {
            const done = currentIndex > index || progress.stage === "done";
            const active = currentIndex === index && progress.stage !== "done";
            return (
              <li
                key={item.stage}
                className={`flex items-center gap-2.5 text-sm ${
                  done ? "text-success" : active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {done ? (
                  <Check className="size-4" />
                ) : active ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <span className="size-4 rounded-full border border-current opacity-40" />
                )}
                {item.label}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
