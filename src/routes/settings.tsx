import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { SettingsPage } from "@/pages/SettingsPage";

export const Route = createFileRoute("/settings")({
  ssr: false,
  component: SettingsRouteComponent,
});

function SettingsRouteComponent() {
  return (
    <AppLayout activeTab="settings">
      <SettingsPage />
    </AppLayout>
  );
}
