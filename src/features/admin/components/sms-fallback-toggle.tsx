'use client';

import { useOptimistic, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquareOff } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { setEventSmsFallbackAdmin } from '../actions/event-controls';

/**
 * The SMS Fallback Opt-out (CONTEXT.md) for one Event: on means WhatsApp only,
 * set at the Owner's request. While it holds, every Schedule's SMS button stays
 * visible and says why it cannot send.
 *
 * Drawn like the test-accounts capsule rather than ui/toggle-switch, whose knob
 * does not paint in the Back Office shell. Optimistic for the same reason: the
 * action revalidates the Owner app and the Back Office both.
 */
export function SmsFallbackToggle({ eventId, smsFallbackEnabled }: { eventId: string; smsFallbackEnabled: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [whatsAppOnly, setWhatsAppOnly] = useOptimistic(!smsFallbackEnabled);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={whatsAppOnly}
      aria-label="וואטסאפ בלבד - בלי SMS"
      disabled={isPending}
      title={
        whatsAppOnly
          ? 'בעלי האירוע ביקשו שלא יישלח SMS לאורחים. וואטסאפ שלא הגיע מטופל ידנית'
          : 'אורחים שהוואטסאפ לא הגיע אליהם מקבלים SMS'
      }
      onClick={() =>
        startTransition(async () => {
          setWhatsAppOnly(!whatsAppOnly);
          const result = await setEventSmsFallbackAdmin(eventId, whatsAppOnly);
          if (!result.success) {
            toast.error(result.message);
            return;
          }
          toast.success(result.message);
          router.refresh();
        })
      }
      className={cn(
        'bg-card hover:bg-accent/50 focus-visible:ring-ring flex h-8 shrink-0 cursor-pointer items-center gap-2 rounded-full border ps-2.5 pe-1.5 transition-colors focus-visible:ring-2 focus-visible:outline-none',
        isPending && 'pointer-events-none opacity-60',
      )}
    >
      <MessageSquareOff className={cn('size-4', whatsAppOnly ? 'text-primary' : 'text-muted-foreground')} />
      <span className="text-[13px] font-medium">וואטסאפ בלבד - בלי SMS</span>
      <span
        className={cn(
          'relative block h-[18px] w-8 rounded-full transition-colors',
          whatsAppOnly ? 'bg-primary' : 'bg-muted-foreground/20',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 size-3.5 rounded-full bg-background shadow-sm transition-all',
            whatsAppOnly ? 'start-[16px]' : 'start-0.5',
          )}
        />
      </span>
    </button>
  );
}
