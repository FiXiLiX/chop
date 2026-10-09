import type { AnalysisResult } from '../types';

interface Props {
  fen: string;
  repertoireColor: 'white' | 'black';
  result: AnalysisResult | null;
  analyzing: boolean;
  stale: boolean;
  onRequest: () => void;
  onPlayMove: (san: string) => void;
}

export default function AnalysisPanel({
  fen,
  repertoireColor,
  result,
  analyzing,
  stale,
  onRequest,
  onPlayMove,
}: Props) {
  function scoreFromRepertoirePerspective(rawScore: number, currentFen: string): number {
    const turn = currentFen.split(' ')[1];
    if (turn === 'w' && repertoireColor === 'black') return -rawScore;
    if (turn === 'b' && repertoireColor === 'white') return -rawScore;
    return rawScore;
  }

  function formatScore(score: number): string {
    if (Math.abs(score) > 90000) {
      const mateIn = 100000 - Math.abs(score);
      return `#${score > 0 ? mateIn : -mateIn}`;
    }
    return (score / 100).toFixed(1);
  }

  return (
    <div className="border-t border-gray-700 p-3 bg-gray-800/50">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-gray-300 uppercase tracking-wide">Analysis</span>
        <button
          type="button"
          onClick={onRequest}
          disabled={analyzing}
          className="px-2 py-0.5 text-xs rounded bg-indigo-600/80 hover:bg-indigo-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Analyze
        </button>
        {analyzing && (
          <span className="flex items-center gap-1 text-xs text-indigo-400">
            <span className="inline-block w-3 h-3 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
            Analyzing...
          </span>
        )}
        {result?.cached && !analyzing && (
          <span className="text-xs text-gray-500">(cached)</span>
        )}
        {stale && !analyzing && (
          <span className="text-xs text-amber-400">stale</span>
        )}
      </div>

      {result && !analyzing && result.lines.length > 0 && (
        <div className="space-y-0.5">
          {result.lines.map((line, i) => {
            const score = scoreFromRepertoirePerspective(line.score, fen);
            return (
              <div
                key={i}
                className="grid grid-cols-[1fr_auto_auto] gap-2 text-xs px-2 py-1 rounded hover:bg-gray-700/50 cursor-pointer transition-colors"
                onClick={() => line.san && onPlayMove(line.san)}
              >
                <span className="font-mono text-gray-200">
                  {line.san || line.uci}
                  {line.pv.length > 0 && (
                    <span className="text-gray-500 ml-1">
                      {line.pv.slice(0, 3).join(' ')}
                      {line.pv.length > 3 ? '…' : ''}
                    </span>
                  )}
                </span>
                <span
                  className={`font-mono tabular-nums ${score > 0 ? 'text-green-400' : score < -100 ? 'text-red-400' : 'text-gray-300'}`}
                >
                  {score > 0 ? '+' : ''}{formatScore(score)}
                </span>
                <span className="font-mono text-gray-500">{line.depth}</span>
              </div>
            );
          })}
        </div>
      )}

      {!result && !analyzing && (
        <div className="text-xs text-gray-500 py-1">No analysis available</div>
      )}
    </div>
  );
}