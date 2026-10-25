'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import type { GroupApp } from '@/features/guests/schemas';
import type { WhatsAppGroup, WhatsAppPerson } from '@/features/guests/types';
import { normalizePhone } from '@/features/guests/utils/import-guests';
import {
  summarizePick,
  type WhatsAppPick,
} from '@/features/guests/utils/whatsapp-import';
import { cn } from '@/lib/utils';
import { WhatsAppContactsTab } from './whatsapp-contacts-tab';
import { WhatsAppGroupsTab } from './whatsapp-groups-tab';
import { WhatsAppMembersView } from './whatsapp-members-view';

type Tab = 'groups' | 'contacts';

interface WhatsAppPickStepProps {
  groups: WhatsAppGroup[];
  contacts: WhatsAppPerson[];
  /** Everyone read, by phone (`peopleByPhone`). */
  people: Map<string, WhatsAppPerson>;
  groupsByPhone: Map<string, WhatsAppGroup[]>;
  /** Each person's number as the Owner reads it, formatted once. */
  localPhones: Map<string, string>;
  /** The Event's existing guest groups, offered for each picked WhatsApp group. */
  guestGroups: GroupApp[];
  /** The guest list's phones, to mark who is already a guest. */
  existingPhones: Map<string, string>;
  pick: WhatsAppPick;
  onPickChange: (pick: WhatsAppPick) => void;
  /** The group opened into its members, if any - the flow's back button closes it. */
  openGroupId: string | null;
  onOpenGroupChange: (groupId: string | null) => void;
  onContinue: () => void;
}

/**
 * Second step of the WhatsApp import (ADR 0044): a Groups tab and a Contacts
 * tab over one per-person selection, and a group opened into its members.
 * Nothing is validated here - the pick becomes a table for the regular
 * validate step, after naming anyone who has no name.
 */
export function WhatsAppPickStep({
  groups,
  contacts,
  people,
  groupsByPhone,
  localPhones,
  guestGroups,
  existingPhones,
  pick,
  onPickChange,
  openGroupId,
  onOpenGroupChange,
  onContinue,
}: WhatsAppPickStepProps) {
  const t = useTranslations('guests.import.whatsapp.pick');
  const [tab, setTab] = useState<Tab>('groups');
  const [groupSearch, setGroupSearch] = useState('');
  const [contactSearch, setContactSearch] = useState('');

  // Matched the way the validate step matches, so nobody marked here turns
  // into a duplicate there, or the other way round.
  const locked = useMemo(() => {
    const out = new Set<string>();
    for (const phone of people.keys()) {
      if (existingPhones.has(normalizePhone(`+${phone}`))) out.add(phone);
    }
    return out;
  }, [people, existingPhones]);

  const summary = useMemo(() => summarizePick(people, pick), [people, pick]);
  const openGroup = openGroupId
    ? groups.find((g) => g.id === openGroupId)
    : undefined;

  if (openGroup) {
    return (
      <WhatsAppMembersView
        group={openGroup}
        localPhones={localPhones}
        pick={pick}
        onPickChange={onPickChange}
        locked={locked}
        onClose={() => onOpenGroupChange(null)}
      />
    );
  }

  const tabs: Array<{ key: Tab; label: string; count: number }> = [
    { key: 'groups', label: t('tabGroups'), count: groups.length },
    { key: 'contacts', label: t('tabContacts'), count: contacts.length },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="bg-card flex shrink-0 border-b">
        {tabs.map(({ key, label, count }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              aria-pressed={active}
              className={cn(
                'flex h-11 flex-1 items-center justify-center gap-1.5 border-b-2 text-sm font-semibold',
                active
                  ? 'border-primary text-primary'
                  : 'text-muted-foreground border-transparent',
              )}
            >
              {label}
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[11px] font-bold',
                  active
                    ? 'bg-primary/15 text-primary'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {tab === 'groups' ? (
        <WhatsAppGroupsTab
          groups={groups}
          guestGroups={guestGroups}
          pick={pick}
          onPickChange={onPickChange}
          locked={locked}
          search={groupSearch}
          onSearchChange={setGroupSearch}
          onOpenGroup={onOpenGroupChange}
          onGoToContacts={() => setTab('contacts')}
        />
      ) : (
        <WhatsAppContactsTab
          contacts={contacts}
          groupsByPhone={groupsByPhone}
          localPhones={localPhones}
          pick={pick}
          onPickChange={onPickChange}
          locked={locked}
          search={contactSearch}
          onSearchChange={setContactSearch}
          onGoToGroups={() => setTab('groups')}
        />
      )}

      <div className="bg-card flex shrink-0 flex-col gap-1.5 border-t p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        <Button
          className="h-12 text-base"
          disabled={summary.people === 0}
          onClick={onContinue}
        >
          {summary.people === 0
            ? t('continueEmpty')
            : t('continue', { count: summary.people })}
        </Button>
        {summary.unnamed > 0 && (
          <span className="text-muted-foreground text-center text-xs">
            {t('unnamedHint', { count: summary.unnamed })}
          </span>
        )}
      </div>
    </div>
  );
}
