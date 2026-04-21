import { useState, useRef, useEffect } from 'react'
import { chatCompletion } from '../api/groq'

const S = {
  col: { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' },
  header: {
    padding: '0 0 16px', display: 'flex',
    justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
  },
  title: {
    fontFamily: 'var(--font-head)', fontSize: '13px', fontWeight: 600,
    letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)',
  },
  msgCount: {
    fontSize: '10px', color: 'var(--text-3)',
    background: 'var(--bg-4)', padding: '2px 8px', borderRadius: '20px',
  },
  body: { flex: 1, overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '12px' },
  emptyState: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', flex: 1, gap: '12px',
    color: 'var(--text-3)', textAlign: 'center',
  },
  emptyIcon: {
    width: '40px', height: '40px', borderRadius: '50%',
    border: '1px solid var(--border)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', fontSize: '18px',
  },
  msg: (role) => ({
    display: 'flex',
    justifyContent: role === 'user' ? 'flex-end' : 'flex-start',
  }),
  bubble: (role) => ({
    maxWidth: '88%',
    padding: '10px 14px',
    borderRadius: role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
    background: role === 'user' ? 'var(--accent-dim)' : 'var(--bg-3)',
    border: `1px solid ${role === 'user' ? 'rgba(124,106,247,0.4)' : 'var(--border)'}`,
    fontSize: '13px', lineHeight: 1.65, color: 'var(--text)',
    whiteSpace: 'pre-wrap',
  }),
  suggestionSource: {
    fontSize: '10px', color: 'var(--text-3)', marginBottom: '6px',
    letterSpacing: '0.04em',
  },
  timestamp: {
    fontSize: '10px', color: 'var(--text-3)', marginTop: '4px',
    textAlign: 'right',
  },
  inputArea: {
    marginTop: '12px', flexShrink: 0,
    display: 'flex', gap: '8px', alignItems: 'flex-end',
  },
  inputWrap: {
    flex: 1, background: 'var(--bg-3)',
    border: '1px solid var(--border)', borderRadius: '10px',
    overflow: 'hidden', transition: 'border-color 0.15s',
  },
  textarea: {
    width: '100%', background: 'transparent',
    border: 'none', padding: '10px 12px',
    resize: 'none', fontSize: '13px',
    color: 'var(--text)', lineHeight: 1.5, outline: 'none',
    fontFamily: 'var(--font-mono)',
  },
  sendBtn: (canSend) => ({
    width: '38px', height: '38px', borderRadius: '10px',
    background: canSend ? 'var(--accent)' : 'var(--bg-4)',
    border: 'none', cursor: canSend ? 'pointer' : 'not-allowed',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s', flexShrink: 0,
  }),
  streamCursor: {
    display: 'inline-block', width: '2px', height: '14px',
    background: 'var(--accent)', marginLeft: '2px',
    animation: 'pulse 0.8s ease-in-out infinite',
    verticalAlign: 'text-bottom',
  },
}

export default function ChatColumn({ messages, onMessagesChange, transcript, settings, apiKey }) {
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const bodyRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight
    }
  }, [messages])

  const sendMessage = async (text) => {
    if (!text.trim() || isStreaming || !apiKey) return

    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    }

    const assistantMsg = {
      id: Date.now() + 1,
      role: 'assistant',
      content: '',
      streaming: true,
      timestamp: new Date().toISOString(),
    }

    const newMessages = [...messages, userMsg, assistantMsg]
    onMessagesChange(newMessages)
    setInput('')
    setIsStreaming(true)

    try {
      const apiMessages = newMessages
        .filter(m => !m.streaming && m.role !== 'system')
        .map(m => ({ role: m.role, content: m.content }))

      const reader = await chatCompletion(apiMessages, transcript, settings, apiKey)
      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '))

        for (const line of lines) {
          const data = line.slice(6)
          if (data === '[DONE]') continue
          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices[0]?.delta?.content || ''
            fullContent += delta

            onMessagesChange(prev =>
              prev.map(m =>
                m.id === assistantMsg.id
                  ? { ...m, content: fullContent }
                  : m
              )
            )
          } catch {}
        }
      }

      // Mark streaming done
      onMessagesChange(prev =>
        prev.map(m =>
          m.id === assistantMsg.id
            ? { ...m, streaming: false }
            : m
        )
      )
    } catch (err) {
      onMessagesChange(prev =>
        prev.map(m =>
          m.id === assistantMsg.id
            ? { ...m, content: `Error: ${err.message}`, streaming: false }
            : m
        )
      )
    } finally {
      setIsStreaming(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const canSend = input.trim() && !isStreaming && !!apiKey

  return (
    <div style={S.col}>
      <div style={S.header}>
        <span style={S.title}>Chat</span>
        {messages.length > 0 && (
          <span style={S.msgCount}>{messages.length} messages</span>
        )}
      </div>

      <div style={S.body} ref={bodyRef}>
        {messages.length === 0 ? (
          <div style={S.emptyState}>
            <div style={S.emptyIcon}>💬</div>
            <div>
              <div style={{ color: 'var(--text-2)', fontSize: '13px', marginBottom: '4px' }}>
                Chat with your meeting
              </div>
              <div style={{ fontSize: '12px' }}>
                Click a suggestion or type a question
              </div>
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} style={S.msg(msg.role)} className="anim-in">
              <div>
                {msg.suggestionSource && (
                  <div style={{ ...S.suggestionSource, textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                    from suggestion: {msg.suggestionSource}
                  </div>
                )}
                <div style={S.bubble(msg.role)}>
                  {msg.content}
                  {msg.streaming && <span style={S.streamCursor} />}
                </div>
                <div style={S.timestamp}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={S.inputArea}>
        <div style={S.inputWrap} onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
          onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}>
          <textarea
            ref={textareaRef}
            style={S.textarea}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={apiKey ? 'Ask anything about the meeting… (Enter to send)' : 'Add your Groq API key in Settings first'}
            rows={2}
            disabled={!apiKey}
          />
        </div>
        <button
          style={S.sendBtn(canSend)}
          onClick={() => sendMessage(input)}
          disabled={!canSend}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 7L12 7M12 7L8 3M12 7L8 11"
              stroke={canSend ? '#fff' : 'var(--text-3)'}
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}