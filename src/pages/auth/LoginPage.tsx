import { useState } from "react";
import { Eye, EyeOff, LogIn, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { authService } from "@/services/authService";
import type { AppPageTab } from "@/components/layout/AppLayout";

interface LoginPageProps {
  onNavigate: (tab: AppPageTab) => void;
}

export function LoginPage({ onNavigate }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await authService.login(email, password);
      if (res.success) {
        onNavigate("dashboard");
      } else {
        setError(res.error || "Gagal login.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col py-10">
      <Card>
        <CardHeader className="space-y-1 pb-4">
          <span aria-hidden className="mb-2 block h-1 w-7 rounded-full bg-primary" />
          <CardTitle className="text-lg font-semibold tracking-tight">Masuk</CardTitle>
          <CardDescription className="text-sm">
            Akses dokumen KTP terenkripsi milik akun Anda.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="loginEmail" className="text-sm font-medium">
                Email atau username
              </Label>
              <Input
                id="loginEmail"
                type="text"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="loginPassword" className="text-sm font-medium">
                  Kata sandi
                </Label>
                <button
                  type="button"
                  onClick={() => onNavigate("forgot-password")}
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Lupa kata sandi?
                </button>
              </div>
              <div className="relative flex items-center">
                <Input
                  id="loginPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
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

            <Button type="submit" disabled={loading} className="mt-2 w-full gap-2">
              <LogIn className="size-4" /> {loading ? "Memverifikasi…" : "Masuk"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center border-t border-border/70 pt-4">
          <p className="text-sm text-muted-foreground">
            Belum punya akun?{" "}
            <button
              onClick={() => onNavigate("register")}
              className="inline-flex items-center gap-0.5 font-medium text-primary hover:underline"
            >
              Daftar <ArrowRight className="size-3.5" />
            </button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
