// Customers can use their bundle credits for any class within 6 weeks of
// purchase; unused credits after that expire and are not refunded.
export const PACK_VALIDITY_DAYS = 42;

// One-time intro offer for brand new clients — enforced in code (see
// createBundleCheckoutAction) so a customer can only ever buy this once.
export const WELCOME_PACK = {
  kind: "welcome" as const,
  classes: 2,
  pricePence: 2000, // £20
  label: "Welcome offer — 2 classes",
};

export const BUNDLES = [
  { kind: "pack2" as const, classes: 2, pricePence: 3900, label: "2 classes" }, // £39
  { kind: "pack5" as const, classes: 5, pricePence: 9000, label: "5 classes" }, // £90
  { kind: "pack10" as const, classes: 10, pricePence: 17000, label: "10 classes" }, // £170
];

export type BundleKind = typeof WELCOME_PACK.kind | (typeof BUNDLES)[number]["kind"];

export function findBundle(kind: string) {
  if (kind === WELCOME_PACK.kind) return WELCOME_PACK;
  return BUNDLES.find((b) => b.kind === kind);
}
