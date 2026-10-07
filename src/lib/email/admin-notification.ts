import { resend } from '@/lib/resend';

/**
 * The shared shape of the emails that tell the team something happened - a
 * registration, a Visitor's first event. Each notification builds its rows and
 * hands them here.
 */

/**
 * Recipients come from ADMIN_NOTIFICATION_EMAILS (comma-separated). With the
 * variable unset there is nobody to tell, so the send is skipped rather than
 * treated as a failure - local and preview environments run without it.
 */
function getRecipients(): string[] {
  return (process.env.ADMIN_NOTIFICATION_EMAILS ?? '')
    .split(',')
    .map((address) => address.trim())
    .filter(Boolean);
}

/**
 * Link into the back office. In production the back office lives on the admin
 * subdomain, where the proxy rewrites `/users` to `/admin/users`; locally there
 * is no subdomain and the `/admin` path is used directly.
 */
export function buildBackOfficeLink(path: string): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    'http://localhost:3000';
  const origin = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;

  try {
    const url = new URL(origin);
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      return `${url.origin}/admin${path}`;
    }
    const bareHost = url.hostname.replace(/^www\./, '');
    return `https://admin.${bareHost}${path}`;
  } catch {
    return `${origin}/admin${path}`;
  }
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function row(label: string, value: string | null): string {
  return `
    <tr>
      <td style="padding:6px 16px 6px 0;font-size:13px;color:#71717a;white-space:nowrap;vertical-align:top;">${label}</td>
      <td style="padding:6px 0;font-size:13px;color:#18181b;">${value ? escapeHtml(value) : '&mdash;'}</td>
    </tr>`;
}

interface AdminNotification {
  subject: string;
  heading: string;
  /** Already-escaped HTML for the line under the heading. */
  introHtml: string;
  /** Output of `row()`, joined. */
  rowsHtml: string;
  link: string;
  linkLabel: string;
}

export interface AdminNotificationResult {
  success: boolean;
  /** No recipients configured - nothing was attempted, and that is not a failure. */
  skipped?: boolean;
  error?: string;
}

export async function sendAdminNotification({
  subject,
  heading,
  introHtml,
  rowsHtml,
  link,
  linkLabel,
}: AdminNotification): Promise<AdminNotificationResult> {
  const to = getRecipients();

  if (to.length === 0) {
    return { success: false, skipped: true };
  }

  try {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#18181b;">
                ${escapeHtml(heading)}
              </h1>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#3f3f46;">
                ${introHtml}
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                ${rowsHtml}
              </table>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:0 0 8px;">
                    <a href="${link}"
                       style="display:inline-block;padding:12px 32px;background-color:#18181b;color:#ffffff;font-size:14px;font-weight:500;text-decoration:none;border-radius:6px;">
                      ${escapeHtml(linkLabel)}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:12px;color:#a1a1aa;text-align:center;">
                <a href="${link}" style="color:#71717a;word-break:break-all;">${link}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    const { error } = await resend.emails.send({
      from: 'Kulu-lu <noreply@kulu-lu.com>',
      to,
      subject,
      html,
    });

    if (error) {
      console.error(`Resend admin notification error (${subject}):`, error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error(`Failed to send admin notification (${subject}):`, err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
