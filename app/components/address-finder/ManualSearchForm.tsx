import React, { useState } from 'react';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';

interface ManualSearchFormProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

const ManualSearchForm: React.FC<ManualSearchFormProps> = ({ onSearch, isLoading }) => {
    const [inputValue, setInputValue] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputValue.trim()) {
            onSearch(inputValue.trim());
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
                placeholder="Or type an address..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !inputValue.trim()}>
                {isLoading ? 'Searching...' : 'Search'}
            </Button>
        </form>
    );
};

export default ManualSearchForm; 