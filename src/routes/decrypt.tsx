import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { DecryptPage } from "@/pages/DecryptPage";

export const Route = createFileRoute("/decrypt")({
  ssr: false,
  component: DecryptRouteComponent,
});

function DecryptRouteComponent() {
  const navigate = useNavigate();

  const handleNavigate = (dest: string) => {
    if (dest === "dashboard" || dest === "/") void navigate({ to: "/" });
    else if (dest === "ocr" || dest === "/ocr") void navigate({ to: "/ocr" });
    else if (dest === "decrypt" || dest === "/decrypt") void navigate({ to: "/decrypt" });
    else if (dest === "security" || dest === "/security") void navigate({ to: "/security" });
    else if (dest === "settings" || dest === "/settings") void navigate({ to: "/settings" });
  };

  return (
    <AppLayout activeTab="decrypt">
      <DecryptPage onNavigate={handleNavigate as any} />
    </AppLayout>
  );
}
