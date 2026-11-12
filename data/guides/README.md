# Guides

One markdown file per guide, published on `/guides`. The file name is the URL: `exalted-arandi.md` is `/guides/exalted-arandi`.

Only `title`, `author`, `description`, `patch` and `added` are required: any other field, and any ` ```bo ` block, is optional, from a full build order to plain text. The page only shows what the guide has. The build fails on any invalid guide, with the file and the line to fix.

To propose a guide without a pull request, open the [Add a guide](https://github.com/kieirra/zerospace/issues/new?template=guide.md) issue template.

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
| `1.` at the start of a line | Starts step 1, shown as Phase 1. Steps are numbered 1, 2, 3... without gap |
| `A + B` | A and B started at the same time (a group) |
| `A -> B` | B waits for the previous group to be done |
| line starting with `->` | Continues the current step with a new group |
| `when Kraegar starts: A + B` | The group starts as soon as Kraegar is started. At the start of a step or right after `->`. Kraegar must appear on an earlier line, `[kind]` accepted |
| `when Armory done: A + B` | The group starts when Armory is done. Replaces the condition shown by default in the When column |
| `A (-> B + C)` | B and C started as soon as A is started (one level, no nesting) |
| `Bestiary (loop Exalted)` | Bestiary produces Exalted in a loop. Exact unit or hero name, right after the item and before its `(-> ...)`, one per item |
| `2 Bestiary` | Quantity (whole number, then a space) |
| `Bestiary` | Exact game name, any case, among the units, heroes, buildings, upgrades and topbar of the faction and the mercenary |
| `Dreadnought [building]` | Picks the kind when a name exists twice |
| `"scout"` | Free text, shown without link |
| `Hallowed Strike^1` | Note reference, right after the name |
| `^1: text` | Note definition, at the end of the block |
| `goal: text` | Goal of the current step (one per step at most) |

Keep each phase short: 2 to 4 lines. Indentation and empty lines are ignored. Each headquarters (Operating Tower, Bloomwell, Garrison Tower, World Engine) is an expansion: it gets a `B2`, `B3`... badge in order.

Copy names from the wiki: no abbreviation, no alias. Use `[unit]`, `[hero]`, `[building]`, `[upgrade]` or `[topbar]` for a name used twice, and `"..."` for free text.

Do not use curly braces in any text of a guide: the site check rejects them.

## Prose

Write the guide below the frontmatter: free Markdown (tips, game plan). Markdown tables are supported.

## Several build orders

A ` ```bo ` block placed first in the body, before any text, is the opener: it is shown at the top. Every other ` ```bo ` block is shown in the prose, where it is written, for example one per opponent reaction under its own title. A guide that starts with text has no opener: the prose starts at the top. In each block, steps start again at 1, bases continue from the opener if there is one (B4 after an opener ending on B3, otherwise B2), `when X` can target the block or the opener, and notes belong to their block. Errors read `bo block 2, line 1: ...`. Open each block with ` ```bo ` and close it with ` ``` `, at the start of a line, outside any list, quote or other block.

````md
## If they go Skrells

```bo
1. Barracks -> 4 Thrall
   goal: Hold the air harass
```
````

## Example

[`exalted-arandi.md`](exalted-arandi.md):

````md
---
title: Exalted Arandi
author: Kieirra
patch: 18
added: 2026-11-11
description: Strong build order to take map control early and snowball, choking the opponent and keeping them off the XP towers.
faction: the-legion
mercenary: arandi
style: one-base
hero: Galavax
talents: 1222211
army: [Galavax, Kraegar, Inquisitress, Exalted, Arandi Judgement, Dreadnought]
vs: { protectorate: 4, grell: 2, the-legion: 4, the-xol: 5 }
strengths:
  - Very strong early game that needs little micro.
  - The Galavax and Exalted combo snowballs.
weaknesses:
  - Weak against Skrells.
---

```bo
1. Idal Conduit + 2 Bestiary (loop Exalted) (-> 3 Legion Labourer) + Citadel
   -> Idal Conduit + Altar
   -> Kraegar + Hallowed Strike
   goal: Take map control and the 3 XP towers
2. Garrison Tower + Idal Conduit + Terror Tower + Armory + Arandi Penumbra
   -> More Feed + Explosive Warhead
   goal: Kraegar out, take B2 and fast tech
3. Inquisitress + Arandi Judgement + Lightning Spear + Burning Fireball + Improved Charge + Wake of Fire
   -> Garrison Tower + Idal Conduit + 2 Exalted
   goal: Late game, every hero upgrade, close the game
4. Dreadnought [unit]
   goal: Dreadnought finisher
```
````

## License

License: guides in this folder are published under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). By submitting a guide you agree to publish it under this license.
