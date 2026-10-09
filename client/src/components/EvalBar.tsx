import type { AnalysisResult } from '../types';

interface Props {
  result: AnalysisResult | null;
  analyzing: boolean;
  orientation: 'white' | 'black';
  height?: number;
}

function computeWhiteCp(result: AnalysisResult | null): number {
  if (!result || result.lines.length === 0) return 0;
  const raw = result.lines[0].score;
  const sideToMove = result.fen.split(' ')[1];
  return sideToMove === 'w' ? raw : -raw;
}

function formatCp(whiteCp: number): string {
  if (Math.abs(whiteCp) > 90000) {
    const mateIn = 100000 - Math.abs(whiteCp);
    return `#${whiteCp > 0 ? mateIn : -mateIn}`;
  }
  return (whiteCp / 100).toFixed(1);
}

export default function EvalBar({ result, analyzing, orientation, height = 400 }: Props) {
  const whiteCp = computeWhiteCp(result);
  const rawFraction = 1 / (1 + Math.exp(-whiteCp / 300));
  const fraction = Math.min(0.98, Math.max(0.02, rawFraction));
  const whitePct = fraction * 100;
  const blackPct = 100 - whitePct;

  const whiteOnBottom = orientation === 'white';

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`relative w-4 rounded border border-gray-700 overflow-hidden ${analyzing ? 'animate-pulse opacity-80' : ''}`}
        style={{ height: `${height}px` }}
      >
        {whiteOnBottom ? (
          <>
            <div
              className="absolute inset-x-0 top-0 bg-[#4a5568]"
              style={{ height: `${blackPct}%` }}
            />
            <div
              className="absolute inset-x-0 bottom-0 bg-[#e2e8f0]"
              style={{ height: `${whitePct}%` }}
            />
          </>
        ) : (
          <>
            <div
              className="absolute inset-x-0 top-0 bg-[#e2e8f0]"
              style={{ height: `${whitePct}%` }}
            />
            <div
              className="absolute inset-x-0 bottom-0 bg-[#4a5568]"
              style={{ height: `${blackPct}%` }}
            />
          </>
        )}
      </div>
      <span className="text-[10px] font-mono tabular-nums text-gray-400">
        {result
          ? `${whiteCp > 0 ? '+' : ''}${formatCp(whiteCp)}`
          : '—'}
      </span>
    </div>
  );
}