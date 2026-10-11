-- initial_invitation defaults move to save_the_date_1_no_button.
--
-- Every event type seeded its Invitation on save_the_date_1's text-only
-- WhatsApp row (20260919000004). New Events now seed on the
-- save_the_date_1_no_button family (20260923000001) instead, whose WhatsApp
-- row is the Meta template save_the_date_1_image_no_button: the invitation
-- image as header, no calendar button.
--
-- That family has only the image row, so an Event without an uploaded
-- invitation image fails to resolve its Invitation (a clear error at send
-- time) rather than falling back to text. Accepted on purpose: the Owner
-- uploads an image or points the Schedule at another family.
--
-- Only the catalog changes. Schedules already seeded keep save_the_date_1.

-- 1. The defaults ------------------------------------------------------------

update public.event_type_default_schedules eds
set template_id = (
  select id from public.message_templates
  where key = 'save_the_date_1_no_button' and channel = 'whatsapp'
    and requires_invitation_image
)
where eds.schedule_type_id = (select id from public.schedule_types where key = 'initial_invitation');

-- 2. Guard -------------------------------------------------------------------
-- Every event type's initial_invitation default points at the new row.

do $$
declare
  v_types_without int;
begin
  select count(*) into v_types_without
  from public.event_types et
  where et.key in ('wedding', 'henna', 'bar_mitzva', 'bat_mitzva')
    and not exists (
      select 1 from public.event_type_default_schedules eds
      join public.message_templates mt on mt.id = eds.template_id
      where eds.event_type_id = et.id
        and eds.schedule_type_id = (select id from public.schedule_types where key = 'initial_invitation')
        and mt.key = 'save_the_date_1_no_button'
        and mt.whatsapp_template_name = 'save_the_date_1_image_no_button'
    );
  if v_types_without > 0 then
    raise exception 'save_the_date_1_no_button_default: % event type(s) have no initial_invitation default on save_the_date_1_image_no_button', v_types_without;
  end if;
end $$;
