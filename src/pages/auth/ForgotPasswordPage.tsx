import { useState } from "react";
import { ArrowLeft, CheckCircle2, AlertTriangle, Send } from "lucide-react";
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
          res.message ||
            `Jika email (${email}) terdaftar, kode OTP 6-digit telah dikirim. Periksa kotak masuk email Anda.`,
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
    <div className="mx-auto flex w-full max-w-sm flex-col py-10">
      <Card>
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-lg font-semibold tracking-tight">Lupa kata sandi</CardTitle>
          <CardDescription className="text-sm">
            {step === 1
              ? "Masukkan email akun Anda untuk menerima kode verifikasi."
              : "Masukkan kode OTP dari email dan kata sandi baru Anda."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4 py-2">
              <AlertTriangle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {successMessage && (
            <Alert className="mb-4 border-success/30 bg-success/5 py-2">
              <CheckCircle2 className="size-4 text-success" />
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          {step === 1 ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="forgotEmail" className="text-sm font-medium">
                  Email terdaftar
                </Label>
                <Input
                  id="forgotEmail"
                  type="email"
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full gap-2">
                <Send className="size-4" /> {loading ? "Mengirim…" : "Kirim kode verifikasi"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleConfirmReset} className="space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="otpInput" className="text-sm font-medium">
                  Kode OTP 6 digit
                </Label>
                <Input
                  id="otpInput"
                  placeholder="123456"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  required
                  className="text-center font-mono text-lg tracking-[0.3em]"
                />
                <p className="text-xs text-muted-foreground">
                  Periksa kotak masuk email Anda untuk membaca kode OTP.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="newPassInput" className="text-sm font-medium">
                  Kata sandi baru
                </Label>
                <Input
                  id="newPassInput"
                  type="password"
                  placeholder="Minimal 6 karakter"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassInput" className="text-sm font-medium">
                  Konfirmasi kata sandi
                </Label>
                <Input
                  id="confirmPassInput"
                  type="password"
                  placeholder="Ketik ulang kata sandi baru"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" disabled={loading} className="mt-2 w-full gap-2">
                <CheckCircle2 className="size-4" /> {loading ? "Memproses…" : "Perbarui kata sandi"}
              </Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="justify-between border-t border-border/70 pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate("login")}
            className="-ml-2 h-8 gap-1 text-xs text-muted-foreground"
          >
            <ArrowLeft className="size-3.5" /> Kembali
          </Button>

          {step === 2 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRequestOtp}
              disabled={loading}
              className="h-8 text-xs font-medium"
            >
              Kirim ulang OTP
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
