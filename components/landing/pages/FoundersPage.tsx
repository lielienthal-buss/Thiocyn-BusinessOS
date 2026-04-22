import React from 'react';
import Navbar from '../sections/Navbar';
import Footer from '../sections/Footer';
import StubPage from '../sections/StubPage';

export default function FoundersPage() {
  return (
    <div className="bg-background text-foreground">
      <Navbar />
      <StubPage titleKey="founders" accent="neutral" />
      <Footer />
    </div>
  );
}
