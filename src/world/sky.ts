/**
 * The sky over Soho follows real London time. The sun's height is worked out
 * from the date and position, so no weather or time service is needed.
 */

const RAD = Math.PI / 180;
export const SOHO = { lat: 51.5133, lon: -0.1353 };

/** The sun's height above the horizon in degrees. Negative means it has set. */
export function sunElevation(date: Date, lat = SOHO.lat, lon = SOHO.lon): number {
  const n = date.getTime() / 86400000 + 2440587.5 - 2451545.0;
  const meanLongitude = (280.46 + 0.9856474 * n) % 360;
  const anomaly = ((357.528 + 0.9856003 * n) % 360) * RAD;
  const longitude = (meanLongitude + 1.915 * Math.sin(anomaly) + 0.02 * Math.sin(2 * anomaly)) * RAD;
  const tilt = (23.439 - 0.0000004 * n) * RAD;
  const rightAscension = Math.atan2(Math.cos(tilt) * Math.sin(longitude), Math.cos(longitude));
  const declination = Math.asin(Math.sin(tilt) * Math.sin(longitude));
  const siderealHours = (18.697374558 + 24.06570982441908 * n) % 24;
  const hourAngle = (siderealHours * 15 + lon) * RAD - rightAscension;
  const height = Math.asin(
    Math.sin(lat * RAD) * Math.sin(declination) + Math.cos(lat * RAD) * Math.cos(declination) * Math.cos(hourAngle),
  );
  return height / RAD;
}

const londonFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** London's local date and minutes since midnight. */
export function londonTime(date: Date): { day: string; minutes: number } {
  const parts = Object.fromEntries(londonFormat.formatToParts(date).map((p) => [p.type, p.value]));
  return { day: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

export const clockText = (minutes: number): string =>
  `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/** Sunrise and sunset in London minutes for the day containing `date`. */
export function sunTimes(date: Date): { sunrise: number; sunset: number } {
  const { minutes } = londonTime(date);
  const midnight = date.getTime() - minutes * 60000;
  let sunrise = -1;
  let sunset = -1;
  let wasUp = sunElevation(new Date(midnight)) > -0.833;
  for (let m = 1; m <= 1440; m++) {
    const up = sunElevation(new Date(midnight + m * 60000)) > -0.833;
    if (up && !wasUp && sunrise < 0) sunrise = m;
    if (!up && wasUp && sunset < 0) sunset = m;
    wasUp = up;
  }
  return { sunrise, sunset };
}

/** How dark it is, from 0 in daylight to 1 at night. */
export const darkness = (elevation: number): number => Math.max(0, Math.min(1, (5 - elevation) / 11));

/** How golden the light is around sunrise and sunset, from 0 to 1. */
export const goldenness = (elevation: number): number => Math.max(0, 1 - Math.abs(elevation - 2) / 7);

/**
 * What bubbles feel like doing.
 * - day: anything
 * - evening: it's dark, so pubs, theatres and food
 * - night: bedtime, though a few night owls stay out until 2am
 */
export type Phase = 'day' | 'evening' | 'night';

export function phaseAt(minutes: number, elevation: number): Phase {
  if (minutes >= 23 * 60 + 30 || minutes < 6 * 60 + 30) return 'night';
  if (elevation < -0.833 && minutes >= 12 * 60) return 'evening';
  return 'day';
}

/** Night owls go home at 2am. */
export const owlsOut = (minutes: number): boolean => minutes >= 23 * 60 + 30 || minutes < 2 * 60;

export function skyLabel(elevation: number, phase: Phase): string {
  if (phase === 'night') return 'Night';
  if (elevation > 6) return 'Daytime';
  if (elevation > -0.833) return 'Golden hour';
  if (elevation > -6) return 'Getting dark';
  return phase === 'evening' ? 'Evening' : 'Dark morning';
}
