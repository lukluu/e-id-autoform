import { Copy, Check, Printer, ShieldCheck, Download, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { KtpData } from "@/types/ktp";

interface DecryptedKtpCardProps {
  data: KtpData;
  executionTimeMs: number;
  onClose?: () => void;
}

export function DecryptedKtpCard({ data, executionTimeMs, onClose }: DecryptedKtpCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Card className="border-2 border-primary/40 shadow-lg bg-gradient-to-br from-card to-muted/30 overflow-hidden">
      <CardHeader className="bg-primary/10 border-b pb-3 flex flex-row items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <span>Kartu Identitas KTP (Didekripsi)</span>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                Dekripsi Blowfish Sukses ({executionTimeMs} ms)
              </Badge>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Data pribadi berhasil dipulihkan dari ciphertext Blowfish CBC 64-bit
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleCopyJson} className="text-xs gap-1.5">
            {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
            {copied ? "Tersalin" : "Salin JSON"}
          </Button>
          <Button size="sm" variant="outline" onClick={handlePrint} className="text-xs gap-1.5">
            <Printer className="size-3.5" /> Cetak
          </Button>
          {onClose && (
            <Button size="sm" variant="ghost" onClick={onClose} className="text-xs">
              Tutup
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* Desain Kartu KTP Digital Indonesia */}
        <div className="rounded-xl border-2 border-sky-400/30 bg-gradient-to-b from-sky-50/50 to-blue-50/20 dark:from-slate-900 dark:to-slate-950 p-5 shadow-inner">
          <div className="text-center border-b border-sky-200/50 dark:border-slate-800 pb-3 mb-4">
            <h3 className="font-bold text-sm sm:text-base tracking-wider uppercase text-sky-950 dark:text-sky-200">
              PROVINSI {data.provinsi || "INDONESIA"}
            </h3>
            <h4 className="font-semibold text-xs sm:text-sm tracking-wider uppercase text-sky-900/80 dark:text-sky-300">
              {data.kabupatenKota || "KABUPATEN / KOTA"}
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-12 font-mono text-base sm:text-xl font-extrabold tracking-widest text-primary border-b pb-2 flex items-center justify-between">
              <span>NIK : {data.nik || "-"}</span>
            </div>

            <div className="md:col-span-12 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs sm:text-sm">
              <div className="flex gap-2">
                <span className="w-32 text-muted-foreground font-medium">Nama</span>
                <span className="font-bold text-foreground uppercase">: {data.nama || "-"}</span>
              </div>
              <div className="flex gap-2">
                <span className="w-32 text-muted-foreground font-medium">Tempat/Tgl Lahir</span>
                <span className="text-foreground uppercase">
                  : {data.tempatLahir || "-"}, {data.tanggalLahir || "-"}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="w-32 text-muted-foreground font-medium">Jenis Kelamin</span>
                <span className="text-foreground uppercase">: {data.jenisKelamin || "-"}</span>
              </div>
              <div className="flex gap-2">
                <span className="w-32 text-muted-foreground font-medium">Gol. Darah</span>
                <span className="text-foreground uppercase">: {data.golonganDarah || "-"}</span>
              </div>
              <div className="flex gap-2 sm:col-span-2">
                <span className="w-32 text-muted-foreground font-medium">Alamat</span>
                <span className="text-foreground uppercase">: {data.alamat || "-"}</span>
              </div>
              <div className="flex gap-2">
                <span className="w-32 text-muted-foreground font-medium ml-4">RT / RW</span>
                <span className="text-foreground">: {data.rt || "000"} / {data.rw || "000"}</span>
              </div>
              <div className="flex gap-2">
                <span className="w-32 text-muted-foreground font-medium ml-4">Kel / Desa</span>
                <span className="text-foreground uppercase">: {data.kelurahanDesa || "-"}</span>
              </div>
              <div className="flex gap-2">
                <span className="w-32 text-muted-foreground font-medium ml-4">Kecamatan</span>
                <span className="text-foreground uppercase">: {data.kecamatan || "-"}</span>
              </div>
              <div className="flex gap-2">
                <span className="w-32 text-muted-foreground font-medium">Agama</span>
                <span className="text-foreground uppercase">: {data.agama || "-"}</span>
              </div>
              <div className="flex gap-2">
                <span className="w-32 text-muted-foreground font-medium">Status Perkawinan</span>
                <span className="text-foreground uppercase">: {data.statusPerkawinan || "-"}</span>
              </div>
              <div className="flex gap-2">
                <span className="w-32 text-muted-foreground font-medium">Pekerjaan</span>
                <span className="text-foreground uppercase">: {data.pekerjaan || "-"}</span>
              </div>
              <div className="flex gap-2">
                <span className="w-32 text-muted-foreground font-medium">Kewarganegaraan</span>
                <span className="text-foreground uppercase">: {data.kewarganegaraan || "WNI"}</span>
              </div>
              <div className="flex gap-2 sm:col-span-2">
                <span className="w-32 text-muted-foreground font-medium">Berlaku Hingga</span>
                <span className="font-semibold text-foreground uppercase">: {data.berlakuHingga || "SEUMUR HIDUP"}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
