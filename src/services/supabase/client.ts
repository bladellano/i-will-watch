import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !publishableKey) {
  throw new Error(
    'Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY não configuradas. Crie o arquivo .env.local (veja .env.example).',
  )
}

// A proteção dos dados depende de Auth + RLS, não do sigilo desta chave.
export const supabase = createClient(url, publishableKey)
