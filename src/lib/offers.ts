// Offers are rows in pricing_items: the welcome offer, bundles, seasonal
// deals and plain price-list lines, all managed from Admin → Pricing.

export const OFFER_SECTIONS = {
  featured: "Highlighted box at the top",
  list: "Main price list",
  bundle: "Bundles box",
} as const;
export type OfferSection = keyof typeof OFFER_SECTIONS;

export const OFFER_COLUMNS =
  "id, name, subtitle, price_label, featured, sort_order, active, price_pence, credits, valid_days, class_id, one_per_customer, section, starts_at, ends_at";

export type Offer = {
  id: string;
  name: string;
  subtitle: string | null;
  price_label: string;
  featured: boolean;
  sort_order: number;
  active: boolean;
  price_pence: number | null;
  credits: number | null;
  valid_days: number;
  class_id: string | null;
  one_per_customer: boolean;
  section: OfferSection;
  starts_at: string | null;
  ends_at: string | null;
};

export function isBuyable(o: Pick<Offer, "price_pence" | "credits">) {
  return Boolean(o.price_pence && o.credits);
}

export type OfferStatus = "showing" | "hidden" | "scheduled" | "ended";

export function offerStatus(o: Pick<Offer, "active" | "starts_at" | "ends_at">, now = new Date()): OfferStatus {
  if (!o.active) return "hidden";
  if (o.starts_at && new Date(o.starts_at) > now) return "scheduled";
  if (o.ends_at && new Date(o.ends_at) < now) return "ended";
  return "showing";
}

export function isOnSale(o: Pick<Offer, "active" | "starts_at" | "ends_at">, now = new Date()) {
  return offerStatus(o, now) === "showing";
}

// The flat price of one class, used to show how much a bundle saves.
export const SINGLE_CLASS_PRICE_PENCE = 2000;

export function savingsPence(o: Pick<Offer, "price_pence" | "credits" | "class_id">) {
  if (!o.price_pence || !o.credits || o.class_id) return 0;
  return Math.max(0, SINGLE_CLASS_PRICE_PENCE * o.credits - o.price_pence);
}
