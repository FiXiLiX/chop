import { spawn, ChildProcess } from 'node:child_process';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Chess } from 'chess.js';
import { AnalysisCache } from '../types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STOCKFISH_PATH = path.resolve(__dirname, '../../stockfish');

interface AnalysisRequest {
  fen: string;
  depth: number;
  multiPv: number;
  resolve: (result: AnalysisResult) => void;
  reject: (err: Error) => void;
}

interface AnalysisLine {
  san: string;
  uci: string;
  score: number;
  depth: number;
  pv: string[];
}

interface AnalysisResult {
  fen: string;
  lines: AnalysisLine[];
  bestMove: string;
  depth: number;
  cached: boolean;
}

const memoryCache = new Map<string, AnalysisResult>();
let process: ChildProcess | null = null;
let reader: ReturnType<typeof createInterface> | null = null;
let queue: AnalysisRequest[] = [];
let busy = false;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
let shutdownRequested = false;
let currentHandler: ((line: string) => void) | null = null;

function spawnEngine(): Promise<void> {
  return new Promise((resolve, reject) => {
    process = spawn(STOCKFISH_PATH, [], { stdio: ['pipe', 'pipe', 'pipe'] });

    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) { resolved = true; reject(new Error('Stockfish uci timeout')); }
    }, 10000);

    reader = createInterface({ input: process.stdout! });
    reader.on('line', (line: string) => {
      const trimmed = line.trim();
      if (trimmed === 'uciok' && !resolved) {
        resolved = true;
        clearTimeout(timeout);
        send('setoption name Hash value 16');
        resolve();
      }
      currentHandler?.(trimmed);
    });

    process.on('error', (err) => {
      if (!resolved) { resolved = true; clearTimeout(timeout); reject(err); }
    });

    process.on('exit', (code) => {
      if (!resolved && code !== 0) { resolved = true; clearTimeout(timeout); reject(new Error(`Stockfish exit ${code}`)); }
      process = null; reader = null; currentHandler = null;
      if (!shutdownRequested) { busy = false; processQueue(); }
    });

    send('uci');
  });
}

function send(command: string) {
  process?.stdin?.write(command + '\n');
}

export async function shutdown() {
  shutdownRequested = true;
  if (idleTimer) clearTimeout(idleTimer);
  if (process) {
    send('quit');
    await new Promise((r) => setTimeout(r, 500));
    try { process.kill(); } catch { /* ignore */ }
    process = null; reader = null; currentHandler = null;
  }
}

async function ensureEngine(): Promise<void> {
  if (!process || !reader) await spawnEngine();
}

async function processQueue() {
  if (busy || queue.length === 0 || shutdownRequested) return;
  busy = true;
  const req = queue.shift()!;
  try {
    await ensureEngine();
    const result = await runAnalysis(req);
    req.resolve(result);
  } catch (err) {
    req.reject(err instanceof Error ? err : new Error(String(err)));
  } finally {
    busy = false;
    resetIdleTimer();
    processQueue();
  }
}

function runAnalysis(req: AnalysisRequest): Promise<AnalysisResult> {
  return new Promise((resolve, reject) => {
    const chess = new Chess(req.fen);
    const bestLines = new Map<number, { score: number; depth: number; pv: string[]; multipv: number }>();
    let bestMoveUci = '';
    let done = false;

    const timeout = setTimeout(() => {
      if (!done) send('stop');
    }, 30000);

    currentHandler = (trimmed: string) => {
      if (trimmed.startsWith('bestmove')) {
        done = true;
        clearTimeout(timeout);
        currentHandler = null;

        const parts = trimmed.split(/\s+/);
        bestMoveUci = parts[1] || '';

        const lines: AnalysisLine[] = [];
        const sorted = [...bestLines.values()].sort((a, b) => a.multipv - b.multipv);
        let maxDepth = 0;

        for (const bl of sorted) {
          if (bl.pv.length === 0) continue;
          const uciMove = bl.pv[0];
          try {
            const move = chess.move(uciMove);
            if (move) {
              lines.push({ san: move.san, uci: uciMove, score: bl.score, depth: bl.depth, pv: bl.pv.slice(1) });
            }
          } catch { /* skip invalid */ }
          if (bl.depth > maxDepth) maxDepth = bl.depth;
        }

        resolve({ fen: req.fen, lines, bestMove: bestMoveUci, depth: maxDepth, cached: false });
        return;
      }

      if (!trimmed.startsWith('info')) return;
      const parts = trimmed.split(/\s+/);
      let multipv = 1, depth = 0, score: number | null = null;
      let pv: string[] = [];

      for (let i = 1; i < parts.length; i++) {
        if (parts[i] === 'multipv') multipv = parseInt(parts[++i], 10);
        else if (parts[i] === 'depth') depth = parseInt(parts[++i], 10);
        else if (parts[i] === 'score') {
          const next = parts[++i];
          if (next === 'cp') score = parseInt(parts[++i], 10);
          else if (next === 'mate') {
            const mateVal = parseInt(parts[++i], 10);
            score = mateVal > 0 ? 100000 - mateVal : -100000 - mateVal;
          }
        } else if (parts[i] === 'pv') {
          pv = parts.slice(i + 1);
          break;
        }
      }

      if (score !== null && depth > 0 && pv.length > 0) {
        const existing = bestLines.get(multipv);
        if (!existing || depth >= existing.depth) {
          bestLines.set(multipv, { score, depth, pv, multipv });
        }
      }
    };

    send('ucinewgame');
    send(`setoption name MultiPV value ${req.multiPv}`);
    send(`position fen ${req.fen}`);
    send(`go depth ${req.depth}`);
  });
}

function resetIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (!busy && !shutdownRequested) { send('quit'); process = null; reader = null; currentHandler = null; }
  }, 300000);
}

export function analyze(fen: string, depth: number = 18, multiPv: number = 3): Promise<AnalysisResult> {
  const cached = memoryCache.get(fen);
  if (cached && cached.depth >= depth) return Promise.resolve({ ...cached, cached: true });

  return new Promise((resolve, reject) => {
    queue.push({ fen, depth, multiPv, resolve, reject });
    processQueue();
  });
}

export function cacheResult(fen: string, result: AnalysisResult): void {
  memoryCache.set(fen, result);
}

export function getCachedResult(fen: string): AnalysisResult | undefined {
  return memoryCache.get(fen);
}
