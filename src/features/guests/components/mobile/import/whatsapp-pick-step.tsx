'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { IconSearch } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import type { GroupApp } from '@/features/guests/schemas';
import type { WhatsAppGroup, WhatsAppPerson } from '@/features/guests/types';
import {
  matchesSearch,
  setGuestGroupPick,
  summarizePick,
  toggleContactPick,
  toggleGroupPick,
  toImportSelection,
  whatsAppDisplayName,
  type WhatsAppPick,
} from '@/features/guests/utils/whatsapp-import';
import { formatPhone } from '@/lib/phone';
import { cn } from '@/lib/utils';
import { GroupCombobox } from './group-combobox';

type Tab = 'groups' | 'contacts';

/**
 * Contacts can run to a couple of thousand; rendering them all makes a phone
 * crawl, and nobody scrolls that far - search is how the rest are found.
 */
const CONTACTS_SHOWN = 100;

interface WhatsAppPickStepProps {
  groups: WhatsAppGroup[];
  contacts: WhatsAppPerson[];
  /** The Event's existing guest groups, offered for each selected WhatsApp group. */
  guestGroups: GroupApp[];
  pick: WhatsAppPick;
  onPickChange: (pick: WhatsAppPick) => void;
  onContinue: () => void;
}

/**
 * Second step of the WhatsApp import: tick whole groups and/or single
 * contacts, and say which guest group each WhatsApp group lands in. Nothing
 * is validated here - the selection becomes a table for the regular validate
 * step, which is where missing names and duplicates get fixed (backlog 0017).
 */
export function WhatsAppPickStep({
  groups,
  contacts,
  guestGroups,
  pick,
  onPickChange,
  onContinue,
}: WhatsAppPickStepProps) {
  const t = useTranslations('guests.import.whatsapp.pick');
  const [tab, setTab] = useState<Tab>('groups');
  const [search, setSearch] = useState('');

  const summary = useMemo(
    () => summarizePick(toImportSelection(groups, contacts, pick)),
    [groups, contacts, pick],
  );

  const shownGroups = useMemo(
    () => groups.filter((g) => matchesSearch(search, g.subject)),
    [groups, search],
  );
  // Formatted once - parsing a couple of thousand numbers on every keystroke
  // is noticeable on a phone.
  const localPhones = useMemo(
    () => new Map(contacts.map((c) => [c.phone, formatPhone(`+${c.phone}`)])),
    [contacts],
  );
  const matchingContacts = useMemo(
    () =>
      contacts.filter((c) =>
        matchesSearch(search, c.savedName, c.pushName, c.phone, localPhones.get(c.phone)),
      ),
    [contacts, search, localPhones],
  );

  const tabs: Array<{ key: Tab; label: string; count: number }> = [
    { key: 'groups', label: t('tabGroups'), count: groups.length },
    { key: 'contacts', label: t('tabContacts'), count: contacts.length },
  ];

  const nothingShown =
    tab === 'groups' ? shownGroups.length === 0 : matchingContacts.length === 0;

  return (
    <div className="flex h-full flex-col">
      <div className="bg-card flex shrink-0 border-b">
        {tabs.map(({ key, label, count }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
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
                  active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="shrink-0 p-3 pb-0">
        <div className="relative">
          <IconSearch
            size={16}
            className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 -translate-y-1/2"
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === 'groups' ? t('searchGroups') : t('searchContacts')}
            className="h-10 ps-9 text-[16px]"
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
        {tab === 'groups' &&
          shownGroups.map((group) => {
            const selected = pick.groupIds.includes(group.id);
            const unnamed = group.members.filter((m) => !whatsAppDisplayName(m)).length;
            return (
              <div
                key={group.id}
                className={cn(
                  'flex flex-col gap-2.5 rounded-xl border p-3',
                  selected && 'border-primary/40 bg-primary/5',
                )}
              >
                <label className="flex cursor-pointer items-center gap-3">
                  <Checkbox
                    checked={selected}
                    onCheckedChange={() => onPickChange(toggleGroupPick(pick, group.id))}
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[14px] font-semibold">{group.subject}</span>
                    <span className="text-muted-foreground text-xs">
                      {t('members', { count: group.members.length })}
                      {unnamed > 0 && ` · ${t('unnamed', { count: unnamed })}`}
                    </span>
                  </div>
                </label>
                {selected && (
                  <div className="flex flex-col gap-1.5 ps-7">
                    <span className="text-muted-foreground text-xs font-medium">
                      {t('guestGroupLabel')}
                    </span>
                    <GroupCombobox
                      groups={guestGroups}
                      side={null}
                      value={pick.guestGroups[group.id] ?? null}
                      onChange={(name) => onPickChange(setGuestGroupPick(pick, group.id, name))}
                    />
                  </div>
                )}
              </div>
            );
          })}

        {tab === 'contacts' && (
          <>
            {matchingContacts.length > 0 && (
              <ul className="flex flex-col divide-y rounded-xl border">
                {matchingContacts.slice(0, CONTACTS_SHOWN).map((contact) => {
                  const name = whatsAppDisplayName(contact);
                  return (
                    <li key={contact.phone}>
                      <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5">
                        <Checkbox
                          checked={pick.contactPhones.includes(contact.phone)}
                          onCheckedChange={() =>
                            onPickChange(toggleContactPick(pick, contact.phone))
                          }
                        />
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span
                            className={cn(
                              'truncate text-[14px]',
                              name ? 'font-medium' : 'text-muted-foreground italic',
                            )}
                          >
                            {name || t('noName')}
                          </span>
                          <span dir="ltr" className="text-muted-foreground text-start text-xs">
                            {localPhones.get(contact.phone)}
                          </span>
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
            {matchingContacts.length > CONTACTS_SHOWN && (
              <span className="text-muted-foreground py-1 text-center text-xs">
                {t('showingFirst', { shown: CONTACTS_SHOWN, total: matchingContacts.length })}
              </span>
            )}
          </>
        )}

        {nothingShown && (
          <div className="flex flex-1 items-center justify-center py-16 text-center">
            <span className="text-muted-foreground text-sm">
              {search.trim() ? t('emptySearch') : t('emptyTab')}
            </span>
          </div>
        )}
      </div>

      <div className="bg-card flex shrink-0 flex-col gap-1.5 border-t p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        <Button disabled={summary.people === 0} onClick={onContinue}>
          {summary.people === 0 ? t('continueEmpty') : t('continue', { count: summary.people })}
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
