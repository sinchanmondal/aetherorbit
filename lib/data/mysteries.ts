export type MysteryStatus = 'Unexplained' | 'Debated' | 'Largely explained';

export interface Mystery {
  id: string;
  title: string;
  status: MysteryStatus;
  hook: string;
  observed: string;
  ideas: string[];
  /** Search phrase for an illustrative image in the NASA Image and Video Library */
  imageQuery: string;
}

export const MYSTERIES: Mystery[] = [
  {
    id: 'wow-signal',
    title: 'The Wow! signal',
    status: 'Unexplained',
    hook: 'A 72-second burst of radio noise from Sagittarius in 1977 that never came back.',
    observed:
      "On 15 August 1977 Ohio State's Big Ear telescope recorded a strong, narrowband signal close to the hydrogen line at 1420 MHz. Astronomer Jerry Ehman circled it on the printout and wrote 'Wow!'. Repeated searches of the same patch of sky have never found it again.",
    ideas: [
      'A brief natural flare: a 2024 analysis proposed a cold hydrogen cloud suddenly brightened, for example by a magnetar burst',
      'Terrestrial or satellite interference, though the protected frequency makes this unlikely',
      'An artificial transmission, which cannot be tested without a repeat',
    ],
    imageQuery: 'radio telescope night',
  },
  {
    id: 'fast-radio-bursts',
    title: 'Fast radio bursts',
    status: 'Debated',
    hook: 'Millisecond flashes of radio energy from distant galaxies, arriving from all over the sky every day.',
    observed:
      'First spotted in 2007 in archived data, a single burst can release as much energy in a millisecond as the Sun does in days. Some sources repeat; most have been seen only once. In 2020 a burst was traced to a magnetar inside our own galaxy.',
    ideas: [
      'Magnetars, highly magnetised neutron stars, for at least some bursts',
      'Merging or collapsing neutron stars for the one-off events',
      'More than one population with different origins',
    ],
    imageQuery: 'magnetar',
  },
  {
    id: 'oumuamua',
    title: 'ʻOumuamua',
    status: 'Debated',
    hook: 'The first known interstellar visitor sped up as it left the Solar System, with no visible tail.',
    observed:
      'Discovered in October 2017, it was strongly elongated or flattened, tumbling, and showed a small non-gravitational push as it receded from the Sun, yet no dust or gas was detected.',
    ideas: [
      'Hydrogen escaping from water ice, which telescopes could not see',
      'A shard of nitrogen ice chipped from a Pluto-like world',
      'An artificial light sail, a fringe idea most astronomers reject',
    ],
    imageQuery: 'Oumuamua',
  },
  {
    id: 'dark-matter',
    title: 'Dark matter',
    status: 'Unexplained',
    hook: 'Galaxies spin too fast for the matter we can see. Something unseen holds them together.',
    observed:
      'Star speeds in the outskirts of galaxies, gravitational lensing by clusters, and the pattern of the cosmic microwave background all imply about five times more matter than we can detect directly.',
    ideas: [
      'Undiscovered particles such as WIMPs or axions',
      'Primordial black holes formed in the early universe',
      'Modified gravity (MOND) instead of extra matter',
    ],
    imageQuery: 'Bullet Cluster dark matter',
  },
  {
    id: 'dark-energy',
    title: 'Dark energy',
    status: 'Unexplained',
    hook: "The universe's expansion is speeding up, and no one knows what is pushing.",
    observed:
      'In 1998 two supernova surveys found the expansion is accelerating. Dark energy appears to make up roughly 70% of the universe’s energy budget. Recent DESI results hint that it may be weakening over time.',
    ideas: [
      'A cosmological constant: the energy of empty space itself',
      "A slowly changing field, often called 'quintessence'",
      'A sign that general relativity needs revising on cosmic scales',
    ],
    imageQuery: 'Hubble ultra deep field',
  },
  {
    id: 'hubble-tension',
    title: 'The Hubble tension',
    status: 'Debated',
    hook: "Two precise ways of measuring the universe's expansion rate disagree.",
    observed:
      'Distances from nearby Cepheid stars and supernovae give about 73 km/s per megaparsec, while the early universe seen in the cosmic microwave background predicts about 67. JWST has sharpened the local measurements, but teams still disagree on the final value.',
    ideas: [
      'An unrecognised systematic error in one method',
      'Early dark energy acting before the cosmic microwave background formed',
      'New physics, such as additional neutrino species',
    ],
    imageQuery: 'Cepheid variable star',
  },
  {
    id: 'odd-radio-circles',
    title: 'Odd radio circles',
    status: 'Unexplained',
    hook: 'Giant rings visible only to radio telescopes, surrounding distant galaxies.',
    observed:
      "First reported in 2019 from Australia's ASKAP telescope, these rings span roughly a million light-years and show up at no other wavelength.",
    ideas: [
      'Shock waves from merging supermassive black holes',
      'Outflowing winds from bursts of star formation',
      'Shells left by powerful jets switching off',
    ],
    imageQuery: 'radio galaxy',
  },
  {
    id: 'great-attractor',
    title: 'The Great Attractor',
    status: 'Largely explained',
    hook: 'Our galaxy and thousands of others are drifting toward a point hidden behind the Milky Way.',
    observed:
      "Galaxy motions reveal a gravitational focus about 150–250 million light-years away, inside the 'Zone of Avoidance' where our own galaxy's dust blocks the view.",
    ideas: [
      'The Norma Cluster and the surrounding Laniakea supercluster supply much of the pull',
      'The more distant Shapley Supercluster contributes significantly',
    ],
    imageQuery: 'galaxy cluster Hubble',
  },
  {
    id: 'tabbys-star',
    title: "Tabby's Star",
    status: 'Largely explained',
    hook: 'A star that dimmed by up to 22% at irregular intervals.',
    observed:
      'KIC 8462852, watched by the Kepler space telescope, showed deep, irregular dips in brightness and a slow long-term fade.',
    ideas: [
      'Uneven clouds of fine dust, supported by dimming that depends on colour',
      'Debris from broken-up comets or a destroyed moon',
      'Alien megastructures, effectively ruled out by the dust evidence',
    ],
    imageQuery: 'Kepler space telescope',
  },
  {
    id: 'betelgeuse-dimming',
    title: 'The Great Dimming of Betelgeuse',
    status: 'Largely explained',
    hook: 'In 2019–20 the red supergiant faded to about a third of its usual brightness.',
    observed:
      'Images showed the southern part of the star darkening. Hubble spectra revealed a burst of hot gas that cooled into a dust cloud between the star and Earth.',
    ideas: [
      'Dust condensing from ejected material blocked starlight (leading explanation)',
      'A cooler patch on the surface contributed',
      'Not a sign that a supernova is imminent',
    ],
    imageQuery: 'Betelgeuse',
  },
];

export const STATUS_DESCRIPTIONS: Record<MysteryStatus, string> = {
  Unexplained: 'No accepted explanation yet',
  Debated: 'Several competing explanations',
  'Largely explained': 'Mainstream explanation with good evidence',
};

/** Searches for the deep-space imagery strip */
export const GALLERY_QUERIES = [
  'Pillars of Creation',
  'Carina Nebula Webb',
  'Crab Nebula',
  'Andromeda galaxy',
  'Orion Nebula',
  'Southern Ring Nebula',
];
