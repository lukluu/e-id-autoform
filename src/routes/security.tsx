import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { SecurityAnalysisPage } from "@/pages/SecurityAnalysisPage";

export const Route = createFileRoute("/security")({
  ssr: false,
  component: SecurityRouteComponent,
});

function SecurityRouteComponent() {
  return (
    <AppLayout activeTab="security">
      <SecurityAnalysisPage />
    </AppLayout>
  );
}
