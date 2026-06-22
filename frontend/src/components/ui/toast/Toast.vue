<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="opacity-0 translate-y-2 scale-95"
    enter-to-class="opacity-100 translate-y-0 scale-100"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0 scale-100"
    leave-to-class="opacity-0 translate-y-2 scale-95"
  >
    <div
      v-if="open"
      :class="cn(
        'group pointer-events-auto relative flex w-full items-center justify-between gap-4 overflow-hidden rounded-md border p-4 pr-8 shadow-lg transition-all',
        {
          'border-slate-200 bg-white text-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50': variant === 'default',
          'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100': variant === 'destructive',
          'border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100': variant === 'success',
          'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100': variant === 'warning',
        }
      )"
    >
      <div class="flex items-start gap-3">
        <!-- Icon -->
        <CheckCircle v-if="variant === 'success'" class="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
        <AlertCircle v-else-if="variant === 'destructive'" class="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
        <AlertTriangle v-else-if="variant === 'warning'" class="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <Info v-else class="h-5 w-5 text-slate-600 dark:text-slate-400 shrink-0 mt-0.5" />

        <div class="flex flex-col gap-1">
          <div v-if="title" class="text-sm font-semibold leading-tight">{{ title }}</div>
          <div v-if="description" class="text-sm opacity-80 leading-relaxed">{{ description }}</div>
        </div>
      </div>

      <button
        @click="$emit('close')"
        class="absolute right-2 top-2 rounded-md p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/5 dark:hover:bg-white/10"
      >
        <X class="h-4 w-4" />
      </button>
    </div>
  </Transition>
</template>

<script setup>
import { cn } from '@/lib/utils'
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-vue-next'

defineProps({
  open: { type: Boolean, default: true },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  variant: { type: String, default: 'default' },
})

defineEmits(['close'])
</script>
