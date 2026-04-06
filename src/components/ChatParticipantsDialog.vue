<script setup>
import { ref, watch, computed, onUnmounted } from 'vue'
import { fetchAdminChatParticipants } from '../api/chats'
import { alertError } from '../utils/alerts'
import { getUserProfileImageUrl } from '../utils/userProfile'
import UserAvatar from './UserAvatar.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  /** @type {import('vue').PropType<string | null>} */
  chatId: { type: String, default: null },
  subtitle: { type: String, default: '' },
})

const emit = defineEmits(['close'])

const loading = ref(false)
const err = ref('')
const includeRemoved = ref(false)
/** @type {import('vue').Ref<{ key: string; participantId: unknown; name: unknown; phoneNumber: unknown; role: unknown; isAdmin: unknown }[]>} */
const rows = ref([])

const showAdminColumn = computed(() =>
  rows.value.some((r) => r.isAdmin === true || r.isAdmin === false),
)

const backdrop =
  'fixed inset-0 z-[380] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm sm:p-5'

const panel =
  'flex max-h-[min(90vh,640px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-[#2c3038] shadow-2xl ring-1 ring-inset ring-white/[0.04]'

function normalizeRows(data) {
  const raw = data?.result ?? data?.participants ?? data
  const list = Array.isArray(raw) ? raw : []
  return list.map((item, i) => {
    const row = /** @type {Record<string, unknown>} */ (item)
    const p = /** @type {Record<string, unknown> | null} */ (
      row.participant && typeof row.participant === 'object' ? row.participant : null
    )
    const u =
      row.user && typeof row.user === 'object' ? /** @type {Record<string, unknown>} */ (row.user) : null
    const base = p || u || row
    const imageUrl =
      getUserProfileImageUrl(base) ||
      getUserProfileImageUrl(row) ||
      (p ? getUserProfileImageUrl(p) : '') ||
      (u ? getUserProfileImageUrl(u) : '')
    return {
      key: String(row.id ?? row.participantId ?? base.id ?? i),
      participantId: row.participantId ?? base.id ?? row.userId ?? '—',
      name: base.name ?? row.name ?? '—',
      phoneNumber: base.phoneNumber ?? row.phoneNumber ?? '—',
      role: base.role ?? row.role ?? row.participantRole ?? '—',
      isAdmin: row.isAdmin ?? row.isGroupAdmin ?? row.groupAdmin,
      imageUrl,
    }
  })
}

async function loadParticipants() {
  if (!props.chatId) return
  err.value = ''
  loading.value = true
  rows.value = []
  try {
    const data = await fetchAdminChatParticipants(props.chatId, {
      includeRemoved: includeRemoved.value,
    })
    rows.value = normalizeRows(data)
  } catch (e) {
    err.value = e.message
    alertError(e)
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.open, props.chatId],
  ([isOpen, id]) => {
    if (isOpen && id) loadParticipants()
    if (!isOpen) {
      rows.value = []
      err.value = ''
      includeRemoved.value = false
    }
  },
)

function onBackdropDown(e) {
  if (e.target === e.currentTarget) emit('close')
}

function onKeydown(e) {
  if (props.open && e.key === 'Escape') {
    e.preventDefault()
    emit('close')
  }
}

watch(
  () => props.open,
  (open) => {
    if (typeof document === 'undefined') return
    document.body.style.overflow = open ? 'hidden' : ''
    if (open) document.addEventListener('keydown', onKeydown)
    else document.removeEventListener('keydown', onKeydown)
  },
)

onUnmounted(() => {
  document.body.style.overflow = ''
  document.removeEventListener('keydown', onKeydown)
})

const th =
  'px-4 py-3 text-left text-[0.65rem] font-bold uppercase tracking-wider text-zinc-400'
const td = 'px-4 py-2.5 text-sm text-gray-100'
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
        v-if="open && chatId"
        :class="backdrop"
        role="presentation"
        @mousedown="onBackdropDown"
      >
        <div
          :class="panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="chat-participants-title"
          @mousedown.stop
        >
          <div class="flex shrink-0 items-start justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
            <div class="min-w-0">
              <h2 id="chat-participants-title" class="text-lg font-bold text-white">
                Participants
              </h2>
              <p v-if="subtitle" class="mt-0.5 text-sm text-gray-300">{{ subtitle }}</p>
              <label class="mt-3 flex cursor-pointer items-center gap-2 text-sm text-gray-400">
                <input
                  v-model="includeRemoved"
                  type="checkbox"
                  class="rounded border-white/20 bg-white/10 text-primary focus:ring-primary/40"
                  @change="loadParticipants()"
                />
                <span>Include removed participants (audit)</span>
              </label>
            </div>
            <button
              type="button"
              class="shrink-0 rounded-xl p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
              aria-label="Close"
              @click="emit('close')"
            >
              <Icon icon="heroicons:x-mark" class="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
            <p
              v-if="err && !loading"
              class="mb-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
            >
              {{ err }}
            </p>
            <p v-if="loading" class="px-2 py-8 text-center text-sm text-gray-400">Loading participants…</p>
            <div v-else-if="!rows.length && !err" class="px-2 py-8 text-center text-sm text-gray-400">
              No participants returned.
            </div>
            <div v-else class="overflow-x-auto rounded-xl border border-white/[0.06]">
              <table class="w-full min-w-[560px] border-collapse text-left">
                <thead>
                  <tr class="border-b border-white/[0.06] bg-white/[0.04]">
                    <th :class="[th, 'w-[1%]']" scope="col">
                      <span class="sr-only">Photo</span>
                    </th>
                    <th :class="th" scope="col">Name</th>
                    <th :class="th" scope="col">Phone</th>
                    <th :class="th" scope="col">Role</th>
                    <th v-if="showAdminColumn" :class="th" scope="col">Admin</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-white/[0.06]">
                  <tr v-for="r in rows" :key="r.key" class="hover:bg-white/[0.03]">
                    <td :class="[td, 'py-2 align-middle']">
                      <UserAvatar size="sm" :image-url="r.imageUrl" :name="String(r.name)" />
                    </td>
                    <td :class="td">{{ r.name }}</td>
                    <td :class="[td, 'font-mono text-xs']">{{ r.phoneNumber }}</td>
                    <td :class="td">{{ r.role }}</td>
                    <td v-if="showAdminColumn" :class="td">
                      <span v-if="r.isAdmin === true" class="text-emerald-300">Yes</span>
                      <span v-else-if="r.isAdmin === false" class="text-gray-500">No</span>
                      <span v-else class="text-gray-500">—</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="shrink-0 border-t border-white/[0.06] px-5 py-3">
            <button
              type="button"
              class="w-full rounded-[10px] border border-white/25 bg-[#363a44] px-4 py-2.5 text-sm font-medium text-gray-100 transition hover:bg-[#3d424d] sm:w-auto"
              @click="emit('close')"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
