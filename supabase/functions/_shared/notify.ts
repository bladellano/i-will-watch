// Funções puras (sem imports) para a notificação de novo usuário: testáveis fora do Deno.

export interface NewUserEvent {
  email: string
  name: string | null
  created_at: string | null
  confirmed_at: string | null
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

/** Remove quebras de linha para impedir injeção de cabeçalhos no assunto do e-mail. */
const oneLine = (text: string) => text.replace(/[\r\n]+/g, ' ').trim()

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max)}…` : text)

/** Valida o corpo recebido do banco; devolve null se estiver incompleto. */
export function parseNewUserEvent(body: unknown): NewUserEvent | null {
  if (!body || typeof body !== 'object') return null
  const raw = body as Record<string, unknown>
  if (typeof raw.email !== 'string' || raw.email.trim() === '') return null
  const str = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? v : null)
  return {
    email: clip(oneLine(raw.email), 254),
    name: str(raw.name) ? clip(oneLine(raw.name as string), 80) : null,
    created_at: str(raw.created_at),
    confirmed_at: str(raw.confirmed_at),
  }
}

export function buildNotification(event: NewUserEvent): { subject: string; text: string; html: string } {
  const who = event.name ? `${event.name} <${event.email}>` : event.email
  const lines = [
    'Um novo usuário concluiu o cadastro no app "Minha lista de filmes e séries".',
    '',
    `Nome: ${event.name ?? '(não informado)'}`,
    `E-mail: ${event.email}`,
    `Cadastro em: ${event.created_at ?? '(desconhecido)'}`,
    `E-mail confirmado em: ${event.confirmed_at ?? '(desconhecido)'}`,
  ]
  const html = `<p>Um novo usuário concluiu o cadastro no app <strong>Minha lista de filmes e séries</strong>.</p>
<ul>
<li><strong>Nome:</strong> ${escapeHtml(event.name ?? '(não informado)')}</li>
<li><strong>E-mail:</strong> ${escapeHtml(event.email)}</li>
<li><strong>Cadastro em:</strong> ${escapeHtml(event.created_at ?? '(desconhecido)')}</li>
<li><strong>E-mail confirmado em:</strong> ${escapeHtml(event.confirmed_at ?? '(desconhecido)')}</li>
</ul>`
  return { subject: `Novo usuário: ${oneLine(who)}`, text: lines.join('\n'), html }
}

/** Comparação em tempo (quase) constante, para o segredo compartilhado. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
