import { MoveNode } from '../types';

/**
 * Pure tree helpers — no React. All functions traverse the tree by FEN match.
 */

export function findNodeAndParent(
  root: MoveNode,
  fen: string,
  parent?: MoveNode,
): { node: MoveNode; parent?: MoveNode } | null {
  if (root.fen === fen) return { node: root, parent };
  for (const child of root.moves) {
    const found = findNodeAndParent(child, fen, root);
    if (found) return found;
  }
  return null;
}

export function getPathToFen(root: MoveNode, fen: string): MoveNode[] {
  if (root.fen === fen) return [root];
  for (const child of root.moves) {
    const path = getPathToFen(child, fen);
    if (path.length > 0) return [root, ...path];
  }
  return [];
}

export function getNextFen(root: MoveNode, fen: string): string | null {
  const found = findNodeAndParent(root, fen);
  if (!found) return null;
  const firstChild = found.node.moves[0];
  return firstChild ? firstChild.fen : null;
}

export function getPrevFen(root: MoveNode, fen: string): string | null {
  const found = findNodeAndParent(root, fen);
  if (!found) return null;
  return found.parent ? found.parent.fen : null;
}

export function getSiblingFen(root: MoveNode, fen: string, dir: -1 | 1): string | null {
  const found = findNodeAndParent(root, fen);
  if (!found || !found.parent) return null;
  const siblings = found.parent.moves;
  const idx = siblings.findIndex((m) => m.fen === fen);
  if (idx === -1) return null;
  const next = siblings[idx + dir];
  return next ? next.fen : null;
}

export function getDeepestMainLineFen(root: MoveNode): string {
  let cur = root;
  while (cur.moves.length > 0) {
    cur = cur.moves[0];
  }
  return cur.fen;
}

export function fenExists(root: MoveNode, fen: string): boolean {
  return findNodeAndParent(root, fen) !== null;
}