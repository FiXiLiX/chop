import { Chess } from 'chess.js';
import { MoveNode } from '../types.js';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export function treeToPgn(root: MoveNode, color: 'white' | 'black'): string {
  const lines: string[] = [];
  lines.push('[Event "Repertoire"]');
  lines.push(`[Site "${color === 'white' ? 'White' : 'Black'} Repertoire"]`);
  lines.push('[Date "????.??.??"]');
  lines.push('[Round "?"]');
  lines.push('[White "?"]');
  lines.push('[Black "?"]');
  lines.push('[Result "*"]');
  if (root.comment) {
    lines.push(`[Opening "${root.comment}"]`);
  }
  lines.push('');

  const moves = flattenMainLine(root);
  const chess = new Chess();
  let ply = 0;
  const moveText: string[] = [];
  for (const san of moves) {
    if (ply % 2 === 0) {
      moveText.push(`${Math.floor(ply / 2) + 1}.`);
    }
    moveText.push(san);
    ply++;
  }
  lines.push(moveText.join(' '));
  return lines.join('\n');
}

function flattenMainLine(node: MoveNode): string[] {
  if (!node.moves || node.moves.length === 0) {
    return [];
  }
  const [first, ...rest] = node.moves;
  const result = [first.san, ...flattenMainLine(first)];
  return result;
}

export function pgnToTree(pgn: string): { tree: MoveNode; color: 'white' | 'black' } | null {
  try {
    const chess = new Chess();
    const lines = pgn.split('\n');
    let color: 'white' | 'black' = 'white';
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('[Site "') && trimmed.includes('Black')) {
        color = 'black';
      }
    }
    const moves = extractMoves(pgn);
    if (moves.length === 0) return null;

    const root: MoveNode = {
      san: '',
      uci: '',
      fen: STARTING_FEN,
      comment: '',
      arrows: [],
      tags: [],
      moves: [],
    };

    let current = root;
    for (const san of moves) {
      const result = buildNode(chess, san);
      if (!result) break;
      current.moves.push(result.node);
      current = result.node;
    }

    if (root.moves.length === 0) return null;
    return { tree: root, color };
  } catch {
    return null;
  }
}

function buildNode(chess: Chess, san: string): { node: MoveNode } | null {
  try {
    const move = chess.move(san);
    if (!move) return null;
    return {
      node: {
        san: move.san,
        uci: move.from + move.to + (move.promotion ?? ''),
        fen: chess.fen(),
        comment: '',
        arrows: [],
        tags: [],
        moves: [],
      },
    };
  } catch {
    return null;
  }
}

function extractMoves(pgn: string): string[] {
  const cleaned = pgn
    .replace(/\{[^}]*\}/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\$[0-9]+/g, '')
    .replace(/\d+\.+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const result: string[] = [];
  for (const token of cleaned.split(/\s+/)) {
    const san = token.replace(/[?!]+$/, '');
    if (san.length > 0 && /^[KQRBNOa-h]/.test(san)) {
      result.push(san);
    }
  }
  return result;
}
