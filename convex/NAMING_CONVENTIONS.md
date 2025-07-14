# Convex Function Naming Conventions

## Standard Pattern: `[module].[action]`

### **Address Module** ✅ Standardized
- `api.address.getPlaceSuggestions` - Get place suggestions with intent classification
- `api.address.validateAddress` - Validate address using Google Address Validation API  
- `api.address.getPlaceDetails` - Get detailed place information including coordinates

### **User Module** ✅ Existing
- `api.users.getCurrentUser` - Get current authenticated user
- `api.users.updateProfile` - Update user profile information

### **Subscription Module** ✅ Existing  
- `api.subscriptions.createSubscription` - Create new subscription
- `api.subscriptions.updateSubscription` - Update existing subscription
- `api.subscriptions.cancelSubscription` - Cancel subscription

### **Proposed Future Modules**

#### **Search Module** (AFOP Implementation)
- `api.search.saveSearchHistory` - Save user search to history
- `api.search.getUserSearchHistory` - Get user's search history
- `api.search.trackSearchEvent` - Track search analytics event

#### **Analytics Module** (AFOP Implementation)
- `api.analytics.trackEvent` - Track user analytics event
- `api.analytics.getSearchMetrics` - Get search success metrics
- `api.analytics.getUserMetrics` - Get user-specific metrics

#### **Preferences Module** (AFOP Implementation)
- `api.preferences.getUserPreferences` - Get user's preferences
- `api.preferences.updatePreferences` - Update user preferences
- `api.preferences.resetToDefaults` - Reset preferences to defaults

## **Action Types by Suffix**

### **Queries** (Read Operations)
- `get*` - Retrieve single item (e.g., `getCurrentUser`)
- `list*` - Retrieve multiple items (e.g., `listSubscriptions`)
- `find*` - Search/filter items (e.g., `findNearbyStores`)

### **Mutations** (Write Operations)
- `create*` - Create new item (e.g., `createSubscription`)
- `update*` - Update existing item (e.g., `updateProfile`)
- `delete*` - Remove item (e.g., `deleteSubscription`)
- `save*` - Upsert operation (e.g., `saveSearchHistory`)

### **Actions** (External API Calls)
- `validate*` - External validation (e.g., `validateAddress`)
- `fetch*` - External data fetch (e.g., `fetchPlaceDetails`)
- `sync*` - External synchronization (e.g., `syncUserData`)

## **Legacy Cleanup Status**

### **❌ To Remove** (After Migration Complete)
- `api.addressFinder.search` → `api.address.getPlaceSuggestions`
- `api.autocomplete.autocompleteAddresses` → `api.address.getPlaceSuggestions`
- `api.suburbLookup.getPlaceSuggestions` → `api.address.getPlaceSuggestions`
- `api.suburbLookup.validateAddress` → `api.address.validateAddress`
- `api.suburbLookup.lookupSuburb` → `api.address.getPlaceSuggestions`

### **✅ Standardized**
- `api.address.*` - All address functions follow convention
- `api.users.*` - User functions follow convention
- `api.subscriptions.*` - Subscription functions follow convention

## **Migration Checklist**

- [x] Create bridge module (`convex/address/index.ts`)
- [ ] Update frontend imports from legacy to `api.address.*`
- [ ] Remove legacy files after migration verification
- [ ] Implement AFOP modules with standard naming
- [ ] Add naming convention validation to CI/CD

## **Examples**

```typescript
// ✅ Good - Follows [module].[action] pattern
const suggestions = await convex.action(api.address.getPlaceSuggestions, {
  query: "Melbourne",
  intent: "suburb"
});

const validation = await convex.action(api.address.validateAddress, {
  address: "123 Collins Street, Melbourne VIC 3000"
});

// ❌ Bad - Legacy scattered naming  
const suggestions = await convex.action(api.suburbLookup.getPlaceSuggestions, {
  query: "Melbourne"
});

const search = await convex.action(api.addressFinder.search, {
  query: "Collins Street"
});
```

## **Benefits of Standardization**

1. **Predictable API** - Developers know where to find functions
2. **Better IDE Support** - Autocomplete works consistently  
3. **Easier Maintenance** - Clear ownership of functions
4. **Simplified Documentation** - Consistent patterns to document
5. **Testing Clarity** - Clear module boundaries for test organization