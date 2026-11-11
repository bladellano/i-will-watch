import type { WatchStatus } from '../types'

/** Cores das etiquetas de status: para assistir (verde), assistido (azul), arquivado (cinza). */
const STATUS_BADGE: Record<WatchStatus, string> = {
  ASSISTIR: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/40',
  ASSISTIDO: 'bg-blue-500/15 text-blue-300 ring-blue-500/40',
  ARQUIVADO: 'bg-slate-500/20 text-slate-300 ring-slate-500/50',
}

export function statusBadgeClass(status: WatchStatus): string {
  return STATUS_BADGE[status]
}
