import { useState } from "react";
import { AlertTriangle, ChevronDown, FileText, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ImagePreview } from "@/components/ImagePreview";
import { KtpForm } from "@/components/KtpForm";
import type { ConfidenceMap, KtpData } from "@/types/ktp";
import { isValidNik } from "@/utils/validation";

interface OCRResultProps {
  image: string | null;
  data: KtpData;
  confidences: ConfidenceMap;
  rawText: string;
  warnings: string[];
  onSubmitData: (values: KtpData) => void;
  onRescan: () => void;
  onClear: () => void;
}

export function OCRResult({
  image,
  data,
  confidences,
  rawText,
  warnings,
  onSubmitData,
  onRescan,
  onClear,
}: OCRResultProps) {
  const [showRaw, setShowRaw] = useState(false);
  const values = Object.values(confidences);
  const overall = values.length
    ? Math.round((values.reduce((s, c) => s + c.confidence, 0) / values.length) * 100)
    : 0;
  const nikValid = isValidNik(data.nik);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold tracking-tight">Hasil OCR</h2>
        <Badge variant="secondary">Rata-rata confidence {overall}%</Badge>
        <Badge variant={nikValid ? "secondary" : "destructive"}>
          {nikValid ? "NIK valid (16 digit)" : "NIK belum valid"}
        </Badge>
        <Button variant="outline" size="sm" className="ml-auto" onClick={onRescan}>
          Pindai ulang
        </Button>
      </div>

      {warnings.length > 0 && (
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertTitle>Periksa kembali hasil OCR</AlertTitle>
          <AlertDescription>
            <ul className="list-inside list-disc space-y-0.5">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <ImagePreview
            src={image}
            caption="Gambar hanya tersimpan di memori browser selama sesi ini."
          />
          <Card>
            <CardContent className="space-y-3 p-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-between px-0"
                onClick={() => setShowRaw((v) => !v)}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="size-4" /> Teks OCR mentah
                </span>
                <ChevronDown className={`size-4 transition-transform ${showRaw ? "rotate-180" : ""}`} />
              </Button>
              {showRaw && (
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-[11px] leading-relaxed text-muted-foreground">
                  {rawText || "(kosong)"}
                </pre>
              )}
              <p className="flex items-start gap-2 text-[11px] text-muted-foreground">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-success" />
                Semua field dapat diedit manual. Tidak ada data yang dikirim ke server.
              </p>
            </CardContent>
          </Card>
        </div>

        <KtpForm
          data={data}
          confidences={confidences}
          onSubmitData={onSubmitData}
          onReset={() => onSubmitData(data)}
          onClear={onClear}
        />
      </div>
    </div>
  );
}
