import { useState } from "react";
import { Mail, KeyRound, Lock, ArrowLeft, CheckCircle2, AlertTriangle, Send } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { authService } from "@/services/authService";
import type { AppPageTab } from "@/components/layout/AppLayout";

interface ForgotPasswordPageProps {
  onNavigate: (tab: AppPageTab) => void;
}

export function ForgotPasswordPage({ onNavigate }: ForgotPasswordPageProps) {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await authService.requestPasswordReset(email);
      if (res.success) {
        setStep(2);
        setSuccessMessage(
          `Kode OTP 6-digit telah dikirimkan ke email (${email}). Silakan cek kotak masuk email simulasi di pojok kanan atas.`,
        );
      } else {
        setError(res.error || "Gagal mengirimkan kode verifikasi.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await authService.confirmPasswordReset(email, otpCode.trim(), newPassword);
      if (res.success) {
        setSuccessMessage("Kata sandi berhasil diperbarui! Silakan masuk dengan kata sandi baru Anda.");
        setTimeout(() => {
          onNavigate("login");
        }, 1500);
      } else {
        setError(res.error || "Kode verifikasi salah atau kadaluarsa.");
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
            <KeyRound className="size-6" />
          </div>
          <CardTitle className="text-xl font-bold">Lupa Kata Sandi</CardTitle>
          <CardDescription className="text-xs">
            {step === 1
              ? "Masukkan email akun Anda untuk menerima kode verifikasi OTP"
              : "Masukkan kode OTP dari email dan kata sandi baru Anda"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" className="py-2.5 text-xs mb-4">
              <AlertTriangle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {successMessage && (
            <Alert className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 py-2.5 text-xs mb-4">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          {step === 1 ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="forgotEmail" className="text-xs font-semibold">Email Terdaftar</Label>
                <Input
                  id="forgotEmail"
                  type="email"
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full text-xs font-semibold gap-2">
                <Send className="size-4" /> {loading ? "Mengirimkan Kode..." : "Kirim Kode Verifikasi Email"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleConfirmReset} className="space-y-3.5">
              <div className="space-y-1">
                <Label htmlFor="otpInput" className="text-xs font-semibold">Kode OTP 6-Digit</Label>
                <Input
                  id="otpInput"
                  placeholder="123456"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  required
                  className="font-mono text-center tracking-widest text-lg font-bold"
                />
                <p className="text-[11px] text-muted-foreground">
                  Lihat kode pada menu <strong>Email Masuk</strong> di header atas.
                </p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="newPassInput" className="text-xs font-semibold">Kata Sandi Baru</Label>
                <Input
                  id="newPassInput"
                  type="password"
                  placeholder="Minimal 6 karakter"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="confirmPassInput" className="text-xs font-semibold">Konfirmasi Kata Sandi</Label>
                <Input
                  id="confirmPassInput"
                  type="password"
                  placeholder="Ketik ulang kata sandi baru"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full text-xs font-semibold gap-2 mt-2">
                <CheckCircle2 className="size-4" /> {loading ? "Memproses..." : "Perbarui Kata Sandi"}
              </Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="flex justify-between border-t pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate("login")}
            className="text-xs gap-1"
          >
            <ArrowLeft className="size-3.5" /> Kembali ke Login
          </Button>

          {step === 2 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRequestOtp}
              disabled={loading}
              className="text-xs"
            >
              Kirim Ulang OTP
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
