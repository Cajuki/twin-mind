export function exportSession({ transcript, suggestionBatches, chatMessages }) {
  const timestamp = new Date().toISOString()

  // JSON export
  const data = {
    exported_at: timestamp,
    transcript: {
      full_text: transcript,
      word_count: transcript.split(/\s+/).filter(Boolean).length,
    },
    suggestion_batches: suggestionBatches.map((batch, i) => ({
      batch_number: i + 1,
      timestamp: batch.timestamp,
      suggestions: batch.suggestions.map(s => ({
        type: s.type,
        label: s.label,
        preview: s.preview,
        detail: s.detail,
      })),
    })),
    chat_history: chatMessages.map(m => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp || timestamp,
    })),
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `twinmind-session-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function exportSessionText({ transcript, suggestionBatches, chatMessages }) {
  const lines = []
  const hr = '─'.repeat(60)

  lines.push('TWINMIND SESSION EXPORT')
  lines.push(`Exported: ${new Date().toLocaleString()}`)
  lines.push(hr)
  lines.push('')

  lines.push('TRANSCRIPT')
  lines.push(hr)
  lines.push(transcript || '(empty)')
  lines.push('')

  lines.push('SUGGESTION BATCHES')
  lines.push(hr)
  suggestionBatches.forEach((batch, i) => {
    lines.push(`Batch ${i + 1} — ${new Date(batch.timestamp).toLocaleTimeString()}`)
    batch.suggestions.forEach((s, j) => {
      lines.push(`  ${j + 1}. [${s.type.toUpperCase()}] ${s.label}`)
      lines.push(`     Preview: ${s.preview}`)
      lines.push(`     Detail: ${s.detail}`)
    })
    lines.push('')
  })

  lines.push('CHAT HISTORY')
  lines.push(hr)
  chatMessages.forEach(m => {
    const role = m.role === 'user' ? 'YOU' : 'TWINMIND'
    const ts = m.timestamp ? new Date(m.timestamp).toLocaleTimeString() : ''
    lines.push(`[${ts}] ${role}`)
    lines.push(m.content)
    lines.push('')
  })

  const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `twinmind-session-${Date.now()}.txt`
  a.click()
  URL.revokeObjectURL(url)
}