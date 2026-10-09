import { useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import type { Square } from 'react-chessboard';

const STANDARD_START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function fenToPlacement(fen: string): Record<string, string> {
  const result: Record<string, string> = {};
  const boardField = fen.split(' ')[0];
  const ranks = boardField.split('/');
  for (let r = 0; r < ranks.length; r++) {
    const rank = 8 - r;
    let file = 0;
    for (const ch of ranks[r]) {
      if (ch >= '1' && ch <= '8') {
        file += parseInt(ch, 10);
      } else {
        const isUpper = ch >= 'A' && ch <= 'Z';
        const code = `${isUpper ? 'w' : 'b'}${ch.toUpperCase()}`;
        result[String.fromCharCode(97 + file) + rank] = code;
        file += 1;
      }
    }
  }
  return result;
}

function placementToFen(placement: Record<string, string>, turn: 'w' | 'b'): string {
  const ranks: string[] = [];
  for (let r = 8; r >= 1; r--) {
    let line = '';
    let empty = 0;
    for (let f = 0; f < 8; f++) {
      const sq = String.fromCharCode(97 + f) + r;
      const code = placement[sq];
      if (!code) {
        empty += 1;
      } else {
        if (empty > 0) {
          line += String(empty);
          empty = 0;
        }
        const letter = code[1];
        line += code[0] === 'w' ? letter : letter.toLowerCase();
      }
    }
    if (empty > 0) line += String(empty);
    ranks.push(line);
  }
  let castling = '';
  if (placement['e1'] === 'wK') {
    if (placement['h1'] === 'wR') castling += 'K';
    if (placement['a1'] === 'wR') castling += 'Q';
  }
  if (placement['e8'] === 'bK') {
    if (placement['h8'] === 'bR') castling += 'k';
    if (placement['a8'] === 'bR') castling += 'q';
  }
  if (!castling) castling = '-';
  return `${ranks.join('/')} ${turn} ${castling} - 0 1`;
}

interface Props {
  initialFen: string;
  hasMoves: boolean;
  onApply: (fen: string) => void;
  onClose: () => void;
}

const WHITE_PIECES: ReadonlyArray<{ code: string; glyph: string }> = [
  { code: 'wK', glyph: '♔' },
  { code: 'wQ', glyph: '♕' },
  { code: 'wR', glyph: '♖' },
  { code: 'wB', glyph: '♗' },
  { code: 'wN', glyph: '♘' },
  { code: 'wP', glyph: '♙' },
];

const BLACK_PIECES: ReadonlyArray<{ code: string; glyph: string }> = [
  { code: 'bK', glyph: '♚' },
  { code: 'bQ', glyph: '♛' },
  { code: 'bR', glyph: '♜' },
  { code: 'bB', glyph: '♝' },
  { code: 'bN', glyph: '♞' },
  { code: 'bP', glyph: '♟' },
];

export default function PositionEditor({ initialFen, hasMoves, onApply, onClose }: Props) {
  const [placement, setPlacement] = useState<Record<string, string>>(() => {
    try {
      return fenToPlacement(initialFen);
    } catch {
      return fenToPlacement(STANDARD_START_FEN);
    }
  });
  const [tool, setTool] = useState<string>('wK');
  const [turn, setTurn] = useState<'w' | 'b'>(() => {
    const parts = initialFen.split(' ');
    return parts[1] === 'b' ? 'b' : 'w';
  });

  let fen = '';
  let error: string | null = null;
  try {
    fen = placementToFen(placement, turn);
    new Chess(fen);
  } catch (e) {
    error = e instanceof Error ? e.message : 'Invalid position';
  }

  function handleSquareClick(square: Square) {
    if (tool === 'erase') {
      setPlacement((p) => {
        const n = { ...p };
        delete n[square];
        return n;
      });
    } else {
      setPlacement((p) => ({ ...p, [square]: tool }));
    }
  }

  function handleClear() {
    setPlacement({});
  }

  function handleStandard() {
    setPlacement(fenToPlacement(STANDARD_START_FEN));
    setTurn('w');
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-xl p-6 max-w-3xl w-full border border-gray-700" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-100 mb-3">Position Editor</h2>
        {hasMoves && (
          <div className="mb-3 px-3 py-2 rounded bg-amber-900/40 border border-amber-700 text-amber-200 text-sm">
            Setting a new starting position will clear the current moves (undoable with Ctrl+Z).
          </div>
        )}
        <div className="flex gap-6">
          <div className="flex-shrink-0">
            <Chessboard
              id={2}
              position={fen}
              boardWidth={360}
              boardOrientation="white"
              arePiecesDraggable={false}
              areArrowsAllowed={false}
              animationDuration={0}
              customDarkSquareStyle={{ backgroundColor: '#4a5568' }}
              customLightSquareStyle={{ backgroundColor: '#e2e8f0' }}
              onSquareClick={handleSquareClick}
            />
          </div>
          <div className="flex-1 flex flex-col gap-3 min-w-0">
            <div>
              <p className="text-xs text-gray-400 mb-1">Palette</p>
              <div>
                <p className="text-xs font-medium text-gray-300 mb-1">White</p>
                <div className="grid grid-cols-6 gap-1">
                  {WHITE_PIECES.map((p) => (
                    <button
                      key={p.code}
                      type="button"
                      onClick={() => setTool(p.code)}
                      className={`w-9 h-9 rounded text-lg leading-none flex items-center justify-center transition-colors ${
                        tool === p.code
                          ? 'bg-indigo-600 text-white ring-2 ring-indigo-300'
                          : 'bg-gray-700 hover:bg-gray-600 text-gray-100'
                      }`}
                      aria-label={`Place ${p.code}`}
                      title={p.code}
                    >
                      {p.glyph}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-2">
                <p className="text-xs font-medium text-gray-300 mb-1">Black</p>
                <div className="grid grid-cols-6 gap-1">
                  {BLACK_PIECES.map((p) => (
                    <button
                      key={p.code}
                      type="button"
                      onClick={() => setTool(p.code)}
                      className={`w-9 h-9 rounded text-lg leading-none flex items-center justify-center transition-colors ${
                        tool === p.code
                          ? 'bg-indigo-600 text-white ring-2 ring-indigo-300'
                          : 'bg-gray-700 hover:bg-gray-600 text-gray-100'
                      }`}
                      aria-label={`Place ${p.code}`}
                      title={p.code}
                    >
                      {p.glyph}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-2">
                <p className="text-xs font-medium text-gray-300 mb-1">Erase</p>
                <button
                  type="button"
                  onClick={() => setTool('erase')}
                  className={`w-9 h-9 rounded text-base flex items-center justify-center transition-colors ${
                    tool === 'erase'
                      ? 'bg-red-600 text-white ring-2 ring-red-300'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-100'
                  }`}
                  aria-label="Erase piece"
                  title="Erase"
                >
                  ⌫
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
              >
                Clear Board
              </button>
              <button
                type="button"
                onClick={handleStandard}
                className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
              >
                Standard position
              </button>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Side to move</p>
              <div className="flex gap-1">
                {(['w', 'b'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTurn(t)}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      turn === t ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-100'
                    }`}
                  >
                    {t === 'w' ? 'White' : 'Black'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col">
              <p className="text-xs text-gray-400 mb-1">FEN</p>
              <code className="block max-h-24 overflow-auto px-2 py-1.5 text-xs font-mono bg-gray-900 text-gray-100 rounded break-all border border-gray-700">
                {fen}
              </code>
              {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
            </div>
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onApply(fen)}
            disabled={error !== null}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors font-medium disabled:opacity-40 disabled:hover:bg-indigo-600 disabled:cursor-not-allowed"
          >
            Set starting position
          </button>
        </div>
      </div>
    </div>
  );
}
