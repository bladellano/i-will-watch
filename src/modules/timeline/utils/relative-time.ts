const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const RELATIVE_WINDOW_DAYS = 7

function plural(n: number, singular: string, pluralForm: string): string {
  return n === 1 ? `há 1 ${singular}` : `há ${n} ${pluralForm}`
}

/** "há 12 minutos" por 7 dias; depois a data absoluta "08/11/2026". Devolve '' para data inválida. */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const diff = now.getTime() - date.getTime()
  if (diff < MINUTE) return 'há instantes'
  if (diff < HOUR) return plural(Math.floor(diff / MINUTE), 'minuto', 'minutos')
  if (diff < DAY) return plural(Math.floor(diff / HOUR), 'hora', 'horas')
  if (diff < RELATIVE_WINDOW_DAYS * DAY) return plural(Math.floor(diff / DAY), 'dia', 'dias')
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}
