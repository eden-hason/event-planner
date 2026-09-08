-- A call often ends with the guest neither confirming nor declining: they are
-- not sure yet and say they will answer the WhatsApp invitation themselves.
-- Recording that as 'no_answer' is wrong twice over - the call was answered,
-- and the round looks like it failed to reach someone it actually reached.
--
-- Like 'no_answer', this outcome is a fact about the call and never moves the
-- guest's rsvp_status: the guest has promised an answer, not given one.
alter type call_outcome add value if not exists 'guest_will_update';
