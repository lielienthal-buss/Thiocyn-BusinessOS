import React, { Suspense } from 'react';
import Navbar from '../sections/Navbar';
import Footer from '../sections/Footer';
import Spinner from '@/components/ui/Spinner';

const AmbassadorForm = React.lazy(() => import('../forms/AmbassadorForm'));

export default function AmbassadorsPage() {
  return (
    <div className="bg-background text-foreground">
      <Navbar />
      <main className="min-h-screen pt-28 pb-24">
        <div className="mx-auto max-w-3xl px-6">
          <header className="mb-12">
            <p className="font-mono text-xs font-medium uppercase tracking-[0.4em] text-coral">
              / 02
            </p>
            <h1 className="mt-4 text-pretty text-4xl font-black leading-tight tracking-tight md:text-6xl">
              Ambassador Program
            </h1>
            <p className="mt-6 text-pretty text-base text-muted-foreground md:text-lg">
              Nachhaltige Marken. Echte Samples. Faire Provisionen.
            </p>
          </header>
          <Suspense fallback={<div className="flex h-64 items-center justify-center"><Spinner /></div>}>
            <AmbassadorForm />
          </Suspense>
        </div>
      </main>
      <Footer />
    </div>
  );
}
