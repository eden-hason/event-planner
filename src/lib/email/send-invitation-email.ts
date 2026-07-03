import { resend } from '@/lib/resend';
import { ROLE_LABELS, type CollaboratorRole } from '@/features/collaborate/schemas';

interface SendInvitationEmailParams {
  to: string;
  inviterName: string;
  eventTitle: string;
  role: CollaboratorRole;
  invitationLink: string;
}

export async function sendInvitationEmail({
  to,
  inviterName,
  eventTitle,
  role,
  invitationLink,
}: SendInvitationEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const roleLabel = ROLE_LABELS[role];

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
                You've been invited to collaborate
              </h1>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#3f3f46;">
                <strong>${inviterName}</strong> has invited you to join
                <strong>${eventTitle}</strong> as a <strong>${roleLabel}</strong>.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:0 0 24px;">
                    <a href="${invitationLink}"
                       style="display:inline-block;padding:12px 32px;background-color:#18181b;color:#ffffff;font-size:14px;font-weight:500;text-decoration:none;border-radius:6px;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:12px;color:#71717a;">
                This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.
              </p>
              <p style="margin:0;font-size:12px;color:#a1a1aa;">
                If the button above doesn't work, copy and paste this link into your browser:<br />
                <a href="${invitationLink}" style="color:#71717a;word-break:break-all;">${invitationLink}</a>
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
      subject: `${inviterName} invited you to collaborate on "${eventTitle}"`,
      html,
    });

    if (error) {
      console.error('Resend email error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Failed to send invitation email:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
