import { useState } from 'react';

interface Props {
  name: string;
  color: 'white' | 'black';
  eco: string;
  onSave: (data: { name: string; color: 'white' | 'black'; eco: string }) => void;
  onClose: () => void;
}

export default function EditRepertoireDialog({ name: initialName, color: initialColor, eco: initialEco, onSave, onClose }: Props) {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState<'white' | 'black'>(initialColor);
  const [eco, setEco] = useState(initialEco);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), color, eco: eco.trim() });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-xl p-6 w-96 border border-gray-700" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">Edit Repertoire</h2>
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
          <div>
            <label className="block text-sm font-medium mb-1">Side</label>
            <select
              value={color}
              onChange={(e) => setColor(e.target.value as 'white' | 'black')}
              className="w-full px-3 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-indigo-500 outline-none"
            >
              <option value="white">White</option>
              <option value="black">Black</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">ECO Code</label>
            <input
              type="text"
              value={eco}
              onChange={(e) => setEco(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-indigo-500 outline-none"
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