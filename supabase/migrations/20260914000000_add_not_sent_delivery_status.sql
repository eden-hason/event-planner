-- A Delivery can now be "not sent": the guest was in the schedule's audience but
-- no attempt was possible (no usable phone number). Until now such guests were
-- only counted in the send outcome and forgotten, so an Owner could not see that
-- a dozen guests never got the invitation. See CONTEXT.md (Delivery) and
-- docs/adr/0011.
--
-- In its own migration because a value added with ALTER TYPE cannot be used in
-- the same transaction that adds it, and the next migration references it.

alter type public.delivery_status add value if not exists 'not_sent';
