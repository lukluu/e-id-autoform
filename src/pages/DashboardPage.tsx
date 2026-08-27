import { useEffect, useState } from "react";
import {
  Shield,
  Scan,
  Unlock,
  Activity,
  Database,
  UserCheck,
  FileCheck,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { dbService, type EncryptedKtpRecord } from "@/services/dbService";
import { authService } from "@/services/authService";
import type { AppPageTab } from "@/components/layout/AppLayout";

interface DashboardPageProps {
  onNavigate: (tab: AppPageTab) => void;
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const [allRecords, setAllRecords] = useState<EncryptedKtpRecord[]>([]);
  const [userRecords, setUserRecords] = useState<EncryptedKtpRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    async function loadData() {
      try {
        const user = authService.getCurrentUser();
        const records = await dbService.getAllEncryptedKtp();
        setAllRecords(records);

        // Filter data milik user yang sedang aktif
        const myRecords = records.filter(
          (r) => !r.userId || !user || r.userId === user.id
        );
        setUserRecords(myRecords);
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="rounded-2xl bg-gradient-to-br from-primary via-sky-600 to-indigo-700 text-white p-6 sm:p-8 shadow-lg relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 opacity-[0.07] pointer-events-none">
          <Shield className="size-64" />
        </div>
        <div className="relative z-10 space-y-4 max-w-2xl">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {currentUser ? `Halo, ${currentUser.name}` : "Enkripsi Data KTP"}
            </h1>
            <p className="text-sky-100 text-sm leading-relaxed">
              Scan foto KTP, ekstrak data otomatis, lalu simpan terenkripsi dengan algoritma Blowfish khusus untuk akun Anda.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5 pt-1">
            <Button
              onClick={() => onNavigate("ocr")}
              className="bg-white text-sky-900 hover:bg-sky-50 font-semibold gap-2 shadow text-sm"
            >
              <Scan className="size-4" />
              Mulai Scan KTP
            </Button>
            <Button
              onClick={() => onNavigate("decrypt")}
              variant="outline"
              className="bg-white/10 text-white border-white/30 hover:bg-white/20 gap-2 text-sm"
            >
              <Unlock className="size-4" />
              Data Terenkripsi Saya ({loading ? "…" : userRecords.length})
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Terenkripsi</CardTitle>
            <Database className="size-4 text-primary" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{loading ? "—" : allRecords.length}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="size-3 text-emerald-500" /> Seluruh Sistem
            </p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Data Saya</CardTitle>
            <UserCheck className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{loading ? "—" : userRecords.length}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="size-3 text-emerald-500" /> Akun Anda
            </p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Algoritma</CardTitle>
            <Shield className="size-4 text-sky-500" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl font-bold">Blowfish</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">64-bit · CBC · 16 rounds</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Ekstraksi OCR</CardTitle>
            <Activity className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl font-bold">18 Field</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Format standar e-KTP</p>
          </CardContent>
        </Card>
      </div>

      {/* How it works */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileCheck className="size-4 text-primary" />
            Cara Kerja & Keamanan Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                step: "1",
                color: "sky",
                title: "Scan & Isolasi Akun",
                desc: "Data KTP dipindai dan langsung diasosiasikan secara aman dengan akun login Anda.",
              },
              {
                step: "2",
                color: "indigo",
                title: "Enkripsi Mandiri",
                desc: "Setiap field dienkripsi menggunakan Blowfish dengan kunci rahasia milik Anda.",
              },
              {
                step: "3",
                color: "emerald",
                title: "Akses Data Terenkripsi",
                desc: "Hanya akun Anda yang dapat melihat dan mendekripsi data KTP milik Anda sendiri.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="flex gap-3 p-4 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors"
              >
                <div
                  className={`shrink-0 size-7 rounded-full bg-${item.color}-500/15 text-${item.color}-600 dark:text-${item.color}-400 flex items-center justify-center font-bold text-sm`}
                >
                  {item.step}
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-sm text-foreground">{item.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onNavigate("security")}
              className="text-xs gap-1.5 text-muted-foreground"
            >
              Lihat Analisis Keamanan <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
