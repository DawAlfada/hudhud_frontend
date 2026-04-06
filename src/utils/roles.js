/** Matches HudHud_Be.Enums.Role names from the API (JSON). */
export const ROLE_ADMIN = 'ADMIN'
export const ROLE_DATA_ENTRY = 'DATA_ENTRY'

const CONSOLE_ROLES = new Set([ROLE_ADMIN, ROLE_DATA_ENTRY])

function normalizeRole(role) {
  if (role == null || role === '') return ''
  return String(role).trim().toUpperCase().replace(/\s+/g, '_')
}

export function canAccessConsole(role) {
  return CONSOLE_ROLES.has(normalizeRole(role))
}

export function isFullAdmin(role) {
  return normalizeRole(role) === ROLE_ADMIN
}
