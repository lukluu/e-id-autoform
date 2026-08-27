import { useState } from "react";
import {
  Lock,
  Unlock,
  AlertTriangle,
  Mail,
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { decryptUtf8WithBlowfish } from "@/crypto/blowfish";
import { dbService, type EncryptedKtpRecord } from "@/services/dbService";
import { emailService } from "@/services/emailService";
import { authService } from "@/services/authService";
import type { KtpData } from "@/types/ktp";

interface KeyInputModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: EncryptedKtpRecord | null;
  onDecrypted: (data: KtpData, key: string, executionTimeMs: number) => void;
}

export function KeyInputModal({
  open,
  onOpenChange,
  record,
  onDecrypted,
}: KeyInputModalProps) {
  const [key, setKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

  // Forgot Key / Recovery Mode
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [recoverySuccessMessage, setRecoverySuccessMessage] = useState<string | null>(null);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);

  if (!record) return null;

  const handleDecrypt = () => {
    if (!key.trim()) {
      setError("Masukkan kunci enkripsi rahasia terlebih dahulu.");
      return;
    }
    setError(null);
    setIsDecrypting(true);

    setTimeout(() => {
      try {
        const decNik = decryptUtf8WithBlowfish(record.nik, record.iv, key, record.keyChecksum);
        const decNama = decryptUtf8WithBlowfish(record.nama, record.iv, key, record.keyChecksum);

        if (!decNik.isValid && !decNama.isValid) {
          setError(
            "Kunci enkripsi salah! Data tidak dapat didekripsi dengan kunci yang diberikan.",
          );
          setIsDecrypting(false);
          return;
        }

        const decProvinsi = decryptUtf8WithBlowfish(record.provinsi, record.iv, key);
        const decKabupaten = decryptUtf8WithBlowfish(record.kabupatenKota, record.iv, key);
        const decTempatLahir = decryptUtf8WithBlowfish(record.tempatLahir, record.iv, key);
        const decTanggalLahir = decryptUtf8WithBlowfish(record.tanggalLahir, record.iv, key);
        const decJenisKelamin = decryptUtf8WithBlowfish(record.jenisKelamin, record.iv, key);
        const decGolDarah = decryptUtf8WithBlowfish(record.golonganDarah, record.iv, key);
        const decAlamat = decryptUtf8WithBlowfish(record.alamat, record.iv, key);
        const decRt = decryptUtf8WithBlowfish(record.rt, record.iv, key);
        const decRw = decryptUtf8WithBlowfish(record.rw, record.iv, key);
        const decKelDesa = decryptUtf8WithBlowfish(record.kelurahanDesa, record.iv, key);
        const decKecamatan = decryptUtf8WithBlowfish(record.kecamatan, record.iv, key);
        const decAgama = decryptUtf8WithBlowfish(record.agama, record.iv, key);
        const decStatusPerkawinan = decryptUtf8WithBlowfish(record.statusPerkawinan, record.iv, key);
        const decPekerjaan = decryptUtf8WithBlowfish(record.pekerjaan, record.iv, key);
        const decKewarganegaraan = decryptUtf8WithBlowfish(record.kewarganegaraan, record.iv, key);
        const decBerlakuHingga = decryptUtf8WithBlowfish(record.berlakuHingga, record.iv, key);

        const ktpData: KtpData = {
          provinsi: decProvinsi.plainText,
          kabupatenKota: decKabupaten.plainText,
          nik: decNik.plainText,
          nama: decNama.plainText,
          tempatLahir: decTempatLahir.plainText,
          tanggalLahir: decTanggalLahir.plainText,
          jenisKelamin: decJenisKelamin.plainText as any,
          golonganDarah: decGolDarah.plainText as any,
          alamat: decAlamat.plainText,
          rt: decRt.plainText,
          rw: decRw.plainText,
          kelurahanDesa: decKelDesa.plainText,
          kecamatan: decKecamatan.plainText,
          agama: decAgama.plainText as any,
          statusPerkawinan: decStatusPerkawinan.plainText as any,
          pekerjaan: decPekerjaan.plainText,
          kewarganegaraan: decKewarganegaraan.plainText as any,
          berlakuHingga: decBerlakuHingga.plainText,
        };

        const totalExecutionTimeMs =
          decNik.executionTimeMs + decNama.executionTimeMs;

        setIsDecrypting(false);
        onOpenChange(false);
        setKey("");
        onDecrypted(ktpData, key, totalExecutionTimeMs);
      } catch (err) {
        setError("Gagal mendekripsi: " + (err as Error).message);
        setIsDecrypting(false);
      }
    }, 450);
  };

  const handleRequestKeyRecovery = async () => {
    setIsSendingCode(true);
    setError(null);

    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser?.email) {
        setError("Sesi tidak ditemukan. Silakan login kembali.");
        return;
      }
      const targetEmail = currentUser.email;

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      const keyToSave = record.keyHint;
      if (!keyToSave) {
        setError("Dokumen ini tidak memiliki data pemulihan kunci enkripsi.");
        return;
      }

      await dbService.saveRecoveryCode({
        id: "rec_" + Date.now(),
        type: "KEY_RECOVERY",
        email: targetEmail,
        code,
        payload: { recordId: record.id, keyHint: keyToSave },
        createdAt: new Date().toISOString(),
        expiresAt,
        used: false,
      });

      await emailService.sendKeyRecoveryEmail(targetEmail, {
        maskedNik: record.id,
        nama: record.displayNama || "Subjek KTP",
        keyHint: keyToSave,
        recoveryCode: code,
      });

      setIsForgotMode(true);
      setRecoverySuccessMessage(
        `Kode pemulihan telah dikirim ke email (${targetEmail}). Silakan cek kotak masuk email Anda.`,
      );
    } catch (err) {
      setError("Gagal mengirim kode pemulihan: " + (err as Error).message);
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyRecoveryCode = async () => {
    if (!recoveryCode.trim()) {
      setError("Masukkan 6 digit kode pemulihan dari email.");
      return;
    }

    setIsVerifyingCode(true);
    setError(null);

    try {
      await new Promise((r) => setTimeout(r, 400));
      const currentUser = authService.getCurrentUser();
      if (!currentUser?.email) {
        setError("Sesi tidak ditemukan. Silakan login kembali.");
        return;
      }
      const targetEmail = currentUser.email;

      const verified = await dbService.verifyRecoveryCode(targetEmail, recoveryCode.trim(), "KEY_RECOVERY");
      if (!verified) {
        setError("Kode pemulihan salah atau sudah kadaluarsa.");
        return;
      }

      // Ambil kunci rahasia yang tersimpan di record atau payload recovery
      const recoveredKey =
        record.keyHint ||
        (verified.payload as { keyHint?: string } | undefined)?.keyHint;

      if (!recoveredKey) {
        setError("Kunci rahasia tidak ditemukan untuk dokumen ini.");
        return;
      }

      // 1. Masukkan langsung kunci ke input form kunci
      setKey(recoveredKey);
      setShowKey(true);

      // 2. Langsung pindah kembali ke tampilan form input kunci
      setIsForgotMode(false);

      // 3. Tampilkan pesan berhasil yang jelas
      setRecoverySuccessMessage(
        `Verifikasi berhasil! Kunci rahasia telah dipulihkan dan otomatis diisi ke form. Silakan klik "Buka & Dekripsi Data".`
      );
    } finally {
      setIsVerifyingCode(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Lock className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base">Dekripsi Dokumen KTP</DialogTitle>
              <DialogDescription className="text-xs">
                Dokumen: <strong>{record.displayNama || "Subjek KTP"}</strong>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="py-2.5">
            <AlertTriangle className="size-4" />
            <AlertTitle className="text-xs font-semibold">Gagal</AlertTitle>
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        {recoverySuccessMessage && (
          <Alert className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 py-2.5">
            <CheckCircle2 className="size-4 text-emerald-600" />
            <AlertTitle className="text-xs font-semibold">Informasi Pemulihan</AlertTitle>
            <AlertDescription className="text-xs">{recoverySuccessMessage}</AlertDescription>
          </Alert>
        )}

        {!isForgotMode ? (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="decryptKey" className="text-xs font-medium">
                  Kunci Enkripsi (Secret Key)
                </Label>
                <button
                  type="button"
                  onClick={handleRequestKeyRecovery}
                  disabled={isSendingCode || isDecrypting}
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-medium disabled:opacity-50"
                >
                  {isSendingCode ? (
                    <Loader2 className="size-3 animate-spin text-primary" />
                  ) : (
                    <Mail className="size-3" />
                  )}
                  {isSendingCode ? "Mengirim Kode..." : "Lupa Kunci?"}
                </button>
              </div>

              <div className="relative flex items-center">
                <Input
                  id="decryptKey"
                  type={showKey ? "text" : "password"}
                  placeholder="Masukkan kunci rahasia dokumen ini..."
                  value={key}
                  disabled={isDecrypting}
                  onChange={(e) => setKey(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isDecrypting) handleDecrypt();
                  }}
                  autoFocus
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((prev) => !prev)}
                  className="absolute right-2.5 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button variant="outline" type="button" disabled={isDecrypting} onClick={() => onOpenChange(false)}>
                Batal
              </Button>
              <Button type="button" onClick={handleDecrypt} disabled={isDecrypting} className="gap-2 font-medium">
                {isDecrypting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Mendekripsi Data...
                  </>
                ) : (
                  <>
                    <Unlock className="size-4" /> Buka & Dekripsi Data
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* Mode Pemulihan Kunci */
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="recoveryOtp" className="text-xs font-medium">
                Masukkan Kode Verifikasi 6-Digit dari Email
              </Label>
              <div className="flex gap-2">
                <Input
                  id="recoveryOtp"
                  placeholder="Contoh: 123456"
                  maxLength={6}
                  value={recoveryCode}
                  disabled={isVerifyingCode}
                  onChange={(e) => setRecoveryCode(e.target.value.replace(/\D/g, ""))}
                  className="font-mono text-center tracking-widest text-lg"
                />
                <Button type="button" onClick={handleVerifyRecoveryCode} disabled={isVerifyingCode} className="gap-1.5">
                  {isVerifyingCode ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  {isVerifyingCode ? "Memverifikasi..." : "Verifikasi"}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Periksa kotak masuk email Anda untuk membaca kode OTP dan petunjuk kunci.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsForgotMode(false);
                  setError(null);
                }}
                disabled={isSendingCode || isVerifyingCode}
                className="gap-1 text-xs"
              >
                <ArrowLeft className="size-3.5" /> Kembali ke Input Kunci
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRequestKeyRecovery}
                disabled={isSendingCode || isVerifyingCode}
                className="text-xs gap-1.5"
              >
                {isSendingCode && <Loader2 className="size-3 animate-spin" />}
                {isSendingCode ? "Mengirim..." : "Kirim Ulang Kode"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
