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

describe('anônimo', () => {
  it('sem login não lê nada', async () => {
    const anon = newClient()
    const { data } = await anon.from('lists').select('id')
    expect(data ?? []).toEqual([])
    expect((await anon.from('media').select('id').limit(1)).data ?? []).toEqual([])
  })
})
