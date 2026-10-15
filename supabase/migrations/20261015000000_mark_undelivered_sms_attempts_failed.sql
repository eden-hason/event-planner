-- SMS attempts are recorded as 'sent' the moment ActiveTrail accepts the request,
-- and nothing ever moves them again (docs/backlog/0001-sms-delivery-visibility.md).
-- A one-off check of every SMS against ActiveTrail's per-campaign report
-- (GET /api/smscampaignreport/{id}, 2026-10-15) found 47 that the provider reports
-- as errored and never delivered.
--
-- This corrects the 20 of them that belong to the three events still ahead of us
-- (יובל ומקסים 2026-11-08, אלונה ואריה 2026-11-04, בת המצווה של לורין 2026-11-04),
-- so an Operator can see those guests as failed in the Back Office and send to them
-- again. The rest are past events and are left as they are.
--
-- Only the attempt changes. The roll_up_message_delivery trigger carries it to the
-- parent Delivery: 18 have a failed WhatsApp attempt too and become 'failed'; the
-- two whose WhatsApp was sent or read keep that status, which is correct.
-- sent_at is kept - the request was accepted, and the Record it used stays used.

update public.message_delivery_attempts
set status        = 'failed',
    error_message = 'ActiveTrail reported the SMS as not delivered'
where channel = 'sms'
  and status = 'sent'
  and external_message_id in (
    -- יובל ומקסים
    '3652926', '3652928', '3652931', '3652933', '3652934', '3652935', '3652939',
    '3653597', '3653602', '3653610', '3654701',
    -- אלונה ואריה
    '3607037', '3607038', '3607039', '3607042', '3722007', '3722012', '3722013',
    -- בת המצווה של לורין
    '3680882', '3691336'
  );

-- Guard: none of the listed attempts may still read as sent. A database without
-- these rows (a fresh local reset) passes trivially.
do $$
declare
  v_left bigint;
begin
  select count(*) into v_left
  from public.message_delivery_attempts
  where channel = 'sms'
    and status = 'sent'
    and external_message_id in (
      '3652926', '3652928', '3652931', '3652933', '3652934', '3652935', '3652939',
      '3653597', '3653602', '3653610', '3654701',
      '3607037', '3607038', '3607039', '3607042', '3722007', '3722012', '3722013',
      '3680882', '3691336'
    );

  if v_left > 0 then
    raise exception 'mark_undelivered_sms_attempts_failed: % attempt(s) still sent', v_left;
  end if;
end $$;
