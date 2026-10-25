'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { IconChevronLeft } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { WhatsAppGroup, WhatsAppPerson } from '@/features/guests/types';
import {
  matchesSearch,
  setNamePick,
  setPeoplePick,
  whatsAppDisplayName,
  whatsAppLabel,
  type WhatsAppPick,
} from '@/features/guests/utils/whatsapp-import';
import { phoneSearchForms } from '@/lib/phone';
import { cn } from '@/lib/utils';
import {
  Highlight,
  PersonRow,
  PickBox,
  SearchEmptyState,
  SearchField,
} from './whatsapp-pick-parts';

type Chip = 'all' | 'unnamed' | 'listed';

interface WhatsAppMembersViewProps {
  group: WhatsAppGroup;
  localPhones: Map<string, string>;
  pick: WhatsAppPick;
  onPickChange: (pick: WhatsAppPick) => void;
  locked: ReadonlySet<string>;
  onClose: () => void;
}

/**
 * One WhatsApp group opened up (ADR 0044): pick its members one by one,
 * name the ones WhatsApp has no name for right in their row, and see who is
 * already a guest. Chips split the members into everyone pickable, those with
 * no name, and those already on the list; search matches name or number,
 * the only way to find someone with no name.
 */
export function WhatsAppMembersView({
  group,
  localPhones,
  pick,
  onPickChange,
  locked,
  onClose,
}: WhatsAppMembersViewProps) {
  const t = useTranslations('guests.import.whatsapp.members');
  const tp = useTranslations('guests.import.whatsapp.pick');
  const [search, setSearch] = useState('');
  const [chip, setChip] = useState<Chip>('all');
  const searching = search.trim() !== '';
  const selected = useMemo(() => new Set(pick.phones), [pick.phones]);

  const lists = useMemo(() => {
    const matches = group.members.filter((m) =>
      matchesSearch(
        search,
        m.savedName,
        m.pushName,
        localPhones.get(m.phone),
        ...phoneSearchForms(m.phone),
      ),
    );
    const pickable = matches.filter((m) => !locked.has(m.phone));
    // Named first, so the people the Owner can recognise lead.
    const all = [
      ...pickable.filter((m) => whatsAppDisplayName(m)),
      ...pickable.filter((m) => !whatsAppDisplayName(m)),
    ];
    return {
      matches,
      all,
      unnamed: pickable.filter((m) => !whatsAppDisplayName(m)),
      listed: matches.filter((m) => locked.has(m.phone)),
    };
  }, [group.members, search, locked, localPhones]);

  const rows = lists[chip];
  const pickableRows = chip === 'listed' ? [] : rows;
  const pickedCount = pickableRows.filter((m) => selected.has(m.phone)).length;
  const groupPicked = group.members.filter((m) => selected.has(m.phone)).length;
  const allState =
    pickedCount === 0
      ? 'none'
      : pickedCount === pickableRows.length
        ? 'all'
        : 'some';

  const toggle = (phones: string[], on: boolean) =>
    onPickChange(
      setPeoplePick(pick, phones, on, { groupId: group.id, locked }),
    );

  const setName = (person: WhatsAppPerson, name: string) => {
    let next = setNamePick(pick, person.phone, name);
    // Naming someone means they are wanted.
    if (name.trim() && !selected.has(person.phone)) {
      next = setPeoplePick(next, [person.phone], true, {
        groupId: group.id,
        locked,
      });
    }
    onPickChange(next);
  };

  const chips: Array<{ key: Chip; label: string; count: number }> = [
    { key: 'all', label: t('chipAll'), count: lists.all.length },
    { key: 'unnamed', label: t('chipUnnamed'), count: lists.unnamed.length },
    { key: 'listed', label: t('chipListed'), count: lists.listed.length },
  ];
  const nothingFound = searching && lists.matches.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          aria-label={t('back')}
          className="bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-xl"
        >
          <IconChevronLeft size={18} className="rtl:rotate-180" />
        </button>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-lg font-bold">{group.subject}</span>
          <span className="text-muted-foreground text-xs">
            {tp('members', { count: group.members.length })}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-2.5 p-3 pb-0">
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder={t('search')}
          clearLabel={tp('clearSearch')}
        />
        {!nothingFound && (
          <div className="flex gap-2 overflow-x-auto">
            {chips.map(({ key, label, count }) => (
              <button
                key={key}
                type="button"
                onClick={() => setChip(key)}
                aria-pressed={chip === key}
                className={cn(
                  'flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold',
                  chip === key
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'text-foreground/80 bg-background',
                )}
              >
                {label} <span className="font-bold">{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {!nothingFound && pickableRows.length > 0 && (
        <label className="bg-primary/5 mx-3 mt-3 flex h-12 shrink-0 cursor-pointer items-center gap-3 rounded-xl px-3">
          <PickBox
            state={allState}
            onToggle={() =>
              toggle(
                pickableRows.map((m) => m.phone),
                allState !== 'all',
              )
            }
            label={t('selectAll')}
          />
          <span className="flex-1 text-sm font-semibold">
            {searching
              ? t('selectResults')
              : chip === 'unnamed'
                ? t('selectUnnamed')
                : t('selectAll')}
          </span>
          <span className="text-primary text-[13px] font-semibold">
            {t('pickedOf', { picked: pickedCount, total: pickableRows.length })}
          </span>
        </label>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pt-1 pb-3">
        {rows.map((member) =>
          !whatsAppDisplayName(member) && !locked.has(member.phone) ? (
            <div
              key={member.phone}
              className="flex items-center gap-3 border-b py-2.5 last:border-b-0"
            >
              <PickBox
                state={selected.has(member.phone) ? 'all' : 'none'}
                onToggle={() =>
                  toggle([member.phone], !selected.has(member.phone))
                }
                label={localPhones.get(member.phone) ?? member.phone}
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span dir="ltr" className="self-start text-sm font-semibold">
                  <Highlight
                    text={localPhones.get(member.phone) ?? member.phone}
                    term={search}
                  />
                </span>
                <Input
                  value={pick.names[member.phone] ?? ''}
                  onChange={(e) => setName(member, e.target.value)}
                  placeholder={t('addName')}
                  aria-label={t('nameFor', {
                    phone: localPhones.get(member.phone) ?? member.phone,
                  })}
                  className={cn(
                    'h-10 text-[16px]',
                    !pick.names[member.phone] &&
                      'border-warning bg-warning/5 border-dashed',
                  )}
                />
              </div>
            </div>
          ) : (
            <PersonRow
              key={member.phone}
              label={pick.names[member.phone] || whatsAppLabel(member)}
              noNameLabel={tp('noName')}
              phone={localPhones.get(member.phone) ?? member.phone}
              term={search}
              selected={selected.has(member.phone)}
              locked={locked.has(member.phone)}
              lockedLabel={tp('onList')}
              onToggle={() =>
                toggle([member.phone], !selected.has(member.phone))
              }
            />
          ),
        )}

        {!nothingFound && rows.length === 0 && (
          <span className="text-muted-foreground py-10 text-center text-sm">
            {t('emptyChip')}
          </span>
        )}
        {!nothingFound && rows.length > 0 && chip !== 'all' && (
          <span className="text-muted-foreground pt-3 text-center text-xs">
            {chip === 'unnamed' ? t('unnamedNote') : t('listedNote')}
          </span>
        )}
        {nothingFound && (
          <SearchEmptyState
            title={t('emptyTitle', { query: search.trim() })}
            body={t('emptyBody', { count: group.members.length })}
            action={tp('clearSearch')}
            onAction={() => setSearch('')}
          />
        )}
      </div>

      <div className="bg-card shrink-0 border-t p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        <Button className="h-12 w-full text-base" onClick={onClose}>
          {t('done', { count: groupPicked })}
        </Button>
      </div>
    </div>
  );
}
