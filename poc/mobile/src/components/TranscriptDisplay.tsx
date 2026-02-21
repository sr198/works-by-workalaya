/**
 * Rolling transcript — shows live partial text from whisper.rn.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface Props {
  transcript: string;
  isListening: boolean;
}

export function TranscriptDisplay({ transcript, isListening }: Props) {
  if (!transcript && !isListening) return null;

  return (
    <View style={styles.container}>
      {isListening && !transcript && (
        <Text style={styles.placeholder}>Listening…</Text>
      )}
      {transcript ? (
        <Text style={styles.text}>{transcript}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#1F2937",
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    minHeight: 50,
  },
  text: { color: "#F9FAFB", fontSize: 15, lineHeight: 22 },
  placeholder: { color: "#6B7280", fontSize: 14, fontStyle: "italic" },
});
