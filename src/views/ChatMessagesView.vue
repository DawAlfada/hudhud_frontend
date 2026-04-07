<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { fetchAdminChatMessages } from '../api/messages'
import { fetchAttachmentUrl } from '../api/attachments'
import { alertError } from '../utils/alerts'
import MessageThreadSkeleton from '../components/MessageThreadSkeleton.vue'
import UserAvatar from '../components/UserAvatar.vue'

const props = defineProps({
  chatId: { type: String, required: true },
})

const router = useRouter()

const chat = ref(null)
const messages = ref([])
const page = ref(1)
const pageSize = ref(50)
const total = ref(0)
const loading = ref(false)
const err = ref('')
const sortOrder = ref('DESC')

/** @type {import('vue').Ref<Set<string>>} */
const brokenChatImages = ref(new Set())

/** Resolved GET /Attachment/url/{storageKey} → url (direct downloadUrl on attachment still wins). */
/** @type {import('vue').Ref<Map<string, string>>} */
const resolvedByStorageKey = ref(new Map())

function chatImageErrorKey(messageId, index) {
  return `${messageId}:${index}`
}

function onChatImageFailed(messageId, index) {
  const k = chatImageErrorKey(messageId, index)
  if (brokenChatImages.value.has(k)) return
  brokenChatImages.value = new Set([...brokenChatImages.value, k])
}

function isChatImageBroken(messageId, index) {
  return brokenChatImages.value.has(chatImageErrorKey(messageId, index))
}

const imageLoadErrorPhrase = "Couldn't load image"

const title = computed(() => {
  if (chat.value) {
    const parts = (chat.value.participants || [])
      .map((p) => p.participant?.name)
      .filter(Boolean)
    if (parts.length) return parts.join(' · ')
  }
  return 'Conversation'
})

function loadChatMeta() {
  try {
    const raw = sessionStorage.getItem(`hudhud_chat:${props.chatId}`)
    chat.value = raw ? JSON.parse(raw) : null
  } catch {
    chat.value = null
  }
}

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString()
}

/** @param {Record<string, unknown>} m */
function messageSenderForAvatar(m) {
  const s = m.sender
  if (s && typeof s === 'object') return s
  return {
    name: m.senderName,
    profileImageUrl: m.senderProfileImageUrl ?? m.senderImageUrl,
    profilePictureUrl: m.senderProfilePictureUrl,
    avatarUrl: m.senderAvatarUrl,
  }
}

function senderDisplayName(m) {
  return String(m.senderName || m.sender?.name || '')
}

/** @returns {'text' | 'image' | 'audio' | 'video' | 'file'} */
function normalizeMessageType(raw) {
  const t = (raw == null ? '' : String(raw)).trim().toLowerCase()
  if (!t || t === 'text' || t === 'message' || t === 'plain') return 'text'
  if (t.includes('image') || t === 'photo' || t === 'picture' || t === 'img') return 'image'
  if (t.includes('audio') || t === 'voice' || t === 'sound' || t === 'mp3' || t === 'm4a') return 'audio'
  if (t.includes('video') || t === 'mov' || t === 'mp4') return 'video'
  if (
    t.includes('file') ||
    t.includes('document') ||
    t === 'attachment' ||
    t.includes('pdf') ||
    t.includes('doc')
  )
    return 'file'
  return 'text'
}

function firstNonEmptyString(...vals) {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return ''
}

/** Direct URL on attachment row (presigned / CDN). */
/** @param {Record<string, unknown>} a */
function directUrlFromAttachment(a) {
  return firstNonEmptyString(
    a.downloadUrl,
    a.DownloadUrl,
    a.presignedUrl,
    a.PresignedUrl,
    a.url,
    a.Url,
    a.thumbnailUrl,
    a.ThumbnailUrl,
    a.cdnUrl,
    a.CdnUrl,
    a.mediaUrl,
    a.MediaUrl,
  )
}

/** Backend storage key when message only has a key — use fetchAttachmentUrl. */
/** @param {Record<string, unknown>} a */
function attachmentStorageKey(a) {
  const k =
    a.storageKey ??
    a.StorageKey ??
    a.storage_key ??
    a.fileStorageKey ??
    a.FileStorageKey ??
    a.attachmentStorageKey ??
    a.AttachmentStorageKey
  if (k == null) return ''
  const s = String(k).trim()
  return s
}

/** Original file name on attachment (camelCase or PascalCase from API). */
/** @param {Record<string, unknown>} a */
function attachmentFileName(a) {
  return firstNonEmptyString(
    typeof a.fileName === 'string' ? a.fileName : '',
    typeof a.FileName === 'string' ? a.FileName : '',
  )
}

/** Presigned CDN URLs used as-is; otherwise resolved URL from storageKey map. */
/** @param {Record<string, unknown>} a */
function urlFromAttachment(a) {
  const sk = attachmentStorageKey(a)
  if (sk) {
    const resolved = resolvedByStorageKey.value.get(sk)
    return resolved ? String(resolved) : ''
  }
  const direct = directUrlFromAttachment(a)
  return direct || ''
}

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp|heic|avif)(\?|#|$)/i
const VIDEO_EXT = /\.(mp4|webm|mov|m4v|mkv)(\?|#|$)/i
const AUDIO_EXT = /\.(mp3|m4a|aac|ogg|wav|opus|flac)(\?|#|$)/i

function mimeStartsWith(mime, prefix) {
  return typeof mime === 'string' && mime.toLowerCase().trim().startsWith(prefix)
}

/** @param {Record<string, unknown>} a */
function attachmentMime(a) {
  const t = a.type ?? a.Type
  return firstNonEmptyString(
    typeof a.fileType === 'string' ? a.fileType : '',
    typeof a.FileType === 'string' ? a.FileType : '',
    typeof a.contentType === 'string' ? a.contentType : '',
    typeof a.ContentType === 'string' ? a.ContentType : '',
    typeof a.mimeType === 'string' ? a.mimeType : '',
    typeof a.MimeType === 'string' ? a.MimeType : '',
    typeof a.contentTypeName === 'string' ? a.contentTypeName : '',
    typeof a.ContentTypeName === 'string' ? a.ContentTypeName : '',
    typeof t === 'string' && t.includes('/') ? t : '',
  )
}

/** @param {Record<string, unknown>} a */
function attachmentLooksImage(a) {
  if (mimeStartsWith(attachmentMime(a), 'image/')) return true
  const fn = attachmentFileName(a).toLowerCase()
  if (IMAGE_EXT.test(fn)) return true
  const u = urlFromAttachment(a)
  if (u && IMAGE_EXT.test(u)) return true
  return false
}

/** @param {Record<string, unknown>} a */
function attachmentLooksVideo(a) {
  if (mimeStartsWith(attachmentMime(a), 'video/')) return true
  const fn = attachmentFileName(a).toLowerCase()
  if (VIDEO_EXT.test(fn)) return true
  const u = urlFromAttachment(a)
  if (u && VIDEO_EXT.test(u)) return true
  return false
}

/** @param {Record<string, unknown>} a */
function attachmentLooksAudio(a) {
  if (mimeStartsWith(attachmentMime(a), 'audio/')) return true
  const fn = attachmentFileName(a).toLowerCase()
  if (AUDIO_EXT.test(fn)) return true
  const u = urlFromAttachment(a)
  if (u && AUDIO_EXT.test(u)) return true
  return false
}

/** @param {Record<string, unknown>} m */
function inferKindFromAttachments(m) {
  const list = m.attachments
  if (!Array.isArray(list) || !list.length) return null
  let img = 0
  let vid = 0
  let aud = 0
  let other = 0
  for (const raw of list) {
    const a = /** @type {Record<string, unknown>} */ (raw)
    if (attachmentLooksImage(a)) img++
    else if (attachmentLooksVideo(a)) vid++
    else if (attachmentLooksAudio(a)) aud++
    else other++
  }
  if (vid && !img && !aud) return 'video'
  if (aud && !img && !vid) return 'audio'
  if (img) return 'image'
  if (aud) return 'audio'
  if (vid) return 'video'
  if (other) return 'file'
  return null
}

/** @param {Record<string, unknown>} m */
function inferKindFromContentLines(m) {
  const c = m.content
  if (typeof c !== 'string') return null
  const lines = c
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (!lines.length) return null
  const allHttp = lines.every((l) => /^https?:\/\//i.test(l))
  if (allHttp && lines.every((l) => IMAGE_EXT.test(l))) return 'image'
  if (allHttp && lines.every((l) => VIDEO_EXT.test(l))) return 'video'
  if (allHttp && lines.every((l) => AUDIO_EXT.test(l))) return 'audio'
  if (lines.every((l) => !/^https?:\/\//i.test(l) && IMAGE_EXT.test(l))) return 'image'
  return null
}

/**
 * API often sends type "MEDIA" — infer image/audio/video/file from attachments (fileName, mime, URL).
 * @param {Record<string, unknown>} m
 */
function effectiveMessageKind(m) {
  const raw = String(m.type ?? '')
    .trim()
    .toLowerCase()
  if (raw === 'media' || raw === 'medias') {
    const fromAtt = inferKindFromAttachments(m)
    if (fromAtt) return fromAtt
    const fromLines = inferKindFromContentLines(m)
    if (fromLines) return fromLines
    return 'file'
  }
  let kind = normalizeMessageType(m.type)
  if (kind === 'text' && looksLikeVoiceOrAudioOnlyMessage(m)) return 'audio'
  return kind
}

/** When type normalizes to text but the only attachment is audio (unknown enum labels, etc.). */
/** @param {Record<string, unknown>} m */
function looksLikeVoiceOrAudioOnlyMessage(m) {
  const list = m.attachments
  if (!Array.isArray(list) || list.length !== 1) return false
  return attachmentLooksAudio(/** @type {Record<string, unknown>} */ (list[0]))
}

/** First attachment MIME for <source type> (helps Safari / m4a). */
/** @param {Record<string, unknown>} m */
function primaryAttachmentMime(m) {
  const list = m.attachments
  if (!Array.isArray(list) || !list[0]) return ''
  const mime = attachmentMime(/** @type {Record<string, unknown>} */ (list[0]))
  return typeof mime === 'string' && mime.includes('/') ? mime : ''
}

/** @param {Record<string, unknown>} o */
function extractUrlFromObject(o) {
  const p = o.path ?? o.Path
  const pathStr = typeof p === 'string' && /^https?:\/\//i.test(p) ? p : ''
  return firstNonEmptyString(
    o.downloadUrl,
    o.DownloadUrl,
    o.presignedUrl,
    o.PresignedUrl,
    o.url,
    o.Url,
    o.fileUrl,
    o.FileUrl,
    o.mediaUrl,
    o.MediaUrl,
    o.cdnUrl,
    o.CdnUrl,
    o.imageUrl,
    o.ImageUrl,
    o.src,
    o.Src,
    pathStr,
  )
}

/** @param {unknown} content */
function extractUrlFromContent(content) {
  if (content == null) return ''
  if (typeof content === 'string') {
    const s = content.trim()
    if (/^https?:\/\//i.test(s)) return s
    if (/^data:(image|audio|video)\//i.test(s)) return s
    if (s.startsWith('{') || s.startsWith('[')) {
      try {
        const parsed = JSON.parse(s)
        if (parsed && typeof parsed === 'object') return extractUrlFromObject(/** @type {Record<string, unknown>} */ (parsed))
      } catch {
        /* not JSON */
      }
    }
    return ''
  }
  if (typeof content === 'object' && content !== null) {
    return extractUrlFromObject(/** @type {Record<string, unknown>} */ (content))
  }
  return ''
}

/** @param {Record<string, unknown>} m */
function primaryAttachmentUrl(m) {
  const list = m.attachments
  if (!Array.isArray(list) || !list.length) return ''
  return urlFromAttachment(/** @type {Record<string, unknown>} */ (list[0]))
}

/** @param {Record<string, unknown>} m */
function attachmentMediaUrls(m) {
  const list = m.attachments
  if (!Array.isArray(list)) return []
  const urls = []
  for (const raw of list) {
    const u = urlFromAttachment(/** @type {Record<string, unknown>} */ (raw))
    if (u) urls.push(u)
  }
  return urls
}

/** Prefer attachment presigned URLs first (matches app). */
/** @param {Record<string, unknown>} m */
function messageMediaUrl(m) {
  const fromAtt = primaryAttachmentUrl(m)
  if (fromAtt) return fromAtt
  return extractUrlFromContent(m.content)
}

/** @param {Record<string, unknown>} m */
function imageUrlsForMessage(m) {
  const fromAtt = attachmentMediaUrls(m)
  if (fromAtt.length) return fromAtt
  const c = extractUrlFromContent(m.content)
  return c ? [c] : []
}

/** @param {Record<string, unknown>} m */
function imageGridState(m) {
  const urls = imageUrlsForMessage(m)
  const n = urls.length
  return {
    urls,
    n,
    gridCols: n === 1 ? 'grid-cols-1' : 'grid-cols-2',
    linkClass(idx) {
      const wideLast = n > 1 && idx === n - 1 && n % 2 === 1
      const base =
        'block min-w-0 overflow-hidden rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary'
      return wideLast ? `${base} col-span-2` : base
    },
    imgClass(idx) {
      if (n === 1) return 'max-h-72 w-full rounded-lg object-contain'
      if (n % 2 === 1 && idx === n - 1)
        return 'max-h-56 w-full rounded-lg object-cover sm:max-h-64'
      return 'aspect-square w-full rounded-lg object-cover sm:max-h-52'
    },
    altSuffix(idx) {
      return n > 1 ? ` ${idx + 1}` : ''
    },
  }
}

/** Matches HudHud_Be.Enums.MessageFlags ([Flags] bitmask). */
const MESSAGE_FLAG_FORWARDED = 1 << 0
const MESSAGE_FLAG_REPLAY = 1 << 1
const MESSAGE_FLAG_PINNED = 1 << 2
const MESSAGE_FLAG_ACTION = 1 << 3

const MESSAGE_FLAG_BITS = [
  { bit: MESSAGE_FLAG_FORWARDED, label: 'Forwarded' },
  { bit: MESSAGE_FLAG_REPLAY, label: 'Reply' },
  { bit: MESSAGE_FLAG_PINNED, label: 'Pinned' },
  { bit: MESSAGE_FLAG_ACTION, label: 'Action' },
]

/** @param {string} token */
function normalizeFlagTokenToLabel(token) {
  const key = token.trim().toUpperCase().replace(/\s+/g, '_')
  const aliases = {
    NONE: '',
    FORWARDED: 'Forwarded',
    REPLAY: 'Reply',
    REPLY: 'Reply',
    PINNED: 'Pinned',
    ACTION: 'Action',
  }
  if (key in aliases) return aliases[key]
  if (!token.trim()) return ''
  const t = token.trim()
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
}

/**
 * Human-readable flags for UI (omits NONE / 0).
 * @param {unknown} f — number bitmask, string name(s), or numeric string.
 * @returns {string[]}
 */
function messageFlagsForDisplay(f) {
  if (f == null || f === '') return []
  if (typeof f === 'number' && Number.isFinite(f)) {
    const n = Math.trunc(f)
    if (n === 0) return []
    /** @type {string[]} */
    const out = []
    for (const { bit, label } of MESSAGE_FLAG_BITS) {
      if (n & bit) out.push(label)
    }
    return out
  }
  if (typeof f === 'string') {
    const t = f.trim()
    if (!t || /^none$/i.test(t)) return []
    if (/^-?\d+$/.test(t)) return messageFlagsForDisplay(Number(t))
    return t
      .split(/[,|]/)
      .map((p) => normalizeFlagTokenToLabel(p))
      .filter(Boolean)
  }
  if (typeof f === 'object') {
    const fl = /** @type {Record<string, unknown>} */ (f)
    const v = fl.value ?? fl.Value ?? fl.flags ?? fl.Flags
    if (v != null && v !== f) return messageFlagsForDisplay(v)
  }
  return []
}

/** API may send flags as bitmask, string enum, e.g. "ACTION", "NONE", or combined. */
/** @param {unknown} f */
function flagsIndicateAction(f) {
  if (f == null) return false
  if (f === true) return true
  if (typeof f === 'number' && Number.isFinite(f)) {
    return (Math.trunc(f) & MESSAGE_FLAG_ACTION) !== 0
  }
  if (typeof f === 'string') {
    const t = f.trim().toLowerCase()
    if (!t || t === 'none' || t === 'null') return false
    if (/^-?\d+$/.test(t)) return (Number(t) & MESSAGE_FLAG_ACTION) !== 0
    return t.split(/[,|]/).some((part) => {
      const p = part.trim().toLowerCase()
      return p === 'action' || p === 'call' || p.endsWith('_action') || p.startsWith('action_')
    })
  }
  if (typeof f === 'object') {
    const fl = /** @type {Record<string, unknown>} */ (f)
    if (fl.action === true || fl.isAction === true || fl.call === true) return true
  }
  return false
}

/** Voice note or call row flagged as system / call action (not a standalone voice attachment). */
/** @param {Record<string, unknown>} m */
function messageIsAction(m) {
  if (m.isAction === true || m.isActionMessage === true) return true
  if (m.action === true) return true
  if (flagsIndicateAction(m.flags)) return true
  const t = m.type
  if (typeof t === 'string') {
    const tl = t.trim().toLowerCase()
    if (tl === 'action' || tl.endsWith('_action') || tl.startsWith('action_')) return true
  }
  if (typeof m.action === 'string' && ['call', 'voice_call', 'voicerecord'].includes(m.action.toLowerCase())) return true
  return false
}

const callBubbleClass =
  'inline-flex max-w-full items-center gap-2.5 rounded-full border border-zinc-300/80 bg-zinc-100/90 px-4 py-2.5 text-[0.92rem] font-medium text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-100'

const mediaReferrer = 'no-referrer'

/** @param {Record<string, unknown>} m */
function attachmentBaseName(m) {
  const list = m.attachments
  if (Array.isArray(list) && list[0]) {
    const a = /** @type {Record<string, unknown>} */ (list[0])
    const n = attachmentFileName(a)
    if (n) return n
  }
  const u = messageMediaUrl(m)
  if (u) {
    try {
      const path = new URL(u).pathname
      const seg = path.split('/').filter(Boolean).pop()
      if (seg) return decodeURIComponent(seg)
    } catch {
      /* relative or invalid */
    }
  }
  return 'Download file'
}

/**
 * @param {Record<string, unknown>} m
 * @returns {{ href: string; name: string }[]}
 */
function fileDownloadItems(m) {
  const list = m.attachments
  if (Array.isArray(list) && list.length) {
    return list
      .map((raw) => {
        const a = /** @type {Record<string, unknown>} */ (raw)
        const href = urlFromAttachment(a)
        const attName = attachmentFileName(a)
        const name =
          attName
            ? attName
            : typeof href === 'string'
              ? (() => {
                  try {
                    const seg = new URL(href).pathname.split('/').filter(Boolean).pop()
                    return seg ? decodeURIComponent(seg) : 'File'
                  } catch {
                    return 'File'
                  }
                })()
              : 'File'
        return href ? { href, name } : null
      })
      .filter(Boolean)
  }
  const u = messageMediaUrl(m)
  if (u) return [{ href: u, name: attachmentBaseName(m) }]
  return []
}

function displayTextContent(m) {
  if (m.isDeleted) return '[deleted]'
  const c = m.content
  if (c == null) return ''
  if (typeof c === 'object') return JSON.stringify(c)
  const s = String(c)
  const kind = effectiveMessageKind(m)
  if (kind === 'audio' && messageIsAction(m)) {
    const low = s.trim().toLowerCase()
    if (!low || low === 'audio' || low === 'voice') return ''
  }
  if (kind !== 'text' && /^https?:\/\//i.test(s.trim())) return ''
  if (kind === 'image' && Array.isArray(m.attachments) && m.attachments.length) {
    const names = new Set(
      m.attachments.map((a) => attachmentFileName(/** @type {Record<string, unknown>} */ (a)).toLowerCase()).filter(Boolean),
    )
    const lines = s
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
    if (lines.length && lines.every((line) => names.has(line.toLowerCase()))) return ''
  }
  if (s.length > 2000) return s.slice(0, 2000) + '…'
  return s
}

/**
 * Load signed URLs for attachments that only have storageKey (matches mobile getAttachmentUrl).
 * @param {unknown[]} msgs
 */
async function resolveAttachmentUrlsForMessages(msgs) {
  const keys = new Set()
  for (const m of msgs) {
    const row = /** @type {Record<string, unknown>} */ (m)
    const list = row.attachments
    if (!Array.isArray(list)) continue
    for (const raw of list) {
      const a = /** @type {Record<string, unknown>} */ (raw)
      const sk = attachmentStorageKey(a)
      if (sk) keys.add(sk)
    }
  }
  const pending = [...keys].filter((k) => !resolvedByStorageKey.value.has(k))
  if (!pending.length) return

  const results = await Promise.all(
    pending.map((k) =>
      fetchAttachmentUrl(k)
        .then((url) => /** @type {[string, string | null]} */ ([k, url]))
        .catch(() => /** @type {[string, string | null]} */ ([k, null])),
    ),
  )

  const next = new Map(resolvedByStorageKey.value)
  for (const [k, url] of results) {
    if (url) next.set(k, url)
  }
  resolvedByStorageKey.value = next
}

async function load() {
  err.value = ''
  loading.value = true
  try {
    const data = await fetchAdminChatMessages(props.chatId, {
      page: page.value,
      pageSize: pageSize.value,
      sortOrder: sortOrder.value,
    })
    messages.value = data.result ?? []
    total.value = data.total ?? 0
    if (messages.value.length) {
      await resolveAttachmentUrlsForMessages(messages.value)
    }
  } catch (e) {
    err.value = e.message
    alertError(e)
    messages.value = []
  } finally {
    loading.value = false
  }
}

function totalPages() {
  return Math.max(1, Math.ceil(total.value / pageSize.value))
}

watch(
  () => props.chatId,
  () => {
    brokenChatImages.value = new Set()
    resolvedByStorageKey.value = new Map()
    loadChatMeta()
    page.value = 1
    load()
  },
)

onMounted(() => {
  loadChatMeta()
  load()
})

const selectClass =
  'ml-2 rounded-xl border border-zinc-200/80 bg-white/90 px-2.5 py-1.5 text-sm text-zinc-900 shadow-sm dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-100'

const threadShell =
  'rounded-3xl border border-zinc-200/60 bg-zinc-50/90 p-4 shadow-inner dark:border-white/[0.08] dark:bg-zinc-900/35 sm:p-5'

const bubbleBase =
  'max-w-full rounded-2xl rounded-tl-md border border-zinc-200/70 bg-white px-3.5 py-2.5 shadow-sm dark:border-white/[0.08] dark:bg-zinc-800/90'

/** Keep audio bubbles wide enough for native controls. */
/** @param {Record<string, unknown>} m */
function bubbleClassForMessage(m) {
  const base = bubbleBase
  if (effectiveMessageKind(m) === 'audio') {
    return `block w-full max-w-md ${base}`
  }
  return `inline-block ${base}`
}

/** Native <audio> can report a tiny intrinsic width before metadata loads or on error; inline-block bubbles would shrink to a vertical sliver. */
const audioPlayerShell = 'block w-full max-w-sm min-w-[min(100%,18rem)]'
</script>

<template>
  <div class="mx-auto w-full max-w-3xl" :aria-busy="loading">
    <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <button
          type="button"
          class="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200/80 bg-white/80 text-zinc-600 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300 dark:hover:bg-zinc-800"
          title="Back to chats"
          aria-label="Back to chats"
          @click="router.push({ name: 'chats' })"
        >
          <Icon icon="heroicons:chevron-left" class="h-5 w-5" aria-hidden="true" />
        </button>
        <h1 class="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Chat</h1>
        <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{{ title }}</p>
      </div>
      <div class="flex shrink-0 items-center sm:pt-2">
        <label class="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Order
          <select v-model="sortOrder" :class="selectClass" :disabled="loading" @change="page = 1; load()">
            <option value="DESC">Newest first</option>
            <option value="ASC">Oldest first</option>
          </select>
        </label>
      </div>
    </header>

    <p
      v-if="err"
      class="mb-3 rounded-2xl border border-red-200/60 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:text-red-400"
    >
      {{ err }}
    </p>

    <p class="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Read-only audit</p>

    <MessageThreadSkeleton v-if="loading" label="Loading messages…" />

    <div v-else :class="threadShell">
      <ul class="m-0 flex list-none flex-col gap-4 p-0">
        <li v-for="m in messages" :key="m.id" class="flex gap-3">
          <UserAvatar size="sm" :user="messageSenderForAvatar(m)" :name="senderDisplayName(m)" />
          <div class="min-w-0 flex-1">
            <div class="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
              <span class="font-semibold text-zinc-900 dark:text-white">{{
                m.senderName || m.sender?.name || '—'
              }}</span>
              <span class="text-zinc-500 dark:text-zinc-400">{{ formatTime(m.createdAt) }}</span>
              <span
                class="rounded-full bg-zinc-200/80 px-1.5 py-0.5 text-[0.65rem] font-semibold text-zinc-600 dark:bg-zinc-700/80 dark:text-zinc-300"
              >
                {{ m.type }}
              </span>
              <span
                v-for="flagLabel in messageFlagsForDisplay(m.flags)"
                :key="`${m.id}-flag-${flagLabel}`"
                class="rounded-full bg-amber-200/85 px-1.5 py-0.5 text-[0.65rem] font-semibold text-amber-950 dark:bg-amber-500/20 dark:text-amber-100/95"
              >
                {{ flagLabel }}
              </span>
            </div>

            <div :class="bubbleClassForMessage(m)">
              <template v-if="effectiveMessageKind(m) === 'image'">
                <template v-for="ig in [imageGridState(m)]" :key="`${m.id}-img-grid`">
                  <div v-if="ig.n" class="space-y-2">
                    <div class="grid gap-2" :class="ig.gridCols">
                      <template v-for="(imgUrl, imgIdx) in ig.urls" :key="`${m.id}-${imgIdx}`">
                        <a
                          :href="imgUrl"
                          target="_blank"
                          rel="noopener noreferrer"
                          :class="ig.linkClass(imgIdx)"
                        >
                          <div
                            v-if="isChatImageBroken(m.id, imgIdx)"
                            :class="[
                              ig.imgClass(imgIdx),
                              'flex flex-col items-center justify-center gap-1.5 border border-dashed border-zinc-300/80 bg-zinc-100/90 px-2 text-center dark:border-zinc-600 dark:bg-zinc-800/60',
                            ]"
                            role="img"
                            :aria-label="imageLoadErrorPhrase"
                          >
                            <Icon icon="heroicons:photo" class="h-9 w-9 shrink-0 text-zinc-400 dark:text-zinc-500" aria-hidden="true" />
                            <span class="text-[0.7rem] font-semibold leading-snug text-zinc-500 dark:text-zinc-400">
                              {{ imageLoadErrorPhrase }}
                            </span>
                          </div>
                          <img
                            v-else
                            :src="imgUrl"
                            :alt="attachmentBaseName(m) + ig.altSuffix(imgIdx)"
                            loading="lazy"
                            :referrerpolicy="mediaReferrer"
                            :class="ig.imgClass(imgIdx)"
                            @error="onChatImageFailed(m.id, imgIdx)"
                          />
                        </a>
                      </template>
                    </div>
                    <p
                      v-if="displayTextContent(m)"
                      class="whitespace-pre-wrap break-words text-[0.92rem] text-zinc-800 dark:text-zinc-200"
                    >
                      {{ displayTextContent(m) }}
                    </p>
                  </div>
                  <p v-else class="text-sm text-zinc-500 dark:text-zinc-400">[Image — no URL]</p>
                </template>
              </template>

              <template v-else-if="effectiveMessageKind(m) === 'audio'">
                <div v-if="messageIsAction(m)" class="space-y-2">
                  <div :class="callBubbleClass" role="status">
                    <span
                      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-white shadow-sm dark:bg-zinc-600"
                      aria-hidden="true"
                    >
                      <Icon icon="heroicons:phone" class="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div class="min-w-0">
                      <span class="block font-semibold leading-tight">Voice call</span>
                      <span v-if="displayTextContent(m)" class="mt-0.5 block text-sm font-normal opacity-90">
                        {{ displayTextContent(m) }}
                      </span>
                    </div>
                  </div>
                  <div v-if="messageMediaUrl(m)" :class="audioPlayerShell">
                    <audio
                      :key="messageMediaUrl(m)"
                      :src="messageMediaUrl(m)"
                      controls
                      playsinline
                      class="w-full align-middle"
                      preload="metadata"
                    >
                      <source :src="messageMediaUrl(m)" :type="primaryAttachmentMime(m) || 'audio/mp4'" />
                    </audio>
                  </div>
                </div>
                <div v-else-if="messageMediaUrl(m)" class="space-y-2">
                  <div :class="audioPlayerShell">
                    <audio
                      :key="messageMediaUrl(m)"
                      :src="messageMediaUrl(m)"
                      controls
                      playsinline
                      class="w-full align-middle"
                      preload="metadata"
                    >
                      <source :src="messageMediaUrl(m)" :type="primaryAttachmentMime(m) || 'audio/mp4'" />
                    </audio>
                  </div>
                  <p v-if="displayTextContent(m)" class="whitespace-pre-wrap break-words text-[0.92rem] text-zinc-800 dark:text-zinc-200">
                    {{ displayTextContent(m) }}
                  </p>
                </div>
                <p v-else class="text-sm text-zinc-500 dark:text-zinc-400">[Audio — no URL]</p>
              </template>

              <template v-else-if="effectiveMessageKind(m) === 'video'">
                <div v-if="messageMediaUrl(m)" class="space-y-2">
                  <video
                    :src="messageMediaUrl(m)"
                    controls
                    class="max-h-72 max-w-full rounded-lg bg-black/5 dark:bg-black/30"
                    preload="metadata"
                    :referrerpolicy="mediaReferrer"
                  />
                  <p v-if="displayTextContent(m)" class="whitespace-pre-wrap break-words text-[0.92rem] text-zinc-800 dark:text-zinc-200">
                    {{ displayTextContent(m) }}
                  </p>
                </div>
                <p v-else class="text-sm text-zinc-500 dark:text-zinc-400">[Video — no URL]</p>
              </template>

              <template v-else-if="effectiveMessageKind(m) === 'file'">
                <div class="space-y-2">
                  <div v-if="fileDownloadItems(m).length" class="flex flex-col gap-2">
                    <a
                      v-for="(item, idx) in fileDownloadItems(m)"
                      :key="idx"
                      :href="item.href"
                      :download="item.name"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10 dark:border-primary/35 dark:hover:bg-primary/15"
                    >
                      <Icon icon="heroicons:arrow-down-tray" class="h-5 w-5 shrink-0 opacity-80" aria-hidden="true" />
                      <span class="min-w-0 truncate">{{ item.name }}</span>
                    </a>
                  </div>
                  <p v-else class="text-sm text-zinc-500 dark:text-zinc-400">[File — no download link]</p>
                  <p v-if="displayTextContent(m)" class="whitespace-pre-wrap break-words text-[0.92rem] text-zinc-800 dark:text-zinc-200">
                    {{ displayTextContent(m) }}
                  </p>
                </div>
              </template>

              <template v-else>
                <div class="whitespace-pre-wrap break-words text-[0.92rem] text-zinc-800 dark:text-zinc-200">
                  {{ displayTextContent(m) || (m.isDeleted ? '' : '—') }}
                </div>
                <div v-if="m.attachments?.length && effectiveMessageKind(m) === 'text'" class="mt-2 flex flex-col gap-1.5 border-t border-zinc-200/60 pt-2 dark:border-white/[0.08]">
                  <a
                    v-for="a in m.attachments"
                    :key="a.id"
                    :href="a.downloadUrl || a.url || a.thumbnailUrl || '#'"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-xs font-medium text-primary hover:underline"
                  >
                    {{ attachmentFileName(a) || 'Attachment' }}
                  </a>
                </div>
              </template>
            </div>
          </div>
        </li>
      </ul>
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
        {{ total }} messages
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
  </div>
</template>
