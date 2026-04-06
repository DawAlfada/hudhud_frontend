<script setup>
import { watch, onMounted, onUnmounted, nextTick, ref } from 'vue'
import {
  confirmOpen,
  confirmTitle,
  confirmMessage,
  confirmConfirmLabel,
  confirmCancelLabel,
  confirmVariant,
  confirmDialogAccept,
  confirmDialogDismiss,
} from '../utils/appConfirm'

const backdrop =
  'fixed inset-0 z-[400] flex items-center justify-center bg-black/55 p-5 backdrop-blur-sm'

const panel =
  'w-full max-w-[420px] rounded-2xl border border-white/[0.06] bg-[#2c3038] p-6 shadow-2xl ring-1 ring-inset ring-white/[0.04]'

const btnCancel =
  'rounded-[10px] border border-white/25 bg-[#363a44] px-4 py-2.5 text-sm font-medium text-gray-100 transition hover:bg-[#3d424d] hover:border-white/[0.28] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25'

const btnConfirmDefault =
  'rounded-[10px] border border-transparent bg-[#9ca8dc] px-4 py-2.5 text-sm font-semibold text-[#1a1d23] transition hover:bg-[#aab4e3] active:bg-[#8f9bd2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9ca8dc]/40'

const btnConfirmDanger =
  'rounded-[10px] border border-transparent bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 active:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50'

const cancelBtnRef = ref(null)

function onBackdropMouseDown(e) {
  if (e.target === e.currentTarget) confirmDialogDismiss()
}

function onKeydown(e) {
  if (!confirmOpen.value) return
  if (e.key === 'Escape') {
    e.preventDefault()
    confirmDialogDismiss()
  }
}

watch(confirmOpen, (open) => {
  if (typeof document === 'undefined') return
  if (open) {
    document.body.style.overflow = 'hidden'
    nextTick(() => cancelBtnRef.value?.focus())
  } else {
    document.body.style.overflow = ''
  }
})

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="confirmOpen"
        :class="backdrop"
        role="presentation"
        @mousedown="onBackdropMouseDown"
      >
        <div
          :class="[panel, 'motion-safe:transition motion-safe:duration-200 motion-safe:ease-out']"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="app-confirm-title"
          aria-describedby="app-confirm-desc"
          @mousedown.stop
        >
          <h2 id="app-confirm-title" class="text-base font-bold text-white">
            {{ confirmTitle }}
          </h2>
          <p id="app-confirm-desc" class="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-200">
            {{ confirmMessage }}
          </p>
          <div class="mt-6 flex flex-wrap items-center justify-end gap-3">
            <button type="button" ref="cancelBtnRef" :class="btnCancel" @click="confirmDialogDismiss">
              {{ confirmCancelLabel }}
            </button>
            <button
              type="button"
              :class="confirmVariant === 'danger' ? btnConfirmDanger : btnConfirmDefault"
              @click="confirmDialogAccept"
            >
              {{ confirmConfirmLabel }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
