import { useState, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import { Repertoire, MoveNode, AnalysisResult, AnalysisCache } from '../types';
import { addMove, deleteMove, updateComment, updateArrows, updateTags, setFaceFen, analyzePosition, saveAnalysis, importPgn, exportPgn } from '../api';
import ChessBoardWrapper from './ChessBoardWrapper';
import MoveTree from './MoveTree';
import CommentEditor from './CommentEditor';
import AnalysisPanel from './AnalysisPanel';
import PgnDialog from './PgnDialog';

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

  function findNodeAndParent(node: MoveNode, fen: string, parent?: MoveNode): { node: MoveNode; parent?: MoveNode } | null {
    if (node.fen === fen) return { node, parent };
    for (const child of node.moves) {
      const found = findNodeAndParent(child, fen, node);
      if (found) return found;
    }
    return null;
  }

  function collectTags(node: MoveNode): string[] {
    const tags = new Set(node.tags || []);
    for (const child of node.moves) {
      for (const t of collectTags(child)) tags.add(t);
    }
    return [...tags].sort();
  }

  function getPathToFen(node: MoveNode, fen: string): MoveNode[] {
    if (node.fen === fen) return [node];
    for (const child of node.moves) {
      const path = getPathToFen(child, fen);
      if (path.length > 0) return [node, ...path];
    }
    return [];
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
      console.error('Move failed', err);
    }
  }

  async function confirmDelete(fen: string, parentFen: string) {
    try {
      await deleteMove(repertoire.id, parentFen, fen);
      const updatedTree = structuredClone(repertoire.tree);
      const parentNode = findNodeAndParent(updatedTree, parentFen);
      if (parentNode) {
        parentNode.node.moves = parentNode.node.moves.filter((m) => m.fen !== fen);
      }
      handleNavigate(parentFen);
      onUpdate({ ...repertoire, tree: updatedTree });
    } catch (err) {
      console.error('Delete failed', err);
    }
  }

  async function handleTagsSave(fen: string, tags: string[]) {
    try {
      await updateTags(repertoire.id, fen, tags);
      const updatedTree = structuredClone(repertoire.tree);
      const target = findNodeAndParent(updatedTree, fen);
      if (target) {
        target.node.tags = tags;
        if (fen === currentFen) setCurrentNode(target.node);
      }
      onUpdate({ ...repertoire, tree: updatedTree });
    } catch (err) {
      console.error('Tag update failed', err);
    }
  }

  async function handleCommentSave(fen: string, comment: string) {
    try {
      await updateComment(repertoire.id, fen, comment);
      const updatedTree = structuredClone(repertoire.tree);
      const target = findNodeAndParent(updatedTree, fen);
      if (target) {
        target.node.comment = comment;
      }
      onUpdate({ ...repertoire, tree: updatedTree });
    } catch (err) {
      console.error('Comment update failed', err);
    }
  }

  async function handlePgnImport(pgn: string) {
    try {
      const res = await importPgn(repertoire.id, pgn);
      onUpdate(res);
      setCurrentFen(res.tree.fen);
      setCurrentNode(res.tree);
      setShowPgn(false);
    } catch (err) {
      alert('Invalid PGN');
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

  const handleArrowsChange = useCallback(async (arrows: { from: string; to: string; color?: string }[]) => {
    const fen = currentFenRef.current;
    const existing = currentNodeArrowsRef.current;
    const withColor = arrows.map((a) => {
      const prev = existing.find((e) => e.from === a.from && e.to === a.to);
      return { ...a, color: prev?.color || arrowColorRef.current };
    });
    const prevJson = JSON.stringify(existing);
    const nextJson = JSON.stringify(withColor);
    if (prevJson === nextJson) return;
    try {
      await updateArrows(repertoire.id, fen, withColor);
      const updatedTree = structuredClone(repertoire.tree);
      const target = findNodeAndParent(updatedTree, fen);
      if (target) {
        target.node.arrows = withColor;
        setCurrentNode(target.node);
      }
      onUpdate({ ...repertoire, tree: updatedTree });
    } catch (err) {
      console.error('Arrow update failed', err);
    }
  }, [repertoire.id, repertoire.tree, onUpdate]);

  async function handleSetFace() {
    await setFaceFen(repertoire.id, currentFen);
    onUpdate({ ...repertoire, faceFen: currentFen });
  }

  function handleDuplicate() {
    onDuplicate?.(repertoire);
  }

  async function handleAnalyze(fen: string): Promise<AnalysisResult | null> {
    try {
      return await analyzePosition(fen, 18, 3);
    } catch (err) {
      console.error('Analysis failed', err);
      return null;
    }
  }

  async function handleSaveAnalysis(analysis: AnalysisCache) {
    try {
      await saveAnalysis(repertoire.id, currentFen, analysis);
      const updatedTree = structuredClone(repertoire.tree);
      const target = findNodeAndParent(updatedTree, currentFen);
      if (target) {
        target.node.analysis = analysis;
      }
      onUpdate({ ...repertoire, tree: updatedTree });
    } catch (err) {
      console.error('Save analysis failed', err);
    }
  }

  const turn = new Chess(currentFen).turn();

  return (
    <div className="flex h-full">
      <div className="flex flex-col items-center p-4 gap-4 bg-gray-800">
        <ChessBoardWrapper
          position={currentFen}
          boardOrientation={repertoire.color}
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
          customArrows={currentNode.arrows}
          onArrowsChange={handleArrowsChange}
          customArrowColor={arrowColor}
        />
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
          />
        </div>

        <AnalysisPanel
          key={`analysis-${currentFen}`}
          fen={currentFen}
          repertoireColor={repertoire.color}
          analysisCache={currentNode.analysis}
          onAnalyze={handleAnalyze}
          onPlayMove={handleMove}
          onSaveAnalysis={handleSaveAnalysis}
        />
        <CommentEditor
          key={currentFen}
          node={currentNode}
          onSave={handleCommentSave}
        />
      </div>

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
    </div>
  );
}
