import {
  buildBackOfficeLink,
  escapeHtml,
  row,
  sendAdminNotification,
  type AdminNotificationResult,
} from './admin-notification';

interface SendNewUserAdminEmailParams {
  fullName: string | null;
  email: string | null;
  phoneNumber: string | null;
  authProvider: string | null;
  registeredAt: Date;
}

const PROVIDER_LABELS: Record<string, string> = {
  google: 'Google',
  phone: 'Phone (SMS)',
};

/** Notifies the team when someone finishes registering. */
export async function sendNewUserAdminEmail({
  fullName,
  email,
  phoneNumber,
  authProvider,
  registeredAt,
}: SendNewUserAdminEmailParams): Promise<AdminNotificationResult> {
  const displayName = fullName?.trim() || email || phoneNumber || 'Unknown user';
  const providerLabel = authProvider
    ? (PROVIDER_LABELS[authProvider] ?? authProvider)
    : null;

  return sendAdminNotification({
    subject: `New user registered: ${displayName}`,
    heading: 'New user registered',
    introHtml: `<strong>${escapeHtml(displayName)}</strong> just finished signing up for Kulu-lu.`,
    rowsHtml: [
      row('Name', fullName),
      row('Email', email),
      row('Phone', phoneNumber),
      row('Signed in with', providerLabel),
      row('Registered', registeredAt.toISOString()),
    ].join(''),
    link: buildBackOfficeLink('/users'),
    linkLabel: 'Open back office',
  });
}
