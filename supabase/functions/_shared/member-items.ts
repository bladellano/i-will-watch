import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { RECENT_ITEMS_EMAIL_LIMIT, type RecentItem } from './email-templates.ts'

interface ListMediaRow {
  media_id: string
  media: { title: string; media_type: string } | null
}

/**
 * Últimos títulos adicionados por um membro (qualquer lista dele), do mais recente ao mais antigo.
 * A mesma obra aparece uma única vez, mesmo que esteja em mais de uma lista.
 * Usa o cliente com service role; só deve ser chamado pela função de envio do administrador.
 */
export async function fetchRecentItems(admin: SupabaseClient, userId: string): Promise<RecentItem[]> {
  const { data, error } = await admin
    .from('list_media')
    .select('media_id, added_at, media:media!inner(title, media_type), lists!inner(user_id)')
    .eq('lists.user_id', userId)
    .order('added_at', { ascending: false })
    .limit(50)
  if (error) throw error

  const seen = new Set<string>()
  const items: RecentItem[] = []
  for (const row of (data ?? []) as unknown as ListMediaRow[]) {
    if (!row.media || seen.has(row.media_id)) continue
    seen.add(row.media_id)
    items.push({ title: row.media.title, mediaType: row.media.media_type })
    if (items.length === RECENT_ITEMS_EMAIL_LIMIT) break
  }
  return items
}
