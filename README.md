# ZeroSpace

Wiki and guides for the game ZeroSpace, Versus mode (1v1).

## Wiki

Found a wrong value? Open an [issue](https://github.com/kieirra/zerospace/issues/new?template=wrong-data.md) or use the **Report** button on the entity page. Pull requests with a fix are welcome.

## Guides

One markdown file per guide in [`data/guides/`](data/guides/), with an optional ` ```bo ` block for the build order. Only `title`, `author`, `description`, `patch` and `added` are required. `mercenary`, `hero`, `talents`, `army` and a ` ```bo ` block need `faction`, `talents` also needs `mercenary`.

| Notation | Meaning |
|---|---|
| `1.` | Starts phase 1 |
| `A + B` | A and B at the same time |
| `A -> B` | B when A is done |
| `A (-> B)` | B as soon as A is started |
| `Bestiary (loop Exalted)` | Exalted produced in a loop |
| `when X starts:` / `when X done:` | The group waits for X |
| `2 Bestiary` | Quantity |
| `goal: text` | Goal of the phase |

```bo
1. Idal Conduit + 2 Bestiary (loop Exalted) (-> 3 Legion Labourer) + Citadel
   -> Idal Conduit + Altar
   -> Kraegar + Hallowed Strike
   goal: Take map control and the 3 XP towers
2. when Kraegar starts: Garrison Tower + Idal Conduit + Terror Tower + Armory + Arandi Penumbra
   -> More Feed + Explosive Warhead
   goal: Kraegar out, take B2 and fast tech
```

**Several build orders**: a ` ```bo ` block at the very top of the guide is the opener, shown at the top of the page. Every other ` ```bo ` block is shown in the prose where it is written, for example one per opponent reaction under its own title. A guide can also start with text and have no opener.

````md
## If they go Skrells

```bo
1. Barracks -> 4 Thrall
   goal: Hold the air harass
```
````

Full format: [`data/guides/README.md`](data/guides/README.md).

To add a guide, open a pull request on `data/guides/`, fill the [Add a guide](https://github.com/kieirra/zerospace/issues/new?template=guide.md) issue template, or contact Kieirra on the ZeroSpace Discord.

## Development

```sh
pnpm install
pnpm dev
pnpm test
```
