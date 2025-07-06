# Place Discovery System: Vision & Development Guide

## Vision
Enable users (and the agent) to discover places—such as ALDI stores, other supermarkets, hospitals, shopping centers, and more—based on flexible, natural-language criteria. The system should support complex queries like:

> "I want to buy a house near the beach where there is an ALDI store nearby and not too far from a hospital."

The ultimate goal is for the agent to orchestrate a series of searches and filters to identify and recommend suitable locations based on the user's stated needs.

---

## High-Level Architecture & Flow
1. **User Intent Capture**
   - User expresses a need (via UI or conversation), e.g., "Find suburbs near the beach with an ALDI and a hospital nearby."
2. **Agent Interpretation**
   - Agent parses intent, extracts criteria (location, amenities, proximity, etc.).
3. **API Orchestration**
   - Agent triggers a series of backend API calls:
     - Search for candidate locations (e.g., suburbs near the beach).
     - For each candidate, search for required facilities (e.g., ALDI, hospital) within a defined radius.
     - Filter and rank results based on proximity, count, or other user criteria.
4. **Result Aggregation & Presentation**
   - Aggregate and present the most suitable locations to the user, with supporting details (distances, maps, etc.).

---

## Enriching Internal Property Listings with External Context

A key advantage of having your own internal property listings is the ability to act as the single source of truth for property-specific details. This enables the agent to provide exclusive, high-value advice by fusing private data with public, real-time context.

### The Enrichment Workflow

1. **Query Internal Database First**
   - Always start by searching your own property listings for the requested address or property.
   - Retrieve core facts:
     - Property specs (bedrooms, bathrooms, land size, etc.)
     - Features (renovations, amenities)
     - Price (asking, last sale)
     - Listing agent/contact

2. **Enrich with External, Real-Time Context**
   - Make targeted API calls to supplement internal data:
     - **Market & Investment Analysis:**
       - PropTrack/CoreLogic for suburb-level price, growth, rental yield, time on market
     - **Demographic & Community Profile:**
       - ABS API for age, household, education, income, etc.
     - **Local Amenities & Lifestyle:**
       - Google Places API for schools, parks, transport, shopping, etc.

3. **Synthesize and Deliver the Enriched Answer**
   - Combine private and public data into a seamless, valuable response for the user.
   - Example:

> **User:** "Tell me about your listing at 15 simulated Street, West Footscray. Is it a good investment?"
>
> **Virtual Agent:** "Of course. I have the details for our listing at 15 simulated Street.
>
> **The Property:** It's a 3-bedroom, 2-bathroom home with a newly renovated kitchen and a large backyard.
>
> **Investment Analysis:** From an investment perspective, the gross rental yield for houses in West Footscray is currently around 3.4%. Based on the asking price and the median rent of about $630 per week, this property aligns well with the market average. While the median house price in the area has seen a slight dip of around 5% over the last year, the long-term growth trend remains positive.
>
> **Neighbourhood & Lifestyle:** The home is ideal for families, located just a 5-minute walk from Footscray West Primary School and near several parks, including Cruickshank Park. The local community has a median age of 35, and a high percentage of residents are professionals. For commuters, West Footscray train station is about a 10-minute walk away.
>
> If you'd like to inspect the property, our agent [Agent's Name] is available. Would you like me to arrange a viewing?"

#### Value Proposition
- This approach positions the virtual agent as an indispensable advisor.
- It leverages the exclusivity of your listings and enhances their value with comprehensive, real-time market data.
- Clients receive insights they can't get anywhere else, building trust and engagement.

---

## Supported Place/Facility Types
- Supermarkets (e.g., ALDI, Coles, Woolworths)
- Hospitals
- Shopping Centers
- Schools
- Parks
- Beaches
- Public Transport Hubs
- Custom (extensible for future types)

---

## API Orchestration Pattern
- **Step 1:** Identify candidate locations (e.g., suburbs, postcodes, or custom areas).
- **Step 2:** For each candidate, perform place/facility searches using backend APIs (e.g., Google Places, custom datasets).
- **Step 3:** Filter candidates based on presence and proximity of required facilities.
- **Step 4:** Rank or score candidates based on user preferences (e.g., closest to beach, shortest distance to hospital, multiple supermarkets, etc.).
- **Step 5:** Return structured results for agent/user consumption.

---

## Supporting Climate and Geographic Criteria

The system can support user queries about climate (e.g., "not too cold, not too hot") and geography (e.g., "near a beach", "max 2 hour drive from a ski resort"). These criteria are parsed from user intent and incorporated into the orchestration flow alongside facility requirements.

### Example Data Sources/APIs
- **Climate Data:** Bureau of Meteorology, OpenWeatherMap, or similar for average temperatures, rainfall, etc.
- **Geographic Data:** Google Maps API for distance to features (beach, ski resort, etc.), Google Directions API for drive time calculations.
- **Facilities:** Google Places API (already in use for ALDI, hospitals, etc.).

### Orchestration Flow with Climate & Geographic Filters (Pseudocode)

```js
criteria = {
  climate: { minAvgTemp: 15, maxAvgTemp: 28 }, // "not too cold, not too hot"
  geographic: [
    { type: "beach", maxDistanceKm: 5 },
    { type: "ski_resort", maxDriveTimeHours: 2 }
  ],
  requiredFacilities: [
    { type: "supermarket", keyword: "Aldi", radius: 5000 },
    { type: "hospital", radius: 5000 }
  ]
}

results = []

for suburb in allSuburbs:
    // 1. Climate filter
    climateData = getClimateData(suburb)
    if not (criteria.climate.minAvgTemp <= climateData.avgAnnualTemp <= criteria.climate.maxAvgTemp):
        continue

    // 2. Geographic filters
    distanceToBeach = getDistanceToFeature(suburb, "beach")
    driveTimeToSkiResort = getDriveTimeToFeature(suburb, "ski_resort")
    if distanceToBeach > 5: continue
    if driveTimeToSkiResort > 2: continue

    // 3. Facility filters
    hasAldi = convex.address.getNearbyAldiStores({ lat: suburb.lat, lng: suburb.lng, radius: 5000 }).places.length > 0
    hasHospital = convex.address.getNearbyFacilities({ lat: suburb.lat, lng: suburb.lng, type: "hospital", radius: 5000 }).places.length > 0
    if not (hasAldi and hasHospital): continue

    // 4. Add to results
    results.append({
        suburb: suburb.name,
        climate: climateData,
        distanceToBeach,
        driveTimeToSkiResort,
        facilities: { aldi: hasAldi, hospital: hasHospital }
    })
```

### Extensibility
- The orchestration can be extended to support additional criteria such as air quality, flood risk, bushfire risk, or other lifestyle and environmental factors as new data sources become available.

---

## Example User Stories & Queries
- "Show me all suburbs in Victoria with an ALDI and a hospital within 5km."
- "Find places near the beach with at least two supermarkets and a shopping center."
- "I want to live somewhere with a park, a school, and a hospital nearby."
- "Suggest areas with good public transport and an ALDI store."
- "Find a suburb that is not too cold, not too hot, near a beach, and within a 2-hour drive from a ski resort, with an ALDI and a hospital nearby."

---

## Best Practices for Extensibility
- **Modular API Design:** Each facility type should have a dedicated search module/function.
- **Criteria Abstraction:** User criteria should be parsed into a structured format for flexible orchestration.
- **Configurable Radius/Thresholds:** Allow user or agent to specify proximity requirements.
- **Result Scoring:** Implement a scoring/ranking system to handle multiple, possibly conflicting, criteria.
- **Easy Addition of New Place Types:** Use a registry or config to add new facility types without major refactoring.

---

## Future Enhancements
- **Advanced Scoring:** Weight results by user priorities (e.g., "hospital is more important than supermarket").
- **Multi-Modal Search:** Combine map, text, and conversational input for richer queries.
- **Learning & Personalization:** Agent learns user preferences over time.
- **Batch & Parallel Search:** Optimize for speed by running searches in parallel where possible.
- **Visualization:** Map overlays, heatmaps, and interactive exploration.

---

## References
- See also: `ADDRESS_FINDER_V3_DOCUMENTATION.md`, `UNIFIED_ADDRESS_SYSTEM.md`, and `state-management-strategy.md` for related architectural and technical details. 