import { RepertoireSummary } from '../types';

interface Props {
  items: RepertoireSummary[];
  onSelect: (id: string) => void;
  onCreateNew: () => void;
  onClose: () => void;
}

export default function OpenTabDialog({ items, onSelect, onCreateNew, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-xl p-6 w-96 border border-gray-700 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">Open Repertoire</h2>

        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
          {items.length === 0 ? (
            <p className="text-gray-400 text-sm">No repertoires yet</p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelect(item.id)}
                className="flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-650 cursor-pointer transition-colors"
              >
                <div>
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-xs text-gray-400">
                    {item.color === 'white' ? '♔ White' : '♚ Black'}
                    {item.eco ? ` · ${item.eco}` : ''} · {item.moveCount} moves
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCreateNew}
            className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors"
          >
            + Create New
          </button>
          <button
            onClick={onClose}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
