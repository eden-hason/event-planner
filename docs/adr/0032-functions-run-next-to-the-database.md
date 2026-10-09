# Functions run next to the database

Every Vercel Function ran in `iad1` (Washington), Vercel's default for new projects, and
nobody had changed it: the project's Function Region setting still read `iad1`. The database,
`kululu-prod`, is in Supabase's `eu-central-1` (Frankfurt). So every query from a Server
Component, Server Action, the Dispatcher, the Worker or a webhook crossed the Atlantic and
back, about 150-180ms each. On 2026-10-08 this is what killed a dispatch: 311 sequential
`UPDATE`s took about 56 seconds (ADR 0031). It also shows on the quiet paths. A WhatsApp
status webhook makes three sequential calls (store the event, look up the attempt, update
it), and the production logs show about 430ms between receiving the payload and applying
the status.

We pin functions to `fra1` (Frankfurt) with `"regions": ["fra1"]` in `vercel.json`. That is
the same AWS region as the database, so a round trip becomes network-trivial and what is left
is PostgREST and Postgres doing the work. The same 311 updates would take a few seconds; the
webhook should drop well under 100ms. Most of our users are in Israel too, so the request
from the browser to the function gets shorter as well, and Frankfurt is about a third of the
distance Washington is.

The setting lives in `vercel.json` rather than only in the dashboard because `regions` there
overrides the project setting at deploy time, and a change in the repo goes through review
and is reverted like any other.

Nothing we call depends on running in the US. Meta delivers webhooks to our domain from
wherever it likes and we verify them by signature, not by source IP; the Graph API
and Anthropic are global endpoints. ActiveTrail, the SMS provider, is Israeli and gets
closer. We have no Static IPs or Secure Compute, so our outbound addresses were always
rotating AWS addresses and no provider can have allowlisted them. Google Maps and Google Drive
run in the browser, restricted by referrer. The WhatsApp guest import (Baileys) opens a
WhatsApp Web session from the function, which will now come from a German address instead of
an American one; neither matches an Israeli user's phone, so this is no worse.

Moving the database to the US was rejected - it is the harder move, it takes the data further
from the users, and it would still leave the browser-to-function leg long. Running in more
than one region was rejected: there is one database, so every region but the one next to it
pays the round trip again. Moving only the cron and webhook routes was rejected, since every
page render pays the same latency and nothing has a reason to stay in `iad1`.

**Consequences:** Vercel prices `fra1` higher than `iad1` - Active CPU is $0.184 an hour
against $0.128, provisioned memory $0.0152 per GB-hour against $0.0106. CPU spent is unchanged,
so that part of the bill rises by about 44%. Memory is billed for as long as an instance is
running, and most of that time was waiting on the database, so it should fall. Static
assets and Routing Middleware are not affected; they are served from every region either way.
Preview deployments move to `fra1` too. Failover to another region is an Enterprise feature,
so an `fra1` outage takes the functions down, as an `iad1` outage did before. To confirm the
gain after deploy, check that runtime logs say `region=fra1` and that a webhook's gap between
`Raw payload` and the applied status has shrunk.
