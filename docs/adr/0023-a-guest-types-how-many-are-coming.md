# A Guest types how many are coming

The Confirmation Conversation used to ask "how many are coming?" with a button offering the
invited amount ("נגיע 3") and a second one opening a 1-10 list. Offering the invited amount
read as the expected answer, so Guests confirmed the number on the invitation rather than
the number actually coming. The question now shows no number and is answered by typing one.
It is asked of every Guest unless the Owner locked the count, including a party of one, which
used to skip it.
The RSVP page matches: its count starts at 1 unless the Guest already answered or the Owner
locked the count.

Typing is the one answer in the conversation that does not identify itself, so this partly
reverses ADR 0017's "no stored conversation state". The state is as small as it can be: the
reply that asked records on its `whatsapp_inbound_messages` row that it is awaiting a count,
and how many unreadable answers it has had. Text from that phone is read as the answer while
that reply is the latest thing Kululu said to the phone: within 24 hours, and before any
newer Delivery reached it. **Latest question wins** is the whole rule for two Events on one
phone, since the Guest is answering the last thing they were asked. Anything typed outside
an awaited question is still answered with the fixed prompt, as before.

Reading the answer (`utils/guest-count.ts`) is forgiving about what surrounds the number and
strict about ambiguity: "3", "3 אנשים", "שלושה" and "٣" are read, while "2 או 3" and "2+1" are
asked again. An unreadable answer is asked again once, with an example, and then the 1-10 list
is offered, whose taps identify themselves again. So a Guest can never be stuck in a loop.
"0" is answered as a possible "Not coming". A count above 20 is refused, as more likely a
typo than a party, and the Guest is asked for a smaller number or pointed to the hosts.

The conversation never links to the RSVP page, not even in the summary. A Guest changes an
answer in the chat, from the summary's button. The **RSVP Cutoff** moved to the end of the
Event day, for the chat and the page alike: a change on the day is still useful, and one
after the Event would rewrite who came.

Because the Guest no longer sees the invitation, an answer above it is expected rather than
a mistake. It is accepted and flagged to the Owner. `guests.invited_amount` keeps the
invitation, which `amount` used to lose as soon as a Guest answered. It moves only when an
Owner or Operator changes the count, which also clears the flag.

**Considered Options:** a list of 1-10 opened straight away was the stateless alternative.
It kept ADR 0017 whole and cannot be answered wrongly, but it was rejected as two taps and
a picker for what is naturally one typed character. Sending large parties to the RSVP page was
rejected so the chat stays the one place a Guest answers. Accepting a typed number alongside the
list was rejected because it needs the same state for little gain. Capping the answer at the
invited amount was rejected because it reveals the invitation again. Guessing at ambiguous
answers, for example summing "2+1", was rejected because it records a count the Guest never
gave.

**Consequences:** a Test Message's typed count is found through `from_phone`, as it has no
Delivery. `invited_amount` was backfilled from `amount`, which is the true invitation only for
Guests who had not answered yet, so no existing answer is flagged. The typed-text rate limit
counts only text that answered no question, so a count conversation does not use it up.
