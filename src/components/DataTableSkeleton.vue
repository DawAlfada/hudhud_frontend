<script setup>
import LoadingSpinner from './LoadingSpinner.vue'

defineProps({
  /** Shown next to the spinner in the status strip */
  label: { type: String, required: true },
  /** `users` | `chats` | `groups` */
  variant: { type: String, default: 'users' },
  /** Skeleton body rows */
  rows: { type: Number, default: 7 },
})

const card =
  'overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-xl shadow-zinc-900/[0.03] ring-1 ring-zinc-900/[0.04] backdrop-blur-md dark:border-white/[0.06] dark:bg-zinc-900/45 dark:shadow-none dark:ring-white/[0.04]'

const bar = 'rounded-md bg-zinc-200/75 motion-safe:animate-pulse dark:bg-white/[0.08]'
const barSlow = 'rounded-md bg-zinc-200/60 motion-safe:animate-pulse dark:bg-white/[0.06]'
</script>

<template>
  <div :class="card">
    <div
      class="flex items-center gap-3 border-b border-zinc-200/80 bg-zinc-50/60 px-5 py-3.5 dark:border-white/[0.06] dark:bg-white/[0.02]"
    >
      <LoadingSpinner size="sm" :announce="false" />
      <span class="text-sm font-semibold text-zinc-600 dark:text-zinc-400">{{ label }}</span>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead>
          <tr class="border-b border-zinc-200/80 dark:border-white/[0.06]">
            <template v-if="variant === 'users'">
              <th
                scope="col"
                class="px-5 py-4 text-left text-[0.7rem] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500"
              >
                Name
              </th>
              <th
                scope="col"
                class="px-5 py-4 text-left text-[0.7rem] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500"
              >
                Phone
              </th>
              <th
                scope="col"
                class="px-5 py-4 text-left text-[0.7rem] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500"
              >
                Role
              </th>
              <th scope="col" class="w-[1%] px-5 py-4 text-right">
                <span class="sr-only">Actions</span>
              </th>
            </template>
            <template v-else-if="variant === 'groups'">
              <th
                scope="col"
                class="px-5 py-4 text-left text-[0.7rem] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500"
              >
                Group
              </th>
              <th
                scope="col"
                class="min-w-[14rem] px-5 py-4 text-left text-[0.7rem] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500"
              >
                Members
              </th>
              <th scope="col" class="w-[1%] px-5 py-4 text-right">
                <span class="sr-only">Open</span>
              </th>
            </template>
            <template v-else>
              <th
                scope="col"
                class="px-5 py-4 text-left text-[0.7rem] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500"
              >
                Participants
              </th>
              <th scope="col" class="w-[1%] px-5 py-4 text-right">
                <span class="sr-only">Open</span>
              </th>
            </template>
          </tr>
        </thead>
        <tbody class="divide-y divide-zinc-100 dark:divide-white/[0.06]">
          <tr v-for="n in rows" :key="n" class="bg-white/40 dark:bg-transparent">
            <template v-if="variant === 'users'">
              <td class="px-5 py-4">
                <div class="flex items-center gap-3">
                  <div :class="['h-9 w-9 shrink-0 rounded-full', bar]" />
                  <div :class="['h-4 w-[min(12rem,42%)]', bar]" />
                </div>
              </td>
              <td class="px-5 py-4">
                <div :class="['h-4 w-28', barSlow]" />
              </td>
              <td class="px-5 py-4">
                <div :class="['h-6 w-16 rounded-full', bar]" />
              </td>
              <td class="px-5 py-3 text-right">
                <div :class="['ml-auto h-9 w-24 rounded-xl', barSlow]" />
              </td>
            </template>
            <template v-else-if="variant === 'groups'">
              <td class="px-5 py-4 align-top">
                <div :class="['h-4 w-40', bar]" />
                <div :class="['mt-2 h-3 w-28', barSlow]" />
              </td>
              <td class="px-5 py-4 align-top">
                <div :class="['h-3 w-20', bar]" />
                <div :class="['mt-2 h-3 w-full max-w-xs', barSlow]" />
              </td>
              <td class="px-5 py-3 text-right align-top">
                <div :class="['ml-auto h-9 w-[5.25rem] rounded-xl', bar]" />
              </td>
            </template>
            <template v-else>
              <td class="px-5 py-4 align-top">
                <div :class="['h-4 w-[min(20rem,55%)]', bar]" />
              </td>
              <td class="px-5 py-3 text-right align-top">
                <div :class="['ml-auto h-9 w-[5.25rem] rounded-xl', bar]" />
              </td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
