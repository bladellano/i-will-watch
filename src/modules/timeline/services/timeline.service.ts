import { requestError } from '@/services/network'
import { supabase } from '@/services/supabase/client'
import type { TimelineEvent, TimelineFilter } from '../types'

export const TIMELINE_PAGE_SIZE = 20

/** Uma página da timeline, do mais recente para o mais antigo. O cursor é o último item da página anterior. */
export async function fetchTimeline(
  filter: TimelineFilter,
  cursor: Pick<TimelineEvent, 'occurred_at' | 'event_id'> | null,
  limit = TIMELINE_PAGE_SIZE,
): Promise<TimelineEvent[]> {
  const { data, error } = await supabase.rpc('community_timeline', {
    p_type: filter,
    p_before: cursor?.occurred_at ?? null,
    p_before_id: cursor?.event_id ?? null,
    p_limit: limit,
  })
  if (error) throw requestError('Não foi possível carregar a timeline da comunidade.')
  return (data ?? []) as TimelineEvent[]
}
