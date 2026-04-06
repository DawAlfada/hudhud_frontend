import { api } from './http'

/**
 * Resolves a stored attachment to a short-lived URL (same as mobile getAttachmentUrl).
 * GET …/Attachment/url/{storageKey} → { result: { url } }
 * @param {string | number} storageKey
 */
export async function fetchAttachmentUrl(storageKey) {
  const key = String(storageKey ?? '').trim()
  if (!key) throw new Error('Missing storage key')

  const data = await api(`/api/Attachment/url/${encodeURIComponent(key)}`)
  const r = data?.result
  const url = typeof r === 'string' ? r : r?.url
  if (typeof url !== 'string' || !url.trim()) {
    throw new Error('Invalid attachment URL response')
  }
  return url.trim()
}
