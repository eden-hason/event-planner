import { resend } from '@/lib/resend';

interface SendNewUserAdminEmailParams {
  fullName: string | null;
  email: string | null;
  phoneNumber: string | null;
  authProvider: string | null;
  registeredAt: Date;
}

/**
 * Notifies the team when someone finishes registering.
 *
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
 * Link to the back office user list. In production the back office lives on the
 * admin subdomain, where the proxy rewrites `/users` to `/admin/users`; locally
 * there is no subdomain and the path is used directly.
 */
function buildAdminUsersLink(): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    'http://localhost:3000';
  const origin = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;

  try {
    const url = new URL(origin);
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      return `${url.origin}/admin/users`;
    }
    const bareHost = url.hostname.replace(/^www\./, '');
    return `https://admin.${bareHost}/users`;
  } catch {
    return `${origin}/admin/users`;
  }
}

const PROVIDER_LABELS: Record<string, string> = {
  google: 'Google',
  phone: 'Phone (SMS)',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function row(label: string, value: string | null): string {
  return `
    <tr>
      <td style="padding:6px 16px 6px 0;font-size:13px;color:#71717a;white-space:nowrap;vertical-align:top;">${label}</td>
      <td style="padding:6px 0;font-size:13px;color:#18181b;">${value ? escapeHtml(value) : '&mdash;'}</td>
    </tr>`;
}

interface SendNewUserAdminEmailResult {
  success: boolean;
  /** No recipients configured - nothing was attempted, and that is not a failure. */
  skipped?: boolean;
  error?: string;
}

export async function sendNewUserAdminEmail({
  fullName,
  email,
  phoneNumber,
  authProvider,
  registeredAt,
}: SendNewUserAdminEmailParams): Promise<SendNewUserAdminEmailResult> {
  const to = getRecipients();

  if (to.length === 0) {
    return { success: false, skipped: true };
  }

  try {
    const adminUsersLink = buildAdminUsersLink();
    const displayName = fullName?.trim() || email || phoneNumber || 'Unknown user';
    const providerLabel = authProvider
      ? (PROVIDER_LABELS[authProvider] ?? authProvider)
      : null;

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
                New user registered
              </h1>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#3f3f46;">
                <strong>${escapeHtml(displayName)}</strong> just finished signing up for Kulu-lu.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                ${row('Name', fullName)}
                ${row('Email', email)}
                ${row('Phone', phoneNumber)}
                ${row('Signed in with', providerLabel)}
                ${row('Registered', registeredAt.toISOString())}
              </table>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:0 0 8px;">
                    <a href="${adminUsersLink}"
                       style="display:inline-block;padding:12px 32px;background-color:#18181b;color:#ffffff;font-size:14px;font-weight:500;text-decoration:none;border-radius:6px;">
                      Open back office
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:12px;color:#a1a1aa;text-align:center;">
                <a href="${adminUsersLink}" style="color:#71717a;word-break:break-all;">${adminUsersLink}</a>
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
      subject: `New user registered: ${displayName}`,
      html,
    });

    if (error) {
      console.error('Resend new-user admin email error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Failed to send new-user admin email:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
