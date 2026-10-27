import { useEffect, useState, useMemo } from "react";
import {
  Search,
  RefreshCw,
  Eye,
  Trash2,
  Unlock,
  Lock,
  ChevronLeft,
  ChevronRight,
  Plus,
  Copy,
  Check,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { dbService, type EncryptedKtpRecord } from "@/services/dbService";
import { authService } from "@/services/authService";
import { KeyInputModal } from "@/components/crypto/KeyInputModal";
import { PageHeader } from "@/components/layout/PageHeader";
import { toast } from "sonner";
import type { KtpData } from "@/types/ktp";
import type { AppPageTab } from "@/components/layout/AppLayout";

interface DecryptPageProps {
  onNavigate: (tab: AppPageTab) => void;
}

export function DecryptPage({ onNavigate }: DecryptPageProps) {
  const [records, setRecords] = useState<EncryptedKtpRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [loading, setLoading] = useState(true);

  // View state: "list" atau "detail"
  const [viewMode, setViewMode] = useState<"list" | "detail">("list");
  const [selectedRecord, setSelectedRecord] = useState<EncryptedKtpRecord | null>(null);
  const [decryptedData, setDecryptedData] = useState<{
    data: KtpData;
    executionTimeMs: number;
  } | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Copy feedback state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Decryption Modal state
  const [keyModalOpen, setKeyModalOpen] = useState(false);

  // Delete Confirmation state
  const [recordToDelete, setRecordToDelete] = useState<EncryptedKtpRecord | null>(null);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const currentUser = authService.getCurrentUser();
      const all = await dbService.getAllEncryptedKtp();
      // Hanya tampilkan data milik user yang sedang login (server juga sudah memfilter).
      const myRecords = currentUser ? all.filter((r) => r.userId === currentUser.id) : [];
      setRecords(myRecords);

      // Cek apakah ada record yang baru disimpan dan perlu langsung dibuka
      const pendingRecordId = typeof window !== "undefined" ? sessionStorage.getItem("active_vault_record_id") : null;
      if (pendingRecordId) {
        sessionStorage.removeItem("active_vault_record_id");
        const target = myRecords.find((r) => r.id === pendingRecordId);
        if (target) {
          setSelectedRecord(target);
          setDecryptedData(null);
          setViewMode("detail");
        }
      }
    } catch (err) {
      setRecords([]);
      toast.error("Gagal memuat data terenkripsi", {
        description: (err as Error).message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRecords();
  }, []);

  // Filter & Sort
  const filteredRecords = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let result = records.filter((r) => {
      const name = (r.displayNama || r.nama || "").toLowerCase();
      return !q || name.includes(q);
    });

    result = [...result].sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      const nameA = (a.displayNama || a.nama || "").toLowerCase();
      const nameB = (b.displayNama || b.nama || "").toLowerCase();
      if (sortBy === "name_asc") return nameA.localeCompare(nameB);
      if (sortBy === "name_desc") return nameB.localeCompare(nameA);
      return 0;
    });

    return result;
  }, [records, searchQuery, sortBy]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  // Reset to page 1 on search / sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, pageSize]);

  const handleOpenDetail = (record: EncryptedKtpRecord) => {
    setSelectedRecord(record);
    setDecryptedData(null);
    setViewMode("detail");
  };

  const handleOpenDecryptModalFromList = (record: EncryptedKtpRecord) => {
    setSelectedRecord(record);
    setKeyModalOpen(true);
  };

  const handleDecryptedSuccess = (data: KtpData, _key: string, executionTimeMs: number) => {
    setDecryptedData({ data, executionTimeMs });
    setViewMode("detail");
  };

  const handleDeleteRecord = async () => {
    if (!recordToDelete) return;
    try {
      await dbService.deleteEncryptedKtp(recordToDelete.id);
      if (selectedRecord?.id === recordToDelete.id) {
        setViewMode("list");
        setSelectedRecord(null);
        setDecryptedData(null);
      }
      setRecordToDelete(null);
      await loadRecords();
    } catch (err) {
      setRecordToDelete(null);
      toast.error("Gagal menghapus dokumen", { description: (err as Error).message });
    }
  };

  const handleCopyValue = async (key: string, val: string | undefined) => {
    if (!val) return;
    await navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const isUnlocked = Boolean(decryptedData);
  const plain = decryptedData?.data;
  const enc = selectedRecord;

  const leftFields = enc
    ? [
        { label: "NIK", val: isUnlocked ? plain?.nik : enc.nik, key: "nik" },
        { label: "Nama Lengkap", val: isUnlocked ? plain?.nama : (enc.displayNama || enc.nama), key: "nama" },
        { label: "Tempat Lahir", val: isUnlocked ? plain?.tempatLahir : enc.tempatLahir, key: "tempatLahir" },
        { label: "Tanggal Lahir", val: isUnlocked ? plain?.tanggalLahir : enc.tanggalLahir, key: "tanggalLahir" },
        { label: "Jenis Kelamin", val: isUnlocked ? plain?.jenisKelamin : enc.jenisKelamin, key: "jenisKelamin" },
        { label: "Golongan Darah", val: isUnlocked ? plain?.golonganDarah : enc.golonganDarah, key: "golonganDarah" },
        { label: "Alamat", val: isUnlocked ? plain?.alamat : enc.alamat, key: "alamat" },
        { label: "RT", val: isUnlocked ? plain?.rt : enc.rt, key: "rt" },
        { label: "RW", val: isUnlocked ? plain?.rw : enc.rw, key: "rw" },
      ]
    : [];

  const rightFields = enc
    ? [
        { label: "Kel / Desa", val: isUnlocked ? plain?.kelurahanDesa : enc.kelurahanDesa, key: "kelurahanDesa" },
        { label: "Kecamatan", val: isUnlocked ? plain?.kecamatan : enc.kecamatan, key: "kecamatan" },
        { label: "Kabupaten / Kota", val: isUnlocked ? plain?.kabupatenKota : enc.kabupatenKota, key: "kabupatenKota" },
        { label: "Provinsi", val: isUnlocked ? plain?.provinsi : enc.provinsi, key: "provinsi" },
        { label: "Agama", val: isUnlocked ? plain?.agama : enc.agama, key: "agama" },
        { label: "Status Perkawinan", val: isUnlocked ? plain?.statusPerkawinan : enc.statusPerkawinan, key: "statusPerkawinan" },
        { label: "Pekerjaan", val: isUnlocked ? plain?.pekerjaan : enc.pekerjaan, key: "pekerjaan" },
        { label: "Kewarganegaraan", val: isUnlocked ? plain?.kewarganegaraan : enc.kewarganegaraan, key: "kewarganegaraan" },
        { label: "Berlaku Hingga", val: isUnlocked ? plain?.berlakuHingga : enc.berlakuHingga, key: "berlakuHingga" },
      ]
    : [];

  // ==========================================
  // VIEW 1: DETAIL DOKUMEN (CLEAN SYMMETRICAL 2-COLUMN TABLE)
  // ==========================================
  if (viewMode === "detail" && selectedRecord) {
    const formattedDate = new Date(selectedRecord.createdAt).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const renderTableBlock = (fields: typeof leftFields) => (
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full border-collapse text-left">
          <tbody>
            {fields.map((field) => (
              <tr key={field.key} className="border-b border-border/70 last:border-0">
                <td className="w-28 whitespace-nowrap border-r border-border/70 bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground select-none sm:w-36 sm:px-3.5 sm:py-2.5">
                  {field.label}
                </td>
                <td
                  className={`px-3 py-2 sm:px-3.5 sm:py-2.5 ${
                    !isUnlocked
                      ? "break-all font-mono text-[11px] font-medium text-foreground select-all sm:text-xs"
                      : "text-sm text-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="break-all">{field.val || "-"}</span>
                    {field.val && (
                      <button
                        type="button"
                        onClick={() => handleCopyValue(field.key, field.val)}
                        className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        title="Salin data"
                      >
                        {copiedKey === field.key ? (
                          <Check className="size-3.5 text-success" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

    return (
      <div className="mx-auto w-full max-w-3xl space-y-5">
        {/* Navigasi & Action Toolbar */}
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setViewMode("list");
              setDecryptedData(null);
            }}
            className="-ml-2 h-8 w-fit gap-1.5 text-xs text-muted-foreground"
          >
            <ArrowLeft className="size-3.5" />
            <span>Kembali ke data terenkripsi</span>
          </Button>

          <div className="flex items-center gap-2">
            {isUnlocked ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDecryptedData(null)}
                className="h-8 gap-1.5 text-xs font-medium"
              >
                <Lock className="size-3.5" />
                <span>Kunci kembali</span>
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => setKeyModalOpen(true)}
                className="h-8 gap-1.5 text-xs font-medium"
              >
                <Unlock className="size-3.5" />
                <span>Buka dekripsi</span>
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRecordToDelete(selectedRecord)}
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-destructive"
              title="Hapus dokumen"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Header Informasi Dokumen */}
        <div className="flex flex-col gap-2 border-b border-border/70 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="truncate text-[22px] font-semibold tracking-tight text-foreground">
                {selectedRecord.displayNama || selectedRecord.nama || "Dokumen KTP"}
              </h1>
              <Badge variant={isUnlocked ? "default" : "outline"}>
                {isUnlocked ? "Terdekripsi" : "Terenkripsi"}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Disimpan {formattedDate} WIB
            </p>
          </div>

          {decryptedData && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5 shrink-0 text-success" />
              <span>Dekripsi berhasil</span>
            </span>
          )}
        </div>

        {/* Tabel Data Berdampingan (2 Kolom di Desktop/Lebar, 1 Kolom di HP) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderTableBlock(leftFields)}
          {renderTableBlock(rightFields)}
        </div>

        {/* Modal Input Kunci Dekripsi */}
        <KeyInputModal
          open={keyModalOpen}
          onOpenChange={setKeyModalOpen}
          record={selectedRecord}
          onDecrypted={handleDecryptedSuccess}
        />

        {/* Alert Dialog Delete Confirmation */}
        <AlertDialog open={Boolean(recordToDelete)} onOpenChange={(open) => !open && setRecordToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base">Hapus Dokumen Terenkripsi?</AlertDialogTitle>
              <AlertDialogDescription className="text-xs">
                Tindakan ini akan menghapus data KTP atas nama{" "}
                <strong>{recordToDelete?.displayNama || recordToDelete?.nama}</strong> dari database.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="text-xs h-8">Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteRecord}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs h-8"
              >
                Hapus
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: DAFTAR DOKUMEN KTP (TABEL VAULT)
  // ==========================================
  return (
    <div className="space-y-8">
      <PageHeader
        title="Data terenkripsi"
        description="Dokumen KTP yang tersimpan dalam bentuk ciphertext. Buka dengan kunci rahasia Anda."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={loadRecords}
              className="h-8 gap-1.5 text-xs font-medium"
              disabled={loading}
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Muat ulang</span>
            </Button>
            <Button
              size="sm"
              onClick={() => onNavigate("ocr")}
              className="h-8 gap-1.5 text-xs font-medium"
            >
              <Plus className="size-3.5" />
              <span>Scan KTP baru</span>
            </Button>
          </>
        }
      />

      {/* Main Table Card */}
      <Card className="overflow-hidden">
        {/* Toolbar: Search & Filter */}
        <div className="flex flex-col items-stretch justify-between gap-3 border-b border-border/70 bg-muted/30 p-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari nama KTP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-8 w-[160px] text-xs">
                <SelectValue placeholder="Urutkan" />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="newest">Terbaru</SelectItem>
                <SelectItem value="oldest">Terlama</SelectItem>
                <SelectItem value="name_asc">Nama (A - Z)</SelectItem>
                <SelectItem value="name_desc">Nama (Z - A)</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={String(pageSize)}
              onValueChange={(val) => setPageSize(Number(val))}
            >
              <SelectTrigger className="h-8 w-[100px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="10">10 baris</SelectItem>
                <SelectItem value="25">25 baris</SelectItem>
                <SelectItem value="50">50 baris</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/70 bg-transparent hover:bg-transparent">
                  <TableHead className="w-14 text-center text-xs font-medium text-muted-foreground">No</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">Nama</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">Tanggal</TableHead>
                  <TableHead className="pr-4 text-right text-xs font-medium text-muted-foreground">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-xs text-muted-foreground">
                      Memuat data...
                    </TableCell>
                  </TableRow>
                ) : paginatedRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-xs text-muted-foreground">
                      {searchQuery
                        ? "Tidak ada data yang cocok dengan pencarian."
                        : "Belum ada dokumen KTP terenkripsi."}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRecords.map((item, index) => {
                    const rowNumber = (currentPage - 1) * pageSize + index + 1;
                    const dateFormatted = new Date(item.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <TableRow key={item.id} className="border-b border-border/70 hover:bg-muted/40">
                        <TableCell className="text-center text-xs tabular-nums text-muted-foreground">
                          {rowNumber}
                        </TableCell>
                        <TableCell className="text-sm font-medium text-foreground">
                          {item.displayNama || item.nama}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {dateFormatted}
                        </TableCell>
                        <TableCell className="space-x-1.5 whitespace-nowrap py-2 pr-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDetail(item)}
                            className="h-7 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                          >
                            <Eye className="mr-1 size-3.5" />
                            Detail
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDecryptModalFromList(item)}
                            className="h-7 px-2.5 text-xs font-medium"
                          >
                            <Unlock className="mr-1 size-3.5" />
                            Buka
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setRecordToDelete(item)}
                            className="size-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            title="Hapus"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Footer */}
          {!loading && filteredRecords.length > 0 && (
            <div className="p-3 border-t border-border bg-muted/30 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
              <div>
                Menampilkan{" "}
                <span className="font-semibold text-foreground">
                  {(currentPage - 1) * pageSize + 1}
                </span>{" "}
                -{" "}
                <span className="font-semibold text-foreground">
                  {Math.min(currentPage * pageSize, filteredRecords.length)}
                </span>{" "}
                dari{" "}
                <span className="font-semibold text-foreground">
                  {filteredRecords.length}
                </span>{" "}
                data
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-7 px-2 text-xs font-medium"
                >
                  <ChevronLeft className="size-3.5 mr-0.5" />
                  Sebelumnya
                </Button>
                <div className="px-2 text-xs font-medium tabular-nums text-muted-foreground">
                  {currentPage} / {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-7 px-2 text-xs font-medium"
                >
                  Selanjutnya
                  <ChevronRight className="size-3.5 ml-0.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Input Modal with Forgot Key Recovery */}
      <KeyInputModal
        open={keyModalOpen}
        onOpenChange={setKeyModalOpen}
        record={selectedRecord}
        onDecrypted={handleDecryptedSuccess}
      />

      {/* Alert Dialog Delete Confirmation */}
      <AlertDialog open={Boolean(recordToDelete)} onOpenChange={(open) => !open && setRecordToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Hapus Dokumen Terenkripsi?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Tindakan ini akan menghapus data KTP atas nama{" "}
              <strong>{recordToDelete?.displayNama || recordToDelete?.nama}</strong> dari database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs h-8">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRecord}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs h-8"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
