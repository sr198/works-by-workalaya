/**
 * 7-state linear booking state machine.
 *
 * States progress linearly:
 *   IDLE → EXTRACTING → CLARIFYING* → ADDRESS_CONFIRM → PROVIDER_SELECTION → CONFIRMING → BOOKED
 *
 * CLARIFYING is re-entered as many times as needed until all fields are present.
 * ADDRESS_CONFIRM presents the user's registered address for confirmation before matching.
 */

export enum BookingState {
  IDLE = "IDLE",
  EXTRACTING = "EXTRACTING",
  CLARIFYING = "CLARIFYING",
  ADDRESS_CONFIRM = "ADDRESS_CONFIRM",
  PROVIDER_SELECTION = "PROVIDER_SELECTION",
  CONFIRMING = "CONFIRMING",
  BOOKED = "BOOKED",
}

export type StateEvent =
  | { type: "USER_MESSAGE" }
  | { type: "EXTRACTION_DONE"; missingFields: string[] }
  | { type: "ADDRESS_CONFIRMED" }
  | { type: "PROVIDER_SELECTED" }
  | { type: "CONFIRMED" }
  | { type: "BARGE_IN" };

export function transition(state: BookingState, event: StateEvent): BookingState {
  switch (state) {
    case BookingState.IDLE:
      if (event.type === "USER_MESSAGE") return BookingState.EXTRACTING;
      break;

    case BookingState.EXTRACTING:
      if (event.type === "EXTRACTION_DONE") {
        return event.missingFields.length === 0
          ? BookingState.ADDRESS_CONFIRM
          : BookingState.CLARIFYING;
      }
      break;

    case BookingState.CLARIFYING:
      if (event.type === "EXTRACTION_DONE") {
        return event.missingFields.length === 0
          ? BookingState.ADDRESS_CONFIRM
          : BookingState.CLARIFYING; // stay until complete
      }
      if (event.type === "BARGE_IN") return BookingState.CLARIFYING;
      break;

    case BookingState.ADDRESS_CONFIRM:
      if (event.type === "ADDRESS_CONFIRMED") return BookingState.PROVIDER_SELECTION;
      if (event.type === "BARGE_IN") return BookingState.ADDRESS_CONFIRM;
      break;

    case BookingState.PROVIDER_SELECTION:
      if (event.type === "PROVIDER_SELECTED") return BookingState.CONFIRMING;
      if (event.type === "BARGE_IN") return BookingState.PROVIDER_SELECTION;
      break;

    case BookingState.CONFIRMING:
      if (event.type === "CONFIRMED") return BookingState.BOOKED;
      if (event.type === "BARGE_IN") return BookingState.PROVIDER_SELECTION;
      break;

    case BookingState.BOOKED:
      // Terminal state — barge-in starts a new session (handled externally)
      break;
  }

  // No valid transition — stay in current state
  return state;
}