import { useState, useCallback } from 'react';
import { Repertoire } from '../types';

let tabCounter = 0;

export interface Tab {
  tabId: string;
  repId: string;
  title: string;
  repertoire: Repertoire;
}

export function useTabs() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const openTab = useCallback((rep: Repertoire) => {
    setTabs((prev) => {
      const exists = prev.find((t) => t.repId === rep.id);
      if (exists) {
        setActiveTabId(exists.tabId);
        return prev.map((t) => (t.repId === rep.id ? { ...t, repertoire: rep } : t));
      }
      const tabId = `tab_${++tabCounter}`;
      setActiveTabId(tabId);
      return [...prev, { tabId, repId: rep.id, title: rep.name, repertoire: rep }];
    });
  }, []);

  const duplicateTab = useCallback((rep: Repertoire) => {
    const tabId = `tab_${++tabCounter}`;
    setTabs((prev) => {
      setActiveTabId(tabId);
      return [...prev, { tabId, repId: rep.id, title: rep.name, repertoire: { ...rep, tree: structuredClone(rep.tree) } }];
    });
  }, []);

  const closeTab = useCallback((tabId: string) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.tabId === tabId);
      const next = prev.filter((t) => t.tabId !== tabId);
      if (activeTabId === tabId) {
        const newIdx = Math.min(idx, next.length - 1);
        setActiveTabId(next[newIdx]?.tabId ?? null);
      }
      return next;
    });
  }, [activeTabId]);

  const updateRepertoire = useCallback((repId: string, rep: Repertoire) => {
    setTabs((prev) => prev.map((t) => (t.repId === repId ? { ...t, repertoire: rep } : t)));
  }, []);

  const setActive = useCallback((tabId: string) => {
    setActiveTabId(tabId);
  }, []);

  return { tabs, activeTabId, openTab, duplicateTab, closeTab, updateRepertoire, setActive };
}
