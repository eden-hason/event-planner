import { Suspense } from 'react';
import {
  Band,
  BandFailure,
  BandRow,
  EventBandSkeleton,
  MESSAGE_PLAN_NAMES,
  NewEventMessagePlanControl,
} from '@/features/admin';
import { getMessagePlanSetting } from '@/features/admin/queries';
import { formatShortDate } from '@/features/admin/utils/format';

// A setting an Operator is about to change is read fresh, never cached.
export const dynamic = 'force-dynamic';

export default function ConfigurationPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <h1 className="text-lg font-semibold tracking-tight">הגדרות</h1>
        <p className="text-muted-foreground text-[13px]">הגדרות שחלות על כל Kululu</p>
      </div>

      <Suspense fallback={<EventBandSkeleton />}>
        <MessagePlanBand />
      </Suspense>
    </div>
  );
}

/** The "new Events start on" switch (ADR 0053), for Operators only. */
async function MessagePlanBand() {
  try {
    const setting = await getMessagePlanSetting();
    const plan = setting.newEventMessagePlan;
    return (
      <Band title="תוכנית ההודעות" action={<NewEventMessagePlanControl plan={plan} />}>
        <BandRow className="flex flex-col gap-1">
          <p className="text-muted-foreground text-[11.5px]">אירועים חדשים מתחילים על</p>
          <p className={plan === 'current' ? 'text-primary text-[15px] font-semibold' : 'text-[15px] font-semibold'}>
            {MESSAGE_PLAN_NAMES[plan]}
          </p>
          {setting.updatedAt && (
            <p className="text-muted-foreground text-[12px] tabular-nums">עודכן ב-{formatShortDate(setting.updatedAt)}</p>
          )}
        </BandRow>
        <BandRow>
          <p className="text-muted-foreground text-[12.5px]">
            חל רק על אירועים שייווצרו מעכשיו. אירוע קיים נשאר על התוכנית שלו, ואת אירוע שעוד לא שלח כלום אפשר להעביר לתוכנית החדשה מהעמוד שלו
          </p>
        </BandRow>
      </Band>
    );
  } catch (error) {
    console.error('Message plan setting failed:', error);
    return <BandFailure title="תוכנית ההודעות" />;
  }
}
