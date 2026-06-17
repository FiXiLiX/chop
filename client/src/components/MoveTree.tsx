import { useState, useRef, useEffect } from 'react';
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
}

export default function MoveTree({ root, currentFen, onNavigate, onAddMove, onDeleteMove, onTagsSave, repertoireTags, turn, path }: Props) {
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
    const prefix = turn === 'w' ? `${Math.floor((path.length + idx) / 2) + 1}.` : '';
    const key = `${parentFen || 'root'}-${node.san}-${idx}`;
    const isCollapsed = collapsed.has(node.fen);
    const hasChildren = node.moves.length > 0;

    return (
      <div key={key} className="ml-3 border-l border-gray-700 pl-2">
        <div className={`flex items-center gap-1 py-0.5 ${isActive ? 'bg-indigo-900/40 rounded px-1 -ml-1' : ''}`}>
          <div className="w-4 flex-shrink-0">
            {hasChildren && (
              <button
                onClick={() => toggleCollapse(node.fen)}
                className="text-xs text-gray-500 hover:text-gray-300 w-4 text-center"
                title={isCollapsed ? 'Expand' : 'Collapse'}
              >
                {isCollapsed ? '▶' : '▼'}
              </button>
            )}
          </div>
          {prefix && <span className="text-xs text-gray-500 w-5 text-right flex-shrink-0">{prefix}</span>}
          <button
            onClick={() => onNavigate(node.fen)}
            className={`text-sm font-mono hover:text-indigo-400 transition-colors flex-shrink-0 ${
              isActive ? 'text-indigo-300 font-bold' : 'text-gray-200'
            }`}
          >
            {node.san}
          </button>
          <TagList tags={node.tags || []} nodeFen={node.fen} onTagsSave={onTagsSave} allTags={repertoireTags} />
          {node.comment && (
            <span className="text-xs text-gray-400 italic truncate hidden md:inline max-w-[80px]">— {node.comment}</span>
          )}
          <button
            onClick={() => onDeleteMove(node.fen, parentFen || root.fen)}
            className="text-xs text-gray-500 hover:text-red-400 ml-auto flex-shrink-0"
            title="Delete variation"
          >
            ✕
          </button>
        </div>

        {hasChildren && !isCollapsed && (
          <div>
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
            ×
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
