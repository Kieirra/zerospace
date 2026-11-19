# Testing the build order tool

Thanks for testing! The goal: find where the tool does not match the real game (timings, rules, missing units) and
what is unclear in it. Everything stays private: the tool runs on your computer, feedback goes to the private
GitHub repository.

## Before each test session

1. Get the latest version, so everyone simulates the same way:

   ```sh
   git checkout feat/build-order-v2
   git pull
   pnpm install
   pnpm dev
   ```

2. Note the version you test: `git log -1 --oneline` (for example `fe3210d feat(build-order): …`).
3. Open http://localhost:4321/build-order/ (or **Theorycraft** in the site menu).

## Saving your builds

- A build is entirely in its link (`…/build-order/#b=3.…`): faction, mercenary, hero, click times, units and their buildings. The address
  bar always holds the link of the build you are editing.
- Nothing is saved in the browser: keep the links of the builds that matter (bookmark them or paste them somewhere).
- To share a build or report a problem, always give its link (**⤴ Share** copies it).

## Reading the editor

- Red only means an error: a step filled red has a problem, click it to read why. Researches are indigo.
- A build longer than 3 minutes scrolls sideways under the timeline (scrollbar, wheel, Shift + wheel or trackpad).
- The **Units** tab starts with what the starting building makes (harvesters first); the Legion's Altar heroes are at
  its end.
- The **Supply free** curve shows the supply still available (cap minus used).
- Dragging a step moves it by the distance the pointer travels: it lands on the time shown by the dashed line, under
  the left edge of the step.
- Right-click a step to duplicate or delete it (the whole selection when it is part of it); the ✕ shown when hovering
  a step deletes it alone.
- Select several steps with Ctrl + click (Cmd on a Mac) or by drawing a rectangle from an empty spot of the lanes, then
  drag one of them: they all move by the same time. Units dragged onto another building's lane are made there.
- Click a step to set its **Click at** time (`2:35`) or its building (**Made in**), and read when it is clicked,
  starts and is ready. Hovering a step shows nothing.
- When a step waits after its click, drag the small mouse symbol (the pointer becomes ↔) to move its click time only.
- Keyboard: Delete removes the selection, Ctrl + C / Ctrl + V copy and paste it where the pointer is, Ctrl + D
  duplicates it, Ctrl + Z undoes.

## Reporting a problem

Open an issue on the private repository (Issues → New issue), one problem per issue, and copy this template:

```md
**Build link:** http://localhost:4321/build-order/#b=3.…
**Version tested:** fe3210d (git log -1 --oneline)
**Where:** step / timeline / editor menu / … (for example « step 8, Corsair Deadeye »)

**What the tool shows:**
(for example « the Deadeye is recruited at 3:13 »)

**What happens in the game:**
(for example « in game it comes out at 3:25, the outpost has no slot yet »)

**How sure are you:** tested in game / from memory / a doubt

**Screenshot:** (optional, drag the image here)
```

Unclear wording, a button you did not find, a timeline you could not read: report it too, with the same template
(« What the tool shows » / « What I expected »).
