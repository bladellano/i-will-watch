import { requestError } from '@/services/network'
import { supabase } from '@/services/supabase/client'

/** Curte (insere) ou descurte (remove) uma obra. O dono e o autor da curtida são definidos pelo banco. */
export async function setLike(itemId: string, like: boolean): Promise<void> {
  if (like) {
    const { error } = await supabase.from('item_likes').insert({ item_id: itemId })
    // 23505 = já curtido (outra aba/clique duplo): o resultado desejado já existe.
    if (error && error.code !== '23505') throw requestError('Não foi possível curtir. Tente novamente.')
    return
  }
  const { error } = await supabase.from('item_likes').delete().eq('item_id', itemId)
  if (error) throw requestError('Não foi possível remover a curtida. Tente novamente.')
}
