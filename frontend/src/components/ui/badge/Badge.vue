<template>
  <span
    :class="cn(
      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
      {
        'border-transparent bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100': variant === 'default',
        'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100': variant === 'success',
        'border-transparent bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100': variant === 'destructive',
        'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100': variant === 'warning',
        'border-transparent bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100': variant === 'info',
        'border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-300': variant === 'outline',
      },
      className
    )"
  >
    <slot />
  </span>
</template>

<script setup>
import { cn } from '@/lib/utils'

defineProps({
  variant: { type: String, default: 'default' },
  className: { type: String, default: '' },
})
</script>
