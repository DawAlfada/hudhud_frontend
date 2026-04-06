export const PHONE_MIN_DIGITS = 8
export const PHONE_MAX_DIGITS = 15
export const PASSWORD_MIN_LENGTH = 8

/** Digits only (after stripping non-digits) for length checks */
export function phoneDigitCount(v) {
  return String(v || '')
    .replace(/\D/g, '')
    .length
}

/** @param {string} v */
export function validatePhone(v) {
  const raw = String(v || '').trim()
  if (!raw) return 'Phone number is required'
  const n = phoneDigitCount(raw)
  if (n < PHONE_MIN_DIGITS) return `Phone must have at least ${PHONE_MIN_DIGITS} digits`
  if (n > PHONE_MAX_DIGITS) return `Phone must have at most ${PHONE_MAX_DIGITS} digits`
  return ''
}

/**
 * @param {string} v
 * @param {string} label
 */
export function validateName(v, label = 'Name') {
  const s = String(v || '').trim()
  if (!s) return `${label} is required`
  if (s.length < 2) return `${label} must be at least 2 characters`
  if (s.length > 120) return `${label} is too long`
  return ''
}

/**
 * @param {string} v
 * @param {{ optional?: boolean; label?: string }} [opts]
 */
export function validatePassword(v, opts = {}) {
  const { optional = false, label = 'Password' } = opts
  const s = String(v || '')
  if (!s) {
    return optional ? '' : `${label} is required`
  }
  if (s.length < PASSWORD_MIN_LENGTH) {
    return `${label} must be at least ${PASSWORD_MIN_LENGTH} characters`
  }
  return ''
}

/** @param {string} v */
export function validateOtp(v) {
  const s = String(v || '').trim()
  if (!s) return 'OTP is required'
  if (!/^\d{4,8}$/.test(s)) return 'OTP must be 4–8 digits'
  return ''
}
