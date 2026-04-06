/**
 * Resolve a displayable profile photo URL from user / participant / nested API shapes.
 * @param {unknown} source
 * @returns {string}
 */
const PROFILE_URL_FIELDS = [
  'profileImageUrl',
  'ProfileImageUrl',
  'profilePictureUrl',
  'ProfilePictureUrl',
  'avatarUrl',
  'AvatarUrl',
  'profilePhotoUrl',
  'ProfilePhotoUrl',
  'imageUrl',
  'ImageUrl',
  'photoUrl',
  'PhotoUrl',
  'pictureUrl',
  'PictureUrl',
]

export function getUserProfileImageUrl(source) {
  if (!source || typeof source !== 'object') return ''
  const s = /** @type {Record<string, unknown>} */ (source)
  for (const k of PROFILE_URL_FIELDS) {
    const v = s[k]
    if (typeof v === 'string') {
      const t = v.trim()
      if (t && (/^https?:\/\//i.test(t) || /^data:image\//i.test(t))) return t
    }
  }
  const nested = s.profileImage ?? s.ProfileImage
  if (nested && typeof nested === 'object') {
    const o = /** @type {Record<string, unknown>} */ (nested)
    const u =
      o.url ??
      o.Url ??
      o.downloadUrl ??
      o.DownloadUrl ??
      o.presignedUrl ??
      o.PresignedUrl
    if (typeof u === 'string' && u.trim()) {
      const t = u.trim()
      if (/^https?:\/\//i.test(t) || /^data:image\//i.test(t)) return t
    }
  }
  return ''
}

/**
 * When the API stores a relative object key (e.g. `2026/02/08/…jpg`) instead of a full URL.
 * @param {unknown} source
 * @returns {string}
 */
export function getUserProfileStorageKey(source) {
  if (!source || typeof source !== 'object') return ''
  const s = /** @type {Record<string, unknown>} */ (source)
  for (const k of PROFILE_URL_FIELDS) {
    const v = s[k]
    if (typeof v !== 'string') continue
    const t = v.trim()
    if (!t) continue
    if (/^https?:\/\//i.test(t) || /^data:image\//i.test(t)) continue
    return t
  }
  return ''
}

/**
 * @param {string} [name]
 * @returns {string}
 */
export function displayInitials(name) {
  const n = (name || '?').trim()
  if (!n) return '?'
  const parts = n.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return n.slice(0, 2).toUpperCase()
}
