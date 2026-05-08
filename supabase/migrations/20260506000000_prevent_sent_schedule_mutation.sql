CREATE OR REPLACE FUNCTION public.prevent_sent_schedule_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'sent' THEN
    RAISE EXCEPTION
      'Cannot modify a schedule that has already been sent (id: %)', OLD.id
      USING ERRCODE = 'raise_exception';
  END IF;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.prevent_sent_schedule_mutation() OWNER TO postgres;

CREATE TRIGGER prevent_sent_schedule_mutation
  BEFORE UPDATE ON public.schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_sent_schedule_mutation();
