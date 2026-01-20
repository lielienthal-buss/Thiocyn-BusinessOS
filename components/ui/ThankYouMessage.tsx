import React from 'react';
import Card from '../ui/Card';

const ThankYouMessage: React.FC = () => (
  <Card className="text-center max-w-2xl mx-auto mt-10">
    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
      <span className="text-4xl">🚀</span>
    </div>
    <h2 className="text-3xl font-black text-gray-900 mb-4">
      Application Received!
    </h2>
    <p className="text-lg text-gray-600 mb-8">
      Thanks for taking the shot. We&apos;ve received your profile and Big Five
      results. Our team will review it and get back to you shortly.
    </p>
    <button
      onClick={() => window.location.reload()}
      className="px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition"
    >
      Back to Home
    </button>
  </Card>
);

export default ThankYouMessage;
