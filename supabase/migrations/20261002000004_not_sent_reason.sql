-- A Delivery is `not_sent` when a Schedule's audience included the guest but no attempt
-- was made. Until now there was one reason - no usable phone number - so the status alone
-- said why, and Schedule Results printed "no phone number" for every such row.
--
-- The Record Package sending gate (ADR 0027) adds a second: the Guest Record was outside
-- the package when the Schedule sent. The Owner's fix is different (buy more records, not
-- add a number), so the reason has to be stored, at the moment the send skipped the guest.
--
-- Nullable, and only meaningful while status = 'not_sent': a later manual send that
-- reaches the guest rolls the status up from its attempts and leaves this behind, and
-- readers ignore it then.

alter table public.message_deliveries
  add column not_sent_reason text null,
  add constraint message_deliveries_not_sent_reason_check
    check (not_sent_reason is null or not_sent_reason in ('no_phone', 'outside_package'));

update public.message_deliveries
  set not_sent_reason = 'no_phone'
  where status = 'not_sent' and not_sent_reason is null;

do $$
declare
  v_missing integer;
begin
  select count(*) into v_missing
  from public.message_deliveries
  where status = 'not_sent' and not_sent_reason is null;

  if v_missing > 0 then
    raise exception 'not_sent_reason backfill missed % deliveries', v_missing;
  end if;
end;
$$;
