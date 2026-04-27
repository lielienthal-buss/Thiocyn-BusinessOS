import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Navbar from '../sections/Navbar';
import Footer from '../sections/Footer';
import agreementMarkdown from '@/docs/intern-academy/fellowship-agreement-template.md?raw';

const FellowshipAgreementPage: React.FC = () => {
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    document.title = 'Fellowship Agreement · House of Sustainable Brands';
  }, []);

  const handlePrint = () => window.print();

  return (
    <div className="bg-background text-foreground">
      <div className="print:hidden">
        <Navbar />
      </div>

      <main className="pt-28 print:pt-0">
        <section className="mx-auto max-w-3xl px-6 pb-24 md:px-12 print:max-w-none print:px-12">
          <header className="mb-10 flex flex-wrap items-end justify-between gap-4 print:mb-6">
            <div>
              <p className="font-mono text-xs font-medium uppercase tracking-[0.4em] text-teal">
                / DOCUMENT · DRAFT
              </p>
              <h1 className="mt-3 text-pretty font-sans text-3xl font-black tracking-tight md:text-4xl">
                Fellowship Agreement
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Template for the unpaid 12-week HSB Fellowship via Thiocyn GmbH.
              </p>
            </div>
            <div className="flex gap-3 print:hidden">
              <button
                onClick={handlePrint}
                className="inline-flex items-center justify-center rounded-full bg-teal px-5 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-teal/90"
              >
                Drucken / PDF speichern
              </button>
            </div>
          </header>

          <article className="prose prose-invert prose-headings:font-sans prose-headings:tracking-tight prose-p:text-foreground/85 prose-li:text-foreground/85 prose-strong:text-foreground prose-table:text-sm prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl print:prose-invert-none print:max-w-none print:text-black">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{agreementMarkdown}</ReactMarkdown>
          </article>

          <footer className="mt-16 border-t border-border/30 pt-8 text-xs text-muted-foreground print:hidden">
            <p>
              Dies ist ein <strong>Template</strong>. Vor dem ersten Versand an einen Fellow ist eine Anwaltsprüfung
              empfohlen — speziell für Non-EU-Fellows (IP, GDPR Art. 28) und für FR/ES-Sondervorschriften.
            </p>
          </footer>
        </section>
      </main>

      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  );
};

export default FellowshipAgreementPage;
