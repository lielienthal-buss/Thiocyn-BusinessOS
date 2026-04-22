import React from 'react';
import Navbar from '../sections/Navbar';
import Footer from '../sections/Footer';
import StubPage from '../sections/StubPage';

export default function FoundersUniversityPage() {
  return (
    <div className="bg-background text-foreground">
      <Navbar />
      <StubPage titleKey="foundersUniversity" accent="teal" />
      <Footer />
    </div>
  );
}
