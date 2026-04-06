<script setup>
import { onMounted, onUnmounted } from 'vue'
import { appToasts, dismissToast } from '../utils/alerts'

const toastShadow =
  'shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08),0_2px_8px_-2px_rgba(0,0,0,0.05)]'

const shell = {
  error:
    'border-orange-200/90 bg-[#fff4ed] dark:border-orange-500/25 dark:bg-orange-950/35',
  success:
    'border-emerald-200/90 bg-emerald-50 dark:border-emerald-500/25 dark:bg-emerald-950/35',
  info: 'border-sky-200/90 bg-sky-50 dark:border-sky-500/25 dark:bg-sky-950/40',
}

const titleC = {
  error: 'text-orange-950 dark:text-orange-100',
  success: 'text-emerald-950 dark:text-emerald-100',
  info: 'text-sky-950 dark:text-sky-100',
}

const descC = {
  error: 'text-orange-900/85 dark:text-orange-200/90',
  success: 'text-emerald-900/85 dark:text-emerald-200/90',
  info: 'text-sky-900/85 dark:text-sky-200/90',
}

const closeC = {
  error:
    'text-orange-900/50 hover:bg-orange-900/10 hover:text-orange-900 dark:text-orange-200/50 dark:hover:bg-white/10 dark:hover:text-orange-100',
  success:
    'text-emerald-900/45 hover:bg-emerald-900/10 hover:text-emerald-900 dark:text-emerald-200/50 dark:hover:bg-white/10 dark:hover:text-emerald-100',
  info: 'text-sky-900/45 hover:bg-sky-900/10 hover:text-sky-900 dark:text-sky-200/50 dark:hover:bg-white/10 dark:hover:text-sky-100',
}

function onKeydown(e) {
  if (e.key === 'Escape' && appToasts.value.length) {
    e.preventDefault()
    const last = appToasts.value[appToasts.value.length - 1]
    dismissToast(last.id)
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <div
      class="pointer-events-none fixed right-0 top-0 z-[300] flex flex-col items-end p-4 sm:p-5"
      aria-live="polite"
      aria-relevant="additions removals"
    >
      <TransitionGroup
        tag="div"
        class="pointer-events-auto flex w-[min(28rem,calc(100vw-2rem))] flex-col gap-3"
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="translate-x-4 translate-y-0 opacity-0"
        enter-to-class="translate-x-0 translate-y-0 opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="translate-x-2 opacity-0"
        move-class="transition duration-300 ease-out"
      >
        <article
          v-for="t in appToasts"
          :key="t.id"
          :class="['relative flex gap-4 rounded-xl border px-4 py-4 pr-11 sm:px-5 sm:py-4', toastShadow, shell[t.variant]]"
          role="alert"
        >
          <!-- Info: solid blue circle + i -->
          <div
            v-if="t.variant === 'info'"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-600 shadow-sm"
            aria-hidden="true"
          >
            <Icon icon="heroicons:information-circle-solid" class="h-6 w-6 text-white" />
          </div>

          <div
            v-else-if="t.variant === 'success'"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 shadow-sm"
            aria-hidden="true"
          >
            <Icon icon="heroicons:check" class="h-6 w-6 text-white" />
          </div>

          <div v-else class="flex h-10 w-10 shrink-0 items-center justify-center" aria-hidden="true">
            <Icon icon="heroicons:exclamation-triangle-solid" class="h-10 w-10 text-secondary drop-shadow-sm" />
          </div>

          <div class="min-w-0 flex-1 pt-0.5">
            <h2 :class="['text-[0.9375rem] font-bold leading-snug tracking-tight', titleC[t.variant]]">
              {{ t.title }}
            </h2>
            <p :class="['mt-0.5 whitespace-pre-wrap text-sm leading-relaxed', descC[t.variant]]">
              {{ t.message }}
            </p>
          </div>

          <button
            type="button"
            :class="[
              'absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
              closeC[t.variant],
            ]"
            :aria-label="`Dismiss ${t.title}`"
            @click="dismissToast(t.id)"
          >
            <Icon icon="heroicons:x-mark" class="h-4 w-4" aria-hidden="true" />
          </button>
        </article>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
