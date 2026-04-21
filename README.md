# TwinMind AI Meeting Copilot

A real-time AI meeting copilot that listens to your conversations, transcribes them, and surfaces contextually-aware suggestions while you talk.

## Live Demo
Deploy on Vercel: `vercel --prod` after setup.

## Stack

- **Frontend**: React 18 + Vite (no extra routing needed — single page)
- **Styling**: Pure CSS-in-JS with CSS variables — no Tailwind/styled-components
- **Audio**: Web Audio API + MediaRecorder (30s chunking → Whisper Large V3)
- **Transcription**: Groq Whisper Large V3
- **AI**: Groq `meta-llama/llama-4-scout-17b-16e-instruct` (fast, high quality)
- **Streaming**: SSE streaming for chat responses
- **Storage**: localStorage for API key + settings only. No backend, no database.

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`, click Settings, paste your Groq API key.

Get a free Groq API key at: https://console.groq.com

## Architecture

```
src/
├── api/
│   └── groq.js          # All Groq API calls (transcription, suggestions, chat)
├── components/
│   ├── TranscriptColumn.jsx   # Left column: mic + live transcript
│   ├── SuggestionsColumn.jsx  # Middle column: suggestion batches
│   ├── SuggestionCard.jsx     # Individual suggestion card
│   ├── ChatColumn.jsx         # Right column: streaming chat
│   └── SettingsPanel.jsx      # Settings modal
├── hooks/
│   └── useAudioRecorder.js    # MediaRecorder + chunk management
└── utils/
    ├── defaults.js            # Prompts + default settings
    └── export.js              # JSON/text export
```

## Prompt Strategy

### The Core Problem
Generic "summarize this" prompts produce generic suggestions. The key insight is that **what's useful changes based on the conversation moment**:
- A factual claim → fact-check it
- A question → answer it directly  
- A decision being made → surface tradeoffs
- A technical topic → add relevant context
- A lull → suggest a productive follow-up

### Solution: Moment-Aware Suggestions
The suggestion prompt instructs the model to first identify **what type of moment** is happening, then select the most appropriate intervention type from: `answer`, `question`, `fact_check`, `talking_point`, `context`, `clarify`, `followup`.

### Preview-First Design
Each suggestion's `preview` field must **deliver value on its own** — not a teaser like "Click to learn more about React hooks" but an actual useful answer: "React's useEffect runs after every render by default; add a dependency array to control when it fires." This is the most important UX decision.

### Context Window Strategy
- **Suggestions**: 4000 chars of recent transcript — enough context, not overwhelming
- **Expand on click**: 8000 chars — deeper context for detailed answers
- **Chat**: 10000 chars — full session awareness

### Streaming for Chat
Chat uses SSE streaming so the user sees the first tokens in ~300ms, not a 3-second blank wait.

### Structured Output
Suggestions use JSON-in-response (not function calling) because Groq's JSON mode is reliable and avoids latency overhead of tool-use parsing. The parser extracts the JSON array from the response, tolerating minor formatting variations.

## Tradeoffs

| Decision | Rationale |
|---|---|
| 30s audio chunks | Balances transcription freshness vs API cost. Lower = more calls + cost. |
| No backend | Assignment scope — all API calls go client → Groq directly |
| localStorage for key | Simple, private, no server needed |
| DM Mono font | Monospace gives a "live terminal" feel appropriate for a meeting tool |
| Suggestion JSON parsing | More robust than function calling for this use case; easier to prompt |
| Auto-refresh countdown UI | Builds trust — user can see system is alive and working |

## Features

- Live audio transcription (Whisper Large V3 via Groq)
- 3 contextual suggestions every 30s (or manual refresh)  
- Suggestion types: answer, question, fact-check, talking point, context, clarify, follow-up
- Streaming chat with full transcript context
- Click any suggestion → immediate detailed expansion in chat
- Editable prompts + context windows in Settings
- Export full session (transcript + suggestion batches + chat) as JSON
- No login, no server, no data persistence