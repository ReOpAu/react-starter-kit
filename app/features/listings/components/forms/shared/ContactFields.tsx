import type React from "react";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "../../../../../components/ui/card";
import { Input } from "../../../../../components/ui/input";
import { Label } from "../../../../../components/ui/label";

interface ContactFieldsProps {
	contactEmail?: string;
	contactPhone?: string;
	onFieldChange: (field: string, value: string) => void;
}

export const ContactFields: React.FC<ContactFieldsProps> = ({
	contactEmail,
	contactPhone,
	onFieldChange,
}) => (
	<Card>
		<CardHeader>
			<CardTitle>Contact Information</CardTitle>
		</CardHeader>
		<CardContent className="space-y-6">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div className="space-y-2">
					<Label htmlFor="contactEmail">Contact Email</Label>
					<Input
						id="contactEmail"
						type="email"
						value={contactEmail}
						onChange={(e) => onFieldChange("contactEmail", e.target.value)}
						placeholder="your@email.com"
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="contactPhone">Contact Phone</Label>
					<Input
						id="contactPhone"
						type="tel"
						value={contactPhone}
						onChange={(e) => onFieldChange("contactPhone", e.target.value)}
						placeholder="0412 345 678"
					/>
				</div>
			</div>
		</CardContent>
	</Card>
);
