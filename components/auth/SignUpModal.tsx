import React, { useState, useRef, useEffect } from "react";
import {
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Lock,
  Search,
  ArrowLeft,
  HelpCircle,
} from "lucide-react";
import Button from "../Button";
import HelpCenterModal from "../HelpCenterModal";
import { countries, Country } from "../../data/countries";
import {
  registerUser,
  RegistrationError,
  updateUserProfile,
  checkEmailVerificationStatus,
} from "../../lib/api";
import { parsePhoneNumberFromString, CountryCode } from "libphonenumber-js";

// Validate phone number using libphonenumber-js
// Returns true if valid, false otherwise
const isValidPhoneNumber = (
  phoneNumber: string,
  countryCode: string,
  countryIso: string
): boolean => {
  try {
    if (!phoneNumber.trim()) return false;
    const fullNumber = `${countryCode}${phoneNumber.replace(/\D/g, "")}`;
    const parsed = parsePhoneNumberFromString(
      fullNumber,
      countryIso.toUpperCase() as CountryCode
    );
    return parsed ? parsed.isValid() : false;
  } catch {
    return false;
  }
};

// Normalize phone number to E.164 format using libphonenumber-js
// This properly handles all international formats and strips unnecessary leading zeros
const normalizePhoneToE164 = (
  phoneNumber: string,
  countryCode: string,
  countryIso: string
): string => {
  try {
    // Combine country code with phone number
    const fullNumber = `${countryCode}${phoneNumber.replace(/\D/g, "")}`;
    const parsed = parsePhoneNumberFromString(
      fullNumber,
      countryIso.toUpperCase() as CountryCode
    );
    if (parsed && parsed.isValid()) {
      return parsed.format("E.164");
    }
    // Fallback: just combine and strip leading zeros after country code
    const digitsOnly = phoneNumber.replace(/\D/g, "").replace(/^0+/, "");
    return `${countryCode}${digitsOnly}`;
  } catch {
    // Fallback: just combine and strip leading zeros
    const digitsOnly = phoneNumber.replace(/\D/g, "").replace(/^0+/, "");
    return `${countryCode}${digitsOnly}`;
  }
};

// Utility function to parse E.164 phone number into country code and phone number
const parsePhoneNumber = (
  phone: string
): { countryCode: string; phoneNumber: string; countryIso: string } => {
  if (!phone) {
    return { countryCode: "+1", phoneNumber: "", countryIso: "US" };
  }

  // Remove all spaces and non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, "");

  if (!cleaned.startsWith("+")) {
    // If no country code, return as-is
    return { countryCode: "+1", phoneNumber: cleaned, countryIso: "US" };
  }

  // Try to match country codes (1-4 digits after +)
  // Check all possible country codes from longest to shortest
  for (let codeLength = 4; codeLength >= 1; codeLength--) {
    const countryCode = cleaned.substring(0, codeLength + 1); // +1, +44, +971, etc.
    const phoneNumber = cleaned.substring(codeLength + 1);

    // Find matching country
    const country = countries.find((c) => c.dial_code === countryCode);
    if (country && phoneNumber.length > 0) {
      return {
        countryCode: country.dial_code,
        phoneNumber: phoneNumber,
        countryIso: country.code,
      };
    }
  }

  // Fallback: try to extract first 1-3 digits as country code
  const match = cleaned.match(/^\+(\d{1,3})(\d+)$/);
  if (match) {
    const [, codeDigits, rest] = match;
    const countryCode = `+${codeDigits}`;
    const country = countries.find((c) => c.dial_code === countryCode);
    return {
      countryCode: countryCode,
      phoneNumber: rest,
      countryIso: country?.code || "US",
    };
  }

  // Default fallback
  return {
    countryCode: "+1",
    phoneNumber: cleaned.substring(1),
    countryIso: "US",
  };
};

// --- Types ---
export interface FormData {
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
  agreeToMarketingComms: boolean;
}

const initialFormData: FormData = {
  fullName: "",
  dob: "",
  countryOfResidence: "",
  email: "",
  password: "",
  confirmPassword: "",
  referralCode: "",
  phone: "",
  phoneCode: "+1",
  phoneIso: "US",
  whatsapp: "",
  whatsappCode: "+1",
  whatsappIso: "US",
  useSameNumber: false,
  agreeToWhatsappOtp: false,
  agreeToTerms: false,
  agreeToMarketingComms: false,
};

// --- Eye Icon ---
const EyeIcon = ({ off = false }: { off?: boolean }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {off ? (
      <>
        <path
          d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line
          x1="1"
          y1="1"
          x2="23"
          y2="23"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ) : (
      <>
        <path
          d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx="12"
          cy="12"
          r="3"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    )}
  </svg>
);

// --- Input Field Component ---
const InputField = ({
  label,
  name,
  type = "text",
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  icon,
  disabled = false,
  isValidating = false,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  error?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  isValidating?: boolean;
}) => (
  <div className="flex flex-col w-full">
    <label
      htmlFor={name}
      className="text-white text-xs font-medium mb-1 font-sans"
    >
      {label}
    </label>
    <div
      className={`flex items-center w-full bg-gray-200 rounded-full shadow-inner transition-all h-9 px-4 ${
        error
          ? "ring-2 ring-red-500"
          : "focus-within:ring-2 focus-within:ring-brand-emerald500"
      } ${disabled ? "cursor-not-allowed" : ""}`}
    >
      <input
        id={name}
        name={name}
        type={type}
        disabled={disabled}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        className="flex-1 min-w-0 bg-transparent text-gray-900 placeholder-gray-500 outline-none text-xs font-sans"
      />
      {isValidating ? (
        <span className="ml-2 flex-shrink-0">
          <svg
            className="animate-spin h-4 w-4 text-gray-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </span>
      ) : icon ? (
        <span className="text-gray-900 ml-2 flex-shrink-0">{icon}</span>
      ) : null}
    </div>
    {error && <p className="text-red-400 text-xs mt-0.5 font-sans">{error}</p>}
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
  disabled = false,
}: {
  label: string;
  name: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  hint?: string;
  disabled?: boolean;
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col w-full">
      <label
        htmlFor={name}
        className="text-white text-xs font-medium mb-1 font-sans"
      >
        {label}
      </label>
      <div
        className={`flex items-center w-full bg-gray-200 rounded-full shadow-inner transition-all h-9 px-4 ${
          error
            ? "ring-2 ring-red-500"
            : "focus-within:ring-2 focus-within:ring-brand-emerald500"
        } ${disabled ? "cursor-not-allowed" : ""}`}
      >
        <input
          id={name}
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`flex-1 min-w-0 bg-transparent text-gray-900 placeholder-gray-500 outline-none text-xs font-sans ${
            disabled ? "cursor-not-allowed" : ""
          }`}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="text-gray-900 ml-2 flex-shrink-0 hover:text-gray-700 transition-colors"
        >
          <EyeIcon off={!visible} />
        </button>
      </div>
      {hint && !error && (
        <p className="text-white text-xs mt-0.5 font-sans">{hint}</p>
      )}
      {error && (
        <p className="text-red-400 text-xs mt-0.5 font-sans">{error}</p>
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
  disabled = false,
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
  disabled?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedCountry =
    countries.find((c) => c.code === countryIso) || countries[0];
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
        className="text-white text-xs font-medium mb-1 font-sans"
      >
        {label}
      </label>
      <div
        className={`flex items-center w-full bg-gray-200 rounded-full shadow-inner transition-all relative h-9 px-4 ${
          error
            ? "ring-2 ring-red-500"
            : "focus-within:ring-2 focus-within:ring-brand-emerald500"
        } ${disabled ? "cursor-not-allowed" : ""}`}
        ref={dropdownRef}
      >
        {/* Country Selector */}
        <button
          type="button"
          onClick={() => {
            if (disabled) return;
            setIsOpen(!isOpen);
            setSearch("");
          }}
          disabled={disabled}
          className={`flex items-center gap-1 pr-2 border-r border-gray-400 mr-2 h-full ${
            disabled ? "cursor-not-allowed" : ""
          }`}
        >
          <img
            src={`https://flagcdn.com/w40/${selectedCountry.code.toLowerCase()}.png`}
            alt={selectedCountry.name}
            className="w-5 h-4 object-cover rounded"
          />
          <ChevronDown
            className={`w-3 h-3 text-gray-600 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>
        <span className="text-gray-900 text-xs font-medium mr-2 font-sans">
          {selectedCountry.dial_code}
        </span>
        <input
          id={name}
          name={name}
          type="tel"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`flex-1 min-w-0 bg-transparent text-gray-900 placeholder-gray-500 outline-none text-xs font-sans ${
            disabled ? "cursor-not-allowed" : ""
          }`}
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
                  className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left ${
                    c.code === countryIso ? "bg-brand-emerald500/10" : ""
                  }`}
                >
                  <img
                    src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`}
                    alt={c.name}
                    className="w-5 h-4 object-cover rounded"
                  />
                  <span className="text-sm text-gray-800 flex-1 truncate">
                    {c.name}
                  </span>
                  <span className="text-xs text-gray-500">{c.dial_code}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {error && (
        <p className="text-red-400 text-xs mt-0.5 font-sans">{error}</p>
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
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
        className="text-white text-xs font-medium mb-1 font-sans"
      >
        {label}
      </label>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch("");
        }}
        className={`flex items-center w-full bg-gray-200 rounded-full shadow-inner transition-all text-left relative h-9 px-4 ${
          error
            ? "ring-2 ring-red-500"
            : "focus:ring-2 focus:ring-brand-emerald500"
        }`}
      >
        {selectedCountry ? (
          <>
            <img
              src={`https://flagcdn.com/w40/${selectedCountry.code.toLowerCase()}.png`}
              alt={selectedCountry.name}
              className="w-5 h-4 object-cover rounded mr-2"
            />
            <span className="text-gray-900 text-xs flex-1 truncate font-sans">
              {selectedCountry.name}
            </span>
          </>
        ) : (
          <span className="text-gray-500 text-xs flex-1 font-sans">
            Select country
          </span>
        )}
        <svg
          className="w-4 h-4 text-gray-900 ml-2 flex-shrink-0"
          viewBox="0 0 24 24"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
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
                  className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer ${
                    c.code === value ? "bg-brand-emerald500/10" : ""
                  }`}
                >
                  <img
                    src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`}
                    alt={c.name}
                    className="w-5 h-4 object-cover rounded"
                  />
                  <span className="text-sm text-gray-800 flex-1 truncate">
                    {c.name}
                  </span>
                  {c.code === value && (
                    <Check className="w-4 h-4 text-brand-emerald500" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </button>
      {error && (
        <p className="text-red-400 text-xs mt-0.5 font-sans">{error}</p>
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
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatted = hasDate
    ? parsed!.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

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

  const isDateTooRecent = (day: number) =>
    new Date(year, month, day) > maxAllowedDate;

  const handleSelect = (day: number | null) => {
    if (!day || isDateTooRecent(day)) return;
    const selected = new Date(year, month, day);
    const iso = `${selected.getFullYear()}-${String(
      selected.getMonth() + 1
    ).padStart(2, "0")}-${String(selected.getDate()).padStart(2, "0")}`;
    onChange(iso);
    setIsOpen(false);
  };

  return (
    <div className="flex flex-col w-full relative" ref={containerRef}>
      <label className="text-white text-xs font-medium mb-1 font-sans">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center w-full bg-gray-200 rounded-full shadow-inner transition-all text-left h-9 px-4 ${
          error
            ? "ring-2 ring-red-500"
            : "focus:ring-2 focus:ring-brand-emerald500"
        }`}
      >
        <span
          className={`flex-1 text-xs font-sans ${
            formatted ? "text-gray-900" : "text-gray-500"
          }`}
        >
          {formatted || "Select date of birth"}
        </span>
        <svg
          width="18"
          height="18"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-gray-900"
        >
          <path
            d="M0 17C0 18.7 1.3 20 3 20H17C18.7 20 20 18.7 20 17V9H0V17ZM17 2H15V1C15 0.4 14.6 0 14 0C13.4 0 13 0.4 13 1V2H7V1C7 0.4 6.6 0 6 0C5.4 0 5 0.4 5 1V2H3C1.3 2 0 3.3 0 5V7H20V5C20 3.3 18.7 2 17 2Z"
            fill="currentColor"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-3">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() =>
                setMonth((p) => (p === 0 ? (setYear(year - 1), 11) : p - 1))
              }
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronLeft className="w-4 h-4 text-gray-900" />
            </button>
            <div className="flex gap-2">
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="text-sm border rounded px-2 py-1 text-gray-900 font-medium"
              >
                {monthNames.map((m, i) => (
                  <option key={m} value={i}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="text-sm border rounded px-2 py-1 text-gray-900 font-medium"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() =>
                setMonth((p) => (p === 11 ? (setYear(year + 1), 0) : p + 1))
              }
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronRight className="w-4 h-4 text-gray-900" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-900 font-medium mb-1">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-sm">
            {weeks.flat().map((day, i) => {
              const isSelected =
                hasDate &&
                parsed!.getDate() === day &&
                parsed!.getMonth() === month &&
                parsed!.getFullYear() === year;
              const tooRecent = day ? isDateTooRecent(day) : false;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelect(day)}
                  disabled={!day || tooRecent}
                  className={`aspect-square rounded-full flex items-center justify-center transition-all text-gray-900 ${
                    !day
                      ? "invisible"
                      : tooRecent
                      ? "text-gray-300 cursor-not-allowed"
                      : isSelected
                      ? "bg-brand-emerald500 text-white"
                      : "hover:bg-gray-100"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {error && (
        <p className="text-red-400 text-xs mt-0.5 font-sans">{error}</p>
      )}
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
  <label
    htmlFor={id}
    className="flex items-center gap-2 cursor-pointer select-none"
  >
    <div className="relative flex items-center justify-center flex-shrink-0 w-4 h-4">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={`peer cursor-pointer appearance-none w-4 h-4 rounded border ${
          error ? "border-red-500" : "border-white"
        } bg-transparent transition-all checked:border-white checked:bg-white`}
      />
      <span className="absolute inset-0 flex items-center justify-center opacity-0 peer-checked:opacity-100 text-brand-primary pointer-events-none">
        <Check size={10} strokeWidth={4} />
      </span>
    </div>
    <span
      className={`text-xs leading-normal font-sans ${
        error ? "text-red-400" : "text-white"
      }`}
    >
      {children}
    </span>
  </label>
);

// --- Edit Mode Data Interface ---
// Contains all form data so user can return to exact same state
export interface EditModeData {
  // Step 1 data
  email: string;
  fullName?: string;
  dob?: string;
  countryOfResidence?: string;
  referralCode?: string;
  // Step 2 data
  phone?: string;
  phoneCode?: string;
  phoneIso?: string;
  whatsappPhone?: string;
  whatsappCode?: string;
  whatsappIso?: string;
  useSameNumber?: boolean;
  agreeToWhatsappOtp?: boolean;
  agreeToTerms?: boolean;
  agreeToMarketingComms?: boolean;
}

// --- Main Modal Component ---
interface SignUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin?: () => void;
  onSuccess?: (email: string, userId: string, formData: FormData) => void;
  // Edit mode props (only for step 2 - phone/WhatsApp editing)
  isEditMode?: boolean;
  editData?: EditModeData;
  onEditSuccess?: (
    email: string,
    whatsappPhone: string | undefined,
    formData: FormData
  ) => void;
}

export const SignUpModal: React.FC<SignUpModalProps> = ({
  isOpen,
  onClose,
  onSwitchToLogin,
  onSuccess,
  isEditMode = false,
  editData,
  onEditSuccess,
}) => {
  const [step, setStep] = useState<1 | 2>(isEditMode ? 2 : 1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormData | "form", string>>
  >({});
  const [loading, setLoading] = useState(false);
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const [emailValidating, setEmailValidating] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Email validation on blur
  const handleEmailBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const email = e.target.value.trim().toLowerCase();

    // Skip if empty
    if (!email) return;

    // Check format first
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrors((prev) => ({ ...prev, email: "Invalid email format" }));
      return;
    }

    // Check if email exists in database
    setEmailValidating(true);
    try {
      const emailStatus = await checkEmailVerificationStatus(email);
      if (emailStatus.exists && emailStatus.fullyVerified) {
        setErrors((prev) => ({
          ...prev,
          email:
            "An account with this email already exists. Please log in to continue.",
        }));
      } else {
        // Clear error if valid
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.email;
          return newErrors;
        });
      }
    } catch (err) {
      console.error("Error checking email:", err);
      // Don't show error if check fails - will be caught on submit
    } finally {
      setEmailValidating(false);
    }
  };

  // Initialize form with edit data when in edit mode (step 2 only)
  // This restores the exact form state the user had before
  useEffect(() => {
    if (isOpen && isEditMode && editData) {
      // Parse phone numbers if they're in E.164 format (full number with country code)
      let phoneData = {
        countryCode: editData.phoneCode || "+1",
        phoneNumber: editData.phone || "",
        countryIso: editData.phoneIso || "US",
      };
      if (
        editData.phone &&
        editData.phone.startsWith("+") &&
        !editData.phoneCode
      ) {
        phoneData = parsePhoneNumber(editData.phone);
      }

      let whatsappData = {
        countryCode: editData.whatsappCode || "+1",
        phoneNumber: "",
        countryIso: editData.whatsappIso || "US",
      };
      if (editData.whatsappPhone) {
        // If whatsappPhone is provided and includes country code, parse it
        if (editData.whatsappPhone.startsWith("+")) {
          whatsappData = parsePhoneNumber(editData.whatsappPhone);
        } else {
          // If it's just the phone number without country code, use the provided code
          whatsappData.phoneNumber = editData.whatsappPhone;
          whatsappData.countryCode = editData.whatsappCode || "+1";
          whatsappData.countryIso = editData.whatsappIso || "US";
        }
      }

      setFormData({
        // Step 1 fields - not used in edit mode
        fullName: "",
        dob: "",
        countryOfResidence: "",
        email: editData.email || "",
        password: "",
        confirmPassword: "",
        referralCode: "",
        // Step 2 fields - parse phone numbers to avoid duplicate country codes
        phone: phoneData.phoneNumber,
        phoneCode: phoneData.countryCode,
        phoneIso: phoneData.countryIso,
        whatsapp: whatsappData.phoneNumber,
        whatsappCode: whatsappData.countryCode,
        whatsappIso: whatsappData.countryIso,
        useSameNumber: editData.useSameNumber || false,
        agreeToWhatsappOtp: editData.agreeToWhatsappOtp ?? true,
        agreeToTerms: editData.agreeToTerms ?? true,
        agreeToMarketingComms: editData.agreeToMarketingComms ?? false,
      });
      setStep(2);
    }
  }, [isOpen, isEditMode, editData]);

  // Reset form when modal closes (only if not in edit mode)
  useEffect(() => {
    if (!isOpen && !isEditMode) {
      setStep(1);
      setFormData(initialFormData);
      setErrors({});
      setLoading(false);
      setIsButtonHovered(false);
    }
  }, [isOpen, isEditMode]);

  // Reset loading and hover states when modal opens
  useEffect(() => {
    if (isOpen) {
      setLoading(false);
      setIsButtonHovered(false);
    }
  }, [isOpen]);

  // Helper to strip leading zeros from phone numbers (e.g., 050 -> 50)
  const stripLeadingZeros = (phoneNumber: string) => {
    // Remove non-digits first, then strip leading zeros
    const digitsOnly = phoneNumber.replace(/\D/g, "");
    return digitsOnly.replace(/^0+/, "");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => {
      let processedValue = type === "checkbox" ? checked : value;

      // Strip leading zeros from phone and whatsapp fields
      if (
        (name === "phone" || name === "whatsapp") &&
        typeof processedValue === "string"
      ) {
        processedValue = stripLeadingZeros(processedValue);
      }

      const newData = { ...prev, [name]: processedValue };
      if (name === "useSameNumber" && checked) {
        newData.whatsapp = prev.phone;
        newData.whatsappCode = prev.phoneCode;
        newData.whatsappIso = prev.phoneIso;
      }
      if (name === "phone" && prev.useSameNumber) {
        newData.whatsapp =
          typeof processedValue === "string" ? processedValue : value;
      }
      return newData;
    });
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleCountryChange = (
    field: "phone" | "whatsapp",
    country: Country
  ) => {
    setFormData((prev) => {
      const newData = {
        ...prev,
        [`${field}Code`]: country.dial_code,
        [`${field}Iso`]: country.code,
      };
      if (field === "phone" && prev.useSameNumber) {
        newData.whatsappCode = country.dial_code;
        newData.whatsappIso = country.code;
      }
      return newData;
    });
  };

  const validateStep1 = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!formData.fullName.trim()) newErrors.fullName = "Full name is required";
    if (!formData.dob) {
      newErrors.dob = "Date of birth is required";
    } else {
      const birthDate = new Date(formData.dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      if (age < 18) newErrors.dob = "You must be at least 18 years old";
    }
    if (!formData.countryOfResidence)
      newErrors.countryOfResidence = "Country is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      newErrors.email = "Invalid email";
    // Password validation (always required for step 1)
    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 8)
      newErrors.password = "Password must be at least 8 characters";
    if (!formData.confirmPassword)
      newErrors.confirmPassword = "Please confirm your password";
    else if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    // Phone validation
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (
      !isValidPhoneNumber(formData.phone, formData.phoneCode, formData.phoneIso)
    ) {
      newErrors.phone = "Invalid phone number";
    }

    // WhatsApp validation
    if (!formData.whatsapp.trim()) {
      newErrors.whatsapp = "WhatsApp number is required";
    } else if (
      !isValidPhoneNumber(
        formData.whatsapp,
        formData.whatsappCode,
        formData.whatsappIso
      )
    ) {
      newErrors.whatsapp = "Invalid WhatsApp number";
    }

    if (!formData.agreeToTerms) newErrors.agreeToTerms = "Required";
    if (!formData.agreeToWhatsappOtp) newErrors.agreeToWhatsappOtp = "Required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep1()) {
      return;
    }

    // Check if email exists and is fully verified before proceeding
    setLoading(true);
    setErrors({});

    try {
      const emailStatus = await checkEmailVerificationStatus(
        formData.email.toLowerCase()
      );

      if (emailStatus.exists && emailStatus.fullyVerified) {
        // Email exists and both email and WhatsApp are verified
        setErrors({
          email:
            "An account with this email already exists. Please log in to continue.",
        });
        setLoading(false);
        return;
      }

      // Email doesn't exist or is not fully verified - proceed to step 2
      setStep(2);
      setIsButtonHovered(false);
    } catch (error: any) {
      // If check fails, still allow proceeding (don't block user flow)
      console.error("Error checking email status:", error);
      setStep(2);
      setIsButtonHovered(false);
    } finally {
      setLoading(false);
    }
  };

  // Handle edit mode save for Step 2
  const handleEditSaveStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    // For edit mode step 2, validate both phone fields
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    // Phone validation
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (
      !isValidPhoneNumber(formData.phone, formData.phoneCode, formData.phoneIso)
    ) {
      newErrors.phone = "Invalid phone number";
    }

    // WhatsApp validation
    if (!formData.whatsapp.trim()) {
      newErrors.whatsapp = "WhatsApp number is required";
    } else if (
      !isValidPhoneNumber(
        formData.whatsapp,
        formData.whatsappCode,
        formData.whatsappIso
      )
    ) {
      newErrors.whatsapp = "Invalid WhatsApp number";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    setErrors({});

    try {
      // Normalize phone numbers to E.164 using libphonenumber-js
      const phone = normalizePhoneToE164(
        formData.phone,
        formData.phoneCode,
        formData.phoneIso
      );
      const whatsappPhone = normalizePhoneToE164(
        formData.whatsapp,
        formData.whatsappCode,
        formData.whatsappIso
      );

      const result = await updateUserProfile({
        currentEmail: editData?.email || "",
        phone,
        whatsappPhone,
        sendWhatsAppOtp: true, // Always send OTP after phone edit
      });

      if (result.ok) {
        // Return to verification with updated form data
        if (onEditSuccess) {
          const updatedFormData = { ...formData };
          onEditSuccess(
            editData?.email || "",
            result.newWhatsappPhone || whatsappPhone,
            updatedFormData
          );
        }
      }
    } catch (error: any) {
      setErrors({ form: error.message || "Failed to update profile" });
      setIsButtonHovered(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep2()) return;

    setLoading(true);
    setErrors({});

    try {
      // Normalize phone numbers to E.164 using libphonenumber-js
      const phone = normalizePhoneToE164(
        formData.phone,
        formData.phoneCode,
        formData.phoneIso
      );
      const whatsappPhone = normalizePhoneToE164(
        formData.whatsapp,
        formData.whatsappCode,
        formData.whatsappIso
      );

      const payload = {
        full_name: formData.fullName,
        email: formData.email.toLowerCase(),
        phone: phone,
        whatsapp_phone: whatsappPhone,
        dob: formData.dob,
        country_of_residence: formData.countryOfResidence,
        referral_code: formData.referralCode?.trim() || null,
        password: formData.password,
        receive_otp_sms: formData.agreeToWhatsappOtp,
        agree_to_terms: formData.agreeToTerms,
        email_marketing: formData.agreeToMarketingComms,
        whatsapp_marketing: formData.agreeToMarketingComms,
      };

      const result = await registerUser(payload);

      // Trigger verification flow on successful registration
      // Pass all form data so it can be restored if user needs to edit
      if (onSuccess) {
        onSuccess(result.email, result.user_id, formData);
      }
    } catch (error) {
      if (error instanceof RegistrationError) {
        // Handle specific duplicate errors
        if (error.duplicates?.includes("email")) {
            setErrors({
              email:
                "An account with this email already exists. Please log in to continue.",
            });
          setStep(1); // Go back to step 1 to show email error
        } else if (error.duplicates?.includes("phone")) {
          setErrors({
            phone: "An account with this phone number already exists",
          });
        } else if (error.duplicates?.includes("whatsapp_phone")) {
          setErrors({
            whatsapp: "An account with this WhatsApp number already exists",
          });
        } else {
          setErrors({ form: error.message });
        }
      } else {
        setErrors({ form: "An unexpected error occurred. Please try again." });
      }
      setIsButtonHovered(false);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto w-full h-full">
      {/* Backdrop - no click to close to preserve form state */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal */}
      <div
        data-testid="signup-modal"
        className="relative w-full flex flex-col md:flex-row items-stretch overflow-hidden my-4 bg-[#005430] rounded-modal z-[101]"
        style={{
          maxWidth: "min(90vw, 900px)",
          maxHeight: "95vh",
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors z-30"
          data-testid="signup-close-button"
        >
          <X className="w-5 h-5" strokeWidth={2} />
        </button>

        {/* Back Button - Step 2 */}
        {step === 2 && (
          <button
            type="button"
            onClick={() => setStep(1)}
            className="absolute top-6 left-6 w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors z-30"
            data-testid="signup-back-button"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
        )}

        {/* Left Side - Branding */}
        <div
          className={`hidden md:flex w-5/12 flex-col items-center justify-center p-4 pb-24 relative ${
            step === 2 ? "justify-center" : ""
          }`}
        >
          <img
            src="/logos/mobile-header-logo-matched.svg"
            alt="ShareMatch"
            className={`h-32 object-contain ${
              step === 2 ? "mt-16 mb-0" : "mb-3"
            }`}
          />
          {step === 1 && (
            <>
              <h1
                className="text-white text-center leading-tight mb-4 whitespace-pre-line font-bold"
                style={{ fontSize: "clamp(2rem, 2.5vw + 0.5rem, 3rem)" }}
              >
                Create Your <br /> Account
              </h1>
              <p className="mt-8 text-gray-400 text-center font-medium text-lg leading-relaxed px-4">
                Real Markets. Real Transparency.
              </p>
            </>
          )}
        </div>

        {/* Mobile Header */}
        <div className="md:hidden p-5 flex items-center justify-center relative">
          <img
            src="/logos/mobile-header-logo-matched.svg"
            alt="ShareMatch"
            className="h-16 object-contain"
          />
        </div>

        {/* Right Side - Form */}
        <div
          className="flex-1 p-3 pt-10 md:p-4 md:pt-14 md:pr-8 overflow-y-auto flex flex-col"
          style={{ maxHeight: "calc(95vh - 2rem)" }}
        >
          <div
            className="rounded-xl p-3 md:p-4 flex flex-col border-none bg-transparent"
            style={{
              minHeight: "460px",
            }}
          >
            {step === 2 ? (
              <h2 className="text-white font-bold text-xl mb-3">
                Security & Verification
              </h2>
            ) : null}

            {errors.form && (
              <div className="mb-3 p-2 bg-red-900/30 border border-red-500/50 rounded-lg text-red-200 text-xs">
                {errors.form}
              </div>
            )}

            <form
              onSubmit={
                isEditMode
                  ? handleEditSaveStep2
                  : step === 1
                  ? handleNext
                  : handleSubmit
              }
              className="flex flex-col gap-2 flex-1"
            >
              {step === 1 ? (
                <>
                  <InputField
                    label="Full Name *"
                    name="fullName"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={handleChange}
                    error={errors.fullName}
                    data-testid="signup-fullname-input"
                    icon={
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
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
                      if (errors.dob)
                        setErrors((p) => ({ ...p, dob: undefined }));
                    }}
                    error={errors.dob}
                  />
                  <CountrySelectField
                    label="Country of Residence *"
                    name="countryOfResidence"
                    value={formData.countryOfResidence}
                    onChange={(code) => {
                      setFormData((p) => ({ ...p, countryOfResidence: code }));
                      if (errors.countryOfResidence)
                        setErrors((p) => ({
                          ...p,
                          countryOfResidence: undefined,
                        }));
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
                    onBlur={handleEmailBlur}
                    error={errors.email}
                    isValidating={emailValidating}
                    data-testid="signup-email-input"
                    icon={
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                      </svg>
                    }
                  />
                  {/* Password fields */}
                  <PasswordField
                    label="Password *"
                    name="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    error={errors.password}
                    hint={
                      formData.password.length > 0 &&
                      formData.password.length < 8
                        ? "Must be at least 8 characters"
                        : undefined
                    }
                    data-testid="signup-password-input"
                  />
                  <PasswordField
                    label="Confirm Password *"
                    name="confirmPassword"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    error={errors.confirmPassword}
                    data-testid="signup-confirm-password-input"
                  />
                  <InputField
                    label="Referral Code (Optional)"
                    name="referralCode"
                    placeholder="Enter code"
                    value={formData.referralCode}
                    onChange={handleChange}
                    data-testid="signup-referral-input"
                    icon={
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" />
                      </svg>
                    }
                  />
                </>
              ) : (
                <div className="flex flex-col gap-4 flex-1 justify-center">
                  {/* Phone field - editable in edit mode */}
                  <PhoneInputField
                    label="Phone Number *"
                    name="phone"
                    placeholder="123 456 7890"
                    value={formData.phone}
                    onChange={handleChange}
                    error={errors.phone}
                    countryIso={formData.phoneIso}
                    countryDialCode={formData.phoneCode}
                    onCountryChange={(c) => handleCountryChange("phone", c)}
                    data-testid="signup-phone-input"
                  />

                  <Checkbox
                    id="useSameNumber"
                    checked={formData.useSameNumber}
                    onChange={(checked) => {
                      setFormData((p) => ({
                        ...p,
                        useSameNumber: checked,
                        whatsapp: checked ? p.phone : "",
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
                    onCountryChange={(c) => handleCountryChange("whatsapp", c)}
                    data-testid="signup-whatsapp-input"
                  />

                  <Checkbox
                    id="agreeToWhatsappOtp"
                    checked={formData.agreeToWhatsappOtp}
                    onChange={(checked) =>
                      setFormData((p) => ({
                        ...p,
                        agreeToWhatsappOtp: checked,
                      }))
                    }
                    error={!!errors.agreeToWhatsappOtp}
                  >
                    I agree to receive communications via Email and WhatsApp
                  </Checkbox>

                  {/* Security Notice */}
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-white flex-shrink-0" />
                    <p className="text-white text-xs leading-normal font-sans">
                      Your account is protected with encryption. Never share
                      your password.
                    </p>
                  </div>

                  <Checkbox
                    id="agreeToMarketingComms"
                    checked={formData.agreeToMarketingComms}
                    onChange={(checked) =>
                      setFormData((p) => ({ ...p, agreeToMarketingComms: checked }))
                    }
                    error={false}
                  >
                    <span className="text-gray-400">
                      I agree to receive marketing communications via Email and WhatsApp (optional)
                    </span>
                  </Checkbox>

                  <Checkbox
                    id="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onChange={(checked) =>
                      setFormData((p) => ({ ...p, agreeToTerms: checked }))
                    }
                    error={!!errors.agreeToTerms}
                  >
                    <span>
                      I agree to the
                      {" "}
                      <a
                        href="/terms.html"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-white transition-colors"
                      >
                        Terms of Service
                      </a>
                      {" "}and{" "}
                      <a
                        href="/privacy.html"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-white transition-colors"
                      >
                        Privacy Policy
                      </a>
                    </span>
                  </Checkbox>

                  
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-center mt-1">
                <div
                  className={`rounded-full transition-all duration-300 ${
                    isButtonHovered ? "shadow-glow" : ""
                  }`}
                  onMouseEnter={() => setIsButtonHovered(true)}
                  onMouseLeave={() => setIsButtonHovered(false)}
                >
                  <Button
                    type="submit"
                    disabled={loading}
                    className={`px-5 py-1.5 rounded-full flex items-center gap-2 font-medium transition-all duration-300 text-sm font-sans ${
                      isButtonHovered ? "opacity-90" : ""
                    } !disabled:opacity-100 disabled:cursor-not-allowed`}
                    variant="white"
                    data-testid={step === 1 ? "signup-continue-button" : "signup-submit-button"}
                  >
                    {loading
                      ? "Processing..."
                      : isEditMode
                      ? "Save Changes"
                      : step === 1
                      ? "Continue"
                      : "Create Account"}
                    {!loading && (
                      <svg
                        width="18"
                        height="7"
                        viewBox="0 0 48 14"
                        fill="none"
                        className="transition-colors"
                      >
                        <line
                          x1="0"
                          y1="7"
                          x2="40"
                          y2="7"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        <path
                          d="M40 1L47 7L40 13"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </Button>
                </div>
              </div>

              {/* Switch to Login */}
              {step === 1 && (
                <p className="text-center text-xs text-white mt-1 font-sans">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={onSwitchToLogin}
                    className="underline hover:text-brand-emerald500 transition-colors"
                    data-testid="signup-switch-to-login"
                  >
                    Login
                  </button>
                </p>
              )}

              {/* Need Help Link */}
              <button
                type="button"
                onClick={() => setShowHelp(true)}
                className="flex items-center justify-center gap-1.5 text-gray-400 hover:text-white transition-colors text-xs mt-1"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Need help?</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Help Center Modal */}
      <HelpCenterModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        isLoggedIn={false}
        defaultExpandedTopic="signup"
        onOpenLogin={() => {
          setShowHelp(false);
          onSwitchToLogin?.();
        }}
        onOpenSignUp={() => setShowHelp(false)}
      />
    </div>
  );
};

export default SignUpModal;
