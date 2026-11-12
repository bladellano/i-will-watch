/** "11 de junho às 11h34" (fuso local). Devolve '' para data inválida. */
export function formatAddedAt(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const day = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' }).format(date)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${day} às ${hours}h${minutes}`
}
