// Single source of truth for the marketing copy about each class, shared by
// /classes (full description) and /timetable (one-line overview) so the two
// can't drift apart.

export type ClassInfo = {
  name: string;
  tag: string;
  /** One-line overview — shown under each timetable slot. */
  short: string;
  /** Full description — shown on /classes. */
  body: string;
};

export const CLASSES: ClassInfo[] = [
  {
    name: "Revive & Reform",
    tag: "Energetic",
    short: "Energetic full-body workout — strength, conditioning and core control.",
    body: "An energetic class working the whole body and leaving you ready to attack the day. The perfect way to start your morning — a thorough workout focusing on strength, conditioning and core control. You'll leave full of endorphins and the satisfying feeling that you can face anything that comes your way.",
  },
  {
    name: "Rise & Revive",
    tag: "Mindful",
    short: "A slower morning class focused on core control, mobility and technique.",
    body: "A morning class that works on core control while slowing the pace right down. Fine-tune your technique and your ability to tune in to your body, developing awareness and presence. We focus on flexibility, mobility and mindfulness — perfect for developing your practice with precision and strong technique.",
  },
  {
    name: "Revive Foundations",
    tag: "Beginner",
    short: "Beginner-friendly — learn the reformer from the ground up.",
    body: "The perfect starting point for your reformer journey. This warm, welcoming class is designed for beginners as well as anyone looking to refine their practice. Learn how to use the reformer effectively while building a strong understanding of Pilates principles — your instructor guides you through the what, why and how of each exercise.",
  },
  {
    name: "Revive & Thrive",
    tag: "Progress",
    short: "General level — build on the basics with dynamic, supportive sequences.",
    body: "Ready to build on your foundations? This general-level class is fun and supportive, designed for those with a basic understanding of Pilates who are ready to put their technique into practice. Continue to develop strength, control, mobility and confidence through dynamic, engaging reformer sequences.",
  },
  {
    name: "Revive Slow Flow",
    tag: "Mindful",
    short: "Mindful and deliberate — a moving meditation for the whole body.",
    body: "A mindful, full-body Reformer class designed to slow things down and bring attention to every movement. A moving meditation that invites you to connect deeply with your body, refine technique, and build strength through thoughtful, deliberate movement. Leave feeling centred, balanced and refreshed.",
  },
  {
    name: "Reform Power",
    tag: "Strength",
    short: "Faster-paced and challenging — strength, fitness and cardio bursts.",
    body: "Ready to feel strong and powerful? Designed to build strength, fitness and stability through challenging flows that adapt to different capabilities. Faster-paced moves raise the heart rate while conditioning the whole body — we'll use jumpboards at times for a cardio blast, finishing with a stretch sequence to support muscle health.",
  },
];

const byName = new Map(CLASSES.map((c) => [c.name, c]));

/** One-line overview for a class, or undefined if we don't have copy for it. */
export function classShort(name: string): string | undefined {
  return byName.get(name)?.short;
}
