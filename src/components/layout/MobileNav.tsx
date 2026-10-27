import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { LogOut, Menu as MenuIcon, Settings, type LucideIcon } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { UserRecord } from "@/services/dbService";
import { analysisNav, isNavActive, workNav, type NavRoute } from "./nav";

interface MobileNavProps {
  pathname: string;
  currentUser: UserRecord;
  onLogout: () => void;
}

const itemBase =
  "flex flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

function iconChipClass(active: boolean) {
  return `flex h-6 w-11 items-center justify-center rounded-full transition-colors ${
    active ? "bg-primary/10 text-primary" : "text-muted-foreground"
  }`;
}

function rowClass(active: boolean) {
  return `flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm transition-colors ${
    active
      ? "bg-primary/10 font-medium text-primary"
      : "text-foreground hover:bg-muted/60"
  }`;
}

/**
 * Navigasi layar kecil: tiga tugas harian selalu satu tap,
 * sisanya (analisis + akun) lewat bottom sheet.
 */
export function MobileNav({ pathname, currentUser, onLogout }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  const secondaryActive = analysisNav.some((item) => isNavActive(item.to, pathname));
  const menuActive = secondaryActive || pathname === "/settings";
  const close = () => setOpen(false);

  const renderTab = (to: NavRoute, label: string, Icon: LucideIcon) => {
    const active = isNavActive(to, pathname);
    return (
      <li key={to} className="flex-1">
        <Link
          to={to}
          aria-current={active ? "page" : undefined}
          className={`${itemBase} h-12 w-full`}
        >
          <span className={iconChipClass(active)}>
            <Icon className="size-[18px]" />
          </span>
          <span className={active ? "text-primary" : "text-muted-foreground"}>{label}</span>
        </Link>
      </li>
    );
  };

  return (
    <>
      <nav
        aria-label="Navigasi utama"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        <ul className="mx-auto flex max-w-6xl items-stretch gap-1 px-2 py-1">
          {workNav.map((item) => renderTab(item.to, item.shortLabel, item.icon))}

          <li className="flex-1">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-label="Buka menu analisis dan akun"
              className={`${itemBase} h-12 w-full`}
            >
              <span className={iconChipClass(menuActive)}>
                <MenuIcon className="size-[18px]" />
              </span>
              <span className={menuActive ? "text-primary" : "text-muted-foreground"}>Menu</span>
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85vh] overflow-y-auto rounded-t-2xl border-border/70 bg-card p-0"
        >
          <div className="mx-auto w-full max-w-6xl px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-5">
            <SheetHeader className="space-y-0.5 pr-10 text-left">
              <SheetTitle className="text-sm font-semibold tracking-tight">Menu</SheetTitle>
              <SheetDescription className="truncate text-xs text-muted-foreground">
                {currentUser.name} · {currentUser.email}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-4 space-y-4">
              <div>
                <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Analisis
                </p>
                <ul className="space-y-0.5">
                  {analysisNav.map((item) => {
                    const active = isNavActive(item.to, pathname);
                    return (
                      <li key={item.to}>
                        <Link
                          to={item.to}
                          onClick={close}
                          aria-current={active ? "page" : undefined}
                          className={rowClass(active)}
                        >
                          <span
                            className={`flex size-8 shrink-0 items-center justify-center rounded-md ${
                              active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <item.icon className="size-4" />
                          </span>
                          <span className="flex min-w-0 flex-col">
                            <span>{item.label}</span>
                            <span className="truncate text-xs font-normal text-muted-foreground">
                              {item.description}
                            </span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="border-t border-border/70 pt-3">
                <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Akun
                </p>
                <Link
                  to="/settings"
                  onClick={close}
                  aria-current={pathname === "/settings" ? "page" : undefined}
                  className={`${rowClass(pathname === "/settings")} w-full`}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Settings className="size-4" />
                  </span>
                  <span>Pengaturan akun</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    close();
                    onLogout();
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                    <LogOut className="size-4" />
                  </span>
                  <span>Keluar</span>
                </button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
