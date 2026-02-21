/**
 * Main booking screen — orchestrates the entire voice-first UX.
 *
 * Flow:
 *  1. User holds MicButton → whisper.rn records
 *  2. Release → transcript sent via WebSocket
 *  3. Backend responds with STATE_UPDATE + MP3 audio
 *  4. TTS plays; user can barge-in by speaking (VAD fires → stopAudio + new recording)
 *  5. Repeat until BOOKED
 */
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import { useBookingFlow } from "../hooks/useBookingFlow";
import { useWhisper } from "../hooks/useWhisper";
import { MicButton } from "../components/MicButton";
import { TranscriptDisplay } from "../components/TranscriptDisplay";
import { ProviderList } from "../components/ProviderList";
import { StateIndicator } from "../components/StateIndicator";
import type { ProviderSummary } from "../hooks/useWebSocket";

export default function BookingScreen() {
  const flow = useBookingFlow();
  const [micState, setMicState] = useState<"idle" | "listening" | "processing">("idle");

  const whisper = useWhisper(async (text: string) => {
    // Called when user stops recording and transcript is ready
    setMicState("processing");
    flow.sendTranscript(text);
    // Reset after a moment (server response will trigger state update)
    setTimeout(() => setMicState("idle"), 500);
  });

  const handlePressIn = useCallback(async () => {
    if (micState !== "idle") return;

    // Barge-in: stop TTS if playing
    if (flow.isAudioPlaying()) {
      flow.handleBargeIn();
    }

    setMicState("listening");
    await whisper.start();
  }, [micState, flow, whisper]);

  const handlePressOut = useCallback(async () => {
    if (micState !== "listening") return;
    await whisper.stop();
    // micState will be set to "processing" by onTranscript callback above
  }, [micState, whisper]);

  const handleProviderSelect = useCallback(
    (provider: ProviderSummary) => {
      // Tap on provider card → send as if user said "the first one" / name
      flow.sendTranscript(`I choose ${provider.name}`);
    },
    [flow],
  );

  const isReady = whisper.status === "ready";

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Voice Booking</Text>
          <StateIndicator state={flow.bookingState} wsStatus={flow.wsStatus} />
        </View>

        {/* Download progress */}
        {whisper.status === "downloading" && (
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              Downloading voice model… {Math.round(whisper.downloadProgress * 100)}%
            </Text>
          </View>
        )}

        {/* Current AI prompt */}
        <View style={styles.promptBox}>
          <Text style={styles.prompt}>{flow.currentPrompt}</Text>
        </View>

        {/* Live transcript */}
        <TranscriptDisplay
          transcript={whisper.transcript}
          isListening={whisper.isListening}
        />

        {/* Provider list */}
        {flow.bookingState === "PROVIDER_SELECTION" && flow.providers.length > 0 && (
          <View style={styles.providerSection}>
            <Text style={styles.sectionLabel}>Available cleaners</Text>
            <ProviderList providers={flow.providers} onSelect={handleProviderSelect} />
          </View>
        )}

        {/* Booking confirmation details */}
        {flow.bookingState === "CONFIRMING" && flow.booking && (
          <View style={styles.bookingCard}>
            <Text style={styles.bookingTitle}>Booking Summary</Text>
            {Object.entries(flow.booking)
              .filter(([, v]) => v != null)
              .map(([k, v]) => (
                <Text key={k} style={styles.bookingRow}>
                  <Text style={styles.bookingKey}>{formatKey(k)}: </Text>
                  {String(v)}
                </Text>
              ))}
          </View>
        )}

        {/* Turn counter */}
        <Text style={styles.turns}>Turn {flow.turnCount} / 8</Text>
      </ScrollView>

      {/* Mic button fixed at bottom */}
      <View style={styles.micArea}>
        <MicButton
          state={micState}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={!isReady || flow.bookingState === "BOOKED"}
        />
        {!isReady && whisper.status !== "downloading" && (
          <Text style={styles.loadingText}>
            {whisper.status === "loading" ? "Loading voice model…" : "Initialising…"}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

function formatKey(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#111827" },
  scroll: { paddingBottom: 160, gap: 16 },
  header: { paddingHorizontal: 16, paddingTop: Platform.OS === "android" ? 40 : 16, gap: 10 },
  title: { color: "#F9FAFB", fontSize: 24, fontWeight: "700" },
  progressContainer: { marginHorizontal: 16, padding: 12, backgroundColor: "#1F2937", borderRadius: 10 },
  progressText: { color: "#93C5FD", textAlign: "center" },
  promptBox: {
    marginHorizontal: 16,
    backgroundColor: "#1E3A5F",
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: "#3B82F6",
  },
  prompt: { color: "#E0F2FE", fontSize: 16, lineHeight: 24 },
  providerSection: { gap: 8 },
  sectionLabel: { color: "#9CA3AF", fontSize: 13, paddingHorizontal: 16 },
  bookingCard: {
    marginHorizontal: 16,
    backgroundColor: "#1F2937",
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
  bookingTitle: { color: "#F9FAFB", fontWeight: "600", fontSize: 15, marginBottom: 4 },
  bookingRow: { color: "#D1D5DB", fontSize: 14 },
  bookingKey: { color: "#9CA3AF" },
  turns: { color: "#4B5563", fontSize: 12, textAlign: "center" },
  micArea: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === "android" ? 24 : 40,
    paddingTop: 16,
    backgroundColor: "#0F172A",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#1F2937",
  },
  loadingText: { color: "#6B7280", fontSize: 12, marginTop: 6 },
});
