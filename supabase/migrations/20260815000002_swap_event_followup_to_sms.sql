-- Point one confirmation follow-up at the SMS template instead of WhatsApp
-- (event c9a9c96b-b74f-45d7-96ba-f80163660d06, schedule
-- 2b2ef356-05ed-468d-a8e1-b22c721cc4b7). The first confirmation for this event
-- already went out over SMS, so the follow-up should reach the same guests on
-- the same channel.
--
-- Channel is derived from the assigned template, so swapping template_id is the
-- whole change. No-ops in environments where the row does not exist, which is
-- expected since this targets one event.

update public.schedules s
set template_id = (
  select id from public.message_templates
  where key = 'follow_up_confirmation_casual' and channel = 'sms'
)
where s.id = '2b2ef356-05ed-468d-a8e1-b22c721cc4b7'
  and s.status is null -- guard: never rewrite a schedule that already sent
  and s.template_id = (
    select id from public.message_templates
    where key = 'follow_up_confirmation_casual' and channel = 'whatsapp'
  ); -- guard: only swap if still on the WhatsApp follow-up
