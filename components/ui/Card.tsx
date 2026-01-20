import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
}) => {
  const baseClasses =
    'bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl shadow-2xl border border-white/50 rounded-[2rem] p-6 md:p-10';

  return (
    <div className={`${baseClasses} ${className}`}>
      {title && (
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
};

export default Card;
