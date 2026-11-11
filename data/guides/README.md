# Guides

One markdown file per guide, published on `/guides`. The file name is the URL: `exalted-arandi.md` is `/guides/exalted-arandi`.

A guide with a ` ```bo ` block is a **build order**. Without it, it is a **general guide**. The build fails on any invalid guide, with the file and the line to fix.

To propose a guide without a pull request, open the [Add a guide](https://github.com/kieirra/zerospace/issues/new?template=guide.md) issue template.

## Frontmatter

| Field | Build order | General guide | Rule |
|---|---|---|---|
| `title` | required | required | 3 to 60 characters |
| `author` | required | required | not empty |
| `description` | required | required | 40 to 240 characters, a summary of the build or the guide |
| `patch` | required | required | `N` of a known `Update #N` patch |
| `added` | required | required | `YYYY-MM-DD`, date the guide is added (NEW label and order) |
| `faction` | required | forbidden | `protectorate`, `grell`, `the-legion`, `the-xol` |
| `mercenary` | required | forbidden | `arandi`, `chakru-kingdom`, `endari`, `free-corsairs`, `marran`, `valkaru` |
| `hero` | required | forbidden | exact name of a hero of the faction or the mercenary: the free starting hero. Other heroes go in the build order steps |
| `talents` | required | forbidden | 7 digits, `1` or `2`, one per talent level |
| `army` | required (1 or more) | forbidden | exact unit or hero names of the faction or the mercenary |
| `vs` | required (1 key or more) | forbidden | opponent faction (`protectorate`, `grell`, `the-legion`, `the-xol`) to a rating from 1 to 5 |
| `style` | required | forbidden | `one-base`, `expand` or `all-in` |
| `strengths` | optional (1 to 6) | forbidden | list of short sentences, shown next to the build order |
| `weaknesses` | optional (1 to 6) | forbidden | list of short sentences, shown next to the build order |

Any other field fails the build.

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

Write the guide below the frontmatter (and below the ` ```bo ` block): free Markdown shown under the build order (tips, game plan).

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
