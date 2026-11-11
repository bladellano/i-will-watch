import { requestError } from '@/services/network'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from './client'

/**
 * Invoca uma Edge Function. As mensagens de erro das nossas funções são
 * amigáveis e seguras; se não houver uma, usa a mensagem padrão informada.
 */
export async function invokeFunction<T>(name: string, body: Record<string, unknown>, fallbackMessage: string): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body })
  if (error) {
    let message: string | null = null
    if (error instanceof FunctionsHttpError) {
      const payload = await error.context.json().catch(() => null)
      if (payload && typeof payload.error === 'string') message = payload.error
    }
    throw message ? new Error(message) : requestError(fallbackMessage)
  }
  if (data === null || data === undefined) throw requestError(fallbackMessage)
  return data
}
