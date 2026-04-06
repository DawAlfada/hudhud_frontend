<script setup>
import { computed } from 'vue'

const props = defineProps({
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v),
  },
  /** When false, hide from assistive tech (use when a visible label already describes the state). */
  announce: { type: Boolean, default: true },
  /** `on-primary` — white ring for use on orange buttons */
  tone: {
    type: String,
    default: 'default',
    validator: (v) => v === 'default' || v === 'on-primary',
  },
})

const wrap = {
  sm: 'h-7 w-7',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
}
const ring = {
  sm: 'border-2',
  md: 'border-2',
  lg: 'border-[3px]',
}

const ringColors = computed(() =>
  props.tone === 'on-primary'
    ? 'border-white/35 border-t-white'
    : 'border-primary/20 border-t-primary',
)
</script>

<template>
  <span
    class="inline-flex shrink-0"
    :role="announce ? 'status' : undefined"
    :aria-live="announce ? 'polite' : undefined"
    :aria-label="announce ? 'Loading' : undefined"
    :aria-hidden="announce ? undefined : 'true'"
  >
    <span
      :class="[
        'rounded-full motion-safe:animate-spin',
        ringColors,
        wrap[size],
        ring[size],
      ]"
    />
  </span>
</template>
