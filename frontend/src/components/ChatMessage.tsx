import { motion } from 'framer-motion'
import type { Message } from '../types'

interface Props {
  message: Message
}

export function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      className={`flex items-end gap-3 mb-5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {!isUser && (
        <div className="relative shrink-0">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-900/40">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
            </svg>
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#080810]" />
        </div>
      )}

      {isUser && (
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white text-xs font-semibold shrink-0 shadow-lg">
          Вы
        </div>
      )}

      <div className={`max-w-[72%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed msg-glow ${
            isUser
              ? 'bg-gradient-to-br from-violet-600 to-violet-700 text-white rounded-br-sm'
              : 'bg-[#13131f] border border-white/[0.07] text-slate-200 rounded-bl-sm'
          }`}
        >
          {message.content}
          {message.isStreaming && (
            <motion.span
              className="inline-block w-0.5 h-[1em] bg-current ml-0.5 align-text-bottom opacity-90"
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </div>
      </div>
    </motion.div>
  )
}
