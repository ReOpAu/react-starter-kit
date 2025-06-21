import { type ActionFunctionArgs } from "react-router";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { 
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const { address } = await request.json();
    
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

    // Call Google Address Validation API
    const requestBody = {
      address: {
        regionCode: "AU",
        addressLines: [address]
      },
      enableUspsCass: false
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

    // Return the validation result
    return new Response(JSON.stringify(data.result), {
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