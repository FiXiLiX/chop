import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Repertoire, RepertoireSummary, MoveNode } from '../types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // already exists
  }
}

function filePath(id: string): string {
  return path.join(DATA_DIR, `${id}.json`);
}

export async function listRepertoires(): Promise<RepertoireSummary[]> {
  await ensureDataDir();
  const files = await fs.readdir(DATA_DIR);
  const repertoires: RepertoireSummary[] = [];
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    try {
      const data = await fs.readFile(path.join(DATA_DIR, file), 'utf-8');
      const rep: Repertoire = JSON.parse(data);
      repertoires.push({
        id: rep.id,
        name: rep.name,
        color: rep.color,
        eco: rep.eco,
        createdAt: rep.createdAt,
        updatedAt: rep.updatedAt,
        moveCount: countMoves(rep.tree),
        faceFen: rep.faceFen,
      });
    } catch {
      // skip corrupt files
    }
  }
  return repertoires.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getRepertoire(id: string): Promise<Repertoire | null> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(filePath(id), 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function createRepertoire(rep: Repertoire): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(filePath(rep.id), JSON.stringify(rep, null, 2), 'utf-8');
}

export async function updateRepertoire(rep: Repertoire): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(filePath(rep.id), JSON.stringify(rep, null, 2), 'utf-8');
}

export async function deleteRepertoire(id: string): Promise<boolean> {
  await ensureDataDir();
  try {
    await fs.unlink(filePath(id));
    return true;
  } catch {
    return false;
  }
}

function countMoves(node: MoveNode): number {
  let count = 0;
  for (const child of node.moves) {
    count += 1 + countMoves(child);
  }
  return count;
}
