import React from "react";
import { StatusBar } from "expo-status-bar";
import BookingScreen from "./src/screens/BookingScreen";

export default function App() {
  return (
    <>
      <BookingScreen />
      <StatusBar style="light" />
    </>
  );
}
