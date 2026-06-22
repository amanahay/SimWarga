<template>
  <!-- Use CSS variables for background/text/border so `data-theme` (and Tailwind `dark:`) stay in sync -->
  <div
    :class="cn('rounded-xl border shadow-sm', className)"
    :style="{ background: 'var(--surface)', color: 'var(--text-primary)', borderColor: 'var(--border)' }"
  >
    <div v-if="$slots.header" :class="cn('flex items-center gap-2 border-b border-slate-200 px-6 py-4 font-semibold', headerClass)">
      <slot name="header" />
    </div>
    <div :class="cn('p-6', bodyClass)">
      <slot />
    </div>
    <div v-if="$slots.footer" :class="cn('flex items-center border-t border-slate-200 px-6 py-4', footerClass)">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup>
import { cn } from '@/lib/utils'

defineProps({
  className: { type: String, default: '' },
  headerClass: { type: String, default: '' },
  bodyClass: { type: String, default: '' },
  footerClass: { type: String, default: '' },
})
</script>
