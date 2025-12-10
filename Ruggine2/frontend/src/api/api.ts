/// This file contains functions that "directly" call the backend API endpoints and the interfaces that define
/// the request payloads and response structures.

import { toApiError } from "../models/models";

const BASE_URL = 'http://localhost:8080/api';

/**
 * utility function to get the stored token from localStorage
 */
export const getToken = () => localStorage.getItem('token'); ;

/**
 * body payload to attach to the request for registering a new user
 */
export interface RegisterUserPayload {
    username: string;
    plain_password: string;
}

/**
 * body payload to attach to the request for logging in a user
 */
export interface LoginUserPayload {
    username: string;
    plain_password: string;
}

/**
 * response received from the backend upon successful user registration
 */
export interface RegistrationResponse {
    user_id: number;
    username: string;
    message: string;
}

/**
 * response received from the backend upon successful user login
 */
export interface LoginResponse {
    token: string;  // this is the TOKEN to be stored for authenticated requests (e.g., in localStorage !!!!)
    user_id: number;
    username: string;
}

/**
 * body payload to attach to the request for sending a new message
 */
export interface SendMessagePayload {
    chat_id: number;
    content: string;
}

/// API Calls section :

export const loginUser = async (
    payload: LoginUserPayload
): Promise<LoginResponse> => {
    const res = await fetch(`${BASE_URL}/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        throw await toApiError(res);
    }
    return res.json();
};

export const registerUser = async (
    payload: RegisterUserPayload
): Promise<RegistrationResponse> => {
    const res = await fetch(`${BASE_URL}/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        throw await toApiError(res);
    }
    return res.json();
};

// for the requests that require authentication, we will need to add the Authorization header with the token by using
// the getToken() utility function defined above IN the headers :
/*
 headers: {
     "Content-Type": "application/json
     "Authorization": `Bearer ${getToken()}`    // this will "take" the token from localStorage and add it to the request headers
}
*/