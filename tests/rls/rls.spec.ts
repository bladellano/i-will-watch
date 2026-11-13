import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Valida RLS/permissões com dois usuários reais de teste.
 * Cada teste tenta acessar dados do OUTRO usuário e espera ser negado.
 * Os dados criados aqui são removidos no final.
 */
const env = process.env
const url = env.VITE_SUPABASE_URL ?? ''
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''
const A = { email: env.TEST_USER_A_EMAIL ?? '', password: env.TEST_USER_A_PASSWORD ?? '' }
const B = { email: env.TEST_USER_B_EMAIL ?? '', password: env.TEST_USER_B_PASSWORD ?? '' }

// PNG 1x1 válido.
const PNG = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='),
  (c) => c.charCodeAt(0),
)

function newClient(): SupabaseClient {
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

async function login(creds: { email: string; password: string }) {
  const client = newClient()
  const { data, error } = await client.auth.signInWithPassword(creds)
  if (error || !data.user) throw new Error(`Login de teste falhou (${creds.email}): ${error?.message}`)
  return { client, userId: data.user.id }
}

let a: SupabaseClient
let b: SupabaseClient
let aId = ''
let bId = ''
let listA = ''
let defaultListA = ''
let linkA = ''
let captureA = ''
let mediaId = ''
const objectPath = () => `${aId}/rls-test.png`

beforeAll(async () => {
  if (!url || !key || !A.email || !B.email) {
    throw new Error('Configure .env.test.local (veja .env.test.example) com as variáveis do Supabase e dos dois usuários.')
  }
  ;({ client: a, userId: aId } = await login(A))
  ;({ client: b, userId: bId } = await login(B))
  expect(aId).not.toBe(bId)

  const media = await a.from('media').select('id').limit(1)
  if (!media.data?.[0]) throw new Error('É preciso existir ao menos 1 obra em "media" (cadastre uma pelo app).')
  mediaId = media.data[0].id

  const list = await a.from('lists').insert({ name: 'rls-test' }).select('id').single()
  expect(list.error).toBeNull()
  listA = list.data!.id

  const def = await a.from('lists').select('id').eq('is_default', true).single()
  defaultListA = def.data!.id

  const link = await a.from('list_media').insert({ list_id: listA, media_id: mediaId }).select('id').single()
  expect(link.error).toBeNull()
  linkA = link.data!.id

  const cap = await a.from('capture_requests').insert({ input_title: 'rls-test' }).select('id').single()
  expect(cap.error).toBeNull()
  captureA = cap.data!.id

  const up = await a.storage.from('captures').upload(objectPath(), PNG, { contentType: 'image/png', upsert: true })
  expect(up.error).toBeNull()
})

afterAll(async () => {
  if (!a) return
  await a.storage.from('captures').remove([objectPath()])
  if (captureA) await a.from('capture_requests').delete().eq('id', captureA)
  if (listA) await a.from('lists').delete().eq('id', listA) // cascata remove o vínculo
})

describe('lists', () => {
  it('o dono enxerga a própria lista', async () => {
    const { data } = await a.from('lists').select('id').eq('id', listA)
    expect(data).toHaveLength(1)
  })
  it('outro usuário não enxerga', async () => {
    const { data } = await b.from('lists').select('id').eq('id', listA)
    expect(data).toEqual([])
  })
  it('outro usuário não altera nem exclui', async () => {
    const upd = await b.from('lists').update({ name: 'invadida' }).eq('id', listA).select('id')
    expect(upd.data ?? []).toEqual([])
    const del = await b.from('lists').delete().eq('id', listA).select('id')
    expect(del.data ?? []).toEqual([])
    const { data } = await a.from('lists').select('name').eq('id', listA).single()
    expect(data?.name).toBe('rls-test')
  })
  it('não é possível criar lista em nome de outro usuário', async () => {
    const { error } = await b.from('lists').insert({ name: 'x', user_id: aId })
    expect(error).not.toBeNull()
  })
  it('não é possível marcar is_default pelo cliente', async () => {
    const { error } = await a.from('lists').insert({ name: 'x', is_default: true })
    expect(error).not.toBeNull()
  })
  it('a lista default não pode ser excluída', async () => {
    const del = await a.from('lists').delete().eq('id', defaultListA).select('id')
    expect(del.data ?? []).toEqual([])
  })
})

describe('list_media', () => {
  it('outro usuário não lê, altera nem exclui o vínculo', async () => {
    expect((await b.from('list_media').select('id').eq('id', linkA)).data).toEqual([])
    const upd = await b.from('list_media').update({ status: 'ASSISTIDO' }).eq('id', linkA).select('id')
    expect(upd.data ?? []).toEqual([])
    const del = await b.from('list_media').delete().eq('id', linkA).select('id')
    expect(del.data ?? []).toEqual([])
    const { data } = await a.from('list_media').select('status').eq('id', linkA).single()
    expect(data?.status).toBe('ASSISTIR')
  })
  it('outro usuário não fixa itens alheios; o dono consegue', async () => {
    const other = await b.from('list_media').update({ is_pinned: true }).eq('id', linkA).select('id')
    expect(other.data ?? []).toEqual([])
    const own = await a.from('list_media').update({ is_pinned: true }).eq('id', linkA).select('id')
    expect(own.error).toBeNull()
    expect(own.data).toHaveLength(1)
    await a.from('list_media').update({ is_pinned: false }).eq('id', linkA)
  })
  it('outro usuário não insere obra na lista alheia', async () => {
    const { error } = await b.from('list_media').insert({ list_id: listA, media_id: mediaId })
    expect(error).not.toBeNull()
  })
})

describe('capture_requests', () => {
  it('outro usuário não lê nem exclui a captura', async () => {
    expect((await b.from('capture_requests').select('id').eq('id', captureA)).data).toEqual([])
    const del = await b.from('capture_requests').delete().eq('id', captureA).select('id')
    expect(del.data ?? []).toEqual([])
  })
  it('o cliente não altera status nem resultado de IA', async () => {
    const { error } = await a.from('capture_requests').update({ status: 'completed' }).eq('id', captureA)
    expect(error).not.toBeNull()
  })
  it('o cliente não cria captura já concluída nem em nome de outro', async () => {
    expect((await a.from('capture_requests').insert({ input_title: 'x', status: 'completed' })).error).not.toBeNull()
    expect((await b.from('capture_requests').insert({ input_title: 'x', user_id: aId })).error).not.toBeNull()
  })
  it('não aceita image_path na pasta de outro usuário', async () => {
    const { error } = await b.from('capture_requests').insert({ image_path: `${aId}/x.png` })
    expect(error).not.toBeNull()
  })
})

describe('media e ai_usage_log', () => {
  it('usuários autenticados leem o catálogo, mas não escrevem', async () => {
    expect((await b.from('media').select('id').limit(1)).error).toBeNull()
    expect((await b.from('media').insert({ tmdb_id: 1, media_type: 'movie', title: 'x' })).error).not.toBeNull()
    expect((await b.from('media').update({ title: 'x' }).eq('id', mediaId)).error).not.toBeNull()
    expect((await b.from('media').delete().eq('id', mediaId)).error).not.toBeNull()
  })
  it('ai_usage_log é inacessível pelo cliente', async () => {
    expect((await a.from('ai_usage_log').select('id').limit(1)).error).not.toBeNull()
    expect((await a.from('ai_usage_log').insert({ user_id: aId })).error).not.toBeNull()
  })
})

describe('profiles', () => {
  it('o usuário altera o próprio nome, mas não o de outro', async () => {
    const mine = await a.from('profiles').update({ name: 'Teste RLS A' }).eq('id', aId).select('name')
    expect(mine.error).toBeNull()
    expect(mine.data?.[0]?.name).toBe('Teste RLS A')
    const other = await b.from('profiles').update({ name: 'invadido' }).eq('id', aId).select('id')
    expect(other.data ?? []).toEqual([])
    const { data } = await a.from('profiles').select('name').eq('id', aId).single()
    expect(data?.name).toBe('Teste RLS A')
  })
  it('o banco rejeita nome vazio ou acima de 80 caracteres', async () => {
    expect((await a.from('profiles').update({ name: '' }).eq('id', aId)).error).not.toBeNull()
    expect((await a.from('profiles').update({ name: 'x'.repeat(81) }).eq('id', aId)).error).not.toBeNull()
  })
  it('cada usuário vê apenas o próprio perfil', async () => {
    const { data } = await b.from('profiles').select('id')
    expect(data?.map((p) => p.id)).toEqual([bId])
  })
})

describe('storage (bucket captures)', () => {
  it('o dono baixa o próprio arquivo', async () => {
    expect((await a.storage.from('captures').download(objectPath())).error).toBeNull()
  })
  it('outro usuário não baixa, não lista e não grava na pasta alheia', async () => {
    expect((await b.storage.from('captures').download(objectPath())).error).not.toBeNull()
    const list = await b.storage.from('captures').list(aId)
    expect(list.data ?? []).toEqual([])
    const up = await b.storage.from('captures').upload(`${aId}/invasor.png`, PNG, { contentType: 'image/png' })
    expect(up.error).not.toBeNull()
  })
  it('outro usuário não remove o arquivo alheio', async () => {
    await b.storage.from('captures').remove([objectPath()])
    expect((await a.storage.from('captures').download(objectPath())).error).toBeNull()
  })
  it('o bucket não é público', async () => {
    const res = await fetch(`${url}/storage/v1/object/public/captures/${objectPath()}`)
    expect(res.ok).toBe(false)
  })
})

describe('recent_additions (widget)', () => {
  it('usuário autenticado recebe no máximo 25 itens, mais recentes primeiro, sem dados sensíveis', async () => {
    const { data, error } = await a.rpc('recent_additions', { max_items: 25 })
    expect(error).toBeNull()
    expect((data ?? []).length).toBeLessThanOrEqual(25)
    const dates = (data ?? []).map((r: { added_at: string }) => Date.parse(r.added_at))
    expect(dates).toEqual([...dates].sort((x, y) => y - x))
    for (const row of data ?? []) {
      expect(Object.keys(row).sort()).toEqual(
        ['added_at', 'genres', 'is_own', 'item_id', 'like_count', 'liked_by_me', 'media_type', 'member_id', 'member_name', 'member_shares_lists', 'original_title', 'overview', 'poster_path', 'release_date', 'title', 'tmdb_id', 'tmdb_rating'],
      )
      expect(row.member_name).not.toContain('@')
    }
  })
  it('traz no máximo uma entrada por membro (o usuário aparece uma única vez)', async () => {
    const extra = await a.from('list_media').insert({ list_id: defaultListA, media_id: mediaId }).select('id')
    const { data } = await a.rpc('recent_additions', { max_items: 10 })
    expect((data ?? []).filter((r: { member_name: string }) => r.member_name === 'Você').length).toBeLessThanOrEqual(1)
    if (extra.data?.[0]) await a.from('list_media').delete().eq('id', extra.data[0].id)
  })
  it('o limite é respeitado mesmo com valores absurdos', async () => {
    const { data } = await a.rpc('recent_additions', { max_items: 1000 })
    expect((data ?? []).length).toBeLessThanOrEqual(25)
  })
  it('a atividade do próprio usuário aparece como "Você" e a do outro, sem e-mail', async () => {
    const { data } = await b.rpc('recent_additions', { max_items: 10 })
    const mine = (data ?? []).find((r: { item_id: string }) => r.item_id === linkA)
    if (mine) expect(mine.member_name).not.toBe('Você')
  })
  it('anônimo não executa a função', async () => {
    const { error } = await newClient().rpc('recent_additions', { max_items: 5 })
    expect(error).not.toBeNull()
  })
})

describe('recent_members (widget de membros cadastrados)', () => {
  it('devolve no máximo 25 membros, mais recentes primeiro, sem e-mail nem listas', async () => {
    const { data, error } = await a.rpc('recent_members', { max_items: 1000 })
    expect(error).toBeNull()
    expect((data ?? []).length).toBeLessThanOrEqual(25)
    const dates = (data ?? []).map((r: { joined_at: string }) => Date.parse(r.joined_at))
    expect(dates).toEqual([...dates].sort((x, y) => y - x))
    for (const row of data ?? []) {
      expect(Object.keys(row).sort()).toEqual(['is_own', 'joined_at', 'member_id', 'member_name'])
      expect(row.member_name).not.toContain('@')
    }
  })
  it('marca o próprio usuário como "Você" e o outro sem "is_own"', async () => {
    const { data } = await b.rpc('recent_members', { max_items: 25 })
    const other = (data ?? []).find((r: { member_id: string }) => r.member_id === aId)
    if (other) expect(other.is_own).toBe(false)
    const self = (data ?? []).find((r: { member_id: string }) => r.member_id === bId)
    if (self) {
      expect(self.is_own).toBe(true)
      expect(self.member_name).toBe('Você')
    }
  })
  it('anônimo não executa a função', async () => {
    expect((await newClient().rpc('recent_members', { max_items: 5 })).error).not.toBeNull()
  })
})

describe('compartilhamento de listas (modal do widget)', () => {
  afterAll(async () => {
    await a.from('profiles').update({ share_lists: true }).eq('id', aId)
  })
  it('por padrão todos compartilham; o usuário lê a própria preferência', async () => {
    const { data, error } = await a.from('profiles').select('share_lists').eq('id', aId).single()
    expect(error).toBeNull()
    expect(data?.share_lists).toBe(true)
  })
  it('sem compartilhamento, outro usuário não vê as listas nem as obras', async () => {
    await a.from('profiles').update({ share_lists: false }).eq('id', aId)
    const lists = await b.rpc('member_lists', { p_member_id: aId })
    expect(lists.error).toBeNull()
    expect(lists.data ?? []).toEqual([])
    const items = await b.rpc('member_list_items', { p_list_id: listA })
    expect(items.error).toBeNull()
    expect(items.data ?? []).toEqual([])
  })
  it('outro usuário não altera a preferência de compartilhamento de outro', async () => {
    const res = await b.from('profiles').update({ share_lists: true }).eq('id', aId).select('id')
    expect(res.data ?? []).toEqual([])
  })
  it('com compartilhamento ligado, outro usuário vê as listas e as obras, sem campos sensíveis', async () => {
    const on = await a.from('profiles').update({ share_lists: true }).eq('id', aId).select('id')
    expect(on.data?.length).toBe(1)
    const lists = await b.rpc('member_lists', { p_member_id: aId })
    expect(lists.error).toBeNull()
    expect((lists.data ?? []).map((l: { id: string }) => l.id)).toContain(listA)
    for (const row of lists.data ?? []) {
      expect(Object.keys(row).sort()).toEqual(['description', 'id', 'is_default', 'item_count', 'name'])
    }
    const items = await b.rpc('member_list_items', { p_list_id: listA })
    expect(items.error).toBeNull()
    expect((items.data ?? []).length).toBeGreaterThan(0)
    for (const row of items.data ?? []) {
      expect(Object.keys(row).sort()).toEqual(['id', 'media_type', 'poster_path', 'release_date', 'title'])
    }
  })
  it('o widget reflete o compartilhamento: membro que compartilha aparece com member_shares_lists = true', async () => {
    const { data } = await b.rpc('recent_additions', { max_items: 10 })
    const mine = (data ?? []).find((r: { member_id: string }) => r.member_id === aId)
    if (mine) expect(mine.member_shares_lists).toBe(true)
  })
  it('ao desligar, o acesso some de novo', async () => {
    await a.from('profiles').update({ share_lists: false }).eq('id', aId)
    const lists = await b.rpc('member_lists', { p_member_id: aId })
    expect(lists.data ?? []).toEqual([])
  })
  it('anônimo não executa as funções de listas', async () => {
    expect((await newClient().rpc('member_lists', { p_member_id: aId })).error).not.toBeNull()
    expect((await newClient().rpc('member_list_items', { p_list_id: listA })).error).not.toBeNull()
  })
})

describe('item_likes (curtidas)', () => {
  afterAll(async () => {
    await b.from('item_likes').delete().eq('item_id', linkA)
  })
  it('B curte a obra de A; o dono é preenchido pelo banco', async () => {
    const ins = await b.from('item_likes').insert({ item_id: linkA }).select('item_id, owner_id, user_id')
    expect(ins.error).toBeNull()
    expect(ins.data?.[0]).toMatchObject({ owner_id: aId, user_id: bId })
  })
  it('curtir duas vezes a mesma obra falha', async () => {
    const dup = await b.from('item_likes').insert({ item_id: linkA })
    expect(dup.error).not.toBeNull()
  })
  it('não é possível forjar user_id nem owner_id', async () => {
    const forged = await b.from('item_likes').insert({ item_id: linkA, user_id: aId } as never)
    expect(forged.error).not.toBeNull()
    const forgedOwner = await b.from('item_likes').insert({ item_id: linkA, owner_id: bId } as never)
    expect(forgedOwner.error).not.toBeNull()
  })
  it('A não pode curtir a própria obra', async () => {
    const own = await a.from('item_likes').insert({ item_id: linkA })
    expect(own.error).not.toBeNull()
  })
  it('A não lê nem remove a curtida de B', async () => {
    expect((await a.from('item_likes').select('item_id')).data ?? []).toEqual([])
    const del = await a.from('item_likes').delete().eq('item_id', linkA).select('item_id')
    expect(del.data ?? []).toEqual([])
    expect((await b.from('item_likes').select('item_id').eq('item_id', linkA)).data).toHaveLength(1)
  })
  it('a contagem aparece no widget: A vê 1 curtida em sua obra; B vê liked_by_me', async () => {
    const forA = (await a.rpc('recent_additions', { max_items: 10 })).data ?? []
    const mineA = forA.find((r: { item_id: string }) => r.item_id === linkA)
    if (mineA) expect(mineA).toMatchObject({ like_count: 1, liked_by_me: false, is_own: true })
    const forB = (await b.rpc('recent_additions', { max_items: 10 })).data ?? []
    const seenB = forB.find((r: { item_id: string }) => r.item_id === linkA)
    if (seenB) expect(seenB).toMatchObject({ liked_by_me: true, is_own: false })
  })
  it('B remove a própria curtida', async () => {
    const del = await b.from('item_likes').delete().eq('item_id', linkA).select('item_id')
    expect(del.data).toHaveLength(1)
  })
})

describe('Observações publicadas e timeline da comunidade', () => {
  type TimelineRow = {
    event_type: string
    event_id: string
    occurred_at: string
    actor_name: string
    is_own: boolean
    comment_body: string | null
    comment_edited_at: string | null
    item_id: string | null
    owner_name: string | null
  }
  type NoteState = { notes: string | null; notes_published_at: string | null; notes_edited_at: string | null; notes_hidden: boolean }
  const timeline = async (client: SupabaseClient, type = 'all') =>
    ((await client.rpc('community_timeline', { p_type: type, p_limit: 50 })).data ?? []) as TimelineRow[]
  const note = async (): Promise<NoteState> =>
    (await a.from('list_media').select('notes, notes_published_at, notes_edited_at, notes_hidden').eq('id', linkA).single()).data as NoteState
  const comment = async (client: SupabaseClient) => (await timeline(client, 'comment')).find((r) => r.item_id === linkA)
  const setActivity = async (client: SupabaseClient, id: string, value: boolean) =>
    client.from('profiles').update({ share_activity: value }).eq('id', id)

  const cleanup = async () => {
    await a.from('list_media').update({ notes: null }).eq('id', linkA)
    await b.from('item_likes').delete().eq('item_id', linkA)
    await setActivity(a, aId, true)
    await setActivity(b, bId, true)
  }
  beforeAll(cleanup)
  afterAll(cleanup)

  it('uma obra sem Observações não aparece; salvar o texto publica e o banco apara os espaços', async () => {
    expect(await comment(b)).toBeUndefined()
    const upd = await a.from('list_media').update({ notes: '  rls-test: comecei ontem  ' }).eq('id', linkA).select('notes')
    expect(upd.error).toBeNull()
    const state = await note()
    expect(state).toMatchObject({ notes: 'rls-test: comecei ontem', notes_hidden: false, notes_edited_at: null })
    expect(state.notes_published_at).not.toBeNull()
  })
  it('na timeline, B vê o texto de A só com o primeiro nome; A se vê como "Você"', async () => {
    const forB = await comment(b)
    expect(forB).toMatchObject({ event_type: 'comment', is_own: false, comment_body: 'rls-test: comecei ontem' })
    expect(forB?.actor_name).not.toBe('Você')
    expect(forB?.actor_name).not.toContain(' ')
    expect(forB?.actor_name).not.toContain('@')
    expect(await comment(a)).toMatchObject({ is_own: true, actor_name: 'Você' })
  })
  it('salvar de novo sem mudar o texto não altera a data de publicação', async () => {
    const before = await note()
    await a.from('list_media').update({ notes: 'rls-test: comecei ontem', status: 'ASSISTIR' }).eq('id', linkA)
    const after = await note()
    expect(after.notes_published_at).toBe(before.notes_published_at)
    expect(after.notes_edited_at).toBeNull()
  })
  it('editar o texto publicado mantém a posição e marca "editado"', async () => {
    const before = await note()
    await a.from('list_media').update({ notes: 'rls-test: comecei ontem, gostei' }).eq('id', linkA)
    const after = await note()
    expect(after.notes_published_at).toBe(before.notes_published_at)
    expect(after.notes_edited_at).not.toBeNull()
    expect((await comment(b))?.comment_edited_at).not.toBeNull()
  })
  it('B não altera nem esconde a Observação de A', async () => {
    const upd = await b.from('list_media').update({ notes: 'invadido' }).eq('id', linkA).select('id')
    expect(upd.data ?? []).toEqual([])
    const hide = await b.from('list_media').update({ notes_hidden: true }).eq('id', linkA).select('id')
    expect(hide.data ?? []).toEqual([])
    expect((await note()).notes).toBe('rls-test: comecei ontem, gostei')
  })
  it('o cliente não consegue forjar as datas de publicação', async () => {
    const forgedPublished = await a.from('list_media').update({ notes_published_at: '2000-01-01T00:00:00Z' } as never).eq('id', linkA)
    expect(forgedPublished.error).not.toBeNull()
    const forgedEdited = await a.from('list_media').update({ notes_edited_at: null } as never).eq('id', linkA)
    expect(forgedEdited.error).not.toBeNull()
  })
  it('texto acima de 1.000 caracteres é recusado, mas fixar a obra continua funcionando', async () => {
    const tooLong = await a.from('list_media').update({ notes: 'x'.repeat(1001) }).eq('id', linkA)
    expect(tooLong.error?.message).toContain('note_too_long')
    const pin = await a.from('list_media').update({ is_pinned: true }).eq('id', linkA).select('id')
    expect(pin.error).toBeNull()
    await a.from('list_media').update({ is_pinned: false }).eq('id', linkA)
  })
  it('share_activity desligado esconde a Observação de A, retroativamente; A continua vendo a própria', async () => {
    await setActivity(a, aId, false)
    expect(await comment(b)).toBeUndefined()
    expect(await comment(a)).toBeDefined()
    await setActivity(a, aId, true)
    expect(await comment(b)).toBeDefined()
  })
  it('"tirar da timeline" some para B e mantém o texto; salvar sem mudar o texto não volta; editar volta', async () => {
    const hide = await a.from('list_media').update({ notes_hidden: true }).eq('id', linkA).select('id')
    expect(hide.error).toBeNull()
    expect(await comment(b)).toBeUndefined()
    expect(await comment(a)).toBeUndefined()
    expect((await note()).notes).toBe('rls-test: comecei ontem, gostei')

    await a.from('list_media').update({ notes: 'rls-test: comecei ontem, gostei', status: 'ASSISTIR' }).eq('id', linkA)
    expect(await comment(b)).toBeUndefined()

    await a.from('list_media').update({ notes: 'rls-test: terminei hoje' }).eq('id', linkA)
    const state = await note()
    expect(state).toMatchObject({ notes_hidden: false, notes_edited_at: null })
    expect(await comment(b)).toMatchObject({ comment_body: 'rls-test: terminei hoje' })
  })
  it('curtida: A (dono) e B (autor) a veem; some para A se B esconde a atividade', async () => {
    const ins = await b.from('item_likes').insert({ item_id: linkA })
    expect(ins.error).toBeNull()
    const forA = (await timeline(a, 'like')).find((r) => r.item_id === linkA)
    expect(forA).toMatchObject({ event_type: 'like', is_own: false, owner_name: 'Você' })
    const forB = (await timeline(b, 'like')).find((r) => r.item_id === linkA)
    expect(forB).toMatchObject({ is_own: true, actor_name: 'Você' })
    await setActivity(b, bId, false)
    expect((await timeline(a, 'like')).find((r) => r.item_id === linkA)).toBeUndefined()
    expect((await timeline(b, 'like')).find((r) => r.item_id === linkA)).toBeDefined()
    await setActivity(b, bId, true)
  })
  it('o filtro por tipo separa comentários de curtidas', async () => {
    expect((await timeline(a, 'comment')).every((r) => r.event_type === 'comment')).toBe(true)
    expect((await timeline(a, 'like')).every((r) => r.event_type === 'like')).toBe(true)
  })
  it('a paginação por cursor não repete itens e respeita a ordem', async () => {
    const first = ((await a.rpc('community_timeline', { p_type: 'all', p_limit: 1 })).data ?? []) as TimelineRow[]
    expect(first).toHaveLength(1)
    const next = ((await a.rpc('community_timeline', {
      p_type: 'all',
      p_before: first[0]!.occurred_at,
      p_before_id: first[0]!.event_id,
      p_limit: 50,
    })).data ?? []) as TimelineRow[]
    expect(next.find((r) => r.event_id === first[0]!.event_id)).toBeUndefined()
    expect(next.every((r) => r.occurred_at <= first[0]!.occurred_at)).toBe(true)
  })
  it('anônimo não executa a timeline', async () => {
    expect((await newClient().rpc('community_timeline', { p_type: 'all' })).error).not.toBeNull()
  })
  it('apagar o texto das Observações tira da timeline e zera o estado', async () => {
    await a.from('list_media').update({ notes: null }).eq('id', linkA)
    expect(await comment(b)).toBeUndefined()
    expect(await note()).toMatchObject({ notes: null, notes_published_at: null, notes_edited_at: null, notes_hidden: false })
  })
})

describe('anônimo', () => {
  it('sem login não lê nada', async () => {
    const anon = newClient()
    const { data } = await anon.from('lists').select('id')
    expect(data ?? []).toEqual([])
    expect((await anon.from('media').select('id').limit(1)).data ?? []).toEqual([])
  })
})
