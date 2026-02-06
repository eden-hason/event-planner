import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function ErrorMessage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Invalid Link</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          This confirmation link is invalid or has expired. Please check the
          link in your message and try again, or contact the event organizer for
          assistance.
        </p>
      </CardContent>
    </Card>
  );
}
