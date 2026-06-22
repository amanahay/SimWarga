import { ref } from 'vue'

const toasts = ref([])
let toastId = 0

const TOAST_LIMIT = 5
const TOAST_REMOVE_DELAY = 5000

export function useToast() {
  function toast({ title, description, variant = 'default', duration = TOAST_REMOVE_DELAY }) {
    const id = ++toastId
    const t = { id, title, description, variant, open: true }
    toasts.value = [t, ...toasts.value].slice(0, TOAST_LIMIT)

    if (duration > 0) {
      setTimeout(() => dismiss(id), duration)
    }
    return id
  }

  function dismiss(id) {
    toasts.value = toasts.value.map(t => t.id === id ? { ...t, open: false } : t)
    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id)
    }, 300)
  }

  return { toasts, toast, dismiss }
}
