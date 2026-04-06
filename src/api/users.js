import { api } from './http'

export function login(body) {
  return api('/api/User/auth', { method: 'POST', body, auth: false })
}

export function fetchUsers(params) {
  const q = new URLSearchParams()
  if (params.page) q.set('page', String(params.page))
  if (params.pageSize) q.set('pageSize', String(params.pageSize))
  if (params.name) q.set('name', params.name)
  if (params.role) q.set('role', params.role)
  return api(`/api/User?${q}`)
}

export function fetchUser(id) {
  return api(`/api/User/${id}`)
}

export function updateUser(id, body) {
  return api(`/api/User/${id}`, { method: 'PUT', body })
}

export function deleteUser(id) {
  return api(`/api/User/${id}`, { method: 'DELETE' })
}

export function sendOtp(phoneNumber) {
  return api('/api/User/send-otp', { method: 'POST', body: { phoneNumber }, auth: false })
}

export function register(body) {
  return api('/api/User/register', { method: 'POST', body, auth: false })
}

export function forgotPassword(body) {
  return api('/api/User/forgot-password', { method: 'POST', body, auth: false })
}

export function checkUserExists(phoneNumber) {
  const q = new URLSearchParams({ phoneNumber })
  return api(`/api/User/register/check?${q}`, { auth: false })
}
