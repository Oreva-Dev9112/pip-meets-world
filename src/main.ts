import { CAST } from './cast';
import { callName, drawDot, drawInvite, drawSpeech, inviteBox, makeNeighbours, makePip, type Dot } from './dots';
import { Bounce } from './bounce';
import { COURSE_INTRO } from './lines';
import { Dream } from './dream';
import { Fog } from './fog';
import { H, W, addLand, makeTrail, northShore, paintTerrain, raiseLand } from './island';
import { setIcon } from './icons';
import { Journal } from './journal';
import { drawPlace, findHome, makePlaces, type Place } from './places';
import { Sky, cloudinessFor, darkness, goldenness, makeGlow } from './sky';
import { RAIN_TIME, Story, partOfDay } from './story';
import { Town, type Spot } from './town';
import { TOY_KINDS, TOY_LABELS, drawHeld, drawToy, type Toy, type ToyKind } from './toys';
import { SYLLABLES, TO_LEARN, Words } from './words';
import { Voice } from './voice';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

// The island is grown in a fixed order from one seed, so it comes out the same every time.
raiseLand();
const terrain = paintTerrain();
const home = findHome();
const places = makePlaces(home);
const pip = makePip(home);
const others = makeNeighbours(home);
const trail = makeTrail();
const fog = new Fog();
const sky = new Sky(W, H);
const glow = makeGlow();
const words = new Words();
// The town in the north has its own seed, so growing it never changes the island.
const town = new Town(northShore());
addLand((x, y) => town.isLand(x, y));
// Wait for the handwriting font, so the shop signs are painted in it.
document.fonts.load('700 14px Caveat').finally(() => town.paint(terrain.getContext('2d')!));

/** Anything the journal can link to: island places, town venues, and the causeway. */
const placeById = (id: string): Spot => (id === 'home' ? home : id === 'causeway' ? town.causewaySpot : places.find((p) => p.id === id) ?? town.venues.find((v) => v.id === id)!);

const canvas = $<HTMLCanvasElement>('map');
const g = canvas.getContext('2d')!;
let vw = 800, vh = 600, dpr = 1;

/**
 * The camera follows your dot unless you drag it away. `zoom` multiplies the
 * "cover" scale, where the island just fills the view.
 */
// It starts in close on your dot, so you meet the dots before the map.
const cam: { x: number; y: number; zoom: number; free: boolean; focus: { x: number; y: number; t: number } | null } = { x: home.x, y: home.y, zoom: window.matchMedia('(max-width: 760px)').matches ? 1.25 : 1.8, free: false, focus: null };
let cover = 1, fit = 1;
const MAX_ZOOM = 3;
const scale = () => cover * cam.zoom;

function focusPlace(p: Spot): void {
  cam.focus = { x: p.x, y: p.y, t: 4.5 };
  cam.free = false;
  p.pulse = 1;
}

const journal: Journal = new Journal($('entries'), $<HTMLButtonElement>('chip'), {
  placeName: (id) => placeById(id).name,
  showPlace: (id) => { drawer(false); focusPlace(placeById(id)); },
  dotName: (id): string => callName(story.dotById(id)!),
});
const voice = new Voice();
const story: Story = new Story(home, places, pip, others, journal, words, fog, trail, town, {
  change: updateHud,
  words: renderWords,
  said: (d, text) => voice.say(text, d, loudness(d)),
  sound: (d) => voice.whistle(d, loudness(d)),
  diary: (d) => { if (viewing === d) renderDiary(); },
  causeway: () => { town.paintCauseway(terrain.getContext('2d')!); focusPlace(town.causewaySpot); },
});

function updateHud(): void {
  $('hudName').textContent = pip.name;
  if (!viewing) $('jTitle').textContent = pip.name + "'s journal";
  $('hudWhen').textContent = 'Day ' + story.day + ', ' + partOfDay(story.tod);
  const n = story.keepsakes.length;
  $('hudFound').textContent = places.filter((p) => p.found).length + ' of ' + places.length + ' places found' + (n ? ', ' + n + (n === 1 ? ' keepsake' : ' keepsakes') : '');
  $('hudTown').hidden = !town.open;
  if (town.open) $('hudTown').textContent = (story.townVisited ? 'Town ' + Math.round(town.explored(fog) * 100) + '% explored, ' : 'A causeway to the north, ') + pip.coins + ' coins';
  const dreamLabel = 'Watch ' + (pip.named ? 'Pip' : 'it') + ' dream';
  if ($('btnDream').title !== dreamLabel) setIcon($('btnDream'), 'moon', dreamLabel, dreamLabel);
  $('btnDream').hidden = !story.canDream;
  $('btnBounce').hidden = !story.tower || pip.asleep;
  $('btnFind').hidden = !cam.free;
  $<HTMLButtonElement>('btnRain').disabled = story.rain > 0;
  $<HTMLButtonElement>('btnWind').disabled = story.wind > 0;
}

// ---------- The journal's tabs, and other dots' journals ----------
let tab: 'journal' | 'words' = 'journal';
/** A townsfolk journal being read instead of Pip's. */
let viewing: Dot | null = null;
function setTab(t: typeof tab): void {
  tab = t;
  closeDiary();
  $('tabJ').setAttribute('aria-selected', String(t === 'journal'));
  $('tabW').setAttribute('aria-selected', String(t === 'words'));
  $('entries').hidden = t !== 'journal';
  $('words').hidden = t !== 'words';
  renderWords();
}
$('tabJ').addEventListener('click', () => setTab('journal'));
$('tabW').addEventListener('click', () => setTab('words'));

/** Opens a townsfolk's own journal in the notebook. */
function openDiary(d: Dot): void {
  viewing = d;
  drawer(true);
  $('entries').hidden = true;
  $('words').hidden = true;
  $('diary').hidden = false;
  $('back').hidden = false;
  renderDiary();
}

function closeDiary(): void {
  if (!viewing) return;
  viewing = null;
  $('diary').hidden = true;
  $('back').hidden = true;
  $('jSub').textContent = 'It writes this by itself. Tap an underlined name to find it.';
  $('entries').hidden = tab !== 'journal';
  $('words').hidden = tab !== 'words';
  updateHud();
}
$('back').addEventListener('click', closeDiary);

/** On phones the journal is a drawer: just its newest line until you pull it up. */
function drawer(open: boolean): void {
  $('journal').classList.toggle('open', open);
  $('handle').setAttribute('aria-expanded', String(open));
  $('handle').setAttribute('aria-label', open ? 'Close the journal' : 'Open the journal');
}
$('handle').addEventListener('click', () => drawer(!$('journal').classList.contains('open')));
$('jTitle').addEventListener('click', () => drawer(!$('journal').classList.contains('open')));

function renderDiary(): void {
  const d = viewing!, list = $('diary'), wealth = d.coins! < 20 ? 'broke' : d.coins! < 80 ? 'getting by' : d.coins! < 200 ? 'rich' : 'very, very rich';
  $('jTitle').textContent = d.name + "'s journal";
  $('jSub').textContent = 'The ' + CAST[d.character!].title.replace(/^the /, '') + '. ' + d.coins + ' coins, ' + wealth + '.';
  list.textContent = '';
  let lastDay: number | null = null;
  for (const e of d.diary!.slice().reverse()) {
    if (e.day !== lastDay) { const h = document.createElement('li'); h.className = 'day'; h.textContent = 'Day ' + e.day; list.appendChild(h); lastDay = e.day; }
    const li = document.createElement('li'), p = document.createElement('p');
    p.className = 'entry';
    p.textContent = e.text;
    li.appendChild(p);
    list.appendChild(li);
  }
  if (!d.diary!.length) { const li = document.createElement('li'); li.className = 'day'; li.textContent = 'Nothing written yet'; list.appendChild(li); }
}

function renderWords(): void {
  if (tab !== 'words') return;
  const list = $('words');
  list.textContent = '';
  const note = (text: string) => { const li = document.createElement('li'); li.className = 'note'; li.textContent = text; list.appendChild(li); };
  note('The dots have their own words. Pip works out what one means by hearing it ' + TO_LEARN + ' times.');
  const all = words.list();
  if (!all.length) note('No words yet. Watch for speech bubbles when the neighbours are near.');
  for (const w of all) {
    const li = document.createElement('li'), s = document.createElement('strong'), m = document.createElement('span');
    li.className = 'word';
    s.textContent = w.word;
    m.textContent = w.heard >= TO_LEARN ? 'means ' + words.meaning(w.concept) : 'not sure yet (heard ' + w.heard + ' of ' + TO_LEARN + ' times)';
    li.append(s, m);
    list.appendChild(li);
  }
}

// ---------- Camera ----------
function resize(): void {
  const r = canvas.getBoundingClientRect();
  dpr = Math.min(2, window.devicePixelRatio || 1);
  vw = Math.max(50, r.width);
  vh = Math.max(50, r.height);
  canvas.width = Math.round(vw * dpr);
  canvas.height = Math.round(vh * dpr);
  cover = Math.max(vw / W, vh / H, 0.85);
  fit = Math.min(vw / W, vh / H, cover) * 0.95;
  cam.zoom = Math.max(fit / cover, cam.zoom);
}
new ResizeObserver(resize).observe(canvas);

/** The camera's centre, kept in so the view doesn't show past the island's edge unless the whole island fits. */
function view(): { cx: number; cy: number } {
  const s = scale(), hw = vw / s / 2, hh = vh / s / 2;
  const clamp = (v: number, half: number, size: number) => (half * 2 >= size ? size / 2 : Math.min(Math.max(v, half), size - half));
  return { cx: clamp(cam.x, hw, W), cy: clamp(cam.y, hh, H) };
}

function toWorld(sx: number, sy: number): { x: number; y: number } {
  const { cx, cy } = view(), s = scale();
  return { x: cx + (sx - vw / 2) / s, y: cy + (sy - vh / 2) / s };
}

/** Zooms about a point on screen when you are looking around, or about your dot when following it. */
function zoomBy(factor: number, sx = vw / 2, sy = vh / 2): void {
  const before = toWorld(sx, sy);
  cam.zoom = Math.max(fit / cover, Math.min(MAX_ZOOM, cam.zoom * factor));
  if (!cam.free) return;
  const s = scale();
  cam.x = before.x - (sx - vw / 2) / s;
  cam.y = before.y - (sy - vh / 2) / s;
}

/** Where a dot is on screen. */
function onScreen(d: Dot): { x: number; y: number } {
  const { cx, cy } = view(), s = scale();
  return { x: (d.x - cx) * s + vw / 2, y: (d.y - cy) * s + vh / 2 };
}

/** Voices are clear anywhere on screen, loudest in the middle, and fade out just past the edges. */
function loudness(d: Dot): number {
  const p = onScreen(d), off = Math.hypot((p.x - vw / 2) / (vw / 2), (p.y - vh / 2) / (vh / 2));
  return Math.max(0, Math.min(1, 1.6 - off * 0.7)) * Math.min(1, 0.75 + cam.zoom * 0.25);
}

/** Your mouse, resting over the map: dots near it feel watched, and their eyes follow it. */
let hover: { x: number; y: number } | null = null;

/**
 * How closely you are watching a dot, from 0 to 1: zoomed in on it near the
 * middle of the view, or with the mouse resting on it.
 */
function attention(d: Dot): number {
  if (!fog.isSeen(d.x, d.y) || dream.open || bounce.open) return 0;
  const p = onScreen(d), r = 12 * scale();
  if (p.x < 0 || p.y < 0 || p.x > vw || p.y > vh) return 0;
  const close = Math.max(0, Math.min(1, (r - 9) / 13));
  const middle = Math.max(0, 1 - Math.hypot(p.x - vw / 2, p.y - vh / 2) / (Math.min(vw, vh) * 0.45));
  const mouse = hover ? Math.max(0, 1 - Math.hypot(hover.x - p.x, hover.y - p.y) / (r + 45)) : 0;
  return Math.max(close * middle, mouse);
}

function lookAround(): void {
  const { cx, cy } = view();
  cam.x = cx;
  cam.y = cy;
  cam.free = true;
  cam.focus = null;
  updateHud();
}

// One finger or the mouse drags. Two fingers pinch. A tap leaves a gift; a double-tap zooms in.
const pointers = new Map<number, { x: number; y: number }>();
let pressStart: { x: number; y: number } | null = null, dragged = false, lastTap = 0;
const local = (e: MouseEvent) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
canvas.addEventListener('pointerdown', (e) => {
  try { canvas.setPointerCapture(e.pointerId); } catch { /* dragging still works without capture */ }
  pointers.set(e.pointerId, local(e));
  if (pointers.size === 1) { pressStart = local(e); dragged = false; }
  else dragged = true;
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'mouse' && !pointers.size) hover = local(e);
  const before = pointers.get(e.pointerId);
  if (!before) return;
  const after = local(e), s = scale();
  if (pointers.size === 1) {
    if (!dragged && pressStart && Math.hypot(after.x - pressStart.x, after.y - pressStart.y) > 6) { dragged = true; lookAround(); }
    if (dragged) { cam.x -= (after.x - before.x) / s; cam.y -= (after.y - before.y) / s; }
  } else if (pointers.size === 2) {
    if (!cam.free) lookAround();
    const other = [...pointers.entries()].find(([id]) => id !== e.pointerId)![1];
    const spreadBefore = Math.hypot(before.x - other.x, before.y - other.y), spreadAfter = Math.hypot(after.x - other.x, after.y - other.y);
    cam.x -= (after.x - before.x) / 2 / s;
    cam.y -= (after.y - before.y) / 2 / s;
    if (spreadBefore > 10) zoomBy(spreadAfter / spreadBefore, (after.x + other.x) / 2, (after.y + other.y) / 2);
  }
  cam.x = Math.max(0, Math.min(W, cam.x));
  cam.y = Math.max(0, Math.min(H, cam.y));
  pointers.set(e.pointerId, after);
});
const release = (e: PointerEvent) => {
  const wasTap = pointers.size === 1 && !dragged && pressStart;
  pointers.delete(e.pointerId);
  if (!wasTap) return;
  // Tapping the map tucks the journal away and puts the tip away for good.
  hideTip();
  drawer(false);
  const p = local(e), now = performance.now();
  if (now - lastTap < 300) { zoomBy(1.6, p.x, p.y); lastTap = 0; }
  else {
    // Tapping a dot pokes it; tapping its "Play?" bubble starts a game; tapping the tower goes inside; tapping anywhere else leaves the chosen toy.
    const w = toWorld(p.x, p.y);
    const inviting = story.dots.find((d) => { if (!d.invite) return false; const b = inviteBox(d); return w.x > b.x - 6 && w.x < b.x + b.w + 6 && w.y > b.y - 6 && w.y < b.y + b.h + 6; });
    if (inviting) { playWith(inviting); lastTap = now; return; }
    if (story.tower && !pip.asleep && Math.hypot(w.x - story.tower.x, w.y - story.tower.y + 15) < 30) { enterTower(); lastTap = now; return; }
    // Poking a townsfolk opens their journal too.
    const d = story.poke(w.x, w.y);
    if (!d) story.leaveToy(chosen, w.x, w.y);
    else if (d.diary) openDiary(d);
    else if (d.isPip) closeDiary();
    lastTap = now;
  }
};
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointerleave', () => { hover = null; });
canvas.addEventListener('pointercancel', (e) => pointers.delete(e.pointerId));
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const p = local(e);
  zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15, p.x, p.y);
}, { passive: false });
window.addEventListener('keydown', (e) => {
  if (dream.open || bounce.open) return;
  if (e.key === '+' || e.key === '=') zoomBy(1.4);
  if (e.key === '-' || e.key === '_') zoomBy(1 / 1.4);
});
setIcon($('zoomIn'), 'plus', 'Zoom in (+)');
setIcon($('zoomOut'), 'minus', 'Zoom out (−)');
setIcon($('btnFind'), 'find', 'Find Pip');
$('zoomIn').addEventListener('click', () => zoomBy(1.4));
$('zoomOut').addEventListener('click', () => zoomBy(1 / 1.4));
$('btnFind').addEventListener('click', () => { cam.free = false; cam.focus = null; updateHud(); });

// ---------- Drawing ----------
function draw(time: number, dt: number): void {
  if (!cam.free) {
    const tgt = cam.focus || pip;
    if (cam.focus) { cam.focus.t -= dt; if (cam.focus.t <= 0) cam.focus = null; }
    const k = 1 - Math.pow(0.02, dt);
    cam.x += (tgt.x - cam.x) * k;
    cam.y += (tgt.y - cam.y) * k;
  }
  const { cx, cy } = view(), s = scale();
  const world = () => g.setTransform(dpr * s, 0, 0, dpr * s, (vw / 2 - cx * s) * dpr, (vh / 2 - cy * s) * dpr);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#E4ECEC';
  g.fillRect(0, 0, canvas.width, canvas.height);
  world();
  g.drawImage(terrain, 0, 0);
  g.drawImage(trail.canvas, 0, 0);
  const tod = story.tod, dark = darkness(tod), gold = goldenness(tod);
  sky.drawShadows(g, dark);
  // Back to front, so things lower on the map overlap the ones behind them.
  const lit = tod >= 0.72;
  const lying = story.toys.filter((t) => !t.holder);
  const things: (Place | Toy | Dot)[] = [home, ...places.filter((p) => p.found), ...lying, pip, ...others, ...story.life.folk];
  things.sort((a, b) => a.y - b.y);
  for (const t of things) {
    if ('type' in t) drawPlace(g, t, lit);
    else if ('kind' in t) drawToy(g, t, time);
    else drawDot(g, t, time);
  }
  for (const t of story.toys) if (t.holder) drawHeld(g, t, story.dotById(t.holder)!, time, story.gust);
  for (const r of story.ripples) {
    g.strokeStyle = `rgba(242,169,59,${1 - r.t / 1.2})`; g.lineWidth = 3;
    g.beginPath(); g.arc(r.x, r.y - 4, 10 + r.t * 40, 0, 7); g.stroke();
  }
  g.drawImage(fog.canvas, 0, 0, W, H);

  // Golden at dawn and dusk, soft blue at night. Multiplying keeps the colours rich.
  const tint = sky.tint(dark, gold);
  if (tint) {
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = tint;
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.restore();
  }
  town.drawLights(g, glow, dark, tod >= 0.93 || tod < 0.03, fog);
  if (lit && home.level) {
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = Math.min(1, dark * 1.2);
    g.drawImage(glow, home.x - 30, home.y - 26, 60, 60);
    g.restore();
  }
  for (const d of story.dots) if (fog.isSeen(d.x, d.y)) drawSpeech(g, d);
  for (const d of story.dots) if (fog.isSeen(d.x, d.y)) drawInvite(g, d, time);
  if (story.rain > 0) drawRain(time, Math.min(1, story.rain / 2, (RAIN_TIME - story.rain) / 1.5));
  if (story.wind > 0) drawWind(time, story.gust);

  // Clouds thicken as you zoom out above them.
  const span = Math.log(cover / fit);
  const altitude = span > 0.01 ? Math.max(0, Math.min(1, Math.log(cover / s) / span)) : 0;
  sky.draw(g, altitude, dark);
}

/** Slanting streaks of rain over the whole view, fading in and out. */
function drawRain(time: number, amount: number): void {
  g.save();
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = `rgba(60,80,110,${0.12 * amount})`;
  g.fillRect(0, 0, vw, vh);
  g.strokeStyle = `rgba(230,240,250,${0.55 * amount})`;
  g.lineWidth = 1.2;
  g.beginPath();
  for (let i = 0; i < 140; i++) {
    const x = ((i * 97.3 + time * 90) % (vw + 60)) - 30, y = ((i * 53.7 + time * 620) % (vh + 40)) - 20;
    g.moveTo(x, y);
    g.lineTo(x - 4, y + 13);
  }
  g.stroke();
  g.restore();
}

/** A few curls of wind racing across. */
function drawWind(time: number, amount: number): void {
  g.save();
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.strokeStyle = `rgba(251,251,246,${0.7 * amount})`;
  g.lineWidth = 2;
  g.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const x = ((i * 211 + time * 700) % (vw + 300)) - 150, y = (i * 137) % vh + Math.sin(time * 3 + i) * 10;
    g.beginPath();
    g.moveTo(x - 70, y);
    g.quadraticCurveTo(x - 30, y - 8, x, y);
    g.arc(x, y - 7, 7, Math.PI / 2, -Math.PI, true);
    g.stroke();
  }
  g.restore();
}

// ---------- Toybox and weather ----------
let chosen: ToyKind = 'berry';
const toybox = $('toybox');
for (const kind of TOY_KINDS) {
  const b = document.createElement('button');
  b.type = 'button';
  b.setAttribute('role', 'radio');
  const name = TOY_LABELS[kind].toLowerCase();
  setIcon(b, kind, (/^[aeiou]/.test(name) ? 'Leave an ' : 'Leave a ') + name);
  b.setAttribute('aria-checked', String(kind === chosen));
  b.addEventListener('click', () => {
    chosen = kind;
    toybox.querySelectorAll('button').forEach((o) => o.setAttribute('aria-checked', String(o === b)));
  });
  toybox.appendChild(b);
}
setIcon($('btnRain'), 'rain', 'Make it rain');
setIcon($('btnWind'), 'wind', 'Make it windy');
$('btnRain').addEventListener('click', () => { story.makeRain(); updateHud(); });
$('btnWind').addEventListener('click', () => { story.makeWind(); updateHud(); });

// ---------- Controls ----------
const soundLabel = () => setIcon($('btnSound'), voice.on ? 'soundOn' : 'soundOff', voice.on ? 'Sound on (tap to turn off)' : 'Sound off (tap to turn on)');
soundLabel();
$('btnSound').addEventListener('click', () => { voice.toggle(); soundLabel(); });
let playing = true, speed = 1;
const playLabel = () => setIcon($('btnPlay'), playing ? 'pause' : 'play', playing ? 'Pause' : 'Play');
playLabel();
$('btnPlay').addEventListener('click', () => { playing = !playing; playLabel(); });
$('btnSpeed').title = 'Speed up';
$('btnSpeed').setAttribute('aria-label', 'Speed: 1×');
$('btnSpeed').addEventListener('click', () => { speed = speed === 1 ? 4 : 1; $('btnSpeed').textContent = speed + '×'; $('btnSpeed').setAttribute('aria-label', 'Speed: ' + speed + '×'); });
setIcon($('btnSkip'), 'tomorrow', 'Come back tomorrow', 'Tomorrow');

// On phones the time controls sit in the corner, so the tray fits on one line.
const narrow = window.matchMedia('(max-width: 760px)');
const placeTime = () => (narrow.matches ? document.querySelector('.corner')! : document.querySelector('.bar')!).appendChild($('timeGroup'));
placeTime();
narrow.addEventListener('change', placeTime);
setIcon($('btnBounce'), 'tower', 'Bounce up the tower', 'Bounce up the tower');

// A friendly tip on the first visit, until you tap the map or say "got it".
let tipShown = false;
try { tipShown = localStorage.getItem('pip-tip') === 'seen'; } catch { /* show it */ }
function hideTip(): void {
  if ($('tip').hidden || $('tip').classList.contains('fade')) return;
  $('tip').classList.add('fade');
  setTimeout(() => { $('tip').hidden = true; }, 400);
  try { localStorage.setItem('pip-tip', 'seen'); } catch { /* fine */ }
}
if (!tipShown) { $('tip').hidden = false; setTimeout(hideTip, 15000); }
$('tipClose').addEventListener('click', hideTip);
$('btnSkip').addEventListener('click', () => { story.skipToTomorrow(); cam.x = pip.x; cam.y = pip.y; cam.free = false; updateHud(); });

const dream = new Dream($('dreamWrap'), $<HTMLCanvasElement>('dream'), {
  title: $('dTitle'), text: $('dText'), msg: $('dmsg'),
  go: $<HTMLButtonElement>('dGo'), wake: $<HTMLButtonElement>('dWake'), close: $<HTMLButtonElement>('dClose'),
});
$('btnDream').addEventListener('click', () => {
  if (!story.canDream) return;
  dream.start(pip.named ? 'Pip' : 'The little one', (result) => { story.dreamt(result); updateHud(); });
});

const bounce = new Bounce($('bounceWrap'), $<HTMLCanvasElement>('bounce'), {
  title: $('bTitle'), text: $('bText'), msg: $('bmsg'), go: $<HTMLButtonElement>('bGo'), close: $<HTMLButtonElement>('bClose'),
  quit: $<HTMLButtonElement>('bQuit'), pads: $('bPads'),
}, (syl) => voice.say(syl, pip, 0.9));
function enterTower(): void {
  if (!story.tower || bounce.open) return;
  bounce.start('tower', { name: pip.named ? 'Pip' : 'the little one', colour: pip.colour, isPip: true }, SYLLABLES, 0, '', (result) => { story.climbed(result); updateHud(); });
}

/** A game of bounce, as the dot you tapped, on its very own course. */
function playWith(d: Dot): void {
  if (bounce.open) return;
  d.invite = 0;
  const name = d.isPip ? (pip.named ? 'Pip' : 'The little one') : callName(d).replace(/^the /, 'The ');
  const intro = COURSE_INTRO[d.isPip ? 'pip' : d.character ?? 'foodie'].replaceAll('{N}', name);
  const seed = [...d.id].reduce((h, c) => h * 31 + c.charCodeAt(0), 11) >>> 0;
  bounce.start('run', { name, colour: d.colour, character: d.character, isPip: d.isPip }, SYLLABLES, seed, intro, (result) => { story.played(d, result); updateHud(); });
}
$('btnBounce').addEventListener('click', enterTower);

// ---------- Start ----------
resize();
updateHud();
let last = performance.now(), hudT = 0;
function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  // The island holds still while Pip dreams.
  if (dream.open) dream.frame(dt, now / 1000);
  else if (bounce.open) bounce.frame(dt);
  else if (playing) {
    for (let i = 0; i < speed; i++) story.update(dt);
    story.watching.update(dt * speed, attention);
    // Eyes near the mouse follow it.
    const at = hover && toWorld(hover.x, hover.y);
    for (const d of story.dots) d.peek = at && Math.hypot(onScreen(d).x - hover!.x, onScreen(d).y - hover!.y) < 160 ? at : undefined;
    sky.step(dt * speed, 9 + story.gust * 70);
  }
  sky.cloudiness = cloudinessFor(story.day, story.tod);
  draw(now / 1000, dt);
  hudT += dt;
  if (hudT > 0.5) { hudT = 0; updateHud(); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// A handle for poking at the game from the browser console while developing.
if (import.meta.env.DEV) Object.assign(window, { story, town, cam, bounce, playWith, onScreen });
