/**
 * In-memory booking store.
 * A "booking" is created when a session reaches the BOOKED state.
 */

import { randomUUID } from "crypto";

export interface Booking {
  id: string;
  sessionId: string;
  providerId: string;
  providerName: string;
  serviceType: string;
  date: string;
  time: string;
  durationHours: number;
  location: string;
  hourlyRate: number;
  totalEstimate: number;
  createdAt: string;
}

const bookings = new Map<string, Booking>();

export function createBooking(data: Omit<Booking, "id" | "createdAt">): Booking {
  const booking: Booking = {
    ...data,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };
  bookings.set(booking.id, booking);
  return booking;
}

export function getBooking(id: string): Booking | undefined {
  return bookings.get(id);
}

export function listBookings(): Booking[] {
  return Array.from(bookings.values());
}
