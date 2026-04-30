'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { IconCircleCheck } from '@tabler/icons-react';

interface ConfirmationSuccessProps {
  status: 'confirmed' | 'declined';
  guestName: string;
  guestCount?: number;
  onChangeResponse: () => void;
}

export function ConfirmationSuccess({
  status,
  guestName,
  guestCount,
  onChangeResponse,
}: ConfirmationSuccessProps) {
  const isConfirmed = status === 'confirmed';

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
        <IconCircleCheck
          size={64}
          className="text-primary"
        />

        <h2 className="text-2xl font-semibold">תודה!</h2>

        <p className="text-muted-foreground text-lg">
          {isConfirmed
            ? `${guestName}, אישרת הגעה${guestCount && guestCount > 1 ? ` ל-${guestCount} אורחים` : ''}`
            : `${guestName}, עדכנו שלא תגיע/י`}
        </p>

        <Button variant="outline" onClick={onChangeResponse} className="mt-2">
          שינוי תגובה
        </Button>
      </CardContent>
    </Card>
  );
}
