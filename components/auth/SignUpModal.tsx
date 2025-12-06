import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, ChevronLeft, ChevronRight, Check, Lock, Search } from 'lucide-react';
import { countries, Country } from '../../data/countries';
import { registerUser, RegistrationError } from '../../lib/api';

// --- Types ---
interface FormData {
  // Step 1
  fullName: string;
  dob: string;
  countryOfResidence: string;
  email: string;
  password: string;
  confirmPassword: string;
  referralCode: string;
  // Step 2
  phone: string;
  phoneCode: string;
  phoneIso: string;
  whatsapp: string;
  whatsappCode: string;
  whatsappIso: string;
  useSameNumber: boolean;
  agreeToWhatsappOtp: boolean;
  agreeToTerms: boolean;
}

const initialFormData: FormData = {
  fullName: '',
  dob: '',
  countryOfResidence: '',
  email: '',
  password: '',
  confirmPassword: '',
  referralCode: '',
  phone: '',
  phoneCode: '+1',
  phoneIso: 'US',
  whatsapp: '',
  whatsappCode: '+1',
  whatsappIso: 'US',
  useSameNumber: false,
  agreeToWhatsappOtp: false,
  agreeToTerms: false,
};

// --- Eye Icon ---
const EyeIcon = ({ off = false }: { off?: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {off ? (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ) : (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </>
    )}
  </svg>
);

// --- Input Field Component ---
const InputField = ({
  label,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  icon,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  icon?: React.ReactNode;
}) => (
  <div className="flex flex-col w-full">
    <label
      htmlFor={name}
      className="text-white text-xs font-medium mb-1"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {label}
    </label>
    <div
      className={`flex items-center w-full bg-[#E5E5E5] rounded-full transition-all ${error ? 'ring-2 ring-red-500' : 'focus-within:ring-2 focus-within:ring-[#3AA189]'
        }`}
      style={{ height: '36px', padding: '0 16px' }}
    >
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="flex-1 min-w-0 bg-transparent text-black placeholder-gray-400 outline-none text-xs"
        style={{ fontFamily: "'Inter', sans-serif" }}
      />
      {icon && <span className="text-black ml-2 flex-shrink-0">{icon}</span>}
    </div>
    {error && (
      <p className="text-red-400 text-xs mt-0.5" style={{ fontFamily: "'Inter', sans-serif" }}>
        {error}
      </p>
    )}
  </div>
);

// --- Password Field Component ---
const PasswordField = ({
  label,
  name,
  placeholder,
  value,
  onChange,
  error,
  hint,
}: {
  label: string;
  name: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  hint?: string;
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col w-full">
      <label
        htmlFor={name}
        className="text-white text-xs font-medium mb-1"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {label}
      </label>
      <div
        className={`flex items-center w-full bg-[#E5E5E5] rounded-full transition-all ${error ? 'ring-2 ring-red-500' : 'focus-within:ring-2 focus-within:ring-[#3AA189]'
          }`}
        style={{ height: '36px', padding: '0 16px' }}
      >
        <input
          id={name}
          name={name}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="flex-1 min-w-0 bg-transparent text-black placeholder-gray-400 outline-none text-xs"
          style={{ fontFamily: "'Inter', sans-serif" }}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="text-black ml-2 flex-shrink-0 hover:text-gray-700 transition-colors"
        >
          <EyeIcon off={!visible} />
        </button>
      </div>
      {hint && !error && (
        <p className="text-[#3AA189] text-xs mt-0.5" style={{ fontFamily: "'Inter', sans-serif" }}>
          {hint}
        </p>
      )}
      {error && (
        <p className="text-red-400 text-xs mt-0.5" style={{ fontFamily: "'Inter', sans-serif" }}>
          {error}
        </p>
      )}
    </div>
  );
};

// --- Phone Input Field ---
const PhoneInputField = ({
  label,
  name,
  placeholder,
  value,
  onChange,
  error,
  countryIso,
  countryDialCode,
  onCountryChange,
}: {
  label: string;
  name: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  countryIso: string;
  countryDialCode: string;
  onCountryChange: (country: Country) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedCountry = countries.find((c) => c.code === countryIso) || countries[0];
  const filtered = countries.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.dial_code.includes(search) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col w-full">
      <label
        htmlFor={name}
        className="text-white text-xs font-medium mb-1"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {label}
      </label>
      <div
        className={`flex items-center w-full bg-[#E5E5E5] rounded-full transition-all relative ${error ? 'ring-2 ring-red-500' : 'focus-within:ring-2 focus-within:ring-[#3AA189]'
          }`}
        style={{ height: '36px', padding: '0 16px' }}
        ref={dropdownRef}
      >
        {/* Country Selector */}
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            setSearch('');
          }}
          className="flex items-center gap-1 pr-2 border-r border-gray-400 mr-2 h-full"
        >
          <img
            src={`https://flagcdn.com/w40/${selectedCountry.code.toLowerCase()}.png`}
            alt={selectedCountry.name}
            className="w-5 h-4 object-cover rounded"
          />
          <ChevronDown className={`w-3 h-3 text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        <span className="text-black text-xs font-medium mr-2" style={{ fontFamily: "'Inter', sans-serif" }}>
          {selectedCountry.dial_code}
        </span>
        <input
          id={name}
          name={name}
          type="tel"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="flex-1 min-w-0 bg-transparent text-black placeholder-gray-400 outline-none text-xs"
          style={{ fontFamily: "'Inter', sans-serif" }}
        />

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-48 overflow-hidden">
            <div className="p-2 border-b border-gray-100">
              <div className="flex items-center bg-gray-100 rounded px-2 py-1">
                <Search className="w-4 h-4 text-gray-400 mr-2" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-transparent outline-none text-sm flex-1"
                  autoFocus
                />
              </div>
            </div>
            <div className="overflow-y-auto max-h-32">
              {filtered.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    onCountryChange(c);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left ${c.code === countryIso ? 'bg-[#3AA189]/10' : ''
                    }`}
                >
                  <img
                    src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`}
                    alt={c.name}
                    className="w-5 h-4 object-cover rounded"
                  />
                  <span className="text-sm text-gray-800 flex-1 truncate">{c.name}</span>
                  <span className="text-xs text-gray-500">{c.dial_code}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {error && (
        <p className="text-red-400 text-xs mt-0.5" style={{ fontFamily: "'Inter', sans-serif" }}>
          {error}
        </p>
      )}
    </div>
  );
};

// --- Country Select Field ---
const CountrySelectField = ({
  label,
  name,
  value,
  onChange,
  error,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (code: string) => void;
  error?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedCountry = countries.find((c) => c.code === value);
  const filtered = countries.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col w-full" ref={dropdownRef}>
      <label
        htmlFor={name}
        className="text-white text-xs font-medium mb-1"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {label}
      </label>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch('');
        }}
        className={`flex items-center w-full bg-[#E5E5E5] rounded-full transition-all text-left relative ${error ? 'ring-2 ring-red-500' : 'focus:ring-2 focus:ring-[#3AA189]'
          }`}
        style={{ height: '36px', padding: '0 16px' }}
      >
        {selectedCountry ? (
          <>
            <img
              src={`https://flagcdn.com/w40/${selectedCountry.code.toLowerCase()}.png`}
              alt={selectedCountry.name}
              className="w-5 h-4 object-cover rounded mr-2"
            />
            <span className="text-black text-xs flex-1 truncate" style={{ fontFamily: "'Inter', sans-serif" }}>
              {selectedCountry.name}
            </span>
          </>
        ) : (
          <span className="text-gray-400 text-xs flex-1" style={{ fontFamily: "'Inter', sans-serif" }}>
            Select country
          </span>
        )}
        <svg className="w-4 h-4 text-black ml-2 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
        </svg>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-48 overflow-hidden">
            <div className="p-2 border-b border-gray-100">
              <div className="flex items-center bg-gray-100 rounded px-2 py-1">
                <Search className="w-4 h-4 text-gray-400 mr-2" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => {
                    e.stopPropagation();
                    setSearch(e.target.value);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-transparent outline-none text-sm flex-1"
                  autoFocus
                />
              </div>
            </div>
            <div className="overflow-y-auto max-h-32">
              {filtered.map((c) => (
                <div
                  key={c.code}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(c.code);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer ${c.code === value ? 'bg-[#3AA189]/10' : ''
                    }`}
                >
                  <img
                    src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`}
                    alt={c.name}
                    className="w-5 h-4 object-cover rounded"
                  />
                  <span className="text-sm text-gray-800 flex-1 truncate">{c.name}</span>
                  {c.code === value && <Check className="w-4 h-4 text-[#3AA189]" />}
                </div>
              ))}
            </div>
          </div>
        )}
      </button>
      {error && (
        <p className="text-red-400 text-xs mt-0.5" style={{ fontFamily: "'Inter', sans-serif" }}>
          {error}
        </p>
      )}
    </div>
  );
};

// --- Date Picker Field ---
const DatePickerField = ({
  label,
  name,
  value,
  onChange,
  error,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const parsed = value ? new Date(value) : null;
  const hasDate = parsed && !isNaN(parsed.getTime());
  const initial = hasDate ? parsed : new Date(2000, 0, 1);
  const [month, setMonth] = useState(initial.getMonth());
  const [year, setYear] = useState(initial.getFullYear());
  const containerRef = useRef<HTMLDivElement>(null);

  const maxAllowedDate = new Date();
  maxAllowedDate.setFullYear(maxAllowedDate.getFullYear() - 18);

  const currentYear = new Date().getFullYear();
  const maxYear = currentYear - 18;
  const yearOptions = Array.from({ length: 100 }, (_, i) => maxYear - i);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatted = hasDate
    ? parsed!.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startingDay = new Date(year, month, 1).getDay();
  const weeks: (number | null)[][] = [];
  let counter = 1 - startingDay;
  for (let row = 0; row < 6; row++) {
    const week: (number | null)[] = [];
    for (let col = 0; col < 7; col++) {
      week.push(counter >= 1 && counter <= daysInMonth ? counter : null);
      counter++;
    }
    weeks.push(week);
  }

  const isDateTooRecent = (day: number) => new Date(year, month, day) > maxAllowedDate;

  const handleSelect = (day: number | null) => {
    if (!day || isDateTooRecent(day)) return;
    const selected = new Date(year, month, day);
    const iso = `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, '0')}-${String(selected.getDate()).padStart(2, '0')}`;
    onChange(iso);
    setIsOpen(false);
  };

  return (
    <div className="flex flex-col w-full relative" ref={containerRef}>
      <label className="text-white text-xs font-medium mb-1" style={{ fontFamily: "'Inter', sans-serif" }}>
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center w-full bg-[#E5E5E5] rounded-full transition-all text-left ${error ? 'ring-2 ring-red-500' : 'focus:ring-2 focus:ring-[#3AA189]'
          }`}
        style={{ height: '36px', padding: '0 16px' }}
      >
        <span
          className={`flex-1 text-xs ${formatted ? 'text-black' : 'text-gray-400'}`}
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {formatted || 'Select date of birth'}
        </span>
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 17C0 18.7 1.3 20 3 20H17C18.7 20 20 18.7 20 17V9H0V17ZM17 2H15V1C15 0.4 14.6 0 14 0C13.4 0 13 0.4 13 1V2H7V1C7 0.4 6.6 0 6 0C5.4 0 5 0.4 5 1V2H3C1.3 2 0 3.3 0 5V7H20V5C20 3.3 18.7 2 17 2Z" fill="#000000" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-3">
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={() => setMonth((p) => (p === 0 ? (setYear(year - 1), 11) : p - 1))} className="p-1 hover:bg-gray-100 rounded">
              <ChevronLeft className="w-4 h-4 text-black" />
            </button>
            <div className="flex gap-2">
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="text-sm border rounded px-2 py-1 text-black font-medium">
                {monthNames.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="text-sm border rounded px-2 py-1 text-black font-medium">
                {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button type="button" onClick={() => setMonth((p) => (p === 11 ? (setYear(year + 1), 0) : p + 1))} className="p-1 hover:bg-gray-100 rounded">
              <ChevronRight className="w-4 h-4 text-black" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-black font-medium mb-1">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-sm">
            {weeks.flat().map((day, i) => {
              const isSelected = hasDate && parsed!.getDate() === day && parsed!.getMonth() === month && parsed!.getFullYear() === year;
              const tooRecent = day ? isDateTooRecent(day) : false;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelect(day)}
                  disabled={!day || tooRecent}
                  className={`aspect-square rounded-full flex items-center justify-center transition-all text-black ${!day ? 'invisible' : tooRecent ? 'text-gray-300 cursor-not-allowed' : isSelected ? 'bg-[#3AA189] text-white' : 'hover:bg-gray-100'
                    }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {error && <p className="text-red-400 text-xs mt-0.5" style={{ fontFamily: "'Inter', sans-serif" }}>{error}</p>}
    </div>
  );
};

// --- Checkbox ---
const Checkbox = ({
  id,
  checked,
  onChange,
  error,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: boolean;
  children: React.ReactNode;
}) => (
  <label htmlFor={id} className="flex items-center gap-2 cursor-pointer select-none">
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: '16px', height: '16px' }}>
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={`peer cursor-pointer appearance-none w-4 h-4 rounded border ${error ? 'border-red-500' : 'border-white'
          } bg-transparent transition-all checked:border-[#3AA189] checked:bg-[#3AA189]`}
      />
      <span className="absolute inset-0 flex items-center justify-center opacity-0 peer-checked:opacity-100 text-black pointer-events-none">
        <Check size={10} strokeWidth={4} />
      </span>
    </div>
    <span className={`text-xs leading-normal ${error ? 'text-red-400' : 'text-gray-300'}`} style={{ fontFamily: "'Inter', sans-serif" }}>
      {children}
    </span>
  </label>
);

// --- Main Modal Component ---
interface SignUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin?: () => void;
  onSuccess?: (email: string, userId: string) => void;
}

export const SignUpModal: React.FC<SignUpModalProps> = ({ isOpen, onClose, onSwitchToLogin, onSuccess }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData | 'form', string>>>({});
  const [loading, setLoading] = useState(false);
  const [isButtonHovered, setIsButtonHovered] = useState(false);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setFormData(initialFormData);
      setErrors({});
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: type === 'checkbox' ? checked : value };
      if (name === 'useSameNumber' && checked) {
        newData.whatsapp = prev.phone;
        newData.whatsappCode = prev.phoneCode;
        newData.whatsappIso = prev.phoneIso;
      }
      if (name === 'phone' && prev.useSameNumber) {
        newData.whatsapp = value;
      }
      return newData;
    });
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleCountryChange = (field: 'phone' | 'whatsapp', country: Country) => {
    setFormData((prev) => {
      const newData = {
        ...prev,
        [`${field}Code`]: country.dial_code,
        [`${field}Iso`]: country.code,
      };
      if (field === 'phone' && prev.useSameNumber) {
        newData.whatsappCode = country.dial_code;
        newData.whatsappIso = country.code;
      }
      return newData;
    });
  };

  const validateStep1 = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.dob) {
      newErrors.dob = 'Date of birth is required';
    } else {
      const birthDate = new Date(formData.dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      if (age < 18) newErrors.dob = 'You must be at least 18 years old';
    }
    if (!formData.countryOfResidence) newErrors.countryOfResidence = 'Country is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!formData.whatsapp.trim()) newErrors.whatsapp = 'WhatsApp number is required';
    if (!formData.agreeToTerms) newErrors.agreeToTerms = 'Required';
    if (!formData.agreeToWhatsappOtp) newErrors.agreeToWhatsappOtp = 'Required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep1()) {
      setStep(2);
      setIsButtonHovered(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep2()) return;

    setLoading(true);
    setErrors({});

    try {
      const payload = {
        full_name: formData.fullName,
        email: formData.email.toLowerCase(),
        phone: `${formData.phoneCode}${formData.phone.replace(/\D/g, '')}`,
        whatsapp_phone: `${formData.whatsappCode}${formData.whatsapp.replace(/\D/g, '')}`,
        dob: formData.dob,
        country_of_residence: formData.countryOfResidence,
        referral_code: formData.referralCode?.trim() || null,
        password: formData.password,
        receive_otp_sms: formData.agreeToWhatsappOtp,
        agree_to_terms: formData.agreeToTerms,
      };

      const result = await registerUser(payload);

      // Trigger verification flow on successful registration
      if (onSuccess) {
        onSuccess(result.email, result.user_id);
      }
    } catch (error) {
      if (error instanceof RegistrationError) {
        // Handle specific duplicate errors
        if (error.duplicates?.includes('email')) {
          setErrors({ email: 'An account with this email already exists' });
          setStep(1); // Go back to step 1 to show email error
        } else if (error.duplicates?.includes('phone')) {
          setErrors({ phone: 'An account with this phone number already exists' });
        } else if (error.duplicates?.includes('whatsapp_phone')) {
          setErrors({ whatsapp: 'An account with this WhatsApp number already exists' });
        } else {
          setErrors({ form: error.message });
        }
      } else {
        setErrors({ form: 'An unexpected error occurred. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full flex flex-col md:flex-row items-stretch overflow-hidden my-4"
        style={{
          maxWidth: 'min(90vw, 900px)',
          maxHeight: '95vh',
          borderRadius: '40px',
          background: 'rgba(4, 34, 34, 0.60)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
        }}
      >
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors z-30">
          <X className="w-5 h-5" strokeWidth={2} />
        </button>

        {/* Left Side - Branding */}
        <div className="hidden md:flex w-5/12 flex-col items-center justify-center p-4 pb-24 relative">
          {step === 2 && (
            <button onClick={() => setStep(1)} className="absolute top-5 left-5 text-white hover:text-[#3AA189] transition-colors">
              <ChevronLeft className="w-7 h-7" strokeWidth={2.5} />
            </button>
          )}
          <img src="/logos/white_wordmark_logo_on_black-removebg-preview.png" alt="ShareMatch" className="h-32 object-contain mb-3" />
          <h1
            className="text-white text-center leading-tight mb-10 whitespace-pre-line"
            style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(2rem, 2.5vw + 0.5rem, 3rem)', fontWeight: 600 }}
          >
            {step === 1 ? 'Create Your\nAccount' : 'Security\nand\nVerification'}
          </h1>
          <p
            className="text-center text-base"
            style={{
              fontFamily: "'Inter', sans-serif",
              background: 'linear-gradient(180deg, #6F7D7D 0%, #CAE3E3 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Join our trading community.
          </p>
        </div>

        {/* Mobile Header */}
        <div className="md:hidden p-5 flex items-center justify-center relative">
          {step === 2 && (
            <button onClick={() => setStep(1)} className="absolute left-5 text-white hover:text-[#3AA189] transition-colors">
              <ChevronLeft className="w-7 h-7" strokeWidth={2.5} />
            </button>
          )}
          <img src="/logos/white_wordmark_logo_on_black-removebg-preview.png" alt="ShareMatch" className="h-16 object-contain" />
        </div>

        {/* Right Side - Form */}
        <div className="flex-1 p-3 pt-10 md:p-4 md:pt-14 md:pr-8 overflow-y-auto flex flex-col" style={{ maxHeight: 'calc(95vh - 2rem)' }}>
          <div
            className="bg-[#021A1A] rounded-lg p-3 md:p-4 flex flex-col"
            style={{
              border: '1px solid transparent',
              backgroundImage: 'linear-gradient(#021A1A, #021A1A), linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 100%)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
              minHeight: '460px',
            }}
          >
            <h2
              className="text-white mb-3"
              style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.25rem', fontWeight: 700 }}
            >
              {step === 2 && 'Security & Access'}
            </h2>

            {errors.form && (
              <div className="mb-3 p-2 bg-red-900/30 border border-red-500/50 rounded-lg text-red-200 text-xs">
                {errors.form}
              </div>
            )}

            <form onSubmit={step === 1 ? handleNext : handleSubmit} className="flex flex-col gap-2 flex-1">
              {step === 1 ? (
                <>
                  <InputField
                    label="Full Name *"
                    name="fullName"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={handleChange}
                    error={errors.fullName}
                    icon={
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                    }
                  />
                  <DatePickerField
                    label="Date of Birth *"
                    name="dob"
                    value={formData.dob}
                    onChange={(val) => {
                      setFormData((p) => ({ ...p, dob: val }));
                      if (errors.dob) setErrors((p) => ({ ...p, dob: undefined }));
                    }}
                    error={errors.dob}
                  />
                  <CountrySelectField
                    label="Country of Residence *"
                    name="countryOfResidence"
                    value={formData.countryOfResidence}
                    onChange={(code) => {
                      setFormData((p) => ({ ...p, countryOfResidence: code }));
                      if (errors.countryOfResidence) setErrors((p) => ({ ...p, countryOfResidence: undefined }));
                    }}
                    error={errors.countryOfResidence}
                  />
                  <InputField
                    label="Email *"
                    name="email"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    error={errors.email}
                    icon={
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                      </svg>
                    }
                  />
                  <PasswordField
                    label="Password *"
                    name="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    error={errors.password}
                    hint={formData.password.length > 0 && formData.password.length < 8 ? 'Must be at least 8 characters' : undefined}
                  />
                  <PasswordField
                    label="Confirm Password *"
                    name="confirmPassword"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    error={errors.confirmPassword}
                  />
                  <InputField
                    label="Referral Code (Optional)"
                    name="referralCode"
                    placeholder="Enter code"
                    value={formData.referralCode}
                    onChange={handleChange}
                    icon={
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" />
                      </svg>
                    }
                  />
                </>
              ) : (
                <div className="flex flex-col gap-4 flex-1 justify-center">
                  <PhoneInputField
                    label="Phone Number *"
                    name="phone"
                    placeholder="123 456 7890"
                    value={formData.phone}
                    onChange={handleChange}
                    error={errors.phone}
                    countryIso={formData.phoneIso}
                    countryDialCode={formData.phoneCode}
                    onCountryChange={(c) => handleCountryChange('phone', c)}
                  />

                  <Checkbox
                    id="useSameNumber"
                    checked={formData.useSameNumber}
                    onChange={(checked) => {
                      setFormData((p) => ({
                        ...p,
                        useSameNumber: checked,
                        whatsapp: checked ? p.phone : '',
                        whatsappCode: checked ? p.phoneCode : p.whatsappCode,
                        whatsappIso: checked ? p.phoneIso : p.whatsappIso,
                      }));
                    }}
                  >
                    Use the same number for WhatsApp
                  </Checkbox>

                  <PhoneInputField
                    label="WhatsApp Number *"
                    name="whatsapp"
                    placeholder="123 456 7890"
                    value={formData.whatsapp}
                    onChange={handleChange}
                    error={errors.whatsapp}
                    countryIso={formData.whatsappIso}
                    countryDialCode={formData.whatsappCode}
                    onCountryChange={(c) => handleCountryChange('whatsapp', c)}
                  />

                  <Checkbox
                    id="agreeToWhatsappOtp"
                    checked={formData.agreeToWhatsappOtp}
                    onChange={(checked) => setFormData((p) => ({ ...p, agreeToWhatsappOtp: checked }))}
                    error={!!errors.agreeToWhatsappOtp}
                  >
                    I agree to receive WhatsApp messages for OTP
                  </Checkbox>

                  {/* Security Notice */}
                  <div className="bg-[#0F2222] rounded-lg p-2 flex items-start gap-2 border border-white/5">
                    <Lock className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                    <p className="text-gray-400 text-xs leading-tight" style={{ fontFamily: "'Inter', sans-serif" }}>
                      Your account is protected with encryption. Never share your password.
                    </p>
                  </div>

                  <Checkbox
                    id="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onChange={(checked) => setFormData((p) => ({ ...p, agreeToTerms: checked }))}
                    error={!!errors.agreeToTerms}
                  >
                    <span>
                      I agree to the Terms of Service and <a href="https://sharematch.me/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline hover:text-white transition-colors">Privacy Policy</a>
                    </span>
                  </Checkbox>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-center mt-1">
                <div
                  className="rounded-full transition-all duration-300"
                  style={{
                    border: `1px solid ${isButtonHovered ? '#FFFFFF' : '#3AA189'}`,
                    boxShadow: isButtonHovered ? '0 0 20px rgba(255,255,255,0.3)' : 'none',
                    padding: '2px',
                  }}
                  onMouseEnter={() => setIsButtonHovered(true)}
                  onMouseLeave={() => setIsButtonHovered(false)}
                >
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-1.5 rounded-full flex items-center gap-2 font-medium transition-all duration-300 disabled:opacity-60 text-sm"
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      background: isButtonHovered
                        ? '#FFFFFF'
                        : 'linear-gradient(0deg, rgba(0,0,0,0.4), rgba(0,0,0,0.4)), linear-gradient(180deg, #019170 15%, #3AA189 50%, #019170 85%)',
                      color: isButtonHovered ? '#019170' : '#FFFFFF',
                    }}
                  >
                    {loading ? 'Processing...' : step === 1 ? 'Continue' : 'Create Account'}
                    {!loading && (
                      <svg width="18" height="7" viewBox="0 0 48 14" fill="none">
                        <line x1="0" y1="7" x2="40" y2="7" stroke={isButtonHovered ? '#019170' : '#FFFFFF'} strokeWidth="2" />
                        <path d="M40 1L47 7L40 13" stroke={isButtonHovered ? '#019170' : '#FFFFFF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Switch to Login */}
              {step === 1 && (
                <p className="text-center text-xs text-white mt-1" style={{ fontFamily: "'Inter', sans-serif" }}>
                  Already have an account?{' '}
                  <button type="button" onClick={onSwitchToLogin} className="underline hover:text-[#3AA189] transition-colors">
                    Login
                  </button>
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUpModal;

