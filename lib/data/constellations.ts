export interface ConstellationStar {
  id: string;
  /** Shown on the large chart when present */
  name?: string;
  /** Chart coordinates in a 0–100 box (not to astrometric scale) */
  x: number;
  y: number;
  /** Apparent magnitude; lower is brighter */
  mag: number;
}

export type Season = 'jan-mar' | 'apr-jun' | 'jul-sep' | 'oct-dec';

export interface Constellation {
  id: string;
  name: string;
  meaning: string;
  abbreviation: string;
  indianName?: string;
  brightestStar: string;
  bestMonths: string;
  season: Season;
  fromKerala: string;
  mythology: string;
  astronomy: string;
  deepSky: string[];
  stars: ConstellationStar[];
  lines: Array<[string, string]>;
}

export const SEASONS: Array<{ id: Season | 'all'; label: string }> = [
  { id: 'all', label: 'All year' },
  { id: 'jan-mar', label: 'Jan–Mar' },
  { id: 'apr-jun', label: 'Apr–Jun' },
  { id: 'jul-sep', label: 'Jul–Sep' },
  { id: 'oct-dec', label: 'Oct–Dec' },
];

export function seasonForMonth(monthIndex: number): Season {
  if (monthIndex <= 2) return 'jan-mar';
  if (monthIndex <= 5) return 'apr-jun';
  if (monthIndex <= 8) return 'jul-sep';
  return 'oct-dec';
}

export const CONSTELLATIONS: Constellation[] = [
  {
    id: 'orion',
    name: 'Orion',
    meaning: 'The Hunter',
    abbreviation: 'Ori',
    indianName: 'Mriga',
    brightestStar: 'Rigel',
    bestMonths: 'December – March',
    season: 'jan-mar',
    fromKerala:
      'Rises in the east around 8 p.m. in mid-December. By February it stands high in the south after dusk, and the three belt stars are unmistakable.',
    mythology:
      'In Greek myth Orion was a giant hunter killed by a scorpion, which is why Orion and Scorpius never share the sky. In Indian tradition this region is Mriga, the deer; the nakshatra Mrigashira marks its head, and the belt is often read as the arrow that struck it.',
    astronomy:
      "Betelgeuse is a red supergiant near the end of its life that will one day explode as a supernova; its 2019–20 'Great Dimming' was traced largely to dust it ejected. Below the belt hangs the Orion Nebula (M42), the nearest large star-forming region, about 1,350 light-years away.",
    deepSky: ['M42 Orion Nebula', 'M43', 'Horsehead Nebula', "Barnard's Loop"],
    stars: [
      { id: 'meissa', name: 'Meissa', x: 50, y: 10, mag: 3.4 },
      { id: 'betelgeuse', name: 'Betelgeuse', x: 27, y: 27, mag: 0.5 },
      { id: 'bellatrix', name: 'Bellatrix', x: 71, y: 29, mag: 1.6 },
      { id: 'alnitak', name: 'Alnitak', x: 41, y: 55, mag: 1.8 },
      { id: 'alnilam', name: 'Alnilam', x: 50, y: 52, mag: 1.7 },
      { id: 'mintaka', name: 'Mintaka', x: 59, y: 49, mag: 2.2 },
      { id: 'sword', x: 52, y: 67, mag: 4 },
      { id: 'saiph', name: 'Saiph', x: 34, y: 87, mag: 2.1 },
      { id: 'rigel', name: 'Rigel', x: 73, y: 83, mag: 0.1 },
    ],
    lines: [
      ['meissa', 'betelgeuse'],
      ['meissa', 'bellatrix'],
      ['betelgeuse', 'alnitak'],
      ['bellatrix', 'mintaka'],
      ['alnitak', 'alnilam'],
      ['alnilam', 'mintaka'],
      ['alnilam', 'sword'],
      ['alnitak', 'saiph'],
      ['mintaka', 'rigel'],
    ],
  },
  {
    id: 'ursa-major',
    name: 'Ursa Major',
    meaning: 'The Great Bear',
    abbreviation: 'UMa',
    indianName: 'Saptarishi',
    brightestStar: 'Alioth',
    bestMonths: 'March – May',
    season: 'apr-jun',
    fromKerala:
      'From Kerala the Big Dipper swings low across the northern horizon. Look north after 9 p.m. in April, when it rides highest.',
    mythology:
      'Greek myth tells of Callisto, turned into a bear and set among the stars by Zeus. In India the seven bright stars are the Saptarishi, the seven sages. The faint star beside Mizar (Vasishtha) is Arundhati, his wife, traditionally pointed out to newly married couples.',
    astronomy:
      "Five of the Dipper's seven stars travel together through space as the Ursa Major Moving Group, about 80 light-years away. The pointer stars Merak and Dubhe lead the eye to Polaris.",
    deepSky: ["M81 Bode's Galaxy", 'M82 Cigar Galaxy', 'M101 Pinwheel Galaxy', 'Mizar and Alcor'],
    stars: [
      { id: 'dubhe', name: 'Dubhe', x: 82, y: 28, mag: 1.8 },
      { id: 'merak', name: 'Merak', x: 84, y: 52, mag: 2.35 },
      { id: 'phecda', name: 'Phecda', x: 62, y: 60, mag: 2.4 },
      { id: 'megrez', name: 'Megrez', x: 58, y: 38, mag: 3.3 },
      { id: 'alioth', name: 'Alioth', x: 42, y: 34, mag: 1.77 },
      { id: 'mizar', name: 'Mizar', x: 26, y: 31, mag: 2.2 },
      { id: 'alcor', x: 27, y: 25, mag: 4 },
      { id: 'alkaid', name: 'Alkaid', x: 9, y: 42, mag: 1.85 },
    ],
    lines: [
      ['dubhe', 'merak'],
      ['merak', 'phecda'],
      ['phecda', 'megrez'],
      ['megrez', 'dubhe'],
      ['megrez', 'alioth'],
      ['alioth', 'mizar'],
      ['mizar', 'alkaid'],
    ],
  },
  {
    id: 'cassiopeia',
    name: 'Cassiopeia',
    meaning: 'The Queen',
    abbreviation: 'Cas',
    brightestStar: 'Schedar',
    bestMonths: 'October – December',
    season: 'oct-dec',
    fromKerala:
      "Sits low in the north from Kerala. Find the 'W' just above the northern horizon on November evenings, ideally from a spot with an open view north.",
    mythology:
      'Queen Cassiopeia boasted that she was more beautiful than the sea nymphs. As punishment she circles the celestial pole, spending half of every night upside down.',
    astronomy:
      'Cassiopeia lies along the Milky Way and hosts Cassiopeia A, the remnant of a supernova whose light reached Earth around 1680. It is one of the brightest radio sources in the sky.',
    deepSky: ['Cassiopeia A', 'M52', 'M103', 'Pacman Nebula (NGC 281)'],
    stars: [
      { id: 'segin', name: 'Segin', x: 8, y: 36, mag: 3.4 },
      { id: 'ruchbah', name: 'Ruchbah', x: 29, y: 62, mag: 2.7 },
      { id: 'navi', name: 'Navi', x: 50, y: 44, mag: 2.2 },
      { id: 'schedar', name: 'Schedar', x: 70, y: 66, mag: 2.2 },
      { id: 'caph', name: 'Caph', x: 91, y: 40, mag: 2.3 },
    ],
    lines: [
      ['segin', 'ruchbah'],
      ['ruchbah', 'navi'],
      ['navi', 'schedar'],
      ['schedar', 'caph'],
    ],
  },
  {
    id: 'andromeda',
    name: 'Andromeda',
    meaning: 'The Chained Princess',
    abbreviation: 'And',
    brightestStar: 'Alpheratz',
    bestMonths: 'October – December',
    season: 'oct-dec',
    fromKerala:
      'On November evenings Andromeda stretches high in the north-east from the Great Square of Pegasus. Under dark skies the Andromeda Galaxy is a faint oval smudge.',
    mythology:
      'Chained to a sea rock as an offering to the monster Cetus, Princess Andromeda was rescued by Perseus. Her parents, Cepheus and Cassiopeia, shine nearby.',
    astronomy:
      'The Andromeda Galaxy (M31), about 2.5 million light-years away, is the most distant thing most people can see without a telescope. It is approaching the Milky Way at roughly 110 km/s.',
    deepSky: ['M31 Andromeda Galaxy', 'M32', 'M110', 'NGC 752'],
    stars: [
      { id: 'alpheratz', name: 'Alpheratz', x: 8, y: 66, mag: 2.06 },
      { id: 'delta', x: 28, y: 58, mag: 3.3 },
      { id: 'mirach', name: 'Mirach', x: 50, y: 50, mag: 2.05 },
      { id: 'mu', x: 52, y: 34, mag: 3.9 },
      { id: 'm31', name: 'M31', x: 56, y: 20, mag: 4.4 },
      { id: 'almach', name: 'Almach', x: 86, y: 32, mag: 2.1 },
    ],
    lines: [
      ['alpheratz', 'delta'],
      ['delta', 'mirach'],
      ['mirach', 'almach'],
      ['mirach', 'mu'],
    ],
  },
  {
    id: 'taurus',
    name: 'Taurus',
    meaning: 'The Bull',
    abbreviation: 'Tau',
    indianName: 'Vrishabha',
    brightestStar: 'Aldebaran',
    bestMonths: 'November – February',
    season: 'oct-dec',
    fromKerala:
      'Rises in the east by 8 p.m. in late November. Look for the orange eye, Aldebaran, with the tight Pleiades cluster above and to its right.',
    mythology:
      'Zeus, disguised as a white bull, carried Europa across the sea. In India the Pleiades are the Krittika, the six mothers who nursed Kartikeya, and Aldebaran is Rohini, favourite wife of the Moon.',
    astronomy:
      "The V-shaped Hyades is the nearest open cluster to Earth, about 150 light-years away; Aldebaran sits in front of it but isn't a member. The Crab Nebula (M1) is the wreck of a supernova seen by Chinese astronomers in 1054.",
    deepSky: ['Pleiades (M45)', 'Hyades', 'Crab Nebula (M1)'],
    stars: [
      { id: 'elnath', name: 'Elnath', x: 10, y: 14, mag: 1.65 },
      { id: 'ain', name: 'Ain', x: 42, y: 40, mag: 3.5 },
      { id: 'delta', x: 49, y: 46, mag: 3.8 },
      { id: 'gamma', x: 56, y: 54, mag: 3.65 },
      { id: 'aldebaran', name: 'Aldebaran', x: 42, y: 57, mag: 0.85 },
      { id: 'lambda', x: 70, y: 68, mag: 3.4 },
      { id: 'zeta', x: 14, y: 80, mag: 3.0 },
      { id: 'pleiades', name: 'Pleiades', x: 86, y: 26, mag: 2.9 },
    ],
    lines: [
      ['elnath', 'ain'],
      ['ain', 'delta'],
      ['delta', 'gamma'],
      ['gamma', 'aldebaran'],
      ['aldebaran', 'zeta'],
      ['gamma', 'lambda'],
    ],
  },
  {
    id: 'gemini',
    name: 'Gemini',
    meaning: 'The Twins',
    abbreviation: 'Gem',
    indianName: 'Mithuna',
    brightestStar: 'Pollux',
    bestMonths: 'January – March',
    season: 'jan-mar',
    fromKerala:
      'Castor and Pollux climb high in the north-east on February evenings, to the left of Orion as you face east.',
    mythology:
      'The twins Castor and Pollux, one mortal and one divine, chose to share immortality rather than be parted. In Indian astronomy the pair marks the nakshatra Punarvasu.',
    astronomy:
      'Castor is a six-star system made of three pairs bound together. Gemini is the radiant of December’s Geminids, which come from the rocky asteroid 3200 Phaethon rather than a comet.',
    deepSky: ['M35', 'Eskimo Nebula (NGC 2392)', 'Castor multiple system'],
    stars: [
      { id: 'castor', name: 'Castor', x: 30, y: 10, mag: 1.6 },
      { id: 'pollux', name: 'Pollux', x: 58, y: 13, mag: 1.15 },
      { id: 'mebsuta', name: 'Mebsuta', x: 30, y: 46, mag: 3.0 },
      { id: 'wasat', name: 'Wasat', x: 58, y: 50, mag: 3.5 },
      { id: 'tejat', name: 'Tejat', x: 24, y: 80, mag: 2.9 },
      { id: 'alhena', name: 'Alhena', x: 62, y: 86, mag: 1.9 },
    ],
    lines: [
      ['castor', 'pollux'],
      ['castor', 'mebsuta'],
      ['mebsuta', 'tejat'],
      ['pollux', 'wasat'],
      ['wasat', 'alhena'],
    ],
  },
  {
    id: 'canis-major',
    name: 'Canis Major',
    meaning: 'The Great Dog',
    abbreviation: 'CMa',
    indianName: 'Lubdhaka (Sirius)',
    brightestStar: 'Sirius',
    bestMonths: 'January – March',
    season: 'jan-mar',
    fromKerala:
      "Follow Orion's belt down and to the left to Sirius, the brightest star in the night sky, high in the south-east on February evenings.",
    mythology:
      "Orion's faithful hunting dog. In Indian lore Sirius is also Mrigavyadha, the deer-hunter, whose arrow (Orion's belt) chases Mriga across the sky.",
    astronomy:
      'Sirius is only 8.6 light-years away and has a white-dwarf companion, Sirius B: an Earth-sized remnant with about the mass of the Sun.',
    deepSky: ['M41', 'Sirius B', 'NGC 2362'],
    stars: [
      { id: 'muliphein', x: 46, y: 8, mag: 4.1 },
      { id: 'sirius', name: 'Sirius', x: 40, y: 22, mag: -1.46 },
      { id: 'mirzam', name: 'Mirzam', x: 14, y: 24, mag: 2.0 },
      { id: 'omicron', x: 46, y: 44, mag: 3.0 },
      { id: 'wezen', name: 'Wezen', x: 54, y: 60, mag: 1.8 },
      { id: 'adhara', name: 'Adhara', x: 58, y: 80, mag: 1.5 },
      { id: 'aludra', name: 'Aludra', x: 86, y: 72, mag: 2.45 },
      { id: 'furud', x: 32, y: 84, mag: 3.0 },
    ],
    lines: [
      ['muliphein', 'sirius'],
      ['mirzam', 'sirius'],
      ['sirius', 'omicron'],
      ['omicron', 'wezen'],
      ['wezen', 'adhara'],
      ['wezen', 'aludra'],
      ['adhara', 'furud'],
    ],
  },
  {
    id: 'leo',
    name: 'Leo',
    meaning: 'The Lion',
    abbreviation: 'Leo',
    indianName: 'Simha',
    brightestStar: 'Regulus',
    bestMonths: 'March – May',
    season: 'apr-jun',
    fromKerala:
      "The backwards question mark of Leo's Sickle rises in the east after sunset in March and rides high overhead by late April.",
    mythology:
      'The Nemean lion, whose hide no weapon could pierce, was the first of the twelve labours of Heracles. In Indian astronomy Leo is Simha, and Regulus marks the nakshatra Magha.',
    astronomy:
      'Regulus spins about once every 16 hours, so fast that it bulges into an egg shape. Leo is also the radiant of the November Leonids, debris from comet Tempel–Tuttle.',
    deepSky: ['Leo Triplet (M65, M66, NGC 3628)', 'M95', 'M96', 'Algieba double star'],
    stars: [
      { id: 'rasalas', name: 'Rasalas', x: 82, y: 14, mag: 3.9 },
      { id: 'epsilon', x: 90, y: 28, mag: 3.0 },
      { id: 'adhafera', name: 'Adhafera', x: 72, y: 24, mag: 3.4 },
      { id: 'algieba', name: 'Algieba', x: 66, y: 38, mag: 2.0 },
      { id: 'eta', x: 70, y: 54, mag: 3.5 },
      { id: 'regulus', name: 'Regulus', x: 74, y: 72, mag: 1.4 },
      { id: 'zosma', name: 'Zosma', x: 34, y: 42, mag: 2.6 },
      { id: 'chertan', name: 'Chertan', x: 36, y: 62, mag: 3.3 },
      { id: 'denebola', name: 'Denebola', x: 10, y: 56, mag: 2.1 },
    ],
    lines: [
      ['regulus', 'eta'],
      ['eta', 'algieba'],
      ['algieba', 'adhafera'],
      ['adhafera', 'rasalas'],
      ['rasalas', 'epsilon'],
      ['algieba', 'zosma'],
      ['zosma', 'denebola'],
      ['denebola', 'chertan'],
      ['chertan', 'regulus'],
    ],
  },
  {
    id: 'crux',
    name: 'Crux',
    meaning: 'The Southern Cross',
    abbreviation: 'Cru',
    indianName: 'Trishanku',
    brightestStar: 'Acrux',
    bestMonths: 'March – May',
    season: 'apr-jun',
    fromKerala:
      'From 9.7° N the Southern Cross clears the southern horizon on April and May evenings, reaching about 20° high: a sight much of the northern hemisphere never gets. Look due south around 10 p.m.',
    mythology:
      'In Indian legend, King Trishanku wished to ascend to heaven in his mortal body; the sage Vishvamitra created a separate heaven for him in the southern sky. Navigators of the southern seas have long used the cross to find south.',
    astronomy:
      'Crux is the smallest of the 88 constellations. Beside it lies the Coalsack, a dark nebula about 600 light-years away that blots out the Milky Way, and the colourful Jewel Box cluster (NGC 4755).',
    deepSky: ['Jewel Box (NGC 4755)', 'Coalsack Nebula', 'Acrux multiple star'],
    stars: [
      { id: 'gacrux', name: 'Gacrux', x: 50, y: 10, mag: 1.6 },
      { id: 'acrux', name: 'Acrux', x: 52, y: 88, mag: 0.8 },
      { id: 'mimosa', name: 'Mimosa', x: 22, y: 44, mag: 1.25 },
      { id: 'imai', name: 'Imai', x: 80, y: 50, mag: 2.8 },
      { id: 'ginan', x: 64, y: 64, mag: 3.6 },
    ],
    lines: [
      ['gacrux', 'acrux'],
      ['mimosa', 'imai'],
    ],
  },
  {
    id: 'scorpius',
    name: 'Scorpius',
    meaning: 'The Scorpion',
    abbreviation: 'Sco',
    indianName: 'Vrischika',
    brightestStar: 'Antares',
    bestMonths: 'May – August',
    season: 'jul-sep',
    fromKerala:
      "Kerala's southern latitude shows Scorpius at its best. The whole tail curls high above the southern horizon on July evenings, a view observers in Europe never get.",
    mythology:
      "Sent to kill the boastful hunter Orion, the scorpion now sits opposite him in the sky. Antares means 'rival of Ares' (Mars) for its red colour. Indian astronomy places the nakshatras Anuradha, Jyeshtha (Antares) and Mula here.",
    astronomy:
      "Antares is a red supergiant roughly 700 times wider than the Sun; placed at the Sun's position it would reach beyond the orbit of Mars. The scorpion's tail points toward the bright core of the Milky Way.",
    deepSky: ['M4 globular cluster', 'M6 Butterfly Cluster', "M7 Ptolemy's Cluster", 'M80'],
    stars: [
      { id: 'acrab', name: 'Acrab', x: 24, y: 8, mag: 2.6 },
      { id: 'dschubba', name: 'Dschubba', x: 18, y: 20, mag: 2.3 },
      { id: 'pi', x: 14, y: 33, mag: 2.9 },
      { id: 'antares', name: 'Antares', x: 36, y: 32, mag: 1.0 },
      { id: 'tau', x: 42, y: 42, mag: 2.8 },
      { id: 'epsilon', x: 48, y: 54, mag: 2.3 },
      { id: 'mu', x: 52, y: 66, mag: 3.0 },
      { id: 'zeta', x: 57, y: 78, mag: 3.6 },
      { id: 'eta', x: 68, y: 86, mag: 3.3 },
      { id: 'sargas', name: 'Sargas', x: 82, y: 82, mag: 1.85 },
      { id: 'iota', x: 90, y: 70, mag: 3.0 },
      { id: 'kappa', x: 86, y: 58, mag: 2.4 },
      { id: 'shaula', name: 'Shaula', x: 76, y: 54, mag: 1.6 },
      { id: 'lesath', x: 71, y: 58, mag: 2.7 },
    ],
    lines: [
      ['acrab', 'dschubba'],
      ['dschubba', 'pi'],
      ['dschubba', 'antares'],
      ['antares', 'tau'],
      ['tau', 'epsilon'],
      ['epsilon', 'mu'],
      ['mu', 'zeta'],
      ['zeta', 'eta'],
      ['eta', 'sargas'],
      ['sargas', 'iota'],
      ['iota', 'kappa'],
      ['kappa', 'shaula'],
      ['shaula', 'lesath'],
    ],
  },
  {
    id: 'sagittarius',
    name: 'Sagittarius',
    meaning: 'The Archer',
    abbreviation: 'Sgr',
    indianName: 'Dhanu',
    brightestStar: 'Kaus Australis',
    bestMonths: 'June – September',
    season: 'jul-sep',
    fromKerala:
      "The 'Teapot' sits high in the south on August evenings. On a dark night the Milky Way rises from its spout like steam.",
    mythology:
      'Often identified with a centaur archer, he aims at the heart of Scorpius, Antares. The Indian nakshatras Purva Ashadha and Uttara Ashadha lie in this region.',
    astronomy:
      'Looking toward Sagittarius you face the centre of the Milky Way, about 26,000 light-years away, where the black hole Sagittarius A* (4 million solar masses) was imaged by the Event Horizon Telescope in 2022.',
    deepSky: ['M8 Lagoon Nebula', 'M20 Trifid Nebula', 'M22', 'Sagittarius A*'],
    stars: [
      { id: 'alnasl', name: 'Alnasl', x: 12, y: 58, mag: 3.0 },
      { id: 'kaus-media', name: 'Kaus Media', x: 28, y: 56, mag: 2.7 },
      { id: 'kaus-australis', name: 'Kaus Australis', x: 30, y: 78, mag: 1.8 },
      { id: 'kaus-borealis', name: 'Kaus Borealis', x: 38, y: 38, mag: 2.8 },
      { id: 'phi', x: 52, y: 54, mag: 3.2 },
      { id: 'ascella', name: 'Ascella', x: 62, y: 74, mag: 2.6 },
      { id: 'nunki', name: 'Nunki', x: 68, y: 46, mag: 2.0 },
      { id: 'tau', x: 82, y: 62, mag: 3.3 },
    ],
    lines: [
      ['alnasl', 'kaus-media'],
      ['alnasl', 'kaus-australis'],
      ['kaus-media', 'kaus-australis'],
      ['kaus-media', 'kaus-borealis'],
      ['kaus-borealis', 'phi'],
      ['kaus-media', 'phi'],
      ['kaus-australis', 'ascella'],
      ['phi', 'ascella'],
      ['phi', 'nunki'],
      ['nunki', 'tau'],
      ['tau', 'ascella'],
    ],
  },
  {
    id: 'cygnus',
    name: 'Cygnus',
    meaning: 'The Swan',
    abbreviation: 'Cyg',
    brightestStar: 'Deneb',
    bestMonths: 'July – October',
    season: 'jul-sep',
    fromKerala:
      'On September evenings the Northern Cross flies high in the north along the Milky Way, sinking toward the north-west through October.',
    mythology:
      'Zeus took the form of a swan in several myths. Another story says it is Orpheus, placed beside his lyre, which is the neighbouring constellation Lyra.',
    astronomy:
      'Deneb is among the most luminous stars visible to the naked eye, shining across well over 1,500 light-years. Cygnus X-1, found in 1964, was the first strong black-hole candidate. Albireo, the swan’s beak, splits into a gold and blue pair in a small telescope.',
    deepSky: ['North America Nebula', 'Veil Nebula', 'Albireo double star', 'Cygnus X-1'],
    stars: [
      { id: 'deneb', name: 'Deneb', x: 50, y: 8, mag: 1.25 },
      { id: 'sadr', name: 'Sadr', x: 50, y: 40, mag: 2.2 },
      { id: 'gienah', name: 'Gienah', x: 16, y: 50, mag: 2.5 },
      { id: 'delta', x: 84, y: 32, mag: 2.9 },
      { id: 'eta', x: 50, y: 64, mag: 3.9 },
      { id: 'albireo', name: 'Albireo', x: 50, y: 90, mag: 3.1 },
    ],
    lines: [
      ['deneb', 'sadr'],
      ['sadr', 'eta'],
      ['eta', 'albireo'],
      ['gienah', 'sadr'],
      ['sadr', 'delta'],
    ],
  },
  {
    id: 'lyra',
    name: 'Lyra',
    meaning: 'The Lyre',
    abbreviation: 'Lyr',
    indianName: 'Abhijit (Vega)',
    brightestStar: 'Vega',
    bestMonths: 'July – September',
    season: 'jul-sep',
    fromKerala:
      'Vega is the brilliant blue-white star in the north-east on July evenings. It slides into the north-west by October.',
    mythology:
      'The lyre of Orpheus, whose music could charm stones. In East Asian lore Vega is the weaver girl, parted from the cowherd (Altair) by the Milky Way. In Indian astronomy Vega is Abhijit, an occasional 28th nakshatra.',
    astronomy:
      'Vega was the first star after the Sun to be photographed, in 1850, and long served as the zero point of the magnitude scale. Because of precession it will be the pole star in about 12,000 years.',
    deepSky: ['M57 Ring Nebula', "Epsilon Lyrae 'Double Double'", 'M56'],
    stars: [
      { id: 'vega', name: 'Vega', x: 42, y: 14, mag: 0.03 },
      { id: 'epsilon', x: 62, y: 8, mag: 4.7 },
      { id: 'zeta', x: 48, y: 36, mag: 4.3 },
      { id: 'delta', x: 70, y: 42, mag: 4.3 },
      { id: 'sheliak', name: 'Sheliak', x: 36, y: 78, mag: 3.5 },
      { id: 'sulafat', name: 'Sulafat', x: 60, y: 84, mag: 3.2 },
    ],
    lines: [
      ['vega', 'epsilon'],
      ['vega', 'zeta'],
      ['zeta', 'delta'],
      ['delta', 'sulafat'],
      ['sulafat', 'sheliak'],
      ['sheliak', 'zeta'],
    ],
  },
];
