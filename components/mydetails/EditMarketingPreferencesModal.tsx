import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle2, Circle } from "lucide-react";
import Button from "../Button";

interface MarketingPreference {
  id: string;
  label: string;
  enabled: boolean;
}

interface EditMarketingPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: MarketingPreference[];
  personalizedMarketing: boolean;
  onSave: (
    preferences: MarketingPreference[],
    personalizedMarketing: boolean
  ) => Promise<void>;
}

const EditMarketingPreferencesModal: React.FC<
  EditMarketingPreferencesModalProps
> = ({
  isOpen,
  onClose,
  preferences: initialPreferences,
  personalizedMarketing: initialPersonalized,
  onSave,
}) => {
  const [preferences, setPreferences] = useState<MarketingPreference[]>([]);
  const [personalizedMarketing, setPersonalizedMarketing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isButtonHovered, setIsButtonHovered] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPreferences([...initialPreferences]);
      setPersonalizedMarketing(initialPersonalized);
    }
  }, [isOpen, initialPreferences, initialPersonalized]);

  if (!isOpen) return null;

  const handleTogglePreference = (id: string) => {
    setPreferences((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(preferences, personalizedMarketing);
      onClose();
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setSaving(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto w-full h-full">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-[#005430] rounded-xl sm:rounded-modal p-3 sm:p-6 max-h-[95vh] overflow-y-auto scrollbar-hide z-[101]">
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
            Marketing Preferences
          </h2>

          {/* Subscribe Link */}
          <p className="text-gray-400 font-sans text-[10px] sm:text-xs">
            To subscribe to all offers and communications, please{" "}
            <button
              onClick={() => {
                setPreferences((prev) =>
                  prev.map((p) => ({ ...p, enabled: true }))
                );
                setPersonalizedMarketing(true);
              }}
              className="text-white font-semibold hover:underline"
            >
              click here
            </button>
            .
          </p>

          {/* Communication Preferences - Responsive */}
          <div className="space-y-1.5 sm:space-y-2">
            <p className="text-white font-sans text-xs sm:text-sm font-medium">
              Keep me informed by:
            </p>
            <div className="space-y-0.5 sm:space-y-1">
              {preferences.map((pref) => (
                <button
                  key={pref.id}
                  onClick={() => handleTogglePreference(pref.id)}
                  className="flex items-center gap-2 sm:gap-3 w-full text-left py-1.5 sm:py-2 hover:bg-white/5 rounded-lg px-1.5 sm:px-2 transition-colors"
                >
                  {pref.enabled ? (
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-white flex-shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0" />
                  )}
                  <span
                    className={`font-sans text-xs sm:text-sm ${
                      pref.enabled ? "text-white" : "text-gray-400"
                    }`}
                  >
                    {pref.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Personalized Marketing - Responsive */}
          <div className="space-y-1.5 sm:space-y-2 pt-2 border-t border-white/10">
            <p className="text-white font-sans text-xs sm:text-sm font-medium pt-1.5 sm:pt-2">
              Personalised marketing:
            </p>
            <button
              onClick={() => setPersonalizedMarketing(!personalizedMarketing)}
              className="flex items-start gap-2 sm:gap-3 w-full text-left py-1.5 sm:py-2 hover:bg-white/5 rounded-lg px-1.5 sm:px-2 transition-colors"
            >
              {personalizedMarketing ? (
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-white flex-shrink-0 mt-0.5" />
              ) : (
                <Circle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0 mt-0.5" />
              )}
              <span
                className={`font-sans text-[10px] sm:text-xs leading-relaxed ${
                  personalizedMarketing ? "text-white" : "text-gray-400"
                }`}
              >
                I allow my customer profile to be used to provide me with
                personalised offers and marketing
              </span>
            </button>
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

export default EditMarketingPreferencesModal;
