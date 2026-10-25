'use client';

import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { GroupApp } from '@/features/guests/schemas';
import type { WhatsAppGroup, WhatsAppPerson } from '@/features/guests/types';
import {
  summarizePick,
  type WhatsAppPick,
} from '@/features/guests/utils/whatsapp-import';
import { WhatsAppContactsTab } from './whatsapp-contacts-tab';
import { WhatsAppGroupsTab } from './whatsapp-groups-tab';
import { WhatsAppMembersView } from './whatsapp-members-view';
import { StepFooter } from './whatsapp-pick-parts';

type Tab = 'groups' | 'contacts';

interface WhatsAppPickStepProps {
  groups: WhatsAppGroup[];
  contacts: WhatsAppPerson[];
  /** Everyone read, by phone (`peopleByPhone`). */
  people: Map<string, WhatsAppPerson>;
  groupsByPhone: Map<string, WhatsAppGroup[]>;
  /** Each person's number as the Owner reads it, formatted once. */
  localPhones: Map<string, string>;
  /** Phones already on the guest list - shown, never picked. */
  locked: ReadonlySet<string>;
  /** The Event's existing guest groups, offered for each picked WhatsApp group. */
  guestGroups: GroupApp[];
  pick: WhatsAppPick;
  /** Takes updater functions too, so row handlers can stay stable. */
  onPickChange: Dispatch<SetStateAction<WhatsAppPick>>;
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
  locked,
  guestGroups,
  pick,
  onPickChange,
  openGroupId,
  onOpenGroupChange,
  onContinue,
}: WhatsAppPickStepProps) {
  const t = useTranslations('guests.import.whatsapp.pick');
  // Radix Tabs writes its own `dir`, `ltr` by default - see `SeatingMobile`.
  const dir = useLocale() === 'he' ? 'rtl' : 'ltr';
  const [tab, setTab] = useState<Tab>('groups');
  const [groupSearch, setGroupSearch] = useState('');
  const [contactSearch, setContactSearch] = useState('');

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
    <Tabs
      value={tab}
      onValueChange={(value) => setTab(value as Tab)}
      dir={dir}
      className="flex h-full min-h-0 flex-col gap-0"
    >
      <TabsList className="bg-card h-11 w-full shrink-0 rounded-none border-b p-0">
        {tabs.map(({ key, label, count }) => (
          <TabsTrigger
            key={key}
            value={key}
            className="group text-muted-foreground data-[state=active]:border-b-primary data-[state=active]:text-primary h-full rounded-none border-0 border-b-2 border-transparent font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            {label}
            <span className="bg-muted text-muted-foreground group-data-[state=active]:bg-primary/15 group-data-[state=active]:text-primary rounded-full px-1.5 py-0.5 text-[11px] font-bold">
              {count}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="groups" className="flex min-h-0 flex-col">
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
      </TabsContent>
      <TabsContent value="contacts" className="flex min-h-0 flex-col">
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
      </TabsContent>

      <StepFooter
        action={
          summary.people === 0
            ? t('continueEmpty')
            : t('continue', { count: summary.people })
        }
        disabled={summary.people === 0}
        onAction={onContinue}
        hint={
          summary.unnamed > 0
            ? t('unnamedHint', { count: summary.unnamed })
            : undefined
        }
      />
    </Tabs>
  );
}
