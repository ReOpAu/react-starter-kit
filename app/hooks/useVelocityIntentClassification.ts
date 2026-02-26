import { STREET_KEYWORDS } from "@shared/constants/addressTypes";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LocationIntent } from "~/stores/types";

interface TypingVelocity {
	isTypingFast: boolean;
	timeSinceLastKeypress: number;
	averageInterval: number;
	velocityChangeDetected: boolean;
	wordCount: number;
	hasVelocityBaseline: boolean;
}

interface VelocityOptions {
	enabled: boolean;
	velocityChangeThreshold: number; // Multiplier for detecting significant velocity changes (e.g., 2.0 = typing 2x slower)
	minBaselineKeystrokes: number; // Minimum keystrokes needed to establish baseline
	maxIntervalForBaseline: number; // Maximum interval to include in baseline calculation (ms)
}

export function useVelocityIntentClassification(
	query: string,
	currentIntent: LocationIntent,
	options: VelocityOptions = {
		enabled: true,
		velocityChangeThreshold: 2.0,
		minBaselineKeystrokes: 3,
		maxIntervalForBaseline: 1000,
	},
): {
	shouldClassify: boolean;
	detectedIntent: LocationIntent | null;
	typingState: TypingVelocity;
} {
	// Refs for velocity tracking (don't trigger re-renders)
	const keystrokeTimestamps = useRef<number[]>([]);
	const lastKeystrokeTime = useRef<number>(0);
	const baselineInterval = useRef<number | null>(null);
	const lastQuery = useRef<string>("");
	const lastWordCount = useRef<number>(0);
	const lastTypingState = useRef<TypingVelocity>({
		isTypingFast: false,
		timeSinceLastKeypress: 0,
		averageInterval: 0,
		velocityChangeDetected: false,
		wordCount: 0,
		hasVelocityBaseline: false,
	});

	// Comprehensive thoroughfare keywords for Australian addresses
	const thoroughfareKeywords = [
		// Common street types
		"street",
		"st",
		"road",
		"rd",
		"avenue",
		"ave",
		"lane",
		"ln",
		"drive",
		"dr",
		"way",

		// Curved/circular streets
		"crescent",
		"cres",
		"circuit",
		"cct",
		"circle",
		"cir",
		"loop",
		"round",
		"curve",

		// Courts and places
		"court",
		"ct",
		"place",
		"pl",
		"plaza",
		"plz",
		"square",
		"sq",
		"yard",

		// Elevated areas
		"terrace",
		"tce",
		"rise",
		"ridge",
		"hill",
		"mount",
		"mt",
		"heights",
		"hts",
		"outlook",
		"view",
		"vista",
		"summit",
		"peak",
		"crest",
		"slope",

		// Garden/nature areas
		"grove",
		"grv",
		"gardens",
		"gdns",
		"park",
		"green",
		"common",
		"reserve",
		"res",
		"retreat",
		"haven",
		"glade",
		"dell",
		"vale",
		"valley",
		"glen",
		"gully",

		// Water-related
		"esplanade",
		"esp",
		"waterway",
		"creek",
		"river",
		"beach",
		"bay",
		"cove",
		"harbour",
		"marina",
		"wharf",
		"pier",
		"jetty",
		"strand",
		"foreshore",

		// Commercial/business
		"boulevard",
		"blvd",
		"mall",
		"arcade",
		"exchange",
		"market",
		"centre",
		"center",

		// Major roads
		"highway",
		"hwy",
		"freeway",
		"fwy",
		"motorway",
		"mwy",
		"expressway",
		"tollway",
		"arterial",
		"bypass",
		"link",
		"connector",

		// Pedestrian areas
		"walk",
		"walkway",
		"path",
		"track",
		"trail",
		"promenade",
		"boardwalk",
		"steps",
		"stairs",
		"bridge",
		"overpass",
		"underpass",

		// Historic/unique Australian
		"parade",
		"pde",
		"row",
		"mews",
		"close",
		"end",
		"gate",
		"entrance",
		"entry",
		"approach",
		"access",
		"strip",
		"stretch",
		"extension",
		"ext",
		"continuation",

		// Residential developments
		"estate",
		"village",
		"hamlet",
		"meadows",
		"fields",
		"downs",
		"flats",
		"towers",
		"court",
		"manor",
		"chase",
		"reach",
		"bend",
		"turn",
		"corner",

		// Industrial/commercial areas
		"industrial",
		"business",
		"trade",
		"commercial",
		"service",
		"enterprise",
		"technology",
		"tech",
		"innovation",
		"research",

		// Directions and positions
		"north",
		"nth",
		"south",
		"sth",
		"east",
		"west",
		"upper",
		"lower",
		"inner",
		"outer",
		"central",
		"mid",
		"old",
		"new",
	];

	// Helper: Check if a word is a thoroughfare type (including partial matches)
	const isThoroughfareWord = useCallback((word: string): boolean => {
		const lowerWord = word.toLowerCase().trim();

		// Exact match first
		if (thoroughfareKeywords.includes(lowerWord)) {
			return true;
		}

		// Partial match for common thoroughfare types (min 2-3 chars depending on uniqueness)
		if (lowerWord.length >= 2) {
			const partialMatches = [
				// Street - very aggressive
				{ partial: "st", full: "street", minLength: 2 },
				{ partial: "str", full: "street" },
				{ partial: "stre", full: "street" },
				{ partial: "stree", full: "street" },

				// Road - aggressive
				{ partial: "ro", full: "road", minLength: 2 },
				{ partial: "roa", full: "road" },

				// Avenue - aggressive
				{ partial: "av", full: "avenue", minLength: 2 },
				{ partial: "ave", full: "avenue" },
				{ partial: "aven", full: "avenue" },
				{ partial: "avenu", full: "avenue" },

				// Drive - aggressive
				{ partial: "dr", full: "drive", minLength: 2 },
				{ partial: "dri", full: "drive" },
				{ partial: "driv", full: "drive" },

				// Court - very aggressive (your example!)
				{ partial: "co", full: "court", minLength: 2 },
				{ partial: "cou", full: "court" },
				{ partial: "cour", full: "court" },

				// Lane - aggressive
				{ partial: "la", full: "lane", minLength: 2 },
				{ partial: "lan", full: "lane" },

				// Way - aggressive
				{ partial: "wa", full: "way", minLength: 2 },

				// Place - aggressive
				{ partial: "pl", full: "place", minLength: 2 },
				{ partial: "pla", full: "place" },
				{ partial: "plac", full: "place" },

				// Crescent - aggressive
				{ partial: "cr", full: "crescent", minLength: 2 },
				{ partial: "cre", full: "crescent" },
				{ partial: "cres", full: "crescent" },
				{ partial: "cresc", full: "crescent" },
				{ partial: "cresce", full: "crescent" },
				{ partial: "crescen", full: "crescent" },

				// Boulevard - aggressive
				{ partial: "bo", full: "boulevard", minLength: 2 },
				{ partial: "bou", full: "boulevard" },
				{ partial: "boul", full: "boulevard" },
				{ partial: "boule", full: "boulevard" },
				{ partial: "boulev", full: "boulevard" },
				{ partial: "bouleva", full: "boulevard" },
				{ partial: "boulevar", full: "boulevard" },

				// Terrace - aggressive
				{ partial: "te", full: "terrace", minLength: 2 },
				{ partial: "ter", full: "terrace" },
				{ partial: "terr", full: "terrace" },
				{ partial: "terra", full: "terrace" },
				{ partial: "terrac", full: "terrace" },

				// Circuit - aggressive
				{ partial: "ci", full: "circuit", minLength: 2 },
				{ partial: "cir", full: "circuit" },
				{ partial: "circ", full: "circuit" },
				{ partial: "circu", full: "circuit" },
				{ partial: "circui", full: "circuit" },

				// Parade - aggressive
				{ partial: "pa", full: "parade", minLength: 2 },
				{ partial: "par", full: "parade" },
				{ partial: "para", full: "parade" },
				{ partial: "parad", full: "parade" },

				// Gardens - aggressive
				{ partial: "ga", full: "gardens", minLength: 2 },
				{ partial: "gar", full: "gardens" },
				{ partial: "gard", full: "gardens" },
				{ partial: "garde", full: "gardens" },
				{ partial: "garden", full: "gardens" },

				// Highway - aggressive
				{ partial: "hi", full: "highway", minLength: 2 },
				{ partial: "hig", full: "highway" },
				{ partial: "high", full: "highway" },
				{ partial: "righw", full: "highway" },
				{ partial: "righwa", full: "highway" },

				// Esplanade - aggressive
				{ partial: "es", full: "esplanade", minLength: 2 },
				{ partial: "esp", full: "esplanade" },
				{ partial: "espl", full: "esplanade" },
				{ partial: "espla", full: "esplanade" },
				{ partial: "esplan", full: "esplanade" },
				{ partial: "esplana", full: "esplanade" },
				{ partial: "esplanad", full: "esplanade" },

				// Reserve - aggressive
				{ partial: "re", full: "reserve", minLength: 2 },
				{ partial: "res", full: "reserve" },
				{ partial: "rese", full: "reserve" },
				{ partial: "reser", full: "reserve" },
				{ partial: "reserv", full: "reserve" },

				// Freeway - aggressive
				{ partial: "fr", full: "freeway", minLength: 2 },
				{ partial: "fre", full: "freeway" },
				{ partial: "free", full: "freeway" },
				{ partial: "freew", full: "freeway" },
				{ partial: "freewa", full: "freeway" },

				// Heights - aggressive
				{ partial: "he", full: "heights", minLength: 2 },
				{ partial: "hei", full: "heights" },
				{ partial: "heig", full: "heights" },
				{ partial: "heigh", full: "heights" },
				{ partial: "height", full: "heights" },

				// Rise - aggressive
				{ partial: "ri", full: "rise", minLength: 2 },
				{ partial: "ris", full: "rise" },

				// Grove - aggressive
				{ partial: "gr", full: "grove", minLength: 2 },
				{ partial: "gro", full: "grove" },
				{ partial: "grov", full: "grove" },

				// Close - aggressive
				{ partial: "cl", full: "close", minLength: 2 },
				{ partial: "clo", full: "close" },
				{ partial: "clos", full: "close" },

				// View - aggressive
				{ partial: "vi", full: "view", minLength: 2 },
				{ partial: "vie", full: "view" },

				// Walk - aggressive
				{ partial: "wa", full: "walk", minLength: 2 },
				{ partial: "wal", full: "walk" },
			];

			return partialMatches.some((match) => {
				// Respect minimum length for very short prefixes
				const requiredMinLength = match.minLength || 3;
				if (lowerWord.length < requiredMinLength) {
					return false;
				}
				return (
					lowerWord.startsWith(match.partial) &&
					match.full.startsWith(lowerWord)
				);
			});
		}

		return false;
	}, []);

	// Helper: Get word count and words from query
	const analyzeQuery = useCallback((query: string) => {
		const trimmed = query.trim();
		if (!trimmed) return { wordCount: 0, words: [], lastWord: "" };

		const words = trimmed.split(/\s+/);
		return {
			wordCount: words.length,
			words,
			lastWord: words[words.length - 1] || "",
		};
	}, []);

	// Helper: Calculate average interval from recent keystrokes
	const calculateAverageInterval = useCallback(
		(timestamps: number[], maxInterval: number): number => {
			if (timestamps.length < 2) return 0;

			const intervals: number[] = [];
			for (let i = 1; i < timestamps.length; i++) {
				const interval = timestamps[i] - timestamps[i - 1];
				if (interval <= maxInterval) {
					// Filter out very long pauses
					intervals.push(interval);
				}
			}

			if (intervals.length === 0) return 0;
			return (
				intervals.reduce((sum, interval) => sum + interval, 0) /
				intervals.length
			);
		},
		[],
	);

	// State for velocity information
	const [typingState, setTypingState] = useState<TypingVelocity>({
		isTypingFast: false,
		timeSinceLastKeypress: 0,
		averageInterval: 0,
		velocityChangeDetected: false,
		wordCount: 0,
		hasVelocityBaseline: false,
	});

	// Update keystroke tracking when query changes
	useEffect(() => {
		if (!options.enabled || !query.trim()) return;

		const now = Date.now();

		// Only update when query actually changes
		if (query !== lastQuery.current) {
			keystrokeTimestamps.current.push(now);
			lastKeystrokeTime.current = now;

			// Keep only recent keystrokes for baseline calculation
			const cutoffTime = now - 10000; // 10 seconds
			keystrokeTimestamps.current = keystrokeTimestamps.current.filter(
				(ts) => ts > cutoffTime,
			);

			lastQuery.current = query;
		}
	}, [query, options.enabled]);

	// Continuous velocity checking timer
	useEffect(() => {
		if (!options.enabled || !query.trim() || !lastKeystrokeTime.current) return;

		let timer: NodeJS.Timeout;

		const checkVelocity = () => {
			const now = Date.now();
			const timeSinceLastKeypress = now - lastKeystrokeTime.current;

			// Stop checking after 5 seconds of no typing
			if (timeSinceLastKeypress > 5000) {
				if (timer) clearInterval(timer);
				return;
			}

			// Calculate current average interval
			const averageInterval = calculateAverageInterval(
				keystrokeTimestamps.current,
				options.maxIntervalForBaseline,
			);

			// Establish baseline if we have enough data
			if (
				!baselineInterval.current &&
				keystrokeTimestamps.current.length >= options.minBaselineKeystrokes
			) {
				baselineInterval.current = averageInterval;
			}

			// Detect velocity change
			const hasBaseline = baselineInterval.current !== null;
			const velocityChangeDetected =
				hasBaseline &&
				timeSinceLastKeypress >
					baselineInterval.current! * options.velocityChangeThreshold;

			// Analyze current query
			const { wordCount } = analyzeQuery(query);
			const wordCountChanged = wordCount !== lastWordCount.current;

			// Determine if typing fast (relative to baseline)
			const isTypingFast =
				hasBaseline &&
				timeSinceLastKeypress < baselineInterval.current! &&
				timeSinceLastKeypress < 200; // Also consider absolute threshold

				const newTypingState = {
				isTypingFast,
				timeSinceLastKeypress,
				averageInterval,
				velocityChangeDetected: velocityChangeDetected, // Remove the wordCountChanged requirement
				wordCount,
				hasVelocityBaseline: hasBaseline,
			};

			setTypingState(newTypingState);
			lastWordCount.current = wordCount;
		};

		timer = setInterval(checkVelocity, 200); // Check every 200ms

		return () => {
			if (timer) clearInterval(timer);
		};
	}, [query, options, calculateAverageInterval, analyzeQuery]);

	// Intent classification based on current typing state
	const detectedIntent = (() => {
		if (!options.enabled || !query.trim()) {
			return null;
		}

		const { wordCount, words, lastWord } = analyzeQuery(query);

		// Immediate classification for house numbers (unambiguous)
		const hasHouseNumber = /^(\d+[a-z]?([/-]\d+[a-z]?)*)\s+/.test(
			query.toLowerCase(),
		);
		const hasUnitNumber =
			/^(unit|apt|apartment|suite|shop|level|floor|lot|u|g|l|b)\s*\d+[a-z]?([/-]\d+[a-z]?)*[,\s]/i.test(
				query.toLowerCase(),
			) || /^[a-z]?\d+([/-]\d+[a-z]?)*[,/]\s*\d+\s+/.test(query.toLowerCase());

		if (hasHouseNumber || hasUnitNumber) {
			return "address";
		} else if (
			wordCount === 1 &&
			typingState.velocityChangeDetected &&
			typingState.hasVelocityBaseline
		) {
			// User paused after first word - optimistically classify as suburb
				return "suburb";
		} else if (wordCount >= 2) {
			// Check if second (or last) word is thoroughfare type
			if (isThoroughfareWord(lastWord)) {
				return "street";
			} else {
				// User continued but it's not a thoroughfare - still a suburb (e.g., "Box Hill")
				return "suburb";
			}
		} else {
			// Still typing or uncertain - stay general
			return "general";
		}
	})();

	const shouldClassify =
		detectedIntent !== null && detectedIntent !== currentIntent;

	return {
		shouldClassify,
		detectedIntent,
		typingState,
	};
}
