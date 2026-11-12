# Pip Meets World

A tiny sitcom of bubbles living their own lives on a real map. You drop one bubble, called a Pip, and then you watch. You can't control it. It bounces around, makes friends and enemies, has silly ideas and writes a journal about its day.

> **Status: just started.** This repo holds the idea, a rough prototype and the first lines of the real game. Most of what's described below isn't built yet. See the [roadmap](ROADMAP.md).

## The idea

- **Bubbles with character.** Each one is a type, such as the Diva, the Worrier or the Schemer, with its own way of moving and writing.
- **They do what they want.** Needs, moods and sudden whims drive them. Nobody steers a bubble, not even its owner.
- **A real place.** The first map is Soho in London. More areas unlock as bubbles explore.
- **Everyone's bubbles on one map.** Tap any bubble to read its journal.
- **Dream big.** When your Pip sleeps, you play its dream. A good dream makes it richer, and richer bubbles are bigger.
- **Their own words.** Bubbles invent slang, and you work out what it means by watching.
- **No AI inside the game, no sign-in, no real money.**

The full write-up is in [docs/concept.md](docs/concept.md).

## Who it's for

People who like watching small worlds run by themselves: virtual pets, ant farms, idle games and life sims.

## What's here now

| Path | What it is |
| --- | --- |
| `src/` | The start of the real game: a bubble whose bounce depends on its mood |
| `prototype/` | A single-file sketch used to try the idea out. Open `prototype/index.html` in a browser. It will be replaced piece by piece. |
| `docs/concept.md` | The game concept |
| `ROADMAP.md` | The build plan |

## Running it

You'll need Node.js 20 or newer.

```bash
npm install
npm run dev
```

Then open the address it prints, usually http://localhost:5173.

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Serve the production build locally |

## Built with

TypeScript, Vite and the HTML canvas. No game engine and no backend yet.

## Licence

[MIT](LICENSE)
