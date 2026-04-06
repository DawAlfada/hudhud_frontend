import { api } from './http'

export function fetchAdminP2PChats(params) {
  const q = new URLSearchParams()
  q.set('type', 'P2P')
  if (params.page) q.set('page', String(params.page))
  if (params.pageSize) q.set('pageSize', String(params.pageSize))
  if (params.name) q.set('name', params.name)
  if (params.isArchived != null && params.isArchived !== '') q.set('isArchived', String(params.isArchived))
  return api(`/api/Chat/admin/p2p?${q}`)
}

/** Admin: all GROUP chats (paginated). Query: page, pageSize, name (group or member name), isArchived */
export function fetchAdminGroupChats(params) {
  const q = new URLSearchParams()
  if (params.page) q.set('page', String(params.page))
  if (params.pageSize) q.set('pageSize', String(params.pageSize))
  if (params.name) q.set('name', params.name)
  if (params.isArchived != null && params.isArchived !== '') q.set('isArchived', String(params.isArchived))
  return api(`/api/Chat/admin/group?${q}`)
}

/**
 * Admin: GET /api/Chat/admin/{chatId}/participants
 * Membership not required; `[Authorize(Roles = "ADMIN")]`.
 * @param {string} chatId
 * @param {{ includeRemoved?: boolean }} [options] includeRemoved — soft-deleted rows for audit
 */
export function fetchAdminChatParticipants(chatId, options = {}) {
  const id = String(chatId ?? '').trim()
  if (!id) return Promise.reject(new Error('Missing chat id'))
  const q = new URLSearchParams()
  if (options.includeRemoved === true) q.set('includeRemoved', 'true')
  const qs = q.toString()
  return qs
    ? api(`/api/Chat/admin/${encodeURIComponent(id)}/participants?${qs}`)
    : api(`/api/Chat/admin/${encodeURIComponent(id)}/participants`)
}
