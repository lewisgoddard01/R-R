import type { Metadata } from "next";
import Link from "next/link";
import { Rule } from "@/components/rule";

export const metadata: Metadata = {
  title: "Classes — Revive & Reform",
  description:
    "Our Reformer Pilates classes — from beginner foundations to power flows — in Ripley, Derbyshire.",
};

const CLASSES = [
  {
    name: "Revive & Reform",
    tag: "Energetic",
    warmth: 3,
    body: "An energetic class working the whole body and leaving you ready to attack the day. The perfect way to start your morning — a thorough workout focusing on strength, conditioning and core control. You'll leave full of endorphins and the satisfying feeling that you can face anything that comes your way.",
  },
  {
    name: "Rise & Revive",
    tag: "Mindful",
    warmth: 2,
    body: "A morning class that works on core control while slowing the pace right down. Fine-tune your technique and your ability to tune in to your body, developing awareness and presence. We focus on flexibility, mobility and mindfulness — perfect for developing your practice with precision and strong technique.",
  },
  {
    name: "Revive Foundations",
    tag: "Beginner",
    warmth: 1,
    body: "The perfect starting point for your reformer journey. This warm, welcoming class is designed for beginners as well as anyone looking to refine their practice. Learn how to use the reformer effectively while building a strong understanding of Pilates principles — your instructor guides you through the what, why and how of each exercise.",
  },
  {
    name: "Revive & Thrive",
    tag: "Progress",
    warmth: 2,
    body: "Ready to build on your foundations? This general-level class is fun and supportive, designed for those with a basic understanding of Pilates who are ready to put their technique into practice. Continue to develop strength, control, mobility and confidence through dynamic, engaging reformer sequences.",
  },
  {
    name: "Revive Slow Flow",
    tag: "Mindful",
    warmth: 1,
    body: "A mindful, full-body Reformer class designed to slow things down and bring attention to every movement. A moving meditation that invites you to connect deeply with your body, refine technique, and build strength through thoughtful, deliberate movement. Leave feeling centred, balanced and refreshed.",
  },
  {
    name: "Reform Power",
    tag: "Strength",
    warmth: 3,
    body: "Ready to feel strong and powerful? Designed to build strength, fitness and stability through challenging flows that adapt to different capabilities. Faster-paced moves raise the heart rate while conditioning the whole body — we'll use jumpboards at times for a cardio blast, finishing with a stretch sequence to support muscle health.",
  },
];

export default function Classes() {
  return (
    <section className="sec page-head">
      <div className="wrap">
        <h1 className="display" data-reveal>
          Our <em>classes.</em>
        </h1>
        <p className="lede intro" data-reveal>
          Every class focuses on moving from the inside out — connecting with your core, improving
          alignment, and getting the most from every session in a nurturing, encouraging space where
          everyone feels seen and supported. Options and modifications are offered throughout.
        </p>
        <Rule />

        <div className="clist">
          {CLASSES.map((c) => (
            <article className="crow" key={c.name} data-reveal>
              <span className="crow__name">{c.name}</span>
              <span className="crow__tag">{c.tag}</span>
              <span className="crow__meta">
                <span className="warmth" aria-label={`Intensity ${c.warmth} of 3`}>
                  {[0, 1, 2].map((i) => (
                    <i key={i} className={i < c.warmth ? "on" : ""} />
                  ))}
                </span>
              </span>
              <p className="crow__desc">{c.body}</p>
            </article>
          ))}
        </div>

        <p style={{ marginTop: "clamp(2rem,4vw,3rem)" }} data-reveal>
          <Link href="/timetable" className="btn btn--primary">
            See the timetable <span className="btn__x">→</span>
          </Link>
        </p>
      </div>
    </section>
  );
}
