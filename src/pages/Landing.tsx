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
import { Background } from "@/components/landing/Background";
import type { Property } from "@/lib/estate";

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
        <ContactSection onDetails={handleDetails} />
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