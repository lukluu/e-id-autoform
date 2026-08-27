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
      // Filter hanya data yang dienkripsi oleh user yang sedang login
      const myRecords = all.filter((r) => !r.userId || !currentUser || r.userId === currentUser.id);
      setRecords(myRecords);

      // Cek apakah ada record yang baru disimpan dan perlu langsung dibuka
      const pendingRecordId = typeof window !== "undefined" ? sessionStorage.getItem("active_vault_record_id") : null;
      if (pendingRecordId) {
        sessionStorage.removeItem("active_vault_record_id");
        const target = myRecords.find((r) => r.id === pendingRecordId) || all.find((r) => r.id === pendingRecordId);
        if (target) {
          setSelectedRecord(target);
          setDecryptedData(null);
          setViewMode("detail");
        }
      }
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
    await dbService.deleteEncryptedKtp(recordToDelete.id);
    if (selectedRecord?.id === recordToDelete.id) {
      setViewMode("list");
      setSelectedRecord(null);
      setDecryptedData(null);
    }
    setRecordToDelete(null);
    await loadRecords();
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
      <div className="border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
        <table className="w-full text-left border-collapse">
          <tbody>
            {fields.map((field) => (
              <tr key={field.key} className="border-b last:border-0 border-slate-200 dark:border-slate-800">
                <td className="w-28 sm:w-36 bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 font-bold text-[11px] sm:text-xs px-2.5 sm:px-3.5 py-2 sm:py-2.5 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap select-none">
                  {field.label}
                </td>
                <td
                  className={`px-2.5 sm:px-3.5 py-2 sm:py-2.5 ${
                    !isUnlocked
                      ? "font-mono text-[11px] sm:text-xs text-slate-800 dark:text-slate-200 break-all select-all font-semibold"
                      : "font-semibold text-[11px] sm:text-xs text-slate-900 dark:text-slate-100"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="break-all">{field.val || "-"}</span>
                    {field.val && (
                      <button
                        type="button"
                        onClick={() => handleCopyValue(field.key, field.val)}
                        className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 shrink-0 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Salin data"
                      >
                        {copiedKey === field.key ? (
                          <Check className="size-3.5 text-emerald-600 font-bold" />
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
      <div className="space-y-4 max-w-6xl mx-auto pb-10">
        {/* Navigasi & Action Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setViewMode("list");
              setDecryptedData(null);
            }}
            className="text-xs gap-1.5 h-8 font-medium w-fit"
          >
            <ArrowLeft className="size-3.5" />
            <span>Kembali ke Data Terenkripsi</span>
          </Button>

          <div className="flex items-center gap-2">
            {isUnlocked ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDecryptedData(null)}
                className="text-xs gap-1.5 h-8 font-medium"
              >
                <Lock className="size-3.5" />
                <span>Kunci Kembali</span>
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => setKeyModalOpen(true)}
                className="text-xs gap-1.5 h-8 font-medium bg-primary text-primary-foreground"
              >
                <Unlock className="size-3.5" />
                <span>Buka Dekripsi</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setRecordToDelete(selectedRecord)}
              className="text-xs text-destructive hover:text-destructive h-8 px-2.5"
              title="Hapus Dokumen"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Header Informasi Dokumen */}
        <div className="p-3.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base font-bold uppercase tracking-tight text-slate-900 dark:text-slate-100">
                {selectedRecord.displayNama || selectedRecord.nama || "Dokumen KTP"}
              </h1>
              <Badge
                variant={isUnlocked ? "default" : "secondary"}
                className={`text-[11px] font-bold ${
                  isUnlocked
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                }`}
              >
                {isUnlocked ? "DATA TERDEKRIPSI" : "CIPHERTEXT TERENKRIPSI"}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Waktu Tersimpan: {formattedDate} WIB
            </p>
          </div>

          {decryptedData && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 px-3 py-1 rounded-md">
              <ShieldCheck className="size-3.5 shrink-0" />
              <span>Dekripsi Berhasil</span>
            </div>
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
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Data Terenkripsi</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Daftar data KTP terenkripsi dalam database.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadRecords}
            className="text-xs gap-1.5 h-8 font-medium"
            disabled={loading}
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Muat Ulang</span>
          </Button>
          <Button
            size="sm"
            onClick={() => onNavigate("ocr")}
            className="text-xs gap-1.5 h-8 font-medium"
          >
            <Plus className="size-3.5" />
            <span>Scan KTP Baru</span>
          </Button>
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="border border-slate-300 dark:border-slate-700 rounded-lg shadow-xs overflow-hidden bg-white dark:bg-slate-900">
        {/* Toolbar: Search & Filter */}
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Cari nama KTP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-8.5 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
            />
          </div>

          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[160px] text-xs h-8.5 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700">
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
              <SelectTrigger className="w-[100px] text-xs h-8.5 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700">
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
                <TableRow className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                  <TableHead className="w-14 text-xs font-bold text-slate-700 dark:text-slate-300 text-center">No</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 dark:text-slate-300">Nama</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 dark:text-slate-300">Tanggal</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 dark:text-slate-300 text-right pr-4">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-xs text-slate-500">
                      Memuat data...
                    </TableCell>
                  </TableRow>
                ) : paginatedRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-xs text-slate-500">
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
                      <TableRow key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                        <TableCell className="text-center text-xs text-slate-500 font-mono">
                          {rowNumber}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase">
                          {item.displayNama || item.nama}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                          {dateFormatted}
                        </TableCell>
                        <TableCell className="text-right py-2 pr-4 space-x-1.5 whitespace-nowrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDetail(item)}
                            className="text-xs h-7 px-2.5 font-medium"
                          >
                            <Eye className="size-3 mr-1 text-slate-500" />
                            Detail
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleOpenDecryptModalFromList(item)}
                            className="text-xs h-7 px-2.5 font-medium"
                          >
                            <Unlock className="size-3 mr-1" />
                            Buka Data
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setRecordToDelete(item)}
                            className="size-7 text-destructive hover:text-destructive hover:bg-destructive/10"
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
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
              <div>
                Menampilkan{" "}
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {(currentPage - 1) * pageSize + 1}
                </span>{" "}
                -{" "}
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {Math.min(currentPage * pageSize, filteredRecords.length)}
                </span>{" "}
                dari{" "}
                <span className="font-semibold text-slate-900 dark:text-slate-100">
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
                <div className="px-2 font-bold text-slate-800 dark:text-slate-200">
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
