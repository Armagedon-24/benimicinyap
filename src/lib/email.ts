import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

/**
 * E-posta bildirim altyapısı (SMTP tabanlı, env ile yapılandırılır).
 *
 * Gerekli env değişkenleri:
 *   SMTP_HOST       — SMTP sunucusu (örn. smtp.gmail.com)
 *   SMTP_PORT       — port (587 / 465)
 *   SMTP_USER       — kullanıcı adı
 *   SMTP_PASS       — şifre / app password
 *   SMTP_SECURE     — "1" ise 465 implicit TLS, aksi halde STARTTLS
 *   EMAIL_FROM      — gönderen adresi (varsayılan: SMTP_USER)
 *   NOTIFY_EMAIL    — yönetici bildirim hedefi (iletişim mesajları)
 *   EMAIL_NOTIFY_CONTACT  — "0" ise iletişim bildirimi kapalı (varsayılan açık)
 *   EMAIL_NOTIFY_MESSAGES — "0" ise görev mesajı bildirimi kapalı (varsayılan açık)
 *
 * Yapılandırma yoksa sistem sessizce atlar (graceful no-op) — asla hata fırlatmaz.
 */

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

let cachedTransporter: Transporter | null = null;
let cachedConfigKey = "";

function smtpConfig() {
  return {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    secure: process.env.SMTP_SECURE === "1" || process.env.SMTP_SECURE === "true",
    from: process.env.EMAIL_FROM || process.env.SMTP_USER || "",
    notifyEmail: process.env.NOTIFY_EMAIL || "",
    notifyContact: process.env.EMAIL_NOTIFY_CONTACT !== "0",
    notifyMessages: process.env.EMAIL_NOTIFY_MESSAGES !== "0",
  };
}

export function isEmailConfigured(): boolean {
  const cfg = smtpConfig();
  return Boolean(cfg.host && cfg.user && cfg.pass);
}

function getTransporter(): Transporter | null {
  if (!isEmailConfigured()) return null;
  const cfg = smtpConfig();
  const key = `${cfg.host}|${cfg.port}|${cfg.user}|${cfg.secure}`;
  if (cachedTransporter && cachedConfigKey === key) return cachedTransporter;

  cachedTransporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
    connectionTimeout: 8_000,
    greetingTimeout: 8_000,
    socketTimeout: 12_000,
  });
  cachedConfigKey = key;
  return cachedTransporter;
}

/** Asla hata fırlatmaz; {sent:false, error} döner. */
export async function sendMailSafe(opts: MailOptions): Promise<{ sent: boolean; error?: string }> {
  try {
    const transporter = getTransporter();
    if (!transporter) return { sent: false, error: "smtp_not_configured" };
    const cfg = smtpConfig();
    if (!cfg.from) return { sent: false, error: "from_missing" };

    if (process.env.SMTP_JSON === "1") {
      // Test modu: gerçek SMTP yerine mesajı JSON olarak loglar
      console.log("[email:json]", JSON.stringify({ to: opts.to, subject: opts.subject, from: cfg.from }));
      return { sent: true };
    }

    const info = await transporter.sendMail({
      from: `"Benim İçin Yap" <${cfg.from}>`,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
      replyTo: opts.replyTo,
    });
    console.log("[email] gönderildi:", opts.to, "—", opts.subject, info.messageId);
    return { sent: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn("[email] gönderilemedi:", msg);
    return { sent: false, error: msg };
  }
}

function wrapLayout(title: string, innerHtml: string): string {
  return `<!DOCTYPE html>
<html lang="tr"><body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:24px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:linear-gradient(135deg,#2563eb,#4338ca);padding:20px 24px;">
      <span style="color:#ffffff;font-size:18px;font-weight:bold;">Benim İçin Yap</span>
      <span style="color:#c7d2fe;font-size:12px;margin-left:8px;">Güvenli Görev Devri Platformu</span>
    </div>
    <div style="padding:24px;color:#1e293b;font-size:14px;line-height:1.6;">
      <h2 style="margin:0 0 16px;font-size:16px;color:#0f172a;">${title}</h2>
      ${innerHtml}
    </div>
    <div style="background:#f8fafc;padding:14px 24px;color:#94a3b8;font-size:11px;border-top:1px solid #e2e8f0;">
      Bu e-posta Benim İçin Yap platformu tarafından otomatik gönderilmiştir.
    </div>
  </div>
</body></html>`;
}

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Yeni iletişim mesajı → yöneticiye (NOTIFY_EMAIL) */
export async function notifyAdminNewContactMessage(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<{ sent: boolean; error?: string; skipped?: string }> {
  const cfg = smtpConfig();
  if (!cfg.notifyEmail) return { sent: false, skipped: "notify_email_missing" };
  if (!cfg.notifyContact) return { sent: false, skipped: "disabled" };

  const title = "Yeni İletişim Mesajı";
  const inner = `
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:6px 0;color:#64748b;width:110px;">Gönderen:</td><td style="padding:6px 0;font-weight:bold;">${esc(data.name)}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">E-posta:</td><td style="padding:6px 0;">${esc(data.email)}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">Konu:</td><td style="padding:6px 0;">${esc(data.subject || "-")}</td></tr>
    </table>
    <div style="margin-top:14px;padding:14px;background:#f8fafc;border-left:3px solid #2563eb;border-radius:6px;">
      ${esc(data.message).replace(/\n/g, "<br/>")}
    </div>
    <p style="margin-top:16px;font-size:12px;color:#64748b;">Yönetim panelindeki <b>İletişim Kutusu</b> sekmesinden yanıtlayabilirsiniz.</p>`;
  return sendMailSafe({
    to: cfg.notifyEmail,
    subject: `[Benim İçin Yap] Yeni mesaj: ${data.subject || data.name}`,
    html: wrapLayout(title, inner),
    text: `Yeni iletişim mesajı\nGönderen: ${data.name} <${data.email}>\nKonu: ${data.subject || "-"}\n\n${data.message}`,
    replyTo: data.email,
  });
}

/** Yeni görev mesajı → alıcı kullanıcının e-postasına */
export async function notifyNewTaskMessage(data: {
  receiverEmail: string;
  receiverName: string;
  senderName: string;
  taskTitle: string;
  content: string;
}): Promise<{ sent: boolean; error?: string; skipped?: string }> {
  const cfg = smtpConfig();
  if (!cfg.notifyMessages) return { sent: false, skipped: "disabled" };
  if (!data.receiverEmail) return { sent: false, skipped: "receiver_email_missing" };

  const title = "Yeni Mesajınız Var";
  const inner = `
    <p>Merhaba <b>${esc(data.receiverName || "kullanıcı")}</b>,</p>
    <p><b>${esc(data.senderName)}</b>, <b>"${esc(data.taskTitle)}"</b> görevi hakkında size bir mesaj gönderdi:</p>
    <div style="margin-top:14px;padding:14px;background:#f8fafc;border-left:3px solid #4338ca;border-radius:6px;">
      ${esc(data.content).replace(/\n/g, "<br/>")}
    </div>
    <p style="margin-top:16px;font-size:12px;color:#64748b;">Görev detay sayfasındaki mesaj panosundan yanıt verebilirsiniz.</p>`;
  return sendMailSafe({
    to: data.receiverEmail,
    subject: `[Benim İçin Yap] ${data.senderName} size mesaj gönderdi — "${data.taskTitle}"`,
    html: wrapLayout(title, inner),
    text: `${data.senderName}, "${data.taskTitle}" görevi hakkında size mesaj gönderdi:\n\n${data.content}`,
  });
}
