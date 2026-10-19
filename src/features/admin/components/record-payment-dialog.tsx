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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PAYMENT_METHOD_LABELS,
  PRICING_CHANNELS,
  RECORD_PACKAGE_CHANNEL_LABELS,
  RECORD_PACKAGE_RATES,
  onSale,
  recordEventPayment,
  recordPackage,
  type BillingPaymentMethod,
  type PricingChannel,
  type RecordPackage,
  type RecordPackageChannel,
} from '@/features/billing';

const METHODS = Object.keys(PAYMENT_METHOD_LABELS) as BillingPaymentMethod[];

/**
 * Records a payment taken outside the system (ADR 0021, ADR 0027). Every payment adds to
 * Paid Records and moves the Event to `paid`, so this is also how a first package is entered
 * and how a free Event is given: a gift, at ₪0. Once a package is open, a payment is a Top-up
 * on its Plan, with no bonus of its own (ADR 0042).
 */
export function RecordPaymentDialog({
  eventId,
  current,
  defaultChannel,
}: {
  eventId: string;
  /** The package before this payment, for the live preview; null when none is open. */
  current: RecordPackage | null;
  defaultChannel: RecordPackageChannel | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [records, setRecords] = useState('');
  // A Top-up stays on the package's Plan; one on SMS, no longer sold, may move to one that is.
  const lockedChannel = current ? onSale(defaultChannel) : null;
  const [picked, setPicked] = useState<PricingChannel>(onSale(defaultChannel) ?? 'whatsapp');
  const channel = lockedChannel ?? picked;
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<BillingPaymentMethod>('bank_transfer');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [pending, startTransition] = useTransition();

  const recordCount = Number.parseInt(records, 10);
  const validRecords = Number.isInteger(recordCount) && recordCount > 0;
  const isGift = method === 'gift';
  const listPrice = validRecords ? recordCount * RECORD_PACKAGE_RATES[channel] : null;
  // The bonus is settled by the opening payment, so a Top-up only adds its records.
  const after = !validRecords
    ? null
    : current
      ? { ...current, paid: current.paid + recordCount, size: current.size + recordCount }
      : recordPackage({ payments: [recordCount], bonusOverride: null });

  function reset() {
    setRecords('');
    setAmount('');
    setMethod('bank_transfer');
    setReference('');
    setNote('');
  }

  function submit() {
    startTransition(async () => {
      const result = await recordEventPayment({
        eventId,
        records: validRecords ? recordCount : Number.NaN,
        channel,
        amount: isGift ? 0 : amount.trim() === '' ? Number.NaN : Number(amount),
        method,
        reference: reference.trim() || undefined,
        note: note.trim() || undefined,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" className="shrink-0 text-[13px]">
          <Plus className="size-3.5" />
          רישום תשלום
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>רישום תשלום</DialogTitle>
          <DialogDescription>
            מוסיף רשומות לחבילה של האירוע ומפעיל את השליחה. אירוע בחינם נרשם כמתנה של ₪0
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="payment-records">רשומות</Label>
            <Input
              id="payment-records"
              inputMode="numeric"
              value={records}
              onChange={(e) => setRecords(e.target.value.replace(/\D/g, ''))}
              placeholder="200"
              className="tabular-nums"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment-channel">ערוץ</Label>
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
                    {RECORD_PACKAGE_CHANNEL_LABELS[c]} · ₪{RECORD_PACKAGE_RATES[c]} per record
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {lockedChannel && (
              <p className="text-muted-foreground text-[12px]">תוספת נרשמת באותה חבילה, בלי בונוס</p>
            )}
          </div>
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
              placeholder={listPrice !== null ? String(listPrice) : '0'}
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

        <p className="bg-muted text-muted-foreground rounded-md px-3 py-2 text-[13px] tabular-nums">
          {after ? (
            <>
              החבילה אחרי התשלום:{' '}
              <span className="text-foreground font-medium">
                {after.paid.toLocaleString('he-IL')} + {after.bonus} בונוס ={' '}
                {after.size.toLocaleString('he-IL')}
              </span>
              {after.bonusIsCustom && ' (בונוס מותאם)'}
            </>
          ) : (
            'צריך להזין רשומות כדי לראות את החבילה אחרי התשלום'
          )}
        </p>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            ביטול
          </Button>
          <Button type="button" onClick={submit} disabled={pending || !validRecords}>
            {pending ? 'שומרים' : isGift ? 'רישום מתנה' : 'רישום תשלום'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
