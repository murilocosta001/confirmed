import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Pricing from "@/components/landing/Pricing";
import Footer from "@/components/landing/Footer";

const Landing = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
};

export default Landing;
