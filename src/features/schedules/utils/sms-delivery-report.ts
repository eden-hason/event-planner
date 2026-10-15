/**
 * What ActiveTrail knows about one SMS.
 *
 * Every SMS we send is an Operational Message, which ActiveTrail files as its
 * own one-recipient campaign under the id we store as `external_message_id`.
 * Its campaign report (GET /api/smscampaignreport/{id}) therefore counts that
 * single message: `delivered` or `errors` is 1 once the carrier has answered.
 * The report carries no reason and no timestamp.
 */
export type SmsCampaignReport = {
  sent?: number;
  delivered?: number;
  errors?: number;
  unsubscribed?: number;
};

/** `unknown` is the carrier not having answered yet - never a failure. */
export type SmsReportOutcome = 'delivered' | 'failed' | 'unknown';

export function smsOutcomeFromReport(
  report: SmsCampaignReport | null | undefined,
): SmsReportOutcome {
  if ((report?.delivered ?? 0) > 0) return 'delivered';
  if ((report?.errors ?? 0) > 0) return 'failed';
  return 'unknown';
}

/** Written on an SMS attempt the provider reports as not delivered. */
export const SMS_NOT_DELIVERED_MESSAGE = 'ActiveTrail reported the SMS as not delivered';
