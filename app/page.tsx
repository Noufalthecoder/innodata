import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Problem from "@/components/Problem";
import Findings from "@/components/Findings";
import HowItWorks from "@/components/HowItWorks";
import TaskTypes from "@/components/TaskTypes";
import AppPreview from "@/components/AppPreview";
import Results from "@/components/Results";
import Faq from "@/components/Faq";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="relative overflow-x-hidden">
      {/* measuring grid, fading out below the hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[1000px] bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_80%_70%_at_50%_0%,#000_40%,transparent)]"
      />
      <div aria-hidden className="pointer-events-none absolute right-[-10%] top-[-10%] -z-10 h-[700px] w-[700px] rounded-full bg-accent/10 blur-[140px]" />
      <Navbar />
      <Hero />
      <Problem />
      <Findings />
      <HowItWorks />
      <TaskTypes />
      <AppPreview />
      <Results />
      <Faq />
      <Footer />
    </main>
  );
}
