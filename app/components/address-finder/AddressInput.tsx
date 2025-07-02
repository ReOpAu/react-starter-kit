import React from "react";
import { Input } from "~/components/ui/input";

interface AddressInputProps {
	value: string;
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onKeyDown: (e: React.KeyboardEvent) => void;
	onFocus: () => void;
	onBlur?: () => void;
	onSubmit: (e: React.FormEvent) => void;
	onClear: () => void;
	isLoading: boolean;
	disabled?: boolean;
	// Accessibility attributes for autocomplete (Google best practices)
	"aria-expanded"?: boolean;
	"aria-haspopup"?: "listbox" | "menu" | "tree" | "grid" | "dialog";
	"aria-autocomplete"?: "none" | "inline" | "list" | "both";
	"aria-activedescendant"?: string;
	role?: string;
}

const AddressInput = React.forwardRef<HTMLInputElement, AddressInputProps>(
	(
		{
			value,
			onChange,
			onKeyDown,
			onFocus,
			onBlur,
			onSubmit,
			onClear,
			isLoading,
			disabled = false,
			"aria-expanded": ariaExpanded,
			"aria-haspopup": ariaHaspopup,
			"aria-autocomplete": ariaAutocomplete,
			"aria-activedescendant": ariaActivedescendant,
			role,
		},
		ref,
	) => {
		return (
			<form onSubmit={onSubmit}>
				<div className="relative w-full">
					<Input
						ref={ref}
						placeholder="Or type an address..."
						value={value}
						onChange={onChange}
						onKeyDown={onKeyDown}
						onFocus={onFocus}
						onBlur={onBlur}
						disabled={disabled}
						autoComplete="off"
						spellCheck={false}
						autoCorrect="off"
						autoCapitalize="off"
						className={`${isLoading ? "pr-16" : "pr-10"}`}
						aria-expanded={ariaExpanded}
						aria-haspopup={ariaHaspopup}
						aria-autocomplete={ariaAutocomplete}
						aria-activedescendant={ariaActivedescendant}
						role={role}
					/>
					{isLoading && (
						<div className="absolute right-8 top-1/2 transform -translate-y-1/2">
							<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400" />
						</div>
					)}
					{value && (
						<button
							type="button"
							onClick={onClear}
							className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
							aria-label="Clear search"
						>
							<svg
								className="w-4 h-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					)}
				</div>
			</form>
		);
	},
);

AddressInput.displayName = "AddressInput";

export default AddressInput;
