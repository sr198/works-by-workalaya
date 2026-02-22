/**
 * Web Speech API wrapper with the same interface as useWhisper.
 * Used automatically when running in a browser (npx expo start --web).
 *
 * Browser support: Chrome 33+, Edge 79+. Firefox requires enabling a flag.
 * Microphone permission is requested on the first call to start().
 */
import { useState, useRef, useCallback, useEffect } from "react";
import type { UseWhisperReturn, WhisperStatus } from "./useWhisper";

export function useWebSpeech(onTranscript: (text: string) => void): UseWhisperReturn {
  const [status, setStatus] = useState<WhisperStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);

  // Refs so event handlers always see current values without re-subscribing
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef("");
  const onTranscriptRef = useRef(onTranscript);
  const stopResolveRef = useRef<((t: string) => void) | null>(null);

  // Keep callback ref fresh on every render to avoid stale closures
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  });

  // Mount: wire up the SpeechRecognition instance once
  useEffect(() => {
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      console.warn("[webSpeech] SpeechRecognition not available — use Chrome or Edge");
      setStatus("error");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let finalChunk = "";
      let interimChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalChunk += result[0].transcript;
        } else {
          interimChunk += result[0].transcript;
        }
      }
      if (finalChunk) transcriptRef.current += finalChunk;
      setTranscript(transcriptRef.current + interimChunk);
    };

    recognition.onend = () => {
      setIsListening(false);
      setStatus("ready");
      const final = transcriptRef.current.trim();
      transcriptRef.current = "";
      setTranscript("");

      // Resolve the promise returned by stop()
      if (stopResolveRef.current) {
        stopResolveRef.current(final);
        stopResolveRef.current = null;
      }
      if (final) onTranscriptRef.current(final);
    };

    recognition.onerror = (event: any) => {
      // "aborted" fires whenever we call stop() — not a real error
      if (event.error === "aborted") return;
      console.error("[webSpeech] error:", event.error);
      setStatus("error");
      setIsListening(false);
      transcriptRef.current = "";
      setTranscript("");
    };

    recognitionRef.current = recognition;
    setStatus("ready");

    return () => {
      recognition.abort();
    };
  }, []); // mount-only — recognition instance is stable

  const start = useCallback(async () => {
    if (!recognitionRef.current || status !== "ready") return;
    transcriptRef.current = "";
    setTranscript("");
    setStatus("recording");
    setIsListening(true);
    recognitionRef.current.start();
  }, [status]);

  const stop = useCallback(async (): Promise<string> => {
    if (!recognitionRef.current) return "";
    return new Promise<string>((resolve) => {
      stopResolveRef.current = resolve;
      recognitionRef.current.stop();
      // onend fires async and resolves the promise above
    });
  }, []);

  return {
    status,
    transcript,
    isListening,
    downloadProgress: 1, // no model download on web
    start,
    stop,
  };
}