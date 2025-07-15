import React, { useState } from "react";
import { useMutation } from "convex/react";
import { Button } from "../../../../components/ui/button";
import { 
	AlertDialog, 
	AlertDialogAction, 
	AlertDialogCancel, 
	AlertDialogContent, 
	AlertDialogDescription, 
	AlertDialogFooter, 
	AlertDialogHeader, 
	AlertDialogTitle, 
	AlertDialogTrigger 
} from "../../../../components/ui/alert-dialog";
import { Trash2, Loader2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface DeleteListingButtonProps {
	listingId: Id<"listings">;
	listingTitle: string;
	onSuccess?: () => void;
	variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
	size?: "default" | "sm" | "lg" | "icon";
	children?: React.ReactNode;
}

export const DeleteListingButton: React.FC<DeleteListingButtonProps> = ({
	listingId,
	listingTitle,
	onSuccess,
	variant = "destructive",
	size = "default",
	children
}) => {
	const deleteListing = useMutation(api.listings.deleteListing);
	const [isDeleting, setIsDeleting] = useState(false);
	const [isOpen, setIsOpen] = useState(false);

	const handleDelete = async () => {
		setIsDeleting(true);
		try {
			await deleteListing({ id: listingId });
			setIsOpen(false);
			onSuccess?.();
		} catch (error) {
			console.error("Failed to delete listing:", error);
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<AlertDialog open={isOpen} onOpenChange={setIsOpen}>
			<AlertDialogTrigger asChild>
				<Button variant={variant} size={size}>
					{children || (
						<>
							<Trash2 className="w-4 h-4 mr-2" />
							Delete
						</>
					)}
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete Listing</AlertDialogTitle>
					<AlertDialogDescription>
						Are you sure you want to delete "{listingTitle}"?
						<br />
						<br />
						This action cannot be undone. The listing will be permanently removed 
						and all associated data will be lost.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isDeleting}>
						Cancel
					</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleDelete}
						disabled={isDeleting}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
						{isDeleting ? (
							<>
								<Loader2 className="w-4 h-4 mr-2 animate-spin" />
								Deleting...
							</>
						) : (
							<>
								<Trash2 className="w-4 h-4 mr-2" />
								Delete Listing
							</>
						)}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
};