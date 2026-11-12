import { requestError } from '@/services/network'
import { supabase } from '@/services/supabase/client'
import type { RecentAddition } from '../types'

export async function fetchRecentAdditions(limit = 5): Promise<RecentAddition[]> {
  const { data, error } = await supabase.rpc('recent_additions', { max_items: limit })
  if (error) throw requestError('Não foi possível carregar as últimas obras adicionadas.')
  return (data ?? []) as RecentAddition[]
}
