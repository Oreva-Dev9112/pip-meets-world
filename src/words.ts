import { R, pick } from './random';

// The dots make up their own words. You work out what one means by hearing it enough times.

export type Concept =
  | 'hello' | 'berry' | 'gift' | 'night' | 'pond' | 'stones' | 'friend' | 'oldones' | 'ow' | 'rain' | 'hat' | 'ball' | 'flower' | 'food' | 'coins'
  | 'yes' | 'no' | 'what' | 'shh' | 'look' | 'watcher' | 'love' | 'plan' | 'tired';

const MEANING: Record<Concept, string> = {
  hello: 'hello',
  berry: 'berry',
  gift: 'the gifts that fall from the sky (that is you)',
  night: 'time to go home',
  pond: 'the thing in the pond',
  stones: 'the stones that count themselves',
  friend: 'friend',
  oldones: 'the old ones, who went north',
  ow: 'stop poking me (that is also you)',
  rain: 'rain, and also running',
  hat: 'hat, but a fancy one',
  ball: 'ball, or kick, or both',
  flower: 'the flower everyone keeps visiting',
  food: 'something tasty',
  coins: 'coins, said sadly',
  yes: 'yes',
  no: 'no',
  what: 'what?',
  shh: 'shh, keep it down',
  look: 'look up',
  watcher: 'the one who watches from up there (that is you)',
  love: 'love, or possibly lunch',
  plan: 'a plan (a secret one)',
  tired: 'tired of everything, in a nice way',
};

/** The short version, shown under a speech bubble once your dot knows the word. */
const GLOSS: Record<Concept, string> = {
  hello: 'hello', berry: 'berry', gift: 'a gift!', night: 'bedtime', pond: 'the pond thing', stones: 'the stones', friend: 'friend',
  oldones: 'the old ones', ow: 'ow', rain: 'rain!', hat: 'fancy hat', ball: 'ball!', flower: 'flower', food: 'food', coins: 'no coins',
  yes: 'yes', no: 'no', what: 'what?', shh: 'shh', look: 'look up', watcher: 'someone is watching', love: 'love', plan: 'a plan', tired: 'tired',
};

/** Every syllable has a recorded clip in public/voice, so the dots can say it. */
export const SYLLABLES = [
  'bo', 'fo', 'ti', 'ki', 'mu', 'nu', 'la', 'zi', 'po', 'ru', 'wa', 'de', 'ko', 'mi', 'plip', 'ga',
  'ba', 'bi', 'chu', 'da', 'fi', 'gu', 'ho', 'ji', 'ka', 'lu', 'ma', 'ne', 'no', 'pa', 'pi', 'ri', 'shi', 'su', 'ta', 'to', 'wi', 'yo', 'zu', 'bop', 'nim', 'wuz', 'ku', 'mo', 'na', 'ni', 'pu', 'sa', 'so', 'te', 'tu', 'ya', 'yu', 'bu', 'do', 'go', 'hi', 'ke', 'le', 'lo', 'me', 'ra', 'ro', 'sha', 'wo', 'zo', 'zap', 'pim', 'tok', 'gub', 'fiz', 'pop', 'mip', 'dun', 'lin',
];

/** How many times your dot needs to hear a word before it works out what it means. */
export const TO_LEARN = 6;

export interface Word {
  concept: Concept;
  word: string;
  heard: number;
}

export class Words {
  private readonly words = new Map<Concept, Word>();

  /** Someone says the word for `concept` where your dot can hear. Returns it, and whether this was the time it clicked. */
  hear(concept: Concept): { word: string; learnt: boolean } {
    const w = this.get(concept);
    w.heard++;
    return { word: w.word, learnt: w.heard === TO_LEARN };
  }

  /** The word for `concept`, said somewhere your dot can't hear. */
  word(concept: Concept): string {
    return this.get(concept).word;
  }

  knows(concept: Concept): boolean {
    return (this.words.get(concept)?.heard ?? 0) >= TO_LEARN;
  }

  gloss(concept: Concept): string {
    return GLOSS[concept];
  }

  private get(concept: Concept): Word {
    let w = this.words.get(concept);
    if (!w) {
      let word: string;
      // Mostly two syllables, sometimes three.
      do word = pick(SYLLABLES) + pick(SYLLABLES) + (R() < 0.25 ? pick(SYLLABLES) : '');
      while ([...this.words.values()].some((o) => o.word === word));
      w = { concept, word, heard: 0 };
      this.words.set(concept, w);
    }
    return w;
  }

  meaning(concept: Concept): string {
    return MEANING[concept];
  }

  /** Most heard first. */
  list(): Word[] {
    return [...this.words.values()].sort((a, b) => b.heard - a.heard);
  }
}

/** How a word comes out in a speech bubble. */
export const shout = (word: string, mark?: Mark): string => word[0].toUpperCase() + word.slice(1) + (mark ?? (R() < 0.5 ? '!' : ''));

/** How a word ends: excited, asking, or just said. */
export type Mark = '!' | '?' | '' | '…';
