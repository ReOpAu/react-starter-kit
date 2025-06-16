'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import type { Language } from './types';
import { languages } from './types';

interface LanguageSelectorProps {
  selectedLanguage: Language;
  onLanguageChange: (language: Language) => void;
  disabled: boolean;
}

export function LanguageSelector({ 
  selectedLanguage, 
  onLanguageChange, 
  disabled 
}: LanguageSelectorProps) {
  return (
    <Select
      value={selectedLanguage}
      onValueChange={(value) => onLanguageChange(value as Language)}
      disabled={disabled}
    >
      <SelectTrigger className="w-[140px]">
        <SelectValue placeholder="Select language" />
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            {lang.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
} 