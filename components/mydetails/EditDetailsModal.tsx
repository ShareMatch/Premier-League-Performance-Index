import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Info, ChevronDown, Search } from "lucide-react";
import { parsePhoneNumberFromString, CountryCode } from "libphonenumber-js";
import { countries, Country } from "../../data/countries";
import {
  checkEmailVerificationStatus,
  checkWhatsAppVerificationStatus,
} from "../../lib/api";
import Button from "../Button";

// Validate email format
const isValidEmail = (email: string): boolean => {
  if (!email.trim()) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Validate phone number using libphonenumber-js
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

// Normalize phone number to E.164 format
const normalizePhoneToE164 = (
  phoneNumber: string,
  countryCode: string,
  countryIso: string
): string => {
  try {
    const fullNumber = `${countryCode}${phoneNumber.replace(/\D/g, "")}`;
    const parsed = parsePhoneNumberFromString(
      fullNumber,
      countryIso.toUpperCase() as CountryCode
    );
    if (parsed && parsed.isValid()) {
      return parsed.format("E.164");
    }
    const digitsOnly = phoneNumber.replace(/\D/g, "").replace(/^0+/, "");
    return `${countryCode}${digitsOnly}`;
  } catch {
    const digitsOnly = phoneNumber.replace(/\D/g, "").replace(/^0+/, "");
    return `${countryCode}${digitsOnly}`;
  }
};

// Parse E.164 phone number into components
const parsePhoneNumber = (
  phone: string
): { countryCode: string; phoneNumber: string; countryIso: string } => {
  if (!phone) {
    return { countryCode: "+971", phoneNumber: "", countryIso: "AE" };
  }

  const cleaned = phone.replace(/[^\d+]/g, "");

  if (!cleaned.startsWith("+")) {
    return { countryCode: "+971", phoneNumber: cleaned, countryIso: "AE" };
  }

  // Try to match country codes (1-4 digits after +)
  for (let codeLength = 4; codeLength >= 1; codeLength--) {
    const countryCode = cleaned.substring(0, codeLength + 1);
    const phoneNumber = cleaned.substring(codeLength + 1);
    const country = countries.find((c) => c.dial_code === countryCode);
    if (country && phoneNumber.length > 0) {
      return {
        countryCode: country.dial_code,
        phoneNumber,
        countryIso: country.code,
      };
    }
  }

  return {
    countryCode: "+971",
    phoneNumber: cleaned.substring(1),
    countryIso: "AE",
  };
};

// --- Phone Input Field Component ---
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
  hint,
}: {
  label: string;
  name: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  countryIso: string;
  countryDialCode: string;
  onCountryChange: (country: Country) => void;
  disabled?: boolean;
  hint?: string;
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
    countries.find((c) => c.code === countryIso) ||
    countries.find((c) => c.code === "AE") ||
    countries[0];
  const filtered = countries.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.dial_code.includes(search) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  );

  // Strip leading zeros from input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").replace(/^0+/, "");
    onChange(digits);
  };

  return (
    <div className="flex flex-col w-full gap-1 sm:gap-1.5">
      <label
        htmlFor={name}
        className="text-white text-xs sm:text-sm font-medium font-sans"
      >
        {label}
      </label>
      <div
        className={`flex items-center w-full bg-gray-200 rounded-full shadow-inner transition-all relative h-9 sm:h-10 px-3 sm:px-4 ${
          error
            ? "ring-2 ring-red-500"
            : "focus-within:ring-2 focus-within:ring-brand-emerald500"
        } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
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
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`flex-1 min-w-0 bg-transparent text-gray-900 placeholder-gray-500 outline-none text-xs sm:text-sm font-sans ${
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
        <p className="text-red-400 text-[10px] sm:text-xs mt-0.5 font-sans ml-1">
          {error}
        </p>
      )}
      {!error && hint && (
        <p className="text-gray-300 text-[10px] sm:text-xs font-sans ml-1">
          {hint}
        </p>
      )}
    </div>
  );
};

interface EditField {
  key: string;
  label: string;
  value: string;
  editable?: boolean;
  type?: "text" | "email" | "tel";
  hint?: string;
}

interface EditDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fields: EditField[];
  onSave: (updatedFields: Record<string, string>) => Promise<void>;
  note?: string;
  error?: string;
  currentEmail?: string; // For checking email duplicates
  currentWhatsApp?: string; // For checking WhatsApp duplicates
  currentUserId?: string; // To exclude current user from duplicate check
}

const EditDetailsModal: React.FC<EditDetailsModalProps> = ({
  isOpen,
  onClose,
  title,
  fields,
  onSave,
  note,
  error,
  currentEmail,
  currentWhatsApp,
  currentUserId,
}) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Phone country state
  const [phoneCountry, setPhoneCountry] = useState({
    code: "AE",
    dialCode: "+971",
  });
  const [whatsappCountry, setWhatsappCountry] = useState({
    code: "AE",
    dialCode: "+971",
  });

  useEffect(() => {
    if (isOpen) {
      const initialData: Record<string, string> = {};
      fields.forEach((field) => {
        if (field.type === "tel") {
          // Parse phone number to extract country code and number
          const parsed = parsePhoneNumber(field.value || "");
          initialData[field.key] = parsed.phoneNumber;

          if (field.key === "phone") {
            setPhoneCountry({
              code: parsed.countryIso,
              dialCode: parsed.countryCode,
            });
          } else if (field.key === "whatsapp") {
            setWhatsappCountry({
              code: parsed.countryIso,
              dialCode: parsed.countryCode,
            });
          }
        } else {
          initialData[field.key] = field.value || "";
        }
      });
      setFormData(initialData);
      setFieldErrors({});
      setSaveError(null);
    }
  }, [isOpen, fields]);

  // Validate individual field
  const validateField = (field: EditField, value: string): string | null => {
    if (!value.trim() && field.editable !== false) {
      return `${field.label} is required`;
    }

    // Email validation
    if (field.type === "email" && value.trim() && !isValidEmail(value)) {
      return "Invalid email address";
    }

    // Phone/WhatsApp validation
    if (field.type === "tel" && value.trim()) {
      const country = field.key === "phone" ? phoneCountry : whatsappCountry;
      if (!isValidPhoneNumber(value, country.dialCode, country.code)) {
        return "Invalid phone number";
      }
    }

    return null;
  };

  // Validate all fields
  const validateAllFields = (): boolean => {
    const errors: Record<string, string> = {};

    fields.forEach((field) => {
      if (field.editable === false) return;
      const error = validateField(field, formData[field.key] || "");
      if (error) {
        errors[field.key] = error;
      }
    });

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  if (!isOpen) return null;

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    // Clear field error when user starts typing
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  // Handle email blur - validate format on blur
  const handleEmailBlur = async (value: string) => {
    const email = value.trim().toLowerCase();

    // Skip if empty
    if (!email) return;

    // Check format first
    if (!isValidEmail(email)) {
      setFieldErrors((prev) => ({ ...prev, email: "Invalid email address" }));
      return;
    }

    // Check if email is different from current (only then check for duplicates)
    const currentEmailLower = currentEmail?.trim().toLowerCase();
    if (currentEmailLower && email === currentEmailLower) {
      // Same email, no need to check
      return;
    }

    // Check if email already exists
    try {
      const emailStatus = await checkEmailVerificationStatus(email);
      if (emailStatus.exists) {
        setFieldErrors((prev) => ({
          ...prev,
          email: "An account with this email already exists",
        }));
      }
    } catch (e) {
      console.error("Error checking email status on blur:", e);
      // Don't show error if check fails
    }
  };

  const handleSave = async () => {
    // Validate all fields before saving
    if (!validateAllFields()) {
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      // Build E.164 phone numbers for comparison
      const newWhatsAppE164 = formData.whatsapp
        ? normalizePhoneToE164(
            formData.whatsapp,
            whatsappCountry.dialCode,
            whatsappCountry.code
          )
        : "";

      // Check for email duplicates if email field exists and has a value
      const emailField = fields.find((f) => f.key === "email");
      const newEmail = formData.email?.trim().toLowerCase();
      const currentEmailLower = currentEmail?.trim().toLowerCase();
      console.log("Email check:", {
        newEmail,
        currentEmailLower,
        emailField: !!emailField,
      });

      // Check if email is being changed (or if we don't know current email, always check)
      const emailChanged =
        newEmail && (!currentEmailLower || newEmail !== currentEmailLower);

      if (emailField && newEmail && emailChanged) {
        try {
          console.log("Checking email status for:", newEmail);
          const emailStatus = await checkEmailVerificationStatus(newEmail);
          console.log("Email status result:", emailStatus);
          // Block if email already exists (regardless of verification status)
          if (emailStatus.exists) {
            setFieldErrors((prev) => ({
              ...prev,
              email: "An account with this email already exists",
            }));
            setSaving(false);
            return;
          }
        } catch (e) {
          console.error("Error checking email status:", e);
          // Continue anyway if check fails
        }
      }

      // Check for WhatsApp duplicates if WhatsApp is being changed
      const whatsappField = fields.find((f) => f.key === "whatsapp");
      console.log("WhatsApp check:", {
        newWhatsAppE164,
        currentWhatsApp,
        whatsappField: !!whatsappField,
      });

      // Check if WhatsApp is being changed (or if we don't know current WhatsApp, always check)
      const whatsappChanged =
        newWhatsAppE164 &&
        (!currentWhatsApp || newWhatsAppE164 !== currentWhatsApp);

      if (whatsappField && newWhatsAppE164 && whatsappChanged) {
        try {
          console.log("Checking WhatsApp status for:", newWhatsAppE164);
          const whatsappStatus = await checkWhatsAppVerificationStatus(
            newWhatsAppE164,
            currentUserId
          );
          console.log("WhatsApp status result:", whatsappStatus);
          // Block if WhatsApp already exists (regardless of verification status)
          if (whatsappStatus.exists) {
            setFieldErrors((prev) => ({
              ...prev,
              whatsapp: "An account with this WhatsApp number already exists",
            }));
            setSaving(false);
            return;
          }
        } catch (e) {
          console.error("Error checking WhatsApp status:", e);
          // Continue anyway if check fails
        }
      }

      // Build final data with full E.164 phone numbers
      const finalData = { ...formData };
      
      console.log("📋 EditDetailsModal formData:", formData);
      console.log("📋 EditDetailsModal finalData (before phone conversion):", finalData);

      // Convert phone numbers to E.164 format
      if (formData.phone) {
        finalData.phone = normalizePhoneToE164(
          formData.phone,
          phoneCountry.dialCode,
          phoneCountry.code
        );
      }
      if (formData.whatsapp) {
        finalData.whatsapp = newWhatsAppE164;
      }

      console.log("📋 EditDetailsModal calling onSave with:", finalData);
      await onSave(finalData);
    } catch (err: any) {
      console.error("Failed to save:", err);
      setSaveError(err.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field: EditField) => {
    // Phone fields with country code dropdown
    if (field.type === "tel") {
      const isPhone = field.key === "phone";
      const country = isPhone ? phoneCountry : whatsappCountry;
      const setCountry = isPhone ? setPhoneCountry : setWhatsappCountry;

      return (
        <PhoneInputField
          key={field.key}
          label={field.label}
          name={field.key}
          placeholder="Enter number"
          value={formData[field.key] || ""}
          onChange={(value) => handleChange(field.key, value)}
          error={fieldErrors[field.key]}
          countryIso={country.code}
          countryDialCode={country.dialCode}
          onCountryChange={(c) => {
            setCountry({ code: c.code, dialCode: c.dial_code });
            // Clear error on country change
            if (fieldErrors[field.key]) {
              setFieldErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[field.key];
                return newErrors;
              });
            }
          }}
          disabled={field.editable === false}
          hint={field.hint}
        />
      );
    }

    // Regular text/email fields
    return (
      <div key={field.key} className="flex flex-col w-full gap-1 sm:gap-1.5">
        <label
          htmlFor={`edit-${field.key}`}
          className="capitalize text-white text-xs sm:text-sm font-medium font-sans"
        >
          {field.label}
        </label>
        <div
          className={`flex items-center w-full bg-gray-200 rounded-full shadow-inner h-9 sm:h-10 px-3 sm:px-4 focus-within:ring-2 ${
            fieldErrors[field.key]
              ? "ring-2 ring-red-500 focus-within:ring-red-500"
              : "focus-within:ring-brand-emerald500"
          } ${field.editable === false ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          <input
            id={`edit-${field.key}`}
            type={field.type || "text"}
            value={formData[field.key] || ""}
            onChange={(e) => handleChange(field.key, e.target.value)}
            onBlur={
              field.type === "email"
                ? (e) => handleEmailBlur(e.target.value)
                : undefined
            }
            disabled={field.editable === false}
            className={`flex-1 min-w-0 bg-transparent text-gray-900 placeholder-gray-500 outline-none font-sans text-xs sm:text-sm ${
              field.editable === false ? "cursor-not-allowed" : ""
            }`}
            placeholder={`Enter ${field.label}`}
          />
        </div>
        {fieldErrors[field.key] && (
          <p className="text-red-400 text-[10px] sm:text-xs font-sans ml-1">
            {fieldErrors[field.key]}
          </p>
        )}
        {!fieldErrors[field.key] && field.hint && (
          <p className="text-gray-300 text-[10px] sm:text-xs font-sans ml-1">
            {field.hint}
          </p>
        )}
      </div>
    );
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto w-full h-full">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-xl bg-[#005430] rounded-xl sm:rounded-modal p-3 sm:p-6 max-h-[95vh] overflow-y-auto scrollbar-hide z-[101]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 sm:top-4 right-2 sm:right-4 text-gray-500 hover:text-white transition-colors z-10"
        >
          <X className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Form Container */}
        <div className="flex flex-col rounded-lg sm:rounded-xl p-3 sm:p-5 gap-3 sm:gap-4">
          <h2 className="text-white font-bold font-sans text-lg sm:text-2xl pr-6">
            Edit {title}
          </h2>

          {/* Note/Info Banner */}
          {note && (
            <div className="flex items-start gap-2 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg bg-brand-emerald500/10 border border-brand-emerald500/30">
              <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-emerald500 flex-shrink-0 mt-0.5" />
              <p className="text-brand-emerald500 text-[10px] sm:text-xs font-sans leading-relaxed">
                {note}
              </p>
            </div>
          )}

          {/* Error Banner */}
          {(saveError || error) && (
            <div className="flex items-center gap-2 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-red-400 text-[10px] sm:text-xs font-sans">
                {saveError || error}
              </p>
            </div>
          )}

          {/* Form Fields - Responsive */}
          <div className="flex flex-col gap-3 sm:gap-4">
            {fields.map(renderField)}
          </div>

          {/* Buttons - Responsive */}
          <div className="flex gap-2 sm:gap-3 pt-2 sm:pt-4">
            <button
              onClick={onClose}
              className="flex-1 py-2 sm:py-2.5 rounded-full border border-brand-emerald500 text-white font-medium font-sans text-xs sm:text-sm hover:bg-brand-emerald500/10 transition-colors"
            >
              Cancel
            </button>
            <div
              className={`flex-1 rounded-full transition-all duration-300 ${
                isButtonHovered ? "shadow-glow" : ""
              }`}
              onMouseEnter={() => setIsButtonHovered(true)}
              onMouseLeave={() => setIsButtonHovered(false)}
            >
              <Button
                onClick={handleSave}
                disabled={saving}
                className={`${isButtonHovered ? "opacity-90" : ""}`}
              >
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default EditDetailsModal;
