import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { useState } from 'react';

export interface AgentStatePanelProps {
  agentState: {
    ui: {
      isRecording: boolean;
      isVoiceActive: boolean;
      currentIntent: string;
      searchQuery: string;
      hasQuery: boolean;
    };
    api: {
      suggestions: any[];
      isLoading: boolean;
      error: string | null;
      hasResults: boolean;
      hasMultipleResults: boolean;
      resultCount: number;
      source: string;
    };
    selection: {
      selectedResult: any;
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
  className?: string;
}

export default function AgentStatePanel({ agentState, className = "" }: AgentStatePanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const formatValue = (value: any): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'boolean') return value.toString();
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'number') return value.toString();
    if (Array.isArray(value)) return `Array(${value.length})`;
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return '[Object]';
      }
    }
    return String(value);
  };

  const Section = ({ title, data, variant = "default" }: { title: string; data: Record<string, any>; variant?: string }) => (
    <div className="space-y-2">
      <Badge variant={variant as any} className="text-xs">{title}</Badge>
      <div className="bg-gray-50 rounded-lg p-3 text-xs font-mono space-y-1">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex flex-wrap gap-2">
            <span className="font-semibold text-gray-700 min-w-0 break-all">{key}:</span>
            <span className="text-gray-900 min-w-0 break-all flex-1">{formatValue(value)}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(agentState, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          AI Agent State Awareness
          <Button size="sm" variant="outline" onClick={() => setIsExpanded(e => !e)}>
            {isExpanded ? 'Hide Details' : 'Show Details'}
          </Button>
          <Button size="sm" variant="outline" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy JSON'}
          </Button>
        </CardTitle>
        <p className="text-xs text-gray-500">This panel shows exactly what the AI Agent is aware of right now.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Section title="UI State" data={agentState.ui} variant="outline" />
        <Section title="API State" data={{ ...agentState.api, suggestions: `Array(${agentState.api.suggestions.length})` }} variant="secondary" />
        <Section title="Selection State" data={agentState.selection} variant="default" />
        <Section title="Meta" data={{ ...agentState.meta, lastUpdate: new Date(agentState.meta.lastUpdate).toLocaleString() }} variant="default" />
        {isExpanded && (
          <div className="pt-2">
            <Section title="Suggestions Detail" data={{ suggestions: agentState.api.suggestions }} variant="destructive" />
          </div>
        )}
      </CardContent>
    </Card>
  );
} 