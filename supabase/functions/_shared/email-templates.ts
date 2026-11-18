// Modelos de e-mail para membros. Funções puras (sem imports): testáveis fora do Deno.
// Para criar um novo tipo: acrescente o nome em EMAIL_TYPES e um construtor em BUILDERS.

/** Título recente de um membro, usado no e-mail de últimas adições. */
export interface RecentItem {
  title: string
  mediaType: string
}

export interface Recipient {
  /** id do usuário no Auth; usado para buscar dados do membro quando o tipo precisa. */
  id?: string | null
  email: string
  name: string | null
  /** Itens recentes do membro (só preenchido para tipos que os usam). */
  recentItems?: RecentItem[]
}

export interface EmailContent {
  subject: string
  text: string
  html: string
}

export interface BuildOptions {
  /** Endereço do app (secret APP_URL). Se ausente, o e-mail não traz link. */
  appUrl: string | null
}

export const APP_NAME = 'Minha lista de filmes e séries'

/** Os três objetivos centrais do app, citados no lembrete. Ajuste os textos aqui. */
export const APP_GOALS: readonly { title: string; description: string }[] = [
  {
    title: 'Centralizar',
    description: 'reúna em um só lugar os filmes e séries que recebe de amigos, redes sociais, sites e e-mails.',
  },
  {
    title: 'Registrar em segundos',
    description: 'envie uma captura de tela da indicação e transforme-a em um registro organizado.',
  },
  {
    title: 'Organizar e acompanhar',
    description: 'separe as obras em listas e acompanhe cada uma como Para assistir, Assistindo ou Assistido.',
  },
]

/** Quantos títulos recentes entram no e-mail de últimas adições. */
export const RECENT_ITEMS_EMAIL_LIMIT = 5

export const EMAIL_TYPES = ['lembrete', 'ultimas_adicoes'] as const
export type EmailType = (typeof EMAIL_TYPES)[number]

/** Tipos que precisam dos itens recentes de cada membro antes do envio. */
export const TYPES_WITH_RECENT_ITEMS: readonly EmailType[] = ['ultimas_adicoes']

export function isEmailType(value: unknown): value is EmailType {
  return typeof value === 'string' && (EMAIL_TYPES as readonly string[]).includes(value)
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

/** Nome em uma linha só, com limite de tamanho; null se vazio. */
export function cleanName(value: string | null): string | null {
  if (!value) return null
  const clean = value.replace(/[\r\n]+/g, ' ').trim().slice(0, 80)
  return clean === '' ? null : clean
}

const greeting = (name: string | null) => (name ? `Olá, ${name.split(' ')[0]}!` : 'Olá!')

const footer = `Você recebeu este e-mail porque tem uma conta no app ${APP_NAME}.`

function buildLembrete(recipient: Recipient, options: BuildOptions): EmailContent {
  const hello = greeting(cleanName(recipient.name))
  const closing = 'Sua próxima indicação pode virar um registro organizado em poucos segundos. Que tal dar uma olhada na sua lista hoje?'
  const link = options.appUrl

  const text = [
    hello,
    '',
    `Faz um tempo que você não passa pelo app ${APP_NAME}. Vale lembrar o que ele faz por você:`,
    '',
    ...APP_GOALS.map((goal, index) => `${index + 1}. ${goal.title}: ${goal.description}`),
    '',
    closing,
    ...(link ? ['', `Acesse: ${link}`] : []),
    '',
    footer,
  ]

  const html = [
    `<p>${escapeHtml(hello)}</p>`,
    `<p>Faz um tempo que você não passa pelo app <strong>${escapeHtml(APP_NAME)}</strong>. Vale lembrar o que ele faz por você:</p>`,
    '<ol>',
    ...APP_GOALS.map((goal) => `<li><strong>${escapeHtml(goal.title)}:</strong> ${escapeHtml(goal.description)}</li>`),
    '</ol>',
    `<p>${escapeHtml(closing)}</p>`,
    ...(link ? [`<p><a href="${escapeHtml(link)}">Abrir o app</a></p>`] : []),
    `<p style="color:#666;font-size:12px">${escapeHtml(footer)}</p>`,
  ].join('\n')

  return { subject: 'Sua lista de filmes e séries está esperando por você', text: text.join('\n'), html }
}

const MEDIA_LABEL: Record<string, string> = { movie: 'Filme', tv: 'Série' }

const itemLabel = (item: RecentItem) => `${MEDIA_LABEL[item.mediaType] ?? 'Título'}: ${cleanName(item.title) ?? 'Sem título'}`

function buildUltimasAdicoes(recipient: Recipient, options: BuildOptions): EmailContent {
  const hello = greeting(cleanName(recipient.name))
  const items = (recipient.recentItems ?? []).slice(0, RECENT_ITEMS_EMAIL_LIMIT)
  const intro = 'Estes são os últimos títulos que você adicionou ao app:'
  const closing = 'Quer ajustar alguma coisa ou registrar a próxima indicação? Acesse o app quando quiser.'
  const link = options.appUrl

  const text = [
    hello,
    '',
    intro,
    '',
    ...items.map((item, index) => `${index + 1}. ${itemLabel(item)}`),
    '',
    closing,
    ...(link ? ['', `Acesse: ${link}`] : []),
    '',
    footer,
  ]

  const html = [
    `<p>${escapeHtml(hello)}</p>`,
    `<p>${escapeHtml(intro)}</p>`,
    '<ol>',
    ...items.map((item) => `<li>${escapeHtml(itemLabel(item))}</li>`),
    '</ol>',
    `<p>${escapeHtml(closing)}</p>`,
    ...(link ? [`<p><a href="${escapeHtml(link)}">Abrir o app</a></p>`] : []),
    `<p style="color:#666;font-size:12px">${escapeHtml(footer)}</p>`,
  ].join('\n')

  return { subject: 'Suas últimas adições no app Minha lista de filmes e séries', text: text.join('\n'), html }
}

const BUILDERS: Record<EmailType, (recipient: Recipient, options: BuildOptions) => EmailContent> = {
  lembrete: buildLembrete,
  ultimas_adicoes: buildUltimasAdicoes,
}

export function buildEmail(type: EmailType, recipient: Recipient, options: BuildOptions): EmailContent {
  return BUILDERS[type](recipient, options)
}
