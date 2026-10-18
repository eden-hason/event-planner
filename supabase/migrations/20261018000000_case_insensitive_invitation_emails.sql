-- Collaborator invitations matched the invitee by exact email, but email
-- addresses are case-insensitive and Supabase Auth stores them lowercased. An
-- invite typed as "maximStillis@gmail.com" could therefore never be accepted by
-- the account maximstillis@gmail.com: the invite page showed "Email Mismatch",
-- and behind it the accept function and the invitee's RLS policies compared
-- the two exactly too.
--
-- The invite form now lowercases the address before it is stored. Here we
-- lowercase the rows already stored, hold the column to lowercase from now on,
-- and lowercase the JWT side of every comparison (Auth already does, but the
-- comparison should not depend on it).
--
-- The check constraint doubles as this migration's guard: it fails to validate
-- if the backfill left a row behind. It also means the app must be deployed
-- before this is pushed, or the old invite form's mixed-case inserts fail.

update public.collaboration_invitations
set invited_email = lower(btrim(invited_email))
where invited_email <> lower(btrim(invited_email));

alter table public.collaboration_invitations
  add constraint collaboration_invitations_invited_email_lowercase
  check (invited_email = lower(invited_email));

-- Unchanged apart from the lower() on the email check (and the expiry message,
-- which carried a stray line break).
create or replace function public.accept_collaboration_invitation(p_token text)
returns json
language plpgsql
security definer
as $$
declare
  v_invitation record;
  v_user_id uuid;
  v_user_email text;
  v_collaborator_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return json_build_object('success', false, 'message', 'You must be logged in.');
  end if;

  v_user_email := auth.jwt() ->> 'email';

  select * into v_invitation
  from public.collaboration_invitations
  where token = p_token;

  if not found then
    return json_build_object('success', false, 'message', 'Invitation not found.');
  end if;

  if v_invitation.status != 'pending' then
    return json_build_object('success', false, 'message',
      'This invitation has already been ' || v_invitation.status || '.');
  end if;

  if v_invitation.expires_at < now() then
    return json_build_object('success', false, 'message', 'This invitation has expired.');
  end if;

  if lower(v_invitation.invited_email) is distinct from lower(v_user_email) then
    return json_build_object('success', false, 'message',
      'This invitation was sent to a different email address.');
  end if;

  begin
    insert into public.event_collaborators (event_id, user_id, role, is_creator)
    values (v_invitation.event_id, v_user_id, v_invitation.role, false)
    returning id into v_collaborator_id;
  exception when unique_violation then
    return json_build_object('success', false, 'message',
      'You are already a collaborator on this event.');
  end;

  if v_invitation.role = 'seating_manager' then
    if v_invitation.scope_groups is not null then
      insert into public.collaborator_guest_scope (collaborator_id, group_id)
      select v_collaborator_id, unnest(v_invitation.scope_groups);
    end if;
    if v_invitation.scope_guests is not null then
      insert into public.collaborator_guest_scope (collaborator_id, guest_id)
      select v_collaborator_id, unnest(v_invitation.scope_guests);
    end if;
  end if;

  update public.collaboration_invitations
  set status = 'accepted', responded_at = now()
  where id = v_invitation.id;

  insert into public.collaboration_audit_log (event_id, actor_id, target_email, action, metadata)
  values (v_invitation.event_id, v_user_id, v_user_email, 'accepted',
    json_build_object('role', v_invitation.role)::jsonb);

  return json_build_object(
    'success', true,
    'message', 'Invitation accepted! You now have access to this event.',
    'event_id', v_invitation.event_id
  );
end;
$$;

-- The invitee reads and declines their invitation through these two policies.
-- invited_email is lowercase by the constraint above, so only the JWT side
-- needs lowering.
drop policy "ci_select" on public.collaboration_invitations;
create policy "ci_select"
  on public.collaboration_invitations
  as permissive
  for select
  to authenticated
  using (
    public.user_is_event_owner(event_id)
    or event_id in (select events.id from public.events where events.user_id = auth.uid())
    or invited_email = lower(auth.jwt() ->> 'email')
  );

drop policy "ci_update" on public.collaboration_invitations;
create policy "ci_update"
  on public.collaboration_invitations
  as permissive
  for update
  to authenticated
  using (
    public.user_is_event_owner(event_id)
    or event_id in (select events.id from public.events where events.user_id = auth.uid())
    or invited_email = lower(auth.jwt() ->> 'email')
  );
