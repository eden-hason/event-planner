-- Put the thank-you SMS in the same template family as the thank-you WhatsApp.
--
-- SMS Fallback finds the SMS version of a schedule's template by the same key,
-- variant and language on the sms channel (ADR 0012). The post-event pair was
-- authored under two keys - thank_you_v1_he (WhatsApp) and thank_you_sms_v1_he
-- (SMS) - so a failed WhatsApp thank-you could never fall back. The key names a
-- message family; the channel is already its own column, and
-- message_templates_family_config_key includes it, so the two rows can share
-- one key.
--
-- Schedules reference templates by id, so no schedule changes. The SMS row's
-- copy is untouched.

update public.message_templates
set key = 'thank_you_v1_he'
where key = 'thank_you_sms_v1_he'
  and channel = 'sms';

do $$
begin
  if exists (select 1 from public.message_templates where key = 'thank_you_sms_v1_he') then
    raise exception 'align_thank_you_sms_key: thank_you_sms_v1_he still exists';
  end if;

  if (select count(*) from public.message_templates t
      join public.message_templates s
        on s.key = t.key and s.variant = t.variant and s.language_code = t.language_code
      where t.key = 'thank_you_v1_he' and t.channel = 'whatsapp' and s.channel = 'sms') = 0 then
    raise exception 'align_thank_you_sms_key: thank_you_v1_he has no SMS row in its family';
  end if;
end $$;
