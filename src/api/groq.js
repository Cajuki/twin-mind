// Groq API client — all model calls go through here

const GROQ_BASE = 'https://api.groq.com/openai/v1'
const TRANSCRIPTION_MODEL = 'whisper-large-v3'
const CHAT_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'

export async function transcribeAudio(audioBlob, apiKey) {
  const form = new FormData()
  form.append('file', audioBlob, 'audio.webm')
  form.append('model', TRANSCRIPTION_MODEL)
  form.append('response_format', 'json')
  form.append('language', 'en')

  const res = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Transcription failed: ${res.status}`)
  }

  const data = await res.json()
  return data.text?.trim() || ''
}

export async function generateSuggestions(transcript, settings, apiKey) {
  const contextWindow = parseInt(settings.suggestionContextWindow) || 3000
  const recentTranscript = transcript.slice(-contextWindow)

  const systemPrompt = settings.suggestionSystemPrompt

  const userPrompt = `Here is the recent conversation transcript:

<transcript>
${recentTranscript}
</transcript>

${settings.suggestionUserPrompt}`

  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      max_tokens: 1024,
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Suggestions failed: ${res.status}`)
  }

  const data = await res.json()
  const raw = data.choices[0]?.message?.content || ''
  return parseSuggestions(raw)
}

export async function expandSuggestion(suggestion, transcript, settings, apiKey) {
  const contextWindow = parseInt(settings.expandContextWindow) || 6000
  const recentTranscript = transcript.slice(-contextWindow)

  const systemPrompt = settings.expandSystemPrompt

  const userPrompt = `Full conversation transcript for context:

<transcript>
${recentTranscript}
</transcript>

The user clicked this suggestion card:
<suggestion>
${suggestion.label}: ${suggestion.preview}
</suggestion>

${settings.expandUserPrompt}`

  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      max_tokens: 1500,
      temperature: 0.6,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Expand failed: ${res.status}`)
  }

  const data = await res.json()
  return data.choices[0]?.message?.content || ''
}

export async function chatCompletion(messages, transcript, settings, apiKey) {
  const contextWindow = parseInt(settings.chatContextWindow) || 8000
  const recentTranscript = transcript.slice(-contextWindow)

  const systemPrompt = `${settings.chatSystemPrompt}

Current meeting transcript for context:
<transcript>
${recentTranscript || '(no transcript yet)'}
</transcript>`

  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      max_tokens: 2000,
      temperature: 0.6,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Chat failed: ${res.status}`)
  }

  return res.body.getReader()
}

// Parse the raw JSON response from the suggestions model
function parseSuggestions(raw) {
  // Try to extract JSON from the response
  const jsonMatch = raw.match(/\[[\s\S]*\]/)
  if (!jsonMatch) {
    console.warn('Could not parse suggestions JSON:', raw)
    return []
  }

  try {
    const parsed = JSON.parse(jsonMatch[0])
    return parsed.slice(0, 3).map((s, i) => ({
      id: `${Date.now()}-${i}`,
      type: s.type || 'insight',
      label: s.label || 'Insight',
      preview: s.preview || '',
      detail: s.detail || '',
    }))
  } catch (e) {
    console.warn('JSON parse error:', e)
    return []
  }
}