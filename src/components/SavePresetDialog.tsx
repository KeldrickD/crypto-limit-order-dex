import React, { useState } from 'react';

interface SavePresetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string }) => void;
  error?: string;
}

export default function SavePresetDialog({ isOpen, onClose, onSave, error }: SavePresetDialogProps) {
  const [name, setName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name });
    if (!error) {
      setName('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="min-h-screen px-4 text-center">
        <div className="fixed inset-0 bg-black opacity-30" onClick={onClose} />
        <span className="inline-block h-screen align-middle">&#8203;</span>
        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transform bg-white dark:bg-gray-800 shadow-xl rounded-2xl">
          <div className="text-lg font-medium leading-6 text-gray-900 dark:text-white" data-testid="save-preset-title">
            Save Preset
          </div>
          <form onSubmit={handleSubmit} className="mt-4">
            <div className="mb-4">
              <label htmlFor="preset-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Name
              </label>
              <input
                id="preset-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600"
                placeholder="Enter preset name"
                required
              />
              {error && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400" data-testid="save-preset-error">
                  {error}
                </p>
              )}
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Save Preset
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 