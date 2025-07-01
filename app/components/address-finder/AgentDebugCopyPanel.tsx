import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import type { Suggestion } from '~/stores/types';

export interface AgentDebugCopyPanelProps {
  agentState: {
    ui: {
      isRecording: boolean;
      isVoiceActive: boolean;
      currentIntent: string;
      searchQuery: string;
      hasQuery: boolean;
    };
    api: {
      suggestions: Suggestion[];
      isLoading: boolean;
      error: string | null;
      hasResults: boolean;
      hasMultipleResults: boolean;
      resultCount: number;
      source: string;
    };
    selection: {
      selectedResult: Suggestion | null;
      hasSelection: boolean;
      selectedAddress: string | null;
      selectedPlaceId: string | null;
    };
    meta: {
      lastUpdate: number;
      sessionActive: boolean;
      dataFlow: string;
    };
  };
  history: Array<{ type: string; text: string; timestamp?: number }>;
  className?: string;
}

export default function AgentDebugCopyPanel({ agentState, history, className = "" }: AgentDebugCopyPanelProps) {
  const [copied, setCopied] = useState(false);

  const debugText = useMemo(() => {
    const lastHistory = history.slice(-5).map(h => {
      const ts = h.timestamp ? new Date(h.timestamp).toLocaleString() : '';
      return `  [${h.type}] ${ts} ${h.text}`;
    }).join('\n');
    const suggestions = agentState.api.suggestions.map((s: Suggestion, i: number) =>
      `    ${i + 1}. ${s.description} (${s.placeId})`
    ).join('\n');
    return [
      '--- AGENT DEBUG SNAPSHOT ---',
      `Timestamp: ${new Date(agentState.meta.lastUpdate).toLocaleString()}`,
      `isRecording: ${agentState.ui.isRecording}`,
      `isVoiceActive: ${agentState.ui.isVoiceActive}`,
      `currentIntent: ${agentState.ui.currentIntent}`,
      `searchQuery: "${agentState.ui.searchQuery}"`,
      `selectedResult: ${agentState.selection.selectedResult ? JSON.stringify(agentState.selection.selectedResult, null, 2) : 'null'}`,
      `hasSelection: ${agentState.selection.hasSelection}`,
      `selectedAddress: ${agentState.selection.selectedAddress}`,
      `selectedPlaceId: ${agentState.selection.selectedPlaceId}`,
      `Suggestions (${agentState.api.suggestions.length}):`,
      suggestions || '    (none)',
      `isLoading: ${agentState.api.isLoading}`,
      `error: ${agentState.api.error || 'none'}`,
      `source: ${agentState.api.source}`,
      `Session Active: ${agentState.meta.sessionActive}`,
      `Data Flow: ${agentState.meta.dataFlow}`,
      'Recent History:',
      lastHistory || '  (none)',
      '----------------------------',
    ].join('\n');
  }, [agentState, history]);

  const handleCopy = () => {
    navigator.clipboard.writeText(debugText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Debug Copy Panel
          <Button size="sm" variant="outline" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy Debug Text'}
          </Button>
        </CardTitle>
        <p className="text-xs text-gray-500">Copy this debug block and paste it into the Code editor or issue report for troubleshooting agent understanding issues.</p>
      </CardHeader>
      <CardContent>
        <textarea
          className="w-full font-mono text-xs bg-gray-50 border rounded p-2"
          rows={Math.max(10, debugText.split('\n').length)}
          value={debugText}
          readOnly
        />
      </CardContent>
    </Card>
  );
} 