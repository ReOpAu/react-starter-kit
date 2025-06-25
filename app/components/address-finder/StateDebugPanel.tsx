import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Separator } from '~/components/ui/separator';
import { useAddressFinderStore } from '~/stores/addressFinderStore';
import { useState, useCallback, useEffect, useRef } from 'react';

interface StateDebugPanelProps {
  // React Query state
  suggestions: any[];
  isLoading: boolean;
  isError: boolean;
  error: any;
  
  // Local component state
  debouncedSearchQuery: string;
  agentRequestedManual: boolean;
  sessionToken: string | null;
  
  // Conversation state
  conversationStatus: string;
  conversationConnected: boolean;
  
  // Additional metadata
  className?: string;
}

export default function StateDebugPanel({
  suggestions,
  isLoading,
  isError,
  error,
  debouncedSearchQuery,
  agentRequestedManual,
  sessionToken,
  conversationStatus,
  conversationConnected,
  className = "",
}: StateDebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const previousStateRef = useRef<any>(null);
  
  // Get all Zustand store state
  const zustandState = useAddressFinderStore();
  
  // Logging utility - respects the store's logging setting
  const log = useCallback((...args: any[]) => {
    if (zustandState.isLoggingEnabled) {
      console.log('[StateDebugPanel]', ...args);
    }
  }, [zustandState.isLoggingEnabled]);
  
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

  const StateSection = ({ title, data, variant = "default" }: { 
    title: string; 
    data: Record<string, any>; 
    variant?: "default" | "secondary" | "destructive" | "outline";
  }) => (
    <div className="space-y-2">
      <Badge variant={variant} className="text-xs">
        {title}
      </Badge>
      <div className="bg-gray-50 rounded-lg p-3 text-xs font-mono space-y-1">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex flex-wrap gap-2">
            <span className="font-semibold text-gray-700 min-w-0 break-all">
              {key}:
            </span>
            <span className="text-gray-900 min-w-0 break-all flex-1">
              {formatValue(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  // Organize Zustand state into logical groups
  const searchState = {
    searchQuery: zustandState.searchQuery,
    selectedResult: zustandState.selectedResult,
    currentIntent: zustandState.currentIntent,
  };

  const voiceState = {
    isRecording: zustandState.isRecording,
    isVoiceActive: zustandState.isVoiceActive,
  };

  const settingsState = {
    isLoggingEnabled: zustandState.isLoggingEnabled,
    isSmartValidationEnabled: zustandState.isSmartValidationEnabled,
  };

  const historyState = {
    historyLength: zustandState.history.length,
    lastHistoryItem: zustandState.history[zustandState.history.length - 1] || null,
  };

  const reactQueryState = {
    suggestionsCount: suggestions.length,
    isLoading,
    isError,
    hasError: !!error,
    errorMessage: error?.message || null,
  };

  const localState = {
    debouncedSearchQuery,
    agentRequestedManual,
    sessionToken: sessionToken ? `${sessionToken.substring(0, 8)}...` : null,
  };

  const conversationState = {
    status: conversationStatus,
    connected: conversationConnected,
  };

  const metadataState = {
    timestamp: new Date().toISOString(),
    suggestionsDetail: suggestions.map(s => ({
      placeId: s.placeId,
      description: s.description,
      types: s.types?.slice(0, 3) || [],
    })),
  };

  // Comprehensive state object for logging
  const fullStateSnapshot = {
    zustand: {
      search: searchState,
      voice: voiceState,
      settings: settingsState,
      history: {
        ...historyState,
        fullHistory: zustandState.history,
      },
    },
    reactQuery: reactQueryState,
    local: localState,
    conversation: conversationState,
    metadata: metadataState,
    suggestions: suggestions,
  };

  // Log state changes when they occur
  useEffect(() => {
    const currentStateSnapshot = JSON.stringify(fullStateSnapshot);
    const previousStateSnapshot = previousStateRef.current;
    
    if (previousStateSnapshot && currentStateSnapshot !== previousStateSnapshot) {
      log('🔄 STATE CHANGE DETECTED');
      
      // Compare and log specific changes
      try {
        const current = JSON.parse(currentStateSnapshot);
        const previous = JSON.parse(previousStateSnapshot);
        
        // Check for changes in each major state category
        const changes: Record<string, any> = {};
        
        if (JSON.stringify(current.zustand) !== JSON.stringify(previous.zustand)) {
          changes.zustand = {
            from: previous.zustand,
            to: current.zustand,
          };
        }
        
        if (JSON.stringify(current.reactQuery) !== JSON.stringify(previous.reactQuery)) {
          changes.reactQuery = {
            from: previous.reactQuery,
            to: current.reactQuery,
          };
        }
        
        if (JSON.stringify(current.local) !== JSON.stringify(previous.local)) {
          changes.local = {
            from: previous.local,
            to: current.local,
          };
        }
        
        if (JSON.stringify(current.conversation) !== JSON.stringify(previous.conversation)) {
          changes.conversation = {
            from: previous.conversation,
            to: current.conversation,
          };
        }
        
        if (current.suggestions.length !== previous.suggestions.length) {
          changes.suggestions = {
            from: `${previous.suggestions.length} items`,
            to: `${current.suggestions.length} items`,
            detail: current.suggestions.map((s: any) => s.description),
          };
        }
        
        if (Object.keys(changes).length > 0) {
          log('📊 DETAILED STATE CHANGES:', changes);
        }
        
      } catch (parseError) {
        log('❌ Error parsing state changes:', parseError);
      }
    }
    
    previousStateRef.current = currentStateSnapshot;
  }, [fullStateSnapshot, log]);

  // Manual state logging functions
  const logCurrentState = useCallback(() => {
    log('📸 CURRENT STATE SNAPSHOT:', fullStateSnapshot);
  }, [fullStateSnapshot, log]);

  const logZustandState = useCallback(() => {
    log('🎯 ZUSTAND STATE ONLY:', {
      searchQuery: zustandState.searchQuery,
      selectedResult: zustandState.selectedResult,
      currentIntent: zustandState.currentIntent,
      isRecording: zustandState.isRecording,
      isVoiceActive: zustandState.isVoiceActive,
      history: zustandState.history,
      isLoggingEnabled: zustandState.isLoggingEnabled,
      isSmartValidationEnabled: zustandState.isSmartValidationEnabled,
    });
  }, [zustandState, log]);

  const logReactQueryState = useCallback(() => {
    log('🔄 REACT QUERY STATE ONLY:', {
      suggestions,
      suggestionsCount: suggestions.length,
      isLoading,
      isError,
      error: error?.message,
      suggestionsDetail: suggestions.map(s => ({
        placeId: s.placeId,
        description: s.description,
      })),
    });
  }, [suggestions, isLoading, isError, error, log]);

  const logConversationState = useCallback(() => {
    log('💬 CONVERSATION STATE ONLY:', {
      status: conversationStatus,
      connected: conversationConnected,
      localState: {
        debouncedSearchQuery,
        agentRequestedManual,
        sessionToken,
      },
    });
  }, [conversationStatus, conversationConnected, debouncedSearchQuery, agentRequestedManual, sessionToken, log]);

  return (
    <Card className={`border-gray-300 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">🔍 State Debug Panel</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={logCurrentState}
              title="Log complete state snapshot to console"
            >
              📸 Log All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
          </div>
        </div>
        
        {/* Logging controls when expanded */}
        {isExpanded && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={logZustandState}
              className="text-xs"
            >
              🎯 Log Zustand
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={logReactQueryState}
              className="text-xs"
            >
              🔄 Log React Query
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={logConversationState}
              className="text-xs"
            >
              💬 Log Conversation
            </Button>
            <div className="text-xs text-gray-500 flex items-center ml-auto">
              {zustandState.isLoggingEnabled ? (
                <span className="text-green-600">✅ Logging Enabled</span>
              ) : (
                <span className="text-red-600">❌ Logging Disabled</span>
              )}
            </div>
          </div>
        )}
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-4">
          <StateSection 
            title="🎯 Search State (Zustand)" 
            data={searchState}
            variant="default"
          />
          
          <Separator />
          
          <StateSection 
            title="🎤 Voice State (Zustand)" 
            data={voiceState}
            variant="secondary"
          />
          
          <Separator />
          
          <StateSection 
            title="⚙️ Settings State (Zustand)" 
            data={settingsState}
            variant="outline"
          />
          
          <Separator />
          
          <StateSection 
            title="📚 History State (Zustand)" 
            data={historyState}
            variant="outline"
          />
          
          <Separator />
          
          <StateSection 
            title="🔄 React Query State" 
            data={reactQueryState}
            variant={isError ? "destructive" : "default"}
          />
          
          <Separator />
          
          <StateSection 
            title="🏠 Local Component State" 
            data={localState}
            variant="secondary"
          />
          
          <Separator />
          
          <StateSection 
            title="💬 Conversation State" 
            data={conversationState}
            variant={conversationConnected ? "default" : "outline"}
          />
          
          <Separator />
          
          <StateSection 
            title="📊 Metadata & Details" 
            data={metadataState}
            variant="outline"
          />
          
          {/* Full suggestions detail when expanded */}
          {suggestions.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <Badge variant="outline" className="text-xs">
                  🗂️ Full Suggestions Array ({suggestions.length} items)
                </Badge>
                <div className="bg-gray-50 rounded-lg p-3 text-xs font-mono max-h-64 overflow-y-auto">
                  <pre className="whitespace-pre-wrap break-all">
                    {JSON.stringify(suggestions, null, 2)}
                  </pre>
                </div>
              </div>
            </>
          )}
          
          {/* Full history detail when expanded */}
          {zustandState.history.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <Badge variant="outline" className="text-xs">
                  📜 Full History Array ({zustandState.history.length} items)
                </Badge>
                <div className="bg-gray-50 rounded-lg p-3 text-xs font-mono max-h-64 overflow-y-auto">
                  <pre className="whitespace-pre-wrap break-all">
                    {JSON.stringify(zustandState.history, null, 2)}
                  </pre>
                </div>
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
} 