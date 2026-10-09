import { useState, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';
import { MoveNode } from '../types';

interface Props {
  root: MoveNode;
  currentFen: string;
  onNavigate: (fen: string) => void;
  onAddMove: (san: string) => void;
  onDeleteMove: (fen: string, parentFen: string) => void;
  onTagsSave: (fen: string, tags: string[]) => void;
  repertoireTags: string[];
  turn: 'w' | 'b';
  path: number[];
  boardOrientation?: 'white' | 'black';
}

const PIECE: Record<string, string> = {
  K: '\u2654', Q: '\u2655', R: '\u2656', B: '\u2657', N: '\u2658', P: '\u2659',
  k: '\u265a', q: '\u265b', r: '\u265c', b: '\u265d', n: '\u265e', p: '\u265f',
};

const BOARD_SIZE = 64;

function MiniBoard({ fen, orientation }: { fen: string; orientation: 'white' | 'black' }) {
  const rows = fen.split(' ')[0].split('/');
  const squares: { piece: string; dark: boolean }[] = [];
  for (let ri = 0; ri < 8; ri++) {
    const row = orientation === 'white' ? rows[ri] : rows[7 - ri];
    let col = 0;
    for (const ch of row) {
      if (ch >= '1' && ch <= '8') {
        const empty = parseInt(ch);
        for (let i = 0; i < empty; i++) {
          const file = orientation === 'white' ? col : 7 - col;
          squares.push({ piece: '', dark: (ri + file) % 2 === 1 });
          col++;
        }
      } else {
        const file = orientation === 'white' ? col : 7 - col;
        squares.push({ piece: PIECE[ch] || ch, dark: (ri + file) % 2 === 1 });
        col++;
      }
    }
  }

  return (
    <div
      className="grid grid-cols-8 rounded overflow-hidden flex-shrink-0"
      style={{ width: BOARD_SIZE, height: BOARD_SIZE }}
    >
      {squares.map((sq, i) => (
        <div
          key={i}
          className="flex items-center justify-center text-[10px] leading-none"
          style={{ backgroundColor: sq.dark ? '#4a5568' : '#e2e8f0', color: sq.dark ? '#e2e8f0' : '#1a202c' }}
        >
          {sq.piece}
        </div>
      ))}
    </div>
  );
}

function getMoveLabel(fen: string, san: string): string {
  const chess = new Chess(fen);
  const moveNum = chess.moveNumber();
  if (chess.turn() === 'b') {
    return `${moveNum}. ${san}`;
  } else {
    return `${moveNum - 1}... ${san}`;
  }
}

function getMainLineContinuation(node: MoveNode, max: number): string {
  if (node.moves.length === 0) return '';
  const chess = new Chess(node.fen);
  const parts: string[] = [];
  let cur: MoveNode = node;
  for (let i = 0; i < max; i++) {
    if (cur.moves.length === 0) break;
    cur = cur.moves[0];
    const moveNum = chess.moveNumber();
    if (chess.turn() === 'w') {
      parts.push(`${moveNum}.${cur.san}`);
    } else {
      parts.push(`${moveNum}...${cur.san}`);
    }
    chess.move(cur.san);
  }
  return parts.join(' ');
}

export default function MoveTree({ root, currentFen, onNavigate, onAddMove, onDeleteMove, onTagsSave, repertoireTags, boardOrientation = 'white' }: Props) {
  const [addingAt, setAddingAt] = useState<string | null>(null);
  const [moveInput, setMoveInput] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggleCollapse(fen: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(fen)) next.delete(fen);
      else next.add(fen);
      return next;
    });
  }

  function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (moveInput.trim()) {
      onAddMove(moveInput.trim());
      setMoveInput('');
      setAddingAt(null);
    }
  }

  if (root.moves.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-gray-400">No moves yet. Add the first move:</p>
        <MoveInputForm onSubmit={onAddMove} />
      </div>
    );
  }

  function renderMove(node: MoveNode, idx: number, parentFen?: string): React.ReactNode {
    const isActive = node.fen === currentFen;
    const key = `${parentFen || 'root'}-${node.san}-${idx}`;
    const isCollapsed = collapsed.has(node.fen);
    const hasChildren = node.moves.length > 0;
    const label = getMoveLabel(node.fen, node.san);
    const mainLine = getMainLineContinuation(node, 3);
    const childCount = node.moves.length;

    return (
      <div key={key} className="ml-3 border-l border-gray-700 pl-2">
        <div
          className={`flex items-start gap-2 p-1.5 rounded-lg border transition-colors ${
            isActive ? 'bg-indigo-900/30 border-indigo-700' : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
          }`}
        >
          <button onClick={() => onNavigate(node.fen)} className="flex-shrink-0 hover:opacity-80 transition-opacity">
            <MiniBoard fen={node.fen} orientation={boardOrientation} />
          </button>

          <div className="flex-1 min-w-0 self-center">
            <div className="flex items-center gap-1">
              {hasChildren && (
                <button
                  onClick={() => toggleCollapse(node.fen)}
                  className="text-xs text-gray-500 hover:text-gray-300 w-4 text-center flex-shrink-0"
                  title={isCollapsed ? 'Expand' : 'Collapse'}
                >
                  {isCollapsed ? '\u25B6' : '\u25BC'}
                </button>
              )}
              {!hasChildren && <div className="w-4 flex-shrink-0" />}
              <button
                onClick={() => onNavigate(node.fen)}
                className={`text-sm font-mono hover:text-indigo-400 transition-colors flex-shrink-0 ${
                  isActive ? 'text-indigo-300 font-bold' : 'text-gray-200'
                }`}
              >
                {label}
              </button>
              {hasChildren && (
                <span className="text-[11px] text-gray-500">
                  {childCount} variation{childCount !== 1 ? 's' : ''}
                </span>
              )}
              <button
                onClick={() => onDeleteMove(node.fen, parentFen || root.fen)}
                className="text-xs text-gray-500 hover:text-red-400 ml-auto flex-shrink-0"
                title="Delete variation"
              >
                \u2715
              </button>
            </div>

            {mainLine && (
              <div className="text-[11px] text-gray-500 font-mono mt-0.5 truncate max-w-[260px]">
                {mainLine}
              </div>
            )}

            <div className="flex items-center gap-1 mt-0.5">
              <TagList tags={node.tags || []} nodeFen={node.fen} onTagsSave={onTagsSave} allTags={repertoireTags} />
              {node.comment && (
                <span className="text-[11px] text-gray-400 italic truncate hidden md:inline max-w-[80px]">\u2014 {node.comment}</span>
              )}
            </div>
          </div>
        </div>

        {hasChildren && !isCollapsed && (
          <div className="mt-1">
            {node.moves.map((child, ci) => renderMove(child, ci, node.fen))}
          </div>
        )}

        {node.fen === addingAt && (
          <form onSubmit={handleAddSubmit} className="flex gap-1 ml-6 mt-1 mb-1">
            <input
              type="text"
              value={moveInput}
              onChange={(e) => setMoveInput(e.target.value)}
              className="w-24 px-2 py-0.5 text-xs bg-gray-700 rounded border border-gray-600 outline-none focus:border-indigo-500"
              placeholder="e.g. Nf3"
              autoFocus
            />
            <button type="submit" className="px-2 py-0.5 text-xs bg-indigo-600 rounded hover:bg-indigo-500">Add</button>
            <button type="button" onClick={() => { setAddingAt(null); setMoveInput(''); }} className="px-2 py-0.5 text-xs bg-gray-600 rounded hover:bg-gray-500">Cancel</button>
          </form>
        )}

        {isActive && addingAt !== node.fen && (
          <button
            onClick={() => setAddingAt(node.fen)}
            className="text-xs text-gray-400 hover:text-indigo-400 ml-6 mt-1"
          >
            + Add variation
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="text-sm">
      <div className="mb-2">
        {root.moves.map((child, ci) => renderMove(child, ci, root.fen))}
      </div>
      <MoveInputForm onSubmit={onAddMove} />
    </div>
  );
}

function TagList({ tags, nodeFen, onTagsSave, allTags }: { tags: string[]; nodeFen: string; onTagsSave: (fen: string, tags: string[]) => void; allTags: string[] }) {
  const [adding, setAdding] = useState(false);
  const [input, setInput] = useState('');
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = input.trim()
    ? allTags.filter((t) => !tags.includes(t) && t.toLowerCase().includes(input.toLowerCase()))
    : [];

  function addTag(tag: string) {
    if (!tags.includes(tag)) {
      onTagsSave(nodeFen, [...tags, tag]);
    }
    setInput('');
    setHighlight(0);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (filtered.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlight((h) => Math.min(h + 1, filtered.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlight((h) => Math.max(h - 1, 0));
        return;
      }
      if (e.key === 'Enter' && highlight >= 0) {
        e.preventDefault();
        addTag(filtered[highlight]);
        return;
      }
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = input.trim();
      if (trimmed) addTag(trimmed);
    }
    if (e.key === 'Escape') {
      setAdding(false);
      setInput('');
    }
  }

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  return (
    <div className="flex items-center gap-0.5 flex-wrap max-w-[200px]">
      {tags.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] bg-gray-700 text-gray-300 rounded group">
          {tag}
          <button
            onClick={() => onTagsSave(nodeFen, tags.filter((t) => t !== tag))}
            className="text-gray-500 hover:text-red-400 leading-none"
          >
            \u00D7
          </button>
        </span>
      ))}
      {adding ? (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value); setHighlight(0); }}
            onKeyDown={handleKeyDown}
            onBlur={() => { if (!input.trim()) setAdding(false); }}
            className="w-20 px-1 py-0.5 text-[10px] bg-gray-700 rounded border border-gray-600 outline-none focus:border-indigo-500"
            placeholder="tag"
          />
          {filtered.length > 0 && (
            <div className="absolute top-full left-0 mt-0.5 bg-gray-800 border border-gray-600 rounded shadow-lg z-10 max-h-32 overflow-y-auto">
              {filtered.map((t, i) => (
                <button
                  key={t}
                  onMouseDown={(e) => { e.preventDefault(); addTag(t); }}
                  className={`block w-full text-left px-2 py-0.5 text-[10px] whitespace-nowrap ${
                    i === highlight ? 'bg-indigo-700 text-white' : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="text-[10px] text-gray-500 hover:text-indigo-400 leading-none"
          title="Add tag"
        >
          +
        </button>
      )}
    </div>
  );
}

function MoveInputForm({ onSubmit }: { onSubmit: (san: string) => void }) {
  const [val, setVal] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (val.trim()) {
      onSubmit(val.trim());
      setVal('');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-2">
      <input
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="flex-1 px-3 py-1.5 text-sm bg-gray-700 rounded-lg border border-gray-600 outline-none focus:border-indigo-500"
        placeholder="Enter a move (e.g. e4, Nf3, ...)"
      />
      <button
        type="submit"
        className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition-colors"
      >
        Play
      </button>
    </form>
  );
}
