<template>
  <div
    aria-live="polite"
    class="fixed bottom-0 right-0 z-[1300] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]"
  >
    <Toast
      v-for="t in toasts"
      :key="t.id"
      :open="t.open"
      :title="t.title"
      :description="t.description"
      :variant="t.variant"
      @close="dismiss(t.id)"
    />
  </div>
</template>

<script setup>
import Toast from './Toast.vue'
import { useToast } from './use-toast'

const { toasts, dismiss } = useToast()

// Export for global access
if (typeof window !== 'undefined') {
  window.__toast = { toasts, dismiss }
}
</script>
