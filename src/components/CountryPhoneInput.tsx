import React, { useState } from 'react';
import { ChevronDown, Phone, Globe } from 'lucide-react';

export interface CountryOption {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

export const COUNTRIES: CountryOption[] = [
  { code: 'CO', name: 'Colombia', dialCode: '+57', flag: '🇨🇴' },
  { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸' },
  { code: 'MX', name: 'Mexico', dialCode: '+52', flag: '🇲🇽' },
  { code: 'ES', name: 'Spain', dialCode: '+34', flag: '🇪🇸' },
  { code: 'JP', name: 'Japan', dialCode: '+81', flag: '🇯🇵' },
  { code: 'AR', name: 'Argentina', dialCode: '+54', flag: '🇦🇷' },
  { code: 'CL', name: 'Chile', dialCode: '+56', flag: '🇨🇱' },
  { code: 'PE', name: 'Peru', dialCode: '+51', flag: '🇵🇪' },
  { code: 'BR', name: 'Brazil', dialCode: '+55', flag: '🇧🇷' },
  { code: 'EC', name: 'Ecuador', dialCode: '+593', flag: '🇪🇨' },
  { code: 'PA', name: 'Panama', dialCode: '+507', flag: '🇵🇦' },
  { code: 'CR', name: 'Costa Rica', dialCode: '+506', flag: '🇨🇷' },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧' },
  { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪' },
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷' },
  { code: 'IT', name: 'Italy', dialCode: '+39', flag: '🇮🇹' },
  { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺' },
];

interface CountryPhoneInputProps {
  value: string;
  onChange: (fullPhoneNumber: string, country: CountryOption) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export const CountryPhoneInput: React.FC<CountryPhoneInputProps> = ({
  value,
  onChange,
  placeholder = '310 456 7890',
  disabled = false,
  required = false,
  className = '',
}) => {
  // Try to determine default country from value
  const detectCountry = (): CountryOption => {
    if (!value) return COUNTRIES[0]; // Colombia default
    for (const c of COUNTRIES) {
      if (value.startsWith(c.dialCode)) return c;
    }
    return COUNTRIES[0];
  };

  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(detectCountry);

  // Extract local phone digits from full value
  const getLocalNumber = (): string => {
    if (!value) return '';
    if (value.startsWith(selectedCountry.dialCode)) {
      return value.slice(selectedCountry.dialCode.length).trim();
    }
    return value;
  };

  const handleCountryChange = (countryCode: string) => {
    const c = COUNTRIES.find(x => x.code === countryCode) || COUNTRIES[0];
    setSelectedCountry(c);
    const local = getLocalNumber();
    const full = local ? `${c.dialCode} ${local}` : c.dialCode;
    onChange(full, c);
  };

  const handleNumberChange = (rawText: string) => {
    // Clean raw text
    const local = rawText.replace(/^\+?[0-9]*\s*/, (match) => {
      // If user typed dial code directly into input, keep it clean
      return '';
    });
    const full = rawText.trim() ? `${selectedCountry.dialCode} ${rawText.trim()}` : '';
    onChange(full, selectedCountry);
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center gap-1.5">
        {/* Country Selector Dropdown with Flag and Dial Code */}
        <div className="relative shrink-0">
          <select
            value={selectedCountry.code}
            disabled={disabled}
            onChange={(e) => handleCountryChange(e.target.value)}
            className="appearance-none bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold rounded-xl pl-2.5 pr-7 py-2.5 outline-none cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            title="Select Country / Code"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.code} ({c.dialCode}) - {c.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500">
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* National Number Input */}
        <div className="relative flex-1">
          <input
            type="tel"
            disabled={disabled}
            required={required}
            value={getLocalNumber()}
            onChange={(e) => handleNumberChange(e.target.value)}
            placeholder={placeholder}
            className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#0097B2] font-mono"
          />
        </div>
      </div>

      {/* Country Indicator Badge */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
        <span className="flex items-center gap-1.5">
          <Globe className="w-3 h-3 text-[#0097B2]" />
          <span>Country:</span>
          <strong className="text-slate-700 dark:text-slate-200 font-semibold">
            {selectedCountry.flag} {selectedCountry.name} ({selectedCountry.dialCode})
          </strong>
        </span>
        {value && (
          <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
            Formatted: {value}
          </span>
        )}
      </div>
    </div>
  );
};
