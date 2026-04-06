import { ref } from 'vue'

const base = () => import.meta.env.VITE_API_BASE || 'http://localhost:5148'

/** Bumped when auth changes so layouts can react without reload */
export const authTick = ref(0)

export function getStoredAuth() {
  try {
    const raw = localStorage.getItem('hudhud_auth')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setStoredAuth(user, token) {
  localStorage.setItem('hudhud_auth', JSON.stringify({ user, token }))
  authTick.value++
}

export function clearStoredAuth() {
  localStorage.removeItem('hudhud_auth')
  authTick.value++
}

export function getToken() {
  return getStoredAuth()?.token ?? null
}

/**
 * @param {string} path
 * @param {{ method?: string, body?: unknown, auth?: boolean, signal?: AbortSignal }} [options]
 */
export async function api(path, options = {}) {
  const { method = 'GET', body, auth = true, signal } = options
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const token = auth ? getToken() : null
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${base()}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.hasError) {
    const msg = (data.errors && data.errors.join?.('; ')) || data.message || `HTTP ${res.status}`
    const err = new Error(msg)
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}
