import type { Message } from './types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

export async function fetchInitialQuestion(signal?: AbortSignal): Promise<string> {
  const res = await fetch(`${BASE_URL}/initial-question`, { signal })
  if (!res.ok) throw new Error(`Server error: ${res.status}`)
  const data = await res.json()
  return data.question
}

export async function* streamChat(
  messages: Omit<Message, 'id' | 'isStreaming'>[],
  signal?: AbortSignal
): AsyncGenerator<string | { done: true } | { error: string }> {
  let res: Response
  try {
    res = await fetch(`${BASE_URL}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
      signal,
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return
    throw new Error('Нет соединения с сервером')
  }

  if (!res.ok || !res.body) throw new Error(`Ошибка сервера: ${res.status}`)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (value) buffer += decoder.decode(value, { stream: !done })

      const lines = buffer.split('\n')
      // keep last incomplete line in buffer, unless stream is done
      buffer = done ? '' : (lines.pop() ?? '')

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') return
        try {
          const parsed = JSON.parse(data)
          if (parsed.error) {
            yield { error: parsed.error }
            return
          }
          if (parsed.done) {
            yield { done: true }
            return
          }
          if (parsed.content) yield parsed.content
        } catch {
          // skip malformed chunks
        }
      }

      if (done) break
    }
  } finally {
    reader.cancel().catch(() => {})
  }
}
