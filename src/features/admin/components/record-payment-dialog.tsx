'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  PAYMENT_KIND_LABELS,
  PAYMENT_METHOD_LABELS,
  PRICING_CHANNELS,
  RECORD_PACKAGE_CHANNEL_LABELS,
  RECORD_PACKAGE_RATES,
  onSale,
  paymentKindBlocker,
  recordEventPayment,
  recordPackage,
  topUpTotal,
  type BillingPaymentKind,
  type BillingPaymentMethod,
  type EventBillingStatus,
  type PricingChannel,
  type RecordPackage,
  type RecordPackageChannel,
} from '@/features/billing';

const METHODS = Object.keys(PAYMENT_METHOD_LABELS) as BillingPaymentMethod[];
const KINDS = Object.keys(PAYMENT_KIND_LABELS) as BillingPaymentKind[];

/** What each kind does, under its label. A new kind is a hint here and its fields below. */
const KIND_HINTS: Record<BillingPaymentKind, string> = {
  plan: 'פותחת את חבילת הרשומות ומפעילה את השליחה',
  top_up: 'עוד רשומות לחבילה, באותה תוכנית ובלי בונוס',
  extra_schedule: 'מעבר למה שכלול בתוכנית. את התזמון יוצרים ידנית',
};

/** Whole positive numbers only; anything else is NaN, so the form and the schema both refuse it. */
function count(value: string): number {
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) && n > 0 ? n : Number.NaN;
}

/**
 * Records a payment taken outside the system (ADR 0021, ADR 0027, ADR 0045). The Operator
 * first says what was bought - the Plan that opens the Record Package, or an upsale on it -
 * then how it was paid. Every payment moves the Event to `paid`, so this is also how a free
 * Event is given: a gift, at ₪0.
 */
export function RecordPaymentDialog({
  eventId,
  current,
  channel: packageChannel,
  billingStatus,
  extraSchedules,
}: {
  eventId: string;
  /** The package before this payment, for the live preview; null until a Plan is recorded. */
  current: RecordPackage | null;
  /** The package's Plan; null until a Plan is recorded. */
  channel: RecordPackageChannel | null;
  billingStatus: EventBillingStatus;
  /** Extra Schedules already bought. */
  extraSchedules: number;
}) {
  const router = useRouter();
  const hasPlan = current !== null;
  const firstOpenKind = KINDS.find((kind) => !paymentKindBlocker(kind, hasPlan))!;

  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<BillingPaymentKind>(firstOpenKind);
  const [records, setRecords] = useState('');
  const [schedules, setSchedules] = useState('1');
  // A Top-up stays on the package's Plan; one on SMS, no longer sold, may move to one that is.
  const lockedChannel = kind === 'top_up' ? onSale(packageChannel) : null;
  const [picked, setPicked] = useState<PricingChannel>(onSale(packageChannel) ?? 'whatsapp');
  const channel = lockedChannel ?? picked;
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<BillingPaymentMethod>('bank_transfer');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [pending, startTransition] = useTransition();

  const addsRecords = kind !== 'extra_schedule';
  const recordCount = count(records);
  const scheduleCount = count(schedules);
  const isGift = method === 'gift';
  const amountValue = isGift ? 0 : amount.trim() === '' ? Number.NaN : Number(amount);
  const listPrice = addsRecords && !Number.isNaN(recordCount) ? topUpTotal(recordCount, channel) : null;
  const complete =
    (addsRecords ? !Number.isNaN(recordCount) : !Number.isNaN(scheduleCount)) &&
    !Number.isNaN(amountValue);

  function reset() {
    setKind(firstOpenKind);
    setRecords('');
    setSchedules('1');
    setPicked(onSale(packageChannel) ?? 'whatsapp');
    setAmount('');
    setMethod('bank_transfer');
    setReference('');
    setNote('');
  }

  function submit() {
    const payment = {
      eventId,
      amount: amountValue,
      method,
      reference: reference.trim() || undefined,
      note: note.trim() || undefined,
    };
    startTransition(async () => {
      const result = await recordEventPayment(
        kind === 'extra_schedule'
          ? { ...payment, kind, schedules: scheduleCount }
          : { ...payment, kind, records: recordCount, channel },
      );
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      // The form resets when it opens next, against the refreshed package.
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        if (next) reset();
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" size="sm" className="shrink-0 text-[13px]">
          <Plus className="size-3.5" />
          רישום תשלום
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>רישום תשלום</DialogTitle>
          <DialogDescription>
            מה נרכש ואיך שולם. אירוע בחינם נרשם כמתנה של ₪0
          </DialogDescription>
        </DialogHeader>

        <section className="space-y-3">
          <h3 className="text-[13px] font-semibold">מה נרכש</h3>
          <RadioGroup
            value={kind}
            onValueChange={(v) => setKind(v as BillingPaymentKind)}
            className="grid gap-2 sm:grid-cols-3"
            aria-label="מה נרכש"
          >
            {KINDS.map((option) => {
              const blocker = paymentKindBlocker(option, hasPlan);
              return (
                <Label
                  key={option}
                  htmlFor={`payment-kind-${option}`}
                  className={cn(
                    'flex cursor-pointer flex-col items-start gap-1 rounded-lg border p-3 font-normal transition-colors',
                    kind === option && 'border-primary bg-primary/5',
                    blocker && 'cursor-not-allowed opacity-50',
                  )}
                >
                  <span className="flex items-center gap-2 text-[13.5px] font-medium">
                    <RadioGroupItem id={`payment-kind-${option}`} value={option} disabled={blocker !== null} />
                    {PAYMENT_KIND_LABELS[option]}
                  </span>
                  <span className="text-muted-foreground text-[12px] leading-snug">{blocker ?? KIND_HINTS[option]}</span>
                </Label>
              );
            })}
          </RadioGroup>

          <div className="grid gap-4 sm:grid-cols-2">
            {addsRecords ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="payment-records">רשומות</Label>
                  <Input
                    id="payment-records"
                    inputMode="numeric"
                    value={records}
                    onChange={(e) => setRecords(e.target.value.replace(/\D/g, ''))}
                    placeholder={kind === 'plan' ? '200' : '50'}
                    className="tabular-nums"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-channel">תוכנית</Label>
                  <Select
                    value={channel}
                    onValueChange={(v) => setPicked(v as PricingChannel)}
                    disabled={lockedChannel !== null}
                  >
                    <SelectTrigger id="payment-channel" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRICING_CHANNELS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {RECORD_PACKAGE_CHANNEL_LABELS[c]} · ₪{RECORD_PACKAGE_RATES[c]} לרשומה
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {lockedChannel && (
                    <p className="text-muted-foreground text-[12px]">תוספת נרשמת בתוכנית של החבילה</p>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="payment-schedules">תזמונים</Label>
                <Input
                  id="payment-schedules"
                  inputMode="numeric"
                  value={schedules}
                  onChange={(e) => setSchedules(e.target.value.replace(/\D/g, ''))}
                  className="tabular-nums"
                />
              </div>
            )}
          </div>
        </section>

        <section className="space-y-3 border-t pt-4">
          <h3 className="text-[13px] font-semibold">תשלום</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="payment-method">אמצעי תשלום</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as BillingPaymentMethod)}>
                <SelectTrigger id="payment-method" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {PAYMENT_METHOD_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-amount">סכום (₪)</Label>
              <Input
                id="payment-amount"
                inputMode="decimal"
                value={isGift ? '0' : amount}
                disabled={isGift}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                placeholder={listPrice !== null ? String(listPrice) : undefined}
                className="tabular-nums"
              />
              {!isGift && listPrice !== null && (
                <p className="text-muted-foreground text-[12px] tabular-nums">
                  מחיר מחירון ₪{listPrice.toLocaleString('he-IL')}
                </p>
              )}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="payment-reference">אסמכתה (לא חובה)</Label>
              <Input
                id="payment-reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="מספר אישור העברה או ביט"
                maxLength={100}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="payment-note">הערה (לא חובה)</Label>
              <Textarea
                id="payment-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="מי אישר ומה סוכם"
                maxLength={500}
                rows={2}
              />
            </div>
          </div>
        </section>

        <div className="bg-muted text-muted-foreground space-y-1 rounded-md px-3 py-2 text-[13px] tabular-nums">
          <p>
            <Outcome
              kind={kind}
              current={current}
              records={recordCount}
              schedules={scheduleCount}
              extraSchedules={extraSchedules}
            />
          </p>
          {hasPlan && billingStatus !== 'paid' && (
            <p className="text-foreground">התשלום יחזיר את האירוע למצב שולם ויפעיל את השליחה</p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            ביטול
          </Button>
          <Button type="button" onClick={submit} disabled={pending || !complete}>
            {pending ? 'שומרים' : isGift ? 'רישום מתנה' : 'רישום תשלום'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** What the Event has once this payment is recorded. */
function Outcome({
  kind,
  current,
  records,
  schedules,
  extraSchedules,
}: {
  kind: BillingPaymentKind;
  current: RecordPackage | null;
  records: number;
  schedules: number;
  extraSchedules: number;
}) {
  if (kind === 'extra_schedule') {
    if (Number.isNaN(schedules)) return 'צריך להזין כמה תזמונים נרכשו';
    const total = extraSchedules + schedules;
    return (
      <>
        תזמונים נוספים לאירוע אחרי התשלום:{' '}
        <span className="text-foreground font-medium">{total.toLocaleString('he-IL')}</span>
        . את התזמון יוצרים ידנית בציר התקשורת
      </>
    );
  }

  if (Number.isNaN(records)) return 'צריך להזין רשומות כדי לראות את החבילה אחרי התשלום';
  // The bonus is settled by the opening payment, so a Top-up only adds its records.
  const after = current
    ? { ...current, paid: current.paid + records, size: current.size + records }
    : recordPackage({ payments: [records], bonusOverride: null })!;
  return (
    <>
      החבילה אחרי התשלום:{' '}
      <span className="text-foreground font-medium">
        {after.paid.toLocaleString('he-IL')} + {after.bonus} בונוס = {after.size.toLocaleString('he-IL')}
      </span>
      {after.bonusIsCustom && ' (בונוס מותאם)'}
    </>
  );
}
