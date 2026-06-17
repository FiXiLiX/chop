import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Chess } from 'chess.js';
import { Repertoire, MoveNode } from '../types.js';
import * as storage from '../services/storage.js';
import { pgnToTree, treeToPgn } from '../utils/pgn.js';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const repertoiresRouter = Router();

repertoiresRouter.get('/', async (_req: Request, res: Response) => {
  const list = await storage.listRepertoires();
  res.json(list);
});

repertoiresRouter.get('/:id', async (req: Request, res: Response) => {
  const rep = await storage.getRepertoire(req.params.id);
  if (!rep) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(rep);
});

repertoiresRouter.post('/', async (req: Request, res: Response) => {
  const { name, color, eco } = req.body;
  if (!name || !color) {
    res.status(400).json({ error: 'name and color are required' });
    return;
  }
  const now = new Date().toISOString();
  const rep: Repertoire = {
    id: uuidv4(),
    name,
    color,
    eco: eco || '',
    createdAt: now,
    updatedAt: now,
    tree: {
      san: '',
      uci: '',
      fen: STARTING_FEN,
      comment: '',
      arrows: [],
      tags: [],
      moves: [],
    },
  };
  await storage.createRepertoire(rep);
  res.status(201).json(rep);
});

repertoiresRouter.put('/:id', async (req: Request, res: Response) => {
  const existing = await storage.getRepertoire(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const { name, color, eco, faceFen } = req.body;
  if (name !== undefined) existing.name = name;
  if (color !== undefined) existing.color = color;
  if (eco !== undefined) existing.eco = eco;
  if (faceFen !== undefined) existing.faceFen = faceFen;
  existing.updatedAt = new Date().toISOString();
  await storage.updateRepertoire(existing);
  res.json(existing);
});

repertoiresRouter.delete('/:id', async (req: Request, res: Response) => {
  const deleted = await storage.deleteRepertoire(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json({ ok: true });
});

repertoiresRouter.patch('/:id/tree', async (req: Request, res: Response) => {
  const existing = await storage.getRepertoire(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const { tree } = req.body;
  if (!tree) {
    res.status(400).json({ error: 'tree is required' });
    return;
  }
  existing.tree = tree as MoveNode;
  existing.updatedAt = new Date().toISOString();
  await storage.updateRepertoire(existing);
  res.json(existing);
});

repertoiresRouter.post('/:id/move', async (req: Request, res: Response) => {
  const existing = await storage.getRepertoire(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const { parentFen, san } = req.body;
  if (!san || !parentFen) {
    res.status(400).json({ error: 'san and parentFen are required' });
    return;
  }
  const node = findNode(existing.tree, parentFen);
  if (!node) {
    res.status(404).json({ error: 'Parent position not found in tree' });
    return;
  }

  const chess = new Chess(parentFen);
  try {
    const move = chess.move(san);
    if (!move) {
      res.status(400).json({ error: 'Invalid move' });
      return;
    }
    const newNode: MoveNode = {
      san: move.san,
      uci: move.from + move.to + (move.promotion ?? ''),
      fen: chess.fen(),
      comment: '',
      arrows: [],
      tags: [],
      moves: [],
    };
    node.moves.push(newNode);
    existing.updatedAt = new Date().toISOString();
    await storage.updateRepertoire(existing);
    res.status(201).json(newNode);
  } catch {
    res.status(400).json({ error: 'Invalid move' });
  }
});

repertoiresRouter.delete('/:id/move', async (req: Request, res: Response) => {
  const existing = await storage.getRepertoire(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const { parentFen, fen } = req.body;
  if (!fen || !parentFen) {
    res.status(400).json({ error: 'fen and parentFen are required' });
    return;
  }
  const parent = findNode(existing.tree, parentFen);
  if (!parent) {
    res.status(404).json({ error: 'Parent position not found' });
    return;
  }
  parent.moves = parent.moves.filter((m) => m.fen !== fen);
  existing.updatedAt = new Date().toISOString();
  await storage.updateRepertoire(existing);
  res.json({ ok: true });
});

repertoiresRouter.patch('/:id/move', async (req: Request, res: Response) => {
  const existing = await storage.getRepertoire(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const { fen, comment, arrows, analysis, tags } = req.body;
  if (!fen) {
    res.status(400).json({ error: 'fen is required' });
    return;
  }
  const node = findNode(existing.tree, fen);
  if (!node) {
    res.status(404).json({ error: 'Position not found' });
    return;
  }
  if (comment !== undefined) {
    node.comment = comment;
  }
  if (arrows !== undefined) {
    node.arrows = arrows;
  }
  if (analysis !== undefined) {
    node.analysis = analysis;
  }
  if (tags !== undefined) {
    node.tags = tags;
  }
  existing.updatedAt = new Date().toISOString();
  await storage.updateRepertoire(existing);
  res.json(node);
});

repertoiresRouter.post('/:id/pgn', async (req: Request, res: Response) => {
  const { pgn } = req.body;
  if (!pgn) {
    res.status(400).json({ error: 'pgn is required' });
    return;
  }
  const result = pgnToTree(pgn);
  if (!result) {
    res.status(400).json({ error: 'Invalid PGN' });
    return;
  }
  const existing = await storage.getRepertoire(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  existing.tree = result.tree;
  existing.color = result.color;
  existing.updatedAt = new Date().toISOString();
  await storage.updateRepertoire(existing);
  res.json(existing);
});

repertoiresRouter.post('/:id/duplicate', async (req: Request, res: Response) => {
  const existing = await storage.getRepertoire(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const now = new Date().toISOString();
  const dup: Repertoire = {
    ...existing,
    id: uuidv4(),
    name: `${existing.name} (copy)`,
    createdAt: now,
    updatedAt: now,
    tree: JSON.parse(JSON.stringify(existing.tree)),
  };
  await storage.createRepertoire(dup);
  res.status(201).json(dup);
});

repertoiresRouter.get('/:id/pgn', async (req: Request, res: Response) => {
  const existing = await storage.getRepertoire(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const pgn = treeToPgn(existing.tree, existing.color);
  res.setHeader('Content-Type', 'text/plain');
  res.send(pgn);
});

function findNode(node: MoveNode, fen: string): MoveNode | null {
  if (node.fen === fen) return node;
  for (const child of node.moves) {
    const found = findNode(child, fen);
    if (found) return found;
  }
  return null;
}
