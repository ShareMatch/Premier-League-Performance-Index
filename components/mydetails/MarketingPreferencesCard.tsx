import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

interface MarketingPreference {
  id: string;
  label: string;
  enabled: boolean;
}

interface MarketingPreferencesCardProps {
  preferences: MarketingPreference[];
  personalizedMarketing: boolean;
  onEdit?: () => void;
}

const MarketingPreferencesCard: React.FC<MarketingPreferencesCardProps> = ({ 
  preferences, 
  personalizedMarketing,
  onEdit,
}) => {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-md sm:rounded-xl overflow-hidden flex flex-col md:h-full border border-gray-700">
      {/* Header - Compact on mobile */}
      <div className="px-2 sm:px-4 py-1 sm:py-3 flex justify-between items-center flex-shrink-0 bg-gray-800 border-b border-gray-700">
        <h3 className="text-[10px] sm:text-base font-semibold text-white font-sans">Marketing Preferences</h3>
        {onEdit && (
          <button
            onClick={onEdit}
            className="px-1.5 sm:px-4 py-0.5 sm:py-1.5 text-[8px] sm:text-xs font-sans font-medium rounded-full shadow-lg transition-colors whitespace-nowrap text-white bg-gradient-primary hover:opacity-90"
          >
            Edit
          </button>
        )}
      </div>

      {/* Content - Compact on mobile */}
      <div className="p-2 sm:p-4 space-y-2 sm:space-y-3 flex-1">
        {/* Communication Preferences */}
        <div>
          <p className="text-gray-500 text-[9px] sm:text-xs mb-1 sm:mb-2 font-sans">Keep me informed by:</p>
          <div className="space-y-0.5 sm:space-y-1.5">
            {preferences.map((pref) => (
              <div 
                key={pref.id}
                className="flex items-center gap-1 sm:gap-2"
              >
                {pref.enabled ? (
                  <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-brand-primary flex-shrink-0" />
                ) : (
                  <Circle className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
                )}
                <span className={`text-[9px] sm:text-sm font-sans ${pref.enabled ? 'text-white' : 'text-gray-400'}`}>
                  {pref.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Personalized Marketing */}
        <div className="pt-1 sm:pt-2">
          <p className="text-gray-500 text-[9px] sm:text-xs mb-1 sm:mb-2 font-sans">Personalised marketing:</p>
          <div className="flex items-start gap-1 sm:gap-2">
            {personalizedMarketing ? (
              <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-brand-primary flex-shrink-0 mt-0.5" />
            ) : (
              <Circle className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0 mt-0.5" />
            )}
            <span className={`text-[9px] sm:text-xs leading-tight font-sans ${personalizedMarketing ? 'text-white' : 'text-gray-400'}`}>
              I allow my customer profile to be used to provide me with personalised offers and marketing
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketingPreferencesCard;
