'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { IconX } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { WhatsAppGroup, WhatsAppPerson } from '@/features/guests/types';
import {
  pickedPeople,
  setNamePick,
  setPeoplePick,
  whatsAppDisplayName,
  type WhatsAppPick,
} from '@/features/guests/utils/whatsapp-import';
import { cn } from '@/lib/utils';

interface WhatsAppNameStepProps {
  people: Map<string, WhatsAppPerson>;
  groupsByPhone: Map<string, WhatsAppGroup[]>;
  localPhones: Map<string, string>;
  pick: WhatsAppPick;
  onPickChange: (pick: WhatsAppPick) => void;
  onContinue: () => void;
}

/**
 * Between pick and validate, only when someone picked has no name (ADR
 * 0044): one field per person with their number and group, the keyboard's
 * Next moving down the list. The Owner can drop a person or carry on
 * regardless - whoever is still nameless is flagged by the validate step and
 * skipped as "missing name", as before.
 */
export function WhatsAppNameStep({
  people,
  groupsByPhone,
  localPhones,
  pick,
  onPickChange,
  onContinue,
}: WhatsAppNameStepProps) {
  const t = useTranslations('guests.import.whatsapp.name');
  // Fixed on entry, so a row stays put once its name is typed.
  const [phones] = useState(() =>
    pickedPeople(people, pick)
      .filter((p) => !whatsAppDisplayName(p))
      .map((p) => p.phone),
  );
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const picked = new Set(pick.phones);
  const rows = phones.filter((phone) => picked.has(phone));
  const named = rows.filter((phone) => pick.names[phone]?.trim()).length;
  const remaining = rows.length - named;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-col gap-1.5 px-4 pt-4 pb-2">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-xl font-bold">
            {t('title', { count: rows.length })}
          </h2>
          <span className="text-primary shrink-0 text-[13px] font-semibold">
            {t('progress', { done: named, total: rows.length })}
          </span>
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {t('body')}
        </p>
        <div className="bg-muted mt-1 h-1 overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-[width] duration-300"
            style={{
              width: rows.length ? `${(named / rows.length) * 100}%` : '100%',
            }}
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-4 pt-1.5 pb-4">
        {rows.map((phone, i) => {
          const local = localPhones.get(phone) ?? phone;
          const group = groupsByPhone.get(phone)?.[0];
          const name = pick.names[phone] ?? '';
          return (
            <div
              key={phone}
              className={cn(
                'flex flex-col gap-2 rounded-xl border p-3 pt-2.5',
                name.trim() && 'bg-muted/40',
              )}
            >
              <div className="flex items-center gap-2">
                <div className="flex min-w-0 flex-1 items-baseline gap-2">
                  <span dir="ltr" className="shrink-0 text-sm font-semibold">
                    {local}
                  </span>
                  {group && (
                    <span className="text-muted-foreground truncate text-xs">
                      {group.subject}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onPickChange(setPeoplePick(pick, [phone], false))
                  }
                  aria-label={t('remove', { phone: local })}
                  className="text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg"
                >
                  <IconX size={16} />
                </button>
              </div>
              <Input
                ref={(el) => {
                  inputs.current[i] = el;
                }}
                value={name}
                onChange={(e) =>
                  onPickChange(setNamePick(pick, phone, e.target.value))
                }
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  const next = inputs.current[i + 1];
                  if (next) next.focus();
                  else e.currentTarget.blur();
                }}
                enterKeyHint={i < rows.length - 1 ? 'next' : 'done'}
                placeholder={t('placeholder')}
                aria-label={t('nameFor', { phone: local })}
                className="h-11 text-[16px]"
              />
            </div>
          );
        })}
      </div>

      <div className="bg-card flex shrink-0 flex-col gap-1.5 border-t p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        <Button className="h-12 text-base" onClick={onContinue}>
          {t('continue')}
        </Button>
        {remaining > 0 && (
          <span className="text-muted-foreground text-center text-xs">
            {t('stillUnnamed', { count: remaining })}
          </span>
        )}
      </div>
    </div>
  );
}
