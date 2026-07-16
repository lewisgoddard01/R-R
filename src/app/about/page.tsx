import type { Metadata } from "next";
import { Rule } from "@/components/rule";

export const metadata: Metadata = {
  title: "About — Revive & Reform",
  description:
    "Meet Alix, owner of Revive & Reform in Ripley, Derbyshire, and what we do — Reformer Pilates, remedial & sports massage therapy.",
};

export default function About() {
  return (
    <section className="sec page-head" style={{ position: "relative", overflow: "hidden" }}>
      <span
        className="amp"
        aria-hidden="true"
        style={{ top: "6rem", right: "-1.5rem", fontSize: "clamp(14rem,30vw,34rem)" }}
      >
        &amp;
      </span>

      <div className="wrap">
        <h1 className="display" data-reveal>
          Hi, I&apos;m <em>Alix.</em>
        </h1>
        <Rule />

        <div className="prose" data-reveal>
          <p>
            My journey to being a Pilates instructor started in 2019 with a 20 stone woman realising
            that if she didn&apos;t change her life, she may not be around to watch her son grow up.
            That woman was me. I was so miserable. I was unfit, unhealthy and I was not setting the
            example that I wanted to for my little man. I had had enough!
          </p>
          <p>
            I went on a mad mission that took six years of steady ups and catastrophic downs and
            finally, after realising that I needed to stick to a simple plan but do it consistently —
            in 2025 I hit my target of losing <span className="lift">nine stone</span>.
          </p>
        </div>

        <blockquote className="pq" data-reveal>
          <p>That woman was me.</p>
          <cite>Alix, founder</cite>
        </blockquote>

        <div className="prose" data-reveal>
          <p>
            During that time I became best friends and worst enemies with exercise. I hated the
            thought of stepping foot in a gym, feeling like the fattest person in there and battling
            the voice that told me that everyone was staring at me and judging me every time I went
            to work out. But… I went anyway and soon began to realise that even at that size, I was
            still doing better than the version of me that would have otherwise been sitting at home
            on the sofa eating a tub of Ben &amp; Jerry&apos;s to myself.
          </p>
          <p>
            Somewhere along the way I decided to train to teach classes myself and fell in love with
            teaching. Then one day, a Pilates instructor who worked where I taught from was leaving.
            The owner asked me if I fancied training to teach Pilates — obviously I thought
            &ldquo;HELL NO!!&rdquo; as THAT voice was still there, but I pushed myself out of my
            comfort zone and I can honestly say it has been the best decision of my career.
          </p>
          <p>
            I have been teaching Mat Pilates for several years now. In that time I started going to
            reformer classes and absolutely loved them. Since starting teaching, I&apos;ve had the
            dream that I would own my own Pilates business one day — so when the opportunity came up,
            I decided to grab it, and here we are!
          </p>
        </div>

        <blockquote className="pq" data-reveal style={{ maxWidth: "30ch" }}>
          <p>A space to exercise without the noise.</p>
          <cite>Alix, founder</cite>
        </blockquote>

        <div className="prose" data-reveal>
          <p>
            It is really important to me that I create a space where people who know what THAT voice
            feels like can come and experience what it feels like to exercise without the noise. I
            want anyone and everyone to feel welcome — whatever gender you are, whatever size you
            are, whatever your level of fitness, and whether you are experienced at Reformer or brand
            new. <strong>We got you.</strong>
          </p>
          <p>
            I have been incredibly lucky to have the best business partner I could wish for, and
            I&apos;ve found a bunch of amazing ladies who are going to help make R&amp;R a safe place
            for you to enjoy Reformer Pilates. We can&apos;t wait to see you there!
          </p>
        </div>

        <Rule />

        <div className="prose" data-reveal>
          <h2 id="what-we-do">
            What we <em>do</em>
          </h2>

          <h2>
            Reformer <em>Pilates</em>
          </h2>
          <p>
            This is a form of exercise inspired by the moves created by Joseph Pilates in his
            classical Pilates series. In Reformer, these are done on a specialist piece of equipment
            which has a moving carriage, hand and foot loops, and the option to apply various levels
            of resistance to the machine. There are all kinds of gadgets that can be used to enhance
            Reformer, and we aim to do it all.
          </p>
          <p>
            The same principles apply between Classical and Reformer Pilates, in that there is always
            a focus on the A, B, C&apos;s — Alignment, Breathing and Core — that are fundamental to
            Pilates. The moves used in Reformer are inspired by those in Classical Pilates, however
            the Reformer gives lots of different options to make the moves more varied and
            challenging — giving an amazing workout and making it a form of exercise that can be
            modified to be fun, fierce, gentle, energetic, relaxing, or a mixture of all of these! We
            can&apos;t wait to welcome you to a class soon.
          </p>

          <h2>
            Remedial &amp; Sports <em>Massage Therapy</em>
          </h2>
          <p>
            We offer sports massage and remedial massage therapy for people struggling with a range
            of different issues. Whether it is general pain, pain following injury, post-surgery
            rehabilitation, or just general maintenance for the body, we cover a range of different
            problems. We provide different types of electrotherapy, ultrasound and dry cupping to
            support healing and rehabilitation, and we provide a bespoke treatment plan along with
            work to do at home following an appointment, to ensure continued care and the best
            results possible. Each client goes through a thorough assessment and their treatment plan
            is tailored to their individual needs.
          </p>

          <h2>
            Other health <em>services</em>
          </h2>
          <p>
            We currently have spaces available to rent for other health professionals who wish to
            work in a beautiful space, surrounded by an amazing bunch of people. For more information
            about this please{" "}
            <a href="/contact" style={{ color: "var(--orange)" }}>
              get in touch
            </a>
            .
          </p>

          <div className="note-card" style={{ marginTop: "2rem" }} data-reveal>
            <h3>What our clients say</h3>
            <p>
              We&apos;re proud to be reviewed on Trustpilot — have a look at what people are saying,
              or leave us a review of your own if you&apos;ve been to a class.
            </p>
            <p style={{ marginTop: "1.2rem" }}>
              <a
                href="https://uk.trustpilot.com/review/reviveandreform.co.uk"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn--primary"
              >
                Read our Trustpilot reviews <span className="btn__x">→</span>
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
