// The characters. Each one moves, feels, spends and writes in its own way.

export type Character = 'worrier' | 'diva' | 'schemer' | 'romantic' | 'oldtimer' | 'chaos' | 'foodie';
export type VenueKind = 'cafe' | 'bakery' | 'pub' | 'theatre' | 'books' | 'records' | 'market';

export interface CharacterTraits {
  /** Shown after the name once your dot knows them. */
  title: string;
  colour: string;
  /** Multiplies walking speed. */
  speed: number;
  /** How far from home they potter about, as a multiple of the usual. */
  roam: number;
  /** How likely they are to wander over towards your dot. */
  curious: number;
  /** The mood they drift back to, from -1 to 1. */
  mood: number;
  /** The toy they go out of their way for, and will take off your dot. */
  wants: 'hat' | 'umbrella' | 'kite';
  /** How a poke changes their mood. */
  poked: number;
  /** Venues they go to whenever they can. */
  likes: VenueKind[];
  /** How often they do something for no reason at all, per choice. */
  whim: number;
  /** Stays out at the pub after everyone else has gone to bed. */
  nightOwl: boolean;
  /** What your dot writes about them once they are friends. @D is their name. */
  lines: string[];
  /** What your dot writes on first meeting one in town. @D is their name. */
  met: string;
  /** Their own journal. {V} is a venue, {N} another bubble, {C} a number of coins. */
  voice: { visit: string[]; broke: string[]; meet: string[]; whim: string[]; pip: string; rich: string; poor: string; watched: Watched };
}

/** Their diary about being watched from above: spooked, getting used to it, and waving. */
type Watched = [string, string, string];

export const CAST: Record<Character, CharacterTraits> = {
  worrier: {
    title: 'the Worrier', colour: '#6C9CF2', speed: 0.8, roam: 0.6, curious: 0.35, mood: -0.3, wants: 'umbrella', poked: -0.15,
    likes: ['books', 'bakery'], whim: 0.03, nightOwl: false,
    lines: [
      '@D has made a list of dangerous clouds. I am on it, under "maybe".',
      '@D will not walk on the sand. "It moves," apparently.',
      'Asked @D what the worst thing that could happen was. @D needed until sunset to answer.',
    ],
    met: 'Met @D outside a shop, reading the warnings on a door. There were none. @D read them anyway.',
    voice: {
      visit: ['Went to {V}. Sat near the exit. Nothing happened. Suspicious.', 'Bought one thing at {V}. Checked it twice.'],
      broke: ['Could not afford {V}. Walked past it quickly so it would not notice.'],
      meet: ['{N} said hello. I said hello back, too loudly. Thinking about it now.'],
      whim: ['Crossed the square without looking both ways. Never again.'],
      pip: 'A small yellow one with a gold ring stared at me. I stared back. We are both still recovering.',
      rich: 'Found {C} coins under a cushion. Now I have to worry about them.',
      poor: 'Down to my last coins. Counted them. Counted them again.',
      watched: [
        'Felt watched today. From above. Hid behind a house until it stopped. It did not stop. I think it is still there.',
        'The feeling of being watched came back. I hid again, but only a little. It has not done anything yet. Yet.',
        'Waved at the sky today. Just in case it was the watching thing. It did not wave back. I think that is how it waves.',
      ],
    },
  },
  diva: {
    title: 'the Diva', colour: '#F29CB7', speed: 1.15, roam: 1.2, curious: 0.7, mood: 0.5, wants: 'hat', poked: 0.2,
    likes: ['theatre', 'cafe'], whim: 0.1, nightOwl: false,
    lines: [
      '@D waited until I was watching before doing anything. Then did a twirl. Then left.',
      '@D says @D is famous on the other side of the island. I have not been there. Neither, I suspect, has @D.',
      '@D asked if I had written about @D yet. I said no. This is not technically a lie any more.',
    ],
    met: 'Met @D, who introduced @D before I asked. Twice. With a bow.',
    voice: {
      visit: ['Arrived at {V}. People noticed.', 'Took the best seat at {V}. It was already taken. Not any more.'],
      broke: ['{V} wanted coins. I offered an autograph. They did not take it.'],
      meet: ['{N} complimented me. Correctly.'],
      whim: ['Stood in the middle of the square until someone looked. It took a while. Worth it.'],
      pip: 'A small yellow fan with a gold ring followed me about. I allowed it.',
      rich: 'Richer by {C} coins. It suits me.',
      poor: 'Temporarily without coins. It is a look.',
      watched: [
        'Someone up there was watching me. Naturally. I gave them a twirl.',
        'My audience was back today. Performed my best twirl. No applause, but you could feel it.',
        'Waved to my public in the sky. They are very loyal. They never look away.',
      ],
    },
  },
  schemer: {
    title: 'the Schemer', colour: '#9B8CFF', speed: 1, roam: 1, curious: 0.5, mood: 0.1, wants: 'hat', poked: -0.05,
    likes: ['pub', 'market'], whim: 0.1, nightOwl: true,
    lines: ['@D has a plan. @D will not say what it is. @D says I am in it.'],
    met: 'Met @D, who asked how many coins I had before asking my name.',
    voice: {
      visit: ['Phase one complete at {V}. Phase two begins at dusk.', 'Watched the till at {V}. For research.'],
      broke: ['Temporarily unfunded. {V} will regret this.'],
      meet: ['Recruited {N}. {N} does not know yet.'],
      whim: ['Followed someone across town for practice. They went to the bakery. Disappointing.'],
      pip: 'There is a new small one in town with a gold ring. Could be useful.',
      rich: 'The plan worked. Up {C} coins. Telling no one.',
      poor: 'The plan did not work. Down {C} coins. There will be another plan.',
      watched: [
        'Something up there is watching. I stared back. It blinked first. Probably.',
        'The watcher again. Acted completely normal. Nobody acts more normal than me.',
        'Waved at the watcher. Part of the plan. The watcher does not know what the plan is. Neither do I yet.',
      ],
    },
  },
  romantic: {
    title: 'the Romantic', colour: '#FF8A80', speed: 0.95, roam: 1, curious: 0.6, mood: 0.3, wants: 'kite', poked: 0.1,
    likes: ['cafe', 'theatre', 'records'], whim: 0.16, nightOwl: true,
    lines: ['@D is in love again. Different one. @D says this time it is real.'],
    met: 'Met @D, who sighed at me. I think it was a good sigh.',
    voice: {
      visit: ['Sat in the window at {V} hoping someone would notice. Someone did. It was the window cleaner.', 'Listened to something sad at {V}. Wonderful.'],
      broke: ['Love does not cost coins. {V} does.'],
      meet: ['Saw {N} across the square. It is different this time.', '{N} said hello. I have thought about nothing else since.'],
      whim: ['Wrote a poem on a wall. Signed it from "a stranger". Everyone knows it was me.'],
      pip: 'A small yellow one with a gold ring smiled at me. Or the sun was in its eyes. Either way.',
      rich: 'Found {C} coins. Spending them all on someone. Not sure who yet.',
      poor: 'Spent everything on flowers. For whom? That is the question.',
      watched: [
        'Someone was looking at me from the sky. I went pink. I am still a bit pink.',
        'They were watching again. Is it me they are looking at? It might be me.',
        'Waved up at the one who watches. I think we have something special. I have not told them.',
      ],
    },
  },
  oldtimer: {
    title: 'the Old-Timer', colour: '#B5C7A0', speed: 0.55, roam: 0.4, curious: 0.3, mood: 0, wants: 'umbrella', poked: -0.1,
    likes: ['market', 'pub'], whim: 0.04, nightOwl: false,
    lines: ['@D remembers when the island had a name. @D will not say what it was.'],
    met: 'Met @D in the square. @D said the town was better before. Before what, I asked. @D just nodded.',
    voice: {
      visit: ['Went to {V}. It used to be cheaper. Everything used to be cheaper.', 'Sat at {V} and told someone how it was. They left. I carried on.'],
      broke: ['{V} has put its prices up. In my day there were no prices.'],
      meet: ['{N} bounced past. In my day we bounced properly.'],
      whim: ['Sat on a different bench today. Do not like it. Will try again tomorrow.'],
      pip: 'A new one came over the causeway. First in a long while. Nobody else noticed. I did.',
      rich: '{C} coins from nowhere. In my day coins came from somewhere.',
      poor: 'Out of coins. Happened in sixty-eight too. Did not like it then either.',
      watched: [
        'Some people say they can feel eyes on them from the sky. Nonsense. Did not look up. Not once.',
        'Did not look up again today. I know it is there. It knows I know.',
        'Fine. I waved. Once. Small. In my day, the sky minded its own business.',
      ],
    },
  },
  chaos: {
    title: 'the Chaos One', colour: '#FFB347', speed: 1.8, roam: 1.6, curious: 0.8, mood: 0.6, wants: 'kite', poked: 0.3,
    likes: ['records', 'pub', 'market'], whim: 0.3, nightOwl: true,
    lines: ['@D bounced off three things on the way over. @D says one of them started it.'],
    met: 'Met @D. Or @D met me, at speed. We are both fine. Mostly.',
    voice: {
      visit: ['WENT TO {V}. Knocked over a thing. Bought the thing. WHAT a day.', '{V}! Again! Why not!'],
      broke: ['No coins! Bounced off {V} instead! Free!'],
      meet: ['Crashed into {N}. On purpose. {N} did not see the funny side. There is always a funny side.'],
      whim: ['Ran round the fountain eleven times. Lost count. Did twelve to be safe.'],
      pip: 'NEW ONE! Small! Yellow! Gold ring! Bounced off it! It bounced back! Friends!',
      rich: '{C} COINS! Spending them NOW.',
      poor: 'Spent all the coins. Do not remember on what. Worth it.',
      watched: [
        'SOMETHING IS WATCHING! Bounced at it! It did not bounce back! Will try harder!',
        'The sky is looking again! Did my best bounce! Twice!',
        'Waved at the sky for ages! Best friends now! It does not know yet!',
      ],
    },
  },
  foodie: {
    title: 'the Foodie', colour: '#7ED8A4', speed: 0.85, roam: 0.9, curious: 0.45, mood: 0.4, wants: 'hat', poked: 0,
    likes: ['bakery', 'cafe', 'market'], whim: 0.08, nightOwl: false,
    lines: ['@D knows where every crumb on the island is. @D will not tell me where the good ones are.'],
    met: 'Met @D coming out of a bakery. @D gave me half a bun without saying anything. Friends now.',
    voice: {
      visit: ['Second lunch at {V}. A triumph.', 'Something new at {V}. Will be thinking about it for days.'],
      broke: ['Smelled {V} from outside. Cheaper. Not the same.'],
      meet: ['Told {N} about the buns at the bakery. {N} did not understand the urgency.'],
      whim: ['Skipped a meal on purpose to see what it was like. Never again.'],
      pip: 'A small yellow one with a gold ring watched me eat. I offered it a crumb. Good manners, that one.',
      rich: '{C} coins! That is a lot of buns.',
      poor: 'No coins. Thinking about soup. Not having soup. Just thinking about it.',
      watched: [
        'Felt watched while eating. Ate faster. Then slower, in case they wanted to see the good bit.',
        'The watcher again. I think they like watching me eat. Most people do.',
        'Waved at the watcher with a bun. Did not share it. There are limits.',
      ],
    },
  },
};

export const CHARACTERS = Object.keys(CAST) as Character[];
