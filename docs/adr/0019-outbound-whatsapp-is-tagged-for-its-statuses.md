# Outbound WhatsApp is tagged for its statuses

Meta's status webhooks (sent, delivered, read, failed) name a message only by its `wamid`,
and a `wamid` exists only once the send call returns. The status processor used to find what
a status belonged to by searching for that id, first in `message_delivery_attempts` and then,
after ADR 0017 added inline replies, in `whatsapp_inbound_messages`. That meant the processor
had to know every sender, and it raced every sender: Meta's `sent` regularly arrives before the
`wamid` is written, so every such status was retried inside a 15-minute window, and a status
that matched nothing looked the same whether it was expected or a real tracking gap
(backlog 0005).

Every outbound WhatsApp message now carries a tag in `biz_opaque_callback_data`, which Meta
echoes on each status for that message. The tag says who sent it, using an id that exists
before the send: `attempt:<attempt id>` for the Worker and the manual send (the claim writes
the attempt first, ADR 0014), `conversation:<inbound message id>` for a Confirmation
Conversation reply (the inbound claim is written first, ADR 0017), and `test` for a Test
Message. The processor reads the tag. An attempt is matched by its own id in one pass, and a
conversation reply or Test Message is known to need nothing. The tag is a required argument of
the transport, so a new send path cannot forget it. It has to choose a kind, which makes the
new path visible in `utils/whatsapp-callback-tag.ts`.

Since a status can now reach an attempt before its sender has recorded Meta's answer, the
sender's write only moves an attempt that is still `pending`. The `wamid` is still stored
every time, because it is the only id Meta support can look up. A tagged status that finds
the attempt without one stores it. This also settles an unknown outcome (ADR 0014): if the
send call's answer is lost but Meta reports the message, the attempt takes Meta's status and
does not become a failure.

**Considered Options:** searching one more table per new sender, the fix that preceded this,
was rejected. It fixes the symptom once per sender and keeps the race. Prefixing the tag with
an environment name was not needed: attempt ids are UUIDs, so a tag from another environment
sharing the number matches nothing, and it is reported at once.

**Consequences:** statuses without a tag are either for messages sent before tags shipped,
or were not sent by Kululu. They still go through the old `wamid` search, the conversation
reply lookup and the 15-minute retry window. That fallback, and the partial index
`whatsapp_inbound_messages_reply_message_id_idx` behind it, can be removed once statuses for
pre-tag messages have stopped arriving. "Matched no attempt" now means a message Kululu did
not tag, and a tagged status whose attempt does not exist is warned about immediately
instead of retried.
