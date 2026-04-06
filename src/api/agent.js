import { api } from './http'

/** Override in `.env` if your backend uses a different route. */
export function agentChatPath() {
  const p = import.meta.env.VITE_AGENT_CHAT_PATH
  return typeof p === 'string' && p.trim() ? p.trim() : '/api/Agent/chat'
}

/** @param {unknown} data */
function extractMarkdown(data) {
  if (data == null) return ''
  if (typeof data === 'string') return data
  if (typeof data !== 'object') return String(data)

  const d = /** @type {Record<string, unknown>} */ (data)
  const r = d.result ?? d.Result
  if (typeof r === 'string') return r
  if (r && typeof r === 'object') {
    const o = /** @type {Record<string, unknown>} */ (r)
    const md =
      o.markdown ??
      o.Markdown ??
      o.content ??
      o.Content ??
      o.text ??
      o.Text ??
      o.message ??
      o.Message ??
      o.reply ??
      o.Reply
    if (typeof md === 'string') return md
  }

  const keys = ['markdown', 'message', 'content', 'text', 'reply', 'answer']
  for (const key of keys) {
    const v = d[key] ?? d[key.charAt(0).toUpperCase() + key.slice(1)]
    if (typeof v === 'string') return v
  }

  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return ''
  }
}

/**
 * POST plain text; API should respond with JSON whose markdown body is resolved by {@link extractMarkdown}.
 * @param {string} message
 * @param {{ signal?: AbortSignal }} [opts]
 */
export async function sendAgentChatMessage(message, opts = {}) {
  const trimmed = String(message ?? '').trim()
  if (!trimmed) throw new Error('Message is empty')

  const data = await api(agentChatPath(), {
    method: 'POST',
    body: { message: trimmed },
    signal: opts.signal,
  })
  return extractMarkdown(data)
}
