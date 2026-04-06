<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { fetchAdminGroupChats } from '../api/chats'
import { alertError } from '../utils/alerts'
import DataTableSkeleton from '../components/DataTableSkeleton.vue'
import ChatParticipantsDialog from '../components/ChatParticipantsDialog.vue'

const router = useRouter()
const rows = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const loading = ref(false)
const err = ref('')
const nameFilter = ref('')
const participantsOpen = ref(false)
const participantsChatId = ref(/** @type {string | null} */ (null))
const participantsSubtitle = ref('')

function participantNames(chat) {
  const parts = chat.participants || []
  return parts
    .map((p) => p.participant?.name || p.participantId)
    .filter(Boolean)
    .join(' · ')
}

function displayGroupTitle(chat) {
  const n = (chat.name || '').trim()
  if (n) return n
  return 'Untitled group'
}

function memberCount(chat) {
  return chat.participantCount ?? (chat.participants?.length ?? 0)
}

function totalPages() {
  return Math.max(1, Math.ceil(total.value / pageSize.value))
}

async function load() {
  err.value = ''
  loading.value = true
  try {
    const data = await fetchAdminGroupChats({
      page: page.value,
      pageSize: pageSize.value,
      name: nameFilter.value.trim() || undefined,
    })
    rows.value = data.result ?? []
    total.value = data.total ?? 0
  } catch (e) {
    err.value = e.message
    alertError(e)
    rows.value = []
  } finally {
    loading.value = false
  }
}

function applySearch() {
  page.value = 1
  load()
}

function openChat(chat) {
  try {
    sessionStorage.setItem(`hudhud_chat:${chat.id}`, JSON.stringify(chat))
  } catch {
    /* ignore */
  }
  router.push({ name: 'chat-messages', params: { chatId: chat.id } })
}

function openParticipants(chat) {
  participantsChatId.value = chat.id
  participantsSubtitle.value = [displayGroupTitle(chat), participantNames(chat)].filter(Boolean).join(' · ')
  participantsOpen.value = true
}

function closeParticipants() {
  participantsOpen.value = false
  participantsChatId.value = null
  participantsSubtitle.value = ''
}

onMounted(load)

const toolbarInput =
  'min-w-[10rem] flex-1 rounded-2xl border border-zinc-200/80 bg-white/80 px-4 py-2.5 text-sm text-zinc-900 shadow-sm outline-none backdrop-blur-sm placeholder:text-zinc-400 focus:border-primary focus:ring-2 focus:ring-primary/25 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-primary'

const participantsBtn =
  'inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200/80 bg-white text-zinc-600 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300 dark:hover:bg-zinc-800'

const openChatBtn =
  'inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-primary/25 transition hover:bg-secondary hover:shadow-secondary/25 active:scale-[0.97]'
</script>

<template>
  <div class="w-full" :aria-busy="loading">
    <header class="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="mb-0 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Group chats</h1>
        <p class="mt-1.5 max-w-xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">All group conversations.</p>
      </div>
    </header>

    <div class="mb-5 flex gap-2">
      <input
        v-model="nameFilter"
        type="search"
        placeholder="Search by group name or member…"
        :class="toolbarInput"
        @keyup.enter="applySearch()"
      />
      <button
        type="button"
        class="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-secondary px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-secondary/25 transition hover:bg-primary active:scale-[0.98]"
        title="Search"
        aria-label="Search group chats"
        @click="applySearch()"
      >
        <Icon icon="heroicons:magnifying-glass" class="h-4 w-4" aria-hidden="true" />
      </button>
    </div>

    <p
      v-if="err"
      class="mb-4 rounded-2xl border border-red-200/60 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:text-red-400"
    >
      {{ err }}
    </p>
    <DataTableSkeleton v-if="loading" label="Loading group chats…" variant="groups" />

    <div
      v-else
      class="overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-xl shadow-zinc-900/[0.03] ring-1 ring-zinc-900/[0.04] backdrop-blur-md dark:border-white/[0.06] dark:bg-zinc-900/45 dark:shadow-none dark:ring-white/[0.04]"
    >
      <div class="overflow-x-auto">
        <table class="w-full min-w-[620px] border-collapse text-left text-sm">
          <thead>
            <tr class="border-b border-zinc-200/80 dark:border-white/[0.06]">
              <th scope="col" class="px-5 py-4 text-left text-[0.7rem] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                Group
              </th>
              <th scope="col" class="min-w-[14rem] px-5 py-4 text-left text-[0.7rem] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                Members
              </th>
              <th scope="col" class="w-[1%] whitespace-nowrap px-5 py-4 text-right">
                <span class="sr-only">Participants and open chat</span>
                <span class="inline-flex justify-end text-zinc-300 dark:text-zinc-600" aria-hidden="true">
                  <Icon icon="heroicons:chat-bubble-oval-left-ellipsis" class="h-4 w-4" />
                </span>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-100 dark:divide-white/[0.06]">
            <tr v-if="rows.length === 0">
              <td colspan="3" class="px-5 py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">
                No group chats on this page.
              </td>
            </tr>
            <tr
              v-for="c in rows"
              :key="c.id"
              class="bg-white/50 transition-colors hover:bg-primary/[0.06] dark:bg-transparent dark:hover:bg-white/[0.03]"
            >
              <td class="px-5 py-4 align-top">
                <div class="font-semibold text-zinc-900 dark:text-white">{{ displayGroupTitle(c) }}</div>
              </td>
              <td class="max-w-md px-5 py-4 align-top">
                <div class="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  {{ memberCount(c) }} members
                </div>
                <span class="line-clamp-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300" :title="participantNames(c)">
                  {{ participantNames(c) || '—' }}
                </span>
              </td>
              <td class="whitespace-nowrap px-5 py-3 text-right align-top">
                <div class="inline-flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    :class="participantsBtn"
                    title="View participants"
                    aria-label="View participants"
                    @click="openParticipants(c)"
                  >
                    <Icon icon="heroicons:users" class="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    :class="openChatBtn"
                    title="Open messages"
                    aria-label="Open messages"
                    @click="openChat(c)"
                  >
                    <Icon icon="heroicons:chat-bubble-oval-left-ellipsis" class="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <footer class="mt-8 flex flex-wrap items-center justify-center gap-3" :class="loading && 'pointer-events-none opacity-45'">
      <button
        type="button"
        class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200/80 bg-white text-zinc-600 shadow-sm transition hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300 dark:hover:bg-zinc-800"
        title="Previous page"
        aria-label="Previous page"
        :disabled="loading || page <= 1"
        @click="page--; load()"
      >
        <Icon icon="heroicons:chevron-left" class="h-5 w-5" aria-hidden="true" />
      </button>
      <span class="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-zinc-600 shadow-sm ring-1 ring-zinc-900/5 dark:bg-zinc-800/50 dark:text-zinc-300 dark:ring-white/10">
        {{ page }} / {{ totalPages() }}
        <span class="mx-2 text-zinc-300 dark:text-zinc-600">·</span>
        {{ total }} groups
      </span>
      <button
        type="button"
        class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200/80 bg-white text-zinc-600 shadow-sm transition hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300 dark:hover:bg-zinc-800"
        title="Next page"
        aria-label="Next page"
        :disabled="loading || page >= totalPages()"
        @click="page++; load()"
      >
        <Icon icon="heroicons:chevron-right" class="h-5 w-5" aria-hidden="true" />
      </button>
    </footer>

    <ChatParticipantsDialog
      :open="participantsOpen"
      :chat-id="participantsChatId"
      :subtitle="participantsSubtitle"
      @close="closeParticipants"
    />
  </div>
</template>
