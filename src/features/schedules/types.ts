// TypeScript-only view models for the schedules feature.
// Zod-backed DB<->app transforms live in schemas/.

import type { ReactNode } from 'react';

export type OutreachItemStatus =
  // Message schedules
  | 'pending'
  | 'sent'
  | 'cancelled'
  // Call rounds: a plan that has been started, and one that is finished
  | 'in_progress'
  | 'completed';

/**
 * One entry in the schedules page nav. Every entry is a schedules row now -
 * both message sends and planned call rounds - so this carries only what the
 * nav and the status line need, with the details pane pre-rendered server-side.
 * See docs/adr/0004-call-schedules-are-plans-call-rounds-are-executions.md.
 */
export type OutreachItem = {
  /** Nav label, already localized and disambiguated server-side */
  label: string;
  status: OutreachItemStatus;
  /** Anchors the relative-time text beside the status dot; omitted when there is nothing meaningful to date */
  timestamp?: string;
  details: ReactNode;
};

/**
 * One labelled section of the schedules nav. Messages and call rounds are two
 * different kinds of outreach, so they get their own lists rather than sharing
 * one flat menu. The split is derived from the schedule type's execution_kind,
 * not from a hardcoded key.
 */
export type OutreachNavGroup = {
  key: 'messages' | 'calls';
  /** Section heading, already localized server-side */
  label: string;
  /** Type keys into `contentByType`, in display order */
  types: string[];
};
