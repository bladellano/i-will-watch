import { ref } from 'vue'
import { defineStore } from 'pinia'
import { createList, deleteList, fetchListSummaries, updateList, type ListInput } from '../services/lists.service'
import type { ListSummary } from '../types'

export const useListsStore = defineStore('lists', () => {
  const lists = ref<ListSummary[]>([])
  const loading = ref(false)
  const error = ref('')

  async function load() {
    loading.value = true
    error.value = ''
    try {
      lists.value = await fetchListSummaries()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erro inesperado.'
    } finally {
      loading.value = false
    }
  }

  async function create(input: ListInput) {
    await createList(input)
    await load()
  }

  async function update(id: string, input: ListInput) {
    await updateList(id, input)
    await load()
  }

  async function remove(id: string) {
    await deleteList(id)
    await load()
  }

  return { lists, loading, error, load, create, update, remove }
})
