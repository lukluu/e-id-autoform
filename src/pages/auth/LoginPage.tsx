import { useState } from "react";
import { Lock, Mail, Eye, EyeOff, LogIn, ArrowRight, ShieldCheck, UserPlus } from "lucide-react";
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
    <div className="max-w-md mx-auto py-8">
      <Card className="border-2 shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="size-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center mb-2">
            <Lock className="size-6" />
          </div>
          <CardTitle className="text-xl font-bold">Masuk ke Sistem</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Masuk untuk mengakses data terenkripsi KTP
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="py-2.5 text-xs">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="loginEmail" className="text-xs font-semibold">Email atau Username</Label>
              <div className="relative flex items-center">
                <Input
                  id="loginEmail"
                  type="text"
                  placeholder="nama@email.com atau username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="loginPassword" className="text-xs font-semibold">Kata Sandi</Label>
                <button
                  type="button"
                  onClick={() => onNavigate("forgot-password")}
                  className="text-xs text-primary hover:underline"
                >
                  Lupa Kata Sandi?
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
                  className="text-xs pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full text-xs font-semibold gap-2 mt-2">
              <LogIn className="size-4" /> {loading ? "Memverifikasi..." : "Masuk"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center border-t pt-4">
          <p className="text-xs text-muted-foreground">
            Belum memiliki akun?{" "}
            <button
              onClick={() => onNavigate("register")}
              className="text-primary font-semibold hover:underline inline-flex items-center gap-0.5"
            >
              Daftar Sekarang <ArrowRight className="size-3" />
            </button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
