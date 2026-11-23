import { ref, useId } from 'vue'

/** Estado de expandir/recolher uma seção; o contentId liga o botão ao conteúdo (aria-controls). */
export function useCollapsible(defaultOpen = true) {
  const open = ref(defaultOpen)
  const contentId = useId()

  function toggle() {
    open.value = !open.value
  }

  return { open, contentId, toggle }
}
