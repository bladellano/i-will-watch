import { requestError } from '@/services/network'
import { supabase } from '@/services/supabase/client'

/** Tira o evento "começou a assistir" da timeline. A obra continua em ASSISTINDO na lista. */
export async function hideWatchingFromTimeline(itemId: string): Promise<void> {
  const { data, error } = await supabase.from('list_media').update({ watching_hidden: true }).eq('id', itemId).select('id')
  if (error || !data || data.length === 0) throw requestError('Não foi possível tirar o evento da timeline.')
}
