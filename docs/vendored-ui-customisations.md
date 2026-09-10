# Customisations to vendored `components/ui` files

`src/components/ui/` mixes shadcn/ui output with local edits, and nothing in the
repo records which is which. There is no manifest, no version field, and no
`shadcn add` commit in the git history - components arrived bundled inside
feature commits. Without this file, the only way to tell a customisation from a
stale file is git archaeology.

**Before running `npx shadcn add <name>` for anything listed here, read the row
first.** The CLI overwrites the file.

## The RTL layer

The single largest customisation is not in one file. Around thirty edits across
a dozen primitives make the app work in Hebrew, and they look like formatting
noise in a diff:

| Primitive | Edit |
|---|---|
| `table.tsx` | `text-left` -> `text-start`, `pr-0` -> `pe-0` |
| `alert-dialog.tsx` | `sm:text-left` -> `sm:text-start` |
| `drawer.tsx` | RTL text alignment in `DrawerHeader` |
| `dialog.tsx` | `sm:text-left` -> `sm:text-start`, close button `rtl:right-auto rtl:left-4` |
| `sheet.tsx` | close button `rtl:right-auto rtl:left-4` |
| `input-group.tsx` | `pl-`/`pr-` -> `ps-`/`pe-`, `ml-`/`mr-` -> `ms-`/`me-` |
| `dropdown-menu.tsx` | `ps-8 pe-2`, `start-2` |
| `select.tsx` | `pr-8 pl-2` -> `pe-8 ps-2`, `right-2` -> `end-2`, **plus a `dir` prop** |
| `toggle-switch.tsx` | `rtl:-translate-x-4` thumb (see below) |
| `card.tsx` | `rtl:has-data-[slot=card-action]:[direction:rtl]` |

`select.tsx` is the one with logic, not just class names: it resolves `dir` from
`document.documentElement` at render time when the caller does not pass one.

A re-vendor silently regresses all of this. Nothing fails loudly, and the app
keeps working in English.

## Per-file record

| File | Status | What was changed |
|---|---|---|
| `toggle-switch.tsx` | **bespoke** | Not shadcn's switch at all: a hand-rolled `<label>` + sr-only checkbox with no `@radix-ui/react-switch` dependency. Renamed off the `switch` registry name so `shadcn add switch` cannot clobber it. |
| `alert-variants.ts` | **local** | Holds the `success` / `warning` / `info` variants, which are this app's additions and the only consumers of `--success` / `--warning`. Extracted out of `alert.tsx` so a re-vendor breaks an import instead of deleting them silently. |
| `badge.tsx` | vendored, stale + modified | Three generations behind upstream: a `<div>` where upstream is a `<span>`, no `data-slot`, no `asChild`, and hover states deliberately stripped. 23 importers. `shadcn add badge` is a breaking rewrite, not a patch. |
| `button.tsx` | vendored, modified | Four extra sizes (`xs`, `icon-xs`, `icon-sm`, `icon-lg`) and `data-variant` / `data-size` attributes upstream does not emit. |
| `tooltip.tsx` | vendored, modified | Tokens replaced with literals (`bg-black`/`dark:bg-white`), `sideOffset` 0 -> 8. |
| `dialog.tsx`, `sheet.tsx` | vendored, modified | Overlay `bg-black/50` -> `bg-black/10 backdrop-blur-sm`; RTL close button. |
| `command.tsx` | vendored, modified | `text-base` below `md` so iOS does not zoom the page on focus. |
| `calendar.tsx` | vendored, modified | Locale threaded through to `toLocaleString`. |
| `sidebar.tsx` | vendored, modified | `bg-sidebar` re-scoped to the floating variant. |
| `dropdown-menu.tsx` | vendored, modified | Radio indicator recoloured and centred. |
| `item.tsx` | vendored, modified | `shrink-0` added to `ItemMedia`. |
| `popover.tsx` | vendored, modified | Additive: re-exports `PopoverAnchor`. |
| `checkbox.tsx` | vendored, stale | Pre-`data-slot` era. |
| `stepper.tsx`, `file-upload.tsx` | **other registry** | Not shadcn/ui - a diceui-style registry (`ROOT_NAME` consts, `useComposedRefs`). `shadcn add` will not find them. |
| `stats-cards.tsx`, `date-picker.tsx` | **bespoke, shared** | Not shadcn components. Kept here because more than one feature uses them. |

Everything not listed is stock shadcn/ui new-york output, safe to re-vendor.

## Also worth knowing

- `components.json` declares `baseColor: neutral`, but the greys in
  `globals.css` are the zinc-family hues. Only affects future scaffolds.
- The `@shadcn-map` registry in `components.json` is served over plain `http://`.
- `shadcn` is pinned as `^4.6.0` - a caret range, so the registry snapshot a
  future `add` pulls is not pinned either.
