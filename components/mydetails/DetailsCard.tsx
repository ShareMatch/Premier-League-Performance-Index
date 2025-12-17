import React from 'react';

interface DetailField {
  label: string;
  value: string;
}

interface DetailsCardProps {
  title: string;
  fields: DetailField[];
  onEdit?: () => void;
}

const DetailsCard: React.FC<DetailsCardProps> = ({ title, fields, onEdit }) => {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-md sm:rounded-xl overflow-hidden flex flex-col md:h-full border border-gray-700">
      {/* Header - Ultra compact on mobile */}
      <div className="px-2 sm:px-4 py-1 sm:py-3 flex justify-between items-center flex-shrink-0 bg-gray-800 border-b border-gray-700">
        <h3 className="text-[10px] sm:text-base font-semibold text-white font-sans">{title}</h3>
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
      <div className="p-2 sm:p-4 space-y-1 sm:space-y-2 flex-1">
        {fields.map((field, index) => (
          <div key={index}>
            <span className="text-gray-400 text-[9px] sm:text-xs font-medium block font-sans leading-tight">{field.label}</span>
            <span className="text-white text-[10px] sm:text-sm font-medium font-sans leading-tight">{field.value || 'Nil'}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DetailsCard;
