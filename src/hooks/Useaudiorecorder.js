import { useRef, useState, useCallback, useEffect } from 'react'
import { transcribeAudio } from '../api/groq'

const CHUNK_INTERVAL_MS = 30_000 // 30 seconds

export function useAudioRecorder({ apiKey, onTranscriptChunk, onError }) {
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)
  const chunkTimerRef = useRef(null)

  const processChunk = useCallback(async (chunks) => {
    if (!chunks.length || !apiKey) return

    const blob = new Blob(chunks, { type: 'audio/webm' })
    if (blob.size < 1000) return // skip tiny/empty blobs

    setIsTranscribing(true)
    try {
      const text = await transcribeAudio(blob, apiKey)
      if (text) {
        onTranscriptChunk(text)
      }
    } catch (err) {
      onError?.(err.message)
    } finally {
      setIsTranscribing(false)
    }
  }, [apiKey, onTranscriptChunk, onError])

  const flushChunk = useCallback(() => {
    if (!mediaRecorderRef.current) return

    // Stop current recorder to force dataavailable, then restart
    const mr = mediaRecorderRef.current
    const currentChunks = [...chunksRef.current]
    chunksRef.current = []

    if (mr.state === 'recording') {
      mr.stop()
      processChunk(currentChunks)

      // Restart after brief pause
      setTimeout(() => {
        if (streamRef.current) {
          startRecorderOnStream(streamRef.current)
        }
      }, 200)
    }
  }, [processChunk])

  const startRecorderOnStream = useCallback((stream) => {
    // Pick best supported MIME
    const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'].find(
      t => MediaRecorder.isTypeSupported(t)
    ) || ''

    const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {})
    mediaRecorderRef.current = mr
    chunksRef.current = []

    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    mr.start(1000) // collect data every 1s
  }, [])

  const startRecording = useCallback(async () => {
    if (!apiKey) {
      onError?.('No API key — open Settings to add your Groq key')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      startRecorderOnStream(stream)
      setIsRecording(true)

      // Set up periodic chunk processing
      chunkTimerRef.current = setInterval(flushChunk, CHUNK_INTERVAL_MS)
    } catch (err) {
      onError?.('Microphone access denied: ' + err.message)
    }
  }, [apiKey, startRecorderOnStream, flushChunk, onError])

  const stopRecording = useCallback(async () => {
    clearInterval(chunkTimerRef.current)
    chunkTimerRef.current = null

    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }

    // Flush any remaining audio
    const remaining = [...chunksRef.current]
    chunksRef.current = []
    if (remaining.length) {
      await processChunk(remaining)
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }

    mediaRecorderRef.current = null
    setIsRecording(false)
  }, [processChunk])

  // Manual flush - used by refresh button
  const flushNow = useCallback(async () => {
    if (!isRecording) return

    const current = [...chunksRef.current]
    chunksRef.current = []

    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
      setTimeout(() => {
        if (streamRef.current) startRecorderOnStream(streamRef.current)
      }, 200)
    }

    if (current.length) {
      await processChunk(current)
    }
  }, [isRecording, processChunk, startRecorderOnStream])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(chunkTimerRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  return { isRecording, isTranscribing, startRecording, stopRecording, flushNow }
}
