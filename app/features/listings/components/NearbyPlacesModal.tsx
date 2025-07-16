import { X } from "lucide-react";
import type React from "react";
import { Button } from "../../../components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "../../../components/ui/dialog";
import { NearbyPlacesTabs } from "./NearbyPlacesTabs";

interface NearbyPlacesModalProps {
	isOpen: boolean;
	onClose: () => void;
	latitude: number;
	longitude: number;
	radius?: number;
}

export const NearbyPlacesModal: React.FC<NearbyPlacesModalProps> = ({
	isOpen,
	onClose,
	latitude,
	longitude,
	radius = 5000,
}) => {
	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent
				showCloseButton={false}
				className="w-[95vw] max-w-[95vw] h-[80vh] sm:max-w-[95vw] flex flex-col"
			>
				<DialogHeader>
					<DialogTitle className="flex items-center justify-between">
						Nearby Places
						<Button
							variant="ghost"
							size="sm"
							onClick={onClose}
							className="h-6 w-6 p-0"
						>
							<X className="h-4 w-4" />
						</Button>
					</DialogTitle>
					<DialogDescription>
						Explore nearby places including education, health, dining, and
						entertainment options.
					</DialogDescription>
				</DialogHeader>
				<div className="flex-grow overflow-hidden">
					<NearbyPlacesTabs
						latitude={latitude}
						longitude={longitude}
						radius={radius}
					/>
				</div>
			</DialogContent>
		</Dialog>
	);
};
