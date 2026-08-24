import { CheckCircle2, CircleAlert, CircleHelp } from "lucide-react";
import type { FieldConfidence } from "@/types/ktp";

const MAP = {
  high: { label: "High", className: "text-success", Icon: CheckCircle2 },
  medium: { label: "Medium", className: "text-warning", Icon: CircleAlert },
  low: { label: "Low", className: "text-destructive", Icon: CircleHelp },
} as const;

export function ConfidenceIndicator({ confidence }: { confidence?: FieldConfidence | undefined }) {
  if (!confidence) {
    return <span className="text-[11px] text-muted-foreground">Manual</span>;
  }
  const { label, className, Icon } = MAP[confidence.status];
  return (
    <span className={`flex items-center gap-1 text-[11px] font-medium ${className}`}>
      <Icon className="size-3.5" />
      {label} · {Math.round(confidence.confidence * 100)}%
    </span>
  );
}
