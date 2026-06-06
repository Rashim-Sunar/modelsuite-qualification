import React from 'react';

const ConfirmModal = ({ open, title = 'Confirm', description = '', confirmText = 'Confirm', cancelText = 'Cancel', onConfirm, onClose, danger = false }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black opacity-50" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-bg-card border border-border rounded-xl w-full max-w-md shadow-[0_32px_80px_rgba(0,0,0,0.6)] animate-modal-in z-10 p-6">
        <h3 className="text-lg font-semibold mb-3" style={{ color: '#E5E2E1' }}>{title}</h3>
        {description && (
          <p style={{ color: '#9CA3AF', marginBottom: '18px' }}>{description}</p>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="search-input-glass" style={{ padding: '8px 12px' }}>{cancelText}</button>
          <button
            onClick={onConfirm}
            className="btn-gradient"
            style={{ padding: '8px 12px', background: danger ? '#DC2626' : undefined }}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
