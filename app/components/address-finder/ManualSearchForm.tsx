import React, { useState, useEffect, useRef, useCallback } from 'react';
import { type Suggestion } from '~/stores/addressFinderStore';
import { Badge } from '~/components/ui/badge';
import { AnimatePresence, motion } from 'framer-motion';
import AddressInput from './AddressInput';

// Google Maps best practice: Highlight matching text in suggestions
const renderHighlightedText = (text: string, searchTerm: string): React.ReactNode => {
    if (!searchTerm.trim()) return text;
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
        regex.test(part) ? (
            <mark key={index} className="bg-yellow-200 text-gray-900 px-0.5 rounded">
                {part}
            </mark>
        ) : (
            part
        )
    );
};

interface ManualSearchFormProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
  suggestions?: Suggestion[];
  onSelect: (suggestion: Suggestion) => void;
  searchQuery: string;
  onClear: () => void;
}

const ManualSearchForm: React.FC<ManualSearchFormProps> = React.memo(({ 
  onSearch, 
  isLoading,
  suggestions = [],
  onSelect,
  searchQuery,
  onClear,
 }) => {
    const [inputValue, setInputValue] = useState(searchQuery);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isAddressSelected, setIsAddressSelected] = useState(false);
    const [hasMinimumChars, setHasMinimumChars] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const isUserTypingRef = useRef(false);
    
    // Google's recommended minimum character threshold
    const MIN_SEARCH_CHARS = 3;

    // Only update inputValue when searchQuery changes from external source (not user typing)
    useEffect(() => {
        if (!isUserTypingRef.current && searchQuery !== inputValue) {
            setInputValue(searchQuery);
        }
        // Reset the flag after a short delay to handle external updates
        const timer = setTimeout(() => {
            isUserTypingRef.current = false;
        }, 100);
        return () => clearTimeout(timer);
    }, [searchQuery]);
    
            // Better suggestion visibility logic - similar to GoogleMapsAutocomplete
    useEffect(() => {
        if (isAddressSelected) {
            setShowSuggestions(false);
            return;
        }

        if (suggestions.length > 0 && inputRef.current === document.activeElement && hasMinimumChars) {
            setShowSuggestions(true);
        } else if (suggestions.length === 0) {
            setShowSuggestions(false);
        }
    }, [suggestions, isAddressSelected, hasMinimumChars]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        
        // Capture current state values to avoid reactive dependencies
        const currentValue = inputValue;
        const currentIsAddressSelected = isAddressSelected;
        
        const trimmedOldValue = currentValue.trim();
        const trimmedNewValue = query.trim();
        const meetsMinimum = trimmedNewValue.length >= MIN_SEARCH_CHARS;
        
        isUserTypingRef.current = true; // Mark that user is typing
        setInputValue(query);
        setSelectedIndex(-1);
        setHasMinimumChars(meetsMinimum);
        
        // Only reset address selection if the actual content changed (not just whitespace)
        if (trimmedOldValue !== trimmedNewValue) {
            setIsAddressSelected(false);
        }
        
        // Only trigger search if we meet minimum character threshold (Google best practice)
        if (meetsMinimum) {
            onSearch(query);
        }
        
        // Only show suggestions if we have content, meet minimum chars, and haven't selected an address
        if (meetsMinimum && !currentIsAddressSelected) {
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
        }
    }, [onSearch]); // Only depend on onSearch which should be stable

    const handleSelect = useCallback((suggestion: Suggestion) => {
        onSelect(suggestion);
        setInputValue(suggestion.description);
        setShowSuggestions(false);
        setSelectedIndex(-1);
        setIsAddressSelected(true);
        isUserTypingRef.current = false; // Reset typing flag
    }, [onSelect]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (showSuggestions && suggestions.length > 0) {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (selectedIndex >= 0) {
                        handleSelect(suggestions[selectedIndex]);
                    } else {
                        handleSubmit(e);
                    }
                    break;
                case 'Escape':
                    setShowSuggestions(false);
                    setSelectedIndex(-1);
                    break;
            }
        }
    }, [showSuggestions, suggestions, selectedIndex, handleSelect]);
    
    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (inputValue.trim()) {
            onSearch(inputValue.trim());
            setShowSuggestions(false);
        }
    }, [inputValue, onSearch]);

    const handleClearInput = useCallback(() => {
        onClear();
        setInputValue('');
        setIsAddressSelected(false);
        setShowSuggestions(false);
        setSelectedIndex(-1);
        isUserTypingRef.current = false; // Reset typing flag
        // Keep focus on input after clearing
        setTimeout(() => {
            inputRef.current?.focus();
        }, 0);
    }, [onClear]);

    const handleFocus = useCallback(() => {
        // Capture current state to avoid reactive dependencies
        const currentSuggestionsLength = suggestions.length;
        const currentHasMinimumChars = hasMinimumChars;
        const currentIsAddressSelected = isAddressSelected;
        
        if (currentSuggestionsLength > 0 && currentHasMinimumChars && !currentIsAddressSelected) {
            setShowSuggestions(true);
        }
    }, []); // No dependencies to prevent loops

    const handleBlur = useCallback(() => {
        // Use setTimeout to prevent premature closing when clicking on suggestions
        setTimeout(() => {
            setShowSuggestions(false);
        }, 200);
    }, []);

    return (
        <div className="relative" ref={containerRef}>
                            <AddressInput
                ref={inputRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onSubmit={handleSubmit}
                onClear={handleClearInput}
                isLoading={isLoading}
                aria-expanded={showSuggestions}
                aria-haspopup="listbox"
                aria-autocomplete="list"
                role="combobox"
                aria-activedescendant={selectedIndex >= 0 ? `suggestion-${selectedIndex}` : undefined}
            />
            
            {/* Helpful hint when user hasn't typed enough characters */}
            {inputValue.trim().length > 0 && !hasMinimumChars && !isLoading && (
                <div className="absolute z-10 w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-500">
                    Type at least {MIN_SEARCH_CHARS} characters to see suggestions
                </div>
            )}
            <AnimatePresence>
                {showSuggestions && suggestions.length > 0 && hasMinimumChars && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
                        role="listbox"
                        aria-label="Address suggestions"
                    >
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={suggestions.map(s => s.placeId).join(',')} // Re-render when suggestions change
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.1 }}
                            >
                                {suggestions.map((suggestion, index) => (
                                    <div
                                        key={suggestion.placeId}
                                        className={`px-3 py-2 cursor-pointer hover:bg-gray-100 transition-colors duration-75 ${
                                            index === selectedIndex ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                                        } ${index === 0 ? 'rounded-t-md' : ''} ${index === suggestions.length - 1 ? 'rounded-b-md' : ''}`}
                                        onClick={() => handleSelect(suggestion)}
                                        onMouseDown={(e) => e.preventDefault()} // Prevent blur on mousedown
                                        role="option"
                                        aria-selected={index === selectedIndex}
                                        id={`suggestion-${index}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="font-medium text-sm text-gray-900">
                                                    {renderHighlightedText(suggestion.description, inputValue.trim())}
                                                </div>
                                                {suggestion.suburb && (
                                                    <div className="text-xs text-gray-500">
                                                        {renderHighlightedText(suggestion.suburb, inputValue.trim())}
                                                    </div>
                                                )}
                                            </div>
                                            {suggestion.resultType && (
                                                <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">
                                                    {suggestion.resultType}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

ManualSearchForm.displayName = 'ManualSearchForm';

export default ManualSearchForm; 