import type { ReactNode } from 'react';
import { OperatorSearch } from './operator-search';

/**
 * The Back Office shell's header. Present on every page, because the search is
 * global and a bar that appeared only on some routes would read as a bug.
 *
 * The left slot defaults to the search. Drill-down routes pass a breadcrumb
 * instead - see docs/design/back-office-operations-brief.md section 3.2.
 */
export function BackOfficeTopBar({ children }: { children?: ReactNode }) {
  const today = new Date().toLocaleDateString('en-GB', {
    timeZone: 'Asia/Jerusalem',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <header className="bg-card flex h-14 flex-none items-center gap-3 border-b px-6">
      {children ?? <OperatorSearch />}
      <span className="text-muted-foreground ml-auto shrink-0 text-[12.5px]">{today}</span>
    </header>
  );
}
