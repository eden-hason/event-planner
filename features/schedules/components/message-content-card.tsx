'use client';

import { Info, Lock, Send } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

import { sendWhatsAppTestMessage } from '../actions';
import type { DeliveryMethod, WhatsAppTemplateApp } from '../schemas';

const DELIVERY_METHOD_LABELS: Record<DeliveryMethod, string> = {
  whatsapp: 'WhatsApp',
  sms: 'SMS',
};

interface MessageContentCardProps {
  template: WhatsAppTemplateApp | null;
  deliveryMethod?: DeliveryMethod;
}

export function MessageContentCard({ template, deliveryMethod }: MessageContentCardProps) {
  const messageBody = template?.bodyText ?? 'No message content configured yet.';

  const handleSendTest = () => {
    const timestamp = new Date().toLocaleString();
    const testMessage = `Test from Event Planner - ${timestamp}`;

    const promise = sendWhatsAppTestMessage(testMessage).then((result) => {
      if (!result.success) throw new Error(result.message);
      return result;
    });

    toast.promise(promise, {
      loading: 'Sending test message...',
      success: (data) => data.message,
      error: (err) =>
        err instanceof Error ? err.message : 'Failed to send.',
    });
  };

  return (
    <Card className="col-span-2 row-span-2">
      <CardHeader>
        <CardTitle>Message Content</CardTitle>
        <CardAction>
          <Badge variant="outline">{deliveryMethod ? DELIVERY_METHOD_LABELS[deliveryMethod] : 'N/A'}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="bg-muted/50 relative rounded-lg border p-4">
          <Lock className="text-muted-foreground absolute top-3 right-3 h-4 w-4" />
          <p className="text-muted-foreground pr-6 text-sm whitespace-pre-wrap">
            {messageBody}
          </p>
        </div>
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Info className="h-4 w-4" />
          <span>Template is locked for this event stage.</span>
        </div>
        <Separator />
      </CardContent>
      <CardFooter>
        <Button variant="outline" onClick={handleSendTest}>
          <Send className="h-4 w-4" />
          Send Test to Me
        </Button>
      </CardFooter>
    </Card>
  );
}
