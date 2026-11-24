import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { COMMUNITY_ITEMS_LIMIT, type RecentItem } from './email-templates.ts'

/** Quantas adições recentes (de membros que compartilham) são lidas antes de montar as listas. */
const SCAN_LIMIT = 1000

interface SharedAddition {
  ownerId: string
  mediaId: string
  item: RecentItem
}

interface SharedRow {
  media_id: string
  added_at: string
  lists: { user_id: string } | null
  media: { title: string; media_type: string } | null
}

const firstName = (name: string | null | undefined) => (name ?? '').trim().split(' ')[0] || null

/**
 * Adições mais recentes de todos os membros que compartilham as listas (profiles.share_lists = true),
 * do mais recente ao mais antigo. Usa service role: só chamado pela função de envio do administrador.
 */
export async function fetchSharedAdditions(admin: SupabaseClient): Promise<SharedAddition[]> {
  const { data: sharers, error: sharersError } = await admin.from('profiles').select('id, name').eq('share_lists', true)
  if (sharersError) throw sharersError
  const sharerIds = (sharers ?? []).map((p) => p.id as string)
  if (sharerIds.length === 0) return []
  const names = new Map((sharers ?? []).map((p) => [p.id as string, firstName(p.name as string | null)]))

  const { data, error } = await admin
    .from('list_media')
    .select('media_id, added_at, media:media!inner(title, media_type), lists!inner(user_id)')
    .in('lists.user_id', sharerIds)
    .order('added_at', { ascending: false })
    .limit(SCAN_LIMIT)
  if (error) throw error

  return ((data ?? []) as unknown as SharedRow[])
    .filter((row) => row.media && row.lists)
    .map((row) => ({
      ownerId: row.lists!.user_id,
      mediaId: row.media_id,
      item: {
        title: row.media!.title,
        mediaType: row.media!.media_type,
        memberName: names.get(row.lists!.user_id) ?? 'Um membro',
      },
    }))
}

/**
 * Escolhe até `limit` obras para um destinatário: ignora as adições dele mesmo e não repete a mesma obra.
 * Recebe a lista já ordenada (mais recente primeiro).
 */
export function pickSharedItemsFor(
  additions: SharedAddition[],
  recipientId: string,
  limit: number = COMMUNITY_ITEMS_LIMIT,
): RecentItem[] {
  const seen = new Set<string>()
  const items: RecentItem[] = []
  for (const addition of additions) {
    if (addition.ownerId === recipientId || seen.has(addition.mediaId)) continue
    seen.add(addition.mediaId)
    items.push(addition.item)
    if (items.length === limit) break
  }
  return items
}
