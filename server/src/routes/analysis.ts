import { Router, Request, Response } from 'express';
import { Chess } from 'chess.js';
import { analyze, cacheResult, getCachedResult, shutdown } from '../services/analysis.js';
import * as storage from '../services/storage.js';
import { MoveNode } from '../types.js';

export const analysisRouter = Router();

analysisRouter.post('/', async (req: Request, res: Response) => {
  const { fen, depth, multiPv } = req.body;
  if (!fen) {
    res.status(400).json({ error: 'fen is required' });
    return;
  }

  try {
    new Chess(fen);
  } catch {
    res.status(400).json({ error: 'Invalid FEN' });
    return;
  }

  try {
    const result = await analyze(fen, depth ?? 18, multiPv ?? 3);
    cacheResult(fen, result);
    res.json(result);
  } catch (err) {
    console.error('Analysis failed:', err);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

analysisRouter.get('/cache/:fen', (req: Request, res: Response) => {
  const cached = getCachedResult(req.params.fen);
  if (cached) {
    res.json(cached);
  } else {
    res.status(404).json({ error: 'Not cached' });
  }
});

analysisRouter.post('/shutdown', async (_req: Request, res: Response) => {
  await shutdown();
  res.json({ ok: true });
});
