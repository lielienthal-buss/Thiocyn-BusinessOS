import React from 'react';
import Navbar from './sections/Navbar';
import Footer from './sections/Footer';
import HeroSection from './sections/HeroSection';
import MissionNarrative from './sections/MissionNarrative';
import PathSelectionGrid from './sections/PathSelectionGrid';
import PortfolioShowcase from './sections/PortfolioShowcase';
import AIFeatureSection from './sections/AIFeatureSection';
import MetricsSection from './sections/MetricsSection';

export default function HSBLanding() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:text-background focus:outline-none focus:ring-2 focus:ring-teal"
      >
        Skip to main content
      </a>
      <main id="main" className="min-h-screen bg-background text-foreground">
        <Navbar />
        <HeroSection />
        <MissionNarrative />
        <PathSelectionGrid />
        <PortfolioShowcase />
        <AIFeatureSection />
        <MetricsSection />
        <Footer />
      </main>
    </>
  );
}
