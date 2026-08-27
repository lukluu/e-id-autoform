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

export type AppPageTab = "dashboard" | "ocr" | "decrypt" | "security" | "ocr-analysis" | "settings" | "login" | "register" | "forgot-password";

interface AppLayoutProps {
  children: React.ReactNode;
  activeTab?: AppPageTab;
  currentTab?: AppPageTab;
  onTabChange?: (tab: AppPageTab) => void;
}

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

  const isAuthPage = currentActive === "login" || currentActive === "register" || currentActive === "forgot-password";

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
  }, [isAuthPage]);

  const navItems: { id: AppPageTab; path: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "dashboard", path: "/", label: "Beranda", icon: Activity },
    { id: "ocr", path: "/ocr", label: "Scan & Enkripsi", icon: Scan },
    { id: "decrypt", path: "/decrypt", label: "Data Terenkripsi", icon: Unlock },
    { id: "ocr-analysis", path: "/ocr-analysis", label: "Analisis OCR", icon: Sparkles },
    { id: "security", path: "/security", label: "Analisis Kripto", icon: Shield },
  ];

  const handleNavigate = (path: string) => {
    setMobileMenuOpen(false);
    void navigate({ to: path as any });
  };

  const handleLogout = () => {
    setMobileMenuOpen(false);
    authService.logout();
    void navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex h-14 items-center justify-between gap-4">
          {/* Logo */}
          <div
            className="flex items-center gap-2 cursor-pointer select-none shrink-0"
            onClick={() => handleNavigate(currentUser ? "/" : "/login")}
          >
            <div className="p-1.5 rounded-lg bg-gradient-to-tr from-primary to-sky-500 text-primary-foreground shadow">
              <Shield className="size-4" />
            </div>
            <span className="font-bold text-sm sm:text-base tracking-tight text-foreground">
              KTP Crypto
            </span>
          </div>

          {/* Desktop Nav - Hanya tampil saat pengguna sudah login dan bukan di halaman auth */}
          {currentUser && !isAuthPage && (
            <nav className="hidden lg:flex items-center gap-0.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = currentActive === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.path)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    }`}
                  >
                    <Icon className="size-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          )}

          {/* Right Side: Auth */}
          <div className="flex items-center gap-2">
            {currentUser && !isAuthPage ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full ring-2 ring-transparent hover:ring-primary/20 transition-all focus:outline-none">
                    <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel className="font-normal py-2">
                    <p className="font-semibold text-sm">{currentUser.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{currentUser.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleNavigate("/settings")} className="gap-2 cursor-pointer">
                    <Settings className="size-4" />
                    <span>Profil & Akun</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleNavigate("/decrypt")} className="gap-2 cursor-pointer">
                    <Database className="size-4" />
                    <span>Data Terenkripsi</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                  >
                    <LogOut className="size-4" />
                    <span>Keluar</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : isAuthPage ? (
              // Tombol aksi sederhana di halaman auth
              currentActive === "register" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleNavigate("/login")}
                  className="gap-1.5 h-8 text-xs font-medium"
                >
                  <LogIn className="size-3.5" />
                  Masuk
                </Button>
              ) : currentActive === "login" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleNavigate("/register")}
                  className="gap-1.5 h-8 text-xs font-medium"
                >
                  <UserPlus className="size-3.5" />
                  Daftar
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleNavigate("/login")}
                  className="gap-1.5 h-8 text-xs font-medium"
                >
                  <LogIn className="size-3.5" />
                  Masuk
                </Button>
              )
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => handleNavigate("/login")}
                className="gap-1.5 h-8 text-sm"
              >
                <LogIn className="size-3.5" />
                Masuk
              </Button>
            )}

            {/* Mobile Hamburger - Hanya tampil jika user login dan bukan di auth page */}
            {currentUser && !isAuthPage && (
              <button
                className="lg:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
              >
                {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Nav Drawer - Hanya tampil jika login & bukan auth page */}
        {currentUser && !isAuthPage && mobileMenuOpen && (
          <div className="lg:hidden border-t bg-background/98 backdrop-blur px-4 py-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = currentActive === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                >
                  <Icon className="size-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
            <div className="border-t my-2" />
            <button
              onClick={() => handleNavigate("/settings")}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              <User className="size-4" />
              <span>Profil & Akun</span>
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="size-4" />
              <span>Keluar</span>
            </button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-5 sm:px-6 sm:py-7">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t py-3 text-center bg-muted/20">
        <p className="text-xs text-muted-foreground">
          KTP Crypto — Enkripsi Data Pribadi dengan Algoritma Blowfish
        </p>
      </footer>
    </div>
  );
}
