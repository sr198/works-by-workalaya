/**
 * Animated mic button — three states: idle, listening, processing.
 */
import React, { useEffect, useRef } from "react";
import {
  TouchableOpacity,
  View,
  Text,
  Animated,
  StyleSheet,
} from "react-native";

type MicState = "idle" | "listening" | "processing";

interface Props {
  state: MicState;
  onPressIn: () => void;
  onPressOut: () => void;
  disabled?: boolean;
}

export function MicButton({ state, onPressIn, onPressOut, disabled }: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (state === "listening") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.25, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
      ).start();
    } else {
      pulseAnim.stopAnimation();
      Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
  }, [state, pulseAnim]);

  const bgColor = state === "listening" ? "#EF4444" : state === "processing" ? "#F59E0B" : "#3B82F6";
  const label = state === "listening" ? "Release to send" : state === "processing" ? "Processing…" : "Hold to speak";

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.pulse, { backgroundColor: bgColor, opacity: 0.25, transform: [{ scale: pulseAnim }] }]} />
      <TouchableOpacity
        style={[styles.button, { backgroundColor: bgColor }]}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled || state === "processing"}
        activeOpacity={0.8}
      >
        <Text style={styles.icon}>{state === "listening" ? "🎙" : state === "processing" ? "⏳" : "🎤"}</Text>
      </TouchableOpacity>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const BTN = 80;
const styles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center" },
  pulse: { position: "absolute", width: BTN + 24, height: BTN + 24, borderRadius: (BTN + 24) / 2 },
  button: {
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
  icon: { fontSize: 32 },
  label: { marginTop: 10, color: "#9CA3AF", fontSize: 13 },
});
