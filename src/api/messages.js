import { api } from './http'

export function fetchAdminChatMessages(chatId, params) {
  const q = new URLSearchParams()
  if (params.page) q.set('page', String(params.page))
  if (params.pageSize) q.set('pageSize', String(params.pageSize))
  q.set('sortOrder', params.sortOrder || 'DESC')
  return api(`/api/Message/admin/chat/${chatId}?${q}`)
}
