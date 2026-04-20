DROP INDEX IF EXISTS idx_groups_event_name;
CREATE UNIQUE INDEX idx_groups_event_name_side ON public.groups USING btree (event_id, name, COALESCE(side, ''));
