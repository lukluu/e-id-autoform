import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { RegisterPage } from "@/pages/auth/RegisterPage";

export const Route = createFileRoute("/register")({
  ssr: false,
  component: RegisterPageWrapper,
});

function RegisterPageWrapper() {
  const navigate = Route.useNavigate();
  return (
    <AppLayout activeTab="register">
      <RegisterPage
        onNavigate={(tab) => {
          if (tab === "dashboard" || tab === "/") void navigate({ to: "/" });
          else if (tab === "login" || tab === "/login") void navigate({ to: "/login" });
        }}
      />
    </AppLayout>
  );
}
