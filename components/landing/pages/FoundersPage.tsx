import React, { Suspense } from 'react';
import Navbar from '../sections/Navbar';
import Footer from '../sections/Footer';
import Spinner from '@/components/ui/Spinner';

const FoundersInquiryForm = React.lazy(() => import('../forms/FoundersInquiryForm'));

export default function FoundersPage() {
  return (
    <div className="bg-background text-foreground">
      <Navbar />
      <main className="min-h-screen pt-28 pb-24">
        <div className="mx-auto max-w-3xl px-6">
          <header className="mb-12">
            <p className="font-mono text-xs font-medium uppercase tracking-[0.4em] text-teal">
              / 03
            </p>
            <h1 className="mt-4 text-pretty text-4xl font-black leading-tight tracking-tight md:text-6xl">
              Sell your brand
            </h1>
            <p className="mt-6 text-pretty text-base text-muted-foreground md:text-lg">
              In die richtigen Hände. Vertraulich. Antwort innerhalb von 5 Werktagen.
            </p>
          </header>
          <Suspense fallback={<div className="flex h-64 items-center justify-center"><Spinner /></div>}>
            <FoundersInquiryForm />
          </Suspense>
        </div>
      </main>
      <Footer />
    </div>
  );
}
