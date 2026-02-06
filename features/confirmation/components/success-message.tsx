import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type SuccessMessageProps = {
  status: 'confirmed' | 'declined';
  guestCount?: number;
  eventTitle: string;
  onUpdate: () => void;
};

export function SuccessMessage({
  status,
  guestCount,
  eventTitle,
  onUpdate,
}: SuccessMessageProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">
          {status === 'confirmed' ? 'You\'re confirmed!' : 'Response recorded'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {status === 'confirmed' ? (
          <>
            <p className="text-sm">
              Thank you for confirming your attendance at{' '}
              <span className="font-medium">{eventTitle}</span>.
            </p>
            {guestCount && guestCount > 1 && (
              <p className="text-muted-foreground text-sm">
                Attending: {guestCount} {guestCount === 1 ? 'guest' : 'guests'}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm">
            We&apos;re sorry you can&apos;t make it to{' '}
            <span className="font-medium">{eventTitle}</span>. Your response has
            been recorded.
          </p>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm" onClick={onUpdate}>
          Update my response
        </Button>
      </CardFooter>
    </Card>
  );
}
