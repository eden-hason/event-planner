import {
  getConfirmationDataByToken,
  getConfirmationDataByGuestToken,
  getConfirmationPreviewData,
  isGuestInvitationToken,
} from '@/features/confirmation/queries';
import { ConfirmationExperience } from '@/features/confirmation';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

import { setRequestLocale } from 'next-intl/server';

// Accepts the current 12-char base62 token as well as the earlier 32- and
// 64-hex-char formats, so links already issued keep working.
const TOKEN_REGEX = /^[A-Za-z0-9]{12,64}$/;

/**
 * Renders the guest-facing RSVP page for a confirmation token.
 *
 * Server-only: pulls the service-role queries directly, so this is imported by
 * the route files rather than re-exported through the feature barrel.
 *
 * Shared by both /c/[token] (current, short) and /confirm/[token] (the
 * original path, kept alive for links already sent out).
 */
export async function ConfirmationPage({
  locale,
  token,
}: {
  locale: string;
  token: string;
}) {
  setRequestLocale(locale);

  const data = isGuestInvitationToken(token)
    ? await getConfirmationDataByGuestToken(token)
    : TOKEN_REGEX.test(token)
      ? await getConfirmationDataByToken(token)
      : null;

  if (data) {
    return <ConfirmationExperience token={token} data={data} />;
  }

  // An event preview token shares the uuid shape of a Guest's invitation token.
  // The WhatsApp button on a Test Message can only append a token to the /c/
  // base registered with Meta, so previews must resolve here too.
  const preview = await getConfirmationPreviewData(token);
  if (preview) {
    return <ConfirmationExperience token={token} data={preview} preview />;
  }

  return <InvalidTokenView />;
}

function InvalidTokenView() {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto flex max-w-md flex-col items-center gap-6 px-4 py-16">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <AlertCircle className="text-destructive size-16" />
            <h2 className="text-xl font-semibold">הקישור אינו תקין</h2>
            <p className="text-muted-foreground">
              הקישור שלך אינו תקין או שפג תוקפו. אנא פנה/י למארגני האירוע.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
