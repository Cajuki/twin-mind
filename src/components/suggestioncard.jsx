import { SUGGESTION_TYPE_META } from '../utils/defaults'

const S = {
  card: (meta) => ({
    background: meta.bg,
    border: `1px solid ${meta.color}33`,
    borderRadius: '10px',
    padding: '12px 14px',
    cursor: 'pointer',
    transition: 'all 0.15s',
    marginBottom: '8px',
    position: 'relative',
    overflow: 'hidden',
  }),
  badge: (meta) => ({
    display: 'inline-flex', alignItems: 'center',
    gap: '5px', padding: '3px 8px',
    background: `${meta.color}20`,
    border: `1px solid ${meta.color}40`,
    borderRadius: '20px',
    fontSize: '10px', fontWeight: 500,
    color: meta.color,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    marginBottom: '8px',
  }),
  dot: (meta) => ({
    width: '5px', height: '5px', borderRadius: '50%',
    background: meta.color, flexShrink: 0,
  }),
  preview: {
    fontSize: '13px', color: 'var(--text)', lineHeight: 1.6,
  },
  hint: {
    fontSize: '11px', color: 'var(--text-3)', marginTop: '8px',
  },
  accentLine: (meta) => ({
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: '3px', background: meta.color,
    borderRadius: '10px 0 0 10px',
  }),
}

export default function SuggestionCard({ suggestion, onClick }) {
  const meta = SUGGESTION_TYPE_META[suggestion.type] || SUGGESTION_TYPE_META.insight

  return (
    <div
      style={S.card(meta)}
      onClick={() => onClick(suggestion)}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateX(3px)'
        e.currentTarget.style.borderColor = `${meta.color}66`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateX(0)'
        e.currentTarget.style.borderColor = `${meta.color}33`
      }}
    >
      <div style={S.accentLine(meta)} />
      <div style={{ paddingLeft: '8px' }}>
        <div style={S.badge(meta)}>
          <div style={S.dot(meta)} />
          {suggestion.label || meta.label}
        </div>
        <div style={S.preview}>{suggestion.preview}</div>
        <div style={S.hint}>↵ tap for details</div>
      </div>
    </div>
  )
}