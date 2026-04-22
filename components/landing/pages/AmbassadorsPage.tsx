import React from 'react';
import Navbar from '../sections/Navbar';
import Footer from '../sections/Footer';
import StubPage from '../sections/StubPage';

export default function AmbassadorsPage() {
  return (
    <div className="bg-background text-foreground">
      <Navbar />
      <StubPage titleKey="ambassadors" accent="coral" />
      <Footer />
    </div>
  );
}
