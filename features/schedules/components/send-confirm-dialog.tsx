'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { IconSend } from '@tabler/icons-react';

import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

import { executeSchedule } from '../actions/execute-schedule';
import { type ScheduleApp } from '../schemas';
import { getAudienceLabel } from '../utils';

interface SendConfirmDialogProps {
  scheduleId: string;
  guestCount: number;
  targetStatus: ScheduleApp['targetStatus'];
  triggerClassName?: string;
  triggerSize?: 'sm' | 'default';
}

export function SendConfirmDialog({
  scheduleId,
  guestCount,
  targetStatus,
  triggerClassName,
  triggerSize = 'default',
}: SendConfirmDialogProps) {
  const [isSending, startSendTransition] = useTransition();

  const handleSendNow = () => {
    startSendTransition(async () => {
      const promise = executeSchedule(scheduleId).then((result) => {
        if (!result.success) throw new Error(result.message);
        return result;
      });

      toast.promise(promise, {
        loading: 'Sending messages...',
        success: (data) => data.message,
        error: (err) => (err instanceof Error ? err.message : 'Failed to send.'),
      });

      await promise.catch(() => {});
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size={triggerSize}
          disabled={isSending}
          className={cn('gap-2', triggerClassName)}
        >
          <IconSend size={triggerSize === 'sm' ? 14 : 16} />
          {isSending ? 'Sending...' : 'Send Now'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <IconSend size={18} />
            Send Messages Now?
          </AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogDescription>
          Messages will be sent immediately via WhatsApp. This action cannot be undone.
        </AlertDialogDescription>
        <div className="rounded-lg border bg-muted/40 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Who will receive this?</span>
            <span className="bg-background rounded-md border px-2 py-0.5 text-xs font-medium">
              {getAudienceLabel(targetStatus)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Recipients</span>
            <span className="bg-background rounded-md border px-2 py-0.5 text-xs font-medium tabular-nums">
              {guestCount} guests
            </span>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSendNow}>Send Now →</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
