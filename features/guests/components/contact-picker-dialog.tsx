'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { IconCheck, IconX } from '@tabler/icons-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { importGuests } from '@/features/guests/actions/guests';
import { ImportGuestSchema } from '@/features/guests/schemas';

export interface ContactInfo {
  name?: string[];
  tel?: string[];
}

interface ProcessedContact {
  name: string;
  phone: string | null;
  valid: boolean;
  skipReason?: 'noPhone' | 'invalidPhone' | 'duplicatePhone' | 'noName';
}

interface ContactPickerDialogProps {
  rawContacts: ContactInfo[];
  eventId: string;
  existingPhones: Set<string>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function processContacts(
  rawContacts: ContactInfo[],
  existingPhones: Set<string>,
): ProcessedContact[] {
  const seenPhones = new Set<string>();

  return rawContacts.map((contact) => {
    const name = contact.name?.[0]?.trim() || '';
    const phones = contact.tel ?? [];

    if (phones.length === 0) {
      return { name, phone: null, valid: false, skipReason: 'noPhone' as const };
    }

    for (const rawPhone of phones) {
      const result = ImportGuestSchema.safeParse({ name: name || 'x', phone: rawPhone, amount: 1 });
      if (result.success) {
        const normalized = rawPhone.trim();
        if (name.length < 2) {
          return { name, phone: normalized, valid: false, skipReason: 'noName' as const };
        }
        if (existingPhones.has(normalized) || seenPhones.has(normalized)) {
          return { name, phone: normalized, valid: false, skipReason: 'duplicatePhone' as const };
        }
        seenPhones.add(normalized);
        return { name, phone: normalized, valid: true };
      }
    }

    return { name, phone: phones[0].trim(), valid: false, skipReason: 'invalidPhone' as const };
  });
}

export function ContactPickerDialog({
  rawContacts,
  eventId,
  existingPhones,
  open,
  onOpenChange,
}: ContactPickerDialogProps) {
  const t = useTranslations('guests.contactPicker');
  const [isImporting, setIsImporting] = useState(false);

  const processed = useMemo(
    () => processContacts(rawContacts, existingPhones),
    [rawContacts, existingPhones],
  );

  const valid = processed.filter((c) => c.valid);
  const skipped = processed.filter((c) => !c.valid);

  const handleImport = async () => {
    setIsImporting(true);
    const guests = valid.map((c) => ({
      name: c.name,
      phone: c.phone!,
      amount: 1,
    }));

    const promise = importGuests(eventId, guests).then((result) => {
      if (!result.success) throw new Error(result.message);
      return result;
    });

    toast.promise(promise, {
      loading: t('importing'),
      success: (data) => data.message || t('importSuccess', { count: valid.length }),
      error: (err) => (err instanceof Error ? err.message : t('importError')),
    });

    try {
      await promise;
      onOpenChange(false);
    } catch {
      // error shown by toast
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('dialogTitle')}</DialogTitle>
          <DialogDescription>{t('dialogDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-1 text-sm">
          {valid.length > 0 && (
            <p className="text-muted-foreground">{t('willImport', { count: valid.length })}</p>
          )}
          {skipped.length > 0 && (
            <p className="text-muted-foreground">{t('willSkip', { count: skipped.length })}</p>
          )}
        </div>

        <div className="max-h-72 overflow-y-auto">
          <ul className="space-y-2 pr-1">
            {processed.map((contact, i) => (
              <li key={i} className="flex items-center gap-3">
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full ${
                    contact.valid ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'
                  }`}
                >
                  {contact.valid ? <IconCheck size={12} /> : <IconX size={12} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-medium ${!contact.valid ? 'text-muted-foreground' : ''}`}>
                    {contact.name || <span className="italic">{t('unnamed')}</span>}
                  </p>
                  {contact.phone && (
                    <p className="truncate text-xs text-muted-foreground">{contact.phone}</p>
                  )}
                </div>
                {!contact.valid && contact.skipReason && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {t(contact.skipReason)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={handleImport} disabled={valid.length === 0 || isImporting}>
            {t('import', { count: valid.length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
