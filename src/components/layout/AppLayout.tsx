import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { ChevronDown, LogIn, LogOut, Settings, Shield, UserPlus } from "lucide-react";

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
import { MobileNav } from "./MobileNav";
import { analysisNav, isNavActive, workNav } from "./nav";

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
  children: ReactNode;
}

const navItemBase =
  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const navItemIdle = "text-muted-foreground hover:bg-muted/60 hover:text-foreground";
const navItemActive = "bg-primary/10 font-medium text-primary";

const authPaths = ["/login", "/register", "/forgot-password"];

export function AppLayout({ children }: AppLayoutProps) {
  const [currentUser, setCurrentUser] = useState<UserRecord | null>(authService.getCurrentUser());
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  const isAuthPage = authPaths.some((path) => pathname.startsWith(path));
  const analysisActive = analysisNav.some((item) => isNavActive(item.to, pathname));

  const mainRef = useRef<HTMLElement | null>(null);
  const previousPath = useRef(pathname);

  useEffect(() => {
    const unsub = authService.subscribe((user) => {
      setCurrentUser(user);
    });

    // Validasi sesi live ke server saat shell dimuat.
    void authService.validateSession().then((validUser) => {
      if (!validUser && !isAuthPage) {
        void navigate({ to: "/login" });
      }
    });

    return () => unsub();
  }, [isAuthPage, navigate]);

  // Pindahkan fokus ke konten setiap rute berganti, agar pembaca layar tidak
  // tertahan di navigasi.
  useEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  const handleLogout = () => {
    authService.logout();
    void navigate({ to: "/login" });
  };

  const showAppNav = Boolean(currentUser) && !isAuthPage;
  const showLoginSwitch = pathname === "/register" || pathname === "/forgot-password";

  return (
    <div className="flex min-h-screen flex-col pb-[calc(56px+env(safe-area-inset-bottom))] lg:pb-0">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-card focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Lewati ke konten
      </a>

      <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:px-6 lg:h-[60px]">
          <Link
            to="/"
            className="flex shrink-0 select-none items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span className="flex size-7 items-center justify-center rounded-md border border-border bg-card text-foreground">
              <Shield className="size-3.5" aria-hidden />
            </span>
            <span className="text-sm font-semibold tracking-tight text-foreground">
              KTP Crypto
            </span>
          </Link>

          {showAppNav && (
            <nav aria-label="Navigasi utama" className="ml-3 hidden lg:block">
              <ul className="flex items-center gap-1">
                {workNav.map((item) => {
                  const active = isNavActive(item.to, pathname);
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        aria-current={active ? "page" : undefined}
                        className={`${navItemBase} ${active ? navItemActive : navItemIdle}`}
                      >
                        <item.icon className="size-4" aria-hidden />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}

                <li aria-hidden className="mx-2 h-4 w-px bg-border" />

                <li>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className={`${navItemBase} ${
                          analysisActive ? navItemActive : navItemIdle
                        }`}
                      >
                        <span>Analisis</span>
                        <ChevronDown className="size-3.5" aria-hidden />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-64">
                      <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground">
                        Modul analisis
                      </DropdownMenuLabel>
                      {analysisNav.map((item) => {
                        const active = isNavActive(item.to, pathname);
                        return (
                          <DropdownMenuItem key={item.to} asChild className="cursor-pointer">
                            <Link
                              to={item.to}
                              aria-current={active ? "page" : undefined}
                              className={`flex items-start gap-2.5 py-2 ${
                                active
                                  ? "bg-primary/10 text-primary focus:bg-primary/10 focus:text-primary"
                                  : ""
                              }`}
                            >
                              <item.icon
                                className={`mt-0.5 size-4 shrink-0 ${
                                  active ? "text-primary" : "text-muted-foreground"
                                }`}
                                aria-hidden
                              />
                              <span className="flex min-w-0 flex-col">
                                <span className="text-sm">{item.label}</span>
                                <span className="text-xs text-muted-foreground">
                                  {item.description}
                                </span>
                              </span>
                            </Link>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              </ul>
            </nav>
          )}

          <div className="ml-auto flex items-center gap-2">
            {showAppNav && currentUser ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex size-8 items-center justify-center rounded-full border border-border bg-card text-xs font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    aria-label={`Buka menu akun ${currentUser.name}`}
                  >
                    {currentUser.name.charAt(0).toUpperCase()}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel className="py-2 font-normal">
                    <p className="truncate text-sm font-medium text-foreground">
                      {currentUser.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{currentUser.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="cursor-pointer gap-2">
                    <Link
                      to="/settings"
                      aria-current={pathname === "/settings" ? "page" : undefined}
                    >
                      <Settings className="size-4 text-muted-foreground" aria-hidden />
                      <span>Pengaturan akun</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                  >
                    <LogOut className="size-4" aria-hidden />
                    <span>Keluar</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : isAuthPage ? (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="h-8 gap-1.5 text-xs font-medium"
              >
                <Link to={showLoginSwitch ? "/login" : "/register"}>
                  {showLoginSwitch ? (
                    <>
                      <LogIn className="size-3.5" aria-hidden />
                      Masuk
                    </>
                  ) : (
                    <>
                      <UserPlus className="size-3.5" aria-hidden />
                      Daftar
                    </>
                  )}
                </Link>
              </Button>
            ) : (
              <Button variant="default" size="sm" asChild className="h-8 gap-1.5 text-sm">
                <Link to="/login">
                  <LogIn className="size-3.5" aria-hidden />
                  Masuk
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main
        id="main-content"
        ref={mainRef}
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 focus:outline-none sm:px-6 sm:py-9 lg:py-10"
      >
        {children}
      </main>

      <footer className="border-t border-border/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="flex items-start gap-2 sm:items-center">
            <Shield className="mt-0.5 size-3.5 shrink-0 text-primary sm:mt-0" aria-hidden />
            <span>
              KTP Crypto · Data KTP dienkripsi dengan Blowfish dan hanya dapat dibuka oleh
              pemiliknya.
            </span>
          </p>
          <p className="shrink-0 tabular-nums">Blowfish · CBC · 16 rounds</p>
        </div>
      </footer>

      {showAppNav && currentUser && (
        <MobileNav pathname={pathname} currentUser={currentUser} onLogout={handleLogout} />
      )}
    </div>
  );
}
