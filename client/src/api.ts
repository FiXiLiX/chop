import { Repertoire, RepertoireSummary, Arrow } from './types';

const BASE = '/api/repertoires';

export async function fetchList(): Promise<RepertoireSummary[]> {
  const res = await fetch(BASE);
  return res.json();
}

export async function fetchOne(id: string): Promise<Repertoire> {
  const res = await fetch(`${BASE}/${id}`);
  return res.json();
}

export async function createRepertoire(name: string, color: 'white' | 'black', eco: string): Promise<Repertoire> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, color, eco }),
  });
  return res.json();
}

export async function updateRepertoireMeta(id: string, data: Partial<{ name: string; color: string; eco: string }>): Promise<Repertoire> {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteRepertoire(id: string): Promise<void> {
  await fetch(`${BASE}/${id}`, { method: 'DELETE' });
}

export async function addMove(id: string, parentFen: string, san: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parentFen, san }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to add move');
  }
}

export async function deleteMove(id: string, parentFen: string, fen: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}/move`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parentFen, fen }),
  });
  if (!res.ok) throw new Error('Failed to delete move');
}

export async function updateComment(id: string, fen: string, comment: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}/move`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fen, comment }),
  });
  if (!res.ok) throw new Error('Failed to update comment');
}

export async function setFaceFen(id: string, faceFen: string): Promise<void> {
  await fetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ faceFen }),
  });
}

export async function updateTags(id: string, fen: string, tags: string[]): Promise<void> {
  const res = await fetch(`${BASE}/${id}/move`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fen, tags }),
  });
  if (!res.ok) throw new Error('Failed to update tags');
}

export async function updateArrows(id: string, fen: string, arrows: { from: string; to: string; color?: string }[]): Promise<void> {
  const res = await fetch(`${BASE}/${id}/move`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fen, arrows }),
  });
  if (!res.ok) throw new Error('Failed to update arrows');
}

export async function duplicateRepertoire(id: string): Promise<Repertoire> {
  const res = await fetch(`${BASE}/${id}/duplicate`, { method: 'POST' });
  return res.json();
}

export async function analyzePosition(fen: string, depth?: number, multiPv?: number): Promise<{ fen: string; lines: { san: string; uci: string; score: number; depth: number; pv: string[] }[]; bestMove: string; depth: number; cached: boolean }> {
  const res = await fetch('/api/analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fen, depth, multiPv }),
  });
  if (!res.ok) throw new Error('Analysis failed');
  return res.json();
}

export async function saveAnalysis(id: string, fen: string, analysis: { depth: number; score: number; bestMove: string; pv: string[]; timestamp: string }): Promise<void> {
  const res = await fetch(`${BASE}/${id}/move`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fen, analysis }),
  });
  if (!res.ok) throw new Error('Failed to save analysis');
}

export async function importPgn(id: string, pgn: string): Promise<Repertoire> {
  const res = await fetch(`${BASE}/${id}/pgn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pgn }),
  });
  if (!res.ok) throw new Error('Invalid PGN');
  return res.json();
}

export async function exportPgn(id: string): Promise<string> {
  const res = await fetch(`${BASE}/${id}/pgn`);
  return res.text();
}
