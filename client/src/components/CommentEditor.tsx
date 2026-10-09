import { useState, useEffect, useRef } from 'react';
import { MoveNode } from '../types';

interface Props {
  node: MoveNode;
  onSave: (fen: string, comment: string) => void | Promise<void>;
}

type Status = 'idle' | 'saving' | 'saved';

const DEBOUNCE_MS = 600;

export default function CommentEditor({ node, onSave }: Props) {
  const [text, setText] = useState(() => node.comment || '');
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<Status>('idle');

  const latestRef = useRef<{ fen: string; text: string; dirty: boolean }>({
    fen: node.fen,
    text: node.comment || '',
    dirty: false,
  });
  const timerRef = useRef<number | null>(null);
  const latestOnSaveRef = useRef(onSave);
  latestOnSaveRef.current = onSave;

  function clearTimer() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  const flush = () => {
    clearTimer();
    const snapshot = latestRef.current;
    if (!snapshot.dirty) return;
    snapshot.dirty = false;
    const { fen, text: savedText } = snapshot;
    setStatus('saving');
    Promise.resolve(latestOnSaveRef.current(fen, savedText)).then(
      () => {
        // Only mark saved if still on the same fen with no newer pending edits.
        if (latestRef.current.fen === fen && !latestRef.current.dirty) {
          setStatus('saved');
        }
      },
      () => {
        // Parent handler already surfaced the error toast.
        // Re-arm dirty so the next edit (or a manual retry) can save again.
        if (latestRef.current.fen === fen) {
          latestRef.current.dirty = true;
          setDirty(true);
          setStatus('idle');
        }
      },
    );
  };

  function handleChange(value: string) {
    setText(value);
    setDirty(true);
    latestRef.current = { fen: node.fen, text: value, dirty: true };
    clearTimer();
    timerRef.current = window.setTimeout(flush, DEBOUNCE_MS);
  }

  // On `node.fen` change OR unmount: flush pending edits, then reset for the new node.
  // Because <CommentEditor key={currentFen} /> remounts on navigation, the keyed
  // effect's cleanup also runs on unmount — that's how pending edits get saved
  // before the user navigates away.
  useEffect(() => {
    setText(node.comment || '');
    setDirty(false);
    setStatus('idle');
    return flush;
  }, [node.fen]);

  return (
    <div className="border-t border-gray-700 p-4 bg-gray-800">
      <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wide">
        Comment for this position
      </label>
      <textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full px-3 py-2 text-sm bg-gray-700 rounded-lg border border-gray-600 outline-none focus:border-indigo-500 resize-none"
        rows={3}
        placeholder="Add notes about this position..."
      />
      <div className="flex justify-end mt-2 text-xs h-4">
        {status === 'saving' && <span className="text-gray-400">Saving…</span>}
        {!dirty && status === 'saved' && (
          <span className="text-green-400 inline-flex items-center gap-1">
            <span aria-hidden="true">✓</span>
            <span>Saved</span>
          </span>
        )}
        {dirty && status !== 'saving' && (
          <span className="text-amber-400">Unsaved changes…</span>
        )}
      </div>
    </div>
  );
}