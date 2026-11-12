# AetherOrbit

Live space intelligence for the sky over Vallichira, Kerala: satellites overhead right now, a nightly stargazing score, launches from NASA, ISRO, SpaceX and ESA with live YouTube coverage, a star atlas, open mysteries of astronomy, AI explanations of anything you click, and daily email reminders.

Built with Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Framer Motion, Zustand, Supabase and the OpenAI API.

## Quick start

```bash
npm install
cp .env.local.example .env.local   # then fill in keys (all optional to start)
npm run dev                        # http://localhost:3000
```

The app runs with **no keys at all**. Every external feed falls back to clearly labelled simulated data, and the interface tells you which key to add. Add keys one at a time as you go.

## API keys

| Variable | Where to get it | What it unlocks |
| --- | --- | --- |
| `N2YO_API_KEY` | Register at n2yo.com, then Profile → API key | Real satellites overhead and ISS pass predictions |
| `OPENAI_API_KEY` | platform.openai.com → API keys | AI explanations (model set by `OPENAI_MODEL`, default `gpt-4o-mini`) |
| `YOUTUBE_API_KEY` | Google Cloud Console → enable YouTube Data API v3 → Credentials | Automatic detection of live space streams |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API | Sign-up, sign-in and reminders |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page (keep secret) | The daily digest cron job |
| `RESEND_API_KEY`, `REMINDER_FROM_EMAIL` | resend.com (verify a sending domain) | Sending the daily digest email |
| `CRON_SECRET` | `openssl rand -hex 32` | Protects the cron endpoint |
| `NASA_API_KEY` | api.nasa.gov (optional; `DEMO_KEY` works) | Astronomy Picture of the Day |

Open-Meteo, NOAA space weather, the NASA image library and Launch Library 2 need no keys.

## Supabase setup

1. Create a project at supabase.com.
2. Open **SQL Editor**, paste `supabase/schema.sql` and run it. It is safe to re-run.
3. Under **Authentication → URL Configuration**, set the Site URL to your deployment and add `http://localhost:3000/auth/callback` (and your production `/auth/callback`) to the redirect URLs.
4. Email/password and magic-link sign-in work out of the box. If you keep "Confirm email" on, new users confirm through the link before signing in.

## Daily reminders

Users can set reminders on launches, sky events, satellites (every visible pass) or a single ISS pass, and choose digest categories in the Reminders drawer.

`/api/cron/daily-digest` builds one email per user and sends it through Resend. On Vercel, `vercel.json` schedules it for 00:30 UTC (06:00 IST), and Vercel sends the `CRON_SECRET` automatically. To test locally without sending email:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/daily-digest?dryRun=1"
```

Without `RESEND_API_KEY` the job always runs as a dry run and returns the digests it would have sent. Each user gets at most one digest per day.

## Project structure

```
app/
  page.tsx                    Dashboard (hero + all sections)
  layout.tsx                  Fonts, metadata
  globals.css                 Glass surfaces, nebula backdrop, focus and reduced-motion rules
  api/space-data/route.ts     Merges N2YO, NOAA SWPC, Open-Meteo, YouTube, Launch Library 2
  api/ai-explain/route.ts     Streams OpenAI explanations (validated, rate-limited)
  api/reminders/route.ts      Reminder + preference CRUD (Supabase, RLS)
  api/deep-space/route.ts     NASA images + APOD
  api/cron/daily-digest/      Daily email digest
  auth/callback/route.ts      Email confirmation / magic-link landing
components/                   SatelliteTracker, StargazingPlanner, AgencyFeed,
                              ConstellationGallery, MysteryData, AIExplainPanel,
                              AuthModal, ReminderCenter, Navbar, Starfield, Toaster, ui
lib/
  astro.ts                    Look angles, sun position, Earth shadow, Moon phase, orbits
  satellites.ts               Satellite catalogue, enrichment, simulated sky
  stargazing.ts               Viability score from Open-Meteo data
  celestial.ts                Meteor showers, Moon phases, equinoxes and solstices
  server/sources.ts           Upstream fetchers with caching, timeouts and fallbacks
  store.ts                    Zustand app state (auth, reminders, AI panel, toasts)
  data/                       Constellations, mysteries, curated missions
supabase/schema.sql           Tables, RLS policies, sign-up trigger
middleware.ts                 Refreshes the Supabase session cookie
```

## How the numbers are made

- **Satellite positions** come from N2YO. Look angles (direction, height, distance) are computed locally on a spherical Earth.
- **Speed and orbital period** assume a circular orbit at the reported altitude, which is accurate to within a few percent for most satellites.
- **Sunlit or in shadow** uses a cylindrical Earth-shadow model with a low-precision solar position (about 0.1° accuracy).
- **Thermosphere temperature** is an estimate from a simplified Jacchia model using live F10.7 solar flux and the Kp index from NOAA. Surface temperatures are typical ranges for sunlit or shaded spacecraft, not telemetry.
- **Stargazing score:** cloud cover gates the score, so an overcast sky always scores 0. Humidity, visibility, rain chance and moonlight then scale what remains. The overall figure blends the night's average with its best two-hour window.
- **Moon phase** uses mean lunation, accurate to about half a day.

## Rate limits and caching

Responses from upstream APIs are cached in Next.js' data cache to stay within free tiers:

| Source | Cached for | Provider limit |
| --- | --- | --- |
| N2YO satellites above | 60 s | 100 requests/hour |
| N2YO visible passes | 1 h | 100 requests/hour |
| NOAA space weather | 5 min | — |
| Open-Meteo | 15 min | 10,000 requests/day (non-commercial) |
| YouTube live search | 15 min | 10,000 quota units/day (search costs 100) |
| Launch Library 2 | 30 min | 15 requests/hour unauthenticated |
| NASA images | 1 day | — |

The AI route allows 20 explanations per IP every 10 minutes per server instance. For multi-instance production, move this to a shared store such as Upstash Redis.

## Deploying to Vercel

1. Push to GitHub and import the repo in Vercel.
2. Add the environment variables from `.env.local.example`.
3. Set `NEXT_PUBLIC_SITE_URL` to your production URL and add `<url>/auth/callback` to Supabase's redirect URLs.
4. Deploy. The cron in `vercel.json` registers automatically.

## Changing the location

Set `NEXT_PUBLIC_OBSERVER_NAME`, `NEXT_PUBLIC_OBSERVER_LAT`, `NEXT_PUBLIC_OBSERVER_LNG` and `NEXT_PUBLIC_OBSERVER_ALT_M`, then rebuild. These are inlined at build time.

## Data credits

Satellite data: N2YO. Space weather: NOAA Space Weather Prediction Center. Weather: Open-Meteo (CC BY 4.0). Launches: The Space Devs Launch Library 2. Video: YouTube. Imagery: NASA Image and Video Library and Astronomy Picture of the Day.
