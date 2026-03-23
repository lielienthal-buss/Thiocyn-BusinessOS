import React from 'react';
import ResourceCardList from './ResourceCardList';

interface Props {
  isAdmin: boolean;
}

const CustomerSupportView: React.FC<Props> = ({ isAdmin }) => {
  return (
    <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-gray-900 tracking-tight">Customer Support</h2>
        <p className="text-sm text-gray-500 mt-0.5">Quick-access resources for the support team</p>
      </div>

      {/* Transition notice */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm">
        <span className="text-lg mt-0.5">⚠️</span>
        <div>
          <p className="font-bold text-amber-900">Timber &amp; John Support — Transition Notice</p>
          <p className="text-amber-700 mt-0.5 text-xs leading-relaxed">
            T&amp;J support is being wound down. Shift focus to Paigh platform. Telephone support for Take A Shot remains active via external agency (~300€/month).
          </p>
        </div>
      </div>

      {/* Resource cards — editable by admin */}
      <ResourceCardList section="support" isAdmin={isAdmin} />
    </div>
  );
};

export default CustomerSupportView;
