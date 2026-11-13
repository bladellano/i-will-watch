import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const fetchTimeline = vi.fn()
vi.mock('../../services/timeline.service', () => ({ fetchTimeline, TIMELINE_PAGE_SIZE: 2 }))
const updateNote = vi.fn()
const hideNoteFromTimeline = vi.fn()
vi.mock('../../services/notes.service', () => ({ updateNote, hideNoteFromTimeline }))
const setLike = vi.fn()
vi.mock('@/modules/likes/services/likes.service', () => ({ setLike }))
const fetchMediaDetails = vi.fn()
vi.mock('@/modules/media/services/media.service', () => ({ fetchMediaDetails }))
const activityLoad = vi.fn()
vi.mock('@/modules/activity/stores/activity.store', () => ({ useActivityStore: () => ({ load: activityLoad }) }))

const { useTimelineStore } = await import('../timeline.store')

const ev = (id: string, over = {}) => ({
  event_type: 'comment',
  event_id: id,
  occurred_at: `2026-11-13T12:0${id}:00Z`,
  comment_body: 'texto',
  comment_edited_at: null,
  item_id: `item-${id}`,
  is_own: false,
  ...over,
})

beforeEach(() => {
  setActivePinia(createPinia())
  for (const fn of [fetchTimeline, updateNote, hideNoteFromTimeline, setLike, fetchMediaDetails, activityLoad]) fn.mockReset()
})

describe('timeline store', () => {
  it('carrega a primeira página e indica se há mais', async () => {
    fetchTimeline.mockResolvedValue([ev('2'), ev('1')])
    const store = useTimelineStore()
    await store.load()
    expect(fetchTimeline).toHaveBeenCalledWith('all', null)
    expect(store.items).toHaveLength(2)
    expect(store.hasMore).toBe(true)
  })

  it('página incompleta encerra a paginação; vazio marca isEmpty', async () => {
    fetchTimeline.mockResolvedValue([])
    const store = useTimelineStore()
    await store.load()
    expect(store.hasMore).toBe(false)
    expect(store.isEmpty).toBe(true)
  })

  it('não busca de novo em menos de 1 minuto, mas invalidate e force buscam', async () => {
    fetchTimeline.mockResolvedValue([])
    const store = useTimelineStore()
    await store.load()
    await store.load()
    expect(fetchTimeline).toHaveBeenCalledOnce()
    store.invalidate()
    await store.load()
    expect(fetchTimeline).toHaveBeenCalledTimes(2)
    await store.load(true)
    expect(fetchTimeline).toHaveBeenCalledTimes(3)
  })

  it('guarda o erro e tenta de novo depois', async () => {
    fetchTimeline.mockRejectedValueOnce(new Error('Não foi possível carregar a timeline da comunidade.'))
    const store = useTimelineStore()
    await store.load()
    expect(store.error).toMatch(/timeline/)
    fetchTimeline.mockResolvedValueOnce([])
    await store.load(true)
    expect(store.error).toBe('')
  })

  it('carregar mais usa o último item como cursor e ignora duplicados', async () => {
    fetchTimeline.mockResolvedValueOnce([ev('3'), ev('2')]).mockResolvedValueOnce([ev('2'), ev('1')])
    const store = useTimelineStore()
    await store.load()
    await store.loadMore()
    expect(fetchTimeline).toHaveBeenLastCalledWith('all', expect.objectContaining({ event_id: '2' }))
    expect(store.items.map((i) => i.event_id)).toEqual(['3', '2', '1'])
  })

  it('erro ao carregar mais mantém a lista e permite tentar de novo', async () => {
    fetchTimeline.mockResolvedValueOnce([ev('3'), ev('2')]).mockRejectedValueOnce(new Error('falhou'))
    const store = useTimelineStore()
    await store.load()
    await store.loadMore()
    expect(store.moreError).toBe('falhou')
    expect(store.items).toHaveLength(2)
    expect(store.hasMore).toBe(true)
  })

  it('trocar de aba recarrega do começo com o novo filtro', async () => {
    fetchTimeline.mockResolvedValue([ev('1')])
    const store = useTimelineStore()
    await store.load()
    await store.setFilter('like')
    expect(fetchTimeline).toHaveBeenLastCalledWith('like', null)
    expect(store.filter).toBe('like')
  })

  it('ignora a resposta de uma aba antiga', async () => {
    let resolveFirst: (v: unknown[]) => void = () => {}
    fetchTimeline.mockImplementationOnce(() => new Promise((r) => (resolveFirst = r)))
    fetchTimeline.mockResolvedValueOnce([ev('9', { event_type: 'like' })])
    const store = useTimelineStore()
    const first = store.load()
    await store.setFilter('like')
    resolveFirst([ev('1')])
    await first
    expect(store.items.map((i) => i.event_id)).toEqual(['9'])
  })

  describe('comentários próprios (Observações publicadas)', () => {
    it('edita e reflete o texto e o "editado" no card', async () => {
      fetchTimeline.mockResolvedValue([ev('1', { is_own: true })])
      updateNote.mockResolvedValue({ notes: 'novo', notes_edited_at: '2026-11-13T13:00:00Z' })
      const store = useTimelineStore()
      await store.load()
      await store.saveNote('item-1', 'novo')
      expect(updateNote).toHaveBeenCalledWith('item-1', 'novo')
      expect(store.items[0]?.comment_body).toBe('novo')
      expect(store.items[0]?.comment_edited_at).toBe('2026-11-13T13:00:00Z')
    })

    it('se a edição falhar, mantém o texto e repassa o erro', async () => {
      fetchTimeline.mockResolvedValue([ev('1', { is_own: true })])
      updateNote.mockRejectedValue(new Error('Não foi possível salvar o comentário.'))
      const store = useTimelineStore()
      await store.load()
      await expect(store.saveNote('item-1', 'novo')).rejects.toThrow(/salvar/)
      expect(store.items[0]?.comment_body).toBe('texto')
    })

    it('tirar da timeline remove só o card do comentário; se o servidor recusar, mantém', async () => {
      fetchTimeline.mockResolvedValue([
        ev('1', { is_own: true }),
        ev('2'),
        ev('x:y', { event_type: 'like', comment_body: null, item_id: 'item-1' }),
      ])
      const store = useTimelineStore()
      await store.load()
      hideNoteFromTimeline.mockRejectedValueOnce(new Error('Não foi possível tirar o comentário da timeline.'))
      await expect(store.hideNote('item-1')).rejects.toThrow(/tirar/)
      expect(store.items).toHaveLength(3)
      hideNoteFromTimeline.mockResolvedValueOnce(undefined)
      await store.hideNote('item-1')
      // a curtida na mesma adição (item-1) permanece
      expect(store.items.map((i) => i.event_id)).toEqual(['2', 'x:y'])
    })
  })

  describe('desfazer a própria curtida', () => {
    const like = (id: string, over = {}) =>
      ev(id, { event_type: 'like', comment_body: null, item_id: 'item-1', is_own: true, ...over })

    it('remove o item da timeline e atualiza o widget de obras', async () => {
      fetchTimeline.mockResolvedValue([like('a:b'), ev('1')])
      setLike.mockResolvedValue(undefined)
      const store = useTimelineStore()
      await store.load()
      await store.undoLike('item-1')
      expect(setLike).toHaveBeenCalledWith('item-1', false)
      expect(store.items.map((i) => i.event_id)).toEqual(['1'])
      expect(activityLoad).toHaveBeenCalledWith(true)
    })

    it('se falhar, mantém o item e guarda o erro', async () => {
      fetchTimeline.mockResolvedValue([like('a:b')])
      setLike.mockRejectedValue(new Error('Não foi possível remover a curtida. Tente novamente.'))
      const store = useTimelineStore()
      await store.load()
      await store.undoLike('item-1')
      expect(store.items).toHaveLength(1)
      expect(store.actionError).toMatch(/remover a curtida/)
      expect(store.busyLikes).toEqual([])
    })
  })

  describe('detalhes da obra (clique na capa)', () => {
    const detail = { tmdb_id: 1, media_type: 'movie', title: 'Matrix', overview: 'sinopse', genres: ['Ficção'] }

    it('busca a obra no catálogo e abre o modal com o item que o abriu', async () => {
      fetchMediaDetails.mockResolvedValue(detail)
      const store = useTimelineStore()
      const event = ev('1', { media_id: 'm1' }) as never
      await store.openDetails(event)
      expect(fetchMediaDetails).toHaveBeenCalledWith('m1')
      expect(store.details).toEqual(detail)
      expect(store.detailsEvent).toEqual(event)
      expect(store.detailsBusy).toBe('')
    })

    it('a mesma obra não é buscada duas vezes', async () => {
      fetchMediaDetails.mockResolvedValue(detail)
      const store = useTimelineStore()
      await store.openDetails(ev('1', { media_id: 'm1' }) as never)
      store.closeDetails()
      expect(store.details).toBeNull()
      await store.openDetails(ev('2', { media_id: 'm1' }) as never)
      expect(fetchMediaDetails).toHaveBeenCalledOnce()
      expect(store.details).toEqual(detail)
    })

    it('ignora cliques enquanto uma busca está em andamento', async () => {
      let resolve: (v: unknown) => void = () => {}
      fetchMediaDetails.mockImplementationOnce(() => new Promise((r) => (resolve = r)))
      const store = useTimelineStore()
      const first = store.openDetails(ev('1', { media_id: 'm1' }) as never)
      expect(store.detailsBusy).toBe('1')
      await store.openDetails(ev('2', { media_id: 'm2' }) as never)
      expect(fetchMediaDetails).toHaveBeenCalledOnce()
      resolve(detail)
      await first
      expect(store.details).toEqual(detail)
    })

    it('se a busca falhar, não abre o modal e mostra o erro', async () => {
      fetchMediaDetails.mockRejectedValue(new Error('Não foi possível carregar os detalhes da obra.'))
      const store = useTimelineStore()
      await store.openDetails(ev('1', { media_id: 'm1' }) as never)
      expect(store.details).toBeNull()
      expect(store.actionError).toMatch(/detalhes da obra/)
      expect(store.detailsBusy).toBe('')
    })
  })

  it('reset limpa tudo (logout)', async () => {
    fetchTimeline.mockResolvedValue([ev('1')])
    const store = useTimelineStore()
    await store.load()
    store.reset()
    expect(store.items).toEqual([])
    expect(store.loaded).toBe(false)
    expect(store.filter).toBe('all')
  })
})
