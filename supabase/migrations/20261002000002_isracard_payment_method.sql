-- Payments for a Record Package are also taken by Isracard credit card, and recording those
-- as "other" would hide the most common card method in every report. Placed after 'bit' so
-- the Back Office lists the electronic methods together.

alter type public.billing_payment_method add value if not exists 'isracard' after 'bit';
