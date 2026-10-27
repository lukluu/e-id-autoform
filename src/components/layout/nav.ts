import { Activity, Scan, Unlock, Sparkles, Shield, type LucideIcon } from "lucide-react";

/** Rute yang boleh muncul di navigasi utama. */
export type NavRoute = "/" | "/ocr" | "/decrypt" | "/ocr-analysis" | "/security";

export interface NavItem {
  to: NavRoute;
  label: string;
  /** Label ringkas untuk bottom navigation di layar kecil. */
  shortLabel: string;
  icon: LucideIcon;
  description?: string;
}

/** Tiga tugas harian — selalu terlihat di header. */
export const workNav: NavItem[] = [
  { to: "/", label: "Beranda", shortLabel: "Beranda", icon: Activity },
  { to: "/ocr", label: "Scan KTP", shortLabel: "Scan", icon: Scan },
  { to: "/decrypt", label: "Data terenkripsi", shortLabel: "Data", icon: Unlock },
];

/** Modul pendukung — dikelompokkan agar navigasi utama tetap tenang. */
export const analysisNav: NavItem[] = [
  {
    to: "/ocr-analysis",
    label: "Analisis OCR",
    shortLabel: "OCR",
    icon: Sparkles,
    description: "Pipeline citra KTP menjadi data",
  },
  {
    to: "/security",
    label: "Analisis kripto",
    shortLabel: "Kripto",
    icon: Shield,
    description: "Avalanche, entropi, benchmark",
  },
];

/** Aktif bila rute saat ini sama; "/" juga mencakup alias "/dashboard". */
export function isNavActive(to: NavRoute, pathname: string) {
  if (to === "/") return pathname === "/" || pathname === "/dashboard";
  return pathname === to;
}
