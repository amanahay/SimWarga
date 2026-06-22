<template>
  <input
    :type="type"
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :required="required"
    :class="cn('form-control-custom', className)"
    :style="computedStyle"
    @input="$emit('update:modelValue', $event.target.value)"
  />
</template>

<script setup>
import { cn } from '@/lib/utils'
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
  className: { type: String, default: '' },
})

defineEmits(['update:modelValue'])

// Map common Tailwind padding classes (pl-*) to CSS values so they can override form-control-custom padding
const spacingMap = {
  '0': '0rem',
  '0.5': '0.125rem',
  '1': '0.25rem',
  '1.5': '0.375rem',
  '2': '0.5rem',
  '2.5': '0.625rem',
  '3': '0.75rem',
  '3.5': '0.875rem',
  '4': '1rem',
  '5': '1.25rem',
  '6': '1.5rem',
  '7': '1.75rem',
  '8': '2rem',
  '9': '2.25rem',
  '10': '2.5rem',
  '11': '2.75rem',
  '12': '3rem'
}

const computedStyle = computed(() => {
  const s = {}
  const cn = props.className || ''
  // pl-{n}
  const m = cn.match(/(?:^|\s)pl-([0-9]+(?:\.[0-9]+)?)\b/)
  if (m) {
    const key = m[1]
    s.paddingLeft = spacingMap[key] || (Number(key) ? `${key}rem` : undefined)
  }
  // pr-{n}
  const m2 = cn.match(/(?:^|\s)pr-([0-9]+(?:\.[0-9]+)?)\b/)
  if (m2) {
    const key = m2[1]
    s.paddingRight = spacingMap[key] || (Number(key) ? `${key}rem` : undefined)
  }
  // px-{n} -> both
  const m3 = cn.match(/(?:^|\s)px-([0-9]+(?:\.[0-9]+)?)\b/)
  if (m3) {
    const key = m3[1]
    const val = spacingMap[key] || (Number(key) ? `${key}rem` : undefined)
    if (val) {
      s.paddingLeft = val
      s.paddingRight = val
    }
  }

  return s
})
</script>
