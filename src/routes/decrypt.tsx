import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppLayout, type AppPageTab } from "@/components/layout/AppLayout";
import { DecryptPage } from "@/pages/DecryptPage";

export const Route = createFileRoute("/decrypt")({
  ssr: false,
  component: DecryptRouteComponent,
});

function DecryptRouteComponent() {
  const navigate = useNavigate();

  const handleNavigate = (dest: AppPageTab) => {
    if (dest === "dashboard") void navigate({ to: "/" });
    else if (dest === "ocr") void navigate({ to: "/ocr" });
    else if (dest === "decrypt") void navigate({ to: "/decrypt" });
    else if (dest === "ocr-analysis") void navigate({ to: "/ocr-analysis" });
    else if (dest === "security") void navigate({ to: "/security" });
    else if (dest === "settings") void navigate({ to: "/settings" });
  };

  return (
    <AppLayout>
      <DecryptPage onNavigate={handleNavigate} />
    </AppLayout>
  );
}
