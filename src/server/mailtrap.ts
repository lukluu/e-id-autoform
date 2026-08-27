/**
 * Backend Node.js Mailtrap Email Service (SMTP)
 * Konfigurasi sepenuhnya dimuat dari Environment Variables (.env)
 */

import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

export interface MailtrapConfig {
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  fromName?: string;
  fromEmail?: string;
}

export const defaultMailtrapConfig: MailtrapConfig = {
  host: process.env["MAILTRAP_HOST"] || "sandbox.smtp.mailtrap.io",
  port: Number(process.env["MAILTRAP_PORT"]) || 2525,
  user: process.env["MAILTRAP_USER"] || "",
  pass: process.env["MAILTRAP_PASS"] || "",
  fromName: process.env["MAILTRAP_SENDER_NAME"] || "Blowfish E-KTP Security System",
  fromEmail: process.env["MAILTRAP_SENDER_EMAIL"] || "security@blowfish-ktp.id",
};

/**
 * Membuat nodemailer transporter untuk Mailtrap SMTP
 */
export function createMailtrapTransporter(config: MailtrapConfig = defaultMailtrapConfig) {
  const finalHost = config.host || defaultMailtrapConfig.host;
  const finalPort = config.port || defaultMailtrapConfig.port;
  const finalUser = config.user || defaultMailtrapConfig.user;
  const finalPass = config.pass || defaultMailtrapConfig.pass;

  return nodemailer.createTransport({
    host: finalHost,
    port: finalPort,
    auth: {
      user: finalUser,
      pass: finalPass,
    },
  });
}

export interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  code?: string;
  type?: "PASSWORD_RESET" | "KEY_RECOVERY" | "TEST";
  config?: MailtrapConfig;
}

/**
 * Mengirimkan email via Mailtrap SMTP
 */
export async function sendMailtrapEmail(payload: SendEmailPayload): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  const config = { ...defaultMailtrapConfig, ...payload.config };

  try {
    const transporter = createMailtrapTransporter(config);

    const info = await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: payload.to,
      subject: payload.subject,
      text: payload.text || payload.html.replace(/<[^>]*>?/gm, ""),
      html: payload.html,
    });

    console.log(`[Mailtrap] Email terkirim ke ${payload.to} (MessageId: ${info.messageId})`);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (err) {
    console.error("[Mailtrap Error] Gagal mengirim email:", (err as Error).message);
    return {
      success: false,
      error: (err as Error).message,
    };
  }
}

/**
 * Menguji koneksi SMTP Mailtrap
 */
export async function testMailtrapConnection(config?: MailtrapConfig): Promise<{
  connected: boolean;
  error?: string;
}> {
  const merged = { ...defaultMailtrapConfig, ...config };
  try {
    const transporter = createMailtrapTransporter(merged);
    await transporter.verify();
    return { connected: true };
  } catch (err) {
    return { connected: false, error: (err as Error).message };
  }
}
