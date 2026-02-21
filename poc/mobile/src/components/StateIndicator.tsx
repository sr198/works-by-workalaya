/**
 * Shows the current booking state as a pill badge.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { BookingFlowState } from "../hooks/useBookingFlow";

interface Props {
  state: BookingFlowState;
  wsStatus: string;
}

const STATE_LABELS: Record<BookingFlowState, string> = {
  IDLE: "Ready",
  EXTRACTING: "Extracting details…",
  CLARIFYING: "Need more info",
  PROVIDER_SELECTION: "Choose a cleaner",
  CONFIRMING: "Confirm booking",
  BOOKED: "Booking confirmed!",
};

const STATE_COLORS: Record<BookingFlowState, string> = {
  IDLE: "#374151",
  EXTRACTING: "#1D4ED8",
  CLARIFYING: "#92400E",
  PROVIDER_SELECTION: "#065F46",
  CONFIRMING: "#4C1D95",
  BOOKED: "#064E3B",
};

export function StateIndicator({ state, wsStatus }: Props) {
  const isDisconnected = wsStatus !== "connected";

  return (
    <View style={styles.row}>
      {isDisconnected && (
        <View style={[styles.pill, styles.errorPill]}>
          <Text style={styles.text}>● WS {wsStatus}</Text>
        </View>
      )}
      <View style={[styles.pill, { backgroundColor: STATE_COLORS[state] }]}>
        <Text style={styles.text}>{STATE_LABELS[state]}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  errorPill: { backgroundColor: "#7F1D1D" },
  text: { color: "#F9FAFB", fontSize: 13, fontWeight: "500" },
});
