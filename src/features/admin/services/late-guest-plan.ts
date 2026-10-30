import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildCatchUpPlan,
  type CatchUpPlan,
  type CatchUpPlanRefusal,
} from '@/features/schedules/services/catch-up-plan';
import {
  catchUpExclusionLabel,
  catchUpNoteLabel,
  catchUpRejectionLabel,
  sendGateRefusalLabel,
} from '../utils/labels';

export type LateGuestCandidate = Omit<
  CatchUpPlan['eligible'][number],
  'note'
> & {
  /** Why an older record never got it, when it was in the audience at the time */
  note: string | null;
};

export type LateGuestExcluded = Omit<
  CatchUpPlan['excluded'][number],
  'reason'
> & {
  reason: string;
};

export type LateGuestPlan = Omit<CatchUpPlan, 'eligible' | 'excluded'> & {
  eligible: LateGuestCandidate[];
  excluded: LateGuestExcluded[];
};

export type LateGuestPlanResult =
  | { ok: true; plan: LateGuestPlan }
  | { ok: false; message: string };

function refusalLabel(reason: CatchUpPlanRefusal): string {
  switch (reason) {
    case 'not_found':
    case 'not_message':
    case 'sending_off':
      return sendGateRefusalLabel(reason);
    case 'package_unknown':
      return 'לא הצלחנו לבדוק את חבילת הרשומות';
    default:
      return catchUpRejectionLabel(reason);
  }
}

/**
 * The shared Catch-up plan (features/schedules, ADR 0050) for the Back
 * Office's late-guest send, worded in the Back Office's Hebrew (ADR 0037).
 * Recomputed on every call - that is the double-send guard.
 */
export async function buildLateGuestPlan(
  supabase: SupabaseClient,
  scheduleId: string,
  now: Date = new Date(),
): Promise<LateGuestPlanResult> {
  const result = await buildCatchUpPlan(supabase, scheduleId, { now });
  if (!result.ok) return { ok: false, message: refusalLabel(result.reason) };

  const { plan } = result;
  return {
    ok: true,
    plan: {
      ...plan,
      eligible: plan.eligible.map((guest) => ({
        ...guest,
        note: guest.note ? catchUpNoteLabel(guest.note) : null,
      })),
      excluded: plan.excluded.map((guest) => ({
        ...guest,
        reason: catchUpExclusionLabel(guest.reason),
      })),
    },
  };
}
