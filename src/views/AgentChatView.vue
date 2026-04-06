<script setup>
import { ref, watch, nextTick } from 'vue'
import { sendAgentChatMessage } from '../api/agent'
import { alertError } from '../utils/alerts'
import MarkdownBlock from '../components/MarkdownBlock.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'

/** @typedef {{ id: string; role: 'user' | 'assistant'; text: string; pending?: boolean }} ChatRow */

const input = ref('')
const messages = ref(/** @type {ChatRow[]} */ ([]))
const sending = ref(false)
/** @type {import('vue').Ref<AbortController | null>} */
const abortRef = ref(null)
/** @type {import('vue').Ref<HTMLElement | null>} */
const scrollEl = ref(null)

function uid() {
  return globalThis.crypto?.randomUUID?.() ?? `m-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function scrollToBottom() {
  const el = scrollEl.value
  if (!el) return
  el.scrollTop = el.scrollHeight
}

watch(
  messages,
  async () => {
    await nextTick()
    scrollToBottom()
  },
  { deep: true },
)

async function send() {
  const text = input.value.trim()
  if (!text || sending.value) return

  input.value = ''
  const userRow = { id: uid(), role: /** @type {const} */ ('user'), text }
  const asstId = uid()
  const asstRow = { id: asstId, role: /** @type {const} */ ('assistant'), text: '', pending: true }

  messages.value = [...messages.value, userRow, asstRow]
  sending.value = true

  const ac = new AbortController()
  abortRef.value = ac

  try {
    const markdown = await sendAgentChatMessage(text, { signal: ac.signal })
    const i = messages.value.findIndex((r) => r.id === asstId)
    if (i !== -1) {
      const next = messages.value.slice()
      next[i] = { ...next[i], text: markdown, pending: false }
      messages.value = next
    }
  } catch (e) {
    const err = /** @type {Error & { name?: string }} */ (e)
    const next = messages.value.filter((m) => m.id !== asstId)
    messages.value = next
    if (err?.name !== 'AbortError') alertError(err)
  } finally {
    sending.value = false
    abortRef.value = null
    await nextTick()
    scrollToBottom()
  }
}

function stop() {
  abortRef.value?.abort()
}

function newChat() {
  stop()
  messages.value = []
  input.value = ''
  sending.value = false
}

/**
 * @param {KeyboardEvent} e
 */
function onKeydown(e) {
  if (e.key !== 'Enter' || e.shiftKey) return
  e.preventDefault()
  send()
}

const shell = 'flex h-[min(100dvh,900px)] min-h-[480px] flex-col rounded-3xl border border-zinc-200/80 bg-white shadow-xl shadow-zinc-900/5 dark:border-white/[0.08] dark:bg-zinc-900/40 dark:shadow-none md:h-[calc(100dvh-7.5rem)]'
const userBubble =
  'max-w-[min(100%,36rem)] rounded-3xl rounded-br-md bg-zinc-200/90 px-4 py-3 text-[0.9375rem] leading-relaxed text-zinc-900 dark:bg-zinc-700/90 dark:text-zinc-50'
</script>

<template>
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-4">
    <header class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Agent</h1>
        <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Send text; replies are rendered as markdown.</p>
      </div>
      <button
        type="button"
        class="rounded-2xl border border-zinc-200/80 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-200 dark:hover:bg-zinc-800"
        :disabled="sending && messages.length === 0"
        @click="newChat"
      >
        New chat
      </button>
    </header>

    <div :class="shell" aria-label="Conversation">
      <div
        ref="scrollEl"
        class="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-6 sm:px-6"
        role="log"
        aria-live="polite"
      >
        <div
          v-if="!messages.length"
          class="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 px-4 text-center"
        >
          <span
            class="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-2xl font-bold text-primary"
            aria-hidden="true"
          >
            AI
          </span>
          <p class="text-lg font-semibold text-zinc-800 dark:text-zinc-100">How can I help you today?</p>
          <p class="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
            Send a message below. The assistant replies with markdown (headings, lists, code blocks, links).
          </p>
        </div>

        <template v-for="m in messages" :key="m.id">
          <div v-if="m.role === 'user'" class="flex justify-end">
            <div :class="userBubble">
              <p class="whitespace-pre-wrap">{{ m.text }}</p>
            </div>
          </div>
          <div v-else class="flex justify-start">
            <div class="w-full min-w-0 max-w-none">
              <div class="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                <span>Assistant</span>
              </div>
              <div v-if="m.pending" class="flex items-center gap-2 py-2 text-zinc-500 dark:text-zinc-400">
                <LoadingSpinner size="sm" :announce="false" />
                <span class="text-sm">Thinking…</span>
              </div>
              <div v-else class="text-[0.9375rem] leading-relaxed text-zinc-800 dark:text-zinc-200">
                <MarkdownBlock :source="m.text" />
              </div>
            </div>
          </div>
        </template>
      </div>

      <form
        class="shrink-0 border-t border-zinc-200/80 bg-zinc-50/90 p-3 dark:border-white/[0.08] dark:bg-zinc-900/60 sm:p-4"
        @submit.prevent="send"
      >
        <div class="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label class="sr-only" for="agent-input">Message</label>
          <textarea
            id="agent-input"
            v-model="input"
            rows="2"
            :disabled="sending"
            placeholder="Message the agent…"
            class="min-h-[3rem] flex-1 resize-y rounded-2xl border border-zinc-200/80 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-primary"
            @keydown="onKeydown"
          />
          <div class="flex shrink-0 gap-2 sm:flex-col sm:justify-end">
            <button
              v-if="sending"
              type="button"
              class="h-11 rounded-2xl border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700/80"
              @click="stop"
            >
              Stop
            </button>
            <button
              type="submit"
              class="inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-semibold text-white shadow-md shadow-primary/25 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-45"
              :disabled="sending || !input.trim()"
            >
              Send
            </button>
          </div>
        </div>
        <p class="mt-2 text-center text-[0.7rem] text-zinc-400 dark:text-zinc-500">
          Enter to send · Shift+Enter for a new line
        </p>
      </form>
    </div>
  </div>
</template>
