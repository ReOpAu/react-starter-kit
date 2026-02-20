import { useReducer } from "react";

interface FormStatus {
	isLoading: boolean;
	isInitialized: boolean;
	priceError: string | null;
	error: string | null;
}

type FormStatusAction =
	| { type: "INITIALIZED" }
	| { type: "SET_PRICE_ERROR"; payload: string | null }
	| { type: "SUBMIT_START" }
	| { type: "SUBMIT_SUCCESS" }
	| { type: "SUBMIT_ERROR"; payload: string };

function formStatusReducer(
	state: FormStatus,
	action: FormStatusAction,
): FormStatus {
	switch (action.type) {
		case "INITIALIZED":
			return { ...state, isInitialized: true };
		case "SET_PRICE_ERROR":
			return { ...state, priceError: action.payload };
		case "SUBMIT_START":
			return { ...state, isLoading: true, error: null };
		case "SUBMIT_SUCCESS":
			return { ...state, isLoading: false };
		case "SUBMIT_ERROR":
			return { ...state, isLoading: false, error: action.payload };
	}
}

const initialFormStatus: FormStatus = {
	isLoading: false,
	isInitialized: false,
	priceError: null,
	error: null,
};

export function useFormStatus() {
	return useReducer(formStatusReducer, initialFormStatus);
}
