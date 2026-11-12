// ---------------------------------------------------------------------------
// Data provenance
// ---------------------------------------------------------------------------
export type DataSource = 'live' | 'mock';

export interface SourceStatus {
  source: DataSource;
  ok: boolean;
  message?: string;
  fetchedAt: string;
}

export interface Observer {
  name: string;
  latitude: number;
  longitude: number;
  altitudeM: number;
  timezone: string;
}

// ---------------------------------------------------------------------------
// Satellites
// ---------------------------------------------------------------------------
export type OrbitClass = 'LEO' | 'MEO' | 'GEO' | 'HEO';

export interface SatelliteSpec {
  label: string;
  value: string;
}

export interface SatelliteProfile {
  operator: string;
  country: string;
  category: string;
  purpose: string;
  specs: SatelliteSpec[];
  featured: boolean;
}

export interface SatelliteEnvironment {
  /** Estimated neutral thermosphere temperature at the satellite (K); null above ~1,000 km */
  thermosphereK: number | null;
  /** Typical external surface temperature range for its current lighting (°C) */
  surfaceTempC: { min: number; max: number };
  radiationZone: string;
  atmosphericDrag: string;
}

export interface Satellite {
  noradId: number;
  name: string;
  intlDesignator: string;
  launchDate: string | null;
  latitude: number;
  longitude: number;
  altitudeKm: number;
  velocityKms: number;
  periodMinutes: number;
  orbitClass: OrbitClass;
  azimuth: number;
  elevation: number;
  rangeKm: number;
  compass: string;
  sunlit: boolean;
  environment: SatelliteEnvironment;
  profile: SatelliteProfile;
}

export interface VisualPass {
  noradId: number;
  satelliteName: string;
  start: string;
  peak: string;
  end: string;
  startCompass: string;
  peakCompass: string;
  endCompass: string;
  maxElevation: number;
  magnitude: number | null;
  durationSec: number;
}

// ---------------------------------------------------------------------------
// Space weather
// ---------------------------------------------------------------------------
export interface SpaceWeather {
  kp: number | null;
  kpObservedAt: string | null;
  geomagneticLevel: string;
  solarWindSpeed: number | null;
  solarWindDensity: number | null;
  solarWindTempK: number | null;
  bz: number | null;
  bt: number | null;
  f107: number | null;
}

// ---------------------------------------------------------------------------
// Weather & stargazing
// ---------------------------------------------------------------------------
export interface HourlyCondition {
  time: string;
  temperatureC: number;
  cloudCover: number;
  cloudLow: number;
  cloudMid: number;
  cloudHigh: number;
  humidity: number;
  visibilityM: number;
  precipProbability: number;
  sunElevation: number;
  moonIllumination: number;
  isDark: boolean;
  score: number;
}

export interface WeatherNow {
  time: string;
  temperatureC: number;
  humidity: number;
  cloudCover: number;
  visibilityM: number;
  windKmh: number;
  weatherCode: number;
  description: string;
  isDay: boolean;
}

export interface MoonInfo {
  /** 0 = new, 0.5 = full */
  phase: number;
  phaseName: string;
  illumination: number;
  ageDays: number;
  nextFull: string;
  nextNew: string;
}

export interface StargazingFactor {
  key: 'cloud' | 'humidity' | 'visibility' | 'rain' | 'moon';
  label: string;
  value: string;
  score: number;
}

export interface StargazingReport {
  score: number;
  rating: string;
  summary: string;
  factors: StargazingFactor[];
  bestWindow: { start: string; end: string; score: number } | null;
  hours: HourlyCondition[];
  darkStart: string | null;
  darkEnd: string | null;
  sunrise: string | null;
  sunset: string | null;
}

export interface WeatherBundle {
  now: WeatherNow;
  moon: MoonInfo;
  stargazing: StargazingReport;
}

// ---------------------------------------------------------------------------
// Launches, missions, streams, sky events
// ---------------------------------------------------------------------------
export type Agency = 'NASA' | 'ISRO' | 'SpaceX' | 'ESA' | 'Global';

export interface Launch {
  id: string;
  name: string;
  net: string;
  windowStart: string;
  status: string;
  statusAbbrev: string;
  provider: string;
  agencies: Agency[];
  rocket: string;
  missionName: string;
  missionType: string | null;
  missionDescription: string | null;
  orbit: string | null;
  pad: string | null;
  location: string | null;
  image: string | null;
  webcastLive: boolean;
}

export type MissionPhase = 'Operational' | 'Cruise' | 'Testing' | 'Development' | 'Active' | 'Completed';

export interface Mission {
  id: string;
  agency: Exclude<Agency, 'Global'>;
  name: string;
  kind: string;
  phase: MissionPhase;
  status: string;
  launched: string | null;
  destination: string;
  summary: string;
}

export interface LiveStream {
  id: string;
  videoId: string | null;
  title: string;
  channel: string;
  thumbnail: string | null;
  embedUrl: string;
  watchUrl: string;
  startedAt: string | null;
  viewers: number | null;
  kind: 'live' | 'channel-fallback';
}

export type CelestialEventType = 'meteor-shower' | 'moon' | 'season';

export interface CelestialEvent {
  id: string;
  title: string;
  type: CelestialEventType;
  date: string;
  description: string;
  viewingTip: string;
}

// ---------------------------------------------------------------------------
// /api/space-data
// ---------------------------------------------------------------------------
export type SourceKey = 'satellites' | 'passes' | 'spaceWeather' | 'weather' | 'streams' | 'launches';

export interface SpaceDataResponse {
  generatedAt: string;
  observer: Observer;
  satellites?: { items: Satellite[]; category: number; total: number };
  issPasses?: VisualPass[];
  spaceWeather?: SpaceWeather;
  weather?: WeatherBundle;
  celestialEvents?: CelestialEvent[];
  liveStreams?: LiveStream[];
  launches?: Launch[];
  missions?: Mission[];
  sources: Partial<Record<SourceKey, SourceStatus>>;
}

// ---------------------------------------------------------------------------
// AI explanations
// ---------------------------------------------------------------------------
export type AITargetType = 'satellite' | 'constellation' | 'mystery' | 'launch' | 'mission' | 'event';
export type AIContextValue = string | number | boolean | null;
export type AIDetailLevel = 'beginner' | 'enthusiast';

export interface AIExplainTarget {
  type: AITargetType;
  name: string;
  context?: Record<string, AIContextValue>;
}

// ---------------------------------------------------------------------------
// Accounts & reminders (mirror supabase/schema.sql)
// ---------------------------------------------------------------------------
export type ReminderKind = 'launch' | 'celestial_event' | 'satellite_pass';

export interface Reminder {
  id: string;
  user_id: string;
  kind: ReminderKind;
  target_ref: string;
  label: string;
  event_at: string | null;
  metadata: Record<string, unknown>;
  is_active: boolean;
  last_notified_at: string | null;
  created_at: string;
}

export interface UserPreferences {
  user_id: string;
  daily_digest: boolean;
  digest_launches: boolean;
  digest_celestial: boolean;
  digest_satellite_passes: boolean;
  favorite_satellites: number[];
  favorite_constellations: string[];
  ai_detail_level: AIDetailLevel;
}

export interface NewReminderInput {
  kind: ReminderKind;
  targetRef: string;
  label: string;
  eventAt?: string | null;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// /api/deep-space
// ---------------------------------------------------------------------------
export interface DeepSpaceImage {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  thumbUrl: string;
  credit: string;
  date: string | null;
  link: string | null;
  source: 'nasa-images' | 'apod';
}

export interface DeepSpaceResponse {
  apod: DeepSpaceImage | null;
  gallery: DeepSpaceImage[];
  mysteryImages: Record<string, DeepSpaceImage | null>;
  fetchedAt: string;
}
