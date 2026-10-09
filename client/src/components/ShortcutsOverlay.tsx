interface Props {
  onClose: () => void;
}

interface Shortcut {
  keys: string[];
  description: string;
}

const SHORTCUTS: Shortcut[] = [
  { keys: ['\u2190'], description: 'Go to parent position' },
  { keys: ['\u2192'], description: 'Go to first child' },
  { keys: ['\u2191'], description: 'Previous variation (sibling)' },
  { keys: ['\u2193'], description: 'Next variation (sibling)' },
  { keys: ['Home'], description: 'Jump to root position' },
  { keys: ['End'], description: 'Jump to deepest main line' },
  { keys: ['?'], description: 'Toggle this shortcuts overlay' },
  { keys: ['Ctrl', 'Z'], description: 'Undo last tree edit' },
  { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo' },
  { keys: ['Ctrl', 'Y'], description: 'Redo' },
];

export default function ShortcutsOverlay({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-xl p-6 border border-gray-700 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-100">Keyboard shortcuts</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 text-xl leading-none w-8 h-8 flex items-center justify-center rounded hover:bg-gray-700"
            title="Close"
            aria-label="Close shortcuts"
          >
            {'\u00D7'}
          </button>
        </div>
        <ul className="space-y-2 text-sm">
          {SHORTCUTS.map((s, i) => (
            <li key={i} className="flex items-center justify-between gap-3">
              <span className="text-gray-300">{s.description}</span>
              <span className="flex items-center gap-1 flex-shrink-0">
                {s.keys.map((k, ki) => (
                  <span key={ki} className="flex items-center gap-1">
                    {ki > 0 && <span className="text-gray-500 text-xs">+</span>}
                    <kbd className="px-2 py-0.5 text-xs font-mono bg-gray-700 border border-gray-600 rounded text-gray-100">
                      {k}
                    </kbd>
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-gray-500">
          Shortcuts are disabled while typing in a text field.
        </p>
      </div>
    </div>
  );
}