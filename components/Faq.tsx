"use client";

import { useState } from "react";
import { faqs } from "@/lib/content";
import { SectionHead } from "./Section";

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="mx-auto max-w-3xl px-6 py-28">
      <SectionHead eyebrow="FAQs" title="Frequently asked questions" />
      <div className="divide-y divide-white/10 border-y border-white/10">
        {faqs.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={f.q}>
              <button onClick={() => setOpen(isOpen ? null : i)} aria-expanded={isOpen} className="flex w-full items-center justify-between gap-4 py-5 text-left">
                <span className="font-medium text-white">{f.q}</span>
                <span className="text-xl leading-none text-zinc-500">{isOpen ? "−" : "+"}</span>
              </button>
              {isOpen && <p className="pb-5 leading-relaxed text-zinc-400">{f.a}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
