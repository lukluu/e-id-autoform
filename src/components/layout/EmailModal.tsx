import { useEffect, useState } from "react";
import { Mail, Trash2, CheckCircle2, Clock, ShieldAlert, KeyRound, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { emailService, type VirtualEmail } from "@/services/emailService";

interface EmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmailModal({ open, onOpenChange }: EmailModalProps) {
  const [emails, setEmails] = useState<VirtualEmail[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<VirtualEmail | null>(null);

  useEffect(() => {
    const unsub = emailService.subscribe((list) => {
      setEmails(list);
      if (selectedEmail) {
        const updated = list.find((e) => e.id === selectedEmail.id);
        if (updated) setSelectedEmail(updated);
      }
    });
    return unsub;
  }, [selectedEmail]);

  const handleSelectEmail = (mail: VirtualEmail) => {
    emailService.markAsRead(mail.id);
    setSelectedEmail(mail);
  };

  const handleClear = () => {
    emailService.clearInbox();
    setSelectedEmail(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 border-b bg-muted/40 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Mail className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base">Simulasi Kotak Masuk Email</DialogTitle>
              <DialogDescription className="text-xs">
                Email verifikasi keamanan, reset password, dan kode pemulihan kunci masuk ke sini.
              </DialogDescription>
            </div>
          </div>
          {emails.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClear} className="text-destructive gap-1 text-xs">
              <Trash2 className="size-3.5" /> Hapus Semua
            </Button>
          )}
        </DialogHeader>

        <div className="grid md:grid-cols-12 flex-1 overflow-hidden min-h-[380px]">
          {/* List Email */}
          <div className="md:col-span-5 border-r bg-background/50 flex flex-col">
            <div className="p-2.5 border-b text-xs font-semibold text-muted-foreground flex justify-between items-center">
              <span>Daftar Pesan ({emails.length})</span>
            </div>
            <ScrollArea className="flex-1 max-h-[350px]">
              {emails.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  <Mail className="size-8 mx-auto mb-2 opacity-40" />
                  Kotak masuk kosong. Email verifikasi akan muncul otomatis saat Anda meminta OTP / lupa kunci.
                </div>
              ) : (
                <div className="divide-y">
                  {emails.map((mail) => (
                    <button
                      key={mail.id}
                      onClick={() => handleSelectEmail(mail)}
                      className={`w-full text-left p-3 transition-colors hover:bg-accent/50 flex flex-col gap-1 ${
                        selectedEmail?.id === mail.id ? "bg-accent" : ""
                      } ${!mail.read ? "border-l-4 border-l-primary font-medium" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <Badge
                          variant={mail.type === "PASSWORD_RESET" ? "default" : "secondary"}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {mail.type === "PASSWORD_RESET" ? "Reset Kata Sandi" : "Pemulihan Kunci"}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="size-2.5" />
                          {new Date(mail.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-xs font-semibold truncate text-foreground">{mail.subject}</p>
                      <p className="text-[11px] text-muted-foreground truncate">Ke: {mail.to}</p>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Email Body Preview */}
          <div className="md:col-span-7 p-4 flex flex-col justify-between overflow-y-auto max-h-[380px] bg-background">
            {selectedEmail ? (
              <div className="space-y-3">
                <div className="border-b pb-2.5">
                  <h3 className="text-sm font-bold text-foreground">{selectedEmail.subject}</h3>
                  <div className="text-xs text-muted-foreground mt-1 flex flex-col gap-0.5">
                    <span><strong>Pengirim:</strong> {selectedEmail.from}</span>
                    <span><strong>Penerima:</strong> {selectedEmail.to}</span>
                    <span><strong>Waktu:</strong> {new Date(selectedEmail.timestamp).toLocaleString("id-ID")}</span>
                  </div>
                </div>

                {selectedEmail.code && (
                  <div className="p-3 rounded-lg border bg-primary/5 border-primary/20 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-medium text-primary">KODE VERIFIKASI / PEMULIHAN:</span>
                      <p className="text-2xl font-bold tracking-widest font-mono text-foreground">
                        {selectedEmail.code}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedEmail.code || "");
                      }}
                      className="text-xs"
                    >
                      Salin Kode
                    </Button>
                  </div>
                )}

                <div
                  className="text-xs text-foreground bg-muted/20 p-3 rounded-md border"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-6">
                <Mail className="size-10 mb-2 opacity-30 text-primary" />
                <p className="text-sm font-medium">Pilih pesan di samping</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Pesan email simulasi yang dikirim oleh sistem akan terbuka di sini.
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
