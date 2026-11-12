# ZeroSpace

Wiki and guides for the game ZeroSpace, Versus mode (1v1).

## Wiki

Found a wrong value? Open an [issue](https://github.com/kieirra/zerospace/issues/new?template=wrong-data.md) or use the **Report** button on the entity page. Pull requests with a fix are welcome.

## Guides

One markdown file per guide in [`data/guides/`](data/guides/), with build orders written in a short notation linked to the wiki:

```bo
1. Idal Conduit + 2 Bestiary (loop Exalted) (-> 3 Legion Labourer) + Citadel
   -> Altar
   -> Kraegar + Hallowed Strike
   goal: Take map control
```

Format and examples: [`data/guides/README.md`](data/guides/README.md).

To add a guide, open a pull request on `data/guides/`, fill the [Add a guide](https://github.com/kieirra/zerospace/issues/new?template=guide.md) issue template, or contact Kieirra on the ZeroSpace Discord.

## Development

```sh
pnpm install
pnpm dev
pnpm test
```
