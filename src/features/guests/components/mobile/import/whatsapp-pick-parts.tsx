'use client';

import { memo } from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import {
  IconArrowsSort,
  IconCheck,
  IconMinus,
  IconSearch,
  IconUsers,
  IconX,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import {
  splitMatch,
  type PickState,
} from '@/features/guests/utils/whatsapp-import';
import { cn } from '@/lib/utils';

/**
 * Small pieces shared by the WhatsApp pick step's Groups tab, Contacts tab,
 * members screen and name step (ADR 0044), so a person, a search and a dead
 * end look the same wherever they appear.
 */

/**
 * The picker's checkbox: all, some (a group partly picked) or none. Larger
 * than the desktop `SelectBox`, for a thumb. Disabled for people already on
 * the guest list, who cannot be picked again.
 */
export function PickBox({
  state,
  onToggle,
  disabled,
  label,
}: {
  state: PickState;
  onToggle?: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <CheckboxPrimitive.Root
      checked={
        state === 'all' ? true : state === 'some' ? 'indeterminate' : false
      }
      onCheckedChange={() => onToggle?.()}
      disabled={disabled}
      aria-label={label}
      className={cn(
        'border-primary text-primary-foreground flex size-[22px] shrink-0 items-center justify-center rounded-[7px] border-2',
        'data-[state=checked]:bg-primary data-[state=indeterminate]:bg-primary',
        'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
        'disabled:border-border disabled:bg-muted disabled:cursor-not-allowed',
      )}
    >
      <CheckboxPrimitive.Indicator>
        {state === 'some' ? (
          <IconMinus size={14} stroke={3} />
        ) : (
          <IconCheck size={14} stroke={3} />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

/** `text` with the first match of `term` marked. */
export function Highlight({ text, term }: { text: string; term: string }) {
  const { before, match, after } = splitMatch(text, term);
  if (!match) return <>{text}</>;
  return (
    <>
      {before}
      <mark className="bg-primary/15 text-primary rounded-[3px] font-semibold">
        {match}
      </mark>
      {after}
    </>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder,
  clearLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  clearLabel: string;
}) {
  return (
    <InputGroup className={cn('h-11', value && 'border-primary')}>
      <InputGroupAddon>
        <IconSearch />
      </InputGroupAddon>
      <InputGroupInput
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="text-[16px] [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-xs"
            aria-label={clearLabel}
            onClick={() => onChange('')}
          >
            <IconX />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}

/**
 * The line at the top of a tab's list: how many matched while searching,
 * otherwise how the list is ordered. Lives inside the scrolling list, so it
 * scrolls away and leaves only the search pinned.
 */
export function ListNote({
  results,
  order,
}: {
  /** The match count line, or undefined when not searching. */
  results?: string;
  order: string;
}) {
  if (results !== undefined) {
    return <span className="text-muted-foreground text-xs">{results}</span>;
  }
  return (
    <span className="text-muted-foreground flex items-center gap-1 text-xs">
      <IconArrowsSort size={14} className="shrink-0" />
      {order}
    </span>
  );
}

/** A search that found nothing: what was searched, and the one useful next step. */
export function SearchEmptyState({
  title,
  body,
  action,
  onAction,
}: {
  title: string;
  body: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <Empty className="flex-1 border-0 py-12">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <IconSearch className="text-muted-foreground size-6" />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{body}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" onClick={onAction}>
          {action}
        </Button>
      </EmptyContent>
    </Empty>
  );
}

/** A list with nothing in it at all, search or not. */
export function NothingHere({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-muted-foreground flex flex-1 items-center justify-center py-16 text-sm">
      {children}
    </div>
  );
}

/** A small count or status pill: picked (primary) or already a guest (success). */
export function Tag({
  tone,
  children,
}: {
  tone: 'primary' | 'success';
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-md px-2 py-0.5 text-[11.5px] font-semibold',
        tone === 'primary'
          ? 'bg-primary/15 text-primary'
          : 'bg-success/15 text-success',
      )}
    >
      {children}
    </span>
  );
}

interface PersonRowProps {
  phone: string;
  /** The number as the Owner reads it. */
  localPhone: string;
  label: string;
  noNameLabel: string;
  term: string;
  selected: boolean;
  locked: boolean;
  lockedLabel: string;
  /** Takes the row's `phone`, so one stable handler serves every row. */
  onToggle: (phone: string) => void;
  groupsLine?: string;
  when?: string;
  /**
   * For someone WhatsApp has no name for: a field to type one in, shown in
   * place of the name. Flat props rather than an object, to keep the memo.
   */
  onNameChange?: (phone: string, name: string) => void;
  nameValue?: string;
  namePlaceholder?: string;
  nameLabel?: string;
}

/**
 * One person in a list: checkbox, name (highlighted while searching) or a
 * field to type one, number, and optionally the groups they share with the
 * Owner and when they last chatted. A person already on the guest list is
 * greyed out and marked. Memoised: a long members list re-renders only the
 * row that changed.
 */
export const PersonRow = memo(function PersonRow({
  phone,
  localPhone,
  label,
  noNameLabel,
  term,
  selected,
  locked,
  lockedLabel,
  onToggle,
  groupsLine,
  when,
  onNameChange,
  nameValue = '',
  namePlaceholder,
  nameLabel,
}: PersonRowProps) {
  const hasNameField = onNameChange !== undefined;
  const number = (
    <span dir="ltr" className="text-muted-foreground shrink-0 text-xs">
      <Highlight text={localPhone} term={term} />
    </span>
  );
  // A row with a text field can't be one big <label>, or tapping the field
  // would toggle the checkbox.
  const Row = hasNameField ? 'div' : 'label';
  return (
    // `shrink-0`: the lists are scrolling flex columns, which would otherwise
    // squeeze a row down to its min height and spill a name field's number
    // over the row above.
    <Row
      className={cn(
        'flex min-h-[60px] shrink-0 items-center gap-3 border-b last:border-b-0',
        hasNameField ? 'py-3' : 'py-2',
        !hasNameField && !locked && 'cursor-pointer',
      )}
    >
      <PickBox
        state={selected ? 'all' : 'none'}
        onToggle={() => onToggle(phone)}
        disabled={locked}
        label={label || localPhone}
      />
      {hasNameField ? (
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span dir="ltr" className="self-start text-sm font-semibold">
            <Highlight text={localPhone} term={term} />
          </span>
          <Input
            value={nameValue}
            onChange={(e) => onNameChange(phone, e.target.value)}
            placeholder={namePlaceholder}
            aria-label={nameLabel}
            className={cn(
              'h-10 text-[16px]',
              !nameValue && 'border-warning bg-warning/5 border-dashed',
            )}
          />
        </div>
      ) : (
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex min-w-0 items-baseline gap-2">
            <span
              className={cn(
                'truncate text-[15px]',
                !label ? 'text-muted-foreground italic' : 'font-medium',
                locked && 'text-muted-foreground',
              )}
            >
              {label ? <Highlight text={label} term={term} /> : noNameLabel}
            </span>
            {number}
          </div>
          {groupsLine !== undefined && (
            <span className="text-muted-foreground flex min-w-0 items-center gap-1 text-xs">
              <IconUsers size={13} className="shrink-0" />
              <span className="truncate">{groupsLine}</span>
            </span>
          )}
        </div>
      )}
      {(when || locked) && (
        <div className="flex shrink-0 flex-col items-end gap-1">
          {when && (
            <span className="text-muted-foreground text-[11.5px]">{when}</span>
          )}
          {locked && <Tag tone="success">{lockedLabel}</Tag>}
        </div>
      )}
    </Row>
  );
});
