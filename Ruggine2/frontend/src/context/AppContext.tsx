import React, {
    createContext,
    useState,
    useContext,
    useEffect,
    useCallback,
    useRef
} from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import InviteModal from '../components/InviteModal';

import type { User } from '../models/models';
import type { ChatDAO, MessageDAO, LoginUserPayload, LoginResponse, ServerWsMessage, WsEventType, InviteDAO } from '../api/api';
import { loginUser, getChats, getChatMessages, sendChatMessage, getInvites, acceptInvite as acceptInviteApi, rejectInvite as rejectInviteApi, getUsernameFromUserId } from '../api/api';

interface AppContextType {
    user: User | null;
    chats: ChatDAO[];
    selectedChat: ChatDAO | null;
    messages: MessageDAO[];
    loadingChats: boolean;
    loadingMessages: boolean;
    invites: InviteDAO[];

    // Azioni esposte
    login: (payload: LoginUserPayload) => Promise<LoginResponse>;
    logout: () => void;
    setSelectedChat: (chat: ChatDAO | null) => void;
    sendMessage: (chatId: number, content: string) => Promise<void>;
    fetchMessages: (chatId: number) => Promise<void>;
    setChats: React.Dispatch<React.SetStateAction<ChatDAO[]>>;
    fetchInvites: () => Promise<void>;
    refreshChats: () => Promise<void>;
    acceptInvite: (invite_id: number) => Promise<void>;
    rejectInvite: (invite_id: number) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// =========================================================================
// 2. FUNZIONE CUSTOM HOOK: useWebSocket (Gestione Connessione)
// =========================================================================

/**
 * Hook customizzato per gestire la logica di connessione/riconnessione WebSocket.
 * Non gestisce lo stato dell'app, ma solo il flusso di dati WS.
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
        return () => {
            if (socket) {
                socket.close();
            }
        };
    }, [socket]);

    return socket;
};

// =========================================================================
// 3. PROVIDER PRINCIPALE (Gestione dello Stato e del Protocollo)
// =========================================================================

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const navigate = useNavigate();

    // STATI CENTRALI DELL'APPLICAZIONE (I tuoi 4 punti)
    const [user, setUser] = useState<User | null>(null);
    const [chats, setChats] = useState<ChatDAO[]>([]);
    const [selectedChat, setSelectedChat] = useState<ChatDAO | null>(null);
    const [messages, setMessages] = useState<MessageDAO[]>([]);
    const [invites, setInvites] = useState<InviteDAO[]>([]);

    // Ref to track invite ids to avoid races between fetch and WS events
    const invitesRef = useRef<Set<number>>(new Set());

    const addInvite = useCallback((inv: InviteDAO) => {
        if (invitesRef.current.has(inv.id)) return false;
        invitesRef.current.add(inv.id);
        setInvites(prev => [inv, ...prev]);
        return true;
    }, []);

    const removeInvite = useCallback((invite_id: number) => {
        invitesRef.current.delete(invite_id);
        setInvites(prev => prev.filter(inv => inv.id !== invite_id));
    }, []);

    // Ref per stabilizzare selectedChat nel callback WS
    const selectedChatRef = useRef<ChatDAO | null>(null);

    // STATI DI CARICAMENTO
    const [loadingChats, setLoadingChats] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);


    // Gestione della connessione WS
    // Hook migliorato con backoff di riconnessione e uso di ref per selectedChat
    const handleWsMessage = useCallback(async (msg: ServerWsMessage<any>) => {
        const { type, payload } = msg;

        switch (type) {
            case 'NEW_MESSAGE': {
                const newMessage = payload as MessageDAO;

                // Aggiorna la lista messaggi SOLO se l'utente è in quella chat
                if (selectedChatRef.current?.id === newMessage.chat_id) {
                    setMessages((prev) => [...prev, newMessage]);
                }

                // Aggiorna la lista chat (sposta in cima)
                setChats((prevChats) => {
                    let updatedChats = prevChats.filter(c => c.id !== newMessage.chat_id);
                    const chatToUpdate = prevChats.find(c => c.id === newMessage.chat_id);

                    if (chatToUpdate) {
                        const newChat: ChatDAO = { ...chatToUpdate, last_message_at: newMessage.sent_at, last_message_preview: newMessage.content };
                        updatedChats = [newChat, ...updatedChats];
                    }

                    return updatedChats.sort((a, b) => (b.last_message_at || '').localeCompare(a.last_message_at || ''));
                });

                // Notification for messages in chats not currently selected
                if (selectedChatRef.current?.id !== newMessage.chat_id) {
                    // try to find the chat locally
                    let chat = chats.find(c => c.id === newMessage.chat_id);

                    // if we don't have the chat yet (e.g. new group), fetch chats once
                    if (!chat) {
                        try {
                            const fetched = await getChats();
                            // merge/replace local chats with fetched list while preserving previews
                            setChats(prev => {
                                const map = new Map<number, ChatDAO>();
                                // index previous by id for quick lookup
                                const prevById = new Map(prev.map(p => [p.id, p] as [number, ChatDAO]));

                                fetched.forEach(c => {
                                    const existing = prevById.get(c.id);
                                    const preview = existing?.last_message_preview ?? c.last_message_preview ?? null;
                                    map.set(c.id, { ...c, last_message_preview: preview });
                                });

                                // include any prev chats not present in fetched
                                prev.forEach(c => { if (!map.has(c.id)) map.set(c.id, c); });

                                // ensure the chat for the incoming message has an updated preview/last_message_at
                                if (map.has(newMessage.chat_id)) {
                                    const entry = map.get(newMessage.chat_id)!;
                                    map.set(newMessage.chat_id, { ...entry, last_message_preview: newMessage.content, last_message_at: newMessage.sent_at });
                                } else {
                                    // if not present, try to update prev entry
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

                    const isGroup = chat?.chat_type && String(chat.chat_type).toLowerCase() === 'group';
                    if (isGroup) {
                        const chatName = chat?.group_name || `Chat ${newMessage.chat_id}`;
                        toast(`New message in ${chatName}`, { icon: '💬' });
                    } else if (chat && chat.chat_type && String(chat.chat_type).toLowerCase() === 'private') {
                        // private chat -> show sender name
                        getUsernameFromUserId(newMessage.sender_id).then(username => {
                            toast(`New message from ${username}`, { icon: '💬' });
                        }).catch(() => {
                            const chatName = chat?.group_name || `Chat ${newMessage.chat_id}`;
                            toast(`New message in ${chatName}`, { icon: '💬' });
                        });
                    } else {
                        // unknown chat: fall back to resolving sender or generic message
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
                const newChat = payload as ChatDAO;
                setChats(prev => [newChat, ...prev].sort((a, b) => (b.last_message_at || '').localeCompare(a.last_message_at || '')));
                toast.success('You have been added to a new chat!');
                break;
            }

            case 'NEW_INVITE': {
                try {
                    const newInvite = payload as InviteDAO;

                    // Try to enrich invite quickly (resolve sender name and group name) before adding,
                    // so that the modal shows human-friendly labels immediately.
                    const enriched: any = { ...newInvite };
                    const promises: Promise<any>[] = [];
                    if (!enriched.sender_username && newInvite.sender_id != null) {
                        promises.push(getUsernameFromUserId(newInvite.sender_id).then(n => { enriched.sender_username = n; }).catch(() => {}));
                    }
                    if (!enriched.group_name) {
                        // try to resolve from local chats state first
                        const localFound = chats.find(c => c.id === Number(newInvite.chat_id));
                        if (localFound) {
                            enriched.group_name = localFound.group_name ?? `Chat ${newInvite.chat_id}`;
                        } else {
                            // fallback: try a light external fetch but don't block long
                            promises.push(getChats().then(cs => {
                                const found = cs.find(c => c.id === Number(newInvite.chat_id));
                                if (found) enriched.group_name = found.group_name ?? `Chat ${newInvite.chat_id}`;
                            }).catch(() => {}));
                        }
                    }
                    // await enrichment but don't let it block forever
                    try {
                        await Promise.race([Promise.all(promises), new Promise(res => setTimeout(res, 300))]);
                    } catch (_e) {
                        // ignore
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

            case 'CHAT_UPDATED':
                // altri aggiornamenti
                break;

            default:
                console.warn(`Unknown WS message type: ${type}`);
        }
    }, [chats]);

    // Avvia la connessione WebSocket (ricrea la connessione quando cambia il token)
    const storedToken = localStorage.getItem('token');
    useWebSocket(handleWsMessage, storedToken);

    // Caricamento chat iniziali
    const loadInitialChats = useCallback(async () => {
        if (!user) return;
        setLoadingChats(true);
        try {
            const fetchedChats = await getChats();
            // Enrich chats with last_message_preview when possible
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

    // Refresh chats helper exposed to consumers: fetch chats and enrich previews
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

    // Carica gli inviti per l'utente
    const fetchInvites = useCallback(async () => {
        if (!user) return;
        try {
            const fetched = await getInvites();
            // Enrich invites with group_name (prefer local `chats` state to avoid extra API calls)
            let chatMap = new Map<number, any>();
            if (chats && chats.length > 0) {
                chats.forEach(c => chatMap.set(c.id, c));
            } else {
                try {
                    const fetchedChats = await getChats();
                    fetchedChats.forEach(c => chatMap.set(c.id, c));
                } catch (err) {
                    console.warn('fetchInvites: failed to fetch chats for enrichment', err);
                }
            }

            const enriched = await Promise.all(fetched.map(async (inv) => {
                const out = { ...inv } as any;
                if (!out.group_name) {
                    const found = chatMap.get(Number(inv.chat_id));
                    if (found) out.group_name = found.group_name ?? `Chat ${inv.chat_id}`;
                }
                if (!out.sender_username && inv.sender_id != null) {
                    try {
                        out.sender_username = await getUsernameFromUserId(inv.sender_id);
                    } catch (_err) {
                        // leave as undefined -> InviteModal will fallback
                    }
                }
                return out as InviteDAO;
            }));

            setInvites(prev => {
                // Merge without duplicates
                const existingIds = new Set(prev.map(inv => inv.id));
                const newInvites = enriched.filter(inv => !existingIds.has(inv.id));
                // update ref
                newInvites.forEach(n => invitesRef.current.add(n.id));
                return [...prev, ...newInvites];
            });
        } catch (err: any) {
            console.warn('Failed to fetch invites', err);
        }
    }, [user]);

    const handleAcceptInvite = useCallback(async (invite_id: number) => {
        try {
            const chatId = await acceptInviteApi(invite_id);
            // remove invite from list
            removeInvite(invite_id);
            // refresh chats (with previews) and select the created chat
            await refreshChats();
            const created = (await getChats()).find(c => c.id === chatId) ?? null;
            if (created) setSelectedChat(created);
            toast.success('Invite Accepted');
        } catch (err: any) {
            toast.error(err?.message || 'Error accepting invite');
            throw err;
        }
    }, []);

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

    // Caricamento messaggi per la chat selezionata
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

    // ------------------------------------
    // Azioni e side-effects
    // ------------------------------------

    // 1. Inizializzazione: Controlla il token all'avvio
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                // Proviamo a decodificare il token JWT per ricostruire lo stato `user`.
                try {
                    const decodePayload = (t: string) => {
                        const parts = t.split('.');
                        if (parts.length < 2) return null;
                        const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
                        // pad
                        const pad = b64.length % 4;
                        const padded = pad ? b64 + '='.repeat(4 - pad) : b64;
                        const json = atob(padded);
                        return JSON.parse(json);
                    };

                    const payload = decodePayload(token);
                    // If token has exp claim and it's expired -> force logout
                    if (payload && typeof payload.exp === 'number') {
                        const nowSec = Math.floor(Date.now() / 1000);
                        if (payload.exp <= nowSec) {
                            // token expired: remove and redirect to login
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
                            setUser({ user_id: id, username });
                            return;
                        }
                    }
                } catch (err) {
                    console.warn('Failed to decode token payload', err);
                }
                // fallback: se non riusciamo a ricostruire l'utente, rimuoviamo il token
                // per evitare loop e forziamo il logout
                // localStorage.removeItem('token');
                // navigate('/login');
            }
        };
        checkAuth();
    }, [navigate]);

    // 2. Caricamento chat all'autenticazione
    useEffect(() => {
        if (user) {
            loadInitialChats();
        }
    }, [user, loadInitialChats]);

    useEffect(() => {
        if (user) fetchInvites();
    }, [user, fetchInvites]);


    // 3. Funzione di Login
    const login = async (payload: LoginUserPayload): Promise<LoginResponse> => {
        const loginRes = await loginUser(payload);
        localStorage.setItem("token", loginRes.token);
        // Assicurati che l'ID utente sia gestito correttamente
        setUser({ user_id: loginRes.user_id, username: payload.username });
        return loginRes;
    };

    // 4. Funzione di Logout
    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        setChats([]);
        setSelectedChat(null);
        setMessages([]);
        navigate('/login');
    };

    // Ascolta l'evento globale emesso dalle chiamate API quando ricevono 401
    useEffect(() => {
        const handler = () => {
            toast.error('Session expired. Please login again.');
            logout();
        };
        window.addEventListener('app:unauthorized', handler as EventListener);
        return () => window.removeEventListener('app:unauthorized', handler as EventListener);
    }, [logout]);

    // 5. Gestione selezione chat (carica i messaggi)
    const handleSetSelectedChat = (chat: ChatDAO | null) => {
        setSelectedChat(chat);
        selectedChatRef.current = chat; // Aggiorna il ref per il WS handler
        setMessages([]); // Svuota i messaggi vecchi
        if (chat) {
            fetchMessages(chat.id);
        }
    };

    // 6. Invio Messaggio (Simulazione REST + Aggiornamento Locale)
    // Nota: Questo *dovrebbe* essere solo un'API REST. L'aggiornamento real-time 
    // della lista messaggi dovrebbe avvenire tramite WS (vedi caso NEW_MESSAGE)
    const handleSendMessage = async (chatId: number, content: string): Promise<void> => {
        if (!user) return;

        // Simula l'invio tramite API REST (che poi innescherà il WS per tutti)
        // Dobbiamo usare un mock o la funzione API reale per l'invio.
        // **Nel tuo ChatWindow.tsx stai usando `sendChatMessage`**
        // In un'applicazione reale, il server dovrebbe inviare un WS 
        // a te e agli altri utenti dopo aver salvato il messaggio.

        // --- CHIAMATA API DI INVIO ---
        await sendChatMessage({ chat_id: chatId, content: content });
        // --- FINE CHIAMATA API ---

        // Fintanto che il server invia il messaggio via WS, non serve 
        // aggiornare localmente la lista messages qui. Il messaggio 
        // WS 'NEW_MESSAGE' si occuperà di questo. 
        // In attesa di implementazione REST + WS completa, lo lasciamo così.
    };


    // Valore del Context
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
    };

    return (
        <AppContext.Provider value={contextValue}>
            {children}
            {user && <InviteModal />}
        </AppContext.Provider>
    );
};

// =========================================================================
// 4. CUSTOM HOOK PER L'USO NEI COMPONENTI
// =========================================================================

export const useAppContext = (): AppContextType => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};