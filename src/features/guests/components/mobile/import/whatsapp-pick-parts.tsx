'use client';

import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import {
  IconCheck,
  IconMinus,
  IconSearch,
  IconUsers,
  IconX,
} from '@tabler/icons-react';
import { Input } from '@/components/ui/input';
import { splitMatch } from '@/features/guests/utils/whatsapp-import';
import { cn } from '@/lib/utils';

/**
 * Small pieces shared by the WhatsApp pick step's Groups tab, Contacts tab
 * and members screen (ADR 0044), so a person, a search and a dead end look
 * the same wherever they appear.
 */

export type PickState = 'all' | 'some' | 'none';

/**
 * The picker's checkbox: all, some (a group partly picked) or none. Disabled
 * for people already on the guest list, who cannot be picked again.
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
    <div className="relative">
      <IconSearch
        size={16}
        className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 -translate-y-1/2"
      />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'h-11 ps-9 pe-10 text-[16px] [&::-webkit-search-cancel-button]:hidden',
          value && 'border-primary',
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label={clearLabel}
          className="bg-border text-foreground absolute end-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full"
        >
          <IconX size={12} stroke={3} />
        </button>
      )}
    </div>
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
  action: React.ReactNode;
  onAction: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2.5 px-5 py-12 text-center">
      <span className="bg-muted text-muted-foreground flex size-14 items-center justify-center rounded-full">
        <IconSearch size={24} />
      </span>
      <span className="text-base font-semibold">{title}</span>
      <span className="text-muted-foreground text-sm leading-relaxed">
        {body}
      </span>
      <button
        type="button"
        onClick={onAction}
        className="border-primary/30 text-primary mt-1.5 flex h-11 items-center gap-1.5 rounded-xl border px-4 text-sm font-semibold"
      >
        {action}
      </button>
    </div>
  );
}

/**
 * One person in a list: checkbox, name (highlighted while searching), number,
 * and optionally the groups they share with the Owner and when they last
 * chatted. A person already on the guest list is greyed out and marked.
 */
export function PersonRow({
  label,
  noNameLabel,
  phone,
  term,
  selected,
  locked,
  lockedLabel,
  onToggle,
  groupsLine,
  when,
}: {
  label: string;
  noNameLabel: string;
  phone: string;
  term: string;
  selected: boolean;
  locked: boolean;
  lockedLabel: string;
  onToggle: () => void;
  groupsLine?: string;
  when?: string;
}) {
  return (
    <label
      className={cn(
        'flex min-h-[60px] items-center gap-3 border-b py-2 last:border-b-0',
        locked ? 'cursor-default' : 'cursor-pointer',
      )}
    >
      <PickBox
        state={selected ? 'all' : 'none'}
        onToggle={onToggle}
        disabled={locked}
        label={label || phone}
      />
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
          <span dir="ltr" className="text-muted-foreground shrink-0 text-xs">
            <Highlight text={phone} term={term} />
          </span>
        </div>
        {groupsLine !== undefined && (
          <span className="text-muted-foreground flex min-w-0 items-center gap-1 text-xs">
            <IconUsers size={13} className="shrink-0" />
            <span className="truncate">{groupsLine}</span>
          </span>
        )}
      </div>
      {(when || locked) && (
        <div className="flex shrink-0 flex-col items-end gap-1">
          {when && (
            <span className="text-muted-foreground text-[11.5px]">{when}</span>
          )}
          {locked && (
            <span className="bg-success/15 text-success rounded-md px-2 py-0.5 text-[11.5px] font-semibold">
              {lockedLabel}
            </span>
          )}
        </div>
      )}
    </label>
  );
}
