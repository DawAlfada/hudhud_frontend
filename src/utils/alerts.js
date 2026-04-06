import { ref } from 'vue'

/** @typedef {'error' | 'success' | 'info'} AlertVariant */

/**
 * @typedef {{ id: number; title: string; message: string; variant: AlertVariant }} AppToast
 */

/** @type {import('vue').Ref<AppToast[]>} */
export const appToasts = ref([])

/** @deprecated use dismissToast / dismissAllToasts */
export function closeAppAlert() {
  dismissAllToasts()
}

const dismissTimers = new Map()
let _id = 0

/**
 * @param {number} id
 */
export function dismissToast(id) {
  const t = dismissTimers.get(id)
  if (t) clearTimeout(t)
  dismissTimers.delete(id)
  appToasts.value = appToasts.value.filter((x) => x.id !== id)
}

export function dismissAllToasts() {
  for (const t of dismissTimers.values()) clearTimeout(t)
  dismissTimers.clear()
  appToasts.value = []
}

/**
 * @param {{ title?: string; message: string; variant?: AlertVariant }} opts
 */
export function showAppAlert(opts) {
  const { message, variant = 'error', title } = opts
  const defaultTitles = {
    error: 'Error',
    success: 'Success',
    info: 'Notice',
  }
  const id = ++_id
  const toast = {
    id,
    title: title ?? defaultTitles[variant],
    message,
    variant,
  }
  appToasts.value = [...appToasts.value, toast]

  const ms = variant === 'error' ? 12000 : 5500
  const timer = setTimeout(() => dismissToast(id), ms)
  dismissTimers.set(id, timer)
}

/**
 * @param {unknown} e
 * @param {string} [fallback]
 */
export function alertError(e, fallback = 'Something went wrong.') {
  let msg = fallback
  if (typeof e === 'string' && e) msg = e
  else if (e && typeof e === 'object' && 'message' in e && e.message) msg = String(e.message)
  showAppAlert({ title: 'Error', message: msg, variant: 'error' })
}

/** @param {string} message @param {string} [title] */
export function alertSuccess(message, title) {
  showAppAlert({ message, variant: 'success', ...(title ? { title } : {}) })
}

/** @param {string} message @param {string} [title] */
export function alertInfo(message, title) {
  showAppAlert({ message, variant: 'info', ...(title ? { title } : {}) })
}
