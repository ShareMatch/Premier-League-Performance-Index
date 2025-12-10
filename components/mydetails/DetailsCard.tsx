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
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl overflow-hidden flex flex-col h-full border border-gray-700">
      {/* Header */}
      <div className="px-4 py-3 flex justify-between items-center flex-shrink-0 bg-gray-800 border-b border-gray-700">
        <h3 className="text-base font-semibold text-white font-sans">{title}</h3>
        {onEdit && (
          <button
            onClick={onEdit}
            className="text-brand-emerald500 hover:text-brand-emerald500/80 transition-colors text-xs font-sans font-medium"
          >
            Edit
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-2 flex-1">
        {fields.map((field, index) => (
          <div key={index}>
            <span className="text-gray-400 text-xs font-medium block font-sans">{field.label}</span>
            <span className="text-white text-sm font-medium font-sans">{field.value || 'Nil'}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DetailsCard;
