/**
 * Shows matched providers as tap-to-select cards.
 * Displayed when booking state = PROVIDER_SELECTION.
 */
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from "react-native";
import type { ProviderSummary } from "../hooks/useWebSocket";

interface Props {
  providers: ProviderSummary[];
  onSelect: (provider: ProviderSummary, index: number) => void;
}

export function ProviderList({ providers, onSelect }: Props) {
  if (providers.length === 0) return null;

  return (
    <FlatList
      data={providers}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item, index }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => onSelect(item, index)}
          activeOpacity={0.75}
        >
          <View style={styles.row}>
            <Text style={styles.index}>{index + 1}</Text>
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>{item.ward} · {item.distance_km} km</Text>
            </View>
            <View style={styles.right}>
              <Text style={styles.rating}>★ {item.rating}</Text>
              <Text style={styles.rate}>KES {item.hourly_rate}/hr</Text>
            </View>
          </View>
          <Text style={styles.slot}>
            Available: {formatSlot(item.matched_slot)}
          </Text>
        </TouchableOpacity>
      )}
    />
  );
}

function formatSlot(slot: string): string {
  if (!slot) return "";
  const [, time] = slot.split("T");
  if (!time) return slot;
  const [h, m] = time.split(":");
  const hNum = parseInt(h ?? "0", 10);
  const suffix = hNum >= 12 ? "PM" : "AM";
  const h12 = hNum % 12 || 12;
  return `${h12}:${m ?? "00"} ${suffix}`;
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, gap: 10 },
  card: {
    backgroundColor: "#1F2937",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#374151",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  index: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#3B82F6",
    color: "#FFF",
    textAlign: "center",
    lineHeight: 28,
    fontWeight: "700",
    fontSize: 14,
  },
  info: { flex: 1 },
  name: { color: "#F9FAFB", fontWeight: "600", fontSize: 15 },
  meta: { color: "#9CA3AF", fontSize: 12, marginTop: 2 },
  right: { alignItems: "flex-end" },
  rating: { color: "#FBBF24", fontWeight: "600" },
  rate: { color: "#6B7280", fontSize: 12 },
  slot: { color: "#34D399", fontSize: 12, marginTop: 8 },
});
