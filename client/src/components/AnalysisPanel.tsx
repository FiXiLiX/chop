import { useState, useEffect, useRef } from 'react';
import { AnalysisResult, AnalysisCache } from '../types';

interface Props {
  fen: string;
  repertoireColor: 'white' | 'black';
  analysisCache?: AnalysisCache | null;
  onAnalyze: (fen: string) => Promise<AnalysisResult | null>;
  onPlayMove: (san: string) => void;
  onSaveAnalysis: (analysis: AnalysisCache) => void;
}

export default function AnalysisPanel({ fen, repertoireColor, analysisCache, onAnalyze, onPlayMove, onSaveAnalysis }: Props) {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [depth] = useState(16);
  const fenRef = useRef(fen);
  fenRef.current = fen;

  const savedAnalysisRef = useRef(false);

  useEffect(() => {
    savedAnalysisRef.current = false;
    if (!fen) return;

    if (analysisCache && analysisCache.depth >= depth) {
      const lines = [{
        san: '',
        uci: analysisCache.bestMove,
        score: analysisCache.score,
        depth: analysisCache.depth,
        pv: analysisCache.pv,
      }];
      setResult({
        fen,
        lines,
        bestMove: analysisCache.bestMove,
        depth: analysisCache.depth,
        cached: true,
      });
      setAnalyzing(false);
      return;
    }

    setResult(null);
    setAnalyzing(true);

    let cancelled = false;

    onAnalyze(fen).then((res) => {
      if (cancelled || fenRef.current !== fen) return;
      if (res) {
        setResult(res);
        if (!res.cached && res.lines.length > 0 && !savedAnalysisRef.current) {
          savedAnalysisRef.current = true;
          const best = res.lines[0];
          onSaveAnalysis({
            depth: best.depth,
            score: best.score,
            bestMove: best.uci,
            pv: best.pv,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }).catch(() => {
      if (!cancelled) setAnalyzing(false);
    }).finally(() => {
      if (!cancelled) setAnalyzing(false);
    });

    return () => { cancelled = true; };
  }, [fen]);

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
        {analyzing && (
          <span className="flex items-center gap-1 text-xs text-indigo-400">
            <span className="inline-block w-3 h-3 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
            Analyzing...
          </span>
        )}
        {result?.cached && !analyzing && (
          <span className="text-xs text-gray-500">(cached)</span>
        )}
      </div>

      {result && !analyzing && result.lines.length > 0 && (
        <div className="space-y-0.5">
          {result.lines.map((line, i) => (
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
              <span className={`font-mono tabular-nums ${scoreFromRepertoirePerspective(line.score, fen) > 0 ? 'text-green-400' : scoreFromRepertoirePerspective(line.score, fen) < -100 ? 'text-red-400' : 'text-gray-300'}`}>
                {scoreFromRepertoirePerspective(line.score, fen) > 0 ? '+' : ''}{formatScore(scoreFromRepertoirePerspective(line.score, fen))}
              </span>
              <span className="font-mono text-gray-500">{line.depth}</span>
            </div>
          ))}
        </div>
      )}

      {!result && !analyzing && (
        <div className="text-xs text-gray-500 py-1">No analysis available</div>
      )}
    </div>
  );
}
