import { AlertCircle } from "lucide-react";
import type React from "react";
import { Alert, AlertDescription } from "../../../../../components/ui/alert";
import { Button } from "../../../../../components/ui/button";

interface FormActionsProps {
	error: string | null;
	isLoading: boolean;
	submitLabel: string;
	loadingLabel?: string;
	onCancel?: () => void;
}

export const FormActions: React.FC<FormActionsProps> = ({
	error,
	isLoading,
	submitLabel,
	loadingLabel,
	onCancel,
}) => {
	return (
		<>
			{error && (
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}
			<div className="flex gap-4 justify-end">
				{onCancel && (
					<Button type="button" variant="outline" onClick={onCancel}>
						Cancel
					</Button>
				)}
				<Button type="submit" disabled={isLoading}>
					{isLoading ? (loadingLabel || "Updating...") : submitLabel}
				</Button>
			</div>
		</>
	);
};
