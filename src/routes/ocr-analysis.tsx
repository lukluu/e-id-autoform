import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { OcrAnalysisPage } from "@/pages/OcrAnalysisPage";

export const Route = createFileRoute("/ocr-analysis")({
  ssr: false,
  component: OcrAnalysisRouteComponent,
});

function OcrAnalysisRouteComponent() {
  return (
    <AppLayout activeTab="ocr-analysis">
      <OcrAnalysisPage />
    </AppLayout>
  );
}
