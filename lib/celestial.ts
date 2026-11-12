import { moonInfo } from './astro';
import { IST_OFFSET_MS } from './config';
import type { CelestialEvent } from './types';

interface MeteorShower {
  key: string;
  name: string;
  month: number;
  day: number;
  zhr: number;
  radiant: string;
  tip: string;
}

/** Peak dates are typical; actual peaks vary by about a day year to year. */
const METEOR_SHOWERS: MeteorShower[] = [
  {
    key: 'quadrantids',
    name: 'Quadrantids',
    month: 1,
    day: 3,
    zhr: 110,
    radiant: 'Boötes',
    tip: 'The radiant sits low in the north-east before dawn from Kerala, so you will see far fewer than the peak rate.',
  },
  {
    key: 'lyrids',
    name: 'Lyrids',
    month: 4,
    day: 22,
    zhr: 18,
    radiant: 'Lyra',
    tip: 'Best after midnight, once Vega has climbed in the north-east.',
  },
  {
    key: 'eta-aquariids',
    name: 'Eta Aquariids',
    month: 5,
    day: 6,
    zhr: 50,
    radiant: 'Aquarius',
    tip: 'One of the better showers for tropical observers. Face east in the hour before dawn.',
  },
  {
    key: 'perseids',
    name: 'Perseids',
    month: 8,
    day: 12,
    zhr: 100,
    radiant: 'Perseus',
    tip: 'The radiant rises late in the north-east. Monsoon cloud is the main obstacle in Kerala.',
  },
  {
    key: 'orionids',
    name: 'Orionids',
    month: 10,
    day: 21,
    zhr: 20,
    radiant: 'Orion',
    tip: "Debris from Halley's Comet. Best from about 2 a.m., with Orion high in the east.",
  },
  {
    key: 'leonids',
    name: 'Leonids',
    month: 11,
    day: 17,
    zhr: 15,
    radiant: 'Leo',
    tip: 'Fast, bright meteors after Leo rises around 1 a.m.',
  },
  {
    key: 'geminids',
    name: 'Geminids',
    month: 12,
    day: 14,
    zhr: 150,
    radiant: 'Gemini',
    tip: "The year's richest shower and well placed from Kerala. Meteors start from late evening.",
  },
  {
    key: 'ursids',
    name: 'Ursids',
    month: 12,
    day: 22,
    zhr: 10,
    radiant: 'Ursa Minor',
    tip: 'The radiant is near Polaris, under 10° high from Kerala, so expect only a few.',
  },
];

const SEASONS = [
  {
    key: 'march-equinox',
    month: 3,
    day: 20,
    title: 'March equinox',
    description: 'Day and night are nearly equal everywhere on Earth, and the Sun rises due east.',
    tip: 'Note where the Sun rises on your horizon; it will drift north over the coming months.',
  },
  {
    key: 'june-solstice',
    month: 6,
    day: 21,
    title: 'June solstice',
    description: "The Sun reaches its northernmost point. From Kerala, at noon it passes about 14° north of overhead.",
    tip: 'Monsoon skies rarely cooperate, but the longest day of the year is still worth marking.',
  },
  {
    key: 'september-equinox',
    month: 9,
    day: 22,
    title: 'September equinox',
    description: 'The Sun crosses the celestial equator heading south. Day and night are nearly equal.',
    tip: 'Sunsets due west make a good reference for aligning a telescope mount.',
  },
  {
    key: 'december-solstice',
    month: 12,
    day: 21,
    title: 'December solstice',
    description: 'The Sun reaches its southernmost point, giving Kerala its longest nights of the year.',
    tip: 'Long, dry December nights are among the best of the year for stargazing in Kerala.',
  },
];

/** Epoch ms for a wall-clock time in IST */
function istTime(year: number, month: number, day: number, hour: number, minute = 0): number {
  return Date.UTC(year, month - 1, day, hour, minute) - IST_OFFSET_MS;
}

function istDateKey(ms: number): string {
  return new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 10);
}

export function upcomingCelestialEvents(now: Date, horizonDays = 60): CelestialEvent[] {
  const nowMs = now.getTime();
  const horizon = nowMs + horizonDays * 86_400_000;
  const year = new Date(nowMs + IST_OFFSET_MS).getUTCFullYear();
  const events = new Map<string, CelestialEvent>();
  const inRange = (t: number) => t >= nowMs - 86_400_000 && t <= horizon;

  for (const y of [year, year + 1]) {
    for (const s of METEOR_SHOWERS) {
      const t = istTime(y, s.month, s.day, 22);
      if (!inRange(t)) continue;
      const id = `meteor-${s.key}-${y}`;
      events.set(id, {
        id,
        title: `${s.name} meteor shower peak`,
        type: 'meteor-shower',
        date: new Date(t).toISOString(),
        description: `Up to about ${s.zhr} meteors an hour under ideal dark skies, radiating from ${s.radiant}.`,
        viewingTip: s.tip,
      });
    }
    for (const s of SEASONS) {
      const t = istTime(y, s.month, s.day, 12);
      if (!inRange(t)) continue;
      const id = `${s.key}-${y}`;
      events.set(id, { id, title: s.title, type: 'season', date: new Date(t).toISOString(), description: s.description, viewingTip: s.tip });
    }
  }

  let cursor = now;
  for (let i = 0; i < 6; i++) {
    const m = moonInfo(cursor);
    const full = Date.parse(m.nextFull);
    const fresh = Date.parse(m.nextNew);
    if (full <= horizon) {
      const id = `moon-full-${istDateKey(full)}`;
      events.set(id, {
        id,
        title: 'Full Moon',
        type: 'moon',
        date: new Date(full).toISOString(),
        description: 'The Moon is fully lit and rises around sunset. Lovely to look at, but it washes out faint stars and meteors.',
        viewingTip: 'Try binoculars along the terminator a few days before or after full, when craters cast long shadows.',
      });
    }
    if (fresh <= horizon) {
      const id = `moon-new-${istDateKey(fresh)}`;
      events.set(id, {
        id,
        title: 'New Moon',
        type: 'moon',
        date: new Date(fresh).toISOString(),
        description: 'The darkest nights of the month and the best window for the Milky Way and faint deep-sky objects.',
        viewingTip: 'Plan a trip away from town lights for the nights around this date.',
      });
    }
    cursor = new Date(Math.min(full, fresh) + 86_400_000);
  }

  return [...events.values()].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}
