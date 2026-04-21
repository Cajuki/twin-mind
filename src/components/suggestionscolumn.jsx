import SuggestionCard from './SuggestionCard'

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
  actions: { display: 'flex', gap: '8px', alignItems: 'center' },
  refreshBtn: (loading) => ({
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '6px 12px',
    background: loading ? 'var(--bg-4)' : 'var(--accent-glow)',
    border: `1px solid ${loading ? 'var(--border)' : 'rgba(124,106,247,0.3)'}`,
    borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer',
    fontSize: '12px', color: loading ? 'var(--text-3)' : 'var(--accent)',
    transition: 'all 0.15s', fontFamily: 'var(--font-mono)',
  }),
  body: { flex: 1, overflowY: 'auto', paddingRight: '4px' },
  batchBlock: { marginBottom: '20px' },
  batchHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '10px',
  },
  batchTime: { fontSize: '10px', color: 'var(--text-3)', letterSpacing: '0.05em' },
  batchBadge: {
    fontSize: '10px', color: 'var(--text-3)',
    background: 'var(--bg-4)', padding: '2px 8px', borderRadius: '20px',
  },
  divider: { height: '1px', background: 'var(--border)', margin: '16px 0', opacity: 0.4 },
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
  loadingRow: {
    display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px',
  },
  skeleton: (w) => ({
    height: '68px', background: 'var(--bg-3)', borderRadius: '10px',
    width: w, animation: 'pulse 1.5s ease-in-out infinite',
  }),
  timerRow: {
    display: 'flex', alignItems: 'center', gap: '8px',
    fontSize: '11px', color: 'var(--text-3)', marginTop: '4px',
  },
  timerBar: (pct) => ({
    flex: 1, height: '2px', background: 'var(--border)',
    borderRadius: '1px', overflow: 'hidden',
  }),
  timerFill: (pct) => ({
    height: '100%', background: 'var(--accent)',
    width: `${pct}%`, transition: 'width 1s linear',
    borderRadius: '1px',
  }),
}

export default function SuggestionsColumn({
  batches, isLoading, onRefresh, onSuggestionClick,
  countdown, refreshInterval,
}) {
  const timerPct = refreshInterval > 0 ? ((refreshInterval - countdown) / refreshInterval) * 100 : 0

  return (
    <div style={S.col}>
      <div style={S.header}>
        <span style={S.title}>Live Suggestions</span>
        <div style={S.actions}>
          <button
            style={S.refreshBtn(isLoading)}
            onClick={onRefresh}
            disabled={isLoading}
          >
            <svg
              width="12" height="12" viewBox="0 0 12 12" fill="none"
              className={isLoading ? 'spin' : ''}
            >
              <path d="M10 6A4 4 0 1 1 6 2M6 2L8.5 4.5M6 2L3.5 4.5"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {isLoading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Timer bar */}
      <div style={S.timerRow}>
        <span>next in {countdown}s</span>
        <div style={S.timerBar(timerPct)}>
          <div style={S.timerFill(timerPct)} />
        </div>
      </div>

      <div style={{ height: '12px' }} />

      <div style={S.body}>
        {isLoading && batches.length === 0 && (
          <div style={S.loadingRow}>
            {[0, 1, 2].map(i => (
              <div key={i} style={S.skeleton(i === 1 ? '90%' : '100%')} />
            ))}
          </div>
        )}

        {batches.length === 0 && !isLoading && (
          <div style={S.emptyState}>
            <div style={S.emptyIcon}>✦</div>
            <div>
              <div style={{ color: 'var(--text-2)', fontSize: '13px', marginBottom: '4px' }}>
                Suggestions will appear here
              </div>
              <div style={{ fontSize: '12px' }}>
                Start recording or hit Refresh to generate
              </div>
            </div>
          </div>
        )}

        {batches.map((batch, bi) => (
          <div key={batch.id} style={S.batchBlock} className={bi === 0 ? 'anim-in' : ''}>
            {bi > 0 && <div style={S.divider} />}
            <div style={S.batchHeader}>
              <span style={S.batchTime}>
                {new Date(batch.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span style={S.batchBadge}>batch #{batches.length - bi}</span>
            </div>
            {batch.suggestions.map(s => (
              <SuggestionCard
                key={s.id}
                suggestion={s}
                onClick={onSuggestionClick}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}