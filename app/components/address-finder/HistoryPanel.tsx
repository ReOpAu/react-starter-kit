import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '~/components/ui/card';
import { cn } from '~/lib/utils';
import { useAddressFinderStore } from '~/stores/addressFinderStore';

type HistoryEntry = ReturnType<typeof useAddressFinderStore.getState>['history'][number];

interface HistoryPanelProps {
  history: HistoryEntry[];
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ history }) => {
    if (history.length === 0) {
        return null;
    }
    
  return (
    <Card>
      <CardHeader>
        <CardTitle>History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {history.map((entry) => (
            <div
              key={entry.timestamp}
              className={cn('flex items-center justify-between p-2 rounded text-sm', {
                'bg-blue-50': entry.type === 'agent',
                'bg-gray-50': entry.type === 'user',
                'bg-yellow-50': entry.type === 'system',
              })}
            >
              <span>{entry.text}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default HistoryPanel; 