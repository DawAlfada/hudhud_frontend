<script setup>
import { ref, computed, watch } from 'vue'
import { fetchAttachmentUrl } from '../api/attachments'
import {
  getUserProfileImageUrl,
  getUserProfileStorageKey,
  displayInitials,
} from '../utils/userProfile'

const props = defineProps({
  /** User / participant row — profile URL read via getUserProfileImageUrl */
  user: { type: Object, default: null },
  /** Overrides URL from user */
  imageUrl: { type: String, default: '' },
  /** For initials fallback and alt text */
  name: { type: String, default: '' },
  /** sm | md | lg */
  size: { type: String, default: 'md' },
  /** full = circle, xl = rounded-xl tile (e.g. sidebar) */
  rounded: { type: String, default: 'full' },
  /** Extra classes on outer ring */
  wrapperClass: { type: String, default: '' },
})

const imgFailed = ref(false)
/** Resolved GET /api/Attachment/url/{storageKey} when profile fields hold a storage path */
const resolvedKeyUrl = ref('')
let fetchSeq = 0

const resolvedUrl = computed(() => {
  const direct = props.imageUrl?.trim()
  if (direct && (/^https?:\/\//i.test(direct) || /^data:image\//i.test(direct))) return direct
  if (props.user) {
    const http = getUserProfileImageUrl(props.user)
    if (http) return http
  }
  return resolvedKeyUrl.value.trim()
})

function profileStorageKeyToFetch() {
  const direct = props.imageUrl?.trim()
  if (direct && !/^https?:\/\//i.test(direct) && !/^data:/i.test(direct)) return direct
  return getUserProfileStorageKey(props.user)
}

watch(
  () => [props.user, props.imageUrl],
  async () => {
    resolvedKeyUrl.value = ''
    imgFailed.value = false
    const my = ++fetchSeq
    const key = profileStorageKeyToFetch()
    if (!key) return
    try {
      const url = await fetchAttachmentUrl(key)
      if (my === fetchSeq) resolvedKeyUrl.value = url
    } catch {
      if (my === fetchSeq) resolvedKeyUrl.value = ''
    }
  },
  { immediate: true, deep: true },
)

const showImg = computed(() => Boolean(resolvedUrl.value) && !imgFailed.value)

const displayName = computed(() => {
  if (props.name?.trim()) return props.name.trim()
  const u = props.user
  if (u && typeof u === 'object' && 'name' in u && typeof u.name === 'string') return u.name.trim()
  return ''
})

const initials = computed(() => displayInitials(displayName.value))

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'h-9 w-9 text-[0.65rem]'
    case 'lg':
      return 'h-14 w-14 text-base'
    default:
      return 'h-11 w-11 text-xs'
  }
})

const baseRing =
  'shrink-0 overflow-hidden bg-primary/15 font-bold text-primary ring-1 ring-primary/20 dark:ring-primary/35'

const shapeClass = computed(() => (props.rounded === 'xl' ? 'rounded-xl' : 'rounded-full'))

watch(resolvedUrl, () => {
  imgFailed.value = false
})

function onImgError() {
  imgFailed.value = true
}
</script>

<template>
  <div
    :class="[baseRing, shapeClass, sizeClasses, wrapperClass, showImg && 'ring-0']"
    :title="displayName || undefined"
  >
    <img
      v-if="showImg"
      :src="resolvedUrl"
      alt=""
      class="h-full w-full object-cover"
      loading="lazy"
      referrerpolicy="no-referrer"
      @error="onImgError"
    />
    <span v-else class="flex h-full w-full items-center justify-center" :aria-hidden="true">
      {{ initials }}
    </span>
  </div>
</template>
