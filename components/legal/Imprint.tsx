import React from 'react';

const Imprint: React.FC = () => {
  return (
    <div className="legal-page p-6 max-w-3xl mx-auto text-gray-800 dark:text-gray-200">
      <h1 className="text-3xl font-extrabold mb-6">Imprint</h1>

      <section className="space-y-6">
        <div>
          <h2 className="text-xs font-black uppercase tracking-widest text-primary-600 mb-4">
            Information according to §5 TMG and §18 MStV
          </h2>
          <div className="space-y-1">
            <p className="font-black text-gray-900 dark:text-white">
              TAKE A SHOT GmbH
            </p>
            <p>Kieselstr. 6</p>
            <p>51371 Leverkusen</p>
            <p>Germany</p>
          </div>
        </div>

        <div>
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-700 mb-4">
            Commercial Register
          </h2>
          <p>Registered in the Commercial Register</p>
          <p>Register Court: Amtsgericht Leipzig</p>
          <p>Registration Number: HRB 37943</p>
        </div>

        <div>
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-700 mb-4">
            VAT Identification Number
          </h2>
          <p>VAT ID (Germany): DE338019133</p>
          <p>VAT ID (Austria): ATU76511856</p>
        </div>

        <div>
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-700 mb-4">
            Represented by
          </h2>
          <p>Managing Director: Peter Hart</p>
        </div>

        <div>
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-700 mb-4">
            Contact
          </h2>
          <p>Phone: +49 341 98994423</p>
          <p>Email: info@takeashot.de</p>
        </div>

        <div>
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-700 mb-4">
            Person responsible for content according to §55 RStV
          </h2>
          <p>Peter Hart</p>
          <p>Kieselstr. 6</p>
          <p>51371 Leverkusen</p>
          <p>Germany</p>
        </div>

        <div>
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-700 mb-4">
            Additional regulatory information
          </h2>
          <p>WEEE Registration Number: DE 35680324</p>
          <p>LUCID Registration Number: DE4164719041311-V</p>
          <p>Battery Act Registration Number (BattG): 21009049</p>
        </div>

        <div>
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-700 mb-4">
            Online Dispute Resolution
          </h2>
          <p>
            The European Commission provides a platform for online dispute
            resolution (ODR):
          </p>
          <a
            href="http://ec.europa.eu/odr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:underline"
          >
            http://ec.europa.eu/odr
          </a>
          <p className="mt-2 text-sm italic">
            We are not willing or obliged to participate in dispute resolution
            proceedings before a consumer arbitration board.
          </p>
        </div>

        <div className="pt-8 border-t border-gray-100 dark:border-slate-800 text-[11px] space-y-4 text-gray-700">
          <div>
            <p className="font-black uppercase mb-1">Liability for content</p>
            <p>
              As a service provider, we are responsible for our own content on
              these pages according to general laws. However, we are not
              obligated to monitor transmitted or stored third-party information
              or to investigate circumstances that indicate illegal activity.
            </p>
          </div>
          <div>
            <p className="font-black uppercase mb-1">Liability for links</p>
            <p>
              Our application may contain links to external websites of third
              parties. We have no influence on the contents of those websites
              and therefore assume no liability for them.
            </p>
          </div>
          <div>
            <p className="font-black uppercase mb-1">Copyright</p>
            <p>
              All content and works created by the site operators are subject to
              German copyright law.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Imprint;
