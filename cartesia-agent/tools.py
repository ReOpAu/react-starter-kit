"""Loopback tools for the Cartesia Line address finder agent.

Each tool calls the Convex HTTP API for address lookups and writes
state updates to Convex for the browser to pick up via real-time
subscriptions (since Line SDK doesn't support custom WS events from tools).

Matches the behavior of the ElevenLabs client tools in
app/elevenlabs/hooks/useAddressFinderClientTools.ts
"""

import json
import os
import re
from typing import Annotated

import httpx
from line.llm_agent import loopback_tool

CONVEX_URL = os.getenv("CONVEX_URL", "")

# Per-session state (reset each call)
_session_state: dict = {
    "last_query": None,
    "last_suggestions": [],
    "current_selection": None,
    "selection_acknowledged": False,
    "session_id": os.getenv("CARTESIA_SESSION_ID", "default"),
}


def _reset_state():
    _session_state["last_query"] = None
    _session_state["last_suggestions"] = []
    _session_state["current_selection"] = None
    _session_state["selection_acknowledged"] = False


async def _call_convex_action(path: str, args: dict) -> dict:
    """Call a Convex action via HTTP API."""
    url = f"{CONVEX_URL}/api/action"
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            url,
            json={"path": path, "args": args},
            headers={"Content-Type": "application/json"},
        )
        resp.raise_for_status()
        return resp.json()


async def _call_convex_mutation(path: str, args: dict) -> dict:
    """Call a Convex mutation via HTTP API."""
    url = f"{CONVEX_URL}/api/mutation"
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            url,
            json={"path": path, "args": args},
            headers={"Content-Type": "application/json"},
        )
        resp.raise_for_status()
        return resp.json()


async def _push_state_update(update_type: str, data: dict):
    """Push a state update to Convex for the browser to pick up via subscription."""
    session_id = _session_state.get("session_id", "default")
    try:
        await _call_convex_mutation(
            "cartesia/sessionState:pushUpdate",
            {
                "sessionId": session_id,
                "updateType": update_type,
                "data": json.dumps(data),
            },
        )
    except Exception as e:
        # Non-fatal — the voice response still works even if UI update fails
        print(f"[tools] Failed to push state update: {e}")


def _classify_intent(query: str) -> str:
    """Simple intent classification matching the Convex backend logic."""
    q = query.strip().lower()
    words = q.split()

    # Number at start usually means address
    if words and re.match(r"^\d", words[0]):
        return "address"

    # Street-type keywords
    street_keywords = [
        "street", "st", "road", "rd", "avenue", "ave", "drive", "dr",
        "lane", "ln", "court", "ct", "crescent", "cres", "place", "pl",
        "way", "parade", "pde", "boulevard", "blvd", "highway", "hwy",
        "terrace", "tce",
    ]
    for word in words:
        if word in street_keywords:
            return "street"

    # Single word is likely a suburb
    if len(words) == 1 and len(q) >= 3:
        return "suburb"

    # Two words, no numbers — likely suburb
    if len(words) == 2 and not any(c.isdigit() for c in q):
        return "suburb"

    return "general"


def _format_suggestion(s: dict) -> dict:
    """Format a suggestion for the browser state bridge."""
    return {
        "placeId": s.get("placeId", ""),
        "description": s.get("description", ""),
        "resultType": s.get("resultType", "general"),
        "suburb": s.get("suburb"),
        "confidence": s.get("confidence", 0),
        "types": s.get("types", []),
        "structuredFormatting": s.get("structuredFormatting"),
    }


# --- Core Search & Selection Tools ---


@loopback_tool
async def search_address(
    ctx,
    query: Annotated[str, "The address, suburb, or street name to search for"],
) -> str:
    """Search for an Australian address, suburb, or street name. Updates suggestions on screen. Always clears existing selection."""
    # Clear existing selection on new search
    _session_state["current_selection"] = None
    _session_state["selection_acknowledged"] = False

    intent = _classify_intent(query)

    if intent == "address":
        # Dual search: strict validation + loose suggestions (matches ElevenLabs behavior)
        try:
            loose_result, strict_result = None, None
            # Run both calls - loose for options, strict for validation
            try:
                loose_result = await _call_convex_action(
                    "address/getPlaceSuggestions:getPlaceSuggestions",
                    {"query": query, "intent": "general", "isAutocomplete": True},
                )
            except Exception as e:
                print(f"[tools] Loose search failed: {e}")

            try:
                strict_result = await _call_convex_action(
                    "address/getPlaceSuggestions:getPlaceSuggestions",
                    {"query": query, "intent": "address", "maxResults": 1, "isAutocomplete": False},
                )
            except Exception as e:
                print(f"[tools] Strict validation failed: {e}")

            strict_value = (strict_result or {}).get("value", strict_result or {})
            loose_value = (loose_result or {}).get("value", loose_result or {})

            # Try strict first
            if strict_value.get("success") and strict_value.get("suggestions"):
                validated = strict_value["suggestions"][0]
                # Use loose results for the full options list
                all_suggestions = (
                    loose_value.get("suggestions", [])
                    if loose_value.get("success")
                    else [validated]
                )
                detected_intent = strict_value.get("detectedIntent", intent)

                _session_state["last_query"] = query
                _session_state["last_suggestions"] = all_suggestions

                await _push_state_update("suggestions", {
                    "query": query,
                    "intent": detected_intent,
                    "suggestions": [_format_suggestion(s) for s in all_suggestions],
                })

                return json.dumps({
                    "status": "validated",
                    "count": 1,
                    "message": "Found it — it's on screen.",
                    "note": "IMPORTANT: Do NOT read the address aloud. The user can see it on screen. Just say something brief like 'Found it' or 'That's on screen now'.",
                })

            # Fall back to loose results
            if loose_value.get("success") and loose_value.get("suggestions"):
                suggestions = loose_value["suggestions"]
                detected_intent = loose_value.get("detectedIntent", intent)

                _session_state["last_query"] = query
                _session_state["last_suggestions"] = suggestions

                await _push_state_update("suggestions", {
                    "query": query,
                    "intent": detected_intent,
                    "suggestions": [_format_suggestion(s) for s in suggestions],
                })

                return json.dumps({
                    "status": "suggestions_available",
                    "count": len(suggestions),
                    "message": "Some options are on screen.",
                    "note": "IMPORTANT: Do NOT read addresses aloud or state the count. Just say 'some options are on screen' or similar.",
                })

            return json.dumps({
                "status": "validation_failed",
                "error": "The provided address could not be validated.",
            })

        except Exception as e:
            return json.dumps({"status": "error", "error": str(e)})

    # Non-address intent (suburb, street, general)
    try:
        result = await _call_convex_action(
            "address/getPlaceSuggestions:getPlaceSuggestions",
            {"query": query, "intent": intent, "maxResults": 5, "isAutocomplete": True},
        )
    except Exception as e:
        return json.dumps({"status": "error", "error": f"Search failed: {e}"})

    value = result.get("value", result)

    if not value.get("success"):
        return json.dumps({
            "status": "error",
            "error": value.get("error", "Unknown error"),
        })

    suggestions = value.get("suggestions", [])
    detected_intent = value.get("detectedIntent", intent)

    _session_state["last_query"] = query
    _session_state["last_suggestions"] = suggestions

    await _push_state_update("suggestions", {
        "query": query,
        "intent": detected_intent,
        "suggestions": [_format_suggestion(s) for s in suggestions],
    })

    if not suggestions:
        return json.dumps({
            "status": "no_results",
            "message": f"No results for '{query}'. Could you try a different search?",
        })

    return json.dumps({
        "status": "suggestions_available",
        "count": len(suggestions),
        "message": "Options are on screen.",
        "note": "IMPORTANT: Do NOT read addresses aloud, state the count, or describe the results. Just say 'options are on screen' or 'take a look'.",
    })


@loopback_tool
async def select_suggestion(
    ctx,
    place_id: Annotated[str, "The Google Places place ID of the suggestion to select"],
) -> str:
    """Confirm the selection of a place by its unique placeId from current search results."""
    suggestion = None
    for s in _session_state.get("last_suggestions", []):
        if s.get("placeId") == place_id:
            suggestion = s
            break

    if not suggestion:
        return json.dumps({
            "status": "not_found",
            "error": f"No suggestion with place ID '{place_id}' in current results. Use search_address to refresh.",
        })

    # Try to enrich with place details (coordinates, postcode)
    enriched = dict(suggestion)
    try:
        result = await _call_convex_action(
            "address/getPlaceDetails:getPlaceDetails",
            {"placeId": place_id},
        )
        value = result.get("value", result)
        if value.get("success") and value.get("details"):
            details = value["details"]
            enriched.update({
                "description": details.get("formattedAddress", enriched.get("description", "")),
                "suburb": details.get("suburb", enriched.get("suburb")),
                "postcode": details.get("postcode"),
                "lat": details.get("lat"),
                "lng": details.get("lng"),
                "types": details.get("types", enriched.get("types", [])),
            })
    except Exception as e:
        print(f"[tools] Place details enrichment failed: {e}")
        # Continue with basic suggestion data

    _session_state["current_selection"] = enriched

    await _push_state_update("selection", {
        "suggestion": _format_suggestion(enriched),
    })

    return json.dumps({
        "status": "confirmed",
        "message": "Done.",
        "note": "IMPORTANT: Do NOT read the address aloud. It is visible on screen. Say 'got it', 'done', or ask what's next.",
    })


@loopback_tool
async def select_by_ordinal(
    ctx,
    ordinal: Annotated[str, "Position like 'first', 'second', '1', '2', etc."],
) -> str:
    """Select a suggestion by its position from the last search results. ALWAYS use this for ordinal references."""
    ordinal_map = {
        "first": 0, "1": 0, "1st": 0,
        "second": 1, "2": 1, "2nd": 1,
        "third": 2, "3": 2, "3rd": 2,
        "fourth": 3, "4": 3, "4th": 3,
        "fifth": 4, "5": 4, "5th": 4,
    }

    index = ordinal_map.get(ordinal.lower().strip())
    if index is None:
        return json.dumps({
            "status": "error",
            "error": f"Didn't understand '{ordinal}'. Please say first, second, third, etc.",
        })

    suggestions = _session_state.get("last_suggestions", [])
    if not suggestions:
        return json.dumps({
            "status": "error",
            "error": "No search results to select from. Please search for an address first.",
        })

    if index >= len(suggestions):
        return json.dumps({
            "status": "error",
            "error": f"Only {len(suggestions)} results available. Choose 1 to {len(suggestions)}.",
        })

    selected = suggestions[index]
    place_id = selected.get("placeId", "")

    if not place_id:
        return json.dumps({
            "status": "error",
            "error": "That suggestion doesn't have a valid place ID. Try another.",
        })

    return await select_suggestion(ctx, place_id)


# --- State Management Tools ---


@loopback_tool
async def get_current_state(ctx) -> str:
    """Get comprehensive session state including search, suggestions, and selection for debugging."""
    selection = _session_state.get("current_selection")
    return json.dumps({
        "last_query": _session_state.get("last_query"),
        "num_suggestions": len(_session_state.get("last_suggestions", [])),
        "has_selection": selection is not None,
        "selection_acknowledged": _session_state.get("selection_acknowledged", False),
        "current_selection": {
            "description": selection.get("description", ""),
            "suburb": selection.get("suburb"),
            "postcode": selection.get("postcode"),
        } if selection else None,
    }, indent=2)


@loopback_tool
async def clear_selection(ctx) -> str:
    """Clear current selection and search state, resetting the system so user can start over."""
    _reset_state()

    await _push_state_update("clear", {})

    return json.dumps({
        "status": "cleared",
        "message": "Ready for a new search.",
    })


@loopback_tool
async def show_options_again(ctx) -> str:
    """Show the previous address options again after a selection has been confirmed."""
    suggestions = _session_state.get("last_suggestions", [])
    query = _session_state.get("last_query")

    if not suggestions or not query:
        return json.dumps({
            "status": "error",
            "error": "No previous options available.",
        })

    # Clear current selection but keep suggestions
    _session_state["current_selection"] = None
    _session_state["selection_acknowledged"] = False

    await _push_state_update("show_options_again", {
        "query": query,
        "intent": "general",
        "suggestions": [_format_suggestion(s) for s in suggestions],
    })

    return json.dumps({
        "status": "options_displayed",
        "count": len(suggestions),
        "message": "Previous options are on screen again.",
        "note": "Do NOT list the options. They are visible on screen.",
    })


# --- Selection Workflow Tools ---


@loopback_tool
async def confirm_user_selection(ctx) -> str:
    """Call AFTER you have verbally acknowledged a selection to the user. Logs confirmation to history."""
    selection = _session_state.get("current_selection")
    if not selection:
        return json.dumps({
            "status": "error",
            "error": "No selection to confirm.",
        })

    return json.dumps({
        "status": "acknowledged",
        "message": "Selection confirmed.",
    })


@loopback_tool
async def set_selection_acknowledged(
    ctx,
    acknowledged: Annotated[str, "'true' or 'false' — whether the agent has acknowledged the selection to the user"],
) -> str:
    """Set UI synchronization flag. Set true after confirming selection, false when starting new search."""
    is_ack = acknowledged.lower().strip() in ("true", "1", "yes")
    _session_state["selection_acknowledged"] = is_ack

    await _push_state_update("selection_acknowledged", {
        "acknowledged": is_ack,
    })

    return json.dumps({
        "status": "ok",
        "selection_acknowledged": is_ack,
    })


# --- Input Mode Tools ---


@loopback_tool
async def request_manual_input(
    ctx,
    reason: Annotated[str, "Brief explanation of why manual input is needed"],
) -> str:
    """Enable manual text input while keeping voice conversation active (hybrid mode)."""
    await _push_state_update("request_manual_input", {
        "reason": reason,
    })

    return json.dumps({
        "status": "hybrid_mode_activated",
        "message": "Manual input enabled.",
    })


# Export all tools for registration
ALL_TOOLS = [
    search_address,
    select_suggestion,
    select_by_ordinal,
    get_current_state,
    clear_selection,
    show_options_again,
    confirm_user_selection,
    set_selection_acknowledged,
    request_manual_input,
]
