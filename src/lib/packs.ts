// Default number of days credits last; offers can set their own.
export const PACK_VALIDITY_DAYS = 42;

// Bundles as they were before they moved into Admin → Pricing. Only the
// webhook uses these, to honour a checkout started before that change.
const LEGACY_BUNDLES = [
  { kind: "welcome", classes: 2, label: "Welcome offer — 2 classes" },
  { kind: "pack2", classes: 2, label: "2 classes" },
  { kind: "pack5", classes: 5, label: "5 classes" },
  { kind: "pack10", classes: 10, label: "10 classes" },
];

export function findBundle(kind: string) {
  return LEGACY_BUNDLES.find((b) => b.kind === kind);
}
