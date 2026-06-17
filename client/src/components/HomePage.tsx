import { useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { RepertoireSummary } from '../types';
import { createRepertoire } from '../api';
import CreateDialog from './CreateDialog';

interface Props {
  items: RepertoireSummary[];
  loading: boolean;
  onOpen: (id: string) => void;
  onRefresh: () => void;
  onCreated: (rep: RepertoireSummary) => void;
  onDelete: (id: string) => void;
}

const BOARD_PREVIEW = 150;

export default function HomePage({ items, loading, onOpen, onCreated, onDelete }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function handleCreate(name: string, color: 'white' | 'black', eco: string) {
    const rep = await createRepertoire(name, color, eco);
    onCreated({
      id: rep.id,
      name: rep.name,
      color: rep.color,
      eco: rep.eco,
      createdAt: rep.createdAt,
      updatedAt: rep.updatedAt,
      moveCount: 0,
      faceFen: rep.faceFen,
    });
    setShowCreate(false);
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Chess Repertoires</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition-colors"
        >
          + New Repertoire
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">No repertoires yet</p>
          <p>Create one to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const orientation = item.color === 'white' ? 'white' : 'black';
            return (
              <div
                key={item.id}
                className="bg-gray-800 rounded-xl border border-gray-700 hover:border-indigo-500 group transition-colors overflow-hidden cursor-pointer"
                onClick={() => onOpen(item.id)}
              >
                <div className="flex justify-center bg-gray-900/50 pt-3">
                  <div style={{ width: BOARD_PREVIEW }}>
                    <Chessboard
                      position={item.faceFen || 'start'}
                      boardWidth={BOARD_PREVIEW}
                      boardOrientation={orientation}
                      arePiecesDraggable={false}
                      customBoardStyle={{ borderRadius: 0 }}
                      customDarkSquareStyle={{ backgroundColor: '#4a5568' }}
                      customLightSquareStyle={{ backgroundColor: '#e2e8f0' }}
                    />
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg">{item.name}</h3>
                  <p className="text-sm text-gray-400">
                    {item.color === 'white' ? '♔ White' : '♚ Black'}
                    {item.eco ? ` · ${item.eco}` : ''} · {item.moveCount} moves
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-gray-500 text-xs">{new Date(item.updatedAt).toLocaleDateString()}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(item.id);
                      }}
                      className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-sm"
                      title="Delete"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateDialog
          onSave={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <p className="mb-4">Delete this repertoire? This cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600">Cancel</button>
              <button onClick={() => { onDelete(deleteId); setDeleteId(null); }} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
