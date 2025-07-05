import type React from "react";
import { useConfirmedSelectionsStore } from "~/stores/confirmedSelectionsStore";
import type { ConfirmedSelectionEntry } from "~/stores/confirmedSelectionsStore";
import { Button } from "../ui/button";

interface PreviousConfirmedSelectionsPanelProps {
  onRecall: (entry: ConfirmedSelectionEntry) => void;
  onClose?: () => void;
}

export const PreviousConfirmedSelectionsPanel: React.FC<PreviousConfirmedSelectionsPanelProps> = ({ onRecall, onClose }) => {
  const selections = useConfirmedSelectionsStore((s) => s.selections);

  if (selections.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No confirmed selections this session.
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg shadow p-4 max-w-md mx-auto">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold">Previous Selections</h2>
        {onClose && (
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        )}
      </div>
      <ul className="space-y-2">
        {selections.map((entry, idx) => (
          <li key={entry.id} className="flex items-center justify-between border-b pb-2 last:border-b-0">
            <div>
              <div className="font-medium">{idx + 1}. {entry.query}</div>
              <div className="text-xs text-gray-500">
                {new Date(entry.timestamp).toLocaleTimeString()} &middot; {entry.selectedResult?.description}
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