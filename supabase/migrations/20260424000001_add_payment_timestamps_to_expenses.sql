ALTER TABLE public.expenses
  ADD COLUMN fully_paid_at   timestamptz,
  ADD COLUMN advance_paid_at timestamptz;

CREATE OR REPLACE FUNCTION public.set_expense_payment_timestamps()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.fully_paid IS DISTINCT FROM OLD.fully_paid THEN
    NEW.fully_paid_at := CASE WHEN NEW.fully_paid THEN now() ELSE NULL END;
  END IF;

  IF NEW.advance_paid IS DISTINCT FROM OLD.advance_paid THEN
    NEW.advance_paid_at := CASE WHEN NEW.advance_paid THEN now() ELSE NULL END;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_expense_payment_timestamps
BEFORE UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.set_expense_payment_timestamps();
