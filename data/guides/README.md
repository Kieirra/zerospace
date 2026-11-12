# Guides

One markdown file per guide, published on `/guides`. The file name is the URL: `exalted-arandi.md` is `/guides/exalted-arandi`.

Only `title`, `author`, `description`, `patch` and `added` are required: any other field, and any ` ```bo ` block, is optional, from a full build order to plain text. The page only shows what the guide has. The build fails on any invalid guide, with the file and the line to fix.

To propose a guide without a pull request, open the [Add a guide](https://github.com/kieirra/zerospace/issues/new?template=guide.md) issue template.

## TL;DR

````md
---
title: Exalted Arandi
author: Your name
patch: 18
added: 2026-11-12
description: Strong build order to take map control early and snowball.
faction: the-legion
mercenary: arandi
---

```bo
1. Idal Conduit + 2 Bestiary (loop Exalted) (-> 3 Legion Labourer) + Citadel
   -> Altar
   -> Kraegar + Hallowed Strike
   goal: Take map control
2. when 400 hexite: Garrison Tower + Armory
   goal: Take B2
```

## If they go Skrells

Free text, tips, tables... and another build order for this case:

```bo
2. when they show Skrells: Barracks
   -> 4 Thrall
   goal: Hold the air harass
```
````

| Notation | Meaning |
|---|---|
| `1.` | A phase |
| `A + B` | Build A and B at the same time |
| `A -> B` | Build B once A is done |
| `A (-> B)` | Build B as soon as A starts |
| `A (loop B)` | A keeps producing B |
| `2 Bestiary` | Quantity |
| `when X done:` / `when 400 hexite:` / `when 2:30:` / `when any text:` | Condition of the line: a building, resources in the bank, a time, or free text |
| `goal:` | Goal of the phase |

Use the exact names of the wiki (`Legion Labourer`, not `harv`). A ` ```bo ` block at the top is the main build order, any ` ```bo ` block lower in the text is shown where it is written. Everything below is the full reference.

## Frontmatter

| Field | Required | Rule |
|---|---|---|
| `title` | yes | 3 to 60 characters |
| `author` | yes | not empty |
| `description` | yes | 40 to 240 characters, a summary of the build or the guide |
| `patch` | yes | `N` of a known `Update #N` patch |
| `added` | yes | `YYYY-MM-DD`, date the guide is added (NEW label and order) |
| `faction` | no | `protectorate`, `grell`, `the-legion`, `the-xol`. Required by `mercenary`, `hero`, `talents`, `army` and any ` ```bo ` block |
| `mercenary` | no | `arandi`, `chakru-kingdom`, `endari`, `free-corsairs`, `marran`, `valkaru`. Required by `talents` |
| `hero` | no | exact name of a hero of the faction or the mercenary: the free starting hero. Other heroes go in the build order steps |
| `talents` | no | 7 digits, `1` or `2`, one per talent level |
| `army` | no (1 or more) | exact unit or hero names of the faction or the mercenary |
| `vs` | no | opponent faction (`protectorate`, `grell`, `the-legion`, `the-xol`) to a rating from 1 to 5 |
| `style` | no | `one-base`, `expand` or `all-in` |
| `strengths` | no (1 to 6) | list of short sentences |
| `weaknesses` | no (1 to 6) | list of short sentences |

Any other field fails the build. The side column of the page shows Starting hero and Talents (`hero`, `talents`), Heroes and Army (`army`), VS (`vs`) and Strengths and Weaknesses, each only when set. Without any of them, the guide uses the full width.

## Talents

One digit per level, from level 1 to level 7: `1` = top talent in the game UI, `2` = bottom talent. On levels 2, 4 and 6, `2` is the mercenary talent.

`talents: 1212111` = level 1 top, level 2 mercenary, level 3 top, level 4 mercenary, levels 5 to 7 top.

## Build order block

| Notation | Meaning |
|---|---|
| `1.` at the start of a line | Starts a phase, shown as Phase 1. A block can start at any number, then phases follow one by one, without gap. |
| `A + B` | A and B started at the same time (a group) |
| `A -> B` | B waits for the previous group to be done |
| line starting with `->` | Continues the current step with a new group |
| `when Kraegar starts: A + B` | The group starts as soon as Kraegar is started. At the start of a step or right after `->`. Kraegar must appear on an earlier line, `[kind]` accepted |
| `when Armory done: A + B` | The group starts when Armory is done. Replaces the condition shown by default in the When column |
| `when 150 hexite and 100 flux: A + B` | The group starts with these resources in the bank: `hexite`, `flux` or both joined by `and`, each once, whole number above 0 |
| `when 2:30: A + B` | The group starts at 2:30 of game time, shown as `At 2:30`. Seconds from 00 to 59 |
| `when they scout you: A + B` | Any other text is shown as is, in italics |
| `A (-> B + C)` | B and C started as soon as A is started (one level, no nesting) |
| `Bestiary (loop Exalted)` | Bestiary produces Exalted in a loop. Exact unit or hero name, right after the item and before its `(-> ...)`, one per item |
| `2 Bestiary` | Quantity (whole number, then a space) |
| `Bestiary` | Exact game name, any case, among the units, heroes, buildings, upgrades and topbar of the faction and the mercenary |
| `Dreadnought [building]` | Picks the kind when a name exists twice |
| `"scout"` | Free text, shown without link |
| `Hallowed Strike^1` | Note reference, right after the name |
| `^1: text` | Note definition, at the end of the block |
| `goal: text` | Goal of the current step (one per step at most) |

The first form that matches wins: `<name> starts` or `<name> done`, then resources, then time, then free text. A `when ... done:` with a name not found fails the build, it is never read as free text.

Keep each phase short: 2 to 4 lines. Indentation and empty lines are ignored. Each headquarters (Operating Tower, Bloomwell, Garrison Tower, World Engine) is an expansion: it gets a `B2`, `B3`... badge in order.

Copy names from the wiki: no abbreviation, no alias. Use `[unit]`, `[hero]`, `[building]`, `[upgrade]` or `[topbar]` for a name used twice, and `"..."` for free text.

Do not use curly braces in any text of a guide: the site check rejects them.

## Prose

Write the guide below the frontmatter: free Markdown (tips, game plan). Markdown tables are supported.

## Several build orders

A ` ```bo ` block placed first in the body, before any text, is the opener: it is shown at the top. Every other ` ```bo ` block is shown in the prose, where it is written, for example one per opponent reaction under its own title. A guide that starts with text has no opener: the prose starts at the top. In each block, phases start at the number you write and rows start again at 1, bases continue from the opener if there is one (B4 after an opener ending on B3, otherwise B2), `when X` can target the block or the opener, and notes belong to their block. Errors read `bo block 2, line 1: ...`. Open each block with ` ```bo ` and close it with ` ``` `, at the start of a line, outside any list, quote or other block.

````md
## If they go Skrells

```bo
2. when they show Skrells: Barracks
   -> 4 Thrall
   goal: Hold the air harass
```
````

## Example

Full guide: [`exalted-arandi.md`](exalted-arandi.md).

## License

License: guides in this folder are published under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). By submitting a guide you agree to publish it under this license.
