import { toApiError } from "../models/models";
import type { User } from '../models/models';

const BASE_URL = 'http://localhost:8080/api';

/**
 * Retrieves the JWT authentication token from localStorage.
 * @returns The stored token string, or null if not found
 */
export const getToken = () => localStorage.getItem('token');

/**
 * Wrapper around fetch that automatically injects the Authorization header with the stored JWT token
 * when available. Dispatches a global 'app:unauthorized' event on 401 responses to trigger logout.
 * @param input - The URL or Request object to fetch
 * @param init - Optional fetch initialization options
 * @returns Promise resolving to the Response object
 */
async function authFetch(input: RequestInfo, init?: RequestInit) {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (init && init.headers) {
        if (init.headers instanceof Headers) {
            init.headers.forEach((v, k) => headers[k] = v);
        } else if (Array.isArray(init.headers)) {
            (init.headers as Array<[string,string]>).forEach(([k,v]) => headers[k] = v);
        } else {
            Object.assign(headers, init.headers as Record<string,string>);
        }
    }
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const merged: RequestInit = { ...(init || {}), headers };
    const res = await fetch(input, merged);
    if (res.status === 401) {
        try {
            window.dispatchEvent(new CustomEvent('app:unauthorized'));
        } catch (e) {
        }
    }
    return res;
}


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
 * Authenticates a user with username and password credentials.
 * @param payload - Object containing username and plain_password
 * @returns Promise resolving to LoginResponse with JWT token and user info
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
 * Registers a new user account with the provided credentials.
 * @param payload - Object containing username and plain_password for registration
 * @returns Promise resolving to RegistrationResponse with user info and confirmation message
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

/**
 * Retrieves the username for a given user ID from the backend.
 * @param user_id - The ID of the user whose username to retrieve
 * @returns Promise resolving to the username string
 */
export const getUsernameFromUserId = async (user_id: number): Promise<string> => {
    const res = await authFetch(`${BASE_URL}/users/${user_id}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!res.ok) {
        throw await toApiError(res);
    }
    const data = await res.json();
    return data;
}

/**
 * Retrieves the user ID for a given username from the backend.
 * @param username - The username to search for
 * @returns Promise resolving to the user ID number
 */
export const getUserIdByUsername = async (username: string): Promise<number> => {
    const res = await authFetch(`${BASE_URL}/users/by_username/${username}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!res.ok) {
        throw await toApiError(res);
    }
    const data = await res.json();
    return data;
}

/**
 * Searches for users whose usernames start with the given prefix.
 * Results are filtered to exclude users already in the specified chat if provided.
 * @param prefix - The username prefix to search for
 * @param limit - Maximum number of results to return (default: 5)
 * @returns Promise resolving to an array of User objects matching the search
 */
export const searchUsersByPrefix = async (prefix: string, limit = 5): Promise<User[]> => {
    try {
        const url = new URL(`${BASE_URL}/users/search`);
        url.searchParams.append('prefix', prefix);
        url.searchParams.append('limit', String(limit));
        const res = await authFetch(url.toString(), {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!res.ok) {
            throw await toApiError(res);
        }
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error('Invalid response');
        return data as User[];
    } catch (error) {
        console.error('Error searching users by prefix', error);
        throw error;
    }
}

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
    last_message_preview?: string | null;
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

export interface ChatMemberDAO {
    user_id: number;
    username: string;
    status: string;
}


/**
 * Function to convert raw DTO from the backend into ChatDAO object.
 * @param dtos: chat json received from the backend
 * @returns ChatDAO object
 */
function convertToChatDAO(dto: any): ChatDAO | null {
    if (typeof dto.id !== 'number' || typeof dto.chat_type !== 'string') {
        console.warn("Not valid chat data : ", dto);
        return null;
    }

    return {
        id: dto.id,
        chat_type: dto.chat_type,
        user_id_1: dto.user_id_1,
        user_id_2: dto.user_id_2,
        group_name: dto.group_name,
        last_message_at: dto.last_message_at,
        username_1: dto.username_1,
        username_2: dto.username_2,
    } as ChatDAO;
}

/**
 * Function to convert raw DTOs from the backend into ChatDAO objects.
 * @param dtos: json array received from the backend
 * @returns Array of ChatDAO objects
 */
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
function convertToMessageDAOs(dtos: any[]): MessageDAO[] {
    return dtos.map(dto => {
        return convertToMessageDAO(dto);
    }).filter((message): message is MessageDAO => message !== null);
}

/**
 * Retrieves all chats that the authenticated user is a member of.
 * @returns Promise resolving to an array of ChatDAO objects
 */
export const getChats = async (): Promise<ChatDAO[]> => {
    try {
        const res = await authFetch(`${BASE_URL}/chats/`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
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
 * Creates a new private chat with another user, or returns existing chat if one already exists.
 * @param otherUserId - The ID of the user to create a private chat with
 * @returns Promise resolving to the ChatDAO object representing the private chat
 */
export const createNewPrivateChat = async (otherUserId: number): Promise<ChatDAO> => {
    try {
        const res = await authFetch(`${BASE_URL}/chats/new_private/${otherUserId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!res.ok) {
            throw await toApiError(res);
        }
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
 * Creates a new group chat with the specified name.
 * @param groupName - The name for the new group chat
 * @returns Promise resolving to the ID of the newly created group chat
 */
export const createNewGroupChat = async (groupName: string): Promise<number> => {
    try {
        const res = await authFetch(`${BASE_URL}/chats/new_group`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
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
 * Retrieves all messages for a specific chat.
 * @param chatId - The ID of the chat to get messages for
 * @returns Promise resolving to an array of MessageDAO objects
 */
export const getChatMessages = async (chatId: number): Promise<MessageDAO[]> => {
    try {
        const res = await authFetch(`${BASE_URL}/chats/${chatId}/messages`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
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
 * Sends a new message to a specific chat.
 * @param payload - Object containing chat_id and message content
 */
export const sendChatMessage = async (payload: SendMessagePayload): Promise<void> => {
    try {
        const res = await authFetch(`${BASE_URL}/chats/${payload.chat_id}/messages`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
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
    sender_username?: string;
    group_name?: string;
}


/**
 * Function to convert raw DTO from the backend into InviteDAO object.
 * @param dto: invite json received from the backend
 * @returns InviteDAO object
 */
function convertToInviteDAO(dto: any): InviteDAO | null {
    if (typeof dto.id !== 'number' || typeof dto.chat_id !== 'number' || typeof dto.sender_id !== 'number' || typeof dto.receiver_id !== 'number' || (dto.accepted !== null && typeof dto.accepted !== 'boolean') || typeof dto.sent_at !== 'string') {
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
        sender_username: dto.sender_username,
        group_name: dto.group_name,
    } as InviteDAO;
}

/**
 * Function to convert raw DTOs from the backend into InviteDAO objects.
 * @param dtos: json array received from the backend
 * @returns Array of InviteDAO objects
 */
function convertToInviteDAOs(dtos: any[]): InviteDAO[] {
    return dtos.map(dto => {
        return convertToInviteDAO(dto);
    }).filter((invite): invite is InviteDAO => invite !== null);
}

/**
 * Sends an invitation to a user to join a specific chat.
 * @param receiver_id - The ID of the user to invite
 * @param chat_id - The ID of the chat to invite the user to
 */
export const inviteUser = async (receiver_id: number, chat_id: number): Promise<void> => {
    try {
        const res = await authFetch(`${BASE_URL}/invites/create`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
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
 * Retrieves all pending chat invitations for the authenticated user.
 * @returns Promise resolving to an array of InviteDAO objects
 */
export const getInvites = async (): Promise<InviteDAO[]> => {
    try {
        const res = await authFetch(`${BASE_URL}/invites/`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
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
 * Accepts a chat invitation and adds the user to the corresponding chat.
 * @param invite_id - The ID of the invitation to accept
 * @returns Promise resolving to the chat ID that the user has joined
 */
export const acceptInvite = async (invite_id: number): Promise<number> => {
    try {
        if (!invite_id || invite_id <= 0 || Number.isNaN(invite_id)) {
            throw new Error("Invalid invite ID");
        }
        const res = await authFetch(`${BASE_URL}/invites/accept/${invite_id}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
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
 * Rejects a chat invitation, removing it from the user's pending invites.
 * @param invite_id - The ID of the invitation to reject
 */
export const rejectInvite = async (invite_id: number): Promise<void> => {
    try {
        if (!invite_id || invite_id <= 0 || Number.isNaN(invite_id)) {
            throw new Error("Invalid invite ID");
        }
        const res = await authFetch(`${BASE_URL}/invites/reject/${invite_id}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
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

export type WsEventType = 'NEW_MESSAGE' | 'USER_JOINED' | 'USER_LEFT' | 'USER_TYPING' | 'NEW_CHAT' | 'NEW_INVITE' | 'CHAT_UPDATED' | 'REMOVED_FROM_GROUP';

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

/// CHAT COMPONENTS

/**
 * Data Access Object representing a Chat Component as received from the backend
 */
export interface ChatComponentDAO {
    chat_id: number;
    user_id: number;
    role: string;
    username?: string;
}

/**
 * Retrieves all components (members with roles) for a specific chat.
 * @param chatId - The ID of the chat to get components for
 * @returns Promise resolving to an array of ChatComponentDAO objects
 */
export const getChatComponents = async (chatId: number): Promise<ChatComponentDAO[]> => {
    try {
        const res = await authFetch(`${BASE_URL}/chat_components/${chatId}/`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!res.ok) {
            throw await toApiError(res);
        }
        return await res.json();
    } catch (error) {
        console.error("Error fetching chat components:", error);
        throw error;
    }
};

/**
 * Retrieves all members and pending invites for a specific chat.
 * @param chatId - The ID of the chat to get members for
 * @returns Promise resolving to an array of ChatMemberDAO objects
 */
export const getChatMembers = async (chatId: number): Promise<ChatMemberDAO[]> => {
    try {
        const res = await authFetch(`${BASE_URL}/chats/members/${chatId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!res.ok) {
            throw await toApiError(res);
        }
        return await res.json();
    } catch (error) {
        console.error("Error fetching chat members:", error);
        throw error;
    }
};

/**
 * Removes a user from a chat group. Requires admin privileges.
 * @param chatId - The ID of the chat to remove the member from
 * @param userId - The ID of the user to remove from the chat
 */
export const removeChatMember = async (chatId: number, userId: number): Promise<void> => {
    try {
        const res = await authFetch(`${BASE_URL}/chats/members/${chatId}/${userId}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!res.ok) {
            throw await toApiError(res);
        }
    } catch (error) {
        console.error("Error removing chat member:", error);
        throw error;
    }
};

