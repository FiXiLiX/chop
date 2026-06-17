export interface Arrow {
  from: string;
  to: string;
  color?: string;
}

export interface AnalysisCache {
  depth: number;
  score: number;
  bestMove: string;
  pv: string[];
  timestamp: string;
}

export interface AnalysisLine {
  san: string;
  uci: string;
  score: number;
  depth: number;
  pv: string[];
}

export interface AnalysisResult {
  fen: string;
  lines: AnalysisLine[];
  bestMove: string;
  depth: number;
  cached: boolean;
}

export interface MoveNode {
  san: string;
  uci: string;
  fen: string;
  comment: string;
  arrows: Arrow[];
  tags: string[];
  analysis?: AnalysisCache;
  moves: MoveNode[];
}

export interface Repertoire {
  id: string;
  name: string;
  color: 'white' | 'black';
  eco: string;
  createdAt: string;
  updatedAt: string;
  faceFen?: string;
  tree: MoveNode;
}

export interface RepertoireSummary {
  id: string;
  name: string;
  color: 'white' | 'black';
  eco: string;
  createdAt: string;
  updatedAt: string;
  moveCount: number;
  faceFen?: string;
}
