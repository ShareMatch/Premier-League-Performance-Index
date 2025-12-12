import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle2, Circle } from 'lucide-react';

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
  onSave: (preferences: MarketingPreference[], personalizedMarketing: boolean) => Promise<void>;
}

const EditMarketingPreferencesModal: React.FC<EditMarketingPreferencesModalProps> = ({
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
    setPreferences(prev =>
      prev.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p)
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(preferences, personalizedMarketing);
      onClose();
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal Content - Responsive */}
      <div
        className="relative w-full max-w-md bg-modal-outer/60 backdrop-blur-[40px] rounded-xl sm:rounded-modal p-3 sm:p-6 max-h-[90vh] overflow-y-auto scrollbar-hide"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 sm:top-4 right-2 sm:right-4 text-gray-500 hover:text-white transition-colors z-10"
        >
          <X className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Inner Container - Responsive */}
        <div
          className="flex flex-col bg-modal-inner rounded-lg sm:rounded-xl p-3 sm:p-5 gap-3 sm:gap-4 border border-transparent"
          style={{
            backgroundImage: "linear-gradient(#021A1A, #021A1A), linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 100%)",
            backgroundOrigin: "border-box",
            backgroundClip: "padding-box, border-box",
          }}
        >
          <h2 className="text-white font-bold font-sans text-lg sm:text-2xl pr-6">
            Marketing Preferences
          </h2>

          {/* Subscribe Link */}
          <p className="text-gray-400 font-sans text-[10px] sm:text-xs">
            To subscribe to all offers and communications, please{' '}
            <button 
              onClick={() => {
                setPreferences(prev => prev.map(p => ({ ...p, enabled: true })));
                setPersonalizedMarketing(true);
              }}
              className="text-brand-emerald500 hover:underline"
            >
              click here
            </button>.
          </p>

          {/* Communication Preferences - Responsive */}
          <div className="space-y-1.5 sm:space-y-2">
            <p className="text-white font-sans text-xs sm:text-sm font-medium">Keep me informed by:</p>
            <div className="space-y-0.5 sm:space-y-1">
              {preferences.map((pref) => (
                <button 
                  key={pref.id}
                  onClick={() => handleTogglePreference(pref.id)}
                  className="flex items-center gap-2 sm:gap-3 w-full text-left py-1.5 sm:py-2 hover:bg-white/5 rounded-lg px-1.5 sm:px-2 transition-colors"
                >
                  {pref.enabled ? (
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-brand-emerald500 flex-shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0" />
                  )}
                  <span className={`font-sans text-xs sm:text-sm ${pref.enabled ? 'text-white' : 'text-gray-400'}`}>
                    {pref.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Personalized Marketing - Responsive */}
          <div className="space-y-1.5 sm:space-y-2 pt-2 border-t border-white/10">
            <p className="text-white font-sans text-xs sm:text-sm font-medium pt-1.5 sm:pt-2">Personalised marketing:</p>
            <button 
              onClick={() => setPersonalizedMarketing(!personalizedMarketing)}
              className="flex items-start gap-2 sm:gap-3 w-full text-left py-1.5 sm:py-2 hover:bg-white/5 rounded-lg px-1.5 sm:px-2 transition-colors"
            >
              {personalizedMarketing ? (
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-brand-emerald500 flex-shrink-0 mt-0.5" />
              ) : (
                <Circle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0 mt-0.5" />
              )}
              <span className={`font-sans text-[10px] sm:text-xs leading-relaxed ${personalizedMarketing ? 'text-white' : 'text-gray-400'}`}>
                I allow my customer profile to be used to provide me with personalised offers and marketing
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
              className={`flex-1 rounded-full transition-all duration-300 p-0.5 ${
                isButtonHovered
                  ? 'border border-white shadow-glow'
                  : 'border border-brand-emerald500'
              }`}
              onMouseEnter={() => setIsButtonHovered(true)}
              onMouseLeave={() => setIsButtonHovered(false)}
            >
              <button
                onClick={handleSave}
                disabled={saving}
                className={`w-full py-1.5 sm:py-2 rounded-full font-medium font-sans text-xs sm:text-sm transition-all duration-300 disabled:opacity-60 ${
                  isButtonHovered
                    ? 'bg-white text-brand-emerald500'
                    : 'bg-gradient-primary text-white'
                }`}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default EditMarketingPreferencesModal;
