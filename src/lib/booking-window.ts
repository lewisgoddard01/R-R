// The studio physically opens 24 August 2026. Bookings/purchases open earlier,
// 10 August 2026, so customers can reserve a spot ahead of opening day — but
// not before then. Enforced server-side in every booking/purchase action (not
// just hidden in the UI) so it can't be bypassed.
export const BOOKINGS_OPEN_AT = new Date("2026-08-10T00:00:00+01:00");
export const BOOKINGS_OPEN_AT_LABEL = "10 August 2026";

export function bookingsAreOpen(): boolean {
  return +new Date() >= +BOOKINGS_OPEN_AT;
}
