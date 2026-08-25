import type { ReactNode } from 'react';
import { OperatorSearch } from './operator-search';
import { TestAccountsToggle } from './test-accounts-toggle';

/**
 * The Back Office shell's header. Present on every page, because the search is
 * global and a bar that appeared only on some routes would read as a bug.
 *
 * The left slot defaults to the search. Drill-down routes pass a breadcrumb
 * instead - see docs/design/back-office-operations-brief.md section 3.2.
 */
export function BackOfficeTopBar({
  children,
  testAccountsVisible,
}: {
  children?: ReactNode;
  testAccountsVisible: boolean;
}) {
  const today = new Date().toLocaleDateString('en-GB', {
    timeZone: 'Asia/Jerusalem',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <header className="bg-card flex h-14 flex-none items-center gap-4 border-b px-6">
      {/*
       * The slot owns the whole left region, so a route that carries an action
       * can push it right with an auto margin instead of the bar having to know
       * which routes have one.
       */}
      <div className="flex min-w-0 flex-1 items-center gap-3">{children ?? <OperatorSearch />}</div>
      {/*
       * The filter switch sits beside the date rather than in the slot: it
       * applies to every route, and the slot belongs to the route.
       */}
      <TestAccountsToggle visible={testAccountsVisible} />
      <span className="text-muted-foreground shrink-0 text-[12.5px]">{today}</span>
    </header>
  );
}
