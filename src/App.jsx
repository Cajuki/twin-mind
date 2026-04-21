import { useState, useEffect, useRef, useCallback } from 'react'
import TranscriptColumn from './components/TranscriptColumn'
import SuggestionsColumn from './components/SuggestionsColumn'
import ChatColumn from './components/ChatColumn'
import SettingsPanel from './components/SettingsPanel'
import { useAudioRecorder } from './hooks/useAudioRecorder'
import { generateSuggestions, expandSuggestion } from './api/groq'
import { DEFAULT_SETTINGS } from './utils/defaults'
import { exportSession } from './utils/export'

const LS_KEY_SETTINGS = 'twinmind_settings'
const LS_KEY_APIKEY = 'twinmind_apikey'

function loadSettings() {
  try {
    const raw = localStorage.getItem(LS_KEY_SETTINGS)
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS
  } catch { return DEFAULT_SETTINGS }
}

const S = {
  app: {
    height: '100vh', display: 'flex', flexDirection: 'column',
    background: 'var(--bg)',
  },
  topbar: {
    height: '52px', borderBottom: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 20px', flexShrink: 0,
    background: 'var(--bg-2)',
  },
  logo: {
    fontFamily: 'var(--font-head)', fontSize: '16px', fontWeight: 800,
    letterSpacing: '-0.03em', color: 'var(--text)',
    display: 'flex', alignItems: 'center', gap: '8px',
  },
  logoAccent: { color: 'var(--accent)' },
  logoDot: {
    width: '6px', height: '6px', borderRadius: '50%',
    background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)',
  },
  topActions: { display: 'flex', gap: '8px', alignItems: 'center' },
  btn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '6px 12px',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: '8px', cursor: 'pointer',
    fontSize: '12px', color: 'var(--text-2)',
    transition: 'all 0.15s', fontFamily: 'var(--font-mono)',
  },
  columns: {
    flex: 1, display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '0',
    overflow: 'hidden',
  },
  colWrap: {
    padding: '20px 16px',
    borderRight: '1px solid var(--border)',
    overflow: 'hidden', display: 'flex', flexDirection: 'column',
  },
  errorBanner: {
    position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
    background: 'rgba(242,87,87,0.15)', border: '1px solid rgba(242,87,87,0.4)',
    color: 'var(--red)', borderRadius: '10px', padding: '10px 20px',
    fontSize: '13px', zIndex: 500, maxWidth: '500px', textAlign: 'center',
    animation: 'fadeSlideIn 0.2s ease',
  },
  noKeyBanner: {
    background: 'rgba(124,106,247,0.1)', border: '1px solid rgba(124,106,247,0.3)',
    borderRadius: '10px', padding: '10px 16px', margin: '0 16px 12px',
    fontSize: '12px', color: 'var(--accent)', display: 'flex',
    alignItems: 'center', gap: '8px', flexShrink: 0,
  },
}

export default function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(LS_KEY_APIKEY) || '')
  const [settings, setSettings] = useState(loadSettings)
  const [showSettings, setShowSettings] = useState(false)

  // Transcript: array of { id, text, timestamp }
  const [transcriptChunks, setTranscriptChunks] = useState([])
  const fullTranscript = transcriptChunks.map(c => c.text).join('\n')

  // Suggestions: array of { id, timestamp, suggestions[] }
  const [suggestionBatches, setSuggestionBatches] = useState([])
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false)

  // Chat messages
  const [chatMessages, setChatMessages] = useState([])

  // Error state
  const [error, setError] = useState(null)
  const errorTimerRef = useRef(null)

  // Countdown timer for auto-refresh
  const [countdown, setCountdown] = useState(parseInt(settings.refreshInterval) || 30)
  const countdownRef = useRef(countdown)
  countdownRef.current = countdown

  const showError = useCallback((msg) => {
    setError(msg)
    clearTimeout(errorTimerRef.current)
    errorTimerRef.current = setTimeout(() => setError(null), 5000)
  }, [])

  const handleTranscriptChunk = useCallback((text) => {
    setTranscriptChunks(prev => [...prev, {
      id: Date.now(),
      text,
      timestamp: Date.now(),
    }])
  }, [])

  const { isRecording, isTranscribing, startRecording, stopRecording, flushNow } =
    useAudioRecorder({
      apiKey,
      onTranscriptChunk: handleTranscriptChunk,
      onError: showError,
    })

  const fetchSuggestions = useCallback(async (transcript) => {
    if (!apiKey || !transcript.trim()) return
    setIsSuggestionsLoading(true)
    try {
      const suggestions = await generateSuggestions(transcript, settings, apiKey)
      if (suggestions.length > 0) {
        setSuggestionBatches(prev => [{
          id: Date.now(),
          timestamp: Date.now(),
          suggestions,
        }, ...prev])
      }
    } catch (err) {
      showError('Suggestions error: ' + err.message)
    } finally {
      setIsSuggestionsLoading(false)
    }
  }, [apiKey, settings, showError])

  const handleRefresh = useCallback(async () => {
    if (isRecording) await flushNow()
    const transcript = transcriptChunks.map(c => c.text).join('\n')
    await fetchSuggestions(transcript)
    setCountdown(parseInt(settings.refreshInterval) || 30)
  }, [isRecording, flushNow, transcriptChunks, fetchSuggestions, settings.refreshInterval])

  // Auto-refresh countdown
  useEffect(() => {
    const interval = parseInt(settings.refreshInterval) || 30
    setCountdown(interval)

    const tick = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Trigger refresh
          const transcript = transcriptChunks.map(c => c.text).join('\n')
          if (transcript.trim()) fetchSuggestions(transcript)
          return interval
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(tick)
  }, [settings.refreshInterval, fetchSuggestions])

  // When a suggestion is clicked — expand it and add to chat
  const handleSuggestionClick = useCallback(async (suggestion) => {
    if (!apiKey) { showError('Add your Groq API key in Settings'); return }

    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: `${suggestion.label}: ${suggestion.preview}`,
      suggestionSource: suggestion.type,
      timestamp: new Date().toISOString(),
    }

    const assistantMsg = {
      id: Date.now() + 1,
      role: 'assistant',
      content: '',
      streaming: true,
      timestamp: new Date().toISOString(),
    }

    setChatMessages(prev => [...prev, userMsg, assistantMsg])

    try {
      const detail = await expandSuggestion(suggestion, fullTranscript, settings, apiKey)
      setChatMessages(prev =>
        prev.map(m => m.id === assistantMsg.id ? { ...m, content: detail, streaming: false } : m)
      )
    } catch (err) {
      setChatMessages(prev =>
        prev.map(m => m.id === assistantMsg.id
          ? { ...m, content: `Error: ${err.message}`, streaming: false }
          : m)
      )
    }
  }, [apiKey, fullTranscript, settings, showError])

  const saveApiKey = (key) => {
    setApiKey(key)
    localStorage.setItem(LS_KEY_APIKEY, key)
  }

  const saveSettings = (s) => {
    setSettings(s)
    localStorage.setItem(LS_KEY_SETTINGS, JSON.stringify(s))
  }

  const handleExport = () => {
    exportSession({
      transcript: fullTranscript,
      suggestionBatches,
      chatMessages,
    })
  }

  return (
    <div style={S.app}>
      {/* Top bar */}
      <div style={S.topbar}>
        <div style={S.logo}>
          <div style={S.logoDot} />
          Twin<span style={S.logoAccent}>Mind</span>
        </div>
        <div style={S.topActions}>
          <button
            style={S.btn}
            onClick={handleExport}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-2)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1V8M6 8L3 5M6 8L9 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M1 10H11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            Export session
          </button>
          <button
            style={S.btn}
            onClick={() => setShowSettings(true)}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-2)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="2" stroke="currentColor" strokeWidth="1.3" />
              <path d="M6 1V2M6 10V11M1 6H2M10 6H11M2.5 2.5L3.2 3.2M8.8 8.8L9.5 9.5M2.5 9.5L3.2 8.8M8.8 3.2L9.5 2.5"
                stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            Settings
          </button>
        </div>
      </div>

      {/* No API key banner */}
      {!apiKey && (
        <div style={S.noKeyBanner}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3" />
            <path d="M7 4V7M7 10H7.01" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          No Groq API key detected. Open Settings to add yours — it's stored only in your browser.
          <button
            onClick={() => setShowSettings(true)}
            style={{ marginLeft: 'auto', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', fontFamily: 'var(--font-mono)', textDecoration: 'underline' }}
          >
            Open Settings
          </button>
        </div>
      )}

      {/* Three columns */}
      <div style={S.columns}>
        <div style={S.colWrap}>
          <TranscriptColumn
            chunks={transcriptChunks}
            isRecording={isRecording}
            isTranscribing={isTranscribing}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
          />
        </div>

        <div style={S.colWrap}>
          <SuggestionsColumn
            batches={suggestionBatches}
            isLoading={isSuggestionsLoading}
            onRefresh={handleRefresh}
            onSuggestionClick={handleSuggestionClick}
            countdown={countdown}
            refreshInterval={parseInt(settings.refreshInterval) || 30}
          />
        </div>

        <div style={{ ...S.colWrap, borderRight: 'none' }}>
          <ChatColumn
            messages={chatMessages}
            onMessagesChange={setChatMessages}
            transcript={fullTranscript}
            settings={settings}
            apiKey={apiKey}
          />
        </div>
      </div>

      {/* Settings modal */}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onSave={saveSettings}
          apiKey={apiKey}
          onApiKeySave={saveApiKey}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Error banner */}
      {error && (
        <div style={S.errorBanner}>{error}</div>
      )}
    </div>
  )
}