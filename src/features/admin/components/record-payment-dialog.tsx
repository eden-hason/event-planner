'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AdminDialogContent } from './admin-dialog';
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
  RECORD_PACKAGE_CHANNEL_LABELS,
  RECORD_PACKAGE_CHANNELS,
  RECORD_PACKAGE_RATES,
  recordEventPayment,
  recordPackage,
  type BillingPaymentMethod,
  type RecordPackageChannel,
} from '@/features/billing';

const METHODS = Object.keys(PAYMENT_METHOD_LABELS) as BillingPaymentMethod[];

/**
 * Records a payment taken outside the system (ADR 0021, ADR 0027). Every payment adds to
 * Paid Records and moves the Event to `paid`, so this is also how a first package is entered
 * and how a free Event is given: a gift, at ₪0.
 */
export function RecordPaymentDialog({
  eventId,
  paidRecords,
  bonusOverride,
  defaultChannel,
}: {
  eventId: string;
  /** Paid Records before this payment, for the live preview. */
  paidRecords: number;
  bonusOverride: number | null;
  defaultChannel: RecordPackageChannel | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [records, setRecords] = useState('');
  const [channel, setChannel] = useState<RecordPackageChannel>(defaultChannel ?? 'whatsapp');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<BillingPaymentMethod>('bank_transfer');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [pending, startTransition] = useTransition();

  const recordCount = Number.parseInt(records, 10);
  const validRecords = Number.isInteger(recordCount) && recordCount > 0;
  const isGift = method === 'gift';
  const listPrice = validRecords ? recordCount * RECORD_PACKAGE_RATES[channel] : null;
  const after = validRecords
    ? recordPackage({ payments: [paidRecords, recordCount], bonusOverride })
    : null;

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
          Record payment
        </Button>
      </DialogTrigger>
      <AdminDialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            Adds records to this event&apos;s package and turns sending on. A free event is a gift at ₪0
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="payment-records">Records</Label>
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
            <Label htmlFor="payment-channel">Channel</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v as RecordPackageChannel)}>
              <SelectTrigger id="payment-channel" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RECORD_PACKAGE_CHANNELS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {RECORD_PACKAGE_CHANNEL_LABELS[c]} · ₪{RECORD_PACKAGE_RATES[c]} per record
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment-method">Method</Label>
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
            <Label htmlFor="payment-amount">Amount (₪)</Label>
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
                List price ₪{listPrice.toLocaleString('en-GB')}
              </p>
            )}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="payment-reference">Reference (optional)</Label>
            <Input
              id="payment-reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Transfer or Bit confirmation number"
              maxLength={100}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="payment-note">Note (optional)</Label>
            <Textarea
              id="payment-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Who approved it, what was agreed"
              maxLength={500}
              rows={2}
            />
          </div>
        </div>

        <p className="bg-muted text-muted-foreground rounded-md px-3 py-2 text-[13px] tabular-nums">
          {after ? (
            <>
              Package after this payment:{' '}
              <span className="text-foreground font-medium">
                {after.paid.toLocaleString('en-GB')} + {after.bonus} bonus ={' '}
                {after.size.toLocaleString('en-GB')}
              </span>
              {after.bonusIsCustom && ' (custom bonus)'}
            </>
          ) : (
            'Enter the records to see the package after this payment'
          )}
        </p>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={pending || !validRecords}>
            {pending ? 'Saving' : isGift ? 'Record gift' : 'Record payment'}
          </Button>
        </DialogFooter>
      </AdminDialogContent>
    </Dialog>
  );
}
