import { useEffect, useRef, useState } from 'react';
import type { Square } from 'react-chessboard';
import { Chess } from 'chess.js';
import ChessBoardWrapper from './ChessBoardWrapper';
import { Repertoire } from '../types';
import { useToast } from '../hooks/useToast';

type Feedback = { kind: 'correct' | 'incorrect' | 'info'; message: string } | null;

export default function PracticePanel({ repertoire, onExit }: { repertoire: Repertoire; onExit: () => void }) {
  const toast = useToast();
  const [currentFen, setCurrentFen] = useState<string>(repertoire.tree.fen);
  const [currentNode, setCurrentNode] = useState(repertoire.tree);
  const [plies, setPlies] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [hint, setHint] = useState<string | null>(null);
  const lineCompleteNotifiedRef = useRef(false);

  const isEmpty = repertoire.tree.moves.length === 0;
  const isLineComplete = !isEmpty && currentNode.moves.length === 0;
  const userTurn =
    (new Chess(currentFen).turn() === 'w') === (repertoire.color === 'white');

  useEffect(() => {
    if (userTurn) return;
    if (currentNode.moves.length === 0) return;
    const children = currentNode.moves;
    const timer = setTimeout(() => {
      const idx = Math.floor(Math.random() * children.length);
      const child = children[idx];
      setCurrentFen(child.fen);
      setCurrentNode(child);
      setHint(null);
    }, 600);
    return () => clearTimeout(timer);
  }, [currentNode, currentFen, repertoire.color, userTurn]);

  useEffect(() => {
    if (isLineComplete && !lineCompleteNotifiedRef.current) {
      lineCompleteNotifiedRef.current = true;
      toast.info('Line complete');
    } else if (!isLineComplete) {
      lineCompleteNotifiedRef.current = false;
    }
  }, [isLineComplete, toast]);

  const handleUserMove = (san: string) => {
    const match = currentNode.moves.find((m) => m.san === san);
    if (match) {
      setCurrentFen(match.fen);
      setCurrentNode(match);
      setPlies((p) => p + 1);
      setFeedback({ kind: 'correct', message: 'Correct' });
      setHint(null);
    } else {
      setMistakes((m) => m + 1);
      setFeedback({
        kind: 'incorrect',
        message: 'Not in your repertoire — try again or use Hint',
      });
    }
  };

  const onPieceDrop = (src: Square, dst: Square, promotion: string) => {
    if (!userTurn || isLineComplete) return;
    const game = new Chess(currentFen);
    try {
      const result = game.move({ from: src, to: dst, promotion });
      if (result) handleUserMove(result.san);
    } catch {}
  };

  const restart = () => {
    setCurrentFen(repertoire.tree.fen);
    setCurrentNode(repertoire.tree);
    setPlies(0);
    setMistakes(0);
    setFeedback(null);
    setHint(null);
  };

  const showHint = () => {
    if (currentNode.moves.length === 0) return;
    setHint(currentNode.moves[0].san);
  };

  if (isEmpty) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-gray-100 flex flex-col gap-3">
        <p>This repertoire has no moves to practice yet.</p>
        <div>
          <button
            onClick={onExit}
            className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium"
          >
            Exit
          </button>
        </div>
      </div>
    );
  }

  const prompt = isLineComplete
    ? 'Line complete'
    : userTurn
      ? `Your move (${repertoire.color === 'white' ? 'White' : 'Black'})`
      : 'Waiting for opponent…';

  const feedbackClass = feedback
    ? feedback.kind === 'correct'
      ? 'bg-green-900/60 border-green-700 text-green-100'
      : feedback.kind === 'incorrect'
        ? 'bg-red-900/60 border-red-700 text-red-100'
        : 'bg-indigo-900/60 border-indigo-700 text-indigo-100'
    : '';

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-gray-100 flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold">Practice: {repertoire.name}</h2>
        <div className="flex gap-2">
          <button
            onClick={restart}
            className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-100 text-sm"
          >
            Restart
          </button>
          <button
            onClick={showHint}
            disabled={isLineComplete || currentNode.moves.length === 0}
            className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-100 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Hint
          </button>
          <button
            onClick={onExit}
            className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-100 text-sm"
          >
            Exit
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div
          className="flex-shrink-0 mx-auto md:mx-0 w-full md:w-auto"
          style={{ maxWidth: 400 }}
        >
          <ChessBoardWrapper
            position={currentFen}
            boardOrientation={repertoire.color}
            onPieceDrop={onPieceDrop}
          />
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-3">
          <div className="text-sm font-medium text-gray-200">{prompt}</div>
          <div className="text-xs text-gray-400 flex gap-3 font-mono">
            <span>Plies: {plies}</span>
            <span>Mistakes: {mistakes}</span>
          </div>
          {feedback && (
            <div
              className={`rounded border px-3 py-2 text-sm ${feedbackClass}`}
            >
              {feedback.message}
            </div>
          )}
          {hint && (
            <div className="rounded border border-indigo-700 bg-indigo-900/40 px-3 py-2 text-sm text-indigo-100">
              Hint: <span className="font-mono">{hint}</span>
            </div>
          )}
          {currentNode.comment && (
            <div className="rounded border border-gray-600 bg-gray-700/60 px-3 py-2 text-sm text-gray-200">
              {currentNode.comment}
            </div>
          )}
          {currentNode.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {currentNode.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300 border border-gray-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          {isLineComplete && (
            <div className="rounded border border-gray-600 bg-gray-700/60 p-3 flex flex-col gap-2">
              <div className="text-sm font-semibold text-gray-100">
                Line complete
              </div>
              <div className="text-xs text-gray-400 font-mono">
                Plies: {plies} · Mistakes: {mistakes}
              </div>
              <button
                onClick={restart}
                className="self-start px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium"
              >
                Practice again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}