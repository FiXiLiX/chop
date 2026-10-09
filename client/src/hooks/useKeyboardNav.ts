import { useEffect, useRef } from 'react';
import { MoveNode } from '../types';
import {
  getNextFen,
  getPrevFen,
  getSiblingFen,
  getDeepestMainLineFen,
} from '../utils/tree';

export interface KeyboardNavOptions {
  root: MoveNode;
  currentFen: string;
  onNavigate: (fen: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleShortcuts: () => void;
  onFlip?: () => void;
  enabled?: boolean;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

export function useKeyboardNav(options: KeyboardNavOptions): void {
  // Store latest options in a ref so the listener always sees fresh values
  // without re-binding on every render.
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (optionsRef.current.enabled === false) return;
      if (isEditableTarget(e.target)) return;

      const { root, currentFen, onNavigate, onUndo, onRedo, onToggleShortcuts, onFlip } =
        optionsRef.current;

      const mod = e.ctrlKey || e.metaKey;

      switch (e.key) {
        case 'ArrowRight': {
          const next = getNextFen(root, currentFen);
          if (next) {
            e.preventDefault();
            onNavigate(next);
          }
          return;
        }
        case 'ArrowLeft': {
          const prev = getPrevFen(root, currentFen);
          if (prev) {
            e.preventDefault();
            onNavigate(prev);
          }
          return;
        }
        case 'ArrowDown': {
          const sib = getSiblingFen(root, currentFen, 1);
          if (sib) {
            e.preventDefault();
            onNavigate(sib);
          }
          return;
        }
        case 'ArrowUp': {
          const sib = getSiblingFen(root, currentFen, -1);
          if (sib) {
            e.preventDefault();
            onNavigate(sib);
          }
          return;
        }
        case 'Home': {
          e.preventDefault();
          onNavigate(root.fen);
          return;
        }
        case 'End': {
          e.preventDefault();
          onNavigate(getDeepestMainLineFen(root));
          return;
        }
        case '?': {
          e.preventDefault();
          onToggleShortcuts();
          return;
        }
        case 'f':
        case 'F': {
          if (mod) return;
          e.preventDefault();
          onFlip?.();
          return;
        }
        case 'z':
        case 'Z': {
          if (!mod) return;
          e.preventDefault();
          if (e.shiftKey) {
            onRedo();
          } else {
            onUndo();
          }
          return;
        }
        case 'y':
        case 'Y': {
          if (!mod) return;
          e.preventDefault();
          onRedo();
          return;
        }
        default:
          return;
      }
    }

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, []);
}