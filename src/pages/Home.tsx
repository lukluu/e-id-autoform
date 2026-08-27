import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardPage } from "@/pages/DashboardPage";
import { authService } from "@/services/authService";

export function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
  const [authReady, setAuthReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = authService.subscribe((user) => {
      const authed = Boolean(user);
      setIsAuthenticated(authed);
      setAuthReady(true);
      if (!authed) {
        void navigate({ to: "/login" });
      }
    });

    void authService.validateSession().then((validUser) => {
      setAuthReady(true);
      if (!validUser) {
        void navigate({ to: "/login" });
      }
    });

    return () => unsub();
  }, [navigate]);

  // Loading state saat verifikasi sesi pertama kali
  if (!authReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AppLayout activeTab="dashboard">
      <DashboardPage
        onNavigate={(tab) => {
          if (tab === "ocr") void navigate({ to: "/ocr" });
          else if (tab === "decrypt") void navigate({ to: "/decrypt" });
          else if (tab === "security") void navigate({ to: "/security" });
          else if (tab === "settings") void navigate({ to: "/settings" });
        }}
      />
    </AppLayout>
  );
}
