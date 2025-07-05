import type React from "react";
import { useSearchMemoryStore } from "~/stores/searchMemoryStore";
import type { SearchMemoryEntry } from "~/stores/searchMemoryStore";
import { Button } from "../ui/button";
import { useIntentStore } from "~/stores/intentStore";

// Previous Searches memory now stores any search with >1 result (not just confirmed). See: docs/ADDRESS_FINDER_V3_DOCUMENTATION.md, docs/UNIFIED_ADDRESS_SYSTEM.md

interface PreviousSearchesPanelProps {
  onRecall: (entry: SearchMemoryEntry) => void;
  onClose?: () => void;
}

export const PreviousSearchesPanel: React.FC<PreviousSearchesPanelProps> = ({ onRecall, onClose }) => {
  const memory = useSearchMemoryStore((s) => s.memory);
  const previousSearches = memory; // Show all confirmed selections, including the most recent
  const { searchQuery } = useIntentStore();

  if (previousSearches.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No previous searches this session.
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg shadow p-4 max-w-md mx-auto">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold">Previous Searches</h2>
        {onClose && (
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        )}
      </div>
      <ul className="space-y-2">
        {previousSearches.map((entry, idx) => (
          <li key={entry.id} className="flex items-center justify-between border-b pb-2 last:border-b-0">
            <div>
              <div className="font-medium">{idx + 1}. {entry.query}</div>
              <div className="text-xs text-gray-500">
                {new Date(entry.timestamp).toLocaleTimeString()} &middot; {entry.results.length} result{entry.results.length !== 1 ? 's' : ''}
                {entry.context.confirmed && <span className="ml-2 text-green-600">(confirmed)</span>}
              </div>
            </div>
            <Button size="sm" onClick={() => onRecall(entry)}>
              Recall
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}; 