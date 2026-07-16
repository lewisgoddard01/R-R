import type { Metadata } from "next";
import Image from "next/image";
import { Rule } from "@/components/rule";

export const metadata: Metadata = {
  title: "Meet the team — Revive & Reform",
  description: "The instructors and team behind Revive & Reform in Ripley, Derbyshire.",
};

const TEAM = [
  {
    name: "Alix",
    photo: "/assets/team/alix.jpg",
    bio: "Alix is the owner and founder of R&R. She has been teaching Mat Pilates for several years and is also a qualified Remedial and Sports Massage therapist. Alix teaches at Fizziofit in Ripley, where she started out almost fifteen years ago, and has completed various qualifications in health and fitness along the way. Alix will be teaching classes at R&R and moving her massage therapy to the centre too!",
  },
  {
    name: "Diane",
    photo: "/assets/team/diane.jpg",
    bio: "Diane is the second owner at R&R. She has multiple other businesses in the local area, including Fizziofit and Gymfit. Diane started out in business over forty years ago and, while she won't be working at R&R directly, she will most definitely be featured in our social media posts with her funny antics and generally supporting the business!",
  },
  {
    name: "Karen",
    photo: "/assets/team/karen.jpg",
    bio: "Karen has been in the fitness industry for over twenty years. She has a wealth of experience and knowledge and currently teaches Mat Pilates and a range of other exercise classes in the Ripley area, so you may have seen her before! As well as teaching over the years, Karen has run a personal training business and helped countless people achieve their fitness goals. Karen is full of energy and we can't wait for her to channel that into her classes at R&R!",
  },
  {
    name: "Adele",
    photo: "/assets/team/adele.jpg",
    imagePosition: "50% 20%",
    bio: "Adele has been working in the fitness industry for the last few years following a career change after years of running pubs. She is a qualified gym instructor and personal trainer, and has specialised in women's health and menopause. Adele currently runs Pilates classes in the community in Nottingham. She has a very calming energy — but don't be fooled, she knows how to deliver a killer Reformer class!",
  },
  {
    name: "Melissa",
    photo: "/assets/team/melissa.jpg",
    bio: "Melissa is a Pilates instructor and runs her own belly dancing classes online. She has many years of experience teaching both Mat and Reformer Pilates and is currently training to teach instructors. Melissa recently moved to the area after running her own dance school in London for years, and is teaching in Leicester at the moment. We're very excited for her to bring her skills and experience to R&R, teaching a mixture of classes that are challenging with a lovely chilled vibe!",
  },
  {
    name: "Laura",
    photo: "/assets/team/laura.jpg",
    imagePosition: "50% 20%",
    bio: "Laura is our power-house pocket rocket! Working in fitness for the last few years, she teaches a range of classes and is a qualified personal trainer too. Laura teaches in the local area and has built her classes through her passion and love for fitness. We are very happy to have Laura on the team!",
  },
];

export default function Team() {
  return (
    <section className="sec page-head">
      <div className="wrap">
        <h1 className="display" data-reveal>
          Meet the <em>team.</em>
        </h1>
        <p className="lede intro" data-reveal>
          A bunch of amazing people who&apos;ll make R&amp;R a safe, welcoming place to move.
        </p>
        <Rule />
        <div className="team">
          {TEAM.map((m) => (
            <div className="member" key={m.name} data-reveal>
              <div className="member__photo">
                <Image
                  src={m.photo}
                  alt={m.name}
                  width={120}
                  height={120}
                  style={m.imagePosition ? { objectPosition: m.imagePosition } : undefined}
                />
              </div>
              <h3>{m.name}</h3>
              <p>{m.bio}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
