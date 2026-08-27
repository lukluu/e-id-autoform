import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/pages/auth/LoginPage";

export const Route = createFileRoute("/login")({
  ssr: false,
  component: LoginPageWrapper,
});

function LoginPageWrapper() {
  const navigate = Route.useNavigate();
  return (
    <AppLayout activeTab="login">
      <LoginPage
        onNavigate={(tab) => {
          if (tab === "dashboard" || tab === "/") void navigate({ to: "/" });
          else if (tab === "register" || tab === "/register") void navigate({ to: "/register" });
          else if (tab === "forgot-password" || tab === "/forgot-password") void navigate({ to: "/forgot-password" });
        }}
      />
    </AppLayout>
  );
}
