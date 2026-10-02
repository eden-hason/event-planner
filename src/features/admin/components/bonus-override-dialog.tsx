'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
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
import { setBonusOverride } from '@/features/billing';

/**
 * Overrides an Event's Bonus Records, or hands them back to the automatic rule. An override
 * survives later top-ups until it is reset here (ADR 0027).
 */
export function BonusOverrideDialog({
  eventId,
  bonus,
  isCustom,
  automaticBonus,
}: {
  eventId: string;
  bonus: number;
  isCustom: boolean;
  automaticBonus: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(String(bonus));
  const [pending, startTransition] = useTransition();

  const parsed = Number.parseInt(value, 10);
  const valid = Number.isInteger(parsed) && parsed >= 0;

  function save(next: number | null) {
    startTransition(async () => {
      const result = await setBonusOverride({ eventId, bonus: next });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        if (next) setValue(String(bonus));
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="link" size="sm" className="h-auto p-0 text-[12px]">
          Edit bonus
        </Button>
      </DialogTrigger>
      <AdminDialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Bonus records</DialogTitle>
          <DialogDescription>
            Automatic gives {automaticBonus} for this package. A custom bonus stays through later
            top-ups until it is reset
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="bonus-override">Bonus records</Label>
          <Input
            id="bonus-override"
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
            className="tabular-nums"
          />
        </div>
        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => save(null)}
            disabled={pending || !isCustom}
          >
            Reset to automatic ({automaticBonus})
          </Button>
          <Button type="button" onClick={() => save(parsed)} disabled={pending || !valid}>
            {pending ? 'Saving' : 'Save'}
          </Button>
        </DialogFooter>
      </AdminDialogContent>
    </Dialog>
  );
}
