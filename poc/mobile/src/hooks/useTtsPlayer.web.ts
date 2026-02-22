/**
 * Web TTS player — receives the MP3 ArrayBuffer from WebSocket and plays it
 * via a Blob URL + HTMLAudioElement. No file system or expo-av needed.
 *
 * Same interface as useTtsPlayer (native) so useBookingFlow works unchanged.
 */
import { useRef, useCallback } from "react";
import type { UseTtsPlayerReturn } from "./useTtsPlayer";

export function useTtsPlayer(): UseTtsPlayerReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const playingRef = useRef(false);

  const stopAudio = useCallback(async () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    playingRef.current = false;
  }, []);

  const playAudio = useCallback(
    async (data: ArrayBuffer) => {
      await stopAudio();

      const blob = new Blob([data], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;

      const audio = new window.Audio(url);
      audioRef.current = audio;
      playingRef.current = true;

      audio.onended = () => {
        playingRef.current = false;
        URL.revokeObjectURL(url);
        blobUrlRef.current = null;
        audioRef.current = null;
      };

      audio.onerror = () => {
        playingRef.current = false;
      };

      await audio.play();
    },
    [stopAudio],
  );

  const isPlaying = useCallback(() => playingRef.current, []);

  return { playAudio, stopAudio, isPlaying };
}
