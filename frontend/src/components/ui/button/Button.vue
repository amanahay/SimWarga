<template>
  <component
    :is="tag"
    :class="cn(
      'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
      {
        'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 focus-visible:ring-indigo-500': variant === 'default',
        'bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-500': variant === 'destructive',
        'border border-slate-200 bg-white text-slate-900 shadow-sm hover:bg-slate-100 focus-visible:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:hover:bg-slate-800': variant === 'outline',
        'text-slate-900 underline-offset-4 hover:underline dark:text-slate-50': variant === 'link',
        'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus-visible:ring-emerald-500': variant === 'success',
        'bg-transparent text-slate-900 hover:bg-slate-100 dark:text-slate-50 dark:hover:bg-slate-800': variant === 'ghost',
        'h-10 px-4 py-2': size === 'default',
        'h-9 rounded-md px-3': size === 'sm',
        'h-11 rounded-md px-8': size === 'lg',
        'h-10 w-10': size === 'icon',
      }
    )"
    :disabled="disabled"
  >
    <slot />
  </component>
</template>

<script setup>
import { cn } from '@/lib/utils'

defineProps({
  variant: { type: String, default: 'default' },
  size: { type: String, default: 'default' },
  disabled: { type: Boolean, default: false },
  tag: { type: String, default: 'button' },
})
</script>
