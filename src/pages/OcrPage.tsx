import { useCallback, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ShieldAlert, ImagePlus, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { UploadKtp } from "@/components/UploadKtp";
import { ImageEditor } from "@/components/ImageEditor";
import { OCRProgress } from "@/components/OCRProgress";
import { OCRResult } from "@/components/OCRResult";
import { useKtpStore } from "@/store/ktpStore";
import { useOCR } from "@/hooks/useOCR";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  encryptUtf8WithBlowfish,
  generateRandomIv,
  bytesToHex,
  type BlowfishEncryptionResult,
} from "@/crypto/blowfish";
import { dbService, type EncryptedKtpRecord } from "@/services/dbService";
import { authService } from "@/services/authService";
import type { KtpData } from "@/types/ktp";
import type { AppPageTab } from "@/components/layout/AppLayout";

interface OcrPageProps {
  onNavigate: (tab: AppPageTab) => void;
}

export function OcrPage({ onNavigate }: OcrPageProps) {
  const store = useKtpStore();
  const { scan, isRunning } = useOCR();

  // State Kunci Enkripsi (Manual input, tidak otomatis)
  const [secretKey, setSecretKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  // State Enkripsi Loading
  const [isEncrypting, setIsEncrypting] = useState(false);

  const handleImageReady = useCallback(
    (dataUrl: string) => {
      store.setSourceImage(dataUrl);
      store.setError(null);
      store.setStep("editor");
    },
    [store],
  );

  const handleConfirmImage = useCallback(
    async (dataUrl: string) => {
      store.setProcessedImage(dataUrl);
      await scan(dataUrl);
    },
    [scan, store],
  );

  const handleSaveAndEncrypt = async (formData: KtpData, keyToUse: string) => {
    const key = keyToUse.trim();
    if (!key) {
      setKeyError("Kunci enkripsi rahasia wajib diisi.");
      return;
    }
    setKeyError(null);
    setIsEncrypting(true);

    try {
      // Delay halus 350ms untuk visual feedback
      await new Promise((r) => setTimeout(r, 350));

      // 1. Generate IV 64-bit Hex
      const ivBytes = generateRandomIv();
      const ivHex = bytesToHex(ivBytes);

      // 2. Enkripsi setiap field input formulir KTP dengan algoritma Blowfish 64-bit CBC
      // Field kosong tetap dienkripsi sebagai string kosong (bukan placeholder "-")
      // agar hasil dekripsi tidak menampilkan data palsu.
      const encProvinsi = encryptUtf8WithBlowfish(formData.provinsi || "", key, ivHex);
      const encKabupaten = encryptUtf8WithBlowfish(formData.kabupatenKota || "", key, ivHex);
      const encNik = encryptUtf8WithBlowfish(formData.nik || "", key, ivHex);
      const encNama = encryptUtf8WithBlowfish(formData.nama || "", key, ivHex);
      const encTempatLahir = encryptUtf8WithBlowfish(formData.tempatLahir || "", key, ivHex);
      const encTanggalLahir = encryptUtf8WithBlowfish(formData.tanggalLahir || "", key, ivHex);
      const encJenisKelamin = encryptUtf8WithBlowfish(formData.jenisKelamin || "", key, ivHex);
      const encGolDarah = encryptUtf8WithBlowfish(formData.golonganDarah || "", key, ivHex);
      const encAlamat = encryptUtf8WithBlowfish(formData.alamat || "", key, ivHex);
      const encRt = encryptUtf8WithBlowfish(formData.rt || "", key, ivHex);
      const encRw = encryptUtf8WithBlowfish(formData.rw || "", key, ivHex);
      const encKelDesa = encryptUtf8WithBlowfish(formData.kelurahanDesa || "", key, ivHex);
      const encKecamatan = encryptUtf8WithBlowfish(formData.kecamatan || "", key, ivHex);
      const encAgama = encryptUtf8WithBlowfish(formData.agama || "", key, ivHex);
      const encStatusPerkawinan = encryptUtf8WithBlowfish(formData.statusPerkawinan || "", key, ivHex);
      const encPekerjaan = encryptUtf8WithBlowfish(formData.pekerjaan || "", key, ivHex);
      const encKewarganegaraan = encryptUtf8WithBlowfish(formData.kewarganegaraan || "", key, ivHex);
      const encBerlakuHingga = encryptUtf8WithBlowfish(formData.berlakuHingga || "", key, ivHex);

      const recordId = "ktp_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
      const currentUser = authService.getCurrentUser();

      const record: EncryptedKtpRecord = {
        id: recordId,
        userId: currentUser?.id,
        provinsi: encProvinsi.ciphertextHex,
        kabupatenKota: encKabupaten.ciphertextHex,
        nik: encNik.ciphertextHex,
        nama: encNama.ciphertextHex,
        tempatLahir: encTempatLahir.ciphertextHex,
        tanggalLahir: encTanggalLahir.ciphertextHex,
        jenisKelamin: encJenisKelamin.ciphertextHex,
        golonganDarah: encGolDarah.ciphertextHex,
        alamat: encAlamat.ciphertextHex,
        rt: encRt.ciphertextHex,
        rw: encRw.ciphertextHex,
        kelurahanDesa: encKelDesa.ciphertextHex,
        kecamatan: encKecamatan.ciphertextHex,
        agama: encAgama.ciphertextHex,
        statusPerkawinan: encStatusPerkawinan.ciphertextHex,
        pekerjaan: encPekerjaan.ciphertextHex,
        kewarganegaraan: encKewarganegaraan.ciphertextHex,
        berlakuHingga: encBerlakuHingga.ciphertextHex,
        iv: ivHex,
        keyChecksum: encNik.keyChecksum,
        keyHint: key,
        displayNama: formData.nama || "WARGA NEGARA INDONESIA",
        createdAt: new Date().toISOString(),
      };

      await dbService.saveEncryptedKtp(record);
      toast.success("Data KTP berhasil dienkripsi dan tersimpan di database!");

      // Simpan ID record agar halaman Dekripsi langsung membuka detailnya
      sessionStorage.setItem("active_vault_record_id", record.id);

      // Reset form OCR secara instan
      store.reset();
      setSecretKey("");
      setKeyError(null);
      setShowKey(false);

      // Pindah langsung ke halaman detail dekripsi
      onNavigate("decrypt");
    } catch (err) {
      setKeyError("Gagal melakukan enkripsi: " + (err as Error).message);
    } finally {
      setIsEncrypting(false);
    }
  };

  const showProgress =
    isRunning ||
    (store.step === "editor" &&
      store.progress.stage !== "idle" &&
      store.progress.stage !== "error");

  return (
    <div className="space-y-7">
      <PageHeader
        title="Scan & enkripsi KTP"
        description="Pindai KTP, periksa hasil pembacaan, lalu enkripsi setiap field dengan kunci rahasia Anda."
      />

      {store.error && (
        <Alert variant="destructive" className="mx-auto max-w-3xl">
          <AlertTriangle className="size-4" />
          <AlertTitle>Proses OCR gagal</AlertTitle>
          <AlertDescription>{store.error}</AlertDescription>
        </Alert>
      )}

      {/* Step 1: Upload */}
      {store.step === "upload" && <UploadKtp onImageReady={handleImageReady} />}

      {/* Step 2: Image Enhancement & OCR Reading */}
      {store.step === "editor" && store.sourceImage && (
        <div className="space-y-5">
          <ImageEditor
            src={store.sourceImage}
            busy={isRunning}
            onCancel={store.reset}
            onConfirm={(dataUrl) => void handleConfirmImage(dataUrl)}
          />
          {showProgress && <OCRProgress progress={store.progress} />}
        </div>
      )}

      {/* Step 3: OCR Results & Encryption Form */}
      {store.step === "result" && (
        <OCRResult
          image={store.processedImage}
          data={store.data}
          rawText={store.rawText}
          warnings={store.warnings}
          onSubmitData={handleSaveAndEncrypt}
          onRescan={() => store.setStep("editor")}
          onClear={store.reset}
          isEncrypting={isEncrypting}
          secretKey={secretKey}
          setSecretKey={setSecretKey}
          showKey={showKey}
          setShowKey={setShowKey}
          keyError={keyError}
          setKeyError={setKeyError}
        />
      )}

      {/* POPUP MODAL VALIDASI DOKUMEN BUKAN KTP */}
      <AlertDialog
        open={Boolean(store.error)}
        onOpenChange={(open) => {
          if (!open) store.setError(null);
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full border border-destructive/20 bg-destructive/10 text-destructive">
              <ShieldAlert className="size-5" />
            </div>
            <AlertDialogTitle className="text-center text-base font-semibold tracking-tight">
              Dokumen tidak lolos validasi
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-1 text-center text-sm leading-relaxed">
              {store.error}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="mt-2 flex-col gap-2 sm:flex-row">
            <AlertDialogCancel
              onClick={() => store.setError(null)}
              className="w-full text-sm sm:w-auto"
            >
              Tutup
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                store.setError(null);
                store.reset();
              }}
              className="w-full gap-1.5 text-sm sm:w-auto"
            >
              <ImagePlus className="size-3.5" /> Unggah ulang KTP
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
