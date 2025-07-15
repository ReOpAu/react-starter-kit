import type React from "react";
import { useState, useEffect } from "react";
import { Card, CardContent } from "../../../components/ui/card";
import { Clock } from "lucide-react";

export interface CampaignCountdownProps {
	targetDate: string | Date;
	title?: string;
}

interface TimeLeft {
	days: number;
	hours: number;
	minutes: number;
	seconds: number;
}

const calculateTimeLeft = (targetDate: string | Date): TimeLeft => {
	const difference = new Date(targetDate).getTime() - new Date().getTime();
	
	if (difference > 0) {
		return {
			days: Math.floor(difference / (1000 * 60 * 60 * 24)),
			hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
			minutes: Math.floor((difference / 1000 / 60) % 60),
			seconds: Math.floor((difference / 1000) % 60)
		};
	}
	
	return { days: 0, hours: 0, minutes: 0, seconds: 0 };
};

export const CampaignCountdown: React.FC<CampaignCountdownProps> = ({ 
	targetDate, 
	title = "Campaign Ends In" 
}) => {
	const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft(targetDate));
	const [isExpired, setIsExpired] = useState(false);

	useEffect(() => {
		const timer = setInterval(() => {
			const newTimeLeft = calculateTimeLeft(targetDate);
			setTimeLeft(newTimeLeft);
			
			// Check if countdown has expired
			if (newTimeLeft.days === 0 && newTimeLeft.hours === 0 && 
				newTimeLeft.minutes === 0 && newTimeLeft.seconds === 0) {
				setIsExpired(true);
				clearInterval(timer);
			}
		}, 1000);

		return () => clearInterval(timer);
	}, [targetDate]);

	if (isExpired) {
		return (
			<Card className="border-red-200 bg-red-50">
				<CardContent className="flex items-center gap-2 py-3">
					<Clock className="w-4 h-4 text-red-500" />
					<span className="text-red-700 font-medium">Campaign Expired</span>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="border-orange-200 bg-orange-50">
			<CardContent className="py-3">
				<div className="flex items-center gap-2 mb-2">
					<Clock className="w-4 h-4 text-orange-600" />
					<span className="text-orange-800 font-medium text-sm">{title}</span>
				</div>
				<div className="grid grid-cols-4 gap-2 text-center">
					<div className="flex flex-col">
						<span className="text-2xl font-bold text-orange-600">
							{timeLeft.days.toString().padStart(2, '0')}
						</span>
						<span className="text-xs text-orange-700">Days</span>
					</div>
					<div className="flex flex-col">
						<span className="text-2xl font-bold text-orange-600">
							{timeLeft.hours.toString().padStart(2, '0')}
						</span>
						<span className="text-xs text-orange-700">Hours</span>
					</div>
					<div className="flex flex-col">
						<span className="text-2xl font-bold text-orange-600">
							{timeLeft.minutes.toString().padStart(2, '0')}
						</span>
						<span className="text-xs text-orange-700">Mins</span>
					</div>
					<div className="flex flex-col">
						<span className="text-2xl font-bold text-orange-600">
							{timeLeft.seconds.toString().padStart(2, '0')}
						</span>
						<span className="text-xs text-orange-700">Secs</span>
					</div>
				</div>
			</CardContent>
		</Card>
	);
};
