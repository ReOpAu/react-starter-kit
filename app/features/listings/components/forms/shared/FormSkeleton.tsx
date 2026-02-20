import type React from "react";
import {
	Card,
	CardContent,
	CardHeader,
} from "../../../../../components/ui/card";
import { Skeleton } from "../../../../../components/ui/skeleton";

interface FormSkeletonProps {
	count?: number;
}

export const FormSkeleton: React.FC<FormSkeletonProps> = ({ count = 5 }) => {
	return (
		<div className="space-y-8">
			{Array.from({ length: count }).map((_, i) => (
				<Card key={i}>
					<CardHeader>
						<Skeleton className="h-6 w-48" />
					</CardHeader>
					<CardContent className="space-y-4">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
					</CardContent>
				</Card>
			))}
		</div>
	);
};
