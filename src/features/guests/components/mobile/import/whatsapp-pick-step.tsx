'use client';

import { useTranslations } from 'next-intl';
import type { WhatsAppGroup, WhatsAppPerson } from '@/features/guests/types';

interface WhatsAppPickStepProps {
  groups: WhatsAppGroup[];
  contacts: WhatsAppPerson[];
}

/**
 * Second step of the WhatsApp import: what was read from the Owner's account.
 * For now a read-only overview; selection and the hand-off to the validate
 * step land next (docs/whatsapp-import-plan.md, phase 3).
 */
export function WhatsAppPickStep({ groups, contacts }: WhatsAppPickStepProps) {
  const t = useTranslations('guests.import.whatsapp.pick');

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-4">
      <span className="text-[15px] font-bold">
        {t('found', { groups: groups.length, contacts: contacts.length })}
      </span>
      <ul className="flex flex-col divide-y rounded-xl border">
        {groups.map((group) => (
          <li key={group.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
            <span className="min-w-0 truncate text-[14px]">{group.subject}</span>
            <span className="text-muted-foreground shrink-0 text-xs">
              {t('members', { count: group.members.length })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
