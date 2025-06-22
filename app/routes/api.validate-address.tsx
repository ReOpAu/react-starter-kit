import { type ActionFunctionArgs } from "react-router";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { 
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const body = await request.json();
    const { address, sessionToken, previousResponseId } = body;
    
    if (!address) {
      return new Response(JSON.stringify({ error: "Address is required" }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Google Maps API key not configured" }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Validate and structure the address payload
    const addressPayload: {
        regionCode: string;
        addressLines: string[];
        locality?: string;
        administrativeArea?: string;
        postalCode?: string;
    } = {
        regionCode: "AU",
        addressLines: [],
    };

    if (typeof address === 'string') {
        addressPayload.addressLines = [address];
    } else if (typeof address === 'object' && address !== null && !Array.isArray(address)) {
        if (Array.isArray(address.addressLines)) {
            addressPayload.addressLines = address.addressLines.filter((line: unknown) => typeof line === 'string');
        }
        if (typeof address.locality === 'string') {
            addressPayload.locality = address.locality;
        }
        if (typeof address.administrativeArea === 'string') {
            addressPayload.administrativeArea = address.administrativeArea;
        }
        if (typeof address.postalCode === 'string') {
            addressPayload.postalCode = address.postalCode;
        }
    }

    const requestBody = {
      address: addressPayload,
      enableUspsCass: false,
      ...(previousResponseId && { previousResponseId }),
      ...(sessionToken && { sessionToken }),
      languageOptions: {
        returnEnglishLatinAddress: true // Ensure consistent format
      }
    };

    const response = await fetch(
      `https://addressvalidation.googleapis.com/v1:validateAddress?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      throw new Error(`Address validation API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.result) {
      return new Response(JSON.stringify({ error: "No validation result returned" }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Enhanced response with additional metadata
    const enhancedResult = {
      ...data.result,
      // Add validation summary for easier frontend handling
      _validationSummary: {
        isValid: data.result.verdict?.addressComplete && (
          !data.result.verdict?.hasUnconfirmedComponents || 
          data.result.verdict?.possibleNextAction === "ACCEPT"
        ),
        isAcceptableByGoogle: data.result.verdict?.possibleNextAction === "ACCEPT",
        isComplete: data.result.verdict?.addressComplete || false,
        hasUnconfirmedComponents: data.result.verdict?.hasUnconfirmedComponents || false,
        hasInferredComponents: data.result.verdict?.hasInferredComponents || false,
        possibleNextAction: data.result.verdict?.possibleNextAction,
        inputGranularity: data.result.verdict?.inputGranularity,
        validationGranularity: data.result.verdict?.validationGranularity,
        geocodeGranularity: data.result.verdict?.geocodeGranularity,
        unconfirmedComponentTypes: data.result.address?.unconfirmedComponentTypes || [],
        parsedComponents: data.result.address?.addressComponents?.reduce((acc: any, component: any) => {
          const type = component.componentType;
          const text = component.componentName?.text;
          const confirmationLevel = component.confirmationLevel;
          
          if (type && text) {
            acc[type] = { text, confirmationLevel };
          }
          return acc;
        }, {}),
        coordinates: data.result.geocode?.location ? {
          latitude: data.result.geocode.location.latitude,
          longitude: data.result.geocode.location.longitude
        } : null,
        placeId: data.result.geocode?.placeId || null,
        isResidential: data.result.metadata?.residential || false,
        isBusiness: data.result.metadata?.business || false
      },
      responseId: data.responseId
    };

    // Return the enhanced validation result
    return new Response(JSON.stringify(enhancedResult), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error('Address validation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Validation failed' }), 
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}