import { kv } from '@vercel/kv'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

type VisitorPoint = {
  id: string
  lat: number
  lng: number
  ts: number
}

const VISITOR_LIST_KEY = 'visitors-globe'
const MAX_VISITORS = 200

const COUNTRY_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  US: { lat: 39.5, lng: -98.35 },
  CA: { lat: 56.1, lng: -106.3 },
  MX: { lat: 23.6, lng: -102.5 },
  BR: { lat: -14.2, lng: -51.9 },
  AR: { lat: -38.4, lng: -63.6 },
  GB: { lat: 55, lng: -3 },
  IE: { lat: 53.4, lng: -8 },
  FR: { lat: 46.2, lng: 2.2 },
  ES: { lat: 40.2, lng: -3.7 },
  DE: { lat: 51.1, lng: 10.4 },
  IT: { lat: 42.8, lng: 12.5 },
  PT: { lat: 39.4, lng: -8.2 },
  NL: { lat: 52.1, lng: 5.3 },
  BE: { lat: 50.6, lng: 4.6 },
  DK: { lat: 56.2, lng: 9.5 },
  SE: { lat: 60.1, lng: 18.6 },
  NO: { lat: 60.5, lng: 8.5 },
  FI: { lat: 64.5, lng: 26 },
  PL: { lat: 52.1, lng: 19.1 },
  GR: { lat: 39.1, lng: 22.9 },
  TR: { lat: 39, lng: 35.2 },
  RU: { lat: 61.5, lng: 105.3 },
  UA: { lat: 48.4, lng: 31.2 },
  CN: { lat: 35.9, lng: 104.2 },
  JP: { lat: 36.2, lng: 138.3 },
  KR: { lat: 35.9, lng: 127.8 },
  IN: { lat: 21, lng: 78 },
  PK: { lat: 30.4, lng: 69.3 },
  BD: { lat: 23.7, lng: 90.4 },
  LK: { lat: 7.9, lng: 80.8 },
  AU: { lat: -25.3, lng: 133.8 },
  NZ: { lat: -41.3, lng: 174.8 },
  ZA: { lat: -30.6, lng: 22.9 },
  KE: { lat: -0.02, lng: 37.9 },
  EG: { lat: 26.8, lng: 30.8 },
  NG: { lat: 9.1, lng: 8.7 },
  DZ: { lat: 28, lng: 1.7 },
  MA: { lat: 31.8, lng: -7.1 },
  TN: { lat: 34, lng: 9 },
  SA: { lat: 23.9, lng: 45.1 },
  AE: { lat: 23.4, lng: 53.8 },
  IR: { lat: 32.4, lng: 53.7 },
  IQ: { lat: 33, lng: 44.1 },
  IL: { lat: 31, lng: 35 },
  SY: { lat: 34.8, lng: 39 },
  TH: { lat: 15.8, lng: 101 },
  VN: { lat: 14.1, lng: 108.3 },
  SG: { lat: 1.35, lng: 103.8 },
  ID: { lat: -0.8, lng: 113.9 },
  PH: { lat: 12.9, lng: 121.7 },
  MY: { lat: 4.2, lng: 109.7 },
  KH: { lat: 12.6, lng: 105 },
  MM: { lat: 21.9, lng: 95.9 },
  TW: { lat: 23.7, lng: 121 },
  HK: { lat: 22.3, lng: 114.2 },
  CL: { lat: -35.7, lng: -71.5 },
  CO: { lat: 4.6, lng: -74.1 },
  PE: { lat: -9.2, lng: -74.4 },
  VE: { lat: 6.4, lng: -66.6 },
  EC: { lat: -1.8, lng: -78.2 },
  BO: { lat: -16.3, lng: -63.6 },
  PY: { lat: -23.4, lng: -58.4 },
  UY: { lat: -32.5, lng: -55.8 },
  CU: { lat: 21.5, lng: -80 },
  CR: { lat: 9.8, lng: -83.7 },
  GT: { lat: 15.8, lng: -90.3 },
  DO: { lat: 18.9, lng: -70.2 },
  JM: { lat: 18.1, lng: -77.3 },
  TZ: { lat: -6.3, lng: 34.8 },
  UG: { lat: 1.3, lng: 32.3 },
  GH: { lat: 7.9, lng: -1 },
  ET: { lat: 9.1, lng: 40.5 },
  SD: { lat: 12.9, lng: 30.2 },
  SN: { lat: 14.5, lng: -14.5 },
  CI: { lat: 7.5, lng: -5.5 },
  CM: { lat: 7.4, lng: 12.4 },
  AO: { lat: -11.2, lng: 17.9 },
  MZ: { lat: -18.7, lng: 35.5 },
  ZM: { lat: -13.1, lng: 27.8 },
  ZW: { lat: -19, lng: 29.2 },
  BW: { lat: -22.3, lng: 24.7 },
  NA: { lat: -22.6, lng: 17.5 },
  KZ: { lat: 48.2, lng: 66.9 },
  MN: { lat: 46.8, lng: 103 },
  NP: { lat: 28.4, lng: 84.1 },
  AF: { lat: 33.8, lng: 66 },
  AZ: { lat: 40.1, lng: 47.6 },
  AM: { lat: 40.3, lng: 45.1 },
  GE: { lat: 42.3, lng: 43.4 }
}

const hasRedisConfig = Boolean(
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
)

console.log('[Visitors API] Redis config check:', {
  hasConfig: hasRedisConfig,
  hasUrl: Boolean(process.env.KV_REST_API_URL),
  hasToken: Boolean(process.env.KV_REST_API_TOKEN)
})

function quantize(value: number, step = 2.5) {
  return Math.round(value / step) * step
}

function pseudoLatLng(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }
  const lat = ((hash % 18000) / 100) - 90
  const lng = (((hash / 18000) % 36000) / 100) - 180
  return { lat: quantize(lat), lng: quantize(lng) }
}

function getLatLngFromHeaders(req: NextRequest) {
  const country = (req.headers.get('x-vercel-ip-country') || 'XX').toUpperCase()
  const latHeader = req.headers.get('x-vercel-ip-latitude')
  const lngHeader = req.headers.get('x-vercel-ip-longitude')
  const lat = latHeader ? Number(latHeader) : undefined
  const lng = lngHeader ? Number(lngHeader) : undefined

  if (lat !== undefined && lng !== undefined && Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat: quantize(lat), lng: quantize(lng) }
  }

  const centroid = COUNTRY_CENTROIDS[country]
  if (centroid) {
    return { lat: quantize(centroid.lat), lng: quantize(centroid.lng) }
  }

  return pseudoLatLng(country)
}

async function fetchEntries(): Promise<VisitorPoint[]> {
  if (!hasRedisConfig) {
    console.log('[Visitors API] No Redis config, returning empty array')
    return []
  }
  try {
    console.log('[Visitors API] Fetching entries from KV...')
    const entries = await kv.lrange<VisitorPoint>(VISITOR_LIST_KEY, 0, MAX_VISITORS - 1)
    console.log('[Visitors API] Fetched entries:', entries?.length || 0)
    return entries || []
  } catch (error) {
    console.error('[Visitors API] Failed to read Redis', error)
    return []
  }
}

async function storeEntry(entry: VisitorPoint) {
  if (!hasRedisConfig) {
    console.log('[Visitors API] No Redis config, skipping store')
    return
  }
  try {
    console.log('[Visitors API] Storing entry:', entry)
    await kv.lpush(VISITOR_LIST_KEY, entry)
    await kv.ltrim(VISITOR_LIST_KEY, 0, MAX_VISITORS - 1)
    console.log('[Visitors API] Entry stored successfully')
  } catch (error) {
    console.error('[Visitors API] Failed to write Redis', error)
  }
}

export async function GET() {
  const entries = await fetchEntries()
  return NextResponse.json({ entries })
}

export async function POST(req: NextRequest) {
  const coords = getLatLngFromHeaders(req)
  console.log('[Visitors API] POST - Coords:', coords)

  const entry: VisitorPoint = {
    id: crypto.randomUUID(),
    ts: Date.now(),
    lat: coords.lat,
    lng: coords.lng,
  }
  console.log('[Visitors API] POST - Created entry:', entry)

  let entries: VisitorPoint[]
  if (hasRedisConfig) {
    console.log('[Visitors API] POST - Has Redis config, storing...')
    await storeEntry(entry)
    entries = await fetchEntries()
  } else {
    console.log('[Visitors API] POST - No Redis config, returning single entry')
    entries = [entry]
  }

  console.log('[Visitors API] POST - Returning entries count:', entries.length)
  return NextResponse.json({ entries: entries.slice(0, MAX_VISITORS) })
}
