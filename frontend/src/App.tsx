import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Sparkles } from 'lucide-react'
import { ChatMessage } from './components/ChatMessage'
import { TypingIndicator } from './components/TypingIndicator'
import { fetchInitialQuestion, streamChat } from './api'
import type { Message } from './types'

function generateId() {
  return Math.random().toString(36).slice(2)
}

function HeroEmpty() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center select-none"
    >
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-2xl shadow-violet-900/50 glow-violet">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
          </svg>
        </div>
        <motion.div
          className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-400 border-2 border-[#080810] flex items-center justify-center"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="w-2 h-2 rounded-full bg-emerald-900" />
        </motion.div>
      </div>

      <h2 className="text-white text-xl font-semibold mb-2 tracking-tight">
        UX-исследователь готов
      </h2>
      <p className="text-slate-500 text-sm max-w-xs leading-relaxed mb-8">
        Прочитайте вопрос выше и поделитесь своим опытом. Интервью займёт несколько минут.
      </p>

      <div className="flex flex-col gap-2 w-full max-w-xs">
        {[
          'Ваши ответы анонимны',
          'Диалог адаптируется под вас',
          'Результаты помогут улучшить продукт',
        ].map((text, i) => (
          <motion.div
            key={text}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}
            className="flex items-center gap-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3.5 py-2.5"
          >
            <Sparkles size={12} className="text-violet-400 shrink-0" />
            <span className="text-slate-400 text-xs">{text}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [done, setDone] = useState(false)
  const [userHasReplied, setUserHasReplied] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const streamAbortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetchInitialQuestion(controller.signal)
      .then((q) => setMessages([{ id: generateId(), role: 'assistant', content: q }]))
      .catch(() => {})
    return () => controller.abort()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking])

  // cancel in-flight stream on unmount
  useEffect(() => {
    return () => streamAbortRef.current?.abort()
  }, [])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isLoading || done) return

    const userMsg: Message = { id: generateId(), role: 'user', content: text }
    const history = [...messages, userMsg]

    setMessages(history)
    setInput('')
    setUserHasReplied(true)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setIsLoading(true)
    setIsThinking(true)

    const controller = new AbortController()
    streamAbortRef.current?.abort()
    streamAbortRef.current = controller

    const assistantId = generateId()

    try {
      const apiMessages = history.map((m) => ({ role: m.role, content: m.content }))
      const stream = streamChat(apiMessages, controller.signal)

      let first = true

      for await (const chunk of stream) {
        if (controller.signal.aborted) break

        if (typeof chunk === 'object' && 'error' in chunk) {
          setIsThinking(false)
          setMessages((prev) => [
            ...prev,
            { id: generateId(), role: 'assistant', content: `Ошибка: ${chunk.error}` },
          ])
          break
        }

        if (typeof chunk === 'object' && 'done' in chunk) {
          setDone(true)
          break
        }

        if (first) {
          setIsThinking(false)
          setMessages((prev) => [
            ...prev,
            { id: assistantId, role: 'assistant', content: chunk, isStreaming: true },
          ])
          first = false
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + chunk } : m
            )
          )
        }
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m))
      )
    } catch {
      setIsThinking(false)
      setMessages((prev) => [
        ...prev,
        { id: generateId(), role: 'assistant', content: 'Упс, что-то пошло не так. Попробуйте ещё раз.' },
      ])
    } finally {
      setIsLoading(false)
      setIsThinking(false)
    }
  }, [input, isLoading, done, messages])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const autoResize = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }

  const canSend = input.trim() && !isLoading && !done

  return (
    <div className="flex flex-col h-screen bg-[#080810] bg-grid">
      <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-violet-600/10 blur-[100px] rounded-full" />

      <header className="relative flex-none border-b border-white/[0.06] bg-[#080810]/70 backdrop-blur-xl px-4 py-3 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-900/40">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
            </svg>
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-none">UX-исследователь</p>
            <p className="text-slate-500 text-xs mt-0.5">Глубинное интервью</p>
          </div>
          <div className="ml-auto flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-emerald-400"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-emerald-400 text-xs font-medium">Online</span>
          </div>
        </div>
      </header>

      <main className="relative flex-1 overflow-y-auto scrollbar-hide px-4 py-6 z-0">
        <div className="max-w-2xl mx-auto">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
          </AnimatePresence>

          {isThinking && <TypingIndicator />}

          <AnimatePresence>
            {!userHasReplied && messages.length > 0 && (
              <HeroEmpty />
            )}
          </AnimatePresence>

          {done && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mt-6 mb-2"
            >
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-5 py-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <p className="text-emerald-400 text-sm font-medium">Интервью завершено · Спасибо за участие!</p>
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      <footer className="relative flex-none border-t border-white/[0.06] bg-[#080810]/70 backdrop-blur-xl px-4 py-3 z-10">
        <div className="max-w-2xl mx-auto">
          <label
            className={`flex items-center gap-3 bg-[#111118] border rounded-2xl px-4 py-3 transition-all duration-200 cursor-text ${
              done
                ? 'opacity-40 border-white/5'
                : canSend
                ? 'border-violet-500/40 shadow-lg shadow-violet-900/20'
                : 'border-white/[0.08] hover:border-white/[0.12]'
            }`}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); autoResize() }}
              onKeyDown={handleKeyDown}
              disabled={isLoading || done}
              placeholder={done ? 'Интервью завершено' : 'Напишите ответ…'}
              rows={1}
              className="flex-1 bg-transparent text-slate-200 placeholder-slate-600 text-sm resize-none outline-none leading-relaxed self-center"
              style={{ minHeight: '24px', maxHeight: '160px' }}
            />
            <motion.button
              onClick={(e) => { e.preventDefault(); handleSend() }}
              disabled={!canSend}
              whileTap={canSend ? { scale: 0.9 } : {}}
              className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 ${
                canSend
                  ? 'bg-gradient-to-br from-violet-500 to-violet-700 shadow-lg shadow-violet-900/40 cursor-pointer'
                  : 'bg-white/[0.06] cursor-not-allowed'
              }`}
            >
              <Send size={13} className={canSend ? 'text-white' : 'text-slate-600'} />
            </motion.button>
          </label>
        </div>
      </footer>
    </div>
  )
}
