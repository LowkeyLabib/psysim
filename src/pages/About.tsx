import { motion } from "motion/react";
import { ArrowUpRight, GitBranch, Globe, Mail } from "lucide-react";

const developers = [
  {
    handle: "LowkeyLabib",
    name: "Labib Hasan",
    monogram: "LH",
    contributions: "Frontend, UI/UX & integration",
    email: "lowkeylabib@gmail.com",
    links: [
      { label: "GitHub", href: "https://github.com/lowkeylabib", icon: GitBranch },
      {
        label: "Portfolio",
        href: "https://labib-portfolio-three.vercel.app/",
        icon: Globe,
      },
    ],
  },
  {
    handle: "FaiazEnd",
    name: "Faiaz Ul Islam",
    monogram: "FI",
    contributions: "Backend, AI & systems",
    email: "faiazend@gmail.com",
    links: [],
  },
];

export default function About() {
  return (
    <motion.div
      className="studio-about"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <header className="studio-hero">
        <div className="studio-identity">
          <span className="studio-monogram" aria-hidden="true">ZG</span>
          <div>
            <span className="eyebrow">INDEPENDENT DEV STUDIO</span>
            <span className="studio-brand">ZeroGhee</span>
          </div>
        </div>
        <h1>Zero Ghee.<br /><em>Full Stack.</em></h1>
        <p className="studio-description">
          An independent development team building software, exploring AI, and
          bringing ideas to life.
        </p>
      </header>

      <section className="studio-developers" aria-label="ZeroGhee co-creators">
        {developers.map((developer) => (
          <article className="studio-card" key={developer.handle}>
            <div className="studio-card-top">
              <span className="studio-avatar" aria-hidden="true">
                {developer.monogram}
              </span>
              <span className="studio-role">CO-CREATOR</span>
            </div>
            <h2>{developer.handle}</h2>
            <p className="studio-name">{developer.name}</p>
            <p className="studio-contributions">{developer.contributions}</p>
            <div className="studio-contacts">
              <a className="studio-email" href={`mailto:${developer.email}`}>
                <Mail size={17} aria-hidden="true" />
                <span>{developer.email}</span>
                <ArrowUpRight size={16} aria-hidden="true" />
              </a>
              {developer.links.length > 0 && (
                <ul className="studio-socials" aria-label={`${developer.handle} links`}>
                  {developer.links.map(({ label, href, icon: Icon }) => (
                    <li key={href}>
                      <a href={href} target="_blank" rel="noopener noreferrer">
                        <Icon size={16} aria-hidden="true" />
                        {label}
                        <ArrowUpRight size={13} aria-hidden="true" />
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </article>
        ))}
      </section>

      <section className="studio-work" aria-labelledby="studio-work-title">
        <h2 id="studio-work-title">Our Work — PsySim</h2>
        <p>
          An AI-powered psychiatric patient simulation platform designed to help
          medical students and trainee psychiatrists practice clinical interviews
          and diagnostic reasoning.
        </p>
      </section>
    </motion.div>
  );
}
