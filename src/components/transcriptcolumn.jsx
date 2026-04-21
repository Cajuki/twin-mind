import { useEffect, useRef } from 'react'

const S = {
  col: {
    display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden',
  },
  header: {
    padding: '0 0 16px', display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', flexShrink: 0,
  },
  title: {
    fontFamily: 'var(--font-head)', fontSize: '13px', fontWeight: 600,
    letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)',
  },
  statusRow: { display: 'flex', alignItems: 'center', gap: '8px' },
  dot: (active, color) => ({
    width: '7px', height: '7px', borderRadius: '50%',
    background: active ? color : 'var(--border-2)',
    ...(active ? { boxShadow: `0 0 8px ${color}` } : {}),
  }),
  statusText: { fontSize: '11px', color: 'var(--text-3)' },
  body: {
    flex: 1, overflowY: 'auto', paddingRight: '4px',
  },
  emptyState: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', height: '200px', gap: '12px',
    color: 'var(--text-3)', textAlign: 'center',
  },
  emptyIcon: {
    width: '40px', height: '40px', borderRadius: '50%',
    border: '1px solid var(--border)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', fontSize: '18px',
  },
  chunk: {
    marginBottom: '16px',
  },
  chunkTime: {
    fontSize: '10px', color: 'var(--text-3)', marginBottom: '4px',
    letterSpacing: '0.05em',
  },
  chunkText: {
    color: 'var(--text)', lineHeight: 1.7, fontSize: '13px',
  },
  divider: {
    height: '1px', background: 'var(--border)', margin: '16px 0',
    opacity: 0.5,
  },
  micBtn: (active) => ({
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '12px 20px',
    background: active ? 'rgba(242,87,87,0.12)' : 'var(--accent-glow)',
    border: `1px solid ${active ? 'rgba(242,87,87,0.4)' : 'rgba(124,106,247,0.3)'}`,
    borderRadius: '10px', cursor: 'pointer', width: '100%',
    marginTop: '16px', flexShrink: 0,
    transition: 'all 0.2s',
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    color: active ? 'var(--red)' : 'var(--accent)',
  }),
  micIcon: (active) => ({
    width: '28px', height: '28px', borderRadius: '50%',
    background: active ? 'var(--red)' : 'var(--accent)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  }),
}

export default function TranscriptColumn({
  chunks, isRecording, isTranscribing,
  onStartRecording, onStopRecording,
}) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chunks])

  return (
    <div style={S.col}>
      <div style={S.header}>
        <span style={S.title}>Transcript</span>
        <div style={S.statusRow}>
          {isTranscribing && (
            <>
              <div style={S.dot(true, 'var(--amber)')} className="pulse" />
              <span style={S.statusText}>transcribing</span>
            </>
          )}
          {isRecording && !isTranscribing && (
            <>
              <div style={S.dot(true, 'var(--red)')} className="pulse" />
              <span style={S.statusText}>recording</span>
            </>
          )}
        </div>
      </div>

      <div style={S.body}>
        {chunks.length === 0 ? (
          <div style={S.emptyState}>
            <div style={S.emptyIcon}>🎙</div>
            <div>
              <div style={{ marginBottom: '4px', color: 'var(--text-2)', fontSize: '13px' }}>
                No transcript yet
              </div>
              <div style={{ fontSize: '12px' }}>
                Start recording to transcribe your meeting
              </div>
            </div>
          </div>
        ) : (
          chunks.map((chunk, i) => (
            <div key={chunk.id} className={i === 0 ? 'anim-in' : ''}>
              {i > 0 && <div style={S.divider} />}
              <div style={S.chunk}>
                <div style={S.chunkTime}>
                  {new Date(chunk.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
                <div style={S.chunkText}>{chunk.text}</div>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <button
        style={S.micBtn(isRecording)}
        onClick={isRecording ? onStopRecording : onStartRecording}
      >
        <div style={S.micIcon(isRecording)}>
          {isRecording ? (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="2" y="2" width="3" height="8" rx="1" fill="white" />
              <rect x="7" y="2" width="3" height="8" rx="1" fill="white" />
            </svg>
          ) : (
            <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
              <rect x="3" y="0" width="6" height="9" rx="3" fill="white" />
              <path d="M1 6C1 9.31 3.69 12 7 12" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M11 6C11 9.31 8.31 12 5 12" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="6" y1="12" x2="6" y2="14" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </div>
        {isRecording ? 'Stop recording' : 'Start recording'}
        {isRecording && (
          <span style={{ marginLeft: 'auto', fontSize: '11px', opacity: 0.7 }}>
            chunks every 30s
          </span>
        )}
      </button>
    </div>
  )
}