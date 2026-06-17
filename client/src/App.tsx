import { useState, useEffect } from 'react';
import { useTabs } from './hooks/useTabs';
import { fetchList, fetchOne, createRepertoire, deleteRepertoire } from './api';
import { Repertoire, RepertoireSummary } from './types';
import HomePage from './components/HomePage';
import TabBar from './components/TabBar';
import RepertoirePanel from './components/RepertoirePanel';
import CreateDialog from './components/CreateDialog';
import OpenTabDialog from './components/OpenTabDialog';

export default function App() {
  const [items, setItems] = useState<RepertoireSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showOpenTab, setShowOpenTab] = useState(false);
  const { tabs, activeTabId, openTab, duplicateTab, closeTab, updateRepertoire, setActive } = useTabs();
  const activeTab = tabs.find((t) => t.tabId === activeTabId);

  useEffect(() => {
    fetchList()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  async function handleOpen(id: string) {
    const rep = await fetchOne(id);
    openTab(rep);
  }

  function handleRepertoireUpdated(rep: RepertoireSummary) {
    setItems((prev) =>
      prev.some((p) => p.id === rep.id)
        ? prev.map((p) => (p.id === rep.id ? rep : p))
        : [...prev, rep]
    );
  }

  async function handleCreate(name: string, color: 'white' | 'black', eco: string) {
    const rep = await createRepertoire(name, color, eco);
    openTab(rep);
    handleRepertoireUpdated({
      id: rep.id,
      name: rep.name,
      color: rep.color,
      eco: rep.eco,
      createdAt: rep.createdAt,
      updatedAt: rep.updatedAt,
      moveCount: 0,
      faceFen: rep.faceFen,
    });
    setShowCreate(false);
  }

  function handleDuplicateTab(rep: Repertoire) {
    duplicateTab(rep);
  }

  async function handleDeleteRep(id: string) {
    await deleteRepertoire(id);
    setItems((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-gray-100">
      <TabBar
        tabs={tabs.map((t) => ({ tabId: t.tabId, title: t.title }))}
        activeTabId={activeTabId}
        onSelect={setActive}
        onClose={closeTab}
        onNewTab={() => setShowOpenTab(true)}
        onDuplicateTab={(tabId) => {
          const tab = tabs.find((t) => t.tabId === tabId);
          if (tab) duplicateTab(tab.repertoire);
        }}
      />
      <div className="flex-1 overflow-hidden">
        {activeTab ? (
          <RepertoirePanel
            key={activeTab.tabId}
            repertoire={activeTab.repertoire}
            onUpdate={(rep) => {
              updateRepertoire(activeTab.repId, rep);
              handleRepertoireUpdated({
                id: rep.id,
                name: rep.name,
                color: rep.color,
                eco: rep.eco,
                createdAt: rep.createdAt,
                updatedAt: rep.updatedAt,
                moveCount: 0,
                faceFen: rep.faceFen,
              });
            }}
            onDuplicate={handleDuplicateTab}
          />
        ) : (
          <HomePage
            items={items}
            loading={loading}
            onOpen={handleOpen}
            onRefresh={() => fetchList().then(setItems)}
            onCreated={handleRepertoireUpdated}
            onDelete={handleDeleteRep}
          />
        )}
      </div>

      {showCreate && (
        <CreateDialog
          onSave={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}

      {showOpenTab && (
        <OpenTabDialog
          items={items}
          onSelect={async (id) => {
            const rep = await fetchOne(id);
            openTab(rep);
            setShowOpenTab(false);
          }}
          onCreateNew={() => {
            setShowOpenTab(false);
            setShowCreate(true);
          }}
          onClose={() => setShowOpenTab(false)}
        />
      )}
    </div>
  );
}
