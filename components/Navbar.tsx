"use client";

import { useEffect, useState } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { GITHUB_URL, navLinks } from "@/lib/content";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-colors ${scrolled || open ? "border-b border-white/10 bg-ink/90 backdrop-blur" : ""}`}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a href="#top" className="text-lg font-semibold tracking-tight text-white">
          SpatialGrid
        </a>
        <nav className="hidden items-center gap-8 text-sm text-zinc-400 lg:flex">
          {navLinks.map((l) => (
            <a key={l.href} href={l.href} className="transition-colors hover:text-white">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="hidden rounded-md bg-white px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-zinc-200 sm:block">
            GitHub
          </a>
          <button aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="grid h-10 w-10 place-items-center rounded-md border border-white/15 text-white lg:hidden">
            <span className="block h-0.5 w-5 bg-current shadow-[0_6px_0_currentColor,0_-6px_0_currentColor]" />
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-white/10 px-6 py-3 lg:hidden">
          {navLinks.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block py-3 text-zinc-300">
              {l.label}
            </a>
          ))}
        </nav>
      )}
      <motion.div style={{ scaleX: progress }} className="h-px origin-left bg-accent" />
    </header>
  );
}
