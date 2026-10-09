import { Chessboard } from 'react-chessboard';
import type { Square } from 'react-chessboard';
import { useRef, useCallback, useEffect, useState } from 'react';

interface Arrow {
  from: string;
  to: string;
  color?: string;
}

interface Props {
  position: string;
  boardOrientation: 'white' | 'black';
  onPieceDrop: (sourceSquare: Square, targetSquare: Square, promotion: string) => void;
  arrows?: Arrow[];
  onArrowsChange?: (arrows: Arrow[]) => void;
  arrowColor?: string;
}

const BOARD_WIDTH = 400;
const SQ = BOARD_WIDTH / 8;

function sqToPixel(sq: string, orientation: 'white' | 'black'): { x: number; y: number } {
  const file = sq.charCodeAt(0) - 97;
  const rank = parseInt(sq[1]) - 1;
  const x = orientation === 'white' ? file * SQ + SQ / 2 : (7 - file) * SQ + SQ / 2;
  const y = orientation === 'white' ? (7 - rank) * SQ + SQ / 2 : rank * SQ + SQ / 2;
  return { x, y };
}

function buildArrow(a: { from: string; to: string; color: string; preview?: boolean }, orientation: 'white' | 'black') {
  const from = sqToPixel(a.from, orientation);
  const to = sqToPixel(a.to, orientation);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const d = Math.hypot(dx, dy);
  if (d < 1) return null;
  const ux = dx / d;
  const uy = dy / d;
  const tailInset = SQ * 0.15;
  const headLen = Math.min(SQ * 0.42, d * 0.6);
  const sx = from.x + ux * tailInset;
  const sy = from.y + uy * tailInset;
  const ex = from.x + ux * (d - headLen);
  const ey = from.y + uy * (d - headLen);
  const hw = headLen * 0.55;
  return (
    <g opacity={a.preview ? 0.55 : 1}>
      <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={a.color} strokeWidth={SQ * 0.12} strokeLinecap="round" />
      <polygon
        points={`${to.x},${to.y} ${ex + -uy * hw},${ey + ux * hw} ${ex - -uy * hw},${ey - ux * hw}`}
        fill={a.color}
      />
    </g>
  );
}

export default function ChessBoardWrapper({
  position,
  boardOrientation,
  onPieceDrop,
  arrows,
  onArrowsChange,
  arrowColor,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const arrowsRef = useRef<Arrow[]>(arrows ?? []);
  const orientationRef = useRef<'white' | 'black'>(boardOrientation);
  const onArrowsChangeRef = useRef(onArrowsChange);
  const draggingRef = useRef<{ from: string } | null>(null);
  const [preview, setPreview] = useState<{ from: string; to: string } | null>(null);

  arrowsRef.current = arrows ?? [];
  orientationRef.current = boardOrientation;
  onArrowsChangeRef.current = onArrowsChange;

  const squareFromPoint = (clientX: number, clientY: number): string | null => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;
    const col = Math.floor(x / (rect.width / 8));
    const row = Math.floor(y / (rect.height / 8));
    const orientation = orientationRef.current;
    const file = orientation === 'white' ? col : 7 - col;
    const rank = orientation === 'white' ? 7 - row : row;
    return String.fromCharCode(97 + file) + (rank + 1);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleDown = (e: MouseEvent) => {
      if (e.button !== 2) return;
      const square = squareFromPoint(e.clientX, e.clientY);
      if (!square) return;
      e.preventDefault();
      e.stopPropagation();
      draggingRef.current = { from: square };
      setPreview({ from: square, to: square });
    };

    const handleMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const square = squareFromPoint(e.clientX, e.clientY);
      if (!square) return;
      setPreview((p) => (p ? { ...p, to: square } : p));
    };

    const handleUp = (e: MouseEvent) => {
      if (e.button !== 2) return;
      const g = draggingRef.current;
      if (!g) return;
      draggingRef.current = null;
      setPreview(null);
      const endSquare = squareFromPoint(e.clientX, e.clientY);
      if (!endSquare) return;
      const current = arrowsRef.current;
      let next: Arrow[];
      if (endSquare === g.from) {
        next = [];
      } else if (current.some((a) => a.from === g.from && a.to === endSquare)) {
        next = current.filter((a) => !(a.from === g.from && a.to === endSquare));
      } else {
        next = [...current, { from: g.from, to: endSquare }];
      }
      onArrowsChangeRef.current?.(next);
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    container.addEventListener('mousedown', handleDown, true);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    container.addEventListener('contextmenu', handleContextMenu);

    return () => {
      container.removeEventListener('mousedown', handleDown, true);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      container.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  const onPieceDropRef = useRef(onPieceDrop);
  onPieceDropRef.current = onPieceDrop;

  const stableOnPieceDrop = useCallback((src: Square, dst: Square, piece: string) => {
    const promotion = piece[1] === 'P' && (dst[1] === '1' || dst[1] === '8') ? 'q' : piece[1] === 'p' && (dst[1] === '1' || dst[1] === '8') ? 'q' : undefined;
    onPieceDropRef.current(src, dst, promotion ?? '');
    return true;
  }, []);

  const previewColor = arrowColor || '#fbbf24';
  const stored = arrows ?? [];
  const previewArrow = preview ? { from: preview.from, to: preview.to, color: previewColor, preview: true } : null;

  return (
    <div ref={containerRef} style={{ width: BOARD_WIDTH, position: 'relative' }}>
      <Chessboard
        id={1}
        position={position}
        boardOrientation={boardOrientation}
        boardWidth={BOARD_WIDTH}
        areArrowsAllowed={false}
        onPieceDrop={stableOnPieceDrop}
        customBoardStyle={{
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
        customDarkSquareStyle={{ backgroundColor: '#4a5568' }}
        customLightSquareStyle={{ backgroundColor: '#e2e8f0' }}
      />
      <svg
        style={{ position: 'absolute', top: 0, left: 0, width: BOARD_WIDTH, height: BOARD_WIDTH, pointerEvents: 'none', zIndex: 20 }}
        viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_WIDTH}`}
      >
        {stored.map((a, i) => {
          const node = buildArrow({ from: a.from, to: a.to, color: a.color || '#fbbf24' }, boardOrientation);
          return node ? <g key={`${a.from}-${a.to}-${i}`}>{node}</g> : null;
        })}
        {previewArrow && (() => {
          const node = buildArrow(previewArrow, boardOrientation);
          return node ? <g key={`preview-${previewArrow.from}-${previewArrow.to}`}>{node}</g> : null;
        })()}
      </svg>
    </div>
  );
}