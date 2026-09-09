import React, {
    createContext,
    useState,
    useContext,
    useEffect,
    useCallback,
    useRef
} from 'react';
import { loginUser, getChats, getChatMessages, sendChatMessage, getInvites, acceptInvite as acceptInviteApi, rejectInvite as rejectInviteApi, getUsernameFromUserId, getChatComponents } from '../api/api';
import type { ChatDAO, MessageDAO, LoginUserPayload, LoginResponse, ServerWsMessage, InviteDAO, ChatComponentDAO } from '../api/api';
import { useNavigate } from 'react-router-dom';
import type { User } from '../models/models';
import { toast } from 'react-hot-toast';
import InviteModal from '../components/InviteModal';

/**
 * Application context type defining the global state and actions available throughout the app.
 */
interface AppContextType {
    user: User | null;
    chats: ChatDAO[];
    selectedChat: ChatDAO | null;
    messages: MessageDAO[];
    loadingChats: boolean;
    loadingMessages: boolean;
    invites: InviteDAO[];
    chatComponents: ChatComponentDAO[];

    sendMessage: (chatId: number, content: string) => Promise<void>;
    login: (payload: LoginUserPayload) => Promise<LoginResponse>;
    setChats: React.Dispatch<React.SetStateAction<ChatDAO[]>>;
    fetchChatComponents: (chatId: number) => Promise<void>;
    acceptInvite: (invite_id: number) => Promise<void>;
    rejectInvite: (invite_id: number) => Promise<void>;
    fetchMessages: (chatId: number) => Promise<void>;
    setSelectedChat: (chat: ChatDAO | null) => void;
    fetchInvites: () => Promise<void>;
    refreshChats: () => Promise<void>;
    logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// =========================================================================
// 2. CUSTOM HOOK: useWebSocket (WebSocket Connection Management)
// =========================================================================

/**
 * Custom hook for managing WebSocket connection logic and reconnection.
 * Handles connection establishment, message handling, and automatic reconnection on disconnection.
 * @param handleWsMessage - Callback function to process incoming WebSocket messages
 * @param token - Authentication token for WebSocket connection
 * @returns The active WebSocket connection or null
 */
const useWebSocket = (handleWsMessage: (msg: ServerWsMessage<any>) => void, token: string | null) => {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [reconnectAttempts, setReconnectAttempts] = useState(0);
    const maxReconnectAttempts = 5;

    const connect = useCallback(() => {
        if (!token) return;
        const WS_URL = `ws://localhost:8080/ws/?token=${token}`;

        const ws = new WebSocket(WS_URL);
        setSocket(ws);

        ws.onopen = () => {
            console.log('WebSocket connected.');
            setReconnectAttempts(0);
        };
        ws.onclose = (event) => {
            console.log('WebSocket disconnected.');
            if (!event.wasClean && reconnectAttempts < maxReconnectAttempts) {
                const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
                console.log(`Attempting reconnect in ${delay}ms...`);
                setTimeout(() => {
                    setReconnectAttempts(prev => prev + 1);
                    connect();
                }, delay);
            }
        };
        ws.onerror = (error) => console.error('WebSocket error:', error);

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data) as ServerWsMessage<any>;
                handleWsMessage(message);
            } catch (e) {
                console.error('Failed to parse incoming WS message:', event.data, e);
            }
        };
    }, [handleWsMessage, token, reconnectAttempts, maxReconnectAttempts]);

    useEffect(() => {
        if (token && !socket) {
            connect();
        }
    }, [token, socket, connect]);

    useEffect(() => {
        if (socket) {
            if (token) {
                socket.close();
                setSocket(null);
                setReconnectAttempts(0);
                connect();
            } else {
                socket.close();
                setSocket(null);
            }
        }
    }, [token]);

    useEffect(() => {
        return () => {
            if (socket) {
                socket.close();
            }
        };
    }, [socket]);

    return socket;
};

// =========================================================================
// 3. MAIN PROVIDER (State Management and Protocol Handling)
// =========================================================================

/**
 * Main application provider component that manages global state and WebSocket communication.
 * Provides context for user authentication, chat management, messaging, and invites.
 * Handles real-time updates through WebSocket connections and manages application lifecycle.
 */
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    
    const [pendingAcceptedChatId, setPendingAcceptedChatId] = useState<number | null>(null);
    const [chatComponents, setChatComponents] = useState<ChatComponentDAO[]>([]);
    const [selectedChat, setSelectedChat] = useState<ChatDAO | null>(null);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [messages, setMessages] = useState<MessageDAO[]>([]);
    const [loadingChats, setLoadingChats] = useState(false);
    const [invites, setInvites] = useState<InviteDAO[]>([]);
    const [user, setUser] = useState<User | null>(null);
    const [chats, setChats] = useState<ChatDAO[]>([]);
    
    const selectedChatRef = useRef<ChatDAO | null>(null);
    const invitesRef = useRef<Set<number>>(new Set());
    const navigate = useNavigate();

    /**
     * Adds a new invite to the invites list, preventing duplicates.
     * @param inv - The invite to add
     * @returns True if added, false if already exists
     */
    const addInvite = useCallback((inv: InviteDAO) => {
        if (invitesRef.current.has(inv.id)) return false;
        invitesRef.current.add(inv.id);
        setInvites(prev => [inv, ...prev]);
        return true;
    }, []);

    /**
     * Removes an invite from the invites list by ID.
     * @param invite_id - The ID of the invite to remove
     */
    const removeInvite = useCallback((invite_id: number) => {
        invitesRef.current.delete(invite_id);
        setInvites(prev => prev.filter(inv => inv.id !== invite_id));
    }, []);

    /**
     * Handles incoming WebSocket messages and updates application state accordingly.
     * Processes different message types like new messages, chats, invites, and removals.
     * @param msg - The WebSocket message from the server
     */
    const handleWsMessage = useCallback(async (msg: ServerWsMessage<any>) => {
        const { type, payload } = msg;

        switch (type) {
            case 'NEW_MESSAGE': {
                // Handle new message: update chat list, add to current messages if chat is selected, show notification
                const newMessage = payload as MessageDAO;

                if (selectedChatRef.current?.id === newMessage.chat_id) {
                    setMessages((prev) => [...prev, newMessage]);
                }

                // Update chat list: move chat to top with updated last message info
                setChats((prevChats) => {
                    let updatedChats = prevChats.filter(c => c.id !== newMessage.chat_id);
                    const chatToUpdate = prevChats.find(c => c.id === newMessage.chat_id);

                    if (chatToUpdate) {
                        const newChat: ChatDAO = { ...chatToUpdate, last_message_at: newMessage.sent_at, last_message_preview: newMessage.content };
                        updatedChats = [newChat, ...updatedChats];
                    }

                    return updatedChats.sort((a, b) => (b.last_message_at || '').localeCompare(a.last_message_at || ''));
                });

                if (selectedChatRef.current?.id !== newMessage.chat_id) {
                    let chat = chats.find(c => c.id === newMessage.chat_id);

                    if (!chat) {
                        try {
                            const fetched = await getChats();
                            setChats(prev => {
                                const map = new Map<number, ChatDAO>();
                                const prevById = new Map(prev.map(p => [p.id, p] as [number, ChatDAO]));

                                fetched.forEach(c => {
                                    const existing = prevById.get(c.id);
                                    const preview = existing?.last_message_preview ?? c.last_message_preview ?? null;
                                    map.set(c.id, { ...c, last_message_preview: preview });
                                });

                                prev.forEach(c => { if (!map.has(c.id)) map.set(c.id, c); });

                                if (map.has(newMessage.chat_id)) {
                                    const entry = map.get(newMessage.chat_id)!;
                                    map.set(newMessage.chat_id, { ...entry, last_message_preview: newMessage.content, last_message_at: newMessage.sent_at });
                                } else {
                                    const prevEntry = prevById.get(newMessage.chat_id);
                                    if (prevEntry) {
                                        map.set(prevEntry.id, { ...prevEntry, last_message_preview: newMessage.content, last_message_at: newMessage.sent_at });
                                    }
                                }

                                return Array.from(map.values()).sort((a, b) => (b.last_message_at || '').localeCompare(a.last_message_at || ''));
                            });

                            chat = fetched.find(c => c.id === newMessage.chat_id) ?? undefined;
                        } catch (err) {
                            console.warn('Failed to fetch chats for WS notification', err);
                        }
                    }

                    if (user && Number(newMessage.sender_id) === Number(user.id)) {
                        break;
                    }

                    const isGroup = chat?.chat_type && String(chat.chat_type).toLowerCase() === 'group';
                    if (isGroup) {
                        const chatName = chat?.group_name || `Chat ${newMessage.chat_id}`;
                        toast(`New message in ${chatName}`, { icon: '💬' });
                    } else if (chat && chat.chat_type && String(chat.chat_type).toLowerCase() === 'private') {
                        getUsernameFromUserId(newMessage.sender_id).then(username => {
                            toast(`New message from ${username}`, { icon: '💬' });
                        }).catch(() => {
                            const chatName = chat?.group_name || `Chat ${newMessage.chat_id}`;
                            toast(`New message in ${chatName}`, { icon: '💬' });
                        });
                    } else {
                        getUsernameFromUserId(newMessage.sender_id).then(username => {
                            toast(`New message from ${username}`, { icon: '💬' });
                        }).catch(() => {
                            toast('New message', { icon: '💬' });
                        });
                    }
                }
                break;
            }

            case 'NEW_CHAT': {
                // Handle new chat creation: add to chat list, auto-select if from accepted invite
                const newChat = payload as ChatDAO;
                setChats(prev => [newChat, ...prev].sort((a, b) => (b.last_message_at || '').localeCompare(a.last_message_at || '')));
                
                if (pendingAcceptedChatId === newChat.id) {
                    setSelectedChat(newChat);
                    selectedChatRef.current = newChat;
                    setMessages([]);
                    setPendingAcceptedChatId(null);
                    try {
                        await fetchMessages(newChat.id);
                    } catch (_e) {
                    }
                }
                
                toast.success('You have been added to a new chat!');
                break;
            }

            case 'NEW_INVITE': {
                // Handle new invite: enrich with sender username and group name, add to invites list, show notification
                try {
                    const newInvite = payload as InviteDAO;

                    const enriched: any = { ...newInvite };
                    const promises: Promise<any>[] = [];
                    if (!enriched.sender_username && newInvite.sender_id != null) {
                        promises.push(getUsernameFromUserId(newInvite.sender_id).then(n => { enriched.sender_username = n; }).catch(() => {}));
                    }
                    if (!enriched.group_name) {
                        const localFound = chats.find(c => c.id === Number(newInvite.chat_id));
                        if (localFound) {
                            enriched.group_name = localFound.group_name ?? `Chat ${newInvite.chat_id}`;
                        } else {
                            promises.push(getChats().then(cs => {
                                const found = cs.find(c => c.id === Number(newInvite.chat_id));
                                if (found) enriched.group_name = found.group_name ?? `Chat ${newInvite.chat_id}`;
                            }).catch(() => {}));
                        }
                    }
                    try {
                        await Promise.race([Promise.all(promises), new Promise(res => setTimeout(res, 300))]);
                    } catch (_e) {
                    }

                    const added = addInvite(enriched as InviteDAO);
                    if (!added) break;

                    const provided = enriched.sender_username || (newInvite as any).sender_username;
                    if (provided) {
                        toast(`New invite from ${provided}`, { icon: '📨' });
                    } else if (newInvite.sender_id != null) {
                        getUsernameFromUserId(newInvite.sender_id).then(name => {
                            toast(`New invite from ${name}`, { icon: '📨' });
                        }).catch(() => {
                            toast('New invite received', { icon: '📨' });
                        });
                    } else {
                        toast('New invite received', { icon: '📨' });
                    }
                } catch (err) {
                    console.warn('Malformed NEW_INVITE payload', payload);
                }
                break;
            }

            case 'REMOVED_FROM_GROUP': {
                // Handle removal from group: remove chat from list, deselect if current, show error message
                try {
                    const data = JSON.parse(payload);
                    const chatId = data.chat_id;
                    const message = data.message || 'You have been removed from the group';
                    setChats(prev => prev.filter(c => c.id !== chatId));
                    if (selectedChat && selectedChat.id === chatId) {
                        setSelectedChat(null);
                        setMessages([]);
                    }
                    toast.error(message);
                } catch (err) {
                    console.warn('Malformed REMOVED_FROM_GROUP payload', payload);
                }
                break;
            }

            default:
                // Log unknown message types for debugging
                console.warn(`Unknown WS message type: ${type}`);
        }
    }, [chats, user, pendingAcceptedChatId]);

    const storedToken = localStorage.getItem('token');
    useWebSocket(handleWsMessage, storedToken);

    /**
     * Loads initial chats for the authenticated user, enriching them with message previews.
     */
    const loadInitialChats = useCallback(async () => {
        if (!user) return;
        setLoadingChats(true);
        try {
            const fetchedChats = await getChats();
            const enrich = async (chatsToEnrich: typeof fetchedChats) => {
                return await Promise.all(chatsToEnrich.map(async (c) => {
                    try {
                        const msgs = await getChatMessages(c.id);
                        const last = msgs.length ? msgs[msgs.length - 1] : null;
                        return { ...c, last_message_preview: last ? last.content : null };
                    } catch (err) {
                        return { ...c, last_message_preview: null };
                    }
                }));
            };

            const withPreview = await enrich(fetchedChats);
            const sortedChats = withPreview.sort((a, b) => (b.last_message_at || '').localeCompare(a.last_message_at || ''));
            setChats(sortedChats);
        } catch (err: any) {
            toast.error(err?.message || "Failed to load chats.");
        } finally {
            setLoadingChats(false);
        }
    }, [user]);

    /**
     * Refreshes the chats list, fetching from server and enriching with message previews.
     */
    const refreshChats = useCallback(async () => {
        if (!user) return;
        try {
            const fetchedChats = await getChats();
            const enriched = await Promise.all(fetchedChats.map(async (c) => {
                try {
                    const msgs = await getChatMessages(c.id);
                    const last = msgs.length ? msgs[msgs.length - 1] : null;
                    return { ...c, last_message_preview: last ? last.content : null };
                } catch (err) {
                    return { ...c, last_message_preview: null };
                }
            }));
            const sorted = enriched.sort((a, b) => (b.last_message_at || '').localeCompare(a.last_message_at || ''));
            setChats(sorted);
        } catch (err) {
            console.warn('Failed to refresh chats', err);
        }
    }, [user]);

    /**
     * Fetches pending invites for the current user.
     */
    const fetchInvites = useCallback(async () => {
        if (!user) return;
        try {
            const fetched = await getInvites();
            setInvites(prev => {
                const existingIds = new Set(prev.map(inv => inv.id));
                const newInvites = fetched.filter(inv => !existingIds.has(inv.id));
                newInvites.forEach(n => invitesRef.current.add(n.id));
                return [...prev, ...newInvites];
            });
        } catch (err: any) {
            console.warn('Failed to fetch invites', err);
        }
    }, [user]);

    /**
     * Accepts an invite and joins the corresponding chat.
     * @param invite_id - The ID of the invite to accept
     */
    const handleAcceptInvite = useCallback(async (invite_id: number) => {
        try {
            const chatId = await acceptInviteApi(invite_id);
            removeInvite(invite_id);
            setPendingAcceptedChatId(chatId);
            toast.success('Invite Accepted');
        } catch (err: any) {
            toast.error(err?.message || 'Error accepting invite');
            throw err;
        }
    }, []);

    /**
     * Rejects an invite and removes it from the list.
     * @param invite_id - The ID of the invite to reject
     */
    const handleRejectInvite = useCallback(async (invite_id: number) => {
        try {
            await rejectInviteApi(invite_id);
            removeInvite(invite_id);
            toast('Invite Rejected');
        } catch (err: any) {
            toast.error(err?.message || 'Error rejecting invite');
            throw err;
        }
    }, []);

    /**
     * Fetches chat components (members) for a group chat.
     * @param chatId - The ID of the chat to fetch components for
     */
    const fetchChatComponents = useCallback(async (chatId: number) => {
        if (!user) return;
        try {
            const components = await getChatComponents(chatId);
            setChatComponents(components);
        } catch (err: any) {
            console.warn('Failed to fetch chat components', err);
        }
    }, [user]);

    /**
     * Fetches messages for a specific chat.
     */
    const fetchMessages = useCallback(async (chatId: number) => {
        setLoadingMessages(true);
        try {
            const fetchedMessages = await getChatMessages(chatId);
            setMessages(fetchedMessages);
        } catch (err: any) {
            setMessages([]); // Svuota in caso di errore
            toast.error(err?.message || "Failed to load messages.");
        } finally {
            setLoadingMessages(false);
        }
    }, []);

    // Check authentication status on component mount and validate token expiration
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    // Decode JWT token payload to extract user information and check expiration
                    const decodePayload = (t: string) => {
                        const parts = t.split('.');
                        if (parts.length < 2) return null;
                        const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
                        const pad = b64.length % 4;
                        const padded = pad ? b64 + '='.repeat(4 - pad) : b64;
                        const json = atob(padded);
                        return JSON.parse(json);
                    };

                    const payload = decodePayload(token);
                    if (payload && typeof payload.exp === 'number') {
                        const nowSec = Math.floor(Date.now() / 1000);
                        if (payload.exp <= nowSec) {
                            localStorage.removeItem('token');
                            setUser(null);
                            navigate('/login');
                            return;
                        }
                    }
                    if (payload) {
                        const id = Number(payload.user_id ?? payload.sub ?? payload.uid ?? null);
                        const username = payload.username ?? payload.user ?? payload.name ?? null;
                        if (!Number.isNaN(id) && username) {
                            setUser({ id: id, username });
                            return;
                        }
                    }
                } catch (err) {
                    console.warn('Failed to decode token payload', err);
                }
            }
        };
        checkAuth();
    }, [navigate]);

    // Load initial chats when user is authenticated
    useEffect(() => {
        if (user) {
            loadInitialChats();
        }
    }, [user, loadInitialChats]);

    // Fetch pending invites when user is authenticated
    useEffect(() => {
        if (user) fetchInvites();
    }, [user, fetchInvites]);

    /**
     * Authenticates a user with the provided credentials.
     * Stores the token in localStorage and updates the user state.
     * @param payload - Login credentials (username and password)
     * @returns The login response containing the authentication token
     */
    const login = async (payload: LoginUserPayload): Promise<LoginResponse> => {
        const loginRes = await loginUser(payload);
        localStorage.setItem("token", loginRes.token);
        const decodePayload = (t: string) => {
            const parts = t.split('.');
            if (parts.length < 2) return null;
            const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            const pad = b64.length % 4;
            const padded = pad ? b64 + '='.repeat(4 - pad) : b64;
            const json = atob(padded);
            return JSON.parse(json);
        };
        const decoded = decodePayload(loginRes.token);
        if (decoded) {
            const id = Number(decoded.user_id ?? decoded.sub ?? decoded.uid ?? null);
            const username = decoded.username ?? decoded.user ?? decoded.name ?? payload.username;
            if (!Number.isNaN(id) && username) {
                setUser({ id, username });
            }
        }
        return loginRes;
    };

    /**
     * Logs out the current user by clearing authentication data and resetting application state.
     */
    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        setChats([]);
        setSelectedChat(null);
        setMessages([]);
        navigate('/login');
    };

    // Listen for unauthorized events to handle session expiration
    useEffect(() => {
        const handler = () => {
            toast.error('Session expired. Please login again.');
            logout();
        };
        window.addEventListener('app:unauthorized', handler as EventListener);
        return () => window.removeEventListener('app:unauthorized', handler as EventListener);
    }, [logout]);

    /**
     * Sets the currently selected chat and loads its messages and components.
     * @param chat - The chat to select, or null to deselect
     */
    const handleSetSelectedChat = (chat: ChatDAO | null) => {
        setSelectedChat(chat);
        selectedChatRef.current = chat; // Aggiorna il ref per il WS handler
        setMessages([]); // Svuota i messaggi vecchi
        setChatComponents([]); // Svuota i componenti vecchi
        if (chat) {
            fetchMessages(chat.id);
            if (chat.chat_type === 'GROUP') {
                fetchChatComponents(chat.id);
            }
        }
    };

    /**
     * Sends a message to the specified chat.
     * @param chatId - The ID of the chat to send the message to
     * @param content - The message content to send
     */
    const handleSendMessage = async (chatId: number, content: string): Promise<void> => {
        if (!user) return;
        await sendChatMessage({ chat_id: chatId, content: content });
    };

    const contextValue: AppContextType = {
        user,
        chats,
        selectedChat,
        messages,
        loadingChats,
        loadingMessages,
        invites,

        login,
        logout,
        setSelectedChat: handleSetSelectedChat,
        sendMessage: handleSendMessage,
        fetchMessages,
        setChats,
        refreshChats,
        fetchInvites,
        acceptInvite: handleAcceptInvite,
        rejectInvite: handleRejectInvite,
        chatComponents,
        fetchChatComponents,
    };

    return (
        <AppContext.Provider value={contextValue}>
            {children}
            {user && <InviteModal />}
        </AppContext.Provider>
    );
};

// =========================================================================
// 4. CUSTOM HOOK FOR USE IN COMPONENTS
// =========================================================================

/**
 * Custom hook to access the application context.
 * Must be used within an AppProvider component.
 * @returns The application context containing state and actions
 * @throws Error if used outside of AppProvider
 */
export const useAppContext = (): AppContextType => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};