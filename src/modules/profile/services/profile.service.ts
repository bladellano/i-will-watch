import { requestError } from '@/services/network'
import { supabase } from '@/services/supabase/client'

export async function fetchProfileName(userId: string): Promise<string | null> {
  const { data, error } = await supabase.from('profiles').select('name').eq('id', userId).maybeSingle()
  if (error) throw requestError('Não foi possível carregar seu perfil.')
  return data?.name ?? null
}

export async function updateProfileName(userId: string, name: string): Promise<void> {
  const { data, error } = await supabase.from('profiles').update({ name }).eq('id', userId).select('id')
  if (error || !data || data.length === 0) throw requestError('Não foi possível salvar seu nome.')
}
