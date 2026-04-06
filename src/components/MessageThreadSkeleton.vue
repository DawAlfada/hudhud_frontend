<script setup>
import LoadingSpinner from './LoadingSpinner.vue'

defineProps({
  label: { type: String, default: 'Loading messages…' },
  /** Number of placeholder bubbles */
  count: { type: Number, default: 5 },
})

const bubble =
  'rounded-2xl border border-white/60 bg-white/70 p-4 ring-1 ring-zinc-900/[0.04] backdrop-blur-sm dark:border-white/[0.06] dark:bg-zinc-900/40 dark:ring-white/[0.04]'

const bar = 'rounded-md bg-zinc-200/75 motion-safe:animate-pulse dark:bg-white/[0.08]'
const barDim = 'rounded-md bg-zinc-200/55 motion-safe:animate-pulse dark:bg-white/[0.06]'
</script>

<template>
  <div class="flex flex-col gap-4">
    <div
      class="flex items-center gap-3 rounded-2xl border border-zinc-200/70 bg-zinc-50/80 px-4 py-3 dark:border-white/[0.08] dark:bg-white/[0.03]"
    >
      <LoadingSpinner size="sm" :announce="false" />
      <span class="text-sm font-semibold text-zinc-600 dark:text-zinc-400">{{ label }}</span>
    </div>
    <ul class="m-0 flex list-none flex-col gap-3 p-0">
      <li v-for="n in count" :key="n" :class="bubble">
        <div class="mb-3 flex flex-wrap gap-2">
          <div :class="['h-3 w-28', bar]" />
          <div :class="['h-3 w-20', barDim]" />
          <div :class="['h-5 w-14 rounded-full', barDim]" />
        </div>
        <div class="space-y-2.5">
          <div :class="['h-3.5 w-full', bar]" />
          <div :class="['h-3.5 w-[92%]', barDim]" />
          <div :class="['h-3.5 w-[60%]', bar]" />
        </div>
      </li>
    </ul>
  </div>
</template>
