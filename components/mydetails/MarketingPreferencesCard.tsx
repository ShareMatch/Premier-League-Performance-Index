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
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl overflow-hidden flex flex-col h-full border border-gray-700">
      {/* Header */}
      <div className="px-4 py-3 flex justify-between items-center flex-shrink-0 bg-gray-800 border-b border-gray-700">
        <h3 className="text-base font-semibold text-white font-sans">Marketing Preferences</h3>
        {onEdit && (
          <button
            onClick={onEdit}
            className="text-brand-emerald500 hover:text-brand-emerald500/80 transition-colors text-xs font-sans font-medium"
          >
            Edit
          </button>
        )}
      </div>

      {/* Content - Display only, not interactive */}
      <div className="p-4 space-y-3 flex-1">
        {/* Communication Preferences - Display only */}
        <div>
          <p className="text-gray-500 text-xs mb-2 font-sans">Keep me informed by:</p>
          <div className="space-y-1.5">
            {preferences.map((pref) => (
              <div 
                key={pref.id}
                className="flex items-center gap-2"
              >
                {pref.enabled ? (
                  <CheckCircle2 className="w-4 h-4 text-brand-emerald500 flex-shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-gray-500 flex-shrink-0" />
                )}
                <span className={`text-sm font-sans ${pref.enabled ? 'text-white' : 'text-gray-400'}`}>
                  {pref.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Personalized Marketing - Display only */}
        <div className="pt-2">
          <p className="text-gray-500 text-xs mb-2 font-sans">Personalised marketing:</p>
          <div className="flex items-start gap-2">
            {personalizedMarketing ? (
              <CheckCircle2 className="w-4 h-4 text-brand-emerald500 flex-shrink-0 mt-0.5" />
            ) : (
              <Circle className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
            )}
            <span className={`text-xs leading-relaxed font-sans ${personalizedMarketing ? 'text-white' : 'text-gray-400'}`}>
              I allow my customer profile to be used to provide me with personalised offers and marketing
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketingPreferencesCard;
