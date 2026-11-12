import { NextResponse } from 'next/server';
import { GALLERY_QUERIES, MYSTERIES } from '@/lib/data/mysteries';
import type { DeepSpaceImage, DeepSpaceResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface NasaSearchResponse {
  collection?: {
    items?: Array<{
      data?: Array<{
        nasa_id?: string;
        title?: string;
        description?: string;
        date_created?: string;
        center?: string;
        photographer?: string;
        secondary_creator?: string;
      }>;
      links?: Array<{ href?: string; rel?: string; render?: string }>;
    }>;
  };
}

interface ApodResponse {
  title?: string;
  explanation?: string;
  url?: string;
  hdurl?: string;
  media_type?: string;
  thumbnail_url?: string;
  date?: string;
  copyright?: string;
}

const DAY = 86_400;

function cleanText(text: string | undefined, max = 280): string {
  if (!text) return '';
  const plain = text
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > max ? `${plain.slice(0, max - 1).trimEnd()}…` : plain;
}

async function fetchWithTimeout(url: string, revalidate: number): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const res = await fetch(url, { signal: controller.signal, next: { revalidate } });
    return res.ok ? res : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function searchNasaImages(query: string): Promise<DeepSpaceImage | null> {
  const params = new URLSearchParams({ q: query, media_type: 'image', page_size: '8' });
  const res = await fetchWithTimeout(`https://images-api.nasa.gov/search?${params.toString()}`, DAY);
  if (!res) return null;
  const json = (await res.json().catch(() => null)) as NasaSearchResponse | null;
  for (const item of json?.collection?.items ?? []) {
    const meta = item.data?.[0];
    const preview = item.links?.find((l) => l.render === 'image' || l.rel === 'preview')?.href;
    if (!meta?.nasa_id || !preview) continue;
    return {
      id: meta.nasa_id,
      title: meta.title ?? query,
      description: cleanText(meta.description),
      // NASA serves several renditions; "~medium" exists for most assets, "~thumb" for all.
      imageUrl: preview.replace('~thumb', '~medium'),
      thumbUrl: preview,
      credit: meta.photographer ?? meta.secondary_creator ?? meta.center ?? 'NASA',
      date: meta.date_created ?? null,
      link: `https://images.nasa.gov/details/${encodeURIComponent(meta.nasa_id)}`,
      source: 'nasa-images',
    };
  }
  return null;
}

async function fetchApod(): Promise<DeepSpaceImage | null> {
  const key = process.env.NASA_API_KEY || 'DEMO_KEY';
  const res = await fetchWithTimeout(
    `https://api.nasa.gov/planetary/apod?${new URLSearchParams({ api_key: key, thumbs: 'true' }).toString()}`,
    6 * 3_600,
  );
  if (!res) return null;
  const apod = (await res.json().catch(() => null)) as ApodResponse | null;
  if (!apod) return null;
  const image = apod.media_type === 'image' ? apod.url : apod.thumbnail_url;
  if (!image) return null;
  return {
    id: `apod-${apod.date ?? 'today'}`,
    title: apod.title ?? 'Astronomy Picture of the Day',
    description: cleanText(apod.explanation, 520),
    imageUrl: apod.media_type === 'image' ? (apod.hdurl ?? image) : image,
    thumbUrl: image,
    credit: apod.copyright?.replace(/\s+/g, ' ').trim() || 'NASA APOD',
    date: apod.date ?? null,
    link: apod.date ? `https://apod.nasa.gov/apod/ap${apod.date.slice(2).replace(/-/g, '')}.html` : 'https://apod.nasa.gov/apod/',
    source: 'apod',
  };
}

/** GET /api/deep-space — imagery for the "Unexplained" section, cached for a day */
export async function GET() {
  const [apod, gallery, mysteryImages] = await Promise.all([
    fetchApod(),
    Promise.all(GALLERY_QUERIES.map(searchNasaImages)),
    Promise.all(MYSTERIES.map(async (m) => [m.id, await searchNasaImages(m.imageQuery)] as const)),
  ]);

  const body: DeepSpaceResponse = {
    apod,
    gallery: gallery.filter((g): g is DeepSpaceImage => g !== null),
    mysteryImages: Object.fromEntries(mysteryImages),
    fetchedAt: new Date().toISOString(),
  };

  return NextResponse.json(body, { headers: { 'Cache-Control': 'public, max-age=900, stale-while-revalidate=3600' } });
}
