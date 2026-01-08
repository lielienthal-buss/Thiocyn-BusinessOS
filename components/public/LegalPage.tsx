import React from 'react';

export default function LegalPage() {
  return (
    <div className="legal-page p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Legal Information</h1>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Terms of Use</h2>
        <p>Welcome to <strong>Take-a-Shot</strong>. By accessing or using this application, you agree to comply with the following terms and conditions. Please read them carefully.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Scope</h2>
        <p>This Legal Page applies to the internal hiring application operated by <strong>TAKE A SHOT GmbH</strong>. It complements the <a href="/privacy">Privacy Policy</a> and <a href="/imprint">Imprint</a>.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Intellectual Property</h2>
        <p>All content, graphics, logos, and software are the property of <strong>TAKE A SHOT GmbH</strong> or its licensors. You may not copy, reproduce, or create derivative works without explicit permission.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Limitation of Liability</h2>
        <p>The application is provided "as is". TAKE A SHOT GmbH makes no warranties regarding accuracy, completeness, or reliability. Use is at your own risk.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">External Links</h2>
        <p>The application may contain links to third-party websites. TAKE A SHOT GmbH assumes no liability for external content.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">AI-Assisted Processing</h2>
        <p>The application may provide AI-assisted evaluations via <strong>Google Gemini 3 Pro</strong>. AI results are only for decision support. No fully automated decisions are made.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Data Security</h2>
        <p>Personal data is processed in accordance with our <a href="/privacy">Privacy Policy</a>. Technical and organizational measures are in place to protect against unauthorized access, loss, or misuse.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Changes to Terms</h2>
        <p>We may update this Legal Page to reflect legal, technical, or operational changes. The latest version is always available within the application.</p>
      </section>
    </div>
  );
}