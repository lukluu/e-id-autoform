import { useEffect, useState } from "react";
import { Scan, Unlock, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { dbService, type EncryptedKtpRecord } from "@/services/dbService";
import { authService } from "@/services/authService";
import type { AppPageTab } from "@/components/layout/AppLayout";

interface DashboardPageProps {
  onNavigate: (tab: AppPageTab) => void;
}

const workSteps = [
  {
    title: "Pindai KTP",
    description: "Foto KTP dibaca di perangkat Anda, lalu 18 field diisi otomatis.",
  },
  {
    title: "Enkripsi",
    description: "Setiap field dienkripsi dengan Blowfish dan kunci rahasia milik Anda.",
  },
  {
    title: "Simpan & buka",
    description: "Dokumen tersimpan per akun dan hanya bisa dibuka dengan kunci tersebut.",
  },
];

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const [userRecords, setUserRecords] = useState<EncryptedKtpRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    async function loadData() {
      try {
        const user = authService.getCurrentUser();
        const records = await dbService.getAllEncryptedKtp();

        // Server sudah mengembalikan data milik user; filter ulang untuk keamanan.
        const myRecords = user ? records.filter((r) => r.userId === user.id) : [];
        setUserRecords(myRecords);
      } catch (err) {
        setUserRecords([]);
        toast.error("Gagal memuat data terenkripsi", {
          description: (err as Error).message,
        });
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, []);

  const total = loading ? "—" : String(userRecords.length);

  return (
    <div className="space-y-9">
      <PageHeader
        title={currentUser ? `Halo, ${currentUser.name}` : "Beranda"}
        description="Ringkasan dokumen KTP terenkripsi milik akun Anda."
        actions={
          <>
            <Button onClick={() => onNavigate("ocr")} className="gap-2">
              <Scan className="size-4" />
              Scan KTP
            </Button>
            <Button variant="outline" onClick={() => onNavigate("decrypt")} className="gap-2">
              <Unlock className="size-4" />
              Data terenkripsi
            </Button>
          </>
        }
      />

      {/* Ringkasan: satu permukaan, dipisah garis tipis — bukan empat kartu terpisah. */}
      <section aria-label="Ringkasan akun">
        <dl className="grid grid-cols-1 divide-y divide-border overflow-hidden rounded-xl border bg-card sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="px-5 py-4">
            <dt className="text-xs text-muted-foreground">Dokumen tersimpan</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{total}</dd>
            <p className="mt-1 text-xs text-muted-foreground">
              {loading
                ? "Memuat data…"
                : userRecords.length === 0
                  ? "Belum ada dokumen"
                  : "Milik akun Anda"}
            </p>
          </div>

          <div className="px-5 py-4">
            <dt className="text-xs text-muted-foreground">Status akun</dt>
            <dd className="mt-1 text-2xl font-semibold text-foreground">
              {currentUser?.role === "admin" ? "Admin" : "Aktif"}
            </dd>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {currentUser?.email || "—"}
            </p>
          </div>

          <div className="px-5 py-4">
            <dt className="text-xs text-muted-foreground">Enkripsi</dt>
            <dd className="mt-1 text-2xl font-semibold text-foreground">Blowfish</dd>
            <p className="mt-1 text-xs text-muted-foreground">64-bit · CBC · 16 rounds</p>
          </div>
        </dl>

        {!loading && userRecords.length === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">
            Mulai dengan memindai satu KTP — hasilnya akan muncul di sini dan di halaman Data
            terenkripsi.
          </p>
        )}
      </section>

      {/* Alur kerja */}
      <section className="rounded-xl border bg-card">
        <div className="border-b border-border/70 px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">Alur kerja</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Tiga langkah, tanpa data keluar dari akun Anda.</p>
        </div>

        <ol className="grid grid-cols-1 divide-y divide-border/70 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {workSteps.map((step, index) => (
            <li key={step.title} className="px-5 py-4">
              <span className="text-xs tabular-nums text-muted-foreground">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-1 text-sm font-medium text-foreground">{step.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.description}</p>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-border/70 px-5 py-3">
          <button
            type="button"
            onClick={() => onNavigate("ocr-analysis")}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Pelajari pipeline OCR
            <ArrowRight className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onNavigate("security")}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Lihat analisis kriptografi
            <ArrowRight className="size-3.5" />
          </button>
        </div>
      </section>
    </div>
  );
}
