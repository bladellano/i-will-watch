#!/usr/bin/env node
// Envia e-mails aos membros pela Edge Function send-member-email.
//
//   Simulação (padrão, não envia):  npm run email -- --tipo lembrete --para todos
//   Envio real (pede confirmação):  npm run email -- --tipo lembrete --para todos --enviar
//   Um só membro:                   npm run email -- --tipo lembrete --para pessoa@exemplo.com --enviar
//
// Variáveis no terminal (nunca no código nem no repositório):
//   MAIL_ADMIN_SECRET   o mesmo valor definido nos secrets da função
//   VITE_SUPABASE_URL   URL do projeto (ou SUPABASE_URL)

import { parseArgs } from 'node:util'
import { createInterface } from 'node:readline/promises'

const { values } = parseArgs({
  options: {
    tipo: { type: 'string', default: 'lembrete' },
    para: { type: 'string', default: 'todos' },
    enviar: { type: 'boolean', default: false },
  },
})

const baseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const secret = process.env.MAIL_ADMIN_SECRET
if (!baseUrl || !secret) {
  console.error('Defina MAIL_ADMIN_SECRET e VITE_SUPABASE_URL (ou SUPABASE_URL) no terminal.')
  process.exit(1)
}

const to = values.para === 'todos' ? 'all' : values.para
const dryRun = !values.enviar

if (!dryRun) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question(`Enviar "${values.tipo}" para ${values.para}? Digite ENVIAR para confirmar: `)
  rl.close()
  if (answer.trim() !== 'ENVIAR') {
    console.log('Cancelado. Nada foi enviado.')
    process.exit(0)
  }
}

const response = await fetch(`${baseUrl.replace(/\/$/, '')}/functions/v1/send-member-email`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
  body: JSON.stringify({ type: values.tipo, to, dry_run: dryRun }),
})
const body = await response.json().catch(() => ({}))
if (!response.ok) console.error(`Erro ${response.status}`)
console.log(JSON.stringify(body, null, 2))
process.exit(response.ok ? 0 : 1)
