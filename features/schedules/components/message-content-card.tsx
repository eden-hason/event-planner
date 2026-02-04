'use client';

import { Info, Lock, MessageSquareText, Send } from 'lucide-react';

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

interface MessageContentCardProps {
  messageBody: string;
}

export function MessageContentCard({ messageBody }: MessageContentCardProps) {
  return (
    <Card className="col-span-2 row-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquareText className="h-4 w-4" />
          Message Content
        </CardTitle>
        <CardAction>
          <Badge variant="outline">SMS</Badge>
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
        <Button variant="outline" disabled>
          <Send className="h-4 w-4" />
          Send Test to Me
        </Button>
      </CardFooter>
    </Card>
  );
}
