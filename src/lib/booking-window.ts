// How far ahead customers may book, and whether booking is open at all.

/** Bookings and purchases are open. This was previously gated behind a
 *  pre-opening date; the gate is kept as a single switch so it can be closed
 *  again (e.g. over a holiday shutdown) without touching every action. */
export const BOOKINGS_ARE_OPEN = true;

/** Shown to customers if bookings are ever closed again. */
export const BOOKINGS_OPEN_AT_LABEL = "soon";

export function bookingsAreOpen(): boolean {
  return BOOKINGS_ARE_OPEN;
}

/** Customers can book up to one calendar month ahead. */
export const BOOKING_HORIZON_LABEL = "a month";

export function bookingHorizon(from: Date = new Date()): Date {
  const horizon = new Date(from);
  horizon.setMonth(horizon.getMonth() + 1);
  return horizon;
}
