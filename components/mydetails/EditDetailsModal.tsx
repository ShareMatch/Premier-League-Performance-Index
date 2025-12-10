import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Info } from 'lucide-react';

interface EditField {
  key: string;
  label: string;
  value: string;
  editable?: boolean;
  type?: 'text' | 'email' | 'tel';
  hint?: string; // Optional hint text for specific fields
}

interface EditDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fields: EditField[];
  onSave: (updatedFields: Record<string, string>) => Promise<void>;
  note?: string; // Optional note to display at the top
  error?: string; // Optional error message
}

const EditDetailsModal: React.FC<EditDetailsModalProps> = ({
  isOpen,
  onClose,
  title,
  fields,
  onSave,
  note,
  error,
}) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const initialData: Record<string, string> = {};
      fields.forEach(field => {
        initialData[field.key] = field.value || '';
      });
      setFormData(initialData);
    }
  }, [isOpen, fields]);

  if (!isOpen) return null;

  const handleChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(formData);
      // Note: Modal may not close if verification is needed
      // The parent handles closing after verification
    } catch (err: any) {
      console.error('Failed to save:', err);
      setSaveError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className="relative w-full max-w-xl bg-modal-outer/60 backdrop-blur-[40px] rounded-modal p-6"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors z-10"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Inner Container */}
        <div
          className="flex flex-col bg-modal-inner rounded-xl p-5 gap-4 border border-transparent"
          style={{
            backgroundImage: "linear-gradient(#021A1A, #021A1A), linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 100%)",
            backgroundOrigin: "border-box",
            backgroundClip: "padding-box, border-box",
          }}
        >
          <h2 className="text-white font-bold font-sans text-2xl">
            Edit {title}
          </h2>

          {/* Note/Info Banner */}
          {note && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-brand-emerald500/10 border border-brand-emerald500/30">
              <Info className="w-4 h-4 text-brand-emerald500 flex-shrink-0 mt-0.5" />
              <p className="text-brand-emerald500 text-xs font-sans leading-relaxed">{note}</p>
            </div>
          )}

          {/* Error Banner */}
          {(saveError || error) && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-red-400 text-xs font-sans">{saveError || error}</p>
            </div>
          )}

          {/* Form Fields */}
          <div className="flex flex-col gap-4">
            {fields.map((field) => (
              <div key={field.key} className="flex flex-col w-full gap-1.5">
                <label
                  htmlFor={`edit-${field.key}`}
                  className="capitalize text-white text-sm font-medium font-sans"
                >
                  {field.label}
                </label>
                <div className={`flex items-center w-full bg-gray-200 rounded-full shadow-inner h-10 px-4 focus-within:ring-2 focus-within:ring-brand-emerald500 ${field.editable === false ? 'opacity-60 cursor-not-allowed' : ''}`}>
                  <input
                    id={`edit-${field.key}`}
                    type={field.type || 'text'}
                    value={formData[field.key] || ''}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    disabled={field.editable === false}
                    className={`flex-1 min-w-0 bg-transparent text-gray-900 placeholder-gray-500 outline-none font-sans text-sm ${field.editable === false ? 'cursor-not-allowed' : ''}`}
                    placeholder={`Enter ${field.label}`}
                  />
                </div>
                {field.hint && (
                  <p className="text-gray-500 text-xs font-sans ml-1">{field.hint}</p>
                )}
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-full border border-brand-emerald500 text-white font-medium font-sans text-sm hover:bg-brand-emerald500/10 transition-colors"
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
                className={`w-full py-2 rounded-full font-medium font-sans text-sm transition-all duration-300 disabled:opacity-60 ${
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

export default EditDetailsModal;
