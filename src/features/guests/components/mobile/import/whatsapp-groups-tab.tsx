'use client';

import { useMemo, type Dispatch, type SetStateAction } from 'react';
import { useTranslations } from 'next-intl';
import { IconArrowsSort, IconChevronRight } from '@tabler/icons-react';
import type { GroupApp } from '@/features/guests/schemas';
import type { WhatsAppGroup } from '@/features/guests/types';
import {
  groupPickState,
  matchesSearch,
  setGuestGroupPick,
  toggleGroupPick,
  whatsAppDisplayName,
  type WhatsAppPick,
} from '@/features/guests/utils/whatsapp-import';
import { cn } from '@/lib/utils';
import { GroupCombobox } from './group-combobox';
import {
  Highlight,
  NothingHere,
  PickBox,
  SearchEmptyState,
  SearchField,
  Tag,
} from './whatsapp-pick-parts';

interface WhatsAppGroupsTabProps {
  /** Already ordered by recent activity (`buildGroups`). */
  groups: WhatsAppGroup[];
  guestGroups: GroupApp[];
  pick: WhatsAppPick;
  onPickChange: Dispatch<SetStateAction<WhatsAppPick>>;
  /** Phones already on the guest list - never picked. */
  locked: ReadonlySet<string>;
  search: string;
  onSearchChange: (search: string) => void;
  onOpenGroup: (groupId: string) => void;
  onGoToContacts: () => void;
}

/**
 * The pick step's Groups tab (ADR 0044): groups in the order of the Owner's
 * WhatsApp chat list, each with how much of it is picked and how many of its
 * members are already guests. The checkbox takes the whole group; the arrow
 * opens it to pick member by member. Search matches group names only.
 */
export function WhatsAppGroupsTab({
  groups,
  guestGroups,
  pick,
  onPickChange,
  locked,
  search,
  onSearchChange,
  onOpenGroup,
  onGoToContacts,
}: WhatsAppGroupsTabProps) {
  const t = useTranslations('guests.import.whatsapp.pick');
  const searching = search.trim() !== '';

  const shown = useMemo(
    () => groups.filter((g) => matchesSearch(search, g.subject)),
    [groups, search],
  );
  const selected = useMemo(() => new Set(pick.phones), [pick.phones]);
  // What a card shows that no pick changes, counted once rather than per tap.
  const unnamedCounts = useMemo(
    () =>
      new Map(
        groups.map((g) => [
          g.id,
          g.members.filter((m) => !whatsAppDisplayName(m)).length,
        ]),
      ),
    [groups],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-col gap-2 p-3 pb-1">
        <SearchField
          value={search}
          onChange={onSearchChange}
          placeholder={t('searchGroups')}
          clearLabel={t('clearSearch')}
        />
        {searching ? (
          shown.length > 0 && (
            <span className="text-muted-foreground text-xs">
              {t('groupsResults', { count: shown.length })}
            </span>
          )
        ) : (
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <IconArrowsSort size={14} />
            {t('groupsOrder')}
          </span>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3 pt-1">
        {shown.map((group) => {
          const { state, picked, pickable } = groupPickState(
            group,
            selected,
            locked,
          );
          const listed = group.members.length - pickable;
          const unnamed = unnamedCounts.get(group.id) ?? 0;
          // Only a group the Owner picked from decides anyone's guest group;
          // one that is partly picked because its members were picked
          // elsewhere has nothing to map.
          const mapsGuestGroup =
            state !== 'none' && pick.groupOrder.includes(group.id);
          return (
            <div
              key={group.id}
              className={cn(
                'flex flex-col gap-2.5 rounded-xl border p-3',
                state !== 'none' && 'border-primary/40 bg-primary/5',
              )}
            >
              <div className="flex items-center gap-3">
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                  <PickBox
                    state={state}
                    onToggle={() =>
                      onPickChange((p) => toggleGroupPick(p, group, locked))
                    }
                    disabled={pickable === 0}
                    label={group.subject}
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-[15px] font-semibold">
                      <Highlight text={group.subject} term={search} />
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {t('members', { count: group.members.length })}
                      {unnamed > 0 && ` · ${t('unnamed', { count: unnamed })}`}
                    </span>
                    {(state !== 'none' || listed > 0) && (
                      <span className="mt-1 flex flex-wrap gap-1.5">
                        {state !== 'none' && (
                          <Tag tone="primary">
                            {state === 'all'
                              ? t('pickedAll', { count: picked })
                              : t('pickedSome', { picked, total: pickable })}
                          </Tag>
                        )}
                        {listed > 0 && (
                          <Tag tone="success">
                            {t('alreadyGuests', { count: listed })}
                          </Tag>
                        )}
                      </span>
                    )}
                  </div>
                </label>
                <button
                  type="button"
                  onClick={() => onOpenGroup(group.id)}
                  aria-label={t('openMembers', { name: group.subject })}
                  className="bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-xl"
                >
                  <IconChevronRight size={18} className="rtl:rotate-180" />
                </button>
              </div>
              {mapsGuestGroup && (
                <div className="flex items-center gap-2.5 ps-[34px]">
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {t('guestGroupLabel')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <GroupCombobox
                      groups={guestGroups}
                      side={null}
                      value={pick.guestGroups[group.id] ?? null}
                      onChange={(name) =>
                        onPickChange((p) =>
                          setGuestGroupPick(p, group.id, name),
                        )
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {shown.length === 0 &&
          (searching ? (
            <SearchEmptyState
              title={t('groupsEmptyTitle', { query: search.trim() })}
              body={t('groupsEmptyBody')}
              action={t('goToContacts')}
              onAction={onGoToContacts}
            />
          ) : (
            <NothingHere>{t('emptyTab')}</NothingHere>
          ))}
      </div>
    </div>
  );
}
