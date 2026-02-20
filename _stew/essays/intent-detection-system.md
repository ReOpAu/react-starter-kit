# Intent Detection in the Address Finder

## An Essay on Classification Heuristics

### Overview

The Address Finder uses a multi-signal intent classification system to determine whether a user's search query represents a suburb, street, or full street address. This determination is critical because it categorises Listings in the database, affecting how they are searched, filtered, and displayed throughout the application. The current implementation relies entirely on client-side heuristics—regex pattern matching and typing velocity analysis—rather than server-side validation or machine learning.

### The Intent Types

The system classifies queries into four categories:

- **general**: The default state when the system cannot determine intent or the user is still typing.
- **suburb**: A locality name without street identification—examples include "Footscray," "Newcastle," or "Paddington."
- **street**: A thoroughfare name without a house number—examples include "Main Street," "George Street," or "Victoria Road." Note that this includes both the street name and its type (Street, Road, Avenue, etc.).
- **address**: A complete street address with a house number—examples include "123 Main Street," "Unit 4 56 Smith Road," or "PO Box 789."

The intent is stored with each Listing and used for database queries, filtering, and display logic throughout the application.

### Signal 1: House Number Detection

The most unambiguous signal is whether the query begins with a number. Street addresses universally start with a house number, making this a highly reliable indicator. The implementation uses a regular expression that handles various Australian address formats:

```typescript
const hasHouseNumber = /^(\d+[a-z]?([/-]\d+[a-z]?)*)\s+/.test(query.toLowerCase());
```

This regex matches patterns like "123," "123A," "12/34," and "12-34" at the start of the string, followed by whitespace. It correctly identifies the majority of full addresses.

The system also detects unit and apartment numbers, which may appear before the street address in various formats:

```typescript
const hasUnitNumber =
  /^(unit|apt|apartment|suite|shop|level|floor|lot|u|g|l|b)\s*\d+[a-z]?([/-]\d+[a-z]?)*[,\s]/i.test(query.toLowerCase())
  || /^[a-z]?\d+([/-]\d+[a-z]?)*[,/]\s*\d+\s+/.test(query.toLowerCase());
```

This catches formats like "Unit 4, 56 Smith Street" and "4/56 Smith Street." If either house number or unit number is detected, the intent is immediately classified as "address" with high confidence.

### Signal 2: Thoroughfare Keyword Detection

When the query does not start with a number, the system examines the final word to detect street types. Australia has a rich variety of thoroughfare names, and the implementation includes over 200 keywords covering common and obscure street types. These are grouped by category:

- **Common thoroughfares**: Street, Road, Avenue, Lane, Drive, Way
- **Curved and circular**: Crescent, Circuit, Court, Circle, Loop
- **Elevated areas**: Terrace, Rise, Ridge, Hill, Heights, View, Vista
- **Pedestrian**: Walk, Parade, Mews, Close
- **Major roads**: Highway, Freeway, Motorway, Expressway
- **Directions**: North, South, East, West (often used in road names)

The keyword matching is aggressive, supporting partial matches. For example, "St" matches "Street," "Rd" matches "Road," and "Cres" matches "Crescent." The matching algorithm accepts prefixes as short as two characters:

```typescript
if (lowerWord.length >= 2) {
  const partialMatches = [
    { partial: "st", full: "street", minLength: 2 },
    { partial: "ave", full: "avenue", minLength: 2 },
    { partial: "dr", full: "drive", minLength: 2 },
    // ... 80+ more patterns
  ];
}
```

When the last word of the query matches any thoroughfare keyword, the intent is classified as "street."

### Signal 3: Velocity-Based Classification

The most innovative aspect of the system is its use of typing velocity to classify single-word queries. When a user types a single word and then pauses, the system detects this as a potential suburb name rather than the beginning of a street address.

The velocity detection works by establishing a baseline typing speed from the first few keystrokes. It then monitors for a significant pause—defined as a delay more than twice the baseline interval:

```typescript
const velocityChangeDetected =
  hasBaseline &&
  timeSinceLastKeypress > baselineInterval.current! * options.velocityChangeThreshold;
```

The configuration parameters control sensitivity:

- **velocityChangeThreshold**: 2.0 (pause must be 2x longer than average typing interval)
- **minBaselineKeystrokes**: 3 (minimum keystrokes to establish baseline)
- **maxIntervalForBaseline**: 1000ms (intervals longer than this are excluded from baseline)

When a user types a single word and pauses, the system optimistically classifies it as "suburb" under the theory that someone typing an address would continue with a number.

### Signal 4: Default Fallback

If none of the above signals apply—typically when the user is still typing or has entered fewer than two words without a pause—the system defaults to "general." This indicates uncertainty and prevents premature classification.

### The Decision Tree

Putting these signals together, the classification follows this priority:

1. Does the query start with a house number or unit identifier? → **address**
2. Does the user pause after typing a single word? → **suburb**
3. Does the final word match a thoroughfare keyword? → **street**
4. Otherwise → **general**

### Current Limitations

The heuristic approach has inherent limitations that prevent 100% accuracy:

- **Velocity is device-dependent**: Slow devices or network lag could produce false positives.
- **Ambiguous queries**: "Main Street Sydney" is classified as "street" but is actually a suburb plus state.
- **Australian-specific patterns**: The system may not handle uniquely Australian formats like "PO Box," "Locked Bag," or "C/-" (care of).
- **No ground truth**: The system predicts based on input patterns rather than verifying against known data.

### The Case for API-Driven Verification

The Google Places API returns detailed type information for each result, including classifications like "street_address," "premise," "locality," "sublocality," and "route." This data provides a definitive answer about what the result actually represents. Using API response types as the source of truth would likely achieve 99%+ accuracy compared to the current heuristic approach.

However, the current heuristic system is elegant in its simplicity and requires no additional API calls. For voice-first interactions where the AI agent handles ambiguity, it provides a reasonable starting classification that can be corrected through conversation.

### Conclusion

The intent detection system demonstrates sophisticated multi-signal analysis, combining regex pattern matching, keyword detection, and behavioural typing analysis. It handles the majority of Australian address queries correctly and provides immediate client-side classification without round-trips to the server. For the remaining edge cases, the system defaults to a general classification that can be refined through user interaction or future API-driven verification.
