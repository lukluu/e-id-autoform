import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import {
  Shield,
  Scan,
  Unlock,
  Activity,
  LogOut,
  LogIn,
  UserPlus,
  Database,
  Menu,
  X,
  User,
  Settings,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authService } from "@/services/authService";
import type { UserRecord } from "@/services/dbService";

export type AppPageTab =
  | "dashboard"
  | "ocr"
  | "decrypt"
  | "security"
  | "ocr-analysis"
  | "settings"
  | "login"
  | "register"
  | "forgot-password";

interface AppLayoutProps {
  children: React.ReactNode;
  activeTab?: AppPageTab;
  currentTab?: AppPageTab;
  onTabChange?: (tab: AppPageTab) => void;
}

interface NavItem {
  id: AppPageTab;
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const primaryNav: NavItem[] = [
  { id: "dashboard", path: "/", label: "Beranda", icon: Activity },
  { id: "ocr", path: "/ocr", label: "Scan & enkripsi", icon: Scan },
  { id: "decrypt", path: "/decrypt", label: "Data terenkripsi", icon: Unlock },
];

const secondaryNav: NavItem[] = [
  { id: "ocr-analysis", path: "/ocr-analysis", label: "Analisis OCR", icon: Sparkles },
  { id: "security", path: "/security", label: "Analisis kripto", icon: Shield },
];

const allNav = [...primaryNav, ...secondaryNav];

export function AppLayout({ children, activeTab, currentTab, onTabChange }: AppLayoutProps) {
  const [currentUser, setCurrentUser] = useState<UserRecord | null>(authService.getCurrentUser());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const pathname = location.pathname;
  const currentActive: AppPageTab =
    activeTab ||
    currentTab ||
    (pathname === "/" || pathname === "/dashboard"
      ? "dashboard"
      : pathname.startsWith("/ocr-analysis")
        ? "ocr-analysis"
        : pathname.startsWith("/ocr")
          ? "ocr"
          : pathname.startsWith("/decrypt")
            ? "decrypt"
            : pathname.startsWith("/security")
              ? "security"
              : pathname.startsWith("/settings")
                ? "settings"
                : pathname.startsWith("/login")
                  ? "login"
                  : pathname.startsWith("/register")
                    ? "register"
                    : pathname.startsWith("/forgot-password")
                      ? "forgot-password"
                      : "dashboard");

  const isAuthPage =
    currentActive === "login" || currentActive === "register" || currentActive === "forgot-password";
  const secondaryActive = secondaryNav.some((item) => item.id === currentActive);

  useEffect(() => {
    const unsub = authService.subscribe((user) => {
      setCurrentUser(user);
    });

    // Validasi live ke server Neon PostgreSQL saat halaman dimuat
    void authService.validateSession().then((validUser) => {
      if (!validUser && !isAuthPage) {
        if (onTabChange) {
          onTabChange("login");
        } else {
          void navigate({ to: "/login" });
        }
      }
    });

    return () => unsub();
  }, [isAuthPage, navigate, onTabChange]);

  const handleNavigate = (path: string) => {
    setMobileMenuOpen(false);
    void navigate({ to: path as never });
  };

  const handleLogout = () => {
    setMobileMenuOpen(false);
    authService.logout();
    void navigate({ to: "/login" });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          {/* Identitas aplikasi */}
          <button
            type="button"
            className="flex shrink-0 select-none items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            onClick={() => handleNavigate(currentUser ? "/" : "/login")}
          >
            <span className="flex size-7 items-center justify-center rounded-md border border-border bg-card text-foreground">
              <Shield className="size-3.5" />
            </span>
            <span className="text-sm font-semibold tracking-tight text-foreground">
              KTP Crypto
            </span>
          </button>

          {/* Navigasi desktop */}
          {currentUser && !isAuthPage && (
            <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigasi utama">
              {primaryNav.map((item) => {
                const active = currentActive === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigate(item.path)}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                      active
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    }`}
                  >
                    <item.icon className="size-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                      secondaryActive
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    }`}
                  >
                    <span>Lainnya</span>
                    <ChevronDown className="size-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground">
                    Modul analisis
                  </DropdownMenuLabel>
                  {secondaryNav.map((item) => (
                    <DropdownMenuItem
                      key={item.id}
                      onClick={() => handleNavigate(item.path)}
                      className="cursor-pointer gap-2"
                    >
                      <item.icon className="size-4 text-muted-foreground" />
                      <span>{item.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>
          )}

          {/* Sisi kanan */}
          <div className="flex items-center gap-2">
            {currentUser && !isAuthPage ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex size-8 items-center justify-center rounded-full border border-border bg-card text-xs font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    aria-label={`Menu akun ${currentUser.name}`}
                  >
                    {currentUser.name.charAt(0).toUpperCase()}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="py-2 font-normal">
                    <p className="truncate text-sm font-medium text-foreground">{currentUser.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{currentUser.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleNavigate("/settings")}
                    className="cursor-pointer gap-2"
                  >
                    <User className="size-4 text-muted-foreground" />
                    <span>Profil & akun</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleNavigate("/decrypt")}
                    className="cursor-pointer gap-2"
                  >
                    <Database className="size-4 text-muted-foreground" />
                    <span>Data terenkripsi</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                  >
                    <LogOut className="size-4" />
                    <span>Keluar</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : isAuthPage ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleNavigate(currentActive === "register" ? "/login" : "/register")}
                className="h-8 gap-1.5 text-xs font-medium"
              >
                {currentActive === "register" ? (
                  <>
                    <LogIn className="size-3.5" />
                    Masuk
                  </>
                ) : (
                  <>
                    <UserPlus className="size-3.5" />
                    Daftar
                  </>
                )}
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => handleNavigate("/login")}
                className="h-8 gap-1.5 text-sm"
              >
                <LogIn className="size-3.5" />
                Masuk
              </Button>
            )}

            {currentUser && !isAuthPage && (
              <button
                type="button"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                aria-label={mobileMenuOpen ? "Tutup menu" : "Buka menu"}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>
            )}
          </div>
        </div>

        {/* Navigasi mobile */}
        {currentUser && !isAuthPage && mobileMenuOpen && (
          <div className="border-t border-border/80 bg-background/95 px-4 py-3 backdrop-blur-md lg:hidden">
            <nav className="space-y-1" aria-label="Navigasi utama">
              {allNav.map((item) => {
                const active = currentActive === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigate(item.path)}
                    aria-current={active ? "page" : undefined}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                      active
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    }`}
                  >
                    <item.icon className="size-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="my-2 border-t border-border/80" />
            <button
              type="button"
              onClick={() => handleNavigate("/settings")}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              <Settings className="size-4" />
              <span>Profil & akun</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="size-4" />
              <span>Keluar</span>
            </button>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-7 sm:px-6 sm:py-9">
        {children}
      </main>

      <footer className="border-t border-border/70 py-4">
        <p className="mx-auto max-w-6xl px-4 text-xs text-muted-foreground sm:px-6">
          KTP Crypto · Data KTP dienkripsi dengan Blowfish dan hanya dapat dibuka oleh pemiliknya.
        </p>
      </footer>
    </div>
  );
}
