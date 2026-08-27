import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";

export const Route = createFileRoute("/forgot-password")({
  ssr: false,
  component: ForgotPasswordWrapper,
});

function ForgotPasswordWrapper() {
  const navigate = Route.useNavigate();
  return (
    <AppLayout activeTab="forgot-password">
      <ForgotPasswordPage
        onNavigate={(tab) => {
          if (tab === "login" || tab === "/login") void navigate({ to: "/login" });
          else if (tab === "dashboard" || tab === "/") void navigate({ to: "/" });
        }}
      />
    </AppLayout>
  );
}
