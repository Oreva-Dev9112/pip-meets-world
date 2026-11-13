# Pip Meets World

A little dot arrives on an island it knows nothing about. It explores by itself, finds strange places, slowly gets to know its neighbours and writes a journal about all of it. You can't steer it. You watch, read, and now and then leave it a small gift.

**Play it:** https://pip-meets-world.vercel.app/

> **Status: growing.** The island, journal, neighbours, toys, weather, dreams, the town, the singing chats, being watched and the bounce games all work. Progress isn't saved yet, so a refresh starts over. See the [roadmap](ROADMAP.md) for what's next.

## The idea

- **One dot, one island.** The island starts hidden under blank chart paper. The map draws itself as your dot explores, and it wears faint paths where it walks.
- **The journal is the game.** Your dot writes it in a dry, small voice. Tap a place in it to fly the map there, or tap a name to see everything about that neighbour.
- **A slow mystery.** A door in the hill with tally marks behind it. A ring of stones that keeps gaining stones. Every place it finds, somebody found first.
- **Neighbours you earn.** Odo the Worrier and Bim the Diva start as "the blue one" and "the pink one". Names come later, and friendship after that.
- **Moods you can see.** Happy dots bounce high and smile; gloomy ones barely leave the ground.
- **Their own words.** The dots chatter in made-up words. Pip works them out by hearing them enough times, and a word list fills itself in. Once Pip knows a word, its meaning shows under the speech bubble.
- **They sing.** Every word is sung like a little music box: each syllable is a note, so a word always has the same tune and you start to know words by ear. Everyone sings in the same key, and each character has its own register and style, from the Chaos One's quick high plinks to the Old-Timer's slow low ones.
- **They chat.** Two dots who meet stop, face each other and take turns, about the rain, being hungry or broke, the Schemer's plan or the Romantic's latest love. Pip joins in, but only with words it has learnt.
- **Bounce games.** Poke a dot and a "Play?" bubble pops up. Tap it to play a side-on bounce course as that dot: thorns and spiky balls let your air out so you shrink and bounce lower, blue air bubbles pump you back up, and word bubbles are points. Each dot's course is its own. The Stairless Tower is a bounce level too, with something written at the top.
- **They know you're watching.** Zoom in on a dot or rest your mouse on it and it starts to feel it: it stops, looks straight out of the screen at you, does something about it (Odo hides, Bim twirls, the Schemer stares back), then carries on, whistling, very casually. They whisper about "the one who watches", and over the days they get used to you and wave.
- **Dreams.** While Pip sleeps you can play its dream, once a night. Treasures it reaches go on the shelf at home, if a gull doesn't get it first.
- **A toy, not a puppet.** You can't steer anyone. You can leave things for them (a berry, ball, hat, umbrella, kite or flower), poke them, or make it rain or blow. Each dot uses a toy in its own way: the Diva takes the hat, the Worrier hides under the umbrella, everyone kicks the ball, and flowers grow over two days.
- **A town in the north.** Once most of the island is found, a causeway appears. Across it is a town grown from its own seed: crooked streets, a fountain square and market, a café, bakery, pub, theatre, bookshop and record shop. Fourteen townsfolk from the full cast (Worrier, Diva, Schemer, Romantic, Old-Timer, Chaos One, Foodie) live there with their own needs, coins and journals. Tap anyone to read theirs.
- **Coins and size.** Dreams bring Pip coins to spend in town. Townsfolk earn and spend by character. Richer dots are bigger.
- **Days and nights.** A dot day lasts 44 seconds. Dusk turns golden, clouds drift over, and in the evening everyone heads home to sleep.
- **Look around.** Drag, pinch, scroll or double-tap to zoom. Zoom out and you rise up towards the clouds.

The full write-up is in [docs/concept.md](docs/concept.md).

## Controls

| | On a computer | On a phone |
| --- | --- | --- |
| Look around | Drag, scroll to zoom, double-click to zoom in | Drag, pinch, double-tap |
| Poke a dot | Click it | Tap it |
| Play a dot's bounce course | Click its "Play?" bubble after poking it | Tap its "Play?" bubble |
| Leave a toy | Pick one in the tray at the bottom, then click the map | The same, with a tap |
| Read the journal | It sits beside the map | Pull up the drawer at the bottom |
| Watch a dot | Zoom in on it, or rest the mouse on it | Zoom in on it |
| Bounce | ← → or A and D to roll, space or ↑ to jump (hold for higher) | The ◀ ▶ and Jump buttons |

Sound starts after your first click or tap, as browsers require. The speaker button in the corner turns it off.

## Who it's for

People who like watching small worlds run by themselves: virtual pets, ant farms, idle games and life sims.

## How the code is laid out

| File | What it does |
| --- | --- |
| `src/main.ts` | Builds the island, draws each frame, and wires up the buttons |
| `src/island.ts` | Grows the island from a seed and paints the terrain and worn paths |
| `src/fog.ts` | The chart-paper fog, and which parts of the island have been seen |
| `src/places.ts` | Home and the ten places to find, and how each is drawn |
| `src/dots.ts` | Your dot and the neighbours: walking, mood-based hopping, faces and speech bubbles |
| `src/cast.ts` | The seven characters: how each moves, spends and writes |
| `src/words.ts` | The dots' made-up words |
| `src/chat.ts` | Two dots talking, a word at a time |
| `src/watch.ts` | Sensing you watching, and what each character does about it |
| `src/bounce.ts` | The bounce game: each dot's own course, and the inside of the Stairless Tower |
| `src/voice.ts` | Their singing voices, made with Web Audio |
| `src/sky.ts` | Clouds, golden dusk and night |
| `src/dream.ts` | The dream you play while Pip sleeps |
| `src/toys.ts` | The toys you can leave, and how they look lying about or being carried |
| `src/town.ts` | Grows the town and causeway, its street routes, and its lit windows |
| `src/townlife.ts` | The townsfolk: needs, spending, whims, meetings and their journals |
| `src/story.ts` | What happens: choosing where to go, finding places, meeting, days and nights |
| `src/lines.ts` | Everything the dot writes |
| `src/journal.ts` | The notebook beside the map |
| `src/icons.ts` | The hand-drawn icons for the toy tray and controls |
| `src/random.ts` | Seeded randomness, so the island is the same every time |

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

TypeScript, Vite and the HTML canvas. No game engine and no backend.

## Licence

[MIT](LICENSE).
