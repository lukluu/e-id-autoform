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
    <div className="mx-auto flex w-full max-w-sm flex-col py-10">
      <Card>
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-lg font-semibold tracking-tight">Buat akun</CardTitle>
          <CardDescription className="text-sm">
            Akun ini menyimpan dokumen KTP yang dienkripsi dengan kunci Anda sendiri.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleRegister} className="space-y-3.5">
            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="regName" className="text-sm font-medium">
                Nama lengkap
              </Label>
              <Input
                id="regName"
                placeholder="Contoh: Muhammad Ali"
                value={name}
                maxLength={100}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="regEmail" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="regEmail"
                type="email"
                placeholder="nama@email.com"
                value={email}
                maxLength={100}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="regPassword" className="text-sm font-medium">
                Kata sandi
              </Label>
              <div className="relative flex items-center">
                <Input
                  id="regPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="regConfirmPassword" className="text-sm font-medium">
                Konfirmasi kata sandi
              </Label>
              <Input
                id="regConfirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" disabled={loading} className="mt-2 w-full gap-2">
              <UserPlus className="size-4" /> {loading ? "Mendaftarkan…" : "Daftar"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center border-t border-border/70 pt-4">
          <p className="text-sm text-muted-foreground">
            Sudah punya akun?{" "}
            <button
              onClick={() => onNavigate("login")}
              className="font-medium text-primary hover:underline"
            >
              Masuk
            </button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
