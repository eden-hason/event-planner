'use client';

import {
  useCallback,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { IconChevronDown } from '@tabler/icons-react';
import type { WhatsAppGroup, WhatsAppPerson } from '@/features/guests/types';
import {
  chatDay,
  contactSections,
  personMatches,
  setPeoplePick,
  whatsAppLabel,
  type WhatsAppPick,
} from '@/features/guests/utils/whatsapp-import';
import { ADMIN_TIME_ZONE } from '@/lib/date-time';
import { cn } from '@/lib/utils';
import {
  ListNote,
  NothingHere,
  PersonRow,
  SearchEmptyState,
  SearchField,
} from './whatsapp-pick-parts';

/** How many people a collapsed section shows - its most recent ones. */
const PREVIEW = 3;

type SectionKey = 'saved' | 'recent';

interface WhatsAppContactsTabProps {
  /** Only people the Owner saved or chats with one-on-one (`knownContacts`). */
  contacts: WhatsAppPerson[];
  groupsByPhone: Map<string, WhatsAppGroup[]>;
  localPhones: Map<string, string>;
  pick: WhatsAppPick;
  onPickChange: Dispatch<SetStateAction<WhatsAppPick>>;
  locked: ReadonlySet<string>;
  search: string;
  onSearchChange: (search: string) => void;
  onGoToGroups: () => void;
}

/**
 * The pick step's Contacts tab (ADR 0044): the people the Owner knows
 * directly, in two sections - saved in their phone, then recent one-on-one
 * chats - each a preview of its most recent few with Show all on its header.
 * Search covers these two sections only; a person known only from a group is
 * found inside that group.
 */
export function WhatsAppContactsTab({
  contacts,
  groupsByPhone,
  localPhones,
  pick,
  onPickChange,
  locked,
  search,
  onSearchChange,
  onGoToGroups,
}: WhatsAppContactsTabProps) {
  const t = useTranslations('guests.import.whatsapp.pick');
  const locale = useLocale();
  const [expanded, setExpanded] = useState<Record<SectionKey, boolean>>({
    saved: false,
    recent: false,
  });
  const searching = search.trim() !== '';

  const sections = useMemo(() => contactSections(contacts), [contacts]);
  const selected = useMemo(() => new Set(pick.phones), [pick.phones]);

  const shown = useMemo(() => {
    const filter = (people: WhatsAppPerson[]) =>
      people.filter((p) => personMatches(search, p, localPhones.get(p.phone)));
    return { saved: filter(sections.saved), recent: filter(sections.recent) };
  }, [sections, search, localPhones]);
  const matchCount = shown.saved.length + shown.recent.length;

  const now = useMemo(() => new Date(), []);
  const dateFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: '2-digit',
        timeZone: ADMIN_TIME_ZONE,
      }),
    [locale],
  );
  const toggle = useCallback(
    (phone: string) =>
      onPickChange((p) =>
        setPeoplePick(p, [phone], !p.phones.includes(phone), locked),
      ),
    [onPickChange, locked],
  );
  const whenOf = (person: WhatsAppPerson) => {
    if (person.lastChatAt === null) return undefined;
    const day = chatDay(person.lastChatAt, now);
    if (day === 'today') return t('today');
    if (day === 'yesterday') return t('yesterday');
    return dateFormat.format(new Date(person.lastChatAt * 1000));
  };
  const groupsLineOf = (person: WhatsAppPerson) => {
    const shared = groupsByPhone.get(person.phone) ?? [];
    if (shared.length === 0) return t('noSharedGroups');
    const line = shared
      .slice(0, 2)
      .map((g) => g.subject)
      .join(' · ');
    return shared.length > 2 ? `${line} +${shared.length - 2}` : line;
  };

  const renderSection = (key: SectionKey, title: string) => {
    const people = shown[key];
    if (people.length === 0) return null;
    const open = searching || expanded[key];
    return (
      <section key={key}>
        <div
          className={cn(
            'bg-background flex min-h-11 items-center justify-between gap-2 border-b pt-1.5',
            open && 'sticky top-0 z-10',
          )}
        >
          <span className="text-[13px] font-bold">
            {title}{' '}
            <span className="text-muted-foreground font-medium">
              · {people.length}
            </span>
          </span>
          {!searching && people.length > PREVIEW && (
            <button
              type="button"
              onClick={() => setExpanded((e) => ({ ...e, [key]: !e[key] }))}
              aria-expanded={open}
              className="text-primary flex h-9 items-center gap-1 px-1 text-[13px] font-semibold"
            >
              {open ? t('showLess') : t('showAll')}
              <IconChevronDown
                size={14}
                stroke={2.4}
                className={cn('transition-transform', open && 'rotate-180')}
              />
            </button>
          )}
        </div>
        {(open ? people : people.slice(0, PREVIEW)).map((person) => (
          <PersonRow
            key={person.phone}
            phone={person.phone}
            localPhone={localPhones.get(person.phone) ?? person.phone}
            label={whatsAppLabel(person)}
            noNameLabel={t('noName')}
            term={search}
            selected={selected.has(person.phone)}
            locked={locked.has(person.phone)}
            lockedLabel={t('onList')}
            onToggle={toggle}
            groupsLine={groupsLineOf(person)}
            when={whenOf(person)}
          />
        ))}
      </section>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 p-3 pb-2">
        <SearchField
          value={search}
          onChange={onSearchChange}
          placeholder={t('searchContacts')}
          clearLabel={t('clearSearch')}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-3">
        {matchCount > 0 && (
          <ListNote
            results={
              searching
                ? t('contactsResults', { count: matchCount })
                : undefined
            }
            order={t('recentOrder')}
          />
        )}
        {renderSection('saved', t('sectionSaved'))}
        {renderSection('recent', t('sectionRecent'))}

        {matchCount === 0 &&
          (searching ? (
            <SearchEmptyState
              title={t('contactsEmptyTitle', { query: search.trim() })}
              body={t('contactsEmptyBody')}
              action={t('goToGroups')}
              onAction={onGoToGroups}
            />
          ) : (
            <NothingHere>{t('emptyTab')}</NothingHere>
          ))}
      </div>
    </div>
  );
}
