import Link from "next/link";
import { CONTACT_EMAIL, GITHUB_URL, navLinks, REPORT_URL, TEAM_NAME } from "@/lib/content";

export default function Footer() {
  return (
    <footer id="contact" className="border-t border-white/10 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">Test the model before it touches anything.</h2>
        <p className="mt-4 max-w-xl text-lg text-zinc-400">Open source. Generate your own tasks, run your own models, and check every answer yourself.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/app" className="rounded-md bg-accent px-6 py-3 font-medium text-ink transition-opacity hover:opacity-90">
            Open the app
          </Link>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="rounded-md border border-white/20 px-6 py-3 font-medium text-white transition-colors hover:border-white/50">
            View on GitHub
          </a>
          <a href={REPORT_URL} target="_blank" rel="noreferrer" className="rounded-md px-3 py-3 font-medium text-zinc-400 transition-colors hover:text-white">
            Technical report →
          </a>
        </div>
        <div className="mt-16 flex flex-col justify-between gap-6 border-t border-white/10 pt-8 text-sm text-zinc-500 md:flex-row">
          <div>
            <p>{TEAM_NAME} · Innodata AI Hackathon 2026 · <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-white">{CONTACT_EMAIL}</a></p>
            <p className="mt-1">Scenes rendered with Blender. Lighting and floor materials from Poly Haven (CC0).</p>
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
