import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import AppPreview from "@/components/AppPreview";
import Why from "@/components/Why";
import HowItWorks from "@/components/HowItWorks";
import Tiers from "@/components/Tiers";
import Roadmap from "@/components/Roadmap";
import Results from "@/components/Results";
import Faq from "@/components/Faq";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="relative overflow-x-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[900px] bg-[url(/images/hero-bg.jpg)] bg-cover bg-top opacity-60 [mask-image:linear-gradient(to_bottom,#000_50%,transparent)]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[900px] bg-gradient-to-r from-ink/90 via-ink/50 to-transparent [mask-image:linear-gradient(to_bottom,#000_50%,transparent)]" />
      <Navbar />
      <Hero />
      <About />
      <AppPreview />
      <Why />
      <HowItWorks />
      <Tiers />
      <Roadmap />
      <Results />
      <Faq />
      <Footer />
    </main>
  );
}
