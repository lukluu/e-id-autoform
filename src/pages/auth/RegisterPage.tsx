import { useState } from "react";
import { UserPlus, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { authService } from "@/services/authService";
import type { AppPageTab } from "@/components/layout/AppLayout";

interface RegisterPageProps {
  onNavigate: (tab: AppPageTab) => void;
}

export function RegisterPage({ onNavigate }: RegisterPageProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await authService.register(name, email, password);
      if (res.success) {
        onNavigate("dashboard");
      } else {
        setError(res.error || "Gagal mendaftar.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-8">
      <Card className="border-2 shadow-lg">
        <CardHeader className="space-y-1 text-center pb-3">
          <div className="size-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center mb-1">
            <UserPlus className="size-6" />
          </div>
          <CardTitle className="text-xl font-bold">Daftar Akun Baru</CardTitle>
          <CardDescription className="text-xs">
            Daftarkan akun untuk mengelola dan mengenkripsi dokumen KTP Anda
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleRegister} className="space-y-3.5">
            {error && (
              <Alert variant="destructive" className="py-2 text-xs">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="regName" className="text-xs font-semibold">Nama Lengkap</Label>
              <Input
                id="regName"
                placeholder="Contoh: Muhammad Ali"
                value={name}
                maxLength={100}
                onChange={(e) => setName(e.target.value)}
                required
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="regEmail" className="text-xs font-semibold">Email Pengguna</Label>
              <Input
                id="regEmail"
                type="email"
                placeholder="nama@email.com"
                value={email}
                maxLength={100}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="regPassword" className="text-xs font-semibold">Kata Sandi</Label>
              <div className="relative flex items-center">
                <Input
                  id="regPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="text-xs pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="regConfirmPassword" className="text-xs font-semibold">Konfirmasi Kata Sandi</Label>
              <Input
                id="regConfirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="text-xs"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full text-xs font-semibold gap-2 mt-3">
              <UserPlus className="size-4" /> {loading ? "Mendaftarkan Akun..." : "Daftar Akun"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center border-t pt-3">
          <p className="text-xs text-muted-foreground">
            Sudah memiliki akun?{" "}
            <button
              onClick={() => onNavigate("login")}
              className="text-primary font-semibold hover:underline inline-flex items-center gap-1"
            >
              Masuk di sini
            </button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
