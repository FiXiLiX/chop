import { useState, useEffect } from 'react';
import { MoveNode } from '../types';

interface Props {
  node: MoveNode;
  onSave: (fen: string, comment: string) => void;
}

export default function CommentEditor({ node, onSave }: Props) {
  const [text, setText] = useState(node.comment || '');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setText(node.comment || '');
    setDirty(false);
  }, [node.fen]);

  function handleSave() {
    onSave(node.fen, text);
    setDirty(false);
  }

  return (
    <div className="border-t border-gray-700 p-4 bg-gray-800">
      <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wide">
        Comment for this position
      </label>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setDirty(true);
        }}
        className="w-full px-3 py-2 text-sm bg-gray-700 rounded-lg border border-gray-600 outline-none focus:border-indigo-500 resize-none"
        rows={3}
        placeholder="Add notes about this position..."
      />
      {dirty && (
        <div className="flex justify-end mt-2">
          <button
            onClick={handleSave}
            className="px-4 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition-colors"
          >
            Save Comment
          </button>
        </div>
      )}
    </div>
  );
}
