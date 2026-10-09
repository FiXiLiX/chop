import { useCallback, useEffect, useRef, useState } from 'react';
import { analyzePosition } from '../api';
import type { AnalysisCache, AnalysisResult } from '../types';

const memory = new Map<string, AnalysisResult>();

export interface UseAnalysisOptions {
  fen: string;
  enabled?: boolean;
  cache?: AnalysisCache | null;
  depth?: number;
  multiPv?: number;
  debounceMs?: number;
  onResult?: (fen: string, result: AnalysisResult) => void;
}

export interface UseAnalysisReturn {
  result: AnalysisResult | null;
  analyzing: boolean;
  stale: boolean;
  request: () => void;
}

export function useAnalysis(options: UseAnalysisOptions): UseAnalysisReturn {
  const {
    fen,
    enabled = true,
    cache = null,
    depth = 16,
    multiPv = 3,
    debounceMs = 600,
    onResult,
  } = options;

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const fenRef = useRef(fen);
  fenRef.current = fen;
  const depthRef = useRef(depth);
  depthRef.current = depth;
  const multiPvRef = useRef(multiPv);
  multiPvRef.current = multiPv;
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const latestRef = useRef<string>(fen);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const runAnalysis = useCallback((targetFen: string) => {
    latestRef.current = targetFen;
    setAnalyzing(true);
    analyzePosition(targetFen, depthRef.current, multiPvRef.current)
      .then((res) => {
        if (latestRef.current !== targetFen) return;
        memory.set(targetFen, res);
        setResult(res);
        setAnalyzing(false);
        if (!res.cached && onResultRef.current) {
          onResultRef.current(targetFen, res);
        }
      })
      .catch(() => {
        if (latestRef.current !== targetFen) return;
        setAnalyzing(false);
      });
  }, []);

  useEffect(() => {
    cancelTimer();
    if (!fen) {
      latestRef.current = fen;
      setResult(null);
      return;
    }
    latestRef.current = fen;

    const hit = memory.get(fen);
    if (hit && hit.depth >= depthRef.current) {
      setResult(hit);
      setAnalyzing(false);
      return;
    }

    if (cache && cache.depth >= depthRef.current) {
      const line = {
        san: '',
        uci: cache.bestMove,
        score: cache.score,
        depth: cache.depth,
        pv: cache.pv,
      };
      setResult({
        fen,
        lines: [line],
        bestMove: cache.bestMove,
        depth: cache.depth,
        cached: true,
      });
      setAnalyzing(false);
      return;
    }

    setResult(null);
    setAnalyzing(false);

    if (!enabled) return;

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      runAnalysis(fen);
    }, debounceMs);
  }, [fen, enabled]);

  useEffect(() => () => cancelTimer(), [cancelTimer]);

  const request = useCallback(() => {
    cancelTimer();
    runAnalysis(fenRef.current);
  }, [cancelTimer, runAnalysis]);

  const stale = result === null || result.fen !== fen;
  return { result, analyzing, stale, request };
}