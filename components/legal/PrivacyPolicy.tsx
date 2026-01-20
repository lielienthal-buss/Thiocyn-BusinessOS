import React from 'react';

const PrivacyPolicy: React.FC = () => {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="legal-page p-6 max-w-3xl mx-auto text-gray-800 dark:text-gray-200">
      <h1 className="text-3xl font-extrabold mb-6">Privacy Policy</h1>

      <p className="text-xs font-bold text-gray-700 italic mb-8">
        Last updated: {currentDate}
      </p>

      <section className="space-y-10">
        <p>
          This Privacy Policy explains how TAKE A SHOT GmbH processes personal
          data when operating this application.
        </p>

        <div>
          <h2 className="text-xl font-bold mb-2">1. Controller</h2>
          <p>
            The controller within the meaning of the General Data Protection
            Regulation (GDPR) is:
          </p>
          <div className="mt-2 font-black text-gray-900 dark:text-white">
            <p>TAKE A SHOT GmbH</p>
            <p>Kieselstr. 6</p>
            <p>51371 Leverkusen</p>
            <p>Germany</p>
            <p>Email: info@takeashot.de</p>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2">2. Scope of Application</h2>
          <p>
            This Privacy Policy applies to an internal hiring application
            operated by TAKE A SHOT GmbH.
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Applicants do not create user accounts</li>
            <li>Recruiters / admins authenticate via Supabase Auth</li>
            <li>No marketing tracking or advertising services are used</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2">3. Categories of Personal Data</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div className="glass-card p-6 rounded-2xl bg-gray-50/50 dark:bg-slate-900/50">
              <p className="text-[10px] font-black uppercase mb-3 text-gray-700">
                Applicants
              </p>
              <ul className="list-disc pl-5 text-sm space-y-1">
                <li>Email address</li>
                <li>Uploaded documents (CV, task files – PDF only)</li>
                <li>Personality assessment results (Big Five, JSON format)</li>
                <li>AI-generated evaluation summaries</li>
                <li>Application status metadata</li>
              </ul>
            </div>
            <div className="glass-card p-6 rounded-2xl bg-gray-50/50 dark:bg-slate-900/50">
              <p className="text-[10px] font-black uppercase mb-3 text-gray-700">
                Admins / Recruiters
              </p>
              <ul className="list-disc pl-5 text-sm space-y-1">
                <li>Email address</li>
                <li>Authentication metadata</li>
                <li>Internal notes and actions performed in the system</li>
              </ul>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2">4. Purpose of Processing</h2>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Handling and evaluating job applications</li>
            <li>Internal recruiting workflows and decision support</li>
            <li>Secure file storage and controlled access</li>
            <li>AI-assisted candidate analysis</li>
            <li>Communication regarding application status</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2">5. Legal Basis</h2>
          <p>Processing is based on:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>
              <strong>Art. 6(1)(b) GDPR</strong> – performance of
              pre-contractual measures
            </li>
            <li>
              <strong>Art. 6(1)(a) GDPR</strong> – explicit consent (personality
              test, uploads)
            </li>
            <li>
              <strong>Art. 6(1)(f) GDPR</strong> – legitimate interest in
              efficient recruiting
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2">6. AI-Based Processing</h2>
          <p>
            Applicant data is processed using{' '}
            <strong>Google Gemini 3 Pro</strong> for AI-assisted analysis.
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>AI results are used only as decision support</li>
            <li>
              No fully automated decision-making within the meaning of Art. 22
              GDPR
            </li>
            <li>Uploaded PDFs are not permanently stored by the AI provider</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2">7. Data Storage & Processors</h2>
          <p>We use the following processors:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>
              <strong>Supabase:</strong> authentication, database, storage
            </li>
            <li>
              <strong>Vercel:</strong> hosting and infrastructure
            </li>
            <li>
              <strong>Email service provider:</strong> transactional emails only
            </li>
          </ul>
          <p className="mt-4 text-sm">
            All processors are bound by GDPR-compliant data processing
            agreements.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2">8. Storage & Retention</h2>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>
              Application data is <strong>automatically deleted 30 days</strong>{' '}
              after submission
            </li>
            <li>Files are stored in private storage buckets</li>
            <li>Access is granted via time-limited signed URLs only</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2">9. Cookies & Tracking</h2>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>
              Only technically necessary cookies are used
              (authentication/session)
            </li>
            <li>No analytics, marketing, or tracking cookies are used</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2">10. Data Subject Rights</h2>
          <p>
            Data subjects have the right to: Access (Art. 15), Rectification
            (Art. 16), Deletion (Art. 17), Restriction (Art. 18), Portability
            (Art. 20), and Objection (Art. 21).
          </p>
          <p className="mt-4">
            Requests can be sent to:{' '}
            <a
              href="mailto:info@takeashot.de"
              className="text-primary-600 hover:underline font-black"
            >
              info@takeashot.de
            </a>
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2">11. Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to
            protect personal data against loss, misuse, and unauthorized access.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2">12. Changes to this Privacy Policy</h2>
          <p>
            This Privacy Policy may be updated to reflect legal or technical
            changes. The current version is always available within the
            application.
          </p>
        </div>
      </section>
    </div>
  );
};

export default PrivacyPolicy;
