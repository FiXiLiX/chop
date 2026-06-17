import { Chessboard } from 'react-chessboard';
import type { Square } from 'react-chessboard';
import { useRef, useCallback } from 'react';

interface Arrow {
  from: string;
  to: string;
  color?: string;
}

interface Props {
  position: string;
  boardOrientation: 'white' | 'black';
  onPieceDrop: (sourceSquare: Square, targetSquare: Square, promotion: string) => void;
  customArrows?: Arrow[];
  onArrowsChange?: (arrows: Arrow[]) => void;
  customArrowColor?: string;
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

function ArrowOverlay({ arrows, orientation }: { arrows: Arrow[]; orientation: 'white' | 'black' }) {
  return (
    <svg
      style={{ position: 'absolute', top: 0, left: 0, width: BOARD_WIDTH, height: BOARD_WIDTH, pointerEvents: 'none' }}
      viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_WIDTH}`}
    >
      {arrows.map((a, i) => {
        const from = sqToPixel(a.from, orientation);
        const to = sqToPixel(a.to, orientation);
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) return null;
        const ux = dx / len;
        const uy = dy / len;
        const margin = 28;
        const sx = from.x + ux * margin;
        const sy = from.y + uy * margin;
        const ex = to.x - ux * margin;
        const ey = to.y - uy * margin;
        const hl = 10;
        const ha = Math.PI / 6;
        const color = a.color || '#fbbf24';
        return (
          <g key={i}>
            <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={color} strokeWidth={3} strokeLinecap="round" />
            <polygon
              points={`${ex},${ey} ${ex - hl * (ux * Math.cos(ha) - uy * Math.sin(ha))},${ey - hl * (uy * Math.cos(ha) + ux * Math.sin(ha))} ${ex - hl * (ux * Math.cos(ha) + uy * Math.sin(ha))},${ey - hl * (uy * Math.cos(ha) - ux * Math.sin(ha))}`}
              fill={color}
            />
          </g>
        );
      })}
    </svg>
  );
}

export default function ChessBoardWrapper({ position, boardOrientation, onPieceDrop, customArrows, onArrowsChange, customArrowColor }: Props) {
  const onPieceDropRef = useRef(onPieceDrop);
  const onArrowsChangeRef = useRef(onArrowsChange);
  onPieceDropRef.current = onPieceDrop;
  onArrowsChangeRef.current = onArrowsChange;

  const stableOnPieceDrop = useCallback((src: Square, dst: Square, piece: string) => {
    const promotion = piece[1] === 'P' && (dst[1] === '1' || dst[1] === '8') ? 'q' : piece[1] === 'p' && (dst[1] === '1' || dst[1] === '8') ? 'q' : undefined;
    onPieceDropRef.current(src, dst, promotion ?? '');
    return true;
  }, []);

  const stableOnArrowsChange = useCallback((squares: Square[][]) => {
    const arrows: Arrow[] = squares.map(([from, to]) => ({ from: from, to: to }));
    onArrowsChangeRef.current?.(arrows);
  }, []);

  return (
    <div style={{ width: BOARD_WIDTH, position: 'relative' }}>
      <Chessboard
        id={1}
        position={position}
        boardOrientation={boardOrientation}
        boardWidth={BOARD_WIDTH}
        onPieceDrop={stableOnPieceDrop}
        customArrows={customArrows?.map((a) => [a.from, a.to]) as string[][] | undefined}
        onArrowsChange={stableOnArrowsChange}
        customArrowColor={customArrowColor || '#fbbf24'}
        customBoardStyle={{
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
        customDarkSquareStyle={{ backgroundColor: '#4a5568' }}
        customLightSquareStyle={{ backgroundColor: '#e2e8f0' }}
      />
      <ArrowOverlay arrows={customArrows || []} orientation={boardOrientation} />
    </div>
  );
}
