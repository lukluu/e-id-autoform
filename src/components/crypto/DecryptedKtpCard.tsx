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
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-muted/20 pb-3">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
          <div>
            <CardTitle className="flex flex-wrap items-center gap-2 text-sm font-semibold">
              <span>Kartu KTP terdekripsi</span>
              <Badge variant="outline">{executionTimeMs} ms</Badge>
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Data dipulihkan dari ciphertext Blowfish CBC 64-bit.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" onClick={handleCopyJson} className="h-8 gap-1.5 text-xs font-medium">
            {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
            {copied ? "Tersalin" : "Salin JSON"}
          </Button>
          <Button size="sm" variant="outline" onClick={handlePrint} className="h-8 gap-1.5 text-xs font-medium">
            <Printer className="size-3.5" /> Cetak
          </Button>
          {onClose && (
            <Button size="sm" variant="ghost" onClick={onClose} className="h-8 text-xs text-muted-foreground">
              Tutup
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6">
        {/* Representasi kartu KTP digital */}
        <div className="rounded-lg border border-border/80 bg-muted/20 p-5">
          <div className="mb-4 border-b border-border/70 pb-3 text-center">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
              Provinsi {data.provinsi || "Indonesia"}
            </h3>
            <h4 className="text-xs uppercase tracking-wide text-muted-foreground">
              {data.kabupatenKota || "Kabupaten / Kota"}
            </h4>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="flex items-center justify-between border-b border-border/70 pb-2 font-mono text-base font-semibold tracking-widest text-foreground md:col-span-12 sm:text-lg">
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
