// Cliente da Watchmode. Usa a secret WATCHMODE_API_KEY (nunca exposta ao navegador).
// Cada chamada consome créditos do plano; a Edge Function só chama quando o cache expirou.

const WATCHMODE_BASE_URL = 'https://api.watchmode.com/v1'

/** Países consultados. Plano gratuito permite até 3. Pode ser sobrescrito pela secret WATCHMODE_REGIONS. */
const DEFAULT_REGIONS = 'PT,BR,ES'

export type WatchMediaType = 'movie' | 'tv'

export class WatchmodeError extends Error {
  constructor(public readonly status: number) {
    super(`Watchmode respondeu ${status}`)
  }
}

export interface WatchSource {
  region: string
  source_id: number
  access_type: string
  provider_name: string
  web_url: string | null
  ios_url: string | null
  android_url: string | null
}

export function configuredRegions(): string[] {
  const raw = Deno.env.get('WATCHMODE_REGIONS') ?? DEFAULT_REGIONS
  return raw
    .split(',')
    .map((code) => code.trim().toUpperCase())
    .filter((code) => /^[A-Z]{2}$/.test(code))
    .slice(0, 3)
}

async function watchmodeGet(path: string, params: Record<string, string>): Promise<unknown> {
  const apiKey = Deno.env.get('WATCHMODE_API_KEY')
  if (!apiKey) throw new Error('WATCHMODE_API_KEY não configurado.')

  const url = new URL(`${WATCHMODE_BASE_URL}${path}`)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)

  const response = await fetch(url, {
    headers: { 'X-API-Key': apiKey, Accept: 'application/json' },
  })
  if (!response.ok) throw new WatchmodeError(response.status)
  return await response.json()
}

/** Converte um TMDB ID no ID interno da Watchmode. Devolve null se o título não existir lá. */
export async function findWatchmodeId(mediaType: WatchMediaType, tmdbId: number): Promise<number | null> {
  const data = (await watchmodeGet('/search/', {
    search_field: mediaType === 'movie' ? 'tmdb_movie_id' : 'tmdb_tv_id',
    search_value: String(tmdbId),
  })) as { title_results?: { id?: unknown }[] }

  const first = Array.isArray(data?.title_results) ? data.title_results[0] : undefined
  return typeof first?.id === 'number' ? first.id : null
}

/** Fontes de streaming do título nos países configurados, sem duplicatas de serviço + tipo de acesso. */
export async function fetchWatchSources(watchmodeId: number, regions: string[]): Promise<WatchSource[]> {
  const data = await watchmodeGet(`/title/${watchmodeId}/sources/`, { regions: regions.join(',') })
  const items = Array.isArray(data) ? (data as Record<string, unknown>[]) : []

  const seen = new Set<string>()
  const sources: WatchSource[] = []
  for (const item of items) {
    const region = typeof item.region === 'string' ? item.region.toUpperCase() : ''
    const sourceId = item.source_id
    if (!regions.includes(region) || typeof sourceId !== 'number') continue

    const accessType = typeof item.type === 'string' && item.type !== '' ? item.type : 'unknown'
    const key = `${region}|${sourceId}|${accessType}`
    if (seen.has(key)) continue
    seen.add(key)

    sources.push({
      region,
      source_id: sourceId,
      access_type: accessType,
      provider_name: typeof item.name === 'string' && item.name !== '' ? item.name : 'Serviço desconhecido',
      web_url: typeof item.web_url === 'string' ? item.web_url : null,
      ios_url: typeof item.ios_url === 'string' ? item.ios_url : null,
      android_url: typeof item.android_url === 'string' ? item.android_url : null,
    })
  }
  return sources
}
