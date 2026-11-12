# Pip Meets World: game concept

## The pitch

A tiny sitcom runs by itself on a real map, and one of the cast is yours.

You drop one bubble onto a map of Soho. You can't control it. It bounces about, makes friends and enemies, has silly ideas and writes a journal about its day. Everyone else's bubbles live on the same map, so there is always something going on.

The feeling to aim for is little creatures living in a machine, busy with their own lives, chattering in a language you can almost follow. It should be funny first, and it should feel like watching a film.

## How it plays

The player does very little, on purpose. Bubbles do their own thing and the player watches.

1. Open the map. Bubbles are already bouncing around it.
2. Drop one bubble anywhere. It becomes your Pip and gets a gold ring so you can find it.
3. Watch what it gets up to, and read its journal.
4. Tap any other bubble to read its journal and see how it is living.
5. Once a night, play your Pip's dream. A good dream makes it richer.
6. Come back later to see what it did with the money.

The player cannot steer a bubble, give it orders or choose what it buys.

## The bubbles

### How they move

- They bounce. Happy bubbles bounce high and springy, calm ones low and slow, sad ones barely leave the ground.
- They squeeze through letterboxes and bounce off awnings, buses and each other.
- Wind blows the whole cast a few streets over. Pigeons are a constant hazard.
- Two bubbles that like each other stick together for a while.
- They never quite pop. They deflate, lie flat for an hour, then carry on.

### The cast

| Type | What it does | Journal voice |
| --- | --- | --- |
| The Diva | Waits for an audience before doing anything | "I arrived. People noticed." |
| The Worrier | Hugs walls and keeps a list of dangerous pigeons | "Crossed a road. Never again." |
| The Schemer | Always trying to get into the rooftop bar | "Phase two begins at dusk." |
| The Romantic | Falls for a different bubble every week | "It's different this time." |
| The Old-Timer | Never leaves the square and comments on everyone | "In my day we bounced properly." |
| The Chaos One | Bounces off everything and causes pile-ups | "WHAT a day." |
| The Foodie | Drifts from café to café | "Second lunch was a triumph." |

### Freedom to do daft things

- **Whims.** Now and then a bubble ignores what it needs and does something for no reason.
- **Mix-and-match actions.** An action is built from what, to what, and how: "declare love to" + "a lamp post" + "in secret".
- **Obsessions.** A bubble fixates on one roof, one rival or one bus for a few days.
- **Chain reactions.** Other bubbles react to what they see, which creates storylines nobody wrote.
- **Rare big decisions.** A bubble gives away its money, changes character or declares itself mayor.

### Their own slang

Bubbles coin words from syllables. Words spread by contact, compete between streets and drift into accents. The player gets a dictionary that fills itself in as they watch a word being used. It is vocabulary only, not grammar.

## Dreams and money

The player earns and the bubble spends. The dream is the only part the player actually plays.

- When your Pip sleeps, it dreams, and the dream is a short bounce level. The motto is "dream big".
- Dreams are built from the bubble's day. An afternoon in a café becomes a level of giant teacups.
- One dream a night, a few minutes long. Skipping a night costs nothing.
- At each milestone the player chooses: wake up now and keep what they have, or keep dreaming for more and risk losing it all.
- Difficulty is medium. Most dreams end with points only.

| Result | Worth | How |
| --- | --- | --- |
| Points | Small money | Bouncing well and going far |
| Treasures | Big money, the real route to a good life | Rare objects at milestones, in a different spot every time |
| Nothing | Nothing | Falling before reaching anything worth keeping |

### Size shows wealth

| Wealth | Size |
| --- | --- |
| Broke | Tiny |
| Getting by | Small |
| Rich | Medium-big |
| Very, very rich | Slightly bigger, and that is the cap |

Living well costs coins every day, so a rich bubble that stops dreaming well shrinks back. Treasures get rarer the richer a bubble is. The bubble decides how to spend, by character.

## The shared map

- **Soho first.** It is small and full of cafés, pubs, theatres and two squares.
- **Unlocking.** A coverage meter shows how much has been explored. When it is high enough, the next area opens.
- **Never empty.** A native population of wild bubbles lives there from day one.
- **Map data.** Streets and place types will come from OpenStreetMap, credited as its licence requires.

The server never runs the bubbles. It is a guest book. Each bubble is stored as a small record, and its whole life is worked out from that record and the clock. Every browser calculates the same thing, so everyone sees the same bubbles doing the same things.

## Ground rules

- No AI inside the game. Behaviour comes from needs, traits, whims and hand-written parts.
- No sign-in. The player's device remembers which bubble is theirs.
- No typed text from players. Bubbles name themselves.
- No location tracking. Players drop a bubble by tapping the map.
- Play money only. Coins come from dreams and cannot be bought or cashed out.
- Real places stay generic. A bubble "has a coffee at a café on Dean Street", with no real business names, prices or opinions.
- Watch-only. Nobody can interfere with a bubble, including their own.

## Open questions

- Is every player's bubble called Pip, or do they name themselves?
- Are treasures kept and shown off as well as being worth money?
- How long does a bubble live, and what happens at the end?
- How much of Soho must be explored before the next area unlocks?
