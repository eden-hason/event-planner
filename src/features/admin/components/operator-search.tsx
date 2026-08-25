'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { searchEvents } from '@/features/admin/queries/search';
import type { EventSearchResult } from '@/features/admin/types';
import { cn } from '@/lib/utils';

/** Long enough that typing a couple's name does not fire a query per keystroke. */
const DEBOUNCE_MS = 200;

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Header search across event title, owner name and owner email, landing on the
 * event workspace. The Operations queue only lists events with outstanding
 * work, so this is the only way to reach a quiet event.
 */
export function OperatorSearch() {
  const router = useRouter();
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  const [term, setTerm] = useState('');
  const [results, setResults] = useState<EventSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const trimmed = term.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setFailed(false);
      return;
    }

    // Ignore a response that arrives after a newer one - the Operator is typing
    // and a slow early query must not overwrite the current term's results.
    let current = true;
    const timer = setTimeout(async () => {
      try {
        const found = await searchEvents(trimmed);
        if (!current) return;
        setResults(found);
        setFailed(false);
        setActive(0);
      } catch (error) {
        if (!current) return;
        console.error('Back Office search failed:', error);
        setResults([]);
        setFailed(true);
      }
    }, DEBOUNCE_MS);

    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [term]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  function go(result: EventSearchResult) {
    setOpen(false);
    setTerm('');
    router.push(`/admin/events/${result.id}`);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!results.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => (index + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const chosen = results[active];
      if (chosen) go(chosen);
    }
  }

  const showPanel = open && term.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative w-full max-w-[380px]">
      <div className="border-input bg-card flex items-center gap-2 rounded-md border px-2.5 py-1.5">
        <Search className="text-muted-foreground size-[15px] shrink-0" />
        <input
          type="text"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          value={term}
          placeholder="Search events, owners, emails"
          onChange={(event) => {
            setTerm(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-[13.5px] outline-none"
        />
      </div>

      {showPanel && (
        <div
          id={listId}
          role="listbox"
          className="bg-popover absolute top-full left-0 z-50 mt-1.5 w-full overflow-hidden rounded-md border shadow-sm"
        >
          {failed ? (
            <p className="text-destructive px-3 py-2.5 text-[13px]">Search didn&apos;t load</p>
          ) : results.length === 0 ? (
            <p className="text-muted-foreground px-3 py-2.5 text-[13px]">No events match</p>
          ) : (
            results.map((result, index) => (
              <button
                key={result.id}
                type="button"
                role="option"
                aria-selected={index === active}
                onMouseEnter={() => setActive(index)}
                onClick={() => go(result)}
                className={cn(
                  'flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left',
                  index === active && 'bg-accent',
                )}
              >
                <span className="flex w-full items-baseline gap-2">
                  <span className="truncate text-[13.5px] font-medium">{result.title}</span>
                  {result.isDraft && (
                    <span className="text-muted-foreground shrink-0 rounded-full border px-1.5 py-px text-[10px] font-semibold tracking-[0.05em]">
                      Draft
                    </span>
                  )}
                </span>
                <span className="text-muted-foreground truncate text-[12px]">
                  {formatEventDate(result.eventDate)} · {result.ownerName}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
