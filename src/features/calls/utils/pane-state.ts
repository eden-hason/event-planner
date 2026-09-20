/**
 * Which of a call round's five faces the Owner is looking at.
 *
 * One card that grows over the round's life rather than five layouts: locked
 * (the Event is unpaid), planned (not started), live (being worked), done
 * (the Operator declared it over) and off (called off by the Back Office).
 * Derived from the same status the timeline chip shows, so the two cannot
 * disagree about what state a round is in.
 */
export type CallPaneState = 'locked' | 'planned' | 'live' | 'done' | 'off';

export function callPaneState(status: string): CallPaneState {
  switch (status) {
    case 'locked':
      return 'locked';
    case 'cancelled':
      return 'off';
    case 'in_progress':
      return 'live';
    case 'completed':
      return 'done';
    default:
      // 'pending', and anything not taught to this switch, reads as a plan that
      // has not started - the state with the least to claim about a round.
      return 'planned';
  }
}
