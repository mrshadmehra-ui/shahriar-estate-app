import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { Services } from "@/components/landing/Services";
import { SearchSection } from "@/components/landing/SearchSection";
import { Industrial } from "@/components/landing/Industrial";
import { WhyUs } from "@/components/landing/WhyUs";
import { ContactSection } from "@/components/landing/ContactSection";
import { Footer } from "@/components/landing/Footer";
import { MobileNav } from "@/components/landing/MobileNav";
import { PropertyDialog } from "@/components/landing/PropertyDialog";
import type { Property } from "@/lib/estate";

function Background() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-sky-100/90 via-[#f4f8fd] to-white" />
      <div className="absolute -top-32 right-[8%] size-[420px] rounded-full bg-sky-200/50 blur-3xl" />
      <div className="absolute top-[28%] left-[-6%] size-[380px] rounded-full bg-indigo-200/40 blur-3xl" />
      <div className="absolute top-[60%] right-[-8%] size-[420px] rounded-full bg-amber-100/60 blur-3xl" />
      <div className="absolute bottom-[-10%] left-[20%] size-[360px] rounded-full bg-sky-200/40 blur-3xl" />
    </div>
  );
}

export default function Landing() {
  const [selected, setSelected] = useState<Property | null>(null);

  const handleDetails = useCallback((property: Property) => {
    setSelected(property);
  }, []);

  const handleConsult = useCallback(() => {
    setSelected(null);
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative min-h-screen overflow-x-clip"
    >
      <Background />
      <Header />
      <main>
        <Hero />
        <Services />
        <SearchSection onDetails={handleDetails} />
        <Industrial onDetails={handleDetails} />
        <WhyUs />
        <ContactSection />
      </main>
      <Footer />
      <MobileNav />

      <PropertyDialog
        property={selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        onConsult={handleConsult}
      />
    </motion.div>
  );
}