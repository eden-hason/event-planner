# A Confirmation Conversation is not sent through the queue

ADR 0013 made the Delivery the unit of sending and the Worker the only thing that talks to
WhatsApp, so that one governor could hold Kululu to its **Throughput Budget** across every
Event at once. A **Confirmation Conversation** adds a second kind of outbound message: the
next question, or the summary, sent in answer to a Guest who has just tapped a button.

These messages are sent inline by the webhook processor, directly, outside the queue and
outside the governor. They are not Deliveries: they belong to no Schedule, are never billed,
and are answers to something the Guest did seconds ago. Sent through the queue, a reply would
wait for the next Worker tick - and during a large send, behind thousands of queued
Deliveries - which reads to the Guest as a conversation that broke. Their volume is bounded
by human tapping speed, far below the budget, the same argument that already lets a Back
Office single send bypass the governor.

Each reply identifies itself (with one exception since ADR 0023: the Guest count is
typed, and read against the question that asked for it). Every button or list option Kululu sends carries the Delivery
token and the step it answers, so a tap is processed on its own with no stored notion of
"where the Guest is" in the conversation. This is what makes a phone number that belongs to
Guests of two Events at once, an old summary tapped weeks later, or taps arriving out of
order all work without special cases. Text a Guest types is neither interpreted nor passed to the
hosts; it is answered with a fixed prompt pointing back to the buttons, at most once every 12 hours, so a
chatty Guest is not answered by a bot line by line. (Typed text was first kept as a guest
note for the hosts; guest notes were removed from the product on 2026-09-23, from the RSVP page as
well.)

Each reply is sent at most once. The inbound message id is claimed in
`whatsapp_inbound_messages` before anything is acted on, so Meta's at-least-once redelivery
never produces a second answer; a failure after the claim loses that one reply, and the Guest
can tap again - the same stance as ADR 0014.

**Considered Options:** routing replies through the Delivery queue was rejected for the
latency above. Storing per-phone conversation state, which would allow typed answers such as
"3" to be understood, was rejected for the MVP: it needs rules for two Events on one phone
and for abandoned conversations, and self-identifying replies need neither.

**Consequences:** ADR 0013's "only the Worker talks to WhatsApp" no longer holds without
qualification - the Worker sends every Delivery, and the webhook processor sends replies
within a Confirmation Conversation. The **Send Window** governs Schedules only; a Guest who
taps on Friday night is answered on Friday night. A Test Message's buttons carry a test
marker instead of a token, and the conversation it starts plays out in full while writing
nothing.
