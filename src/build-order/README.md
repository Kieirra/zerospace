# Theorycraft

Place each building at the second you want, let the units follow, see the build simulated second by second on a timeline, and share it with a link.
Mazar's tool, built on top of Kieirra's ZeroSpace wiki: it reads the wiki data and never changes it.

## Open it

Click **Theorycraft** in the site menu, or open http://localhost:4321/build-order/: the editor opens on the build of the
address (`#b=3.…`), else on an empty build of the last faction and mercenary picked in the header (`localStorage`,
`theorycraft.lastSides.v1`; an opened link never changes them), at first The Legion (`DEFAULT_FACTION_ID`, the most
reliable faction for the timeline) and the first mercenary (Arandi), with the default hero of the pair. An
unreadable link shows its message and **Start a new build**.

The address is the only storage: the build lives entirely in its link (`#b=3.…`), rewritten 300 ms after each change
(no new browser history entry). Reload the page to get the same build back; **⤴ Share** copies the link. The browser keeps
only the last faction and mercenary picked. Another build link pasted in the address bar opens it.

## How a build is simulated

A pure engine (`engine/`) plays the build in ticks of 0.1 s:

- the match starts at 0:00 with the main base, 150 Hexite, 0 Flux, 0 / 15 supply and full Hexite workers;
- the main base (B1) of every faction sits on a rich Hexite spot (448 / min, 5,800 Hexite); every other base mines at
  the normal rate (336 / min, 4,300 Hexite);
- the hero picked at match start comes for free at 0:15; the Legion has 3 heroes: that one and 2 bought at the Altar;
- supply is capped at 200 for every faction;
- a mercenary building has 1 slot when it completes, then gains 1 every 90 s, up to 4 (`productionCharges` in the data);
- a Xol producer (Gyroforge, Spectral Foundry, Xyther Assembler) has 1 production charge when it completes, then gains 1
  every 35 s, up to 4 (see Xol below).

The build is two lists:

| List | Holds | The player sets | The engine computes |
|---|---|---|---|
| `timed` | Buildings, mercenary buildings, researches, transformations, talents and events (Misc) | A click time `at` (whole seconds); a transformation may name its building | The start: the first tick at or after `at` where the requirements are finished, a research slot is free and the resources and start priority allow; for a Misc step, when it applies (see Misc steps) |
| `queued` | Units, harvesters, Altar heroes, mercenary recruits, Xol merges and Replicate copies | Their order, optionally a building (pinned) and a time `at` (not before, whole seconds) | The building that makes each one (Auto when not pinned) and its start |

- Every building has one production slot (units, harvesters, Altar heroes, recruits: one at a time) and one research
  slot (researches and transformations: one at a time), used in parallel.
- `queued` is walked in order at every tick. A pinned unit enters its building once that building is finished, its
  production slot is free and no older unit pinned there still waits. An Auto unit enters the first building able to
  make it whose production slot is free, in lane order (the base, then the buildings by click time). Once in, it holds
  the slot until it is done, its wait for resources included. Three free Barracks and three Auto units: one each, in
  parallel.
- A unit with a time `at` never enters before it, pinned or Auto; until then it holds no one: the next units of its
  lane may enter before it. Setting or moving a time sorts `queued` by time, the units without one
  first, so the order of a lane follows the times.
- A unit set to **Loop until the end** is made again on the building that made it once its previous copy is done,
  until every step outside the loops (timed or queued) is done: the copy in production then finishes, a copy still
  waiting is cancelled. A copy enters after the units of the build waiting for that building, with the start priority
  of any unit: a loop that spends everything keeps a Citadel waiting. While a step outside the loops never ends, the
  loop goes on up to the horizon (30 minutes). Only a unit loops, never a harvester, an Altar hero, a recruit, a merge
  or a Replicate copy; a unit made in no time loops only when its buildings make it with a charge (Xol).
- A recruit enters when a slot of its own mercenary building is ready and, if set, its time `at` has come; it starts
  as soon as its cost is in the bank.
- A transformation goes to its building, else to the first building of its kind not transformed yet; once done, the
  building also makes the units of its new form.
- Start priority, read from `rules.startPriority` (`rules/rules.data.ts`) and never shown: bases, then mercenary recruits,
  then supply buildings, then units, then everything else. The Legion makes its harvesters before its bases. Orders
  ready in the same tick start in that order, then by click time, then by their place in their list. The first one
  (recruits aside) that lacks resources holds the start of every later one: units that spend everything keep a Citadel
  waiting, as in the game. A lack of supply, of a mercenary slot, of a production charge or of units to merge never
  holds the others.
- A requirement that is in the build but not finished yet is a wait (`waits Barracks`), never an error; a requirement
  absent from the build is an error. A unit no building of the build can make never stays in the build.

There are no quantities, no click rules and no queue of 5 any more: one step is one order.

The engine reports what it cannot place (missing producer, requirement, hero slot) as diagnostics on the steps, with
the name and the time of the step they refer to.

## Xol

The Xol make their tier 1 units with production charges, merge them into stronger units and copy units with
Replicate (US-009).

### Production charges

- A Gyroforge, a Spectral Foundry or a Xyther Assembler has 1 charge when it completes, then gains 1 every 35 s, up to
  4 (`PRODUCTION_CHARGES_OVERRIDES` in `game-data/game-data.constants.ts`). A charge makes a Roller, a Xyther or a
  Spectron at once: the build times of the assets are not used.
- A unit enters its building when a charge is ready and spends it when it starts; it waits for the Hexite there, held
  by the strict reservation as any unit (only a recruit is spared). Idle for long, a building stores 4 charges: 4
  units ASAP come out in the same tick when the Hexite is there.
- The charges show as the orange lines of the mercenary slots; the wait reads « waits a charge ».
- Overclocked Production (Misc): +1 charge at most and a recharge 25% faster (28 s), for the producers completed after
  the talent only (one still being built gets it).

### Merges

- The 8 merges come from the data (`mergedFrom`): Echo = 2 Roller, Gravitron = 3 Roller, Defiant = 2 Xyther, Aegis = 3
  Xyther, Synapse = 2 Spectron, Eradicator = 3 Spectron, Paradox = Defiant + Synapse + Echo, Cataclyst = Aegis +
  Eradicator + Gravitron.
- A merge is a queued step with no building. It starts at the first tick where its time `at` has come, its required
  building is finished (Molten Core, World Forge), its inputs are free in the army and its supplement is in the bank.
  Its start priority is the one of a unit.
- The engine keeps an army: every unit made (a pack of 2 Rollers is 2 units), copy or merge, never lost. A merge takes
  its inputs at its start, the oldest free ones first; two merges that want the same units start in start priority
  order, the other one waits (« waits Roller »).
- It pays its supplement: its data cost minus the data cost per unit of its inputs (Echo, Defiant, Synapse 50 Flux;
  Gravitron, Aegis, Eradicator 50 Hexite and 100 Flux; Paradox and Cataclyst nothing). Its supply is the one of its
  inputs: the supply used does not change.
- It lasts its build time divided by 1.5 (`rules.mergeTimeDivisor`: every merge is done in a power field), halved
  again by Improved Systems: 10.7, 16 or 33.3 s.
- It shows on the lane of the input ready the latest (on a tie, the higher lane), right after it. One that never starts
  shows on the higher lane of the producers of its tier 1 units, else on the starting base, with « Never starts: 2
  Roller missing. ».
- An input no building of the build can make keeps the merge in the build, in error: « Needs Roller: no Gyroforge in
  the build. ». A Paradox or a Cataclyst is owned once at a time in game: the 2nd one gets a warning, the tool never
  loses units.

### Replicate

- One step is one copy of one Xol unit (a unit, a merge or a copy): `producerUid` `replicate`, the entity id of its
  target. It needs a free unit of its target and the supply of one unit, costs no resource, and joins the army after its
  stun of 16 s (6 s with Efficient Replication). It shows on the lane of the free unit of its target ready the latest.
- Its top bar energy (`topbarEnergyCosts` of the data) is never checked: the reserve is unknown. The energy spent by the
  copies started is told above the timeline: « Top bar energy not checked: 54 spent by Replicate. ».

### World Forge and talents

- The World Forge researches 3 upgrades of its group (`EXCLUSIVE_GROUP_LIMITS`): a 4th one is refused, « At most 3 of
  this group: Damage, Vitals and Weapon Range are already in the build. ».
- Misc talents: Instant Power Core (a Power Core is ready at its start), Overclocked Production, Improved Systems,
  Efficient Replication.

## Misc steps

The tool does not simulate XP: the player places, at the time they choose, the talents that change the economy, the
Tower XP creeps (8 Elder Arkanid × 5 Hexite, no respawn) and, for the Protectorate, the Reinforcements. Their
numbers come from the wiki values of the talent (`game-data/game-data.misc.ts` says which, with their status and owner), or
from `game-data.misc.ts` itself for an event.

1. A Misc step is no order. It is kept in `timed` like a building, but the engine applies it from its own list: no
   queue, no reservation, no start priority, and the loops never wait for it.
2. At each tick, after the orders that end and before the starts, every Misc step whose time has come is applied, by
   time then place in `timed`. A Reinforcements whose whole group does not fit in the free supply waits and is tried
   again at the next tick.
3. A talent or an event applies at its time; a Reinforcements at the first tick at or after it where the supply allows.
4. One helper gives the cost of an order and one its duration, read when it starts: the multipliers of the applied
   talents that target it, multiplied together. An order already started keeps its cost and time.
5. Flux income: the harvesters × (1 + the Flux income percents / 100), one formula for the income and the start checks.
6. Free units: no cost, no supply check (Reinforcements aside), their supply counted, even over the cap: the next paid
   units then wait for supply. Free harvesters (Lore of Flux: one Flux node of them, the Harvesters per
   node of the faction) join the harvesters, never past the harvester cap, and the harvester steps keep room for them
   under that cap.
7. The skipped start checks never jump over the time of a Misc step.
8. The simulation ends when every order is done and no Misc step is still to come. A Reinforcements still held by the
   supply then never applies: « Never applies: not enough free supply for 12. ».

A talent is allowed once (« Already in the build. »), an event as often as wanted. Entrenched Hideouts raises the
Outposts allowed to 3. Unending Army makes one Thrall per faction unit made after it (no harvester, no hero, no
recruit); Hounds of War one Hound per recruit of the Valkaru War Vault.

In the link, a faction talent is `t.<slug>`, a mercenary talent `mt.<slug>`, an event `e.<slug>`: the link stays `3.`.
A Replicate copy is the queued tuple of its target with the producer `-2` (`[ref, -2]`); a merge has no producer.

## Editor

- Header: title and author; faction, mercenary (always one) and setup hero; Undo, Redo, **↺ Reset** (empties the build, Undo in its
  toast), **Copy as BO** and **⤴ Share** (copies the link).
- **Copy as BO** (off on an empty build) copies the build as a ```bo block to paste in a guide, the reverse of the guide
  import: a step clicked one second after the start of the item before it joins its group (`+`), or the trigger
  `(-> …)` of an earlier item; copies at the same time count (`2 Bestiary`); a unit in a loop is `(loop X)` on its
  building. A new group starts with `->` when the group before it is done, else `when X starts:`, `when X done:` or
  `when m:ss:`; a base opens a new phase. Wiki names only, `[kind]` when a name is shared; a name the guide parser
  cannot tell apart (Legion « Performance Enhancers ») is written as quoted text. No goal, no note, no setup hero, no
  talent nor event. A merge is written by its name (`Echo`), a copy `Replicate (on Synapse)`, copies of one target at
  the same time `2 Replicate (on Synapse)`; a guide reads `(on X)` back, after Replicate only.
- Timeline: one lane per building, in the order they begin, under the Hexite and Flux curves and the free supply
  (cap minus used, never below 0, hidden when the supply is not checked), with idle time, ready marks and the time
  cursor; orange lines where a mercenary slot can be spent. It fits the width up to 3 minutes; a longer build keeps
  3 minutes visible and scrolls sideways (scrollbar, Shift + wheel or trackpad), the lane names staying on the left.
  Its height stops at the bottom of the window, so the page does not scroll: the lanes scroll up and down inside it
  (wheel, scrollbar or trackpad), the axis staying on top. Hold the wheel button and move to pan both ways. Ctrl +
  wheel is the browser's zoom. The time cursor card shows only over the curves or the void of the
  lanes: it hides over any mark, its ✕ or a click handle, and while dragging. Hovering a step shows no tooltip.
  An empty build shows the timeline alone, no message; errors of no step are listed above the timeline. With a Misc
  step, a Misc lane comes right under the starting base: a diamond per talent or event at the time it applies, a
  point per free unit it made (neither moved nor deleted, a click on one selects its step).
- Colors: red only means an error. A step in error is filled red with « ✖ » before its name; researches and the
  buildings where they are done are indigo. A short or instant step keeps a chip wide enough for its icon, the start
  of its name and a click; when it runs over the next step of its lane, that step goes to the row below.
- Add panel, left of the timeline: Buildings, Units, Research, Merc and Misc, four cards a row; only the cards scroll,
  title, Find and tabs stay on top. ◂ at its top right folds it and the timeline takes the room; a narrow bar
  (▸ Add step) brings it back (for the page only). Two entities of a side with the same name show what they upgrade,
  else their kind: « Performance Enhancers (Thrall) », « Performance Enhancers (Steelsworn) ». Units: what the starting building makes first (harvesters, then the others), then
  the wiki order, then the Legion's Altar heroes, the Xol merges in a MERGE section (game menu order, their recipe
  « 2 Roller » in place of their supply). Research: by research building in the Buildings order, then by
  upgraded entity, tier and name; transformations after the research of the building they transform; no building last.
  Misc: the talents of the faction by level, then those of the mercenary, then the events; a Misc card shows its level
  and effects (« +2 Harvesters ») where the others show their cost. Xol: a TOP BAR section with the Replicate card, on
  the unit of the selected step (its energy shown); without a Xol unit step selected it is disabled. Costs one resource a line: Hexite, Flux, Supply.
- Selection: a click on a step selects it and opens its panel; Ctrl/Cmd or Shift + click adds or takes out a step
  (no panel); a press anywhere on the timeline but a step (curves, axis, void of the lanes, idle time) then a drag draws
  a rectangle that selects the steps it touches (added with Ctrl/Cmd/Shift). A click in the void or Escape clears the
  selection.
- Step panel (one step selected): its errors, **Click at** (`m:ss` or seconds, Enter or leaving the field records it,
  Escape restores it; optional for a unit, « As soon as possible » when empty), **Made in** for a unit or a
  transformation (Auto or one of the lanes able to make it), **Loop until the end** for a unit (« ∞ » before its name
  on the timeline; the copies of its loop can be neither moved nor deleted, a click on one selects the step), then its
  times read only: Click (only for a unit made as soon as possible: when it entered its building's queue; else the
  Click at field shows it), Start with why it waited (« Never starts » in red), Ready; **View on wiki** (new tab) and
  Remove. A Misc step: « Talent · Level 2 » or « Event », Click at, its effects, « Applied at 2:10 » (« Never
  applies » in red), View on wiki for a talent, Remove. A click on the setup hero opens its card, with the same link.
  A merge: « Merge · Molten Core », Click at, Inputs (the units it took, a click selects their step; else how many are
  free and which merges took the others), Cost, Start, Ready. A copy: « Replicate · Top bar », Click at, Target,
  Energy, Supply, Start, Ready. A unit a merge took: « Merged into » (« Echo 1:40 », « 1 of 2 · Gravitron 2:10 »).
  Neither has Made in nor Loop; dragged, they only move in time.
- Click handle: the click symbol of a step whose click waits (a building, research or transformation, or a unit with a
  time) turns the pointer into ↔; drag it sideways to move that step's time `at` alone, by whole seconds, between 0 and
  the end of the timeline, the dashed line on it (« Click 0:18 · starts ≈ 0:57 »). The step starts where the simulation
  puts it; the selection and the other steps stay. Escape cancels, a release in place changes nothing, Undo restores it.
- Drag a step sideways to move its time, with the whole selection when it is part of it: the click time of a building,
  research or transformation, the time `at` of a unit, becomes where its mark starts (its simulated start, else its
  click when it never starts) plus the whole seconds the pointer moved, wherever the step was grabbed; the dashed line,
  under the left edge of the dragged mark, shows the time the drop records. Units only,
  dropped over another lane able to make them all, are pinned on it and move in time as above, so the grabbed one lands
  under the pointer (a unit made as soon as possible gets a time); dropped straight up or down, they keep their time. A
  lane unable to make one of them refuses the drop. Drop a palette card on the timeline to add it at that time (a unit: on the lane under the
  pointer). A click on a card adds a building after the latest click of the build, a unit to the queue (on the selected
  building when it can make it, else Auto). Cards that cannot be added are disabled, with the reason in their tooltip.
- Right-click a step: Duplicate or Delete, on the whole selection when the step is part of it (else the step alone
  becomes the selection). Hovering a step shows a ✕ at its right end: it deletes that step alone, Undo in the toast.
- Keyboard, shown only in the right-click menu: Delete or Backspace removes the selection (a building takes its lane with
  it, Undo in the toast); Ctrl/Cmd + C copies it in memory; Ctrl/Cmd + V pastes it at the time under the pointer when it
  is over the lanes (else after the latest click), units on the hovered lane when it can make them; Ctrl/Cmd + D
  duplicates it in place; Ctrl/Cmd + Z, Ctrl + Y undo and redo; the letter of a card adds it.

## Data and values

- Game data: `data/wiki/` (read only), Steam build in `data/wiki/source.json`.
- Values the data does not give yet: `game-data/game-data.constants.ts` (each with its owner: Mazar or Kieirra).
- Rules of the engine: `rules/rules.data.ts`, each with its status (confirmed or provisional) and a note.

Open data points:

- **PO8**: research locations of Grell, the Legion and the Xol, and `veterancy` of the Protectorate;
- **PO10**: some units have no producer in the data (Arkanid, Seedling, Valkaru Beast).
- Xol: the max of 4 production charges and the merge always in a power field are provisional (Kieirra 2026-11-20); the
  top bar energy is not simulated. Unmerge, Anrubic merges, the Molten upgrades and Replicate on mercenary units are
  left out.
- The upgrades no building can host are absent from the tool for now (Legion Terror Tank and Dreadnought upgrades and
  turrets, Xol molten units, Grell Biomass Healing, Protectorate Veterancy): they are done on a unit, which is no lane.
- A unit made only by the building of its name is that building (Dreadnought, Terror Tank, Strider): the unit is absent,
  the building keeps its own cost and time and takes the unit's supply when it starts.

## Code

- `src/build-order/`: the tool, one folder per component or concern (`engine`, `timeline`, `build-editor`, `link`, …).
- `src/pages/build-order/`: the page and the catalog of each side (`/build-order/<side>.json`).
- Files stay under 250 lines.

Checks, all expected to pass:

```sh
pnpm check
pnpm typecheck
pnpm test
pnpm build
pnpm check:variables
```
