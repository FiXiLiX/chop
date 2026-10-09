import { useState, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import { Repertoire, MoveNode, AnalysisResult, AnalysisCache } from '../types';
import {
  addMove,
  deleteMove,
  updateComment,
  updateArrows,
  updateTags,
  setFaceFen,
  saveAnalysis,
  importPgn,
  exportPgn,
  saveTree,
  updateRepertoireMeta,
} from '../api';
import { useToast } from '../hooks/useToast';
import { useKeyboardNav } from '../hooks/useKeyboardNav';
import { useAnalysis } from '../hooks/useAnalysis';
import { findNodeAndParent, getPathToFen, fenExists } from '../utils/tree';
import ChessBoardWrapper from './ChessBoardWrapper';
import MoveTree from './MoveTree';
import CommentEditor from './CommentEditor';
import AnalysisPanel from './AnalysisPanel';
import EvalBar from './EvalBar';
import PracticePanel from './PracticePanel';
import EditRepertoireDialog from './EditRepertoireDialog';
import PgnDialog from './PgnDialog';
import ShortcutsOverlay from './ShortcutsOverlay';

interface Props {
  repertoire: Repertoire;
  onUpdate: (rep: Repertoire) => void;
  onDuplicate?: (rep: Repertoire) => void;
}

export default function RepertoirePanel({ repertoire, onUpdate, onDuplicate }: Props) {
  const [currentFen, setCurrentFen] = useState(repertoire.tree.fen);
  const [currentNode, setCurrentNode] = useState<MoveNode>(repertoire.tree);
  const [showPgn, setShowPgn] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ fen: string; parentFen: string } | null>(null);
  const [arrowColor, setArrowColor] = useState('#fbbf24');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [mode, setMode] = useState<'edit' | 'practice'>('edit');
  const [showEdit, setShowEdit] = useState(false);
  const [flipped, setFlipped] = useState<boolean>(
    () => localStorage.getItem(`chop:flip:${repertoire.id}`) === '1'
  );
  const [, setHistoryVersion] = useState(0);
  const pastRef = useRef<MoveNode[]>([]);
  const futureRef = useRef<MoveNode[]>([]);
  const repertoireRef = useRef(repertoire);
  repertoireRef.current = repertoire;

  const toast = useToast();

  function collectTags(node: MoveNode): string[] {
    const tags = new Set(node.tags || []);
    for (const child of node.moves) {
      for (const t of collectTags(child)) tags.add(t);
    }
    return [...tags].sort();
  }

  const HISTORY_LIMIT = 100;
  const BOARD_SIZE = 400;

  function pushHistory(prevTree: MoveNode) {
    pastRef.current.push(prevTree);
    if (pastRef.current.length > HISTORY_LIMIT) {
      pastRef.current.shift();
    }
    futureRef.current = [];
    setHistoryVersion((v) => v + 1);
  }

  function applyTree(tree: MoveNode) {
    const rep = repertoireRef.current;
    onUpdate({ ...rep, tree });
    saveTree(rep.id, tree).catch(() => toast.error('Failed to save history'));
    if (fenExists(tree, currentFenRef.current)) {
      const fen = currentFenRef.current;
      const found = findNodeAndParent(tree, fen);
      if (found) {
        setCurrentFen(fen);
        setCurrentNode(found.node);
      } else {
        setCurrentFen(tree.fen);
        setCurrentNode(tree);
      }
    } else {
      setCurrentFen(tree.fen);
      setCurrentNode(tree);
    }
  }

  function undo() {
    if (pastRef.current.length === 0) return;
    const prev = pastRef.current.pop();
    if (!prev) return;
    futureRef.current.push(repertoireRef.current.tree);
    if (futureRef.current.length > HISTORY_LIMIT) {
      futureRef.current.shift();
    }
    applyTree(prev);
    toast.info('Undo');
  }

  function redo() {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current.pop();
    if (!next) return;
    pastRef.current.push(repertoireRef.current.tree);
    if (pastRef.current.length > HISTORY_LIMIT) {
      pastRef.current.shift();
    }
    applyTree(next);
    toast.info('Redo');
  }

  function handleNavigate(fen: string) {
    const path = getPathToFen(repertoire.tree, fen);
    if (path.length > 0) {
      setCurrentFen(fen);
      setCurrentNode(path[path.length - 1]);
    }
  }

  async function handleMove(san: string) {
    try {
      const result = findNodeAndParent(repertoire.tree, currentFen);
      if (!result) return;
      const lookup = new Chess(currentFen);
      const move = lookup.move(san);
      if (!move) return;
      const existing = result.node.moves.find((m) => m.san === move.san);
      if (existing) {
        handleNavigate(existing.fen);
        return;
      }
      pushHistory(repertoire.tree);
      await addMove(repertoire.id, currentFen, move.san);
      const newNode: MoveNode = {
        san: move.san,
        uci: move.from + move.to + (move.promotion ?? ''),
        fen: lookup.fen(),
        comment: '',
        arrows: [],
        tags: [],
        moves: [],
      };
      const updatedTree = structuredClone(repertoire.tree);
      const target = findNodeAndParent(updatedTree, currentFen);
      if (target) {
        target.node.moves.push(newNode);
      }
      handleNavigate(newNode.fen);
      onUpdate({ ...repertoire, tree: updatedTree });
    } catch (err) {
      toast.error('Failed to add move');
    }
  }

  async function confirmDelete(fen: string, parentFen: string) {
    try {
      pushHistory(repertoire.tree);
      await deleteMove(repertoire.id, parentFen, fen);
      const updatedTree = structuredClone(repertoire.tree);
      const parentNode = findNodeAndParent(updatedTree, parentFen);
      if (parentNode) {
        parentNode.node.moves = parentNode.node.moves.filter((m) => m.fen !== fen);
      }
      handleNavigate(parentFen);
      onUpdate({ ...repertoire, tree: updatedTree });
    } catch (err) {
      toast.error('Failed to delete move');
    }
  }

  async function handleTagsSave(fen: string, tags: string[]) {
    try {
      const before = findNodeAndParent(repertoire.tree, fen);
      const prevTags = before?.node.tags ?? [];
      const changed =
        prevTags.length !== tags.length ||
        prevTags.some((t, i) => tags[i] !== t);
      if (changed) {
        pushHistory(repertoire.tree);
      }
      await updateTags(repertoire.id, fen, tags);
      const updatedTree = structuredClone(repertoire.tree);
      const target = findNodeAndParent(updatedTree, fen);
      if (target) {
        target.node.tags = tags;
        if (fen === currentFen) setCurrentNode(target.node);
      }
      onUpdate({ ...repertoire, tree: updatedTree });
    } catch (err) {
      toast.error('Failed to update tags');
    }
  }

  async function handleCommentSave(fen: string, comment: string) {
    try {
      const before = findNodeAndParent(repertoire.tree, fen);
      if (before && before.node.comment !== comment) {
        pushHistory(repertoire.tree);
      }
      await updateComment(repertoire.id, fen, comment);
      const updatedTree = structuredClone(repertoire.tree);
      const target = findNodeAndParent(updatedTree, fen);
      if (target) {
        target.node.comment = comment;
      }
      onUpdate({ ...repertoire, tree: updatedTree });
    } catch (err) {
      toast.error('Failed to save comment');
    }
  }

  async function handlePgnImport(pgn: string) {
    try {
      const prevTree = repertoire.tree;
      const res = await importPgn(repertoire.id, pgn);
      pushHistory(prevTree);
      onUpdate(res);
      setCurrentFen(res.tree.fen);
      setCurrentNode(res.tree);
      setShowPgn(false);
      toast.success('PGN imported');
    } catch (err) {
      toast.error('Invalid PGN');
    }
  }

  async function handlePgnExport(): Promise<string> {
    return exportPgn(repertoire.id);
  }

  const currentFenRef = useRef(currentFen);
  currentFenRef.current = currentFen;
  const currentNodeArrowsRef = useRef(currentNode.arrows);
  currentNodeArrowsRef.current = currentNode.arrows;
  const arrowColorRef = useRef(arrowColor);
  arrowColorRef.current = arrowColor;

  const handleArrowsChange = useCallback((arrows: { from: string; to: string; color?: string }[]) => {
    const fen = currentFenRef.current;
    const tree = repertoireRef.current.tree;
    const existing = currentNodeArrowsRef.current;
    const withColor = arrows.map((a) => {
      const prev = existing.find((e) => e.from === a.from && e.to === a.to);
      return { from: a.from, to: a.to, color: a.color || prev?.color || arrowColorRef.current };
    });
    if (JSON.stringify(existing) === JSON.stringify(withColor)) return;
    pushHistory(tree);
    const updatedTree = structuredClone(tree);
    const target = findNodeAndParent(updatedTree, fen);
    if (target) {
      target.node.arrows = withColor;
      setCurrentNode(target.node);
    }
    onUpdate({ ...repertoireRef.current, tree: updatedTree });
    updateArrows(repertoire.id, fen, withColor).catch(() => toast.error('Failed to save arrows'));
  }, [repertoire.id, onUpdate]);

  async function handleSetFace() {
    await setFaceFen(repertoire.id, currentFen);
    onUpdate({ ...repertoire, faceFen: currentFen });
    toast.success('Cover position set');
  }

  function handleDuplicate() {
    onDuplicate?.(repertoire);
    toast.info('Opened a duplicate in a new tab');
  }

  const effectiveOrientation = flipped
    ? repertoire.color === 'white' ? 'black' : 'white'
    : repertoire.color;

  const toggleFlip = useCallback(() => {
    setFlipped((f) => {
      const next = !f;
      localStorage.setItem(`chop:flip:${repertoire.id}`, next ? '1' : '0');
      return next;
    });
  }, [repertoire.id]);

  const handleAnalysisResult = useCallback((fen: string, result: AnalysisResult) => {
    const best = result.lines[0];
    if (!best) return;
    const cache: AnalysisCache = {
      depth: best.depth,
      score: best.score,
      bestMove: best.uci,
      pv: best.pv,
      timestamp: new Date().toISOString(),
    };
    saveAnalysis(repertoire.id, fen, cache)
      .then(() => {
        const updatedTree = structuredClone(repertoireRef.current.tree);
        const target = findNodeAndParent(updatedTree, fen);
        if (target) target.node.analysis = cache;
        onUpdate({ ...repertoireRef.current, tree: updatedTree });
      })
      .catch(() => {});
  }, [repertoire.id, onUpdate]);

  async function handleMetadataSave(data: { name: string; color: 'white' | 'black'; eco: string }) {
    try {
      const updated = await updateRepertoireMeta(repertoire.id, data);
      onUpdate(updated);
      setShowEdit(false);
      toast.success('Repertoire updated');
    } catch {
      toast.error('Failed to update repertoire');
    }
  }

  const analysis = useAnalysis({
    fen: currentFen,
    enabled: mode === 'edit',
    cache: currentNode.analysis ?? null,
    onResult: handleAnalysisResult,
  });

  useKeyboardNav({
    root: repertoire.tree,
    currentFen,
    onNavigate: handleNavigate,
    onUndo: undo,
    onRedo: redo,
    onToggleShortcuts: () => setShowShortcuts((s) => !s),
    onFlip: toggleFlip,
    enabled: mode === 'edit',
  });

  const turn = new Chess(currentFen).turn();

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between gap-3 px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-gray-100 truncate">{repertoire.name}</span>
          <span className="text-xs text-gray-500">{repertoire.color === 'white' ? '♔ White' : '♚ Black'}</span>
          {repertoire.eco && <span className="text-xs text-gray-500">{repertoire.eco}</span>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => setShowEdit(true)} className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors">Edit details</button>
          <button onClick={toggleFlip} className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors" title="Flip board (F)">Flip</button>
          <button
            onClick={() => setMode((m) => (m === 'edit' ? 'practice' : 'edit'))}
            className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 rounded transition-colors font-medium"
          >
            {mode === 'edit' ? 'Practice' : 'Back to edit'}
          </button>
        </div>
      </header>

      {mode === 'practice' ? (
        <div className="flex-1 overflow-y-auto p-4">
          <PracticePanel repertoire={repertoire} onExit={() => setMode('edit')} />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <div className="flex flex-col items-center p-4 gap-4 bg-gray-800">
            <div className="flex items-start gap-2">
              <EvalBar result={analysis.result} analyzing={analysis.analyzing} orientation={effectiveOrientation} height={BOARD_SIZE} />
              <ChessBoardWrapper
                position={currentFen}
                boardOrientation={effectiveOrientation}
                onPieceDrop={(src, dst, promotion) => {
                  const chess2 = new Chess(currentFen);
                  try {
                    const move = chess2.move({ from: src, to: dst, promotion });
                    if (move) {
                      handleMove(move.san);
                    }
                  } catch {
                    // illegal move
                  }
                }}
                arrows={currentNode.arrows}
                onArrowsChange={handleArrowsChange}
                arrowColor={arrowColor}
              />
            </div>
            <div className="flex items-center gap-1">
              {['#fbbf24', '#ef4444', '#3b82f6', '#22c55e'].map((color) => (
                <button
                  key={color}
                  onClick={() => setArrowColor(color)}
                  className={`w-4 h-4 rounded-full border-2 transition-colors ${
                    arrowColor === color ? 'border-white scale-125' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  title={`Arrow color: ${color}`}
                />
              ))}
            </div>
            <div className="text-sm text-gray-400 text-center max-w-[400px] break-all">
              {currentFen}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowPgn(true)}
                className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
              >
                PGN
              </button>
              <button
                onClick={handleSetFace}
                className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                title="Set current position as repertoire cover"
              >
                Set Face
              </button>
              <button
                onClick={handleDuplicate}
                className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
              >
                Duplicate
              </button>
              <button
                onClick={undo}
                disabled={pastRef.current.length === 0}
                className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors disabled:opacity-40 disabled:hover:bg-gray-700 disabled:cursor-not-allowed"
                title="Undo (Ctrl+Z)"
              >
                Undo
              </button>
              <button
                onClick={redo}
                disabled={futureRef.current.length === 0}
                className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors disabled:opacity-40 disabled:hover:bg-gray-700 disabled:cursor-not-allowed"
                title="Redo (Ctrl+Shift+Z)"
              >
                Redo
              </button>
              <button
                onClick={() => setShowShortcuts(true)}
                className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                title="Keyboard shortcuts"
                aria-label="Show keyboard shortcuts"
              >
                ?
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden border-l border-gray-700">
            <div className="flex-1 overflow-y-auto p-4">
              <MoveTree
                root={repertoire.tree}
                currentFen={currentFen}
                onNavigate={handleNavigate}
                onAddMove={handleMove}
                onDeleteMove={(fen, parentFen) => setDeleteTarget({ fen, parentFen })}
                onTagsSave={handleTagsSave}
                repertoireTags={collectTags(repertoire.tree)}
                turn={turn}
                path={[]}
                boardOrientation={effectiveOrientation}
              />
            </div>

            <AnalysisPanel
              fen={currentFen}
              repertoireColor={repertoire.color}
              result={analysis.result}
              analyzing={analysis.analyzing}
              stale={analysis.stale}
              onRequest={analysis.request}
              onPlayMove={handleMove}
            />
            <CommentEditor
              key={currentFen}
              node={currentNode}
              onSave={handleCommentSave}
            />
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <p className="mb-4">Delete this move and all its variations?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600">Cancel</button>
              <button onClick={() => { confirmDelete(deleteTarget.fen, deleteTarget.parentFen); setDeleteTarget(null); }} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500">Delete</button>
            </div>
          </div>
        </div>
      )}

      {showPgn && (
        <PgnDialog
          onImport={handlePgnImport}
          onExport={handlePgnExport}
          onClose={() => setShowPgn(false)}
        />
      )}

      {showShortcuts && (
        <ShortcutsOverlay onClose={() => setShowShortcuts(false)} />
      )}

      {showEdit && (
        <EditRepertoireDialog
          name={repertoire.name}
          color={repertoire.color}
          eco={repertoire.eco}
          onSave={handleMetadataSave}
          onClose={() => setShowEdit(false)}
        />
      )}
    </div>
  );
}
