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
    <main className="min-h-screen bg-background text-foreground">
      <Navbar />
      <HeroSection />
      <MissionNarrative />
      <PathSelectionGrid />
      <PortfolioShowcase />
      <AIFeatureSection />
      <MetricsSection />
      <Footer />
    </main>
  );
}
