import { CONTACT_EMAIL, GITHUB_URL, navLinks, TEAM_NAME } from "@/lib/content";

export default function Footer() {
  return (
    <footer id="contact" className="border-t border-white/10 px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">Does your model really see space?</h2>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="rounded-md bg-white px-6 py-3 font-medium text-ink transition-colors hover:bg-zinc-200">
            View on GitHub
          </a>
          <a href={`mailto:${CONTACT_EMAIL}`} className="rounded-md border border-white/25 px-6 py-3 font-medium text-white transition-colors hover:border-white/60">
            {CONTACT_EMAIL}
          </a>
        </div>
        <div className="mt-16 flex flex-col justify-between gap-6 border-t border-white/10 pt-8 text-sm text-zinc-500 md:flex-row">
          <div>
            <p>{TEAM_NAME} · Innodata AI Hackathon 2026</p>
            <p className="mt-1">Space photography: NASA (public domain)</p>
          </div>
          <nav className="flex flex-wrap gap-5">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="transition-colors hover:text-white">
                {l.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
