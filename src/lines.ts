import type { PlaceType } from './places';

// What your dot writes. In each line, @P becomes a link to the place and @D a link to the other dot.

/** The first time it finds each place. */
export const FIRST: Partial<Record<PlaceType, string>> = {
  berries: 'Found @P. I have eaten a responsible amount. (I have not.)',
  pond: 'Found a pond. Something in it looked back at me. I am calling it @P and we are leaving it at that.',
  oak: 'Found @P. I looked up at it for so long that I fell over.',
  meadow: 'A whole field of yellow. I lay down in @P for one minute. It is now evening.',
  bridge: 'Found @P. One plank is missing. Somebody used to cross here a lot. Nobody does now.',
  stones: 'There is a ring of stones on the hill. Nobody I have met built @P. I counted nine stones. Then ten. I do not like that.',
  cave: 'Found @P. It hums. I hummed back and it stopped. Rude.',
  door: 'There is a door in the hillside. Too small for anything big, exactly right for me. @P. I am going in tomorrow.',
  tower: 'Found @P. Who climbs a tower and takes the stairs with them when they leave?',
  edge: 'Reached @P. It is wet. The map stops being a map here. I stood very still and then came back.',
};

/** Going back to a place, in order, one per visit from the second. */
export const AGAIN: Partial<Record<PlaceType, string[]>> = {
  door: ['Went back to @P. It was open today. Stairs going down, and a smell like rain.', 'Down the stairs at @P there are marks on the wall. Tally marks. Someone counted a great many days here.', 'The marks at @P stop halfway along the wall. I counted them twice. I did not count them a third time.'],
  stones: ['Counted the stones at @P again. Eleven.', 'Twelve stones now at @P. One of them is warm.'],
  cave: ['@P was humming a different tune today. I think it is practising.'],
  pond: ['The thing in @P looked back again. I waved. It did not. Fine.'],
  berries: ['Back at @P. Purely to check on them.'],
  bridge: ['Found a second plank from @P, far downstream. Somebody left in a hurry.'],
  tower: ['Walked all the way round @P. There is writing near the top. Too high to read. Obviously.'],
};

/** Meeting a neighbour, by how well they know each other. Stage 3 is when the name comes out. */
export const MEET: (string | null)[] = [
  null,
  'Passed @D near @P. Neither of us said anything. Tense.',
  'Saw @D again. I nodded. They nodded. Progress.',
  null,
  '@D and I both reached for the same berry. @D let me have it. Suspicious.',
  'Walked with @D as far as @P. We disagreed about clouds the whole way.',
  '@D showed me a shortcut. It was longer. I did not mention it.',
];
export const NAMED = 'Their name is @D. I know this because @D told a tree, loudly.';

/** Once they are friends. */
export const FRIEND = ['Sat with @D by @P and said nothing for ages. Good talk.', '@D says the old ones went north. I asked which old ones. @D changed the subject.', 'Told @D about the gifts from the sky. @D has never had one. Interesting.', '@D waited for me at @P. Nobody has waited for me before.'];

/** Finding the gifts you leave. The last one repeats. */
export const GIFT = ['Someone left a berry on the path. Nobody around. I looked up for a while.', 'Another gift on the path. I am starting to think the sky likes me.', 'A third gift. I said thank you, upwards, in case.', 'Gift again. I left half of it out for whoever keeps doing this.'];

export const ARRIVED = 'I have arrived. There is a tree, some grass, and nobody to explain anything. Good.';
export const NAMED_PIP = 'The others have started calling me Pip. I have decided to allow it.';
export const ROOF = 'I have built a roof at @P. It is mostly leaves and confidence.';
export const ODD = 'Odd thing. Every place I find, somebody found first. Where did they all go?';
export const QUIET_DAY = 'Nothing happened today. It was lovely.';
export const busyDay = (n: number): string => 'Home. ' + n + ' new places today. My legs have filed a complaint.';

/** Working out a word. */
export const learntWord = (word: string, meaning: string): string => `Worked out that "${word}" means ${meaning}. I have been nodding along for days.`;

/** The dream, written when Pip wakes. */
export const dreamKept = (things: string, n: number): string => `Dreamt of ${things}. Woke up holding ${n > 1 ? 'them' : 'it'}. I have put ${n > 1 ? 'them' : 'it'} on the shelf at @P and I am not answering questions.`;
export const dreamCaught = (things: string): string => (things ? `Dreamt I nearly had ${things}. A gull took it. Woke up with nothing. Typical.` : 'Dreamt about gulls. I do not want to talk about it.');
export const dreamSparkles = (n: number): string => (n ? `Nice dream. Sparkles, mostly. I counted ${n}.` : 'Dreamt of nothing much. Restful.');
export const KEY_FITS = 'The little brass key is exactly the size of the keyhole at @P. I am choosing not to think about that.';

/** The first time your dot comes across each kind of toy. */
export const TOY_FIRST: Record<string, string> = {
  ball: 'Found a ball on the path. I kicked it. It went further than expected. We were both surprised.',
  hat: 'Someone left a hat. I am wearing it now. I look important.',
  umbrella: 'An umbrella appeared. It is not raining. I am holding it anyway, in case.',
  kite: 'Found a kite. I held the string. Now it is holding me, a bit.',
  flower: 'Somebody planted something near @P. I am keeping an eye on it.',
};
export const TOY_AGAIN = ['More things keep turning up. The sky has been busy.', 'Another one. I have started leaving a thank-you note upwards. It keeps blowing away.'];

/** A neighbour takes a toy off your dot. @D is the neighbour. */
export const TOOK: Record<string, string> = {
  hat: '@D took the hat. @D says it suits @D better. It does, slightly.',
  umbrella: '@D asked to borrow the umbrella. @D has not given it back. @D says the clouds are watching.',
  kite: '@D had a go with the kite. @D did not give it back. Kites do that to you.',
};

export const BLOOM = 'The thing near @P has turned into a flower. Everyone keeps stopping to look at it. Including me.';

/** When it rains. @P is wherever your dot sheltered. */
export const RAIN = ['It rained. I hid under @P and listened to it for a while. It had a lot to say.', 'Rain again. I waited it out at @P. I am getting good at this.', 'More rain. @P is dry, mostly. I counted drips.'];
export const RAIN_OUT = 'It rained and there was nowhere to hide. I am now mostly pond.';
export const RAIN_UMBRELLA = 'Rain! I had the umbrella. I have never been so right about anything.';

export const WIND_KITE = 'Wind! The kite went up and I nearly did too. Best day.';
export const WIND_HAT = 'The wind took my hat. It is somewhere downwind now, being important without me.';
export const WIND_HAT_OTHER = "@D's hat blew away. @D chased it for ages. I helped by watching.";
export const WIND = 'Very windy today. I held on to a tuft of grass until it passed.';

export const POKED = 'Something keeps poking me. Gently. I have decided it is affection.';

// ---------- The town ----------

export const CAUSEWAY = 'There is a causeway going north from the shore. I am almost sure it was not there yesterday. @P.';
export const CAUSEWAY_ODO = 'Odo says the old ones went north, over the water. This morning there is a causeway there. I am almost sure there was not one yesterday. @P.';
export const TOWN_ARRIVE = 'Crossed the causeway. There is a whole town on the other side. Streets, windows, smells. Everyone is busy and nobody looked up. I think I have found where they all went.';

/** Finding each venue. @P is the venue. */
export const VENUE_FIRST: Record<string, string> = {
  cafe: 'Found @P. It is a café. Everyone in it is holding a cup and staring at nothing. I joined in.',
  bakery: 'Found @P. It smells like the best part of the morning.',
  pub: 'Found @P. Loud inside. Somebody was singing. Somebody else was asking them to stop.',
  theatre: 'Found @P. There is a stage and a curtain and someone crying on purpose. I clapped at the wrong time.',
  books: 'Found @P. Full of books. I opened one. It was about a dot who goes on a journey. I put it back quickly.',
  records: 'Found @P. They sell round flat things that make noise. I did not buy one. I stood near one for an hour.',
  market: 'Found @P, in the square. Stalls, shouting, a fountain. I did not know what anything was for. I loved it.',
};
export const spent = (coins: number): string[] => [`Spent ${coins} coins at @P. Money well spent, probably.`, `Back at @P. ${coins} coins. Worth it.`, `Treated myself at @P. ${coins} coins. Do not tell anyone.`];
export const BROKE = 'Could not afford anything at @P. Looked through the window instead.';
export const dreamCoins = (n: number): string => `Woke up ${n} coins richer. Unrelated, surely.`;

// ---------- Being watched ----------

/** Your dot on being watched, by how used to it it is. */
export const WATCHED_PIP = [
  'Sometimes I get the feeling someone is watching. A nice someone, I think. I looked up and smiled, just in case.',
  'The watching feeling again. I have decided it is whoever leaves the gifts. I waved.',
  'Waved up at the sky this morning. I am almost sure something waved back.',
];

/** Seeing another dot notice the watcher. @D is the other dot. */
export const WATCHED_OTHER = [
  '@D stopped and stared straight up at the sky for a long time. Then pretended @D had not. I pretended not to see.',
  '@D looked up at the sky again and went very casual. @D is not good at casual.',
  '@D waved at nothing in the sky today. I waved too. It felt polite.',
];

/** Overhearing a whispered chat about the watcher. @D is one of them. */
export const GOSSIP = 'Heard @D whispering about "the one who watches". They both looked up, then pretended they had not.';

// ---------- Inside the tower ----------

/** Bouncing all the way to the top of the Stairless Tower, the first time. */
export const towerTop = (writing: string): string => `Bounced all the way up the inside of @P. No stairs needed. At the top, in letters bigger than me: “${writing}” I have read it eleven times. I still do not know which door.`;
export const TOWER_AGAIN = 'Bounced up @P again. The writing still says the same thing. I checked.';
export const TOWER_TRIED = 'Tried to bounce up the inside of @P. Got some of the way. The tower is taller from the inside.';

// ---------- Bounce games ----------

/** What a dot says before its bounce course. {N} is its name. */
export const COURSE_INTRO: Record<string, string> = {
  pip: '{N} has never seen so many things to bounce on.',
  worrier: '{N} has checked the course for danger. There is a lot of danger. {N} would like you to be careful with it.',
  diva: '{N} has been waiting for an audience. Bounce beautifully.',
  schemer: '{N} built this course. {N} will not say why there are so many thorns.',
  romantic: '{N} bounces best when someone is watching. You are watching.',
  oldtimer: '{N} used to bounce this course every morning. In {N}’s day it was uphill both ways.',
  chaos: 'GO GO GO! {N} is already halfway down it in its head!',
  foodie: '{N} says there are snacks at the end. There are not. Go anyway.',
};

/** Its diary, after a game of bounce with you. */
export const PLAYED_CLEAN = 'Someone up there sent me bouncing round a whole course. Made it through the hoop without a scratch. I am telling everyone.';
export const PLAYED_WON = 'Bounced the whole course today, with help from above. Lost some air on the thorns. Got it back. Made it.';
export const PLAYED_QUIT = 'Got bounced about by the sky for a bit, then it stopped. I am fine. Slightly flatter.';

/** Your dot's journal, the first time it plays, or sees another dot play. @D is the other dot. */
export const PLAYED_PIP = 'Bounced through a whole course of thorns and planks today and came out the other side through a golden hoop. I do not know who built it. I would like to thank them.';
export const PLAYED_OTHER = 'Watched @D bounce an entire course, thorns and all, and come out through a golden hoop. @D will not stop talking about it.';
export const PLAYED_OTHER_QUIT = '@D went bouncing off over some thorns and came back a bit deflated. @D says it was on purpose.';
