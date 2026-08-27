/**
 * Layanan Pengiriman Email Terintegrasi Mailtrap & Kotak Masuk Virtual
 * Mengirimkan email nyata ke inbox Mailtrap Sandbox / Live saat Lupa Password dan Pemulihan Kunci KTP.
 */

export interface VirtualEmail {
  id: string;
  from: string;
  to: string;
  subject: string;
  bodyHtml: string;
  timestamp: string;
  code?: string | undefined;
  type: "PASSWORD_RESET" | "KEY_RECOVERY" | "WELCOME" | "SECURITY_ALERT" | "TEST";
  read: boolean;
  mailtrapDelivered?: boolean | undefined;
  messageId?: string | undefined;
}

export interface MailtrapClientConfig {
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  fromName?: string;
  fromEmail?: string;
}

type EmailListener = (emails: VirtualEmail[]) => void;

class EmailService {
  private emails: VirtualEmail[] = [];
  private listeners: Set<EmailListener> = new Set();
  private customConfig: MailtrapClientConfig | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("eid_virtual_inbox");
        if (raw) {
          this.emails = JSON.parse(raw);
        }
        const cfg = localStorage.getItem("eid_mailtrap_config");
        if (cfg) {
          this.customConfig = JSON.parse(cfg);
        }
      } catch {
        this.emails = [];
      }
    }
  }

  public subscribe(listener: EmailListener): () => void {
    this.listeners.add(listener);
    listener([...this.emails]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("eid_virtual_inbox", JSON.stringify(this.emails));
    }
    const copy = [...this.emails];
    this.listeners.forEach((l) => l(copy));
  }

  public getEmails(): VirtualEmail[] {
    return [...this.emails];
  }

  public getUnreadCount(): number {
    return this.emails.filter((e) => !e.read).length;
  }

  public markAsRead(id: string): void {
    const item = this.emails.find((e) => e.id === id);
    if (item) {
      item.read = true;
      this.notify();
    }
  }

  public clearInbox(): void {
    this.emails = [];
    this.notify();
  }

  public getMailtrapConfig(): MailtrapClientConfig | null {
    return this.customConfig;
  }

  public setMailtrapConfig(config: MailtrapClientConfig): void {
    this.customConfig = config;
    if (typeof window !== "undefined") {
      localStorage.setItem("eid_mailtrap_config", JSON.stringify(config));
    }
  }

  /**
   * Menguji koneksi SMTP Mailtrap
   */
  public async testConnection(config?: MailtrapClientConfig): Promise<{ connected: boolean; error?: string }> {
    try {
      const res = await fetch("/api/mailtrap/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: config || this.customConfig }),
      });
      if (res.ok) {
        return await res.json();
      }
      return { connected: false, error: `HTTP ${res.status}` };
    } catch (err) {
      return { connected: false, error: (err as Error).message };
    }
  }

  /**
   * Kirim email kode verifikasi reset password via Mailtrap
   */
  public async sendPasswordResetEmail(email: string, code: string): Promise<VirtualEmail> {
    const subject = `[KODE KEAMANAN: ${code}] Verifikasi Reset Kata Sandi Akun KTP`;
    const bodyHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: #0284c7; padding: 20px; text-align: center; color: white;">
          <h2 style="margin: 0; font-size: 20px;">Sistem Kriptografi KTP Blowfish</h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Permintaan Reset Kata Sandi</p>
        </div>
        <div style="padding: 24px;">
          <p>Halo,</p>
          <p>Kami menerima permintaan untuk mereset kata sandi akun Anda pada Sistem Enkripsi KTP Blowfish.</p>
          <div style="background: #f8fafc; border: 2px dashed #0284c7; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
            <p style="margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #64748b;">KODE VERIFIKASI ANDA:</p>
            <p style="margin: 8px 0 0 0; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0284c7; font-family: monospace;">${code}</p>
          </div>
          <p style="font-size: 13px; color: #64748b;">
            Kode ini berlaku selama <strong>15 menit</strong>. Jangan berikan kode ini kepada siapa pun untuk menjaga kerahasiaan data pribadi KTP Anda.
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
            Sistem Keamanan Otomatis • Algoritma Kriptografi Blowfish 64-bit
          </p>
        </div>
      </div>
    `;

    let mailtrapDelivered = false;
    let messageId: string | undefined;

    // Kirim via backend Mailtrap endpoint
    try {
      const res = await fetch("/api/mailtrap/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: email,
          subject,
          html: bodyHtml,
          code,
          type: "PASSWORD_RESET",
          config: this.customConfig,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        mailtrapDelivered = Boolean(data.success);
        messageId = data.messageId;
      }
    } catch {
      // Fallback
    }

    const mail: VirtualEmail = {
      id: "mail_" + Date.now(),
      from: "security@blowfish-ktp.id",
      to: email,
      subject,
      bodyHtml,
      timestamp: new Date().toISOString(),
      code,
      type: "PASSWORD_RESET",
      read: false,
      mailtrapDelivered,
      messageId,
    };

    this.emails.unshift(mail);
    this.notify();
    return mail;
  }

  /**
   * Kirim email kode pemulihan kunci enkripsi KTP via Mailtrap
   */
  public async sendKeyRecoveryEmail(
    email: string,
    data: {
      maskedNik: string;
      nama: string;
      keyHint?: string | undefined;
      recoveryCode: string;
    },
  ): Promise<VirtualEmail> {
    const subject = `[KODE PEMULIHAN: ${data.recoveryCode}] Otorisasi Akses Dokumen KTP (${data.maskedNik})`;
    const bodyHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: #059669; padding: 20px; text-align: center; color: white;">
          <h2 style="margin: 0; font-size: 20px;">Pemulihan Kunci Enkripsi KTP</h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Bantuan Akses Dokumen Terenkripsi</p>
        </div>
        <div style="padding: 24px;">
          <p>Halo,</p>
          <p>Anda mengajukan bantuan pemulihan akses untuk dokumen KTP terenkripsi atas nama <strong>${data.nama}</strong> (${data.maskedNik}).</p>
          
          <div style="background: #ecfdf5; border: 2px dashed #059669; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
            <p style="margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #047857;">KODE OTORISASI PEMULIHAN:</p>
            <p style="margin: 8px 0 0 0; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #064e3b; font-family: monospace;">${data.recoveryCode}</p>
          </div>

          <p style="font-size: 13px; color: #64748b;">
            Masukkan kode di atas pada formulir verifikasi sistem untuk memulihkan kunci dan membuka akses dokumen KTP Anda secara otomatis.
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
            Sistem Keamanan Otomatis • Algoritma Kriptografi Blowfish 64-bit
          </p>
        </div>
      </div>
    `;

    let mailtrapDelivered = false;
    let messageId: string | undefined;

    // Kirim via backend Mailtrap endpoint
    try {
      const res = await fetch("/api/mailtrap/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: email,
          subject,
          html: bodyHtml,
          code: data.recoveryCode,
          type: "KEY_RECOVERY",
          config: this.customConfig,
        }),
      });
      if (res.ok) {
        const resData = await res.json();
        mailtrapDelivered = Boolean(resData.success);
        messageId = resData.messageId;
      }
    } catch {
      // Fallback
    }

    const mail: VirtualEmail = {
      id: "mail_" + Date.now(),
      from: "vault-recovery@blowfish-ktp.id",
      to: email,
      subject,
      bodyHtml,
      timestamp: new Date().toISOString(),
      code: data.recoveryCode,
      type: "KEY_RECOVERY",
      read: false,
      mailtrapDelivered,
      messageId,
    };

    this.emails.unshift(mail);
    this.notify();
    return mail;
  }
}

export const emailService = new EmailService();
