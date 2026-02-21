# React Starter Kit - Convex Backend

This directory contains the Convex serverless functions and database schema for the React Starter Kit.

## 📁 Project Structure

```
convex/
├── address/              # Address & location services (Google Places API)
│   ├── getPlaceSuggestions.ts   # Place autocomplete with intent classification
│   ├── validateAddress.ts      # Google Address Validation API
│   ├── getPlaceDetails.ts      # Place details with coordinates
│   ├── getNearbyAldiStores.ts  # Location-based store finder
│   ├── utils.ts               # Address processing utilities
│   ├── types.ts               # TypeScript interfaces
│   └── index.ts               # Consolidated API exports
├── schemas/              # Database schema definitions
│   ├── users.ts              # User account schema
│   ├── subscriptions.ts      # Polar.sh subscription schema  
│   ├── searches.ts           # Search history tracking
│   ├── userPreferences.ts    # User settings and preferences
│   ├── webhooks.ts           # Webhook event schema
│   └── index.ts              # Schema registration
├── testing/              # Comprehensive test utilities
│   ├── validationTestCases.ts   # 762 address validation test cases
│   ├── runValidationTests.ts    # Test execution framework
│   └── transcriptionSimulator.ts # Voice transcription testing
├── utils/                # Shared utilities
│   └── logger.ts             # Logging utilities
├── agentTools.ts         # ElevenLabs agent tool registry
├── auth.config.ts        # Clerk authentication configuration
├── http.ts               # HTTP endpoints and webhooks
├── subscriptions.ts      # Polar.sh subscription management
├── users.ts              # User management functions
└── NAMING_CONVENTIONS.md # API naming standards
```

## 🚀 Key APIs

### Address Services (`api.address.*`)
```ts
// Place suggestions with intent classification
const suggestions = await convex.action(api.address.getPlaceSuggestions.getPlaceSuggestions, {
  query: "18A Chaucer Crescent, Canterbury",
  intent: "address",
  maxResults: 5
});

// Address validation using Google Address Validation API
const validation = await convex.action(api.address.validateAddress.validateAddress, {
  address: "123 Collins Street, Melbourne VIC 3000"
});

// Place details with coordinates
const details = await convex.action(api.address.getPlaceDetails.getPlaceDetails, {
  placeId: "ChIJgf0RD..."
});
```

### User Management (`api.users.*`)
```ts
const user = await convex.query(api.users.getCurrentUser);
const updated = await convex.mutation(api.users.updateProfile, { name: "New Name" });
```

### Subscriptions (`api.subscriptions.*`)
```ts
const status = await convex.query(api.subscriptions.checkUserSubscriptionStatus, { userId });
const plans = await convex.action(api.subscriptions.getAvailablePlans);
```

## 🎯 Architecture Highlights

- **Modular Organization**: Functions grouped by domain (address, users, subscriptions)
- **Type Safety**: Full TypeScript with Zod validation for all function arguments
- **Australian Focus**: Specialized address validation for Australian addresses
- **Comprehensive Testing**: 762 test cases covering real Melbourne geography
- **ElevenLabs Integration**: Voice AI agent tools with client-side integration
- **Naming Convention**: Consistent `[module].[action]` pattern (see `NAMING_CONVENTIONS.md`)

## 🧪 Testing

The `testing/` directory contains comprehensive validation test cases:
- **Real Geographic Data**: Actual Melbourne street/suburb combinations
- **Voice Transcription Patterns**: Common speech-to-text errors
- **Edge Cases**: Unit formatting, postcode mismatches, cross-city confusion
- **Test Categories**: Invalid suburbs, streets, transcription errors, valid addresses

## 📝 Development Guidelines

1. **Follow naming conventions**: Use `[module].[action]` pattern
2. **Validate all inputs**: Use Zod validators for type safety
3. **Document functions**: Include clear descriptions and examples
4. **Test thoroughly**: Use existing test framework for address functions
5. **Handle errors gracefully**: Implement proper error responses

## 🔧 Environment Variables

Required for address services:
```bash
GOOGLE_MAPS_API_KEY=your_GOOGLE_MAPS_API_KEY_here
```

See `../CLAUDE.md` for complete environment setup.

## 📚 Learn More

- [Convex Documentation](https://docs.convex.dev/)
- [Project Documentation](../CLAUDE.md)
- [API Naming Conventions](./NAMING_CONVENTIONS.md)
- [Address Testing Guide](./testing/README.md)
