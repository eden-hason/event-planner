alter table "public"."guests" drop constraint "guests_rsvp_change_source_check";

alter table "public"."guests" add constraint "guests_rsvp_change_source_check" CHECK (((rsvp_change_source)::text = ANY ((ARRAY['manual'::character varying, 'guest'::character varying, 'admin_call'::character varying])::text[]))) not valid;

alter table "public"."guests" validate constraint "guests_rsvp_change_source_check";
