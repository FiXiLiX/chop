import { useState, useCallback, useRef, useEffect } from 'react';
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
  saveTrees,
  updateRepertoireMeta,
} from '../api';
import { useToast } from '../hooks/useToast';
import { useKeyboardNav } from '../hooks/useKeyboardNav';
import { useAnalysis } from '../hooks/useAnalysis';
import { findNodeAndParent, getPathToFen } from '../utils/tree';
import ChessBoardWrapper from './ChessBoardWrapper';
import MoveTree from './MoveTree';
import CommentEditor from './CommentEditor';
import AnalysisPanel from './AnalysisPanel';
import EvalBar from './EvalBar';
import PracticePanel from './PracticePanel';
import EditRepertoireDialog from './EditRepertoireDialog';
import RenamePositionDialog from './RenamePositionDialog';
import PgnDialog from './PgnDialog';
import PositionEditor from './PositionEditor';
import ShortcutsOverlay from './ShortcutsOverlay';

interface Props {
  repertoire: Repertoire;
  onUpdate: (rep: Repertoire) => void;
  onDuplicate?: (rep: Repertoire) => void;
}

const PLACEHOLDER_ROOT: MoveNode = {
  san: '',
  uci: '',
  fen: '',
  comment: '',
  arrows: [],
  tags: [],
  moves: [],
};

type Snapshot = { trees: MoveNode[]; activeIndex: number };

export default function RepertoirePanel({ repertoire, onUpdate, onDuplicate }: Props) {
  const [activeTreeIndex, setActiveTreeIndex] = useState(0);
  const [currentFen, setCurrentFen] = useState<string>(() => repertoire.trees[0]?.fen ?? '');
  const [currentNode, setCurrentNode] = useState<MoveNode>(
    () => repertoire.trees[0] ?? PLACEHOLDER_ROOT
  );
  const [showPgn, setShowPgn] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ fen: string; parentFen: string } | null>(null);
  const [arrowColor, setArrowColor] = useState('#fbbf24');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [mode, setMode] = useState<'edit' | 'practice'>('edit');
  const [showEdit, setShowEdit] = useState(false);
  const [showPositionEditor, setShowPositionEditor] = useState(false);
  const [editorMode, setEditorMode] = useState<'add' | 'edit'>('add');
  const [renameIndex, setRenameIndex] = useState<number | null>(null);
  const [flipped, setFlipped] = useState<boolean>(
    () => localStorage.getItem(`chop:flip:${repertoire.id}`) === '1'
  );
  const [, setHistoryVersion] = useState(0);
  const pastRef = useRef<Snapshot[]>([]);
  const futureRef = useRef<Snapshot[]>([]);
  const repertoireRef = useRef(repertoire);
  repertoireRef.current = repertoire;
  const activeIndexRef = useRef(activeTreeIndex);
  activeIndexRef.current = activeTreeIndex;

  const toast = useToast();

  const HISTORY_LIMIT = 100;
  const BOARD_SIZE = 400;

  const trees = repertoire.trees;
  const safeIndex = trees.length === 0 ? 0 : Math.min(activeTreeIndex, trees.length - 1);
  const root = trees[safeIndex] as MoveNode | undefined;

  useEffect(() => {
    const t = repertoireRef.current.trees;
    if (t.length === 0) return;
    const i = Math.min(activeTreeIndex, t.length - 1);
    setCurrentFen(t[i].fen);
    setCurrentNode(t[i]);
  }, [activeTreeIndex, repertoire.id]);

  function treesWithRoot(newRoot: MoveNode): MoveNode[] {
    return repertoireRef.current.trees.map((t, i) =>
      i === activeIndexRef.current ? newRoot : t
    );
  }

  function pushHistory(snapshot: Snapshot) {
    pastRef.current.push(snapshot);
    if (pastRef.current.length > HISTORY_LIMIT) {
      pastRef.current.shift();
    }
    futureRef.current = [];
    setHistoryVersion((v) => v + 1);
  }

  function applySnapshot(snap: Snapshot) {
    const rep = repertoireRef.current;
    onUpdate({ ...rep, trees: snap.trees });
    saveTrees(rep.id, snap.trees).catch(() => toast.error('Failed to save history'));
    setActiveTreeIndex(snap.activeIndex);
    const r = snap.trees[snap.activeIndex] ?? snap.trees[0];
    if (!r) return;
    setCurrentFen(r.fen);
    setCurrentNode(r);
  }

  function undo() {
    if (pastRef.current.length === 0) return;
    const prev = pastRef.current.pop();
    if (!prev) return;
    futureRef.current.push({
      trees: repertoireRef.current.trees,
      activeIndex: activeIndexRef.current,
    });
    if (futureRef.current.length > HISTORY_LIMIT) {
      futureRef.current.shift();
    }
    applySnapshot(prev);
    toast.info('Undo');
  }

  function redo() {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current.pop();
    if (!next) return;
    pastRef.current.push({
      trees: repertoireRef.current.trees,
      activeIndex: activeIndexRef.current,
    });
    if (pastRef.current.length > HISTORY_LIMIT) {
      pastRef.current.shift();
    }
    applySnapshot(next);
    toast.info('Redo');
  }

  function collectTags(node: MoveNode): string[] {
    const tags = new Set(node.tags || []);
    for (const child of node.moves) {
      for (const t of collectTags(child)) tags.add(t);
    }
    return [...tags].sort();
  }

  function handleNavigate(fen: string) {
    if (!root) return;
    const path = getPathToFen(root, fen);
    if (path.length > 0) {
      setCurrentFen(fen);
      setCurrentNode(path[path.length - 1]);
    }
  }

  async function handleMove(san: string) {
    try {
      if (!root) return;
      const result = findNodeAndParent(root, currentFen);
      if (!result) return;
      const lookup = new Chess(currentFen);
      const move = lookup.move(san);
      if (!move) return;
      const existing = result.node.moves.find((m) => m.san === move.san);
      if (existing) {
        handleNavigate(existing.fen);
        return;
      }
      pushHistory({ trees: repertoireRef.current.trees, activeIndex: activeTreeIndex });
      await addMove(repertoire.id, currentFen, move.san, activeTreeIndex);
      const newNode: MoveNode = {
        san: move.san,
        uci: move.from + move.to + (move.promotion ?? ''),
        fen: lookup.fen(),
        comment: '',
        arrows: [],
        tags: [],
        moves: [],
      };
      const updatedRoot = structuredClone(root);
      const target = findNodeAndParent(updatedRoot, currentFen);
      if (target) {
        target.node.moves.push(newNode);
      }
      handleNavigate(newNode.fen);
      onUpdate({ ...repertoire, trees: treesWithRoot(updatedRoot) });
    } catch (err) {
      toast.error('Failed to add move');
    }
  }

  async function confirmDelete(fen: string, parentFen: string) {
    try {
      if (!root) return;
      pushHistory({ trees: repertoireRef.current.trees, activeIndex: activeTreeIndex });
      await deleteMove(repertoire.id, parentFen, fen, activeTreeIndex);
      const updatedRoot = structuredClone(root);
      const parentNode = findNodeAndParent(updatedRoot, parentFen);
      if (parentNode) {
        parentNode.node.moves = parentNode.node.moves.filter((m) => m.fen !== fen);
      }
      handleNavigate(parentFen);
      onUpdate({ ...repertoire, trees: treesWithRoot(updatedRoot) });
    } catch (err) {
      toast.error('Failed to delete move');
    }
  }

  async function handleTagsSave(fen: string, tags: string[]) {
    try {
      if (!root) return;
      const before = findNodeAndParent(root, fen);
      const prevTags = before?.node.tags ?? [];
      const changed =
        prevTags.length !== tags.length || prevTags.some((t, i) => tags[i] !== t);
      if (changed) {
        pushHistory({ trees: repertoireRef.current.trees, activeIndex: activeTreeIndex });
      }
      await updateTags(repertoire.id, fen, tags, activeTreeIndex);
      const updatedRoot = structuredClone(root);
      const target = findNodeAndParent(updatedRoot, fen);
      if (target) {
        target.node.tags = tags;
        if (fen === currentFen) setCurrentNode(target.node);
      }
      onUpdate({ ...repertoire, trees: treesWithRoot(updatedRoot) });
    } catch (err) {
      toast.error('Failed to update tags');
    }
  }

  async function handleCommentSave(fen: string, comment: string) {
    try {
      if (!root) return;
      const before = findNodeAndParent(root, fen);
      if (before && before.node.comment !== comment) {
        pushHistory({ trees: repertoireRef.current.trees, activeIndex: activeTreeIndex });
      }
      await updateComment(repertoire.id, fen, comment, activeTreeIndex);
      const updatedRoot = structuredClone(root);
      const target = findNodeAndParent(updatedRoot, fen);
      if (target) {
        target.node.comment = comment;
      }
      onUpdate({ ...repertoire, trees: treesWithRoot(updatedRoot) });
    } catch (err) {
      toast.error('Failed to save comment');
    }
  }

  async function handlePgnImport(pgn: string) {
    try {
      const prevSnapshot: Snapshot = {
        trees: repertoireRef.current.trees,
        activeIndex: activeIndexRef.current,
      };
      const res = await importPgn(repertoire.id, pgn);
      pushHistory(prevSnapshot);
      onUpdate(res);
      const imported = res.trees[0];
      if (!imported) return;
      setActiveTreeIndex(0);
      setCurrentFen(imported.fen);
      setCurrentNode(imported);
      setShowPgn(false);
      toast.success('PGN imported');
    } catch (err) {
      toast.error('Invalid PGN');
    }
  }

  async function handlePgnExport(): Promise<string> {
    return exportPgn(repertoire.id, activeTreeIndex);
  }

  const currentFenRef = useRef(currentFen);
  currentFenRef.current = currentFen;
  const currentNodeArrowsRef = useRef(currentNode.arrows);
  currentNodeArrowsRef.current = currentNode.arrows;
  const arrowColorRef = useRef(arrowColor);
  arrowColorRef.current = arrowColor;

  const handleArrowsChange = useCallback(
    (arrows: { from: string; to: string; color?: string }[]) => {
      const fen = currentFenRef.current;
      const tree = repertoireRef.current.trees[activeIndexRef.current];
      if (!tree) return;
      const existing = currentNodeArrowsRef.current;
      const withColor = arrows.map((a) => {
        const prev = existing.find((e) => e.from === a.from && e.to === a.to);
        return { from: a.from, to: a.to, color: a.color || prev?.color || arrowColorRef.current };
      });
      if (JSON.stringify(existing) === JSON.stringify(withColor)) return;
      pushHistory({ trees: repertoireRef.current.trees, activeIndex: activeIndexRef.current });
      const updatedRoot = structuredClone(tree);
      const target = findNodeAndParent(updatedRoot, fen);
      if (target) {
        target.node.arrows = withColor;
        setCurrentNode(target.node);
      }
      onUpdate({ ...repertoireRef.current, trees: treesWithRoot(updatedRoot) });
      updateArrows(repertoire.id, fen, withColor, activeIndexRef.current).catch(() =>
        toast.error('Failed to save arrows')
      );
    },
    [repertoire.id, onUpdate]
  );

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
    ? repertoire.color === 'white'
      ? 'black'
      : 'white'
    : repertoire.color;

  const toggleFlip = useCallback(() => {
    setFlipped((f) => {
      const next = !f;
      localStorage.setItem(`chop:flip:${repertoire.id}`, next ? '1' : '0');
      return next;
    });
  }, [repertoire.id]);

  const handleAnalysisResult = useCallback(
    (fen: string, result: AnalysisResult) => {
      const best = result.lines[0];
      if (!best) return;
      const cache: AnalysisCache = {
        depth: best.depth,
        score: best.score,
        bestMove: best.uci,
        pv: best.pv,
        timestamp: new Date().toISOString(),
      };
      saveAnalysis(repertoire.id, fen, cache, activeIndexRef.current)
        .then(() => {
          const updatedRoot = structuredClone(
            repertoireRef.current.trees[activeIndexRef.current]
          );
          if (!updatedRoot) return;
          const target = findNodeAndParent(updatedRoot, fen);
          if (target) target.node.analysis = cache;
          onUpdate({ ...repertoireRef.current, trees: treesWithRoot(updatedRoot) });
        })
        .catch(() => {});
    },
    [repertoire.id, onUpdate]
  );

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

  function handleAddStartingPosition(fen: string) {
    const newRoot: MoveNode = {
      san: '',
      uci: '',
      fen,
      comment: '',
      arrows: [],
      tags: [],
      moves: [],
      name: `Position ${repertoire.trees.length + 1}`,
    };
    const newTrees = [...repertoire.trees, newRoot];
    pushHistory({ trees: repertoire.trees, activeIndex: activeTreeIndex });
    onUpdate({ ...repertoire, trees: newTrees });
    saveTrees(repertoire.id, newTrees).catch(() =>
      toast.error('Failed to save starting position')
    );
    setActiveTreeIndex(newTrees.length - 1);
    setCurrentFen(fen);
    setCurrentNode(newRoot);
    setShowPositionEditor(false);
    toast.success('Starting position added');
  }

  function handleEditStartingPosition(fen: string) {
    if (!root) return;
    const name = root.name;
    const newRoot: MoveNode = {
      san: '',
      uci: '',
      fen,
      comment: '',
      arrows: [],
      tags: [],
      moves: [],
      name,
    };
    const newTrees = treesWithRoot(newRoot);
    pushHistory({ trees: repertoire.trees, activeIndex: activeTreeIndex });
    onUpdate({ ...repertoire, trees: newTrees });
    saveTrees(repertoire.id, newTrees).catch(() =>
      toast.error('Failed to save starting position')
    );
    setCurrentFen(fen);
    setCurrentNode(newRoot);
    setShowPositionEditor(false);
    toast.success('Starting position updated');
  }

  function handleDeleteStartingPosition(index: number) {
    if (repertoire.trees.length <= 1) return;
    const newTrees = repertoire.trees.filter((_, i) => i !== index);
    const newIndex = Math.min(activeTreeIndex, newTrees.length - 1);
    pushHistory({ trees: repertoire.trees, activeIndex: activeTreeIndex });
    onUpdate({ ...repertoire, trees: newTrees });
    saveTrees(repertoire.id, newTrees).catch(() =>
      toast.error('Failed to delete starting position')
    );
    setActiveTreeIndex(newIndex);
    toast.info('Starting position deleted');
  }

  function handleRenameStartingPosition(index: number, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const newTrees = repertoire.trees.map((t, i) =>
      i === index ? { ...t, name: trimmed } : t
    );
    onUpdate({ ...repertoire, trees: newTrees });
    saveTrees(repertoire.id, newTrees).catch(() =>
      toast.error('Failed to rename starting position')
    );
  }

  const analysis = useAnalysis({
    fen: currentFen,
    enabled: mode === 'edit',
    cache: currentNode.analysis ?? null,
    onResult: handleAnalysisResult,
  });

  useKeyboardNav({
    root: root ?? PLACEHOLDER_ROOT,
    currentFen,
    onNavigate: handleNavigate,
    onUndo: undo,
    onRedo: redo,
    onToggleShortcuts: () => setShowShortcuts((s) => !s),
    onFlip: toggleFlip,
    enabled: mode === 'edit',
  });

  const turn = new Chess(currentFen).turn();

  if (!root) {
    return (
      <div className="flex flex-col h-full">
        <header className="flex items-center justify-between gap-3 px-4 py-2 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium text-gray-100 truncate">{repertoire.name}</span>
            <span className="text-xs text-gray-500">
              {repertoire.color === 'white' ? '♔ White' : '♚ Black'}
            </span>
            {repertoire.eco && <span className="text-xs text-gray-500">{repertoire.eco}</span>}
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-gray-300 mb-4">No starting positions yet.</p>
            <button
              onClick={() => {
                setEditorMode('add');
                setShowPositionEditor(true);
              }}
              className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 rounded transition-colors"
            >
              New starting position
            </button>
          </div>
        </div>
        {showPositionEditor && (
          <PositionEditor
            initialFen=""
            hasMoves={false}
            onApply={handleAddStartingPosition}
            onClose={() => setShowPositionEditor(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between gap-3 px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-gray-100 truncate">{repertoire.name}</span>
          <span className="text-xs text-gray-500">
            {repertoire.color === 'white' ? '♔ White' : '♚ Black'}
          </span>
          {repertoire.eco && <span className="text-xs text-gray-500">{repertoire.eco}</span>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowEdit(true)}
            className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          >
            Edit details
          </button>
          <button
            onClick={toggleFlip}
            className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
            title="Flip board (F)"
          >
            Flip
          </button>
          <button
            onClick={() => setMode((m) => (m === 'edit' ? 'practice' : 'edit'))}
            className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 rounded transition-colors font-medium"
          >
            {mode === 'edit' ? 'Practice' : 'Back to edit'}
          </button>
        </div>
      </header>

      {mode === 'edit' && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-800 border-b border-gray-700 overflow-x-auto">
          <span className="text-[11px] uppercase tracking-wide text-gray-500 flex-shrink-0">
            Positions
          </span>
          {trees.map((t, i) => (
            <button
              key={i}
              onClick={() => setActiveTreeIndex(i)}
              onDoubleClick={() => setRenameIndex(i)}
              title="Double-click to rename"
              className={`px-2.5 py-1 text-xs rounded transition-colors whitespace-nowrap ${
                i === safeIndex
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
              }`}
            >
              {t.name || `Position ${i + 1}`}
            </button>
          ))}
          <button
            onClick={() => setRenameIndex(safeIndex)}
            className="px-2.5 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-200 flex-shrink-0"
            title="Rename the active starting position"
          >
            Rename
          </button>
          <button
            onClick={() => handleDeleteStartingPosition(safeIndex)}
            disabled={trees.length <= 1}
            className="px-2.5 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            title="Delete the active starting position"
          >
            Delete
          </button>
        </div>
      )}

      {mode === 'practice' ? (
        <div className="flex-1 overflow-y-auto p-4">
          <PracticePanel
            root={root}
            color={repertoire.color}
            name={repertoire.name}
            onExit={() => setMode('edit')}
          />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <div className="flex flex-col items-center p-4 gap-4 bg-gray-800">
            <div className="flex items-start gap-2">
              <EvalBar
                result={analysis.result}
                analyzing={analysis.analyzing}
                orientation={effectiveOrientation}
                height={BOARD_SIZE}
              />
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
            <div className="flex gap-2 flex-wrap justify-center">
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
              <button
                onClick={() => {
                  setEditorMode('add');
                  setShowPositionEditor(true);
                }}
                className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                title="Add a new starting position"
              >
                New starting position
              </button>
              <button
                onClick={() => {
                  setEditorMode('edit');
                  setShowPositionEditor(true);
                }}
                className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                title="Edit the starting position (for studies)"
              >
                Edit position
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden border-l border-gray-700">
            <div className="flex-1 overflow-y-auto p-4">
              <MoveTree
                root={root}
                currentFen={currentFen}
                onNavigate={handleNavigate}
                onAddMove={handleMove}
                onDeleteMove={(fen, parentFen) => setDeleteTarget({ fen, parentFen })}
                onTagsSave={handleTagsSave}
                repertoireTags={collectTags(root)}
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
            <CommentEditor key={currentFen} node={currentNode} onSave={handleCommentSave} />
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <p className="mb-4">Delete this move and all its variations?</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmDelete(deleteTarget.fen, deleteTarget.parentFen);
                  setDeleteTarget(null);
                }}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500"
              >
                Delete
              </button>
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

      {showShortcuts && <ShortcutsOverlay onClose={() => setShowShortcuts(false)} />}

      {showEdit && (
        <EditRepertoireDialog
          name={repertoire.name}
          color={repertoire.color}
          eco={repertoire.eco}
          onSave={handleMetadataSave}
          onClose={() => setShowEdit(false)}
        />
      )}

      {showPositionEditor && (
        <PositionEditor
          initialFen={root.fen}
          hasMoves={editorMode === 'edit' && root.moves.length > 0}
          onApply={editorMode === 'add' ? handleAddStartingPosition : handleEditStartingPosition}
          onClose={() => setShowPositionEditor(false)}
        />
      )}

      {renameIndex !== null && (
        <RenamePositionDialog
          initialName={trees[renameIndex]?.name || `Position ${renameIndex + 1}`}
          onSave={(name) => {
            handleRenameStartingPosition(renameIndex, name);
            setRenameIndex(null);
          }}
          onClose={() => setRenameIndex(null)}
        />
      )}
    </div>
  );
}
