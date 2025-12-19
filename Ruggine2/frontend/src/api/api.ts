/// This file contains functions that "directly" call the backend API endpoints and the interfaces that define
/// the request payloads and response structures.

import { toApiError } from "../models/models";

const BASE_URL = 'http://localhost:8080/api';

/**
 * utility function to get the stored token from localStorage
 */
export const getToken = () => localStorage.getItem('token');;


/// USERS

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


/**
 * function to call the backend API endpoint for logging in a user
 * @param payload: LoginUserPayload 
 * @returns 
 */
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

/**
 * function to call the backend API endpoint for registering a new user
 * @param payload: RegisterUserPayload
 * @returns
 */
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

export const getUsernameFromUserId = async (user_id: number): Promise<string> => {
    const res = await fetch(`${BASE_URL}/users/${user_id}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${getToken()}`
        },
    });

    if (!res.ok) {
        throw await toApiError(res);
    }
    const data = await res.json();
    return data.username;
}

export const getUserIdByUsername = async (username: string): Promise<number> => {
    const res = await fetch(`${BASE_URL}/users/by_username/${username}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${getToken()}`
        },
    });

    if (!res.ok) {
        throw await toApiError(res);
    }
    const data = await res.json();
    return data;
}

// for the requests that require authentication, we will need to add the Authorization header with the token by using
// the getToken() utility function defined above IN the headers :
/*
 headers: {
     "Content-Type": "application/json
     "Authorization": `Bearer ${getToken()}`    // this will "take" the token from localStorage and add it to the request headers
}
*/


/// CHATS (and MESSAGES)

/**
 * Data Access Object representing a Chat as received from the backend
 */
export interface ChatDAO {
    id: number;
    chat_type: string;
    user_id_1: number | null;
    user_id_2: number | null;
    group_name: string | null;
    last_message_at: string | null;
    username_1: string | null;
    username_2: string | null;
}

export interface MessageDAO {
    id: number;
    sender_id: number;
    content: string;
    sent_at: string;
    chat_id: number;
}


/**
 * Function to convert raw DTO from the backend into ChatDAO object.
 * @param dtos: chat json received from the backend
 * @returns ChatDAO object
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertToChatDAO(dto: any): ChatDAO | null {
    if (typeof dto.id !== 'number' || typeof dto.chat_type !== 'string') {
        console.warn("Not valid chat data : ", dto);
        return null;
    }

    return {
        id: dto.id,
        chat_type: dto.chat_type,
        user_id_1: dto.user_id_1, // Viene conservato come number | null
        user_id_2: dto.user_id_2,
        group_name: dto.group_name,
        last_message_at: dto.last_message_at, // Viene conservato come string | null
        username_1: dto.username_1,
        username_2: dto.username_2,
    } as ChatDAO;
}

/**
 * Function to convert raw DTOs from the backend into ChatDAO objects.
 * @param dtos: json array received from the backend
 * @returns Array of ChatDAO objects
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertToChatDAOs(dtos: any[]): ChatDAO[] {
    return dtos.map(dto => {
        return convertToChatDAO(dto);
    }).filter((chat): chat is ChatDAO => chat !== null);
}

/**
 * Function to convert raw DTO from the backend into MessageDAO object.
 * @param dtos: message json received from the backend
 * @returns MessageDAO object
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertToMessageDAO(dto: any): MessageDAO | null {
    if (typeof dto.id !== 'number' || typeof dto.sender_id !== 'number' || typeof dto.content !== 'string' || typeof dto.sent_at !== 'string') {
        console.warn("Not valid message data : ", dto);
        return null;
    }
    return {
        id: dto.id,
        sender_id: dto.sender_id,
        content: dto.content,
        sent_at: dto.sent_at,
        chat_id: dto.chat_id,
    } as MessageDAO;
}

/**
 * Function to convert raw DTOs from the backend into MessageDAO objects.
 * @param dtos: json array received from the backend
 * @returns Array of MessageDAO objects
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertToMessageDAOs(dtos: any[]): MessageDAO[] {
    return dtos.map(dto => {
        return convertToMessageDAO(dto);
    }).filter((message): message is MessageDAO => message !== null);
}

/**
 * function to call the backend API endpoint for getting all chats for the authenticated user
 * @returns array of ChatDAO objects
 */
export const getChats = async (): Promise<ChatDAO[]> => {
    try {
        const res = await fetch(`${BASE_URL}/chats/`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${getToken()}`
            },
        });

        if (!res.ok) {
            throw await toApiError(res);
        }
        return convertToChatDAOs(await res.json());
    } catch (error) {
        console.error("Error fetching chats:", error);
        throw error;
    }
}

/**
 * function to call the backend API endpoint for creating a new private chat with another user
 * @param otherUserId: number - the ID of the other user to create the private chat with
 * @returns the ChatDAO object representing the newly created private chat
 */
export const createNewPrivateChat = async (otherUserId: number): Promise<ChatDAO> => {
    try {
        const res = await fetch(`${BASE_URL}/chats/new_private/${otherUserId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${getToken()}`
            },
        });

        if (!res.ok) {
            throw await toApiError(res);
        }
        // ora viene ritornato un JSON (con struttura ChatDAO) e non più solo l'ID
        const toRet = convertToChatDAO(await res.json());
        if (toRet === null) {
            throw new Error("Invalid chat data received from server");
        }
        return toRet;
    } catch (error) {
        console.error("Error creating new private chat:", error);
        throw error;
    }
}

/**
 * function to call the backend API endpoint for creating a new group chat
 * @param groupName: string - the name of the new group chat
 * @returns the ID of the newly created group chat
 */
export const createNewGroupChat = async (groupName: string): Promise<number> => {
    try {
        const res = await fetch(`${BASE_URL}/chats/new_group`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${getToken()}`
            },
            body: JSON.stringify({ group_name: groupName }),
        });

        if (!res.ok) {
            throw await toApiError(res);
        }
        const data = await res.text();
        const toRet = Number.parseInt(data, 10);
        return toRet;

    } catch (error) {
        console.error("Error creating new group chat:", error);
        throw error;
    }
}

/**
 * function to call the backend API endpoint for getting all messages for a given chat
 * @param chatId: number - the ID of the chat to get messages for
 * @returns array of MessageDAO objects
 */
export const getChatMessages = async (chatId: number): Promise<MessageDAO[]> => {
    try {
        const res = await fetch(`${BASE_URL}/chats/${chatId}/messages`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${getToken()}`
            },
        });

        if (!res.ok) {
            throw await toApiError(res);
        }
        return convertToMessageDAOs(await res.json());
    } catch (error) {
        console.error("Error fetching chat messages:", error);
        throw error;
    }
}

/**
 * function to call the backend API endpoint for sending a new message to a given chat
 * @param payload: SendMessagePayload 
 * @returns boolean indicating success (true) or failure (false)
 */
export const sendChatMessage = async (payload: SendMessagePayload): Promise<void> => {
    try {
        const res = await fetch(`${BASE_URL}/chats/${payload.chat_id}/messages`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${getToken()}`
            },
            body: JSON.stringify({ content: payload.content }),
        });

        if (!res.ok) {
            throw await toApiError(res);
        }

    } catch (error) {
        console.error("Error sending chat message:", error);
        throw error;
    }
}


/// INVITES

/**
 * Data Access Object representing an Invite as received from the backend
 */
export interface InviteDAO {
    id: number;
    chat_id: number | null;
    sender_id: number | null;
    receiver_id: number | null;
    accepted: boolean | null;
    sent_at: string;
}


/**
 * Function to convert raw DTO from the backend into InviteDAO object.
 * @param dto: invite json received from the backend
 * @returns InviteDAO object
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertToInviteDAO(dto: any): InviteDAO | null {
    if (typeof dto.id !== 'number' || typeof dto.chat_id !== 'number' || typeof dto.sender_id !== 'number' || typeof dto.receiver_id !== 'number' || typeof dto.accepted !== 'boolean' || typeof dto.sent_at !== 'string') {
        console.warn("Not valid invite data : ", dto);
        return null;
    }
    return {
        id: dto.id,
        chat_id: dto.chat_id,
        sender_id: dto.sender_id,
        receiver_id: dto.receiver_id,
        accepted: dto.accepted,
        sent_at: dto.sent_at,
    } as InviteDAO;
}

/**
 * Function to convert raw DTOs from the backend into InviteDAO objects.
 * @param dtos: json array received from the backend
 * @returns Array of InviteDAO objects
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertToInviteDAOs(dtos: any[]): InviteDAO[] {
    return dtos.map(dto => {
        return convertToInviteDAO(dto);
    }).filter((invite): invite is InviteDAO => invite !== null);
}

/**
 * function to call the backend API endpoint for inviting a user to a chat
 * @param sender_id: number - the ID of the user sending the invite
 * @param receiver_id: number - the ID of the user receiving the invite
 * @param chat_id: number - the ID of the chat to which the user is being invited
 */
export const inviteUser = async (receiver_id: number, chat_id: number): Promise<void> => {
    try {
        const res = await fetch(`${BASE_URL}/invites/create`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${getToken()}`
            },
            body: JSON.stringify({ chat_id: chat_id, receiver_id: receiver_id }),
        });

        if (!res.ok) {
            throw await toApiError(res);
        }

    } catch (error) {
        console.error("Error inviting user to chat:", error);
        throw error;
    }
}


/**
 * function to call the backend API endpoint for getting all invites for the authenticated user
 * @returns array of InviteDAO objects
 */
export const getInvites = async (): Promise<InviteDAO[]> => {
    try {
        const res = await fetch(`${BASE_URL}/invites/`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${getToken()}`
            },
        });

        if (!res.ok) {
            throw await toApiError(res);
        }
        return convertToInviteDAOs(await res.json());
    } catch (error) {
        console.error("Error fetching invites:", error);
        throw error;
    }
}

/**
 * function to call the backend API endpoint for accepting an invite
 * @param invite_id: number - the ID of the invite to accept
 * @returns the ID of the chat the user has been invited to and that has now joined in
 */
export const acceptInvite = async (invite_id: number): Promise<number> => {
    try {
        if (!invite_id || invite_id <= 0 || Number.isNaN(invite_id)) {
            throw new Error("Invalid invite ID");
        }
        const res = await fetch(`${BASE_URL}/invites/accept/${invite_id}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${getToken()}`
            },
        });

        if (!res.ok) {
            throw await toApiError(res);
        }
        const data = await res.text();
        const toRet = Number.parseInt(data, 10);
        return toRet;
    } catch (error) {
        console.error("Error accepting invite:", error);
        throw error;
    }
}

/**
 * function to call the backend API endpoint for rejecting an invite
 * @param invite_id: number - the ID of the invite to reject
 */
export const rejectInvite = async (invite_id: number): Promise<void> => {
    try {
        if (!invite_id || invite_id <= 0 || Number.isNaN(invite_id)) {
            throw new Error("Invalid invite ID");
        }
        const res = await fetch(`${BASE_URL}/invites/reject/${invite_id}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${getToken()}`
            },
        });

        if (!res.ok) {
            throw await toApiError(res);
        }
    } catch (error) {
        console.error("Error rejecting invite:", error);
        throw error;
    }
}


// REAL-TIME COMMUNICATION (WEBSOCKET upgrade request) :

export type WsEventType = 'NEW_MESSAGE' | 'USER_JOINED' | 'USER_LEFT' | 'USER_TYPING' | 'NEW_CHAT' | 'NEW_INVITE' | 'CHAT_UPDATED' ;

/**
 * Generic interface representing a WebSocket message from the server.
 * # Type Parameters
 * - T: The type of the payload contained in the message.
 * # Properties
 * - type: WsEventType - The type of the WebSocket event.
 * - payload: T - The payload associated with the event.
 */
export interface ServerWsMessage<T> {
    type: WsEventType;
    payload: T; 
}

