# Grill prompt template

How to start a `/grill-with-docs` session that ends in a design brief for another agent.
Run it in a fresh session, then run `/handoff` in the same session to write the brief to
`docs/design/<page>-brief.md`.

## Template

```
/grill-with-docs I want to design the <page name> page. <One or two sentences on the problem it solves and who uses it.>

Start from: src/features/<feature>/, the current page at src/app/(main)/[locale]/app/<route>, and docs/design/<related>-brief.md.

Already decided: <e.g. mobile-first, uses the existing Record Package data, no new tables>.
Still open: <e.g. what the empty state shows, whether editing happens inline or in a sheet>.

The goal is a brief that a separate design agent will work from without access to this conversation. Keep asking until it covers every state, piece of data and action on the page, plus what's out of scope - at least as complete as home-page-brief.md. Then I'll run /handoff to write it to docs/design/<page>-brief.md.
```

## The four parts

1. **What you're making and why** - the page and the problem it solves, in one or two sentences.
2. **Where to look** - feature folders, existing pages, related briefs or ADRs, so it doesn't search the whole repo.
3. **What's decided, and what's open** - it skips the first and digs into the second.
4. **The end goal** - a brief for another agent, so it keeps going until someone else could work from it.

## Tips

- Keep it short. The skill interviews you; if you write the answers up front, there's nothing left to ask.
- Don't write the design yourself. Ideas like "a card grid with a hero at the top" belong in the
  conversation, where they can be challenged, not in the prompt as assumptions.
- List the states you're unsure about: empty, loading, error, mobile vs desktop, permission
  differences.
- Keep the grilling and the `/handoff` in one session, so the brief comes from the full
  conversation, not a summary of it.
- If you're going to build the page yourself, use `/to-spec` instead of `/handoff`.
