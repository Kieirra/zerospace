# Guides

One markdown file per guide. The file name is the URL: `exalted-arandi.md` is `/guides/exalted-arandi`. If something is wrong, the build tells you the file and the line to fix.

No pull request? Open the [Add a guide](https://github.com/kieirra/zerospace/issues/new?template=guide.md) issue template.

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

Use the exact names of the wiki (`Legion Labourer`, not `harv`). A ` ```bo ` block at the top is the main build order, the others are shown where you write them.

## Frontmatter

| Field | Required | Value |
|---|---|---|
| `title` | yes | 3 to 60 characters |
| `author` | yes | your name |
| `description` | yes | 40 to 240 characters |
| `patch` | yes | game patch number, e.g. `18` |
| `added` | yes | `YYYY-MM-DD` |
| `faction` | no | `protectorate`, `grell`, `the-legion`, `the-xol`. Needed by a ` ```bo ` block and the fields below |
| `mercenary` | no | `arandi`, `chakru-kingdom`, `endari`, `free-corsairs`, `marran`, `valkaru` |
| `hero` | no | starting hero |
| `talents` | no | 7 digits, see below. Needs `mercenary` |
| `army` | no | units and heroes of the build |
| `vs` | no | rating from 1 to 5 per opponent, e.g. `{ grell: 4, the-xol: 2 }` |
| `style` | no | `one-base`, `expand` or `all-in` |
| `strengths`, `weaknesses` | no | short sentences |

## Talents

One digit per level, from 1 to 7: `1` = top talent in the game, `2` = bottom talent (the mercenary talent on levels 2, 4 and 6). `talents: 1212111` = mercenary talent on levels 2 and 4, top talent everywhere else.

## More notation

| Notation | Meaning |
|---|---|
| `when Kraegar starts:` | The line starts as soon as Kraegar is started |
| `when 150 hexite and 100 flux:` | Both resources in the bank |
| `Dreadnought [building]` | When a name is both a unit and a building |
| `"scout"` | Text without a wiki link |
| `Hallowed Strike^1` then `^1: text` | A note, written at the end of the block |

A block can start at any phase number, e.g. `2.` for a different phase 2. Keep each phase to 2 to 4 lines. Start and end each block with ` ``` ` at the beginning of a line, and do not use curly braces in the text of a guide (the frontmatter is fine).

## Licence

Guides are published under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). By submitting a guide you agree to publish it under this licence.
