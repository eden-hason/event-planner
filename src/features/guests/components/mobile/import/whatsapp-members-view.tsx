'use client';

import {
  useCallback,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { useTranslations } from 'next-intl';
import type { WhatsAppGroup } from '@/features/guests/types';
import { headerState } from '@/features/guests/utils/guest-selection';
import {
  memberLists,
  setGroupMembersPick,
  setNamePick,
  whatsAppDisplayName,
  whatsAppLabel,
  type WhatsAppPick,
} from '@/features/guests/utils/whatsapp-import';
import { cn } from '@/lib/utils';
import {
  PersonRow,
  PickBox,
  SearchEmptyState,
  SearchField,
} from './whatsapp-pick-parts';
import { StepFooter } from './import-wizard-shell';

type Chip = 'all' | 'unnamed' | 'listed';

interface WhatsAppMembersViewProps {
  group: WhatsAppGroup;
  localPhones: Map<string, string>;
  pick: WhatsAppPick;
  onPickChange: Dispatch<SetStateAction<WhatsAppPick>>;
  locked: ReadonlySet<string>;
  onClose: () => void;
}

/**
 * One WhatsApp group opened up (ADR 0044): pick its members one by one,
 * name the ones WhatsApp has no name for right in their row, and see who is
 * already a guest. Chips split the members into everyone pickable, those with
 * no name, and those already on the list; search matches name or number,
 * the only way to find someone with no name. The wizard header carries the
 * group's name, and its back arrow closes the group.
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

  const lists = useMemo(
    () => memberLists(group.members, search, locked, localPhones),
    [group.members, search, locked, localPhones],
  );

  const rows = lists[chip];
  const pickablePhones = chip === 'listed' ? [] : rows.map((m) => m.phone);
  const allState = headerState(selected, pickablePhones);
  const pickedCount = pickablePhones.filter((p) => selected.has(p)).length;
  const groupPicked = group.members.filter((m) => selected.has(m.phone)).length;

  const toggle = useCallback(
    (phone: string) =>
      onPickChange((p) =>
        setGroupMembersPick(
          p,
          group,
          [phone],
          !p.phones.includes(phone),
          locked,
        ),
      ),
    [onPickChange, group, locked],
  );
  const setName = useCallback(
    (phone: string, name: string) =>
      onPickChange((p) => {
        const named = setNamePick(p, phone, name);
        // Naming someone means they are wanted.
        return name.trim()
          ? setGroupMembersPick(named, group, [phone], true, locked)
          : named;
      }),
    [onPickChange, group, locked],
  );

  const chips: Array<{ key: Chip; label: string; count: number }> = [
    { key: 'all', label: t('chipAll'), count: lists.all.length },
    { key: 'unnamed', label: t('chipUnnamed'), count: lists.unnamed.length },
    { key: 'listed', label: t('chipListed'), count: lists.listed.length },
  ];
  const nothingFound = searching && lists.matches.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-col gap-2.5 p-3 pb-0">
        <span className="text-muted-foreground text-xs">
          {tp('members', { count: group.members.length })}
        </span>
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

      {!nothingFound && pickablePhones.length > 0 && (
        <label className="bg-primary/5 mx-3 mt-3 flex h-12 shrink-0 cursor-pointer items-center gap-3 rounded-xl px-3">
          <PickBox
            state={allState}
            onToggle={() =>
              onPickChange((p) =>
                setGroupMembersPick(
                  p,
                  group,
                  pickablePhones,
                  allState !== 'all',
                  locked,
                ),
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
            {t('pickedOf', {
              picked: pickedCount,
              total: pickablePhones.length,
            })}
          </span>
        </label>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pt-1 pb-3">
        {rows.map((member) => {
          const localPhone = localPhones.get(member.phone) ?? member.phone;
          const isLocked = locked.has(member.phone);
          const unnamed = !whatsAppDisplayName(member) && !isLocked;
          return (
            <PersonRow
              key={member.phone}
              phone={member.phone}
              localPhone={localPhone}
              label={whatsAppLabel(member)}
              noNameLabel={tp('noName')}
              term={search}
              selected={selected.has(member.phone)}
              locked={isLocked}
              lockedLabel={tp('onList')}
              onToggle={toggle}
              onNameChange={unnamed ? setName : undefined}
              nameValue={pick.names[member.phone]}
              namePlaceholder={t('addName')}
              nameLabel={tp('nameFor', { phone: localPhone })}
            />
          );
        })}

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

      <StepFooter
        action={t('done', { count: groupPicked })}
        onAction={onClose}
      />
    </div>
  );
}
