# Address Validation Test Framework

A comprehensive test suite to systematically assess Google's Address Validation API accuracy and catch geocoding errors like the "Chaucer Crescent, Camberwell" issue.

## Overview

This framework tests address validation against known invalid addresses, transcription errors, and edge cases to ensure our validation system catches false positives from Google's API.

**📊 Test Coverage:**
- **75+ Test Cases** across 5 categories
- **50+ Transcription Error Patterns** for voice simulation  
- **Melbourne-focused** with real suburb/street combinations
- **Critical Cases** like the Chaucer Crescent, Camberwell issue

## Quick Start

### Run Tests Locally
```bash
# Run all validation tests
npm run test:validation

# Run for CI (stricter thresholds)
npm run test:validation:ci
```

### Use Test Dashboard
Navigate to `/address-validation-tests` in your browser for an interactive dashboard.

## Test Categories

### 1. Invalid Suburb Tests (20+ cases)
**Purpose**: Catch addresses where Google validates the wrong suburb
- `18A Chaucer Crescent, Camberwell VIC 3126` → Should FAIL (Chaucer Crescent is in Canterbury)
- `999 Collins Street, Richmond VIC 3121` → Should FAIL (Collins Street is in Melbourne CBD)
- `234 Burke Road, Malvern VIC 3144` → Should FAIL (Burke Road is in Camberwell)
- `567 Toorak Road, Richmond VIC 3121` → Should FAIL (Toorak Road is in Toorak)
- `88 Flinders Lane, Collingwood VIC 3066` → Should FAIL (Flinders Lane is in Melbourne CBD)
- Cross-city confusion (High Street, Church Street spanning multiple suburbs)
- Postcode mismatches (Melbourne 3141, Richmond 3000, etc.)

### 2. Invalid Street Tests (15+ cases) 
**Purpose**: Catch non-existent streets
- `123 Fake Street, Melbourne VIC 3000` → Should FAIL
- `789 George Street, Melbourne VIC 3000` → Should FAIL (George Street is Sydney)
- `234 Pitt Street, Melbourne VIC 3000` → Should FAIL (Pitt Street is Sydney)
- `567 Collins Street, Sydney NSW 2000` → Should FAIL (Collins Street is Melbourne)
- Rural address confusion (Collins Street in Pakenham, Ballarat)

### 3. Transcription Error Tests (25+ cases)
**Purpose**: Simulate ElevenLabs voice-to-text errors
- **Suburb Confusion**: Canterbury ↔ Camberwell, Prahran variants, South Yarra mishearings
- **Street Type**: Street/St, Crescent/Cres, Avenue/Ave, Road/Rd, Drive/Dr
- **Number Confusion**: 18→80, 15→50, 14→40 (teen vs. -ty confusion)
- **Postcode Errors**: 3124↔3126, 3121 variants, 3181↔3182
- **Unit Format**: Unit/Apt/Level confusion
- **State**: VIC/Victoria variations

### 4. Valid Address Tests (12+ cases)
**Purpose**: Ensure legitimate addresses pass validation
- `18A Chaucer Crescent, Canterbury VIC 3124` → Should PASS
- `123 Collins Street, Melbourne VIC 3000` → Should PASS
- `300 Chapel Street, Prahran VIC 3181` → Should PASS
- `234 Church Street, Richmond VIC 3121` → Should PASS
- `456 Brunswick Street, Fitzroy VIC 3065` → Should PASS
- Rural highways (Princes Highway, Hume Highway)
- Unit formats (Unit 5/123 Collins Street)

### 5. Borderline Cases (8+ cases)
**Purpose**: Document unclear validation behavior
- Boundary roads spanning multiple suburbs
- High Street numbering across suburbs
- Station Street generic locations
- Shopping center address formats

## Files Structure

```
convex/testing/
├── validationTestCases.ts      # Test data and scenarios
├── runValidationTests.ts       # Automated test runner
└── transcriptionSimulator.ts   # Voice transcription error simulation

app/routes/
└── address-validation-tests.tsx # Interactive test dashboard

scripts/
└── test-address-validation.ts   # CI/CD test runner
```

## Test Configuration

### Environment Variables Required
```bash
GOOGLE_MAPS_API_KEY=your_key_here
VITE_CONVEX_URL=your_convex_url
```

### CI Thresholds
- **Local Development**: 60% accuracy minimum
- **CI Pipeline**: 75% accuracy minimum
- **Critical Tests**: Invalid suburb/street tests must pass

## API Usage

### Run Full Test Suite
```typescript
// Via Convex action
const result = await convex.action("testing/runValidationTests:runValidationAccuracyTests", {
  categories: ["invalid_suburb", "invalid_street"],
  maxTestsPerCategory: 5,
  includeTranscriptionVariations: true
});
```

### Test Single Address
```typescript
const result = await convex.action("testing/runValidationTests:testSingleAddress", {
  address: "18A Chaucer Crescent, Camberwell VIC 3126",
  expectedResult: "SHOULD_FAIL"
});
```

### Quick Category Test
```typescript
const result = await convex.action("testing/runValidationTests:quickValidationTest", {
  category: "invalid_suburb",
  maxTests: 3
});
```

## Adding New Test Cases

### 1. Add to Test Data
Edit `convex/testing/validationTestCases.ts`:

```typescript
{
  id: "your_test_case",
  input: "123 Problem Street, Wrong Suburb VIC 1234",
  expected: "SHOULD_FAIL",
  reason: "Problem Street is actually in Correct Suburb",
  actualSuburb: "Correct Suburb",
  postcode: "5678",
  category: "invalid_suburb"
}
```

### 2. Add Transcription Patterns
Add to `transcriptionSimulator.ts`:

```typescript
{
  correct: "Problem Street",
  phoneticErrors: ["Problem St", "Problm Street", "Problem Steet"],
  phoneticDistance: 0.8,
  frequency: "high"
}
```

## Interpreting Results

### Test Scores
- **PASS**: Test behaved as expected
- **FAIL**: Validation didn't match expectation (potential issue)
- **UNEXPECTED**: Borderline case for manual review

### Critical Failures
Tests that FAIL in these categories indicate serious validation issues:
- `invalid_suburb`: Google validated an address with wrong suburb
- `invalid_street`: Google validated a non-existent street

### Example Output
```
📊 Test Results Summary:
Total Tests: 25
Passed: 18
Failed: 5
Accuracy: 72.0%

🚨 Critical Failures:
- chaucer_camberwell: 18A Chaucer Crescent, Camberwell VIC 3126
  Reason: Should have failed but incorrectly validated
```

## Integration with CI/CD

### GitHub Actions Example
```yaml
- name: Run Address Validation Tests
  run: npm run test:validation:ci
  env:
    GOOGLE_MAPS_API_KEY: ${{ secrets.GOOGLE_MAPS_API_KEY }}
    VITE_CONVEX_URL: ${{ secrets.CONVEX_URL }}
```

### Test Reports
The framework generates detailed reports showing:
- Overall accuracy percentage
- Category-specific results  
- Individual test case outcomes
- Critical failure details
- Execution times

## Monitoring & Alerts

### Setting Up Alerts
Monitor these metrics:
- Overall validation accuracy drops below 70%
- Critical suburb/street validation failures
- New false positive patterns emerging

### Regular Testing
- Run full test suite weekly
- Add new problematic addresses as discovered
- Update thresholds based on business requirements

## Troubleshooting

### Common Issues

**"API key not configured"**
- Ensure `GOOGLE_MAPS_API_KEY` environment variable is set

**"Test execution failed"**
- Check Convex backend is running (`npx convex dev`)
- Verify network connectivity to Google APIs

**"Unexpected accuracy drop"**
- Review recent changes to validation logic
- Check if Google API behavior has changed
- Analyze specific test failures

### Debug Mode
Enable detailed logging by setting:
```bash
DEBUG=address-validation
```

## Future Enhancements

### Planned Features
- [ ] Automated daily accuracy monitoring
- [ ] Machine learning-based error pattern detection
- [ ] Integration with address validation service alternatives
- [ ] Real-time validation accuracy dashboard
- [ ] Historical accuracy trend analysis

### Contributing
1. Add test cases for discovered edge cases
2. Update transcription patterns based on real voice data
3. Enhance error classification accuracy
4. Improve test execution performance

## Related Documentation
- [Address Finder Architecture](./CLAUDE.md#architecture-overview)
- [Confidence Scoring System](./convex/address/utils.ts)
- [Voice Transcription Integration](./app/hooks/useAddressFinderClientTools.ts)