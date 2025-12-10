import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle } from 'lucide-react';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => Promise<void>;
}

const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  onClose,
  onDelete,
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  if (!isOpen) return null;

  const isConfirmed = confirmText.toUpperCase() === 'DELETE';

  const handleDelete = async () => {
    if (!isConfirmed) return;
    
    setDeleting(true);
    try {
      await onDelete();
      onClose();
    } catch (error) {
      console.error('Failed to delete account:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    setConfirmText('');
    onClose();
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Modal Content */}
      <div
        className="relative w-full max-w-xl bg-modal-outer/60 backdrop-blur-[40px] rounded-modal p-6"
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
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
          {/* Warning Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </div>

          <h2 className="text-white font-bold font-sans text-2xl text-center">
            Delete Account
          </h2>

          {/* Warning Text */}
          <p className="text-gray-400 font-sans text-sm text-center">
            This action cannot be undone. All your data, including your portfolio, 
            transaction history, and personal information will be permanently deleted.
          </p>

          {/* Confirmation Input */}
          <div className="flex flex-col w-full gap-1.5">
            <label
              htmlFor="delete-confirm"
              className="text-white text-sm font-medium font-sans"
            >
              Type <span className="text-red-400 font-bold">DELETE</span> to confirm
            </label>
            <div className="flex items-center w-full bg-gray-200 rounded-full shadow-inner h-10 px-4 focus-within:ring-2 focus-within:ring-red-500">
              <input
                id="delete-confirm"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="flex-1 min-w-0 bg-transparent text-gray-900 placeholder-gray-500 outline-none font-sans text-sm"
                placeholder="Type DELETE to confirm"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleClose}
              className="flex-1 py-2.5 rounded-full border border-brand-emerald500 text-white font-medium font-sans text-sm hover:bg-brand-emerald500/10 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={!isConfirmed || deleting}
              className="flex-1 py-2.5 rounded-full bg-red-500 text-white font-medium font-sans text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-600"
            >
              {deleting ? 'Deleting...' : 'Delete Account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default DeleteAccountModal;
