import type { Mission } from '../types';

/**
 * Curated long-running missions. Statuses are written to stay accurate over
 * time (no fixed "next week" milestones); upcoming launches come live from
 * Launch Library 2 instead. Review this list when a mission changes phase.
 */
export const MISSIONS: Mission[] = [
  // NASA
  {
    id: 'nasa-jwst',
    agency: 'NASA',
    name: 'James Webb Space Telescope',
    kind: 'Observatory',
    phase: 'Operational',
    status: 'Observing from Sun–Earth L2',
    launched: '2021-12-25',
    destination: 'Sun–Earth L2',
    summary:
      'The largest space telescope ever launched, built with ESA and CSA, studying the first galaxies, star birth and exoplanet atmospheres in infrared light.',
  },
  {
    id: 'nasa-europa-clipper',
    agency: 'NASA',
    name: 'Europa Clipper',
    kind: 'Planetary probe',
    phase: 'Cruise',
    status: 'En route to Jupiter, arriving 2030',
    launched: '2024-10-14',
    destination: 'Europa, Jupiter',
    summary:
      "Will make about 49 close flybys of Jupiter's moon Europa to judge whether its hidden ocean could support life.",
  },
  {
    id: 'nasa-artemis',
    agency: 'NASA',
    name: 'Artemis programme',
    kind: 'Human exploration',
    phase: 'Active',
    status: 'Crewed lunar campaign',
    launched: '2022-11-16',
    destination: 'Moon',
    summary:
      "NASA's programme to return astronauts to the Moon with the SLS rocket and Orion spacecraft, working toward a sustained presence near the lunar south pole.",
  },
  {
    id: 'nasa-perseverance',
    agency: 'NASA',
    name: 'Perseverance rover',
    kind: 'Rover',
    phase: 'Operational',
    status: 'Exploring Jezero Crater, Mars',
    launched: '2020-07-30',
    destination: 'Mars',
    summary:
      'Collecting rock cores for possible return to Earth and searching an ancient river delta for signs of past microbial life.',
  },
  // ISRO
  {
    id: 'isro-aditya-l1',
    agency: 'ISRO',
    name: 'Aditya-L1',
    kind: 'Solar observatory',
    phase: 'Operational',
    status: 'Watching the Sun from Sun–Earth L1',
    launched: '2023-09-02',
    destination: 'Sun–Earth L1',
    summary: "India's first dedicated solar mission, studying the corona, solar flares and the solar wind with seven instruments.",
  },
  {
    id: 'isro-nisar',
    agency: 'ISRO',
    name: 'NISAR',
    kind: 'Earth observation',
    phase: 'Operational',
    status: 'Mapping Earth with dual-band radar',
    launched: '2025-07-30',
    destination: 'Sun-synchronous orbit',
    summary:
      'A joint NASA–ISRO radar satellite that tracks centimetre-scale changes in land, ice and vegetation across the globe roughly every 12 days.',
  },
  {
    id: 'isro-gaganyaan',
    agency: 'ISRO',
    name: 'Gaganyaan',
    kind: 'Human spaceflight',
    phase: 'Development',
    status: 'Human spaceflight programme',
    launched: null,
    destination: 'Low Earth orbit',
    summary:
      "India's programme to fly astronauts to a 400 km orbit aboard a human-rated LVM3, preceded by uncrewed test flights.",
  },
  {
    id: 'isro-chandrayaan-3',
    agency: 'ISRO',
    name: 'Chandrayaan-3',
    kind: 'Lunar lander',
    phase: 'Completed',
    status: 'Landed near the lunar south pole in 2023',
    launched: '2023-07-14',
    destination: 'Moon',
    summary:
      "Made India the first nation to land near the Moon's south polar region, on 23 August 2023, with the Vikram lander and Pragyan rover.",
  },
  // SpaceX
  {
    id: 'spacex-starship',
    agency: 'SpaceX',
    name: 'Starship',
    kind: 'Launch system',
    phase: 'Testing',
    status: 'Flight test campaign',
    launched: '2023-04-20',
    destination: 'Earth orbit, Moon, Mars',
    summary: "A fully reusable super heavy-lift rocket. A variant is contracted as the crew lunar lander for NASA's Artemis missions.",
  },
  {
    id: 'spacex-crew-dragon',
    agency: 'SpaceX',
    name: 'Crew Dragon',
    kind: 'Crew vehicle',
    phase: 'Operational',
    status: 'Crew rotation flights to the ISS',
    launched: '2020-05-30',
    destination: 'Low Earth orbit',
    summary: 'The first commercial spacecraft to carry astronauts to the ISS, flying NASA crew rotations and private missions.',
  },
  {
    id: 'spacex-starlink',
    agency: 'SpaceX',
    name: 'Starlink',
    kind: 'Constellation',
    phase: 'Operational',
    status: 'Expanding broadband constellation',
    launched: '2019-05-24',
    destination: 'Low Earth orbit',
    summary:
      'Thousands of satellites in low orbit providing broadband internet, and a growing concern for astronomers because of satellite trails.',
  },
  // ESA
  {
    id: 'esa-juice',
    agency: 'ESA',
    name: 'JUICE',
    kind: 'Planetary probe',
    phase: 'Cruise',
    status: 'En route to Jupiter, arriving 2031',
    launched: '2023-04-14',
    destination: 'Jupiter and Ganymede',
    summary: "Will study Jupiter's icy moons and become the first spacecraft to orbit a moon other than our own: Ganymede.",
  },
  {
    id: 'esa-euclid',
    agency: 'ESA',
    name: 'Euclid',
    kind: 'Observatory',
    phase: 'Operational',
    status: 'Mapping the dark universe from L2',
    launched: '2023-07-01',
    destination: 'Sun–Earth L2',
    summary: 'Surveying billions of galaxies across a third of the sky to map how dark matter and dark energy shaped the cosmos.',
  },
  {
    id: 'esa-hera',
    agency: 'ESA',
    name: 'Hera',
    kind: 'Planetary defence',
    phase: 'Cruise',
    status: 'Heading for asteroid pair Didymos–Dimorphos',
    launched: '2024-10-07',
    destination: 'Didymos–Dimorphos',
    summary: "Will survey the asteroid struck by NASA's DART in 2022 to measure exactly how far the impact nudged Dimorphos.",
  },
];
