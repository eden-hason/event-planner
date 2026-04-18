


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."PRICING_PLAN" AS ENUM (
    'basic',
    'pro'
);


ALTER TYPE "public"."PRICING_PLAN" OWNER TO "postgres";


CREATE TYPE "public"."RSVP_STATUS" AS ENUM (
    'pending',
    'confirmed',
    'declined'
);


ALTER TYPE "public"."RSVP_STATUS" OWNER TO "postgres";


CREATE TYPE "public"."audit_action" AS ENUM (
    'invited',
    'accepted',
    'declined',
    'removed',
    'role_changed',
    'scope_changed'
);


ALTER TYPE "public"."audit_action" OWNER TO "postgres";


CREATE TYPE "public"."collaborator_role" AS ENUM (
    'owner',
    'seating_manager'
);


ALTER TYPE "public"."collaborator_role" OWNER TO "postgres";


CREATE TYPE "public"."cta_type" AS ENUM (
    'view_invitation',
    'confirm_rsvp',
    'view_directions',
    'view_photos',
    'none'
);


ALTER TYPE "public"."cta_type" OWNER TO "postgres";


CREATE TYPE "public"."delivery_method" AS ENUM (
    'whatsapp',
    'sms'
);


ALTER TYPE "public"."delivery_method" OWNER TO "postgres";


CREATE TYPE "public"."delivery_status" AS ENUM (
    'pending',
    'sent',
    'delivered',
    'read',
    'failed'
);


ALTER TYPE "public"."delivery_status" OWNER TO "postgres";


CREATE TYPE "public"."event_type" AS ENUM (
    'wedding',
    'birthday',
    'corporate',
    'other'
);


ALTER TYPE "public"."event_type" OWNER TO "postgres";


CREATE TYPE "public"."interaction_type" AS ENUM (
    'view',
    'click',
    'rsvp_confirm',
    'rsvp_decline',
    'update_guests',
    'share'
);


ALTER TYPE "public"."interaction_type" OWNER TO "postgres";


CREATE TYPE "public"."invitation_status" AS ENUM (
    'pending',
    'accepted',
    'declined',
    'expired'
);


ALTER TYPE "public"."invitation_status" OWNER TO "postgres";


CREATE TYPE "public"."message_type" AS ENUM (
    'initial_invitation',
    'first_confirmation',
    'second_confirmation',
    'event_reminder',
    'thank_you'
);


ALTER TYPE "public"."message_type" OWNER TO "postgres";


CREATE TYPE "public"."schedule_action_type" AS ENUM (
    'initial_invitation',
    'confirmation',
    'event_reminder',
    'post_event'
);


ALTER TYPE "public"."schedule_action_type" OWNER TO "postgres";


CREATE TYPE "public"."schedule_completion_status" AS ENUM (
    'sent',
    'cancelled'
);


ALTER TYPE "public"."schedule_completion_status" OWNER TO "postgres";


CREATE TYPE "public"."schedule_status_enum" AS ENUM (
    'active',
    'paused',
    'completed',
    'draft'
);


ALTER TYPE "public"."schedule_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."schedule_type_enum" AS ENUM (
    'invite',
    'followup',
    'reminder',
    'thankyou'
);


ALTER TYPE "public"."schedule_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."trigger_strategy_enum" AS ENUM (
    'absolute_date',
    'days_before_event',
    'days_after_event',
    'immediate'
);


ALTER TYPE "public"."trigger_strategy_enum" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accept_collaboration_invitation"("p_token" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$                                                                     
  DECLARE                                                                                
    v_invitation record;
    v_user_id uuid;
    v_user_email text;
    v_collaborator_id uuid;
  BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
      RETURN json_build_object('success', false, 'message', 'You must be logged in.');
    END IF;

    v_user_email := auth.jwt() ->> 'email';

    SELECT * INTO v_invitation
    FROM public.collaboration_invitations
    WHERE token = p_token;

    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'message', 'Invitation not found.');
    END IF;

    IF v_invitation.status != 'pending' THEN
      RETURN json_build_object('success', false, 'message',
        'This invitation has already been ' || v_invitation.status || '.');
    END IF;

    IF v_invitation.expires_at < now() THEN
      RETURN json_build_object('success', false, 'message', 'This invitation has
  expired.');
    END IF;

    IF v_invitation.invited_email != v_user_email THEN
      RETURN json_build_object('success', false, 'message',
        'This invitation was sent to a different email address.');
    END IF;

    BEGIN
      INSERT INTO public.event_collaborators (event_id, user_id, role, is_creator)
      VALUES (v_invitation.event_id, v_user_id, v_invitation.role, false)
      RETURNING id INTO v_collaborator_id;
    EXCEPTION WHEN unique_violation THEN
      RETURN json_build_object('success', false, 'message',
        'You are already a collaborator on this event.');
    END;

    IF v_invitation.role = 'seating_manager' THEN
      IF v_invitation.scope_groups IS NOT NULL THEN
        INSERT INTO public.collaborator_guest_scope (collaborator_id, group_id)
        SELECT v_collaborator_id, unnest(v_invitation.scope_groups);
      END IF;
      IF v_invitation.scope_guests IS NOT NULL THEN
        INSERT INTO public.collaborator_guest_scope (collaborator_id, guest_id)
        SELECT v_collaborator_id, unnest(v_invitation.scope_guests);
      END IF;
    END IF;

    UPDATE public.collaboration_invitations
    SET status = 'accepted', responded_at = now()
    WHERE id = v_invitation.id;

    INSERT INTO public.collaboration_audit_log (event_id, actor_id, target_email, action,
   metadata)
    VALUES (v_invitation.event_id, v_user_id, v_user_email, 'accepted',
      json_build_object('role', v_invitation.role)::jsonb);

    RETURN json_build_object(
      'success', true,
      'message', 'Invitation accepted! You now have access to this event.',
      'event_id', v_invitation.event_id
    );
  END;
  $$;


ALTER FUNCTION "public"."accept_collaboration_invitation"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_add_event_creator"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.event_collaborators (event_id, user_id, role, is_creator)
  VALUES (NEW.id, NEW.user_id, 'owner', true);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_add_event_creator"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_invitation_by_token"("p_token" "text") RETURNS json
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$                                                                     
    SELECT row_to_json(t) FROM (                                                         
      SELECT
        ci.*,
        e.title AS event_title
      FROM public.collaboration_invitations ci
      JOIN public.events e ON e.id = ci.event_id
      WHERE ci.token = p_token
      LIMIT 1
    ) t
  $$;


ALTER FUNCTION "public"."get_invitation_by_token"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url', -- Added comma here
    NEW.email -- This will now be included
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_new_user"() IS 'Automatically creates a new profile row when a new user signs up.';



CREATE OR REPLACE FUNCTION "public"."seed_sandbox_data"("p_user_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_event_id          uuid;
  v_invite_sched_id   uuid;
  v_confirm_sched_id  uuid;
  v_reminder_sched_id uuid;
  v_thankyou_sched_id uuid;
  v_group_ids         uuid[];

  v_event_date  timestamptz := '2026-05-15 18:00:00+03';
  v_inv_sent    timestamptz;
  v_con_sent    timestamptz;
  v_rem_sent    timestamptz;
  v_tku_sent    timestamptz;

  v_female_names text[] := ARRAY[
    'נועה','מאיה','תמר','יעל','שירה','אביגיל','מיכל','טל','עינת','רונית',
    'אורלי','הילה','דנה','ליאור','גלית','קרן','לימור','הגית','ענת','דפנה',
    'רינה','נגה','חן','לירון','שרון','ורד','יפית','רחל','שושנה','רעות'
  ];
  v_male_names text[] := ARRAY[
    'אבי','יוסי','משה','דוד','איתן','רועי','עומר','גל','ניר','אמיר',
    'אור','לוי','דורון','גיא','שי','רן','יאיר','דני','ברק','קובי',
    'תום','נתן','איתי','שלומי','ידיד','בן','רז','עמית','אלון','גדי'
  ];
  v_last_names text[] := ARRAY[
    'כהן','לוי','מזרחי','פרץ','כץ','שפירו','גולדברג','אשכנזי','בן דוד','פרידמן',
    'מור','בר','סבן','דהן','מלכה','ביטון','אזולאי','נחמיאס','בן עמי','שטיין',
    'זיו','הדר','פז','צור','אברהם','גבאי','חיים','שלום','קדוש','פינטו'
  ];
  v_prefixes text[] := ARRAY['050','052','053','054','055','058'];

  i            int;
  v_r          float;
  v_guest_id   uuid;
  v_first_name text;
  v_last_name  text;
  v_phone      text;
  v_rsvp       "RSVP_STATUS";
  v_group_id   uuid;
  v_amount     int;
  v_d_status   delivery_status;
  v_sent_ts    timestamptz;
  v_deliv_ts   timestamptz;
  v_read_ts    timestamptz;

  v_n_guests   int := 0;
  v_n_delivs   int := 0;
BEGIN
  v_inv_sent := v_event_date - interval '90 days';
  v_con_sent := v_event_date - interval '60 days';
  v_rem_sent := v_event_date - interval '7 days';
  v_tku_sent := v_event_date + interval '1 day';

  v_group_ids := ARRAY[
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid()
  ];

  -- Cleanup any previous sandbox event (cascades all child rows)
  DELETE FROM events WHERE user_id = p_user_id AND title LIKE 'SANDBOX%';

  -- ── Event ─────────────────────────────────────────────────────────────────────
  -- Note: trg_auto_add_event_creator trigger handles event_collaborators insert
  INSERT INTO events (user_id, title, description, event_type, status, event_date, host_details, event_settings)
  VALUES (
    p_user_id,
    'SANDBOX – חתונת גיא ונועה',
    'אירוע הדגמה לבדיקות',
    'wedding', 'published', v_event_date,
    '{"bride_name":"נועה כהן","groom_name":"גיא לוי","contact_phone":"0541234567"}'::jsonb,
    '{}'::jsonb
  )
  RETURNING id INTO v_event_id;

  -- ── Groups ────────────────────────────────────────────────────────────────────
  INSERT INTO groups (id, event_id, name, side, icon) VALUES
    (v_group_ids[1], v_event_id, 'משפחת הכלה',    'bride', 'IconUsers'),
    (v_group_ids[2], v_event_id, 'משפחת החתן',    'groom', 'IconUsers'),
    (v_group_ids[3], v_event_id, 'חברות של הכלה',  'bride', 'IconUsers'),
    (v_group_ids[4], v_event_id, 'חברים של החתן',  'groom', 'IconUsers'),
    (v_group_ids[5], v_event_id, 'עמיתי עבודה',   null,    'IconBriefcase'),
    (v_group_ids[6], v_event_id, 'אחרים',          null,    'IconStar');

  -- ── Guests (200) ──────────────────────────────────────────────────────────────
  FOR i IN 1..200 LOOP
    v_r := random();
    IF v_r < 0.5 THEN
      v_first_name := v_female_names[1 + (floor(random() * 30))::int];
    ELSE
      v_first_name := v_male_names[1 + (floor(random() * 30))::int];
    END IF;
    v_last_name := v_last_names[1 + (floor(random() * 30))::int];
    v_phone     := v_prefixes[1 + (floor(random() * 6))::int]
                   || lpad((floor(random() * 10000000))::int::text, 7, '0');

    v_group_id := CASE
      WHEN i <= 40  THEN v_group_ids[1]
      WHEN i <= 80  THEN v_group_ids[2]
      WHEN i <= 120 THEN v_group_ids[3]
      WHEN i <= 160 THEN v_group_ids[4]
      WHEN i <= 180 THEN v_group_ids[5]
      ELSE               v_group_ids[6]
    END;

    v_r := random();
    IF    v_r < 0.55 THEN v_rsvp := 'confirmed';
    ELSIF v_r < 0.70 THEN v_rsvp := 'declined';
    ELSE                   v_rsvp := 'pending';
    END IF;

    v_r := random();
    v_amount := CASE
      WHEN v_r < 0.45 THEN 1
      WHEN v_r < 0.80 THEN 2
      WHEN v_r < 0.94 THEN 3
      ELSE 4
    END;

    INSERT INTO guests (event_id, name, phone_number, rsvp_status, amount, group_id, created_at)
    VALUES (
      v_event_id,
      v_first_name || ' ' || v_last_name,
      v_phone, v_rsvp, v_amount, v_group_id,
      v_inv_sent + (random() * interval '3 days')
    );
    v_n_guests := v_n_guests + 1;
  END LOOP;

  -- ── Schedules ─────────────────────────────────────────────────────────────────
  INSERT INTO schedules (event_id, action_type, template_key, delivery_method, target_status, status, scheduled_date, sent_at)
  VALUES (v_event_id, 'initial_invitation', 'initial_invitation', 'whatsapp', 'pending', 'sent', v_inv_sent, v_inv_sent)
  RETURNING id INTO v_invite_sched_id;

  INSERT INTO schedules (event_id, action_type, template_key, delivery_method, target_status, status, scheduled_date, sent_at)
  VALUES (v_event_id, 'confirmation', 'confirmation_casual_v1_he', 'whatsapp', 'pending', 'sent', v_con_sent, v_con_sent)
  RETURNING id INTO v_confirm_sched_id;

  INSERT INTO schedules (event_id, action_type, template_key, delivery_method, target_status, status, scheduled_date, sent_at)
  VALUES (v_event_id, 'event_reminder', 'event_reminder_v1_he', 'whatsapp', 'confirmed', 'sent', v_rem_sent, v_rem_sent)
  RETURNING id INTO v_reminder_sched_id;

  INSERT INTO schedules (event_id, action_type, template_key, delivery_method, target_status, status, scheduled_date, sent_at)
  VALUES (v_event_id, 'post_event', 'thank_you_v1_he', 'whatsapp', 'confirmed', 'sent', v_tku_sent, v_tku_sent)
  RETURNING id INTO v_thankyou_sched_id;

  -- ── Message deliveries ────────────────────────────────────────────────────────

  -- Initial invitation → all 200 guests
  FOR v_guest_id IN SELECT id FROM guests WHERE event_id = v_event_id LOOP
    v_r := random();
    IF    v_r < 0.82 THEN v_d_status := 'read';
    ELSIF v_r < 0.90 THEN v_d_status := 'delivered';
    ELSIF v_r < 0.95 THEN v_d_status := 'sent';
    ELSE                   v_d_status := 'failed';
    END IF;
    v_sent_ts  := v_inv_sent + (random() * interval '10 minutes');
    v_deliv_ts := CASE WHEN v_d_status IN ('delivered','read') THEN v_sent_ts  + (random() * interval '15 minutes') ELSE null END;
    v_read_ts  := CASE WHEN v_d_status = 'read'               THEN v_deliv_ts + (random() * interval '120 minutes') ELSE null END;
    INSERT INTO message_deliveries (schedule_id, guest_id, status, delivery_method, sent_at, delivered_at, read_at, created_at)
    VALUES (v_invite_sched_id, v_guest_id, v_d_status, 'whatsapp', v_sent_ts, v_deliv_ts, v_read_ts, v_inv_sent);
    v_n_delivs := v_n_delivs + 1;
  END LOOP;

  -- Confirmation → all guests
  FOR v_guest_id IN SELECT id FROM guests WHERE event_id = v_event_id LOOP
    v_r := random();
    IF    v_r < 0.77 THEN v_d_status := 'read';
    ELSIF v_r < 0.87 THEN v_d_status := 'delivered';
    ELSIF v_r < 0.93 THEN v_d_status := 'sent';
    ELSE                   v_d_status := 'failed';
    END IF;
    v_sent_ts  := v_con_sent + (random() * interval '10 minutes');
    v_deliv_ts := CASE WHEN v_d_status IN ('delivered','read') THEN v_sent_ts  + (random() * interval '15 minutes') ELSE null END;
    v_read_ts  := CASE WHEN v_d_status = 'read'               THEN v_deliv_ts + (random() * interval '120 minutes') ELSE null END;
    INSERT INTO message_deliveries (schedule_id, guest_id, status, delivery_method, sent_at, delivered_at, read_at, created_at)
    VALUES (v_confirm_sched_id, v_guest_id, v_d_status, 'whatsapp', v_sent_ts, v_deliv_ts, v_read_ts, v_con_sent);
    v_n_delivs := v_n_delivs + 1;
  END LOOP;

  -- Event reminder → confirmed guests only
  FOR v_guest_id IN SELECT id FROM guests WHERE event_id = v_event_id AND rsvp_status = 'confirmed' LOOP
    v_r := random();
    IF    v_r < 0.88 THEN v_d_status := 'read';
    ELSIF v_r < 0.94 THEN v_d_status := 'delivered';
    ELSIF v_r < 0.97 THEN v_d_status := 'sent';
    ELSE                   v_d_status := 'failed';
    END IF;
    v_sent_ts  := v_rem_sent + (random() * interval '10 minutes');
    v_deliv_ts := CASE WHEN v_d_status IN ('delivered','read') THEN v_sent_ts  + (random() * interval '10 minutes') ELSE null END;
    v_read_ts  := CASE WHEN v_d_status = 'read'               THEN v_deliv_ts + (random() * interval '60 minutes') ELSE null END;
    INSERT INTO message_deliveries (schedule_id, guest_id, status, delivery_method, sent_at, delivered_at, read_at, created_at)
    VALUES (v_reminder_sched_id, v_guest_id, v_d_status, 'whatsapp', v_sent_ts, v_deliv_ts, v_read_ts, v_rem_sent);
    v_n_delivs := v_n_delivs + 1;
  END LOOP;

  -- Thank you → confirmed guests only
  FOR v_guest_id IN SELECT id FROM guests WHERE event_id = v_event_id AND rsvp_status = 'confirmed' LOOP
    v_r := random();
    IF    v_r < 0.74 THEN v_d_status := 'read';
    ELSIF v_r < 0.84 THEN v_d_status := 'delivered';
    ELSIF v_r < 0.91 THEN v_d_status := 'sent';
    ELSE                   v_d_status := 'failed';
    END IF;
    v_sent_ts  := v_tku_sent + (random() * interval '10 minutes');
    v_deliv_ts := CASE WHEN v_d_status IN ('delivered','read') THEN v_sent_ts  + (random() * interval '15 minutes') ELSE null END;
    v_read_ts  := CASE WHEN v_d_status = 'read'               THEN v_deliv_ts + (random() * interval '180 minutes') ELSE null END;
    INSERT INTO message_deliveries (schedule_id, guest_id, status, delivery_method, sent_at, delivered_at, read_at, created_at)
    VALUES (v_thankyou_sched_id, v_guest_id, v_d_status, 'whatsapp', v_sent_ts, v_deliv_ts, v_read_ts, v_tku_sent);
    v_n_delivs := v_n_delivs + 1;
  END LOOP;

  -- ── Guest interactions ─────────────────────────────────────────────────────────
  FOR v_guest_id IN
    SELECT md.guest_id
    FROM message_deliveries md
    WHERE md.schedule_id = v_invite_sched_id AND md.status = 'read' AND random() < 0.6
  LOOP
    INSERT INTO guest_interactions (guest_id, schedule_id, interaction_type, metadata, created_at)
    VALUES (v_guest_id, v_invite_sched_id, 'view', '{}', v_inv_sent + (random() * interval '3 hours'));

    IF random() < 0.65 THEN
      INSERT INTO guest_interactions (guest_id, schedule_id, interaction_type, metadata, created_at)
      VALUES (v_guest_id, v_invite_sched_id, 'click', '{}', v_inv_sent + (random() * interval '4 hours'));
    END IF;
  END LOOP;

  FOR v_guest_id IN
    SELECT g.id FROM guests g
    WHERE g.event_id = v_event_id AND g.rsvp_status = 'confirmed' AND random() < 0.5
  LOOP
    INSERT INTO guest_interactions (guest_id, schedule_id, interaction_type, metadata, created_at)
    VALUES (
      v_guest_id, v_invite_sched_id, 'rsvp_confirm',
      jsonb_build_object('guest_count', 1 + (floor(random() * 3))::int),
      v_inv_sent + (random() * interval '48 hours')
    );
  END LOOP;

  FOR v_guest_id IN
    SELECT g.id FROM guests g
    WHERE g.event_id = v_event_id AND g.rsvp_status = 'declined' AND random() < 0.4
  LOOP
    INSERT INTO guest_interactions (guest_id, schedule_id, interaction_type, metadata, created_at)
    VALUES (v_guest_id, v_invite_sched_id, 'rsvp_decline', '{}', v_inv_sent + (random() * interval '72 hours'));
  END LOOP;

  RETURN format(
    'Sandbox ready — event_id: %s | guests: %s | message_deliveries: %s',
    v_event_id, v_n_guests, v_n_delivs
  );
END;
$$;


ALTER FUNCTION "public"."seed_sandbox_data"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_delivery_sent_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.status IN ('sent', 'delivered', 'read') AND OLD.status = 'pending' THEN
    NEW.sent_at = NOW();
  END IF;
  IF NEW.status IN ('delivered', 'read') AND OLD.status = 'sent' THEN
    NEW.delivered_at = NOW();
  END IF;
  IF NEW.status = 'read' AND OLD.status IN ('sent', 'delivered') THEN
    NEW.read_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_delivery_sent_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_schedule_sent_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.status = 'sent' AND OLD.status != 'sent' THEN
    NEW.sent_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_schedule_sent_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_groups_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_groups_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_event_access"("p_event_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_collaborators
    WHERE event_id = p_event_id AND user_id = auth.uid()
  )
$$;


ALTER FUNCTION "public"."user_has_event_access"("p_event_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_is_event_owner"("p_event_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_collaborators
    WHERE event_id = p_event_id
      AND user_id = auth.uid()
      AND role = 'owner'
  )
$$;


ALTER FUNCTION "public"."user_is_event_owner"("p_event_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."collaboration_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "actor_id" "uuid" NOT NULL,
    "target_email" "text",
    "action" "public"."audit_action" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."collaboration_audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."collaboration_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "invited_email" "text" NOT NULL,
    "role" "public"."collaborator_role" NOT NULL,
    "token" "text" NOT NULL,
    "status" "public"."invitation_status" DEFAULT 'pending'::"public"."invitation_status" NOT NULL,
    "scope_groups" "uuid"[] DEFAULT '{}'::"uuid"[],
    "scope_guests" "uuid"[] DEFAULT '{}'::"uuid"[],
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval) NOT NULL,
    "responded_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."collaboration_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."collaborator_guest_scope" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "collaborator_id" "uuid" NOT NULL,
    "guest_id" "uuid",
    "group_id" "uuid",
    CONSTRAINT "scope_has_target" CHECK ((("guest_id" IS NOT NULL) OR ("group_id" IS NOT NULL)))
);


ALTER TABLE "public"."collaborator_guest_scope" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_collaborators" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."collaborator_role" NOT NULL,
    "is_creator" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."event_collaborators" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "event_date" timestamp with time zone NOT NULL,
    "event_type" "text",
    "status" "text" DEFAULT 'draft'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_default" boolean,
    "event_settings" "jsonb" DEFAULT '{}'::"jsonb",
    "host_details" "jsonb",
    "reception_time" "text",
    "ceremony_time" "text",
    "location" "jsonb",
    "invitations" "jsonb",
    "guests_experience" "jsonb",
    "guests_estimate" "text",
    CONSTRAINT "events_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."events" OWNER TO "postgres";


COMMENT ON COLUMN "public"."events"."guests_experience" IS 'Guest experience options: { "dietary_options": boolean }';



CREATE TABLE IF NOT EXISTS "public"."groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid",
    "name" character varying(100) NOT NULL,
    "description" character varying(500),
    "icon" character varying(50) DEFAULT 'IconUsers'::character varying,
    "side" character varying(10),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "groups_side_check" CHECK ((("side")::"text" = ANY ((ARRAY['bride'::character varying, 'groom'::character varying])::"text"[])))
);


ALTER TABLE "public"."groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."guest_interactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "guest_id" "uuid" NOT NULL,
    "schedule_id" "uuid" NOT NULL,
    "interaction_type" "public"."interaction_type" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."guest_interactions" OWNER TO "postgres";


COMMENT ON TABLE "public"."guest_interactions" IS 'Records all guest interactions with messages for detailed analytics';



CREATE TABLE IF NOT EXISTS "public"."guests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid",
    "name" character varying(255) NOT NULL,
    "phone_number" character varying(20),
    "amount" integer DEFAULT 1,
    "dietary_restrictions" "text",
    "notes" "text",
    "rsvp_status" "public"."RSVP_STATUS" DEFAULT 'pending'::"public"."RSVP_STATUS",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "group_id" "uuid",
    "rsvp_changed_by" "uuid",
    "rsvp_changed_by_name" character varying(255),
    "rsvp_changed_at" timestamp with time zone,
    "rsvp_change_source" character varying(10),
    CONSTRAINT "guests_rsvp_change_source_check" CHECK ((("rsvp_change_source")::"text" = ANY ((ARRAY['manual'::character varying, 'guest'::character varying])::"text"[])))
);


ALTER TABLE "public"."guests" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."guests_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."guests_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."guests_id_seq" OWNED BY "public"."guests"."id";



CREATE TABLE IF NOT EXISTS "public"."message_deliveries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "schedule_id" "uuid" NOT NULL,
    "guest_id" "uuid" NOT NULL,
    "status" "public"."delivery_status" DEFAULT 'pending'::"public"."delivery_status",
    "sent_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "read_at" timestamp with time zone,
    "clicked_at" timestamp with time zone,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "confirmation_token" character varying(64),
    "delivery_method" "text" DEFAULT 'whatsapp'::"text" NOT NULL,
    "external_message_id" character varying(255),
    CONSTRAINT "message_deliveries_delivery_method_check" CHECK (("delivery_method" = ANY (ARRAY['whatsapp'::"text", 'sms'::"text"]))),
    CONSTRAINT "valid_status_timestamps" CHECK (((("status" = 'sent'::"public"."delivery_status") AND ("sent_at" IS NOT NULL)) OR ("status" <> 'sent'::"public"."delivery_status")))
);


ALTER TABLE "public"."message_deliveries" OWNER TO "postgres";


COMMENT ON TABLE "public"."message_deliveries" IS 'Tracks individual message delivery status per guest';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "avatar_url" "text",
    "email" "text",
    "initial_setup_complete" boolean,
    "phone_number" "text",
    "pricing_plan" "public"."PRICING_PLAN"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'Stores public profile information for each user.';



CREATE TABLE IF NOT EXISTS "public"."schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "scheduled_date" timestamp with time zone NOT NULL,
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "delivery_method" "public"."delivery_method" DEFAULT 'whatsapp'::"public"."delivery_method" NOT NULL,
    "target_status" "text",
    "action_type" "public"."schedule_action_type" NOT NULL,
    "status" "public"."schedule_completion_status",
    "template_key" "text",
    CONSTRAINT "schedules_target_status_check" CHECK (("target_status" = ANY (ARRAY['pending'::"text", 'confirmed'::"text"])))
);


ALTER TABLE "public"."schedules" OWNER TO "postgres";


COMMENT ON TABLE "public"."schedules" IS 'Stores scheduled messages for events with timing and targeting configuration';



COMMENT ON COLUMN "public"."schedules"."delivery_method" IS 'Method for delivering scheduled messages: whatsapp or sms';



ALTER TABLE ONLY "public"."collaboration_audit_log"
    ADD CONSTRAINT "collaboration_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."collaboration_invitations"
    ADD CONSTRAINT "collaboration_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."collaboration_invitations"
    ADD CONSTRAINT "collaboration_invitations_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."collaborator_guest_scope"
    ADD CONSTRAINT "collaborator_guest_scope_collaborator_id_group_id_key" UNIQUE ("collaborator_id", "group_id");



ALTER TABLE ONLY "public"."collaborator_guest_scope"
    ADD CONSTRAINT "collaborator_guest_scope_collaborator_id_guest_id_key" UNIQUE ("collaborator_id", "guest_id");



ALTER TABLE ONLY "public"."collaborator_guest_scope"
    ADD CONSTRAINT "collaborator_guest_scope_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_collaborators"
    ADD CONSTRAINT "event_collaborators_event_id_user_id_key" UNIQUE ("event_id", "user_id");



ALTER TABLE ONLY "public"."event_collaborators"
    ADD CONSTRAINT "event_collaborators_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guest_interactions"
    ADD CONSTRAINT "guest_interactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guests"
    ADD CONSTRAINT "guests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_deliveries"
    ADD CONSTRAINT "message_deliveries_confirmation_token_key" UNIQUE ("confirmation_token");



ALTER TABLE ONLY "public"."message_deliveries"
    ADD CONSTRAINT "message_deliveries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schedules"
    ADD CONSTRAINT "schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_deliveries"
    ADD CONSTRAINT "unique_schedule_guest" UNIQUE ("schedule_id", "guest_id");



CREATE INDEX "idx_audit_log_event" ON "public"."collaboration_audit_log" USING "btree" ("event_id");



CREATE INDEX "idx_collab_guest_scope_collab" ON "public"."collaborator_guest_scope" USING "btree" ("collaborator_id");



CREATE INDEX "idx_collab_invitations_event" ON "public"."collaboration_invitations" USING "btree" ("event_id");



CREATE INDEX "idx_collab_invitations_token" ON "public"."collaboration_invitations" USING "btree" ("token");



CREATE INDEX "idx_event_collaborators_event" ON "public"."event_collaborators" USING "btree" ("event_id");



CREATE INDEX "idx_event_collaborators_user" ON "public"."event_collaborators" USING "btree" ("user_id");



CREATE INDEX "idx_groups_event_id" ON "public"."groups" USING "btree" ("event_id");



CREATE UNIQUE INDEX "idx_groups_event_name" ON "public"."groups" USING "btree" ("event_id", "name");



CREATE INDEX "idx_guest_interactions_created_at" ON "public"."guest_interactions" USING "btree" ("created_at");



CREATE INDEX "idx_guest_interactions_guest_id" ON "public"."guest_interactions" USING "btree" ("guest_id");



CREATE INDEX "idx_guest_interactions_schedule_id" ON "public"."guest_interactions" USING "btree" ("schedule_id");



CREATE INDEX "idx_guest_interactions_type" ON "public"."guest_interactions" USING "btree" ("interaction_type");



CREATE INDEX "idx_guests_group_id" ON "public"."guests" USING "btree" ("group_id");



CREATE INDEX "idx_message_deliveries_confirmation_token" ON "public"."message_deliveries" USING "btree" ("confirmation_token") WHERE ("confirmation_token" IS NOT NULL);



CREATE INDEX "idx_message_deliveries_guest_id" ON "public"."message_deliveries" USING "btree" ("guest_id");



CREATE INDEX "idx_message_deliveries_schedule_id" ON "public"."message_deliveries" USING "btree" ("schedule_id");



CREATE INDEX "idx_message_deliveries_status" ON "public"."message_deliveries" USING "btree" ("status");



CREATE INDEX "idx_schedules_event_id" ON "public"."schedules" USING "btree" ("event_id");



CREATE INDEX "idx_schedules_scheduled_date" ON "public"."schedules" USING "btree" ("scheduled_date");



CREATE OR REPLACE TRIGGER "auto_set_delivery_timestamps" BEFORE UPDATE ON "public"."message_deliveries" FOR EACH ROW EXECUTE FUNCTION "public"."set_delivery_sent_at"();



CREATE OR REPLACE TRIGGER "auto_set_schedule_sent_at" BEFORE UPDATE ON "public"."schedules" FOR EACH ROW EXECUTE FUNCTION "public"."set_schedule_sent_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."event_collaborators" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_auto_add_event_creator" AFTER INSERT ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."auto_add_event_creator"();



CREATE OR REPLACE TRIGGER "trigger_groups_updated_at" BEFORE UPDATE ON "public"."groups" FOR EACH ROW EXECUTE FUNCTION "public"."update_groups_updated_at"();



CREATE OR REPLACE TRIGGER "update_guests_updated_at" BEFORE UPDATE ON "public"."guests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_message_deliveries_updated_at" BEFORE UPDATE ON "public"."message_deliveries" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_schedules_updated_at" BEFORE UPDATE ON "public"."schedules" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."collaboration_audit_log"
    ADD CONSTRAINT "collaboration_audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."collaboration_audit_log"
    ADD CONSTRAINT "collaboration_audit_log_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."collaboration_invitations"
    ADD CONSTRAINT "collaboration_invitations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."collaboration_invitations"
    ADD CONSTRAINT "collaboration_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."collaborator_guest_scope"
    ADD CONSTRAINT "collaborator_guest_scope_collaborator_id_fkey" FOREIGN KEY ("collaborator_id") REFERENCES "public"."event_collaborators"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."collaborator_guest_scope"
    ADD CONSTRAINT "collaborator_guest_scope_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."collaborator_guest_scope"
    ADD CONSTRAINT "collaborator_guest_scope_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_collaborators"
    ADD CONSTRAINT "event_collaborators_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_collaborators"
    ADD CONSTRAINT "event_collaborators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."event_collaborators"
    ADD CONSTRAINT "event_collaborators_user_id_profiles_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guest_interactions"
    ADD CONSTRAINT "guest_interactions_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guest_interactions"
    ADD CONSTRAINT "guest_interactions_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guests"
    ADD CONSTRAINT "guests_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guests"
    ADD CONSTRAINT "guests_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."guests"
    ADD CONSTRAINT "guests_rsvp_changed_by_fkey" FOREIGN KEY ("rsvp_changed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."message_deliveries"
    ADD CONSTRAINT "message_deliveries_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_deliveries"
    ADD CONSTRAINT "message_deliveries_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schedules"
    ADD CONSTRAINT "schedules_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



CREATE POLICY "Creator can update events" ON "public"."events" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Enable users to view their own data only" ON "public"."events" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Guests can create interactions" ON "public"."guest_interactions" FOR INSERT WITH CHECK (true);



CREATE POLICY "Owners can delete groups" ON "public"."groups" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."events"
  WHERE (("events"."id" = "groups"."event_id") AND ("events"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Service role can manage deliveries" ON "public"."message_deliveries" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Users can create guests for their events" ON "public"."guests" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."events"
  WHERE (("events"."id" = "guests"."event_id") AND ("events"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can create schedules for own events" ON "public"."schedules" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."events"
  WHERE (("events"."id" = "schedules"."event_id") AND ("events"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete guests from their events" ON "public"."guests" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."events"
  WHERE (("events"."id" = "guests"."event_id") AND ("events"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete own event schedules" ON "public"."schedules" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."events"
  WHERE (("events"."id" = "schedules"."event_id") AND ("events"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert deliveries for their schedules" ON "public"."message_deliveries" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."schedules" "s"
     JOIN "public"."events" "e" ON (("e"."id" = "s"."event_id")))
  WHERE (("s"."id" = "message_deliveries"."schedule_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update guests in their events" ON "public"."guests" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."events"
  WHERE (("events"."id" = "guests"."event_id") AND ("events"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."events"
  WHERE (("events"."id" = "guests"."event_id") AND ("events"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update own event schedules" ON "public"."schedules" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."events"
  WHERE (("events"."id" = "schedules"."event_id") AND ("events"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view deliveries for their events" ON "public"."message_deliveries" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."schedules" "s"
     JOIN "public"."events" "e" ON (("e"."id" = "s"."event_id")))
  WHERE (("s"."id" = "message_deliveries"."schedule_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view guests from their events" ON "public"."guests" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."events"
  WHERE (("events"."id" = "guests"."event_id") AND ("events"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view own event deliveries" ON "public"."message_deliveries" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."schedules"
     JOIN "public"."events" ON (("events"."id" = "schedules"."event_id")))
  WHERE (("schedules"."id" = "message_deliveries"."schedule_id") AND ("events"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view own event interactions" ON "public"."guest_interactions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."schedules"
     JOIN "public"."events" ON (("events"."id" = "schedules"."event_id")))
  WHERE (("schedules"."id" = "guest_interactions"."schedule_id") AND ("events"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view own event schedules" ON "public"."schedules" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."events"
  WHERE (("events"."id" = "schedules"."event_id") AND ("events"."user_id" = "auth"."uid"())))));



CREATE POLICY "cal_insert" ON "public"."collaboration_audit_log" FOR INSERT TO "authenticated" WITH CHECK (("actor_id" = "auth"."uid"()));



CREATE POLICY "cal_select" ON "public"."collaboration_audit_log" FOR SELECT TO "authenticated" USING (("public"."user_is_event_owner"("event_id") OR ("event_id" IN ( SELECT "events"."id"
   FROM "public"."events"
  WHERE ("events"."user_id" = "auth"."uid"())))));



CREATE POLICY "cgs_delete" ON "public"."collaborator_guest_scope" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."event_collaborators" "ec"
  WHERE (("ec"."id" = "collaborator_guest_scope"."collaborator_id") AND ("public"."user_is_event_owner"("ec"."event_id") OR ("ec"."event_id" IN ( SELECT "events"."id"
           FROM "public"."events"
          WHERE ("events"."user_id" = "auth"."uid"()))))))));



CREATE POLICY "cgs_insert" ON "public"."collaborator_guest_scope" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."event_collaborators" "ec"
  WHERE (("ec"."id" = "collaborator_guest_scope"."collaborator_id") AND ("public"."user_is_event_owner"("ec"."event_id") OR ("ec"."event_id" IN ( SELECT "events"."id"
           FROM "public"."events"
          WHERE ("events"."user_id" = "auth"."uid"()))))))));



CREATE POLICY "cgs_select" ON "public"."collaborator_guest_scope" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."event_collaborators" "ec"
  WHERE (("ec"."id" = "collaborator_guest_scope"."collaborator_id") AND ("public"."user_is_event_owner"("ec"."event_id") OR ("ec"."event_id" IN ( SELECT "events"."id"
           FROM "public"."events"
          WHERE ("events"."user_id" = "auth"."uid"()))))))) OR (EXISTS ( SELECT 1
   FROM "public"."event_collaborators" "ec"
  WHERE (("ec"."id" = "collaborator_guest_scope"."collaborator_id") AND ("ec"."user_id" = "auth"."uid"()))))));



CREATE POLICY "cgs_update" ON "public"."collaborator_guest_scope" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."event_collaborators" "ec"
  WHERE (("ec"."id" = "collaborator_guest_scope"."collaborator_id") AND ("public"."user_is_event_owner"("ec"."event_id") OR ("ec"."event_id" IN ( SELECT "events"."id"
           FROM "public"."events"
          WHERE ("events"."user_id" = "auth"."uid"()))))))));



CREATE POLICY "ci_delete" ON "public"."collaboration_invitations" FOR DELETE TO "authenticated" USING (("public"."user_is_event_owner"("event_id") OR ("event_id" IN ( SELECT "events"."id"
   FROM "public"."events"
  WHERE ("events"."user_id" = "auth"."uid"())))));



CREATE POLICY "ci_insert" ON "public"."collaboration_invitations" FOR INSERT TO "authenticated" WITH CHECK (("public"."user_is_event_owner"("event_id") OR ("event_id" IN ( SELECT "events"."id"
   FROM "public"."events"
  WHERE ("events"."user_id" = "auth"."uid"())))));



CREATE POLICY "ci_select" ON "public"."collaboration_invitations" FOR SELECT TO "authenticated" USING (("public"."user_is_event_owner"("event_id") OR ("event_id" IN ( SELECT "events"."id"
   FROM "public"."events"
  WHERE ("events"."user_id" = "auth"."uid"()))) OR ("invited_email" = ("auth"."jwt"() ->> 'email'::"text"))));



CREATE POLICY "ci_update" ON "public"."collaboration_invitations" FOR UPDATE TO "authenticated" USING (("public"."user_is_event_owner"("event_id") OR ("event_id" IN ( SELECT "events"."id"
   FROM "public"."events"
  WHERE ("events"."user_id" = "auth"."uid"()))) OR ("invited_email" = ("auth"."jwt"() ->> 'email'::"text"))));



ALTER TABLE "public"."collaboration_audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."collaboration_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."collaborator_guest_scope" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ec_delete" ON "public"."event_collaborators" FOR DELETE TO "authenticated" USING (("public"."user_is_event_owner"("event_id") OR ("event_id" IN ( SELECT "events"."id"
   FROM "public"."events"
  WHERE ("events"."user_id" = "auth"."uid"())))));



CREATE POLICY "ec_insert" ON "public"."event_collaborators" FOR INSERT TO "authenticated" WITH CHECK (("public"."user_is_event_owner"("event_id") OR ("event_id" IN ( SELECT "events"."id"
   FROM "public"."events"
  WHERE ("events"."user_id" = "auth"."uid"())))));



CREATE POLICY "ec_select" ON "public"."event_collaborators" FOR SELECT TO "authenticated" USING (("public"."user_is_event_owner"("event_id") OR ("event_id" IN ( SELECT "events"."id"
   FROM "public"."events"
  WHERE ("events"."user_id" = "auth"."uid"()))) OR ("user_id" = "auth"."uid"())));



CREATE POLICY "ec_update" ON "public"."event_collaborators" FOR UPDATE TO "authenticated" USING (("public"."user_is_event_owner"("event_id") OR ("event_id" IN ( SELECT "events"."id"
   FROM "public"."events"
  WHERE ("events"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."event_collaborators" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "events_delete" ON "public"."events" FOR DELETE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."user_is_event_owner"("id")));



CREATE POLICY "events_insert" ON "public"."events" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "events_select" ON "public"."events" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."user_has_event_access"("id")));



CREATE POLICY "events_update" ON "public"."events" FOR UPDATE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."user_is_event_owner"("id")));



ALTER TABLE "public"."groups" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "groups_delete" ON "public"."groups" FOR DELETE TO "authenticated" USING ((("event_id" IN ( SELECT "events"."id"
   FROM "public"."events"
  WHERE ("events"."user_id" = "auth"."uid"()))) OR "public"."user_is_event_owner"("event_id")));



CREATE POLICY "groups_insert" ON "public"."groups" FOR INSERT TO "authenticated" WITH CHECK ((("event_id" IN ( SELECT "events"."id"
   FROM "public"."events"
  WHERE ("events"."user_id" = "auth"."uid"()))) OR "public"."user_is_event_owner"("event_id")));



CREATE POLICY "groups_insert_own" ON "public"."groups" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."events"
  WHERE (("events"."id" = "groups"."event_id") AND ("events"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "groups_select" ON "public"."groups" FOR SELECT TO "authenticated" USING ((("event_id" IN ( SELECT "events"."id"
   FROM "public"."events"
  WHERE ("events"."user_id" = "auth"."uid"()))) OR "public"."user_has_event_access"("event_id")));



CREATE POLICY "groups_select_own" ON "public"."groups" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."events"
  WHERE (("events"."id" = "groups"."event_id") AND ("events"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "groups_update" ON "public"."groups" FOR UPDATE TO "authenticated" USING ((("event_id" IN ( SELECT "events"."id"
   FROM "public"."events"
  WHERE ("events"."user_id" = "auth"."uid"()))) OR "public"."user_is_event_owner"("event_id")));



ALTER TABLE "public"."guest_interactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."guests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "guests_delete" ON "public"."guests" FOR DELETE TO "authenticated" USING ((("event_id" IN ( SELECT "events"."id"
   FROM "public"."events"
  WHERE ("events"."user_id" = "auth"."uid"()))) OR "public"."user_is_event_owner"("event_id")));



CREATE POLICY "guests_insert" ON "public"."guests" FOR INSERT TO "authenticated" WITH CHECK ((("event_id" IN ( SELECT "events"."id"
   FROM "public"."events"
  WHERE ("events"."user_id" = "auth"."uid"()))) OR "public"."user_is_event_owner"("event_id")));



CREATE POLICY "guests_select" ON "public"."guests" FOR SELECT TO "authenticated" USING ((("event_id" IN ( SELECT "events"."id"
   FROM "public"."events"
  WHERE ("events"."user_id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM "public"."event_collaborators" "ec"
  WHERE (("ec"."event_id" = "guests"."event_id") AND ("ec"."user_id" = "auth"."uid"()) AND ("ec"."role" = 'owner'::"public"."collaborator_role")))) OR (EXISTS ( SELECT 1
   FROM ("public"."event_collaborators" "ec"
     JOIN "public"."collaborator_guest_scope" "cgs" ON (("cgs"."collaborator_id" = "ec"."id")))
  WHERE (("ec"."event_id" = "guests"."event_id") AND ("ec"."user_id" = "auth"."uid"()) AND ("ec"."role" = 'seating_manager'::"public"."collaborator_role") AND (("cgs"."guest_id" = "guests"."id") OR ("cgs"."group_id" = "guests"."group_id")))))));



CREATE POLICY "guests_update" ON "public"."guests" FOR UPDATE TO "authenticated" USING ((("event_id" IN ( SELECT "events"."id"
   FROM "public"."events"
  WHERE ("events"."user_id" = "auth"."uid"()))) OR "public"."user_is_event_owner"("event_id")));



ALTER TABLE "public"."message_deliveries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."schedules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "schedules_delete" ON "public"."schedules" FOR DELETE TO "authenticated" USING ((("event_id" IN ( SELECT "events"."id"
   FROM "public"."events"
  WHERE ("events"."user_id" = "auth"."uid"()))) OR "public"."user_is_event_owner"("event_id")));



CREATE POLICY "schedules_insert" ON "public"."schedules" FOR INSERT TO "authenticated" WITH CHECK ((("event_id" IN ( SELECT "events"."id"
   FROM "public"."events"
  WHERE ("events"."user_id" = "auth"."uid"()))) OR "public"."user_is_event_owner"("event_id")));



CREATE POLICY "schedules_select" ON "public"."schedules" FOR SELECT TO "authenticated" USING ((("event_id" IN ( SELECT "events"."id"
   FROM "public"."events"
  WHERE ("events"."user_id" = "auth"."uid"()))) OR "public"."user_has_event_access"("event_id")));



CREATE POLICY "schedules_update" ON "public"."schedules" FOR UPDATE TO "authenticated" USING ((("event_id" IN ( SELECT "events"."id"
   FROM "public"."events"
  WHERE ("events"."user_id" = "auth"."uid"()))) OR "public"."user_is_event_owner"("event_id")));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."accept_collaboration_invitation"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_collaboration_invitation"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_collaboration_invitation"("p_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_add_event_creator"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_add_event_creator"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_add_event_creator"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_invitation_by_token"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_invitation_by_token"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_invitation_by_token"("p_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."seed_sandbox_data"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."seed_sandbox_data"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."seed_sandbox_data"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_delivery_sent_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_delivery_sent_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_delivery_sent_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_schedule_sent_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_schedule_sent_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_schedule_sent_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_groups_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_groups_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_groups_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_event_access"("p_event_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_event_access"("p_event_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_event_access"("p_event_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_is_event_owner"("p_event_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_is_event_owner"("p_event_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_is_event_owner"("p_event_id" "uuid") TO "service_role";


















GRANT ALL ON TABLE "public"."collaboration_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."collaboration_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."collaboration_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."collaboration_invitations" TO "anon";
GRANT ALL ON TABLE "public"."collaboration_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."collaboration_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."collaborator_guest_scope" TO "anon";
GRANT ALL ON TABLE "public"."collaborator_guest_scope" TO "authenticated";
GRANT ALL ON TABLE "public"."collaborator_guest_scope" TO "service_role";



GRANT ALL ON TABLE "public"."event_collaborators" TO "anon";
GRANT ALL ON TABLE "public"."event_collaborators" TO "authenticated";
GRANT ALL ON TABLE "public"."event_collaborators" TO "service_role";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON TABLE "public"."groups" TO "anon";
GRANT ALL ON TABLE "public"."groups" TO "authenticated";
GRANT ALL ON TABLE "public"."groups" TO "service_role";



GRANT ALL ON TABLE "public"."guest_interactions" TO "anon";
GRANT ALL ON TABLE "public"."guest_interactions" TO "authenticated";
GRANT ALL ON TABLE "public"."guest_interactions" TO "service_role";



GRANT ALL ON TABLE "public"."guests" TO "anon";
GRANT ALL ON TABLE "public"."guests" TO "authenticated";
GRANT ALL ON TABLE "public"."guests" TO "service_role";



GRANT ALL ON SEQUENCE "public"."guests_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."guests_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."guests_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."message_deliveries" TO "anon";
GRANT ALL ON TABLE "public"."message_deliveries" TO "authenticated";
GRANT ALL ON TABLE "public"."message_deliveries" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."schedules" TO "anon";
GRANT ALL ON TABLE "public"."schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."schedules" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

drop trigger if exists "set_updated_at" on "public"."event_collaborators";

drop trigger if exists "trg_auto_add_event_creator" on "public"."events";

drop trigger if exists "trigger_groups_updated_at" on "public"."groups";

drop trigger if exists "update_guests_updated_at" on "public"."guests";

drop trigger if exists "auto_set_delivery_timestamps" on "public"."message_deliveries";

drop trigger if exists "update_message_deliveries_updated_at" on "public"."message_deliveries";

drop trigger if exists "auto_set_schedule_sent_at" on "public"."schedules";

drop trigger if exists "update_schedules_updated_at" on "public"."schedules";

drop policy "cal_select" on "public"."collaboration_audit_log";

drop policy "ci_delete" on "public"."collaboration_invitations";

drop policy "ci_insert" on "public"."collaboration_invitations";

drop policy "ci_select" on "public"."collaboration_invitations";

drop policy "ci_update" on "public"."collaboration_invitations";

drop policy "cgs_delete" on "public"."collaborator_guest_scope";

drop policy "cgs_insert" on "public"."collaborator_guest_scope";

drop policy "cgs_select" on "public"."collaborator_guest_scope";

drop policy "cgs_update" on "public"."collaborator_guest_scope";

drop policy "ec_delete" on "public"."event_collaborators";

drop policy "ec_insert" on "public"."event_collaborators";

drop policy "ec_select" on "public"."event_collaborators";

drop policy "ec_update" on "public"."event_collaborators";

drop policy "events_delete" on "public"."events";

drop policy "events_select" on "public"."events";

drop policy "events_update" on "public"."events";

drop policy "Owners can delete groups" on "public"."groups";

drop policy "groups_delete" on "public"."groups";

drop policy "groups_insert" on "public"."groups";

drop policy "groups_insert_own" on "public"."groups";

drop policy "groups_select" on "public"."groups";

drop policy "groups_select_own" on "public"."groups";

drop policy "groups_update" on "public"."groups";

drop policy "Users can view own event interactions" on "public"."guest_interactions";

drop policy "Users can create guests for their events" on "public"."guests";

drop policy "Users can delete guests from their events" on "public"."guests";

drop policy "Users can update guests in their events" on "public"."guests";

drop policy "Users can view guests from their events" on "public"."guests";

drop policy "guests_delete" on "public"."guests";

drop policy "guests_insert" on "public"."guests";

drop policy "guests_select" on "public"."guests";

drop policy "guests_update" on "public"."guests";

drop policy "Users can insert deliveries for their schedules" on "public"."message_deliveries";

drop policy "Users can view deliveries for their events" on "public"."message_deliveries";

drop policy "Users can view own event deliveries" on "public"."message_deliveries";

drop policy "Users can create schedules for own events" on "public"."schedules";

drop policy "Users can delete own event schedules" on "public"."schedules";

drop policy "Users can update own event schedules" on "public"."schedules";

drop policy "Users can view own event schedules" on "public"."schedules";

drop policy "schedules_delete" on "public"."schedules";

drop policy "schedules_insert" on "public"."schedules";

drop policy "schedules_select" on "public"."schedules";

drop policy "schedules_update" on "public"."schedules";

alter table "public"."collaboration_audit_log" drop constraint "collaboration_audit_log_event_id_fkey";

alter table "public"."collaboration_invitations" drop constraint "collaboration_invitations_event_id_fkey";

alter table "public"."collaborator_guest_scope" drop constraint "collaborator_guest_scope_collaborator_id_fkey";

alter table "public"."collaborator_guest_scope" drop constraint "collaborator_guest_scope_group_id_fkey";

alter table "public"."collaborator_guest_scope" drop constraint "collaborator_guest_scope_guest_id_fkey";

alter table "public"."event_collaborators" drop constraint "event_collaborators_event_id_fkey";

alter table "public"."event_collaborators" drop constraint "event_collaborators_user_id_profiles_fk";

alter table "public"."groups" drop constraint "groups_event_id_fkey";

alter table "public"."groups" drop constraint "groups_side_check";

alter table "public"."guest_interactions" drop constraint "guest_interactions_guest_id_fkey";

alter table "public"."guest_interactions" drop constraint "guest_interactions_schedule_id_fkey";

alter table "public"."guests" drop constraint "guests_event_id_fkey";

alter table "public"."guests" drop constraint "guests_group_id_fkey";

alter table "public"."guests" drop constraint "guests_rsvp_change_source_check";

alter table "public"."message_deliveries" drop constraint "message_deliveries_guest_id_fkey";

alter table "public"."message_deliveries" drop constraint "message_deliveries_schedule_id_fkey";

alter table "public"."message_deliveries" drop constraint "valid_status_timestamps";

alter table "public"."schedules" drop constraint "schedules_event_id_fkey";

alter table "public"."collaboration_audit_log" alter column "action" set data type public.audit_action using "action"::text::public.audit_action;

alter table "public"."collaboration_invitations" alter column "role" set data type public.collaborator_role using "role"::text::public.collaborator_role;

alter table "public"."collaboration_invitations" alter column "status" set default 'pending'::public.invitation_status;

alter table "public"."collaboration_invitations" alter column "status" set data type public.invitation_status using "status"::text::public.invitation_status;

alter table "public"."event_collaborators" alter column "role" set data type public.collaborator_role using "role"::text::public.collaborator_role;

alter table "public"."guest_interactions" alter column "interaction_type" set data type public.interaction_type using "interaction_type"::text::public.interaction_type;

alter table "public"."guests" alter column "rsvp_status" set default 'pending'::public."RSVP_STATUS";

alter table "public"."guests" alter column "rsvp_status" set data type public."RSVP_STATUS" using "rsvp_status"::text::public."RSVP_STATUS";

alter table "public"."message_deliveries" alter column "status" set default 'pending'::public.delivery_status;

alter table "public"."message_deliveries" alter column "status" set data type public.delivery_status using "status"::text::public.delivery_status;

alter table "public"."profiles" alter column "pricing_plan" set data type public."PRICING_PLAN" using "pricing_plan"::text::public."PRICING_PLAN";

alter table "public"."schedules" alter column "action_type" set data type public.schedule_action_type using "action_type"::text::public.schedule_action_type;

alter table "public"."schedules" alter column "delivery_method" set default 'whatsapp'::public.delivery_method;

alter table "public"."schedules" alter column "delivery_method" set data type public.delivery_method using "delivery_method"::text::public.delivery_method;

alter table "public"."schedules" alter column "status" set data type public.schedule_completion_status using "status"::text::public.schedule_completion_status;

alter table "public"."collaboration_audit_log" add constraint "collaboration_audit_log_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE not valid;

alter table "public"."collaboration_audit_log" validate constraint "collaboration_audit_log_event_id_fkey";

alter table "public"."collaboration_invitations" add constraint "collaboration_invitations_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE not valid;

alter table "public"."collaboration_invitations" validate constraint "collaboration_invitations_event_id_fkey";

alter table "public"."collaborator_guest_scope" add constraint "collaborator_guest_scope_collaborator_id_fkey" FOREIGN KEY (collaborator_id) REFERENCES public.event_collaborators(id) ON DELETE CASCADE not valid;

alter table "public"."collaborator_guest_scope" validate constraint "collaborator_guest_scope_collaborator_id_fkey";

alter table "public"."collaborator_guest_scope" add constraint "collaborator_guest_scope_group_id_fkey" FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE not valid;

alter table "public"."collaborator_guest_scope" validate constraint "collaborator_guest_scope_group_id_fkey";

alter table "public"."collaborator_guest_scope" add constraint "collaborator_guest_scope_guest_id_fkey" FOREIGN KEY (guest_id) REFERENCES public.guests(id) ON DELETE CASCADE not valid;

alter table "public"."collaborator_guest_scope" validate constraint "collaborator_guest_scope_guest_id_fkey";

alter table "public"."event_collaborators" add constraint "event_collaborators_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE not valid;

alter table "public"."event_collaborators" validate constraint "event_collaborators_event_id_fkey";

alter table "public"."event_collaborators" add constraint "event_collaborators_user_id_profiles_fk" FOREIGN KEY (user_id) REFERENCES public.profiles(id) not valid;

alter table "public"."event_collaborators" validate constraint "event_collaborators_user_id_profiles_fk";

alter table "public"."groups" add constraint "groups_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE not valid;

alter table "public"."groups" validate constraint "groups_event_id_fkey";

alter table "public"."groups" add constraint "groups_side_check" CHECK (((side)::text = ANY ((ARRAY['bride'::character varying, 'groom'::character varying])::text[]))) not valid;

alter table "public"."groups" validate constraint "groups_side_check";

alter table "public"."guest_interactions" add constraint "guest_interactions_guest_id_fkey" FOREIGN KEY (guest_id) REFERENCES public.guests(id) ON DELETE CASCADE not valid;

alter table "public"."guest_interactions" validate constraint "guest_interactions_guest_id_fkey";

alter table "public"."guest_interactions" add constraint "guest_interactions_schedule_id_fkey" FOREIGN KEY (schedule_id) REFERENCES public.schedules(id) ON DELETE CASCADE not valid;

alter table "public"."guest_interactions" validate constraint "guest_interactions_schedule_id_fkey";

alter table "public"."guests" add constraint "guests_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE not valid;

alter table "public"."guests" validate constraint "guests_event_id_fkey";

alter table "public"."guests" add constraint "guests_group_id_fkey" FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE SET NULL not valid;

alter table "public"."guests" validate constraint "guests_group_id_fkey";

alter table "public"."guests" add constraint "guests_rsvp_change_source_check" CHECK (((rsvp_change_source)::text = ANY ((ARRAY['manual'::character varying, 'guest'::character varying])::text[]))) not valid;

alter table "public"."guests" validate constraint "guests_rsvp_change_source_check";

alter table "public"."message_deliveries" add constraint "message_deliveries_guest_id_fkey" FOREIGN KEY (guest_id) REFERENCES public.guests(id) ON DELETE CASCADE not valid;

alter table "public"."message_deliveries" validate constraint "message_deliveries_guest_id_fkey";

alter table "public"."message_deliveries" add constraint "message_deliveries_schedule_id_fkey" FOREIGN KEY (schedule_id) REFERENCES public.schedules(id) ON DELETE CASCADE not valid;

alter table "public"."message_deliveries" validate constraint "message_deliveries_schedule_id_fkey";

alter table "public"."message_deliveries" add constraint "valid_status_timestamps" CHECK ((((status = 'sent'::public.delivery_status) AND (sent_at IS NOT NULL)) OR (status <> 'sent'::public.delivery_status))) not valid;

alter table "public"."message_deliveries" validate constraint "valid_status_timestamps";

alter table "public"."schedules" add constraint "schedules_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE not valid;

alter table "public"."schedules" validate constraint "schedules_event_id_fkey";


  create policy "cal_select"
  on "public"."collaboration_audit_log"
  as permissive
  for select
  to authenticated
using ((public.user_is_event_owner(event_id) OR (event_id IN ( SELECT events.id
   FROM public.events
  WHERE (events.user_id = auth.uid())))));



  create policy "ci_delete"
  on "public"."collaboration_invitations"
  as permissive
  for delete
  to authenticated
using ((public.user_is_event_owner(event_id) OR (event_id IN ( SELECT events.id
   FROM public.events
  WHERE (events.user_id = auth.uid())))));



  create policy "ci_insert"
  on "public"."collaboration_invitations"
  as permissive
  for insert
  to authenticated
with check ((public.user_is_event_owner(event_id) OR (event_id IN ( SELECT events.id
   FROM public.events
  WHERE (events.user_id = auth.uid())))));



  create policy "ci_select"
  on "public"."collaboration_invitations"
  as permissive
  for select
  to authenticated
using ((public.user_is_event_owner(event_id) OR (event_id IN ( SELECT events.id
   FROM public.events
  WHERE (events.user_id = auth.uid()))) OR (invited_email = (auth.jwt() ->> 'email'::text))));



  create policy "ci_update"
  on "public"."collaboration_invitations"
  as permissive
  for update
  to authenticated
using ((public.user_is_event_owner(event_id) OR (event_id IN ( SELECT events.id
   FROM public.events
  WHERE (events.user_id = auth.uid()))) OR (invited_email = (auth.jwt() ->> 'email'::text))));



  create policy "cgs_delete"
  on "public"."collaborator_guest_scope"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.event_collaborators ec
  WHERE ((ec.id = collaborator_guest_scope.collaborator_id) AND (public.user_is_event_owner(ec.event_id) OR (ec.event_id IN ( SELECT events.id
           FROM public.events
          WHERE (events.user_id = auth.uid()))))))));



  create policy "cgs_insert"
  on "public"."collaborator_guest_scope"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.event_collaborators ec
  WHERE ((ec.id = collaborator_guest_scope.collaborator_id) AND (public.user_is_event_owner(ec.event_id) OR (ec.event_id IN ( SELECT events.id
           FROM public.events
          WHERE (events.user_id = auth.uid()))))))));



  create policy "cgs_select"
  on "public"."collaborator_guest_scope"
  as permissive
  for select
  to authenticated
using (((EXISTS ( SELECT 1
   FROM public.event_collaborators ec
  WHERE ((ec.id = collaborator_guest_scope.collaborator_id) AND (public.user_is_event_owner(ec.event_id) OR (ec.event_id IN ( SELECT events.id
           FROM public.events
          WHERE (events.user_id = auth.uid()))))))) OR (EXISTS ( SELECT 1
   FROM public.event_collaborators ec
  WHERE ((ec.id = collaborator_guest_scope.collaborator_id) AND (ec.user_id = auth.uid()))))));



  create policy "cgs_update"
  on "public"."collaborator_guest_scope"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.event_collaborators ec
  WHERE ((ec.id = collaborator_guest_scope.collaborator_id) AND (public.user_is_event_owner(ec.event_id) OR (ec.event_id IN ( SELECT events.id
           FROM public.events
          WHERE (events.user_id = auth.uid()))))))));



  create policy "ec_delete"
  on "public"."event_collaborators"
  as permissive
  for delete
  to authenticated
using ((public.user_is_event_owner(event_id) OR (event_id IN ( SELECT events.id
   FROM public.events
  WHERE (events.user_id = auth.uid())))));



  create policy "ec_insert"
  on "public"."event_collaborators"
  as permissive
  for insert
  to authenticated
with check ((public.user_is_event_owner(event_id) OR (event_id IN ( SELECT events.id
   FROM public.events
  WHERE (events.user_id = auth.uid())))));



  create policy "ec_select"
  on "public"."event_collaborators"
  as permissive
  for select
  to authenticated
using ((public.user_is_event_owner(event_id) OR (event_id IN ( SELECT events.id
   FROM public.events
  WHERE (events.user_id = auth.uid()))) OR (user_id = auth.uid())));



  create policy "ec_update"
  on "public"."event_collaborators"
  as permissive
  for update
  to authenticated
using ((public.user_is_event_owner(event_id) OR (event_id IN ( SELECT events.id
   FROM public.events
  WHERE (events.user_id = auth.uid())))));



  create policy "events_delete"
  on "public"."events"
  as permissive
  for delete
  to authenticated
using (((user_id = auth.uid()) OR public.user_is_event_owner(id)));



  create policy "events_select"
  on "public"."events"
  as permissive
  for select
  to authenticated
using (((user_id = auth.uid()) OR public.user_has_event_access(id)));



  create policy "events_update"
  on "public"."events"
  as permissive
  for update
  to authenticated
using (((user_id = auth.uid()) OR public.user_is_event_owner(id)));



  create policy "Owners can delete groups"
  on "public"."groups"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.events
  WHERE ((events.id = groups.event_id) AND (events.user_id = ( SELECT auth.uid() AS uid))))));



  create policy "groups_delete"
  on "public"."groups"
  as permissive
  for delete
  to authenticated
using (((event_id IN ( SELECT events.id
   FROM public.events
  WHERE (events.user_id = auth.uid()))) OR public.user_is_event_owner(event_id)));



  create policy "groups_insert"
  on "public"."groups"
  as permissive
  for insert
  to authenticated
with check (((event_id IN ( SELECT events.id
   FROM public.events
  WHERE (events.user_id = auth.uid()))) OR public.user_is_event_owner(event_id)));



  create policy "groups_insert_own"
  on "public"."groups"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.events
  WHERE ((events.id = groups.event_id) AND (events.user_id = ( SELECT auth.uid() AS uid))))));



  create policy "groups_select"
  on "public"."groups"
  as permissive
  for select
  to authenticated
using (((event_id IN ( SELECT events.id
   FROM public.events
  WHERE (events.user_id = auth.uid()))) OR public.user_has_event_access(event_id)));



  create policy "groups_select_own"
  on "public"."groups"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.events
  WHERE ((events.id = groups.event_id) AND (events.user_id = ( SELECT auth.uid() AS uid))))));



  create policy "groups_update"
  on "public"."groups"
  as permissive
  for update
  to authenticated
using (((event_id IN ( SELECT events.id
   FROM public.events
  WHERE (events.user_id = auth.uid()))) OR public.user_is_event_owner(event_id)));



  create policy "Users can view own event interactions"
  on "public"."guest_interactions"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM (public.schedules
     JOIN public.events ON ((events.id = schedules.event_id)))
  WHERE ((schedules.id = guest_interactions.schedule_id) AND (events.user_id = auth.uid())))));



  create policy "Users can create guests for their events"
  on "public"."guests"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.events
  WHERE ((events.id = guests.event_id) AND (events.user_id = auth.uid())))));



  create policy "Users can delete guests from their events"
  on "public"."guests"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.events
  WHERE ((events.id = guests.event_id) AND (events.user_id = auth.uid())))));



  create policy "Users can update guests in their events"
  on "public"."guests"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.events
  WHERE ((events.id = guests.event_id) AND (events.user_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM public.events
  WHERE ((events.id = guests.event_id) AND (events.user_id = auth.uid())))));



  create policy "Users can view guests from their events"
  on "public"."guests"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.events
  WHERE ((events.id = guests.event_id) AND (events.user_id = auth.uid())))));



  create policy "guests_delete"
  on "public"."guests"
  as permissive
  for delete
  to authenticated
using (((event_id IN ( SELECT events.id
   FROM public.events
  WHERE (events.user_id = auth.uid()))) OR public.user_is_event_owner(event_id)));



  create policy "guests_insert"
  on "public"."guests"
  as permissive
  for insert
  to authenticated
with check (((event_id IN ( SELECT events.id
   FROM public.events
  WHERE (events.user_id = auth.uid()))) OR public.user_is_event_owner(event_id)));



  create policy "guests_select"
  on "public"."guests"
  as permissive
  for select
  to authenticated
using (((event_id IN ( SELECT events.id
   FROM public.events
  WHERE (events.user_id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM public.event_collaborators ec
  WHERE ((ec.event_id = guests.event_id) AND (ec.user_id = auth.uid()) AND (ec.role = 'owner'::public.collaborator_role)))) OR (EXISTS ( SELECT 1
   FROM (public.event_collaborators ec
     JOIN public.collaborator_guest_scope cgs ON ((cgs.collaborator_id = ec.id)))
  WHERE ((ec.event_id = guests.event_id) AND (ec.user_id = auth.uid()) AND (ec.role = 'seating_manager'::public.collaborator_role) AND ((cgs.guest_id = guests.id) OR (cgs.group_id = guests.group_id)))))));



  create policy "guests_update"
  on "public"."guests"
  as permissive
  for update
  to authenticated
using (((event_id IN ( SELECT events.id
   FROM public.events
  WHERE (events.user_id = auth.uid()))) OR public.user_is_event_owner(event_id)));



  create policy "Users can insert deliveries for their schedules"
  on "public"."message_deliveries"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM (public.schedules s
     JOIN public.events e ON ((e.id = s.event_id)))
  WHERE ((s.id = message_deliveries.schedule_id) AND (e.user_id = auth.uid())))));



  create policy "Users can view deliveries for their events"
  on "public"."message_deliveries"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM (public.schedules s
     JOIN public.events e ON ((e.id = s.event_id)))
  WHERE ((s.id = message_deliveries.schedule_id) AND (e.user_id = auth.uid())))));



  create policy "Users can view own event deliveries"
  on "public"."message_deliveries"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM (public.schedules
     JOIN public.events ON ((events.id = schedules.event_id)))
  WHERE ((schedules.id = message_deliveries.schedule_id) AND (events.user_id = auth.uid())))));



  create policy "Users can create schedules for own events"
  on "public"."schedules"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.events
  WHERE ((events.id = schedules.event_id) AND (events.user_id = auth.uid())))));



  create policy "Users can delete own event schedules"
  on "public"."schedules"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.events
  WHERE ((events.id = schedules.event_id) AND (events.user_id = auth.uid())))));



  create policy "Users can update own event schedules"
  on "public"."schedules"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.events
  WHERE ((events.id = schedules.event_id) AND (events.user_id = auth.uid())))));



  create policy "Users can view own event schedules"
  on "public"."schedules"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.events
  WHERE ((events.id = schedules.event_id) AND (events.user_id = auth.uid())))));



  create policy "schedules_delete"
  on "public"."schedules"
  as permissive
  for delete
  to authenticated
using (((event_id IN ( SELECT events.id
   FROM public.events
  WHERE (events.user_id = auth.uid()))) OR public.user_is_event_owner(event_id)));



  create policy "schedules_insert"
  on "public"."schedules"
  as permissive
  for insert
  to authenticated
with check (((event_id IN ( SELECT events.id
   FROM public.events
  WHERE (events.user_id = auth.uid()))) OR public.user_is_event_owner(event_id)));



  create policy "schedules_select"
  on "public"."schedules"
  as permissive
  for select
  to authenticated
using (((event_id IN ( SELECT events.id
   FROM public.events
  WHERE (events.user_id = auth.uid()))) OR public.user_has_event_access(event_id)));



  create policy "schedules_update"
  on "public"."schedules"
  as permissive
  for update
  to authenticated
using (((event_id IN ( SELECT events.id
   FROM public.events
  WHERE (events.user_id = auth.uid()))) OR public.user_is_event_owner(event_id)));


CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.event_collaborators FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_auto_add_event_creator AFTER INSERT ON public.events FOR EACH ROW EXECUTE FUNCTION public.auto_add_event_creator();

CREATE TRIGGER trigger_groups_updated_at BEFORE UPDATE ON public.groups FOR EACH ROW EXECUTE FUNCTION public.update_groups_updated_at();

CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON public.guests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER auto_set_delivery_timestamps BEFORE UPDATE ON public.message_deliveries FOR EACH ROW EXECUTE FUNCTION public.set_delivery_sent_at();

CREATE TRIGGER update_message_deliveries_updated_at BEFORE UPDATE ON public.message_deliveries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER auto_set_schedule_sent_at BEFORE UPDATE ON public.schedules FOR EACH ROW EXECUTE FUNCTION public.set_schedule_sent_at();

CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON public.schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "Allow authenticated uploads 18l1j3u_0"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'invitations'::text));



  create policy "Allow downloads from user's own folder"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'guests'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Allow public read access 18l1j3u_0"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'invitations'::text));



  create policy "Allow user to insert to their own folder"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'guests'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Authenticated users can delete from invitations 18l1j3u_0"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using ((bucket_id = 'invitations'::text));



  create policy "Authenticated users can delete from invitations 18l1j3u_1"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using ((bucket_id = 'invitations'::text));



