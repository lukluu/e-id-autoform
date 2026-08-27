import { useState, useEffect } from "react";
import {
  Download,
  Upload,
  Trash2,
  User,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Database,
  FileText,
  Phone,
  MapPin,
  AtSign,
  Shield,
  Save,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { dbService, hashPasswordSimple, type UserRecord } from "@/services/dbService";
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
        email: currentUser.email,
        name: name.trim(),
        username: username.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
      });

      if (updated) {
        setCurrentUser(updated);
        setProfileMessage({ type: "success", text: "Profil berhasil diperbarui dan tersimpan di database." });
      } else {
        setProfileMessage({ type: "error", text: "Gagal memperbarui data profil." });
      }
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setPasswordMessage(null);
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
      const updated = await dbService.updateUserPassword(currentUser.email, hashPasswordSimple(newPassword));
      if (updated) {
        setPasswordMessage({ type: "success", text: "Kata sandi berhasil diperbarui." });
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordMessage({ type: "error", text: "Gagal memperbarui kata sandi." });
      }
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
    await dbService.clearEntireDatabase();
    setResetDialogOpen(false);
    setDataMessage({ type: "success", text: "Seluruh data berhasil dihapus dari Neon PostgreSQL." });
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Pengaturan Akun & Profil</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Kelola informasi profil pribadi, keamanan kata sandi, dan cadangan database Anda.
        </p>
      </div>

      {/* 1. Pengaturan Profil Pengguna */}
      {currentUser && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="size-4 text-primary" />
                Informasi Profil Pengguna
              </CardTitle>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wider">
                Role: {currentUser.role || "user"}
              </span>
            </div>
            <CardDescription className="text-xs">
              Ubah data pribadi, username, nomor telepon, dan alamat Anda.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {profileMessage && (
              <Alert
                variant={profileMessage.type === "error" ? "destructive" : "default"}
                className={
                  profileMessage.type === "success"
                    ? "border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 py-2 text-xs"
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
                  <Label htmlFor="profName" className="text-xs font-semibold">Nama Lengkap</Label>
                  <Input
                    id="profName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nama Lengkap"
                    required
                    className="text-xs"
                  />
                </div>

                {/* Email (Read Only) */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground">Email (Akun)</Label>
                  <Input
                    value={currentUser.email}
                    disabled
                    className="text-xs bg-muted text-muted-foreground cursor-not-allowed"
                  />
                </div>

                {/* Username */}
                <div className="space-y-1">
                  <Label htmlFor="profUsername" className="text-xs font-semibold">Username</Label>
                  <Input
                    id="profUsername"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="contoh: muhammad_ali"
                    className="text-xs"
                  />
                </div>

                {/* Nomor HP */}
                <div className="space-y-1">
                  <Label htmlFor="profPhone" className="text-xs font-semibold">Nomor HP / WhatsApp</Label>
                  <Input
                    id="profPhone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="081234567890"
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Alamat Lengkap */}
              <div className="space-y-1">
                <Label htmlFor="profAddress" className="text-xs font-semibold">Alamat Lengkap</Label>
                <Input
                  id="profAddress"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Jl. Sudirman No. 123, Jakarta..."
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end pt-1">
                <Button type="submit" size="sm" disabled={profileLoading} className="text-xs font-semibold gap-1.5">
                  <Save className="size-3.5" />
                  {profileLoading ? "Menyimpan..." : "Simpan Profil"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 2. Keamanan & Ganti Kata Sandi */}
      {currentUser && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="size-4 text-primary" />
              Keamanan Akun & Kata Sandi
            </CardTitle>
            <CardDescription className="text-xs">
              Perbarui kata sandi login akun Anda secara berkala untuk menjaga keamanan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {passwordMessage && (
              <Alert
                variant={passwordMessage.type === "error" ? "destructive" : "default"}
                className={
                  passwordMessage.type === "success"
                    ? "border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 py-2 text-xs"
                    : "py-2 text-xs"
                }
              >
                {passwordMessage.type === "success" ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
                <AlertDescription>{passwordMessage.text}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="newPass" className="text-xs font-semibold">Kata Sandi Baru</Label>
                  <Input
                    id="newPass"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 6 karakter"
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="confirmPass" className="text-xs font-semibold">Konfirmasi Kata Sandi Baru</Label>
                  <Input
                    id="confirmPass"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ketik ulang kata sandi"
                    className="text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <Button type="submit" size="sm" variant="outline" disabled={passwordLoading} className="text-xs font-semibold">
                  {passwordLoading ? "Memperbarui..." : "Perbarui Kata Sandi"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 3. Backup & Manajemen Data */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="size-4 text-primary" />
            Cadangan Data & Reset
          </CardTitle>
          <CardDescription className="text-xs">
            Ekspor atau impor salinan data terenkripsi KTP dan reset database jika diperlukan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {dataMessage && (
            <Alert
              variant={dataMessage.type === "error" ? "destructive" : "default"}
              className={
                dataMessage.type === "success"
                  ? "border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 py-2 text-xs"
                  : "py-2 text-xs"
              }
            >
              {dataMessage.type === "success" ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
              <AlertDescription>{dataMessage.text}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl border bg-muted/20 flex flex-col justify-between gap-3">
              <div>
                <h4 className="font-semibold text-xs text-foreground">Ekspor Backup</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">Unduh data terenkripsi dalam format JSON.</p>
              </div>
              <Button onClick={handleExportDatabase} variant="outline" size="sm" className="gap-1.5 w-full text-xs">
                <Download className="size-3.5" />
                Unduh JSON
              </Button>
            </div>

            <div className="p-3.5 rounded-xl border bg-muted/20 flex flex-col justify-between gap-3">
              <div>
                <h4 className="font-semibold text-xs text-foreground">Impor Data</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">Pulihkan database dari file JSON backup.</p>
              </div>
              <label className="w-full">
                <Button variant="outline" size="sm" asChild className="gap-1.5 w-full text-xs cursor-pointer">
                  <span>
                    <Upload className="size-3.5" />
                    Pilih File
                  </span>
                </Button>
                <input type="file" accept=".json" className="hidden" onChange={handleImportDatabase} />
              </label>
            </div>

            <div className="p-3.5 rounded-xl border border-destructive/20 bg-destructive/5 flex flex-col justify-between gap-3">
              <div>
                <h4 className="font-semibold text-xs text-destructive">Hapus Semua Data</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">Kosongkan seluruh data KTP tersimpan.</p>
              </div>
              <Button
                onClick={() => setResetDialogOpen(true)}
                variant="destructive"
                size="sm"
                className="gap-1.5 w-full text-xs"
              >
                <Trash2 className="size-3.5" />
                Reset Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Catatan Database */}
      <div className="flex items-start gap-2 px-3.5 py-3 rounded-lg border bg-muted/30 text-xs text-muted-foreground">
        <FileText className="size-4 shrink-0 mt-0.5 text-primary" />
        <span>
          Database aktif terhubung langsung ke <strong>Neon Serverless PostgreSQL Cloud</strong> dengan <strong>Prisma ORM</strong>.
        </span>
      </div>

      {/* Konfirmasi Dialog Reset */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive text-base">Hapus Semua Data?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Tindakan ini akan mengosongkan seluruh data dokumen KTP terenkripsi dari database Neon PostgreSQL secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Batal</AlertDialogCancel>
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
