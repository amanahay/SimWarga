<template>
  <div v-if="open" class="fixed inset-0 z-[1200] flex items-center justify-center" style="background: rgba(0,0,0,0.5);">
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-sm mx-4 p-6">
      <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">{{ title }}</h3>
      <p class="text-sm text-slate-600 dark:text-slate-400 mb-6">{{ message }}</p>
      <div class="flex justify-end gap-2">
        <button
          class="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 border border-slate-200 bg-white text-slate-900 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 transition-colors"
          @click="$emit('cancel')"
        >
          {{ cancelText }}
        </button>
        <button
          class="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 bg-red-600 text-white hover:bg-red-700 transition-colors"
          @click="$emit('confirm')"
        >
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: 'Konfirmasi' },
  message: { type: String, default: 'Apakah Anda yakin?' },
  confirmText: { type: String, default: 'Ya, Hapus' },
  cancelText: { type: String, default: 'Tidak' },
})

defineEmits(['confirm', 'cancel'])
</script>
