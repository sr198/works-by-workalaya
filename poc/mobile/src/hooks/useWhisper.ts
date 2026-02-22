/**
 * whisper.rn integration — on-device STT with VAD.
 *
 * Downloads ggml-base.en.bin (~142 MB) on first launch, caches in document dir.
 * Exposes start/stop transcription and a live transcript string.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import * as FileSystem from "expo-file-system";
import { initWhisper, type WhisperContext } from "whisper.rn";

const MODEL_URL =
  "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin";
const MODEL_FILENAME = "ggml-base.en.bin";

export type WhisperStatus = "idle" | "downloading" | "loading" | "ready" | "recording" | "error";

export interface UseWhisperReturn {
  status: WhisperStatus;
  transcript: string;
  isListening: boolean;
  downloadProgress: number; // 0-1
  start: () => Promise<void>;
  stop: () => Promise<string>; // returns final transcript
}

export function useWhisper(onTranscript: (text: string) => void): UseWhisperReturn {
  const [status, setStatus] = useState<WhisperStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const ctxRef = useRef<WhisperContext | null>(null);
  const stopRef = useRef<(() => Promise<void>) | null>(null);

  // Initialize whisper on mount
  useEffect(() => {
    void init();
    return () => {
      ctxRef.current?.release().catch(console.error);
    };
  }, []);

  async function init() {
    try {
      const modelPath = await ensureModel();
      setStatus("loading");
      ctxRef.current = await initWhisper({ filePath: modelPath });
      setStatus("ready");
    } catch (e) {
      console.error("[whisper] init failed:", e);
      setStatus("error");
    }
  }

  async function ensureModel(): Promise<string> {
    const dir = FileSystem.documentDirectory!;
    const modelPath = `${dir}${MODEL_FILENAME}`;

    const info = await FileSystem.getInfoAsync(modelPath);
    if (info.exists) return modelPath;

    setStatus("downloading");
    const dl = FileSystem.createDownloadResumable(
      MODEL_URL,
      modelPath,
      {},
      (progress) => {
        const pct = progress.totalBytesWritten / progress.totalBytesExpectedToWrite;
        setDownloadProgress(pct);
      },
    );
    await dl.downloadAsync();
    return modelPath;
  }

  const start = useCallback(async () => {
    if (!ctxRef.current || status !== "ready") return;

    setStatus("recording");
    setIsListening(true);
    setTranscript("");

    const { stop, subscribe } = await ctxRef.current.transcribeRealtime({
      language: "en",
      realtimeAudioSec: 300,
      realtimeAudioSliceSec: 30,
    });

    stopRef.current = stop;

    subscribe((evt) => {
      if (evt.isCapturing && evt.data?.result) {
        setTranscript(evt.data.result);
      }
    });
  }, [status]);

  const stop = useCallback(async (): Promise<string> => {
    if (stopRef.current) {
      await stopRef.current();
      stopRef.current = null;
    }
    setIsListening(false);
    setStatus("ready");

    const final = transcript;
    if (final.trim()) {
      onTranscript(final.trim());
    }
    setTranscript("");
    return final.trim();
  }, [transcript, onTranscript]);

  return { status, transcript, isListening, downloadProgress, start, stop };
}
