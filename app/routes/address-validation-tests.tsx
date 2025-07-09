import { useState } from "react";
import { api } from "convex/_generated/api";
import { useAction } from "convex/react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";

interface TestResult {
	testCase: {
		id: string;
		input: string;
		expected: string;
		reason: string;
		category: string;
	};
	actualResult: {
		isValid: boolean;
		formattedAddress?: string;
		error?: string;
	};
	passed: boolean;
	score: "PASS" | "FAIL" | "UNEXPECTED";
	notes: string;
	executionTime: number;
}

interface TestSuiteResult {
	totalTests: number;
	passed: number;
	failed: number;
	unexpected: number;
	accuracy: number;
	categoryResults: Record<string, {
		total: number;
		passed: number;
		accuracy: number;
	}>;
	results: TestResult[];
	executionTime: number;
	timestamp: string;
}

export default function AddressValidationTests() {
	const [testResults, setTestResults] = useState<TestSuiteResult | null>(null);
	const [isRunning, setIsRunning] = useState(false);
	const [selectedCategory, setSelectedCategory] = useState<string>("all");
	const [singleTestAddress, setSingleTestAddress] = useState("");
	const [singleTestResult, setSingleTestResult] = useState<any>(null);

	const runValidationTests = useAction(api.testing.runValidationTests.runValidationAccuracyTests);
	const runQuickTest = useAction(api.testing.runValidationTests.quickValidationTest);
	const testSingleAddress = useAction(api.testing.runValidationTests.testSingleAddress);

	const categories = [
		"all",
		"invalid_suburb", 
		"invalid_street",
		"transcription_error",
		"borderline",
		"valid_address"
	];

	const handleRunTests = async () => {
		setIsRunning(true);
		try {
			const result = await runValidationTests({
				categories: selectedCategory === "all" ? undefined : [selectedCategory],
				maxTestsPerCategory: 10,
				includeTranscriptionVariations: true,
			});

			if (result.success && result.results) {
				setTestResults(result.results as TestSuiteResult);
			} else {
				console.error("Test failed:", result.error);
			}
		} catch (error) {
			console.error("Test execution failed:", error);
		} finally {
			setIsRunning(false);
		}
	};

	const handleQuickTest = async (category: string) => {
		setIsRunning(true);
		try {
			const result = await runQuickTest({
				category,
				maxTests: 3,
			});
			console.log(`Quick test result for ${category}:`, result.summary);
		} catch (error) {
			console.error("Quick test failed:", error);
		} finally {
			setIsRunning(false);
		}
	};

	const handleSingleTest = async () => {
		if (!singleTestAddress.trim()) return;

		setIsRunning(true);
		try {
			const result = await testSingleAddress({
				address: singleTestAddress,
				expectedResult: "BORDERLINE", // Let user interpret
			});
			setSingleTestResult(result);
		} catch (error) {
			console.error("Single test failed:", error);
		} finally {
			setIsRunning(false);
		}
	};

	const getScoreBadgeColor = (score: string) => {
		switch (score) {
			case "PASS": return "bg-green-100 text-green-800";
			case "FAIL": return "bg-red-100 text-red-800"; 
			case "UNEXPECTED": return "bg-yellow-100 text-yellow-800";
			default: return "bg-gray-100 text-gray-800";
		}
	};

	const getCategoryColor = (category: string) => {
		switch (category) {
			case "invalid_suburb": return "bg-red-50 text-red-700";
			case "invalid_street": return "bg-orange-50 text-orange-700";
			case "transcription_error": return "bg-purple-50 text-purple-700";
			case "borderline": return "bg-yellow-50 text-yellow-700";
			case "valid_address": return "bg-green-50 text-green-700";
			default: return "bg-gray-50 text-gray-700";
		}
	};

	return (
		<div className="container mx-auto py-8 px-4 max-w-6xl">
			<div className="space-y-6">
				{/* Header */}
				<div className="text-center space-y-2">
					<h1 className="text-3xl font-bold">Address Validation Test Suite</h1>
					<p className="text-gray-600">
						Systematic testing of Google's Address Validation API accuracy
					</p>
				</div>

				{/* Test Controls */}
				<Card>
					<CardHeader>
						<CardTitle>Test Controls</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{/* Category Selection */}
						<div>
							<label className="block text-sm font-medium mb-2">Test Category</label>
							<select 
								value={selectedCategory}
								onChange={(e) => setSelectedCategory(e.target.value)}
								className="w-full p-2 border rounded-md"
								disabled={isRunning}
							>
								{categories.map(cat => (
									<option key={cat} value={cat}>
										{cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
									</option>
								))}
							</select>
						</div>

						{/* Action Buttons */}
						<div className="flex gap-2 flex-wrap">
							<Button 
								onClick={handleRunTests}
								disabled={isRunning}
								className="flex-1 min-w-32"
							>
								{isRunning ? "Running..." : "Run Full Test Suite"}
							</Button>
							
							<Button 
								variant="outline" 
								onClick={() => handleQuickTest(selectedCategory)}
								disabled={isRunning || selectedCategory === "all"}
								className="flex-1 min-w-32"
							>
								Quick Test
							</Button>
						</div>

						{/* Quick Category Tests */}
						<div className="grid grid-cols-2 md:grid-cols-3 gap-2">
							{categories.filter(c => c !== "all").map(category => (
								<Button
									key={category}
									variant="outline"
									size="sm"
									onClick={() => handleQuickTest(category)}
									disabled={isRunning}
									className="text-xs"
								>
									Test {category.replace(/_/g, ' ')}
								</Button>
							))}
						</div>
					</CardContent>
				</Card>

				{/* Single Address Test */}
				<Card>
					<CardHeader>
						<CardTitle>Test Single Address</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex gap-2">
							<input
								type="text"
								value={singleTestAddress}
								onChange={(e) => setSingleTestAddress(e.target.value)}
								placeholder="Enter address to test (e.g., 18A Chaucer Crescent, Camberwell VIC 3126)"
								className="flex-1 p-2 border rounded-md"
								disabled={isRunning}
							/>
							<Button 
								onClick={handleSingleTest}
								disabled={isRunning || !singleTestAddress.trim()}
							>
								Test
							</Button>
						</div>

						{singleTestResult && (
							<div className="bg-gray-50 p-4 rounded-lg">
								<h4 className="font-semibold mb-2">Single Test Result:</h4>
								<pre className="text-sm overflow-auto">
									{JSON.stringify(singleTestResult, null, 2)}
								</pre>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Test Results Summary */}
				{testResults && (
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center justify-between">
								Test Results Summary
								<Badge variant="outline">
									{testResults.accuracy.toFixed(1)}% accuracy
								</Badge>
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							{/* Overall Stats */}
							<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
								<div className="text-center">
									<div className="text-2xl font-bold text-green-600">{testResults.passed}</div>
									<div className="text-sm text-gray-600">Passed</div>
								</div>
								<div className="text-center">
									<div className="text-2xl font-bold text-red-600">{testResults.failed}</div>
									<div className="text-sm text-gray-600">Failed</div>
								</div>
								<div className="text-center">
									<div className="text-2xl font-bold text-yellow-600">{testResults.unexpected}</div>
									<div className="text-sm text-gray-600">Borderline</div>
								</div>
								<div className="text-center">
									<div className="text-2xl font-bold">{testResults.totalTests}</div>
									<div className="text-sm text-gray-600">Total</div>
								</div>
							</div>

							{/* Category Breakdown */}
							<div>
								<h4 className="font-semibold mb-2">Category Results:</h4>
								<div className="grid gap-2">
									{Object.entries(testResults.categoryResults).map(([category, stats]) => (
										<div key={category} className="flex items-center justify-between p-2 bg-gray-50 rounded">
											<span className={`px-2 py-1 rounded text-sm ${getCategoryColor(category)}`}>
												{category.replace(/_/g, ' ')}
											</span>
											<span className="text-sm">
												{stats.passed}/{stats.total} ({stats.accuracy.toFixed(1)}%)
											</span>
										</div>
									))}
								</div>
							</div>

							<Separator />

							{/* Detailed Results */}
							<div>
								<h4 className="font-semibold mb-2">Detailed Test Results:</h4>
								<div className="space-y-2 max-h-96 overflow-y-auto">
									{testResults.results.map((result, index) => (
										<div key={index} className="border rounded-lg p-3">
											<div className="flex items-start justify-between mb-2">
												<div className="flex-1">
													<div className="font-medium text-sm">{result.testCase.id}</div>
													<div className="text-xs text-gray-600 mb-1">{result.testCase.input}</div>
													<div className="text-xs text-gray-500">{result.testCase.reason}</div>
												</div>
												<div className="flex gap-2">
													<Badge className={getCategoryColor(result.testCase.category)}>
														{result.testCase.category}
													</Badge>
													<Badge className={getScoreBadgeColor(result.score)}>
														{result.score}
													</Badge>
												</div>
											</div>
											
											<div className="text-xs space-y-1">
												<div><strong>Expected:</strong> {result.testCase.expected}</div>
												<div><strong>Actual:</strong> {result.actualResult.isValid ? "VALID" : "INVALID"}</div>
												{result.actualResult.error && (
													<div><strong>Error:</strong> {result.actualResult.error}</div>
												)}
												{result.actualResult.formattedAddress && (
													<div><strong>Formatted:</strong> {result.actualResult.formattedAddress}</div>
												)}
												<div><strong>Notes:</strong> {result.notes}</div>
												<div><strong>Time:</strong> {result.executionTime}ms</div>
											</div>
										</div>
									))}
								</div>
							</div>
						</CardContent>
					</Card>
				)}

				{/* Usage Instructions */}
				<Card>
					<CardHeader>
						<CardTitle>How to Use This Test Suite</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3 text-sm text-gray-600">
						<div><strong>Full Test Suite:</strong> Runs comprehensive validation tests across all categories</div>
						<div><strong>Quick Test:</strong> Runs a few tests from selected category for fast feedback</div>
						<div><strong>Single Address:</strong> Test any specific address manually</div>
						<div><strong>Categories:</strong></div>
						<ul className="ml-4 space-y-1">
							<li>• <strong>Invalid Suburb:</strong> Addresses with wrong suburb (like Chaucer Crescent, Camberwell)</li>
							<li>• <strong>Invalid Street:</strong> Non-existent streets</li>
							<li>• <strong>Transcription Error:</strong> Common voice-to-text mistakes</li>
							<li>• <strong>Borderline:</strong> Unclear cases</li>
							<li>• <strong>Valid Address:</strong> Correctly formatted addresses</li>
						</ul>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}