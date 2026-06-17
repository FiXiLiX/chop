interface TabInfo {
  tabId: string;
  title: string;
}

interface Props {
  tabs: TabInfo[];
  activeTabId: string | null;
  onSelect: (tabId: string) => void;
  onClose: (tabId: string) => void;
  onNewTab: () => void;
  onDuplicateTab: (tabId: string) => void;
}

export default function TabBar({ tabs, activeTabId, onSelect, onClose, onNewTab, onDuplicateTab }: Props) {
  if (tabs.length === 0) return null;

  return (
    <div className="flex bg-gray-800 border-b border-gray-700 overflow-x-auto">
      {tabs.map((tab) => (
        <div
          key={tab.tabId}
          onClick={() => onSelect(tab.tabId)}
          className={`group flex items-center gap-1 px-3 py-2 cursor-pointer border-r border-gray-700 select-none transition-colors ${
            activeTabId === tab.tabId
              ? 'bg-gray-900 text-white border-b-2 border-b-indigo-500'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-750 hover:text-gray-200'
          }`}
        >
          <span className="text-sm font-medium whitespace-nowrap">{tab.title}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicateTab(tab.tabId);
            }}
            className="ml-1 w-4 h-4 flex items-center justify-center rounded hover:bg-gray-600 text-xs leading-none opacity-0 group-hover:opacity-100 transition-opacity"
            title="Open in new tab"
          >
            ⊞
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose(tab.tabId);
            }}
            className="w-4 h-4 flex items-center justify-center rounded hover:bg-gray-600 text-xs leading-none"
            title="Close"
          >
            ×
          </button>
        </div>
      ))}
      <button
        onClick={onNewTab}
        className="px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-750 transition-colors"
        title="Open repertoire in new tab"
      >
        +
      </button>
    </div>
  );
}
