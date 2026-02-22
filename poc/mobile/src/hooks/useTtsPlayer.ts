/**
 * expo-av based TTS audio player.
 *
 * Receives raw MP3 ArrayBuffer from WebSocket and plays it.
 * Supports barge-in: stopAsync() immediately halts playback.
 */
import { useRef, useCallback } from "react";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";

export interface UseTtsPlayerReturn {
  playAudio: (data: ArrayBuffer) => Promise<void>;
  stopAudio: () => Promise<void>;
  isPlaying: () => boolean;
}

export function useTtsPlayer(): UseTtsPlayerReturn {
  const soundRef = useRef<Audio.Sound | null>(null);
  const playingRef = useRef(false);

  const stopAudio = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch {
        // ignore errors on stop (may already be stopped)
      }
      soundRef.current = null;
    }
    playingRef.current = false;
  }, []);

  const playAudio = useCallback(async (data: ArrayBuffer) => {
    // Stop any existing playback
    await stopAudio();

    // Write MP3 bytes to a temp file (expo-av requires a URI)
    const tmpPath = `${FileSystem.cacheDirectory}tts_${Date.now()}.mp3`;
    const base64 = arrayBufferToBase64(data);
    await FileSystem.writeAsStringAsync(tmpPath, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const { sound } = await Audio.Sound.createAsync(
      { uri: tmpPath },
      { shouldPlay: true },
    );

    soundRef.current = sound;
    playingRef.current = true;

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        playingRef.current = false;
        void sound.unloadAsync().catch(() => null);
        soundRef.current = null;
        // Clean up temp file
        FileSystem.deleteAsync(tmpPath, { idempotent: true }).catch(() => null);
      }
    });
  }, [stopAudio]);

  const isPlaying = useCallback(() => playingRef.current, []);

  return { playAudio, stopAudio, isPlaying };
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}
