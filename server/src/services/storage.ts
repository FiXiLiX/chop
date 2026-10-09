import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Repertoire, RepertoireSummary, MoveNode } from '../types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');

type LegacyRepertoire = Omit<Repertoire, 'trees'> & {
  trees?: MoveNode[];
  tree?: MoveNode;
};

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

function migrate(rep: LegacyRepertoire): Repertoire {
  if (Array.isArray(rep.trees) && rep.trees.length > 0) {
    return rep as Repertoire;
  }
  if (rep.tree) {
    rep.trees = [rep.tree];
    delete (rep as { tree?: MoveNode }).tree;
    return rep as Repertoire;
  }
  rep.trees = [];
  return rep as Repertoire;
}

export async function listRepertoires(): Promise<RepertoireSummary[]> {
  await ensureDataDir();
  const files = await fs.readdir(DATA_DIR);
  const repertoires: RepertoireSummary[] = [];
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    try {
      const data = await fs.readFile(path.join(DATA_DIR, file), 'utf-8');
      const rep = migrate(JSON.parse(data) as LegacyRepertoire);
      repertoires.push({
        id: rep.id,
        name: rep.name,
        color: rep.color,
        eco: rep.eco,
        createdAt: rep.createdAt,
        updatedAt: rep.updatedAt,
        moveCount: rep.trees.reduce((sum, tree) => sum + countMoves(tree), 0),
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
    return migrate(JSON.parse(data) as LegacyRepertoire);
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
