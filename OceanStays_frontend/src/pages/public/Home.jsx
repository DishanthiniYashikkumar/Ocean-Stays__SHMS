import AboutSection from "../../components/public/AboutSection";
import AvailabilitySearch from "../../components/public/AvailabilitySearch";
import ExperiencesSection from "../../components/public/ExperiencesSection";
import FacilitiesSection from "../../components/public/FacilitiesSection";
import FeaturedRooms from "../../components/public/FeaturedRooms";
import FinalCTA from "../../components/public/FinalCTA";
import GallerySection from "../../components/public/GallerySection";
import Hero from "../../components/public/Hero";
import LocationSection from "../../components/public/LocationSection";
import TestimonialsSection from "../../components/public/TestimonialsSection";
import WhyChooseSection from "../../components/public/WhyChooseSection";

/**
 * Ocean Stays home page.
 *
 * Each section owns its own data fetching and its own loading, empty and error
 * states, so a slow or failing section never blocks the rest of the page.
 */
function Home() {
  return (
    <>
      <Hero />

      {/* The hero's "Book Your Stay" and scroll cue both anchor here. */}
      <div id="availability">
        <AvailabilitySearch />
      </div>

      <AboutSection />
      <FeaturedRooms />
      <FacilitiesSection />
      <ExperiencesSection />
      <WhyChooseSection />
      <TestimonialsSection />
      <GallerySection />
      <LocationSection />
      <FinalCTA />
    </>
  );
}

export default Home;
