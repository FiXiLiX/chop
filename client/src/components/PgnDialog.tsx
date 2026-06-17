import { useState } from 'react';

interface Props {
  onImport: (pgn: string) => void;
  onExport: () => Promise<string>;
  onClose: () => void;
}

export default function PgnDialog({ onImport, onExport, onClose }: Props) {
  const [tab, setTab] = useState<'import' | 'export'>('import');
  const [pgn, setPgn] = useState('');
  const [exportText, setExportText] = useState('');
  const [copied, setCopied] = useState(false);

  async function handleExport() {
    const text = await onExport();
    setExportText(text);
  }

  function handleCopy() {
    navigator.clipboard.writeText(exportText).then(() => setCopied(true));
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-xl p-6 w-[600px] max-h-[80vh] border border-gray-700 flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => setTab('import')}
            className={`px-3 py-1 rounded text-sm ${tab === 'import' ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'}`}
          >
            Import
          </button>
          <button
            onClick={() => setTab('export')}
            className={`px-3 py-1 rounded text-sm ${tab === 'export' ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'}`}
          >
            Export
          </button>
        </div>

        {tab === 'import' ? (
          <>
            <p className="text-sm text-gray-400 mb-2">Paste PGN below to import into this repertoire (replaces current tree).</p>
            <textarea
              value={pgn}
              onChange={(e) => setPgn(e.target.value)}
              className="flex-1 w-full px-3 py-2 text-sm bg-gray-700 rounded-lg border border-gray-600 outline-none focus:border-indigo-500 resize-none font-mono"
              rows={12}
              placeholder="1. e4 e5 2. Nf3 Nc6 ..."
            />
            <div className="flex gap-3 justify-end mt-4">
              <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600">Cancel</button>
              <button onClick={() => onImport(pgn)} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-medium">Import</button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-400 mb-2">Export this repertoire as PGN.</p>
            {!exportText ? (
              <button onClick={handleExport} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg self-start">
                Generate PGN
              </button>
            ) : (
              <>
                <textarea
                  readOnly
                  value={exportText}
                  className="flex-1 w-full px-3 py-2 text-sm bg-gray-700 rounded-lg border border-gray-600 outline-none resize-none font-mono"
                  rows={12}
                />
                <div className="flex gap-3 justify-end mt-4">
                  <button onClick={handleCopy} className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600">
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button onClick={onClose} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-medium">Close</button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
