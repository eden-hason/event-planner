import { getConfirmationDataByToken } from '@/features/confirmation/queries';
import { EventDetailsCard } from '@/features/confirmation/components/event-details-card';
import { ConfirmationForm } from '@/features/confirmation/components/confirmation-form';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

import { setRequestLocale } from 'next-intl/server';

export const dynamic = 'force-dynamic';

const TOKEN_REGEX = /^[a-f0-9]{64}$/;

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);

  // Validate token format
  if (!TOKEN_REGEX.test(token)) {
    return <InvalidTokenView />;
  }

  const data = await getConfirmationDataByToken(token);

  if (!data) {
    return <InvalidTokenView />;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-8">
        <EventDetailsCard event={data.event} />
        <ConfirmationForm token={token} data={data} />
      </div>
    </div>
  );
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
