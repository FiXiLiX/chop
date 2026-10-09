import { useState } from 'react';

interface Props {
  initialName: string;
  onSave: (name: string) => void;
  onClose: () => void;
}

export default function RenamePositionDialog({ initialName, onSave, onClose }: Props) {
  const [name, setName] = useState(initialName);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-xl p-6 w-96 border border-gray-700" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">Rename Starting Position</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-indigo-500 outline-none"
              autoFocus
              required
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors font-medium">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
