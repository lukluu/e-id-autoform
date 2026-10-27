/**
 * Template & pengiriman email transaksional (server-side).
 * Kode OTP TIDAK pernah dikembalikan ke klien; hanya dikirim ke email user.
 */

import { sendMailtrapEmail, type SendEmailPayload } from "./mailtrap";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function wrapTemplate(options: {
  accent: string;
  title: string;
  subtitle: string;
  body: string;
}): string {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: ${options.accent}; padding: 20px; text-align: center; color: white;">
        <h2 style="margin: 0; font-size: 20px;">${options.title}</h2>
        <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">${options.subtitle}</p>
      </div>
      <div style="padding: 24px;">${options.body}</div>
    </div>
  `;
}

interface DeliveryResult {
  sent: boolean;
  error?: string | undefined;
}

async function deliver(payload: SendEmailPayload): Promise<DeliveryResult> {
  const result = await sendMailtrapEmail(payload);
  if (!result.success) {
    return { sent: false, error: result.error ?? "Gagal mengirim email." };
  }
  return { sent: true };
}

export async function sendPasswordResetEmail(
  to: string,
  code: string,
): Promise<DeliveryResult> {
  const body = `
    <p>Halo,</p>
    <p>Kami menerima permintaan untuk mereset kata sandi akun Anda pada Sistem Enkripsi KTP Blowfish.</p>
    <div style="background: #f8fafc; border: 2px dashed #0284c7; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
      <p style="margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #64748b;">KODE VERIFIKASI ANDA:</p>
      <p style="margin: 8px 0 0 0; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0284c7; font-family: monospace;">${code}</p>
    </div>
    <p style="font-size: 13px; color: #64748b;">
      Kode ini berlaku selama <strong>15 menit</strong>. Jangan berikan kode ini kepada siapa pun.
    </p>
  `;

  return deliver({
    to,
    subject: "Verifikasi Reset Kata Sandi Akun KTP",
    html: wrapTemplate({
      accent: "#0284c7",
      title: "Sistem Kriptografi KTP Blowfish",
      subtitle: "Permintaan Reset Kata Sandi",
      body,
    }),
  });
}

export async function sendKeyRecoveryEmail(
  to: string,
  data: { displayName: string; recordRef: string; code: string },
): Promise<DeliveryResult> {
  const body = `
    <p>Halo,</p>
    <p>Anda mengajukan bantuan pemulihan akses untuk dokumen KTP terenkripsi
      <strong>${escapeHtml(data.displayName)}</strong> (ref: ${escapeHtml(data.recordRef)}).</p>
    <div style="background: #ecfdf5; border: 2px dashed #059669; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
      <p style="margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #047857;">KODE OTORISASI PEMULIHAN:</p>
      <p style="margin: 8px 0 0 0; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #064e3b; font-family: monospace;">${data.code}</p>
    </div>
    <p style="font-size: 13px; color: #64748b;">
      Masukkan kode di atas pada formulir verifikasi. Kode berlaku selama <strong>15 menit</strong>.
    </p>
  `;

  return deliver({
    to,
    subject: "Otorisasi Pemulihan Kunci Dokumen KTP",
    html: wrapTemplate({
      accent: "#059669",
      title: "Pemulihan Kunci Enkripsi KTP",
      subtitle: "Bantuan Akses Dokumen Terenkripsi",
      body,
    }),
  });
}
