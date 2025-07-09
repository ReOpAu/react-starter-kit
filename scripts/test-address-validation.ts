#!/usr/bin/env tsx
// CI/CD script for running address validation accuracy tests
// Usage: npm run test:validation or yarn test:validation

import { ConvexHttpClient } from "convex/browser";

// Initialize Convex client for testing
const convex = new ConvexHttpClient(process.env.VITE_CONVEX_URL || "");

interface TestConfig {
	categories?: string[];
	maxTestsPerCategory?: number;
	includeTranscriptionVariations?: boolean;
	exitOnFailure?: boolean;
	minAccuracyThreshold?: number;
}

// Default test configuration for CI
const defaultConfig: TestConfig = {
	categories: ["invalid_suburb", "invalid_street", "valid_address"],
	maxTestsPerCategory: 5,
	includeTranscriptionVariations: true,
	exitOnFailure: true,
	minAccuracyThreshold: 70, // 70% accuracy minimum for CI to pass
};

async function runValidationTests(config: TestConfig = defaultConfig) {
	console.log("🧪 Starting Address Validation Accuracy Tests...");
	console.log("Configuration:", JSON.stringify(config, null, 2));
	
	try {
		// Call the Convex action to run tests
		const result = await convex.action("testing/runValidationTests:runValidationAccuracyTests", {
			categories: config.categories,
			maxTestsPerCategory: config.maxTestsPerCategory,
			includeTranscriptionVariations: config.includeTranscriptionVariations,
		});

		if (!result.success) {
			console.error("❌ Test execution failed:", result.error);
			if (config.exitOnFailure) {
				process.exit(1);
			}
			return false;
		}

		const summary = result.summary;
		if (!summary) {
			console.error("❌ No test summary returned");
			if (config.exitOnFailure) {
				process.exit(1);
			}
			return false;
		}

		// Display results
		console.log("\n📊 Test Results Summary:");
		console.log(`Total Tests: ${summary.totalTests}`);
		console.log(`Passed: ${summary.passed}`);
		console.log(`Failed: ${summary.failed}`);
		console.log(`Accuracy: ${summary.accuracy.toFixed(1)}%`);

		// Check against threshold
		const passedThreshold = summary.accuracy >= (config.minAccuracyThreshold || 0);
		
		if (passedThreshold) {
			console.log(`✅ Tests PASSED - Accuracy ${summary.accuracy.toFixed(1)}% meets threshold of ${config.minAccuracyThreshold}%`);
		} else {
			console.log(`❌ Tests FAILED - Accuracy ${summary.accuracy.toFixed(1)}% below threshold of ${config.minAccuracyThreshold}%`);
		}

		// Display detailed category results if available
		if (result.results?.categoryResults) {
			console.log("\n📈 Category Breakdown:");
			for (const [category, stats] of Object.entries(result.results.categoryResults)) {
				console.log(`  ${category}: ${stats.passed}/${stats.total} (${stats.accuracy.toFixed(1)}%)`);
			}
		}

		// List critical failures
		if (result.results?.results) {
			const criticalFailures = result.results.results.filter((r: any) => 
				!r.passed && (r.testCase.category === "invalid_suburb" || r.testCase.category === "invalid_street")
			);
			
			if (criticalFailures.length > 0) {
				console.log("\n🚨 Critical Failures (Should have been caught):");
				for (const failure of criticalFailures) {
					console.log(`  - ${failure.testCase.id}: ${failure.testCase.input}`);
					console.log(`    Reason: ${failure.notes}`);
				}
			}
		}

		// Exit based on results
		if (config.exitOnFailure && !passedThreshold) {
			console.log("\n💥 Exiting due to failed accuracy threshold");
			process.exit(1);
		}

		return passedThreshold;

	} catch (error) {
		console.error("❌ Test execution error:", error);
		if (config.exitOnFailure) {
			process.exit(1);
		}
		return false;
	}
}

// Test specific known problematic addresses
async function testKnownIssues() {
	console.log("\n🔍 Testing Known Problematic Addresses...");
	
	const knownIssues = [
		{
			address: "18A Chaucer Crescent, Camberwell VIC 3126",
			shouldFail: true,
			reason: "Chaucer Crescent is in Canterbury, not Camberwell"
		},
		{
			address: "999 Collins Street, Richmond VIC 3121", 
			shouldFail: true,
			reason: "Collins Street doesn't extend to Richmond"
		},
		{
			address: "18A Chaucer Crescent, Canterbury VIC 3124",
			shouldFail: false,
			reason: "Correct address should validate"
		}
	];

	let allPassed = true;

	for (const issue of knownIssues) {
		try {
			const result = await convex.action("testing/runValidationTests:testSingleAddress", {
				address: issue.address,
				expectedResult: issue.shouldFail ? "SHOULD_FAIL" : "SHOULD_PASS"
			});

			if (result.success && result.result) {
				const isValid = result.result.success;
				const testPassed = issue.shouldFail ? !isValid : isValid;
				
				console.log(`  ${testPassed ? "✅" : "❌"} ${issue.address}`);
				console.log(`    Expected: ${issue.shouldFail ? "FAIL" : "PASS"}, Got: ${isValid ? "PASS" : "FAIL"}`);
				console.log(`    Reason: ${issue.reason}`);
				
				if (!testPassed) {
					allPassed = false;
				}
			} else {
				console.log(`  ❌ ${issue.address} - Test execution failed`);
				allPassed = false;
			}
		} catch (error) {
			console.log(`  ❌ ${issue.address} - Error: ${error}`);
			allPassed = false;
		}
	}

	return allPassed;
}

// Main execution
async function main() {
	const args = process.argv.slice(2);
	const isCI = process.env.CI === "true" || args.includes("--ci");
	
	console.log(`🏃‍♂️ Running in ${isCI ? "CI" : "local"} mode`);

	// Configuration for different environments
	const config: TestConfig = isCI 
		? {
			...defaultConfig,
			exitOnFailure: true,
			minAccuracyThreshold: 75, // Stricter for CI
		}
		: {
			...defaultConfig,
			exitOnFailure: false,
			minAccuracyThreshold: 60, // More lenient for local dev
		};

	// Run main test suite
	const testsPassed = await runValidationTests(config);
	
	// Run known issue tests
	const knownIssuesPassed = await testKnownIssues();

	// Final summary
	console.log("\n🏁 Final Results:");
	console.log(`Main Tests: ${testsPassed ? "✅ PASSED" : "❌ FAILED"}`);
	console.log(`Known Issues: ${knownIssuesPassed ? "✅ PASSED" : "❌ FAILED"}`);

	const overallPassed = testsPassed && knownIssuesPassed;
	console.log(`Overall: ${overallPassed ? "✅ PASSED" : "❌ FAILED"}`);

	if (isCI && !overallPassed) {
		console.log("\n💥 CI failing due to validation accuracy issues");
		process.exit(1);
	}

	if (!overallPassed) {
		console.log("\n⚠️  Address validation has accuracy issues that need attention");
	}
}

// Handle CLI execution
if (require.main === module) {
	main().catch((error) => {
		console.error("❌ Script execution failed:", error);
		process.exit(1);
	});
}

export { runValidationTests, testKnownIssues };