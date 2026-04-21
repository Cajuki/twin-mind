import { useState } from 'react'
import { DEFAULT_SETTINGS } from '../utils/defaults'

const S = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(4px)', zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  panel: {
    background: 'var(--bg-2)', border: '1px solid var(--border)',
    borderRadius: '16px', width: '680px', maxWidth: '95vw',
    maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
  },
  header: {
    padding: '20px 24px 16px', borderBottom: '1px solid var(--border)',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  title: {
    fontFamily: 'var(--font-head)', fontSize: '18px', fontWeight: 700,
    letterSpacing: '-0.02em',
  },
  body: { padding: '20px 24px', overflowY: 'auto', flex: 1 },
  footer: {
    padding: '16px 24px', borderTop: '1px solid var(--border)',
    display: 'flex', gap: '10px', justifyContent: 'flex-end',
  },
  section: { marginBottom: '24px' },
  sectionTitle: {
    fontSize: '10px', fontWeight: 500, letterSpacing: '0.1em',
    textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '12px',
  },
  field: { marginBottom: '14px' },
  label: { fontSize: '12px', color: 'var(--text-2)', marginBottom: '6px', display: 'block' },
  input: { width: '100%' },
  textarea: { width: '100%', resize: 'vertical', minHeight: '80px', lineHeight: 1.5 },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' },
  btnPrimary: {
    background: 'var(--accent)', color: '#fff', border: 'none',
    borderRadius: '8px', padding: '8px 20px', fontSize: '13px',
    fontFamily: 'var(--font-mono)', cursor: 'pointer',
  },
  btnSecondary: {
    background: 'var(--bg-4)', color: 'var(--text-2)', border: '1px solid var(--border)',
    borderRadius: '8px', padding: '8px 16px', fontSize: '13px',
    fontFamily: 'var(--font-mono)', cursor: 'pointer',
  },
  btnClose: {
    background: 'none', border: 'none', color: 'var(--text-3)',
    fontSize: '18px', cursor: 'pointer', lineHeight: 1,
  },
  apiKeyRow: {
    display: 'flex', gap: '8px',
  },
  apiKeyInput: { flex: 1 },
}

export default function SettingsPanel({ settings, onSave, apiKey, onApiKeySave, onClose }) {
  const [local, setLocal] = useState({ ...settings })
  const [localKey, setLocalKey] = useState(apiKey || '')
  const [showKey, setShowKey] = useState(false)

  const set = (k, v) => setLocal(p => ({ ...p, [k]: v }))

  const handleSave = () => {
    onApiKeySave(localKey.trim())
    onSave(local)
    onClose()
  }

  const handleReset = () => {
    setLocal({ ...DEFAULT_SETTINGS })
  }

  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.panel}>
        <div style={S.header}>
          <span style={S.title}>Settings</span>
          <button style={S.btnClose} onClick={onClose}>✕</button>
        </div>

        <div style={S.body}>
          {/* API Key */}
          <div style={S.section}>
            <div style={S.sectionTitle}>Groq API Key</div>
            <div style={S.field}>
              <label style={S.label}>Your Groq API key (stored in localStorage only)</label>
              <div style={S.apiKeyRow}>
                <input
                  type={showKey ? 'text' : 'password'}
                  style={{ ...S.input, ...S.apiKeyInput }}
                  value={localKey}
                  onChange={e => setLocalKey(e.target.value)}
                  placeholder="gsk_..."
                />
                <button
                  style={{ ...S.btnSecondary, padding: '8px 12px' }}
                  onClick={() => setShowKey(p => !p)}
                >
                  {showKey ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          </div>

          {/* Context Windows */}
          <div style={S.section}>
            <div style={S.sectionTitle}>Context Windows (characters)</div>
            <div style={S.row}>
              <div style={S.field}>
                <label style={S.label}>Suggestions</label>
                <input style={S.input} type="number" value={local.suggestionContextWindow}
                  onChange={e => set('suggestionContextWindow', e.target.value)} />
              </div>
              <div style={S.field}>
                <label style={S.label}>Expand on Click</label>
                <input style={S.input} type="number" value={local.expandContextWindow}
                  onChange={e => set('expandContextWindow', e.target.value)} />
              </div>
              <div style={S.field}>
                <label style={S.label}>Chat</label>
                <input style={S.input} type="number" value={local.chatContextWindow}
                  onChange={e => set('chatContextWindow', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Refresh Interval */}
          <div style={S.section}>
            <div style={S.sectionTitle}>Auto-Refresh</div>
            <div style={{ ...S.field, maxWidth: '200px' }}>
              <label style={S.label}>Suggestion refresh interval (seconds)</label>
              <input style={S.input} type="number" min="10" max="120"
                value={local.refreshInterval}
                onChange={e => set('refreshInterval', e.target.value)} />
            </div>
          </div>

          {/* Suggestion Prompts */}
          <div style={S.section}>
            <div style={S.sectionTitle}>Live Suggestion Prompts</div>
            <div style={S.field}>
              <label style={S.label}>System prompt</label>
              <textarea style={S.textarea} rows={8} value={local.suggestionSystemPrompt}
                onChange={e => set('suggestionSystemPrompt', e.target.value)} />
            </div>
            <div style={S.field}>
              <label style={S.label}>User prompt (appended after transcript)</label>
              <textarea style={S.textarea} rows={4} value={local.suggestionUserPrompt}
                onChange={e => set('suggestionUserPrompt', e.target.value)} />
            </div>
          </div>

          {/* Expand Prompts */}
          <div style={S.section}>
            <div style={S.sectionTitle}>Expand (On-Click) Prompts</div>
            <div style={S.field}>
              <label style={S.label}>System prompt</label>
              <textarea style={S.textarea} rows={6} value={local.expandSystemPrompt}
                onChange={e => set('expandSystemPrompt', e.target.value)} />
            </div>
            <div style={S.field}>
              <label style={S.label}>User prompt</label>
              <textarea style={S.textarea} rows={3} value={local.expandUserPrompt}
                onChange={e => set('expandUserPrompt', e.target.value)} />
            </div>
          </div>

          {/* Chat Prompts */}
          <div style={S.section}>
            <div style={S.sectionTitle}>Chat System Prompt</div>
            <div style={S.field}>
              <textarea style={S.textarea} rows={6} value={local.chatSystemPrompt}
                onChange={e => set('chatSystemPrompt', e.target.value)} />
            </div>
          </div>
        </div>

        <div style={S.footer}>
          <button style={S.btnSecondary} onClick={handleReset}>Reset to defaults</button>
          <button style={S.btnSecondary} onClick={onClose}>Cancel</button>
          <button style={S.btnPrimary} onClick={handleSave}>Save settings</button>
        </div>
      </div>
    </div>
  )
}