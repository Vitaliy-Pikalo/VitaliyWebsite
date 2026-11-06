import SideNav from "@/components/SideNav";
import Spotlight from "@/components/Spotlight";
import { ExternalIcon, GitHubIcon, LinkedInIcon, MailIcon } from "@/components/icons";
import {
  about,
  beyond,
  education,
  experience,
  openSource,
  profile,
  projects,
} from "@/lib/content";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky top-0 z-20 -mx-6 mb-6 bg-stone/85 px-6 py-5 backdrop-blur md:-mx-12 md:px-12 lg:static lg:mx-0 lg:mb-8 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none">
      <h2 className="font-display text-lg font-semibold tracking-wide text-bone">{children}</h2>
    </div>
  );
}

function Tags({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-2" aria-label="Technologies">
      {items.map((t) => (
        <li
          key={t}
          className="rounded-sm border border-moss/30 bg-moss/10 px-2.5 py-0.5 text-xs font-medium leading-5 text-moss"
        >
          {t}
        </li>
      ))}
    </ul>
  );
}

const linkClass =
  "text-bone underline decoration-gold/50 underline-offset-4 transition-colors hover:text-gold-bright hover:decoration-gold-bright";

export default function Home() {
  return (
    <div className="relative min-h-screen">
      <Spotlight />
      <a
        href="#content"
        className="absolute left-0 top-0 z-50 -translate-y-full bg-gold px-4 py-3 text-sm font-semibold text-stone-deep focus-visible:translate-y-0"
      >
        Skip to content
      </a>

      <div className="relative z-10 mx-auto min-h-screen max-w-screen-xl px-6 py-12 md:px-12 md:py-20 lg:px-24 lg:py-0">
        <div className="lg:flex lg:justify-between lg:gap-8">
          <header className="lg:sticky lg:top-0 lg:flex lg:max-h-screen lg:w-[46%] lg:flex-col lg:justify-between lg:py-24">
            <div>
              <h1 className="font-display text-4xl font-bold tracking-wide text-bone sm:text-5xl">
                {profile.name}
              </h1>
              <p className="mt-3 text-lg font-medium text-bone/90 sm:text-xl">{profile.role}</p>
              <p className="mt-4 max-w-sm leading-normal">{profile.tagline}</p>
              <SideNav />
            </div>

            <div className="mt-10 lg:mt-0">
              <a
                href={profile.resume}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-bone hover:text-gold-bright"
              >
                View resume (PDF) <ExternalIcon />
              </a>
              <ul className="mt-6 flex items-center gap-5" aria-label="Contact links">
                <li>
                  <a href={profile.github} target="_blank" rel="noopener noreferrer" className="block hover:text-bone" aria-label="GitHub (opens in a new tab)">
                    <GitHubIcon />
                  </a>
                </li>
                <li>
                  <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" className="block hover:text-bone" aria-label="LinkedIn (opens in a new tab)">
                    <LinkedInIcon />
                  </a>
                </li>
                <li>
                  <a href={`mailto:${profile.email}`} className="block hover:text-bone" aria-label={`Email ${profile.email}`}>
                    <MailIcon />
                  </a>
                </li>
              </ul>
            </div>
          </header>

          <main id="content" className="pt-16 lg:w-[54%] lg:py-24">
            <section id="about" aria-label="About" className="mb-20 scroll-mt-16 lg:mb-32 lg:scroll-mt-24">
              <SectionTitle>About</SectionTitle>
              <div className="max-w-prose space-y-4">
                {about.map((p) => (
                  <p key={p.slice(0, 24)}>{p}</p>
                ))}
                <p className="text-bone/90">{profile.availability}</p>
              </div>
            </section>

            <section id="experience" aria-label="Experience" className="mb-20 scroll-mt-16 lg:mb-32 lg:scroll-mt-24">
              <SectionTitle>Experience</SectionTitle>
              <ol className="space-y-10">
                {experience.map((job) => (
                  <li key={job.role} className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:gap-6">
                    <p className="pt-0.5 text-xs leading-6 text-muted">{job.period ?? job.org}</p>
                    <div>
                      <h3 className="font-medium leading-snug text-bone">{job.role}</h3>
                      {job.period && <p className="text-sm text-muted">{job.org}</p>}
                      <p className="mt-2 text-sm leading-relaxed">{job.summary}</p>
                      <Tags items={job.tags} />
                    </div>
                  </li>
                ))}
                <li className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:gap-6">
                  <p className="pt-0.5 text-xs leading-6 text-muted">{education.period}</p>
                  <div>
                    <h3 className="font-medium leading-snug text-bone">{education.degree}</h3>
                    <p className="text-sm text-muted">{education.school}</p>
                    <p className="mt-2 text-sm leading-relaxed">{education.note}</p>
                  </div>
                </li>
              </ol>
            </section>

            <section id="projects" aria-label="Projects" className="mb-20 scroll-mt-16 lg:mb-32 lg:scroll-mt-24">
              <SectionTitle>Projects</SectionTitle>
              <ul className="space-y-12">
                {projects.map((p) => (
                  <li key={p.name} className="border-l-2 border-stone-edge pl-5 transition-colors hover:border-gold">
                    <h3 className="font-medium text-bone">{p.name}</h3>
                    <p className="mt-1 text-sm text-bone/80">{p.summary}</p>
                    <p className="mt-2 max-w-prose text-sm leading-relaxed">{p.detail}</p>
                    <Tags items={p.tags} />
                    {p.links.length > 0 && (
                      <p className="mt-3 flex gap-5 text-sm">
                        {p.links.map((l) => (
                          <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className={`${linkClass} inline-flex items-center gap-1`}>
                            {l.label}
                            <ExternalIcon />
                          </a>
                        ))}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <section id="open-source" aria-label="Open source" className="mb-20 scroll-mt-16 lg:mb-32 lg:scroll-mt-24">
              <SectionTitle>Open source</SectionTitle>
              <ul className="space-y-8">
                {openSource.map((o) => (
                  <li key={o.href}>
                    <h3 className="font-medium text-bone">
                      <a href={o.href} target="_blank" rel="noopener noreferrer" className={`${linkClass} inline-flex items-center gap-1.5`}>
                        {o.repo}: {o.title}
                        <ExternalIcon />
                      </a>
                    </h3>
                    <p className="mt-2 max-w-prose text-sm leading-relaxed">{o.detail}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section id="beyond" aria-label="Beyond code" className="mb-20 scroll-mt-16 lg:mb-32 lg:scroll-mt-24">
              <SectionTitle>Beyond code</SectionTitle>
              <dl className="space-y-6">
                {beyond.map((b) => (
                  <div key={b.title}>
                    <dt className="font-medium text-bone">{b.title}</dt>
                    <dd className="mt-1 max-w-prose text-sm leading-relaxed">{b.detail}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section id="contact" aria-label="Contact" className="mb-16 scroll-mt-16 lg:scroll-mt-24">
              <SectionTitle>Contact</SectionTitle>
              <p className="max-w-prose">
                The fastest way to reach me is email:{" "}
                <a href={`mailto:${profile.email}`} className={linkClass}>
                  {profile.email}
                </a>
                .
              </p>
            </section>

            <footer className="max-w-md pb-16 text-xs leading-relaxed text-muted/80 lg:pb-0">
              <p>
                Layout inspired by{" "}
                <a href="https://brittanychiang.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-bone">
                  Brittany Chiang
                </a>
                . Built with Next.js and Tailwind CSS, deployed on Vercel.
              </p>
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}
