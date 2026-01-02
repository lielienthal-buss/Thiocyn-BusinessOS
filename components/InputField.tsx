
import React, { ChangeEvent, FocusEvent, ReactNode } from 'react';

interface InputFieldProps {
  id: string;
  label: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void;
  icon: ReactNode;
  error?: string;
}

const InputField: React.FC<InputFieldProps> = ({ id, label, type, placeholder, value, onChange, onBlur, icon, error }) => {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <div className="relative rounded-md shadow-sm">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            {icon}
        </div>
        <input
          type={type}
          name={id}
          id={id}
          className={`appearance-none block w-full pl-10 pr-3 py-2 border rounded-md placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none sm:text-sm bg-gray-50 dark:bg-slate-700 transition-colors duration-200 ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 dark:border-slate-600 focus:ring-primary-500 focus:border-primary-500'}`}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          required
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400 animate-[fadeIn_0.3s_ease-in-out]">
          {error}
        </p>
      )}
    </div>
  );
};

export default InputField;
