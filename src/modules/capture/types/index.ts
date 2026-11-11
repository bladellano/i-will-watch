import type { TmdbSearchResult } from '@/modules/media/types'

export type CaptureStatus = 'pending' | 'processing' | 'needs_review' | 'completed' | 'failed'
export type AiConfidence = 'low' | 'medium' | 'high'

export const CAPTURE_STATUS_LABELS: Record<CaptureStatus, string> = {
  pending: 'Aguardando',
  processing: 'Processando',
  needs_review: 'Revisar candidatos',
  completed: 'Concluída',
  failed: 'Não identificada',
}

export const CONFIDENCE_LABELS: Record<AiConfidence, string> = {
  high: 'Confiança alta',
  medium: 'Confiança média',
  low: 'Confiança baixa',
}

export interface CaptureMatch extends TmdbSearchResult {
  confidence: AiConfidence
}

export interface AiResult {
  model: string
  matches: CaptureMatch[]
}

export interface Capture {
  id: string
  image_path: string | null
  input_title: string | null
  input_url: string | null
  source: string | null
  status: CaptureStatus
  ai_result: AiResult | null
  selected_media_id: string | null
  error_message: string | null
  created_at: string
  processed_at: string | null
}

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
