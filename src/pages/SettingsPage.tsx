import { useState, useEffect } from "react";
import {
  Download,
  Upload,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Save,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/layout/PageHeader";
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
import { dbService, type UserRecord } from "@/services/dbService";
import { authService } from "@/services/authService";

export function SettingsPage() {
  const [currentUser, setCurrentUser] = useState<UserRecord | null>(null);

  // Profile Form States
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Password Form States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Data & Backup States
  const [dataMessage, setDataMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  useEffect(() => {
    const unsubAuth = authService.subscribe((u) => {
      setCurrentUser(u);
      if (u) {
        setName(u.name || "");
        setUsername(u.username || "");
        setPhone(u.phone || "");
        setAddress(u.address || "");
      }
    });
    return () => {
      unsubAuth();
    };
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setProfileMessage(null);
    setProfileLoading(true);

    try {
      if (!name.trim()) {
        setProfileMessage({ type: "error", text: "Nama lengkap tidak boleh kosong." });
        return;
      }

      const updated = await dbService.updateUserProfile({
        name: name.trim(),
        username: username.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
      });

      if (updated) {
        setCurrentUser(updated);
        authService.applyUser(updated);
        setProfileMessage({ type: "success", text: "Profil berhasil diperbarui dan tersimpan di database." });
      } else {
        setProfileMessage({ type: "error", text: "Gagal memperbarui data profil." });
      }
    } catch (err) {
      setProfileMessage({
        type: "error",
        text: (err as Error).message || "Gagal memperbarui data profil.",
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setPasswordMessage(null);
    if (!currentPassword) {
      setPasswordMessage({ type: "error", text: "Kata sandi saat ini wajib diisi." });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage({ type: "error", text: "Kata sandi minimal 6 karakter." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "Konfirmasi kata sandi tidak cocok." });
      return;
    }

    setPasswordLoading(true);
    try {
      await dbService.updateUserPassword(currentPassword, newPassword);
      setPasswordMessage({ type: "success", text: "Kata sandi berhasil diperbarui." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordMessage({
        type: "error",
        text: (err as Error).message || "Gagal memperbarui kata sandi.",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleExportDatabase = async () => {
    try {
      const json = await dbService.exportDatabaseToJson();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup_ktp_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setDataMessage({ type: "success", text: "Backup berhasil diunduh." });
    } catch (err) {
      setDataMessage({ type: "error", text: "Gagal mengekspor: " + (err as Error).message });
    }
  };

  const handleImportDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const res = await dbService.importDatabaseFromJson(text);
        setDataMessage({ type: res.success ? "success" : "error", text: res.message });
      } catch (err) {
        setDataMessage({ type: "error", text: "File JSON tidak valid: " + (err as Error).message });
      }
    };
    reader.readAsText(file);
  };

  const handleResetDatabase = async () => {
    try {
      const deleted = await dbService.deleteAllMyEncryptedKtp();
      setResetDialogOpen(false);
      setDataMessage({
        type: "success",
        text:
          deleted > 0
            ? `${deleted} data KTP milik Anda berhasil dihapus.`
            : "Tidak ada data KTP milik Anda yang perlu dihapus.",
      });
    } catch (err) {
      setResetDialogOpen(false);
      setDataMessage({
        type: "error",
        text: "Gagal menghapus data: " + (err as Error).message,
      });
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-12">
      <PageHeader
        title="Pengaturan akun"
        description="Kelola profil, kata sandi, dan cadangan data KTP milik akun Anda."
      />

      {/* 1. Pengaturan Profil Pengguna */}
      {currentUser && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">Informasi profil</CardTitle>
              <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {currentUser.role === "admin" ? "Admin" : "Pengguna"}
              </span>
            </div>
            <CardDescription className="text-sm">
              Ubah nama, username, nomor telepon, dan alamat Anda.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {profileMessage && (
              <Alert
                variant={profileMessage.type === "error" ? "destructive" : "default"}
                className={
                  profileMessage.type === "success"
                    ? "border-success/30 bg-success/5 py-2 text-xs"
                    : "py-2 text-xs"
                }
              >
                {profileMessage.type === "success" ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
                <AlertDescription>{profileMessage.text}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Nama Lengkap */}
                <div className="space-y-1">
                  <Label htmlFor="profName" className="text-sm font-medium">Nama lengkap</Label>
                  <Input
                    id="profName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nama Lengkap"
                    required
                    className="text-sm"
                  />
                </div>

                {/* Email (Read Only) */}
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-muted-foreground">Email akun</Label>
                  <Input
                    value={currentUser.email}
                    disabled
                    className="cursor-not-allowed bg-muted text-muted-foreground"
                  />
                </div>

                {/* Username */}
                <div className="space-y-1">
                  <Label htmlFor="profUsername" className="text-sm font-medium">Username</Label>
                  <Input
                    id="profUsername"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="contoh: muhammad_ali"
                    className="text-sm"
                  />
                </div>

                {/* Nomor HP */}
                <div className="space-y-1">
                  <Label htmlFor="profPhone" className="text-sm font-medium">Nomor HP / WhatsApp</Label>
                  <Input
                    id="profPhone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="081234567890"
                    className="text-sm"
                  />
                </div>
              </div>

              {/* Alamat Lengkap */}
              <div className="space-y-1">
                <Label htmlFor="profAddress" className="text-sm font-medium">Alamat lengkap</Label>
                <Input
                  id="profAddress"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Jl. Sudirman No. 123, Jakarta..."
                  className="text-sm"
                />
              </div>

              <div className="flex justify-end pt-1">
                <Button type="submit" size="sm" disabled={profileLoading} className="h-8 gap-1.5 text-xs font-medium">
                  <Save className="size-3.5" />
                  {profileLoading ? "Menyimpan…" : "Simpan profil"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 2. Keamanan & Ganti Kata Sandi */}
      {currentUser && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Keamanan akun</CardTitle>
            <CardDescription className="text-sm">
              Perbarui kata sandi login secara berkala untuk menjaga keamanan akun.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {passwordMessage && (
              <Alert
                variant={passwordMessage.type === "error" ? "destructive" : "default"}
                className={
                  passwordMessage.type === "success"
                    ? "border-success/30 bg-success/5 py-2 text-xs"
                    : "py-2 text-xs"
                }
              >
                {passwordMessage.type === "success" ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
                <AlertDescription>{passwordMessage.text}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="currentPass" className="text-sm font-medium">
                  Kata sandi saat ini
                </Label>
                <Input
                  id="currentPass"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Masukkan kata sandi yang sedang digunakan"
                  className="text-sm"
                  autoComplete="current-password"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="newPass" className="text-sm font-medium">Kata sandi baru</Label>
                  <Input
                    id="newPass"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 6 karakter"
                    className="text-sm"
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="confirmPass" className="text-sm font-medium">Konfirmasi kata sandi baru</Label>
                  <Input
                    id="confirmPass"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ketik ulang kata sandi"
                    className="text-sm"
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <Button type="submit" size="sm" variant="outline" disabled={passwordLoading} className="h-8 text-xs font-medium">
                  {passwordLoading ? "Memperbarui…" : "Perbarui kata sandi"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 3. Backup & Manajemen Data */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cadangan & penghapusan data</CardTitle>
          <CardDescription className="text-sm">
            Ekspor atau impor salinan data KTP terenkripsi milik Anda. Penghapusan hanya
            berlaku untuk data akun Anda sendiri.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {dataMessage && (
            <Alert
              variant={dataMessage.type === "error" ? "destructive" : "default"}
              className={
                dataMessage.type === "success"
                  ? "border-success/30 bg-success/5 py-2 text-xs"
                  : "py-2 text-xs"
              }
            >
              {dataMessage.type === "success" ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
              <AlertDescription>{dataMessage.text}</AlertDescription>
            </Alert>
          )}

          <ul className="divide-y divide-border/70 border-t border-border/70">
            <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h4 className="text-sm font-medium text-foreground">Ekspor cadangan</h4>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Unduh data terenkripsi milik Anda dalam format JSON.
                </p>
              </div>
              <Button
                onClick={handleExportDatabase}
                variant="outline"
                size="sm"
                className="h-8 w-fit shrink-0 gap-1.5 text-xs font-medium"
              >
                <Download className="size-3.5" />
                Unduh JSON
              </Button>
            </li>

            <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h4 className="text-sm font-medium text-foreground">Impor cadangan</h4>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Pulihkan data dari berkas JSON yang pernah Anda unduh.
                </p>
              </div>
              <label className="w-fit shrink-0">
                <Button variant="outline" size="sm" asChild className="h-8 cursor-pointer gap-1.5 text-xs font-medium">
                  <span>
                    <Upload className="size-3.5" />
                    Pilih berkas
                  </span>
                </Button>
                <input type="file" accept=".json" className="hidden" onChange={handleImportDatabase} />
              </label>
            </li>

            <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h4 className="text-sm font-medium text-foreground">Hapus semua data KTP saya</h4>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Mengosongkan dokumen KTP milik akun Anda saja, tanpa menyentuh data pengguna lain.
                </p>
              </div>
              <Button
                onClick={() => setResetDialogOpen(true)}
                variant="destructive"
                size="sm"
                className="h-8 w-fit shrink-0 gap-1.5 text-xs font-medium"
              >
                <Trash2 className="size-3.5" />
                Hapus data
              </Button>
            </li>
          </ul>

          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <FileText className="mt-0.5 size-3.5 shrink-0" />
            <span>
              Database terhubung dan hanya menyimpan ciphertext — kunci dekripsi tidak pernah
              disimpan di server.
            </span>
          </p>
        </CardContent>
      </Card>

      {/* Konfirmasi Dialog Reset */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive text-base">Hapus Semua Data KTP Anda?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Tindakan ini akan mengosongkan seluruh data dokumen KTP terenkripsi milik akun Anda
              dari database secara permanen. Data milik pengguna lain tidak terpengaruh.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-sm">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetDatabase}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs"
            >
              Ya, Hapus Semua
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
