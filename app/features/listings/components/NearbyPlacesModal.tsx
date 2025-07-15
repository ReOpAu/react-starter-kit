import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { X } from "lucide-react";
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
			<DialogContent className="max-w-5xl w-[90vw] h-[80vh] max-h-[80vh] overflow-hidden">
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
				</DialogHeader>
				<div className="flex-1 overflow-hidden">
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