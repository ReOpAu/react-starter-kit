"use client";

import * as Flags from "country-flag-icons/react/3x2";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import type { Language } from "./types";
import { languages } from "./types";

interface LanguageSelectorProps {
	selectedLanguage: Language;
	onLanguageChange: (language: Language) => void;
	disabled: boolean;
}

export function LanguageSelector({
	selectedLanguage,
	onLanguageChange,
	disabled,
}: LanguageSelectorProps) {
	return (
		<Select
			value={selectedLanguage}
			onValueChange={(value) => onLanguageChange(value as Language)}
			disabled={disabled}
		>
			<SelectTrigger className="w-[160px]">
				<SelectValue placeholder="Select language" />
			</SelectTrigger>
			<SelectContent>
				{languages.map((lang) => {
					const FlagIcon = Flags[lang.flag as keyof typeof Flags];
					return (
						<SelectItem key={lang.code} value={lang.code}>
							{FlagIcon && (
								<FlagIcon
									style={{
										width: 20,
										height: 14,
										marginRight: 8,
										display: "inline-block",
										verticalAlign: "middle",
									}}
								/>
							)}
							<span style={{ verticalAlign: "middle" }}>{lang.name}</span>
						</SelectItem>
					);
				})}
			</SelectContent>
		</Select>
	);
}
