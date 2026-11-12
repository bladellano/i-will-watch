import { ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchMemberListItems, fetchMemberLists } from '../services/members.service'
import type { MemberList, MemberListItem } from '../types'

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Erro inesperado.'
}

/** Estado do modal de listas de um membro (somente leitura). */
export const useMembersStore = defineStore('members', () => {
  const memberId = ref<string | null>(null)
  const memberName = ref('')
  const lists = ref<MemberList[]>([])
  const listsLoading = ref(false)
  const listsError = ref('')
  const activeList = ref<MemberList | null>(null)
  const items = ref<MemberListItem[]>([])
  const itemsLoading = ref(false)
  const itemsError = ref('')
  /** Cada busca recebe um número; respostas de buscas antigas são descartadas. */
  let requestId = 0

  async function openMember(id: string, name: string): Promise<void> {
    reset()
    memberId.value = id
    memberName.value = name
    const current = ++requestId
    listsLoading.value = true
    try {
      const result = await fetchMemberLists(id)
      if (current === requestId) lists.value = result
    } catch (e) {
      if (current === requestId) listsError.value = errorMessage(e)
    } finally {
      if (current === requestId) listsLoading.value = false
    }
  }

  async function openList(list: MemberList): Promise<void> {
    const current = ++requestId
    activeList.value = list
    items.value = []
    itemsError.value = ''
    itemsLoading.value = true
    try {
      const result = await fetchMemberListItems(list.id)
      if (current === requestId) items.value = result
    } catch (e) {
      if (current === requestId) itemsError.value = errorMessage(e)
    } finally {
      if (current === requestId) itemsLoading.value = false
    }
  }

  function backToLists() {
    requestId++
    activeList.value = null
    items.value = []
    itemsLoading.value = false
    itemsError.value = ''
  }

  /** Tenta de novo a busca que falhou: a das obras, se uma lista está aberta; senão, a das listas. */
  async function retry(): Promise<void> {
    if (activeList.value) return openList(activeList.value)
    if (memberId.value) return openMember(memberId.value, memberName.value)
  }

  function reset() {
    requestId++
    memberId.value = null
    memberName.value = ''
    lists.value = []
    listsLoading.value = false
    listsError.value = ''
    backToLists()
  }

  return {
    memberId,
    memberName,
    lists,
    listsLoading,
    listsError,
    activeList,
    items,
    itemsLoading,
    itemsError,
    openMember,
    openList,
    backToLists,
    retry,
    reset,
  }
})
