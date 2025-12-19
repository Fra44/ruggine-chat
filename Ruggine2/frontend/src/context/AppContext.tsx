import React, {
    createContext,
    useState,
    useContext,
    useEffect,
    useCallback
} from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import InviteModal from '../components/InviteModal';

import type { User } from '../models/models';
import type { ChatDAO, MessageDAO, LoginUserPayload, LoginResponse, ServerWsMessage, WsEventType, InviteDAO } from '../api/api';
import { loginUser, getChats, getChatMessages, sendChatMessage, getInvites, acceptInvite as acceptInviteApi, rejectInvite as rejectInviteApi } from '../api/api';

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

    useEffect(() => {
        if (!token) return;
        // URL of the WebSocket "endpoint"
        const WS_URL = `ws://localhost:8080/ws/?token=${token}`;

        const ws = new WebSocket(WS_URL);
        setSocket(ws);

        ws.onopen = () => console.log('WebSocket connected.');
        ws.onclose = () => console.log('WebSocket disconnected. Attempting reconnect...');
        ws.onerror = (error) => console.error('WebSocket error:', error);

        ws.onmessage = (event) => {
            try {
                // Parsing e dispatching del messaggio al gestore centrale
                const message = JSON.parse(event.data) as ServerWsMessage<any>;
                handleWsMessage(message);
            } catch (e) {
                console.error('Failed to parse incoming WS message:', event.data, e);
            }
        };

        // Cleanup al dismount del componente o quando le dipendenze cambiano
        return () => {
            console.log('Closing WebSocket connection.');
            ws.close();
        };

    }, [handleWsMessage, token]);

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

    // STATI DI CARICAMENTO
    const [loadingChats, setLoadingChats] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);

    // Gestione della connessione WS
    // Si usa useCallback per stabilizzare la funzione di gestione dei messaggi
    const handleWsMessage = useCallback((msg: ServerWsMessage<any>) => {
        const { type, payload } = msg;

        switch (type) {
            case 'NEW_MESSAGE':
                const newMessage = payload as MessageDAO;

                // 1. Aggiorna la lista messaggi SOLO se l'utente è in quella chat
                if (selectedChat?.id === newMessage.chat_id) {
                    setMessages((prev) => [...prev, newMessage]);
                }

                // 2. Aggiorna la lista chat (sposta in cima)
                setChats((prevChats) => {
                    let updatedChats = prevChats.filter(c => c.id !== newMessage.chat_id);
                    const chatToUpdate = prevChats.find(c => c.id === newMessage.chat_id);

                    if (chatToUpdate) {
                        const newChat: ChatDAO = { ...chatToUpdate, last_message_at: newMessage.sent_at };
                        // Inserisce la chat aggiornata in cima
                        updatedChats = [newChat, ...updatedChats];
                    }

                    // Riordina per last_message_at (il più recente in cima)
                    return updatedChats.sort((a, b) =>
                        (b.last_message_at || '').localeCompare(a.last_message_at || '')
                    );
                });

                // Opzionale: notifiche per messaggi in chat non selezionate
                if (selectedChat?.id !== newMessage.chat_id) {
                    const chatName = chats.find(c => c.id === newMessage.chat_id)?.group_name || `Chat ${newMessage.chat_id}`;
                    toast(`New message in ${chatName}`, { icon: '💬' });
                }
                break;

            case 'NEW_CHAT':
                const newChat = payload as ChatDAO;
                setChats(prev => [newChat, ...prev].sort((a, b) =>
                    (b.last_message_at || '').localeCompare(a.last_message_at || '')
                ));
                toast.success("You have been added to a new chat!");
                break;

            case 'NEW_INVITE':
                try {
                    const newInvite = payload as InviteDAO;
                    let added = false;
                    setInvites(prev => {
                        // Check if invite already exists
                        if (prev.some(inv => inv.id === newInvite.id)) {
                            return prev; // Already exists, no change
                        }
                        added = true;
                        return [newInvite, ...prev];
                    });
                    if (added) {
                        toast(`Nuovo invito da utente ${newInvite.sender_id}`, { icon: '📨' });
                    }
                } catch (err) {
                    console.warn('Malformed NEW_INVITE payload', payload);
                }
                break;

            case 'CHAT_UPDATED':
                // Logica per gestire altri aggiornamenti, es. un messaggio letto
                // (Non implementato in dettaglio ma la struttura è qui)
                break;

            default:
                console.warn(`Unknown WS message type: ${type}`);
        }
    }, [selectedChat, chats]);

    // Avvia la connessione WebSocket (ricrea la connessione quando cambia il token)
    const storedToken = localStorage.getItem('token');
    useWebSocket(handleWsMessage, storedToken);

    // Caricamento chat iniziali
    const loadInitialChats = useCallback(async () => {
        if (!user) return;
        setLoadingChats(true);
        try {
            const fetchedChats = await getChats();
            // Ordina subito le chat per last_message_at
            const sortedChats = fetchedChats.sort((a, b) =>
                (b.last_message_at || '').localeCompare(a.last_message_at || '')
            );
            setChats(sortedChats);
        } catch (err: any) {
            toast.error(err?.message || "Failed to load chats.");
        } finally {
            setLoadingChats(false);
        }
    }, [user]);

    // Carica gli inviti per l'utente
    const fetchInvites = useCallback(async () => {
        if (!user) return;
        try {
            const fetched = await getInvites();
            setInvites(prev => {
                // Merge without duplicates
                const existingIds = new Set(prev.map(inv => inv.id));
                const newInvites = fetched.filter(inv => !existingIds.has(inv.id));
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
            setInvites(prev => prev.filter(inv => inv.id !== invite_id));
            // refresh chats and select the created chat
            const updatedChats = await getChats();
            setChats(updatedChats);
            const created = updatedChats.find(c => c.id === chatId) ?? null;
            if (created) setSelectedChat(created);
            toast.success('Invito accettato');
        } catch (err: any) {
            toast.error(err?.message || 'Errore accettando invito');
            throw err;
        }
    }, []);

    const handleRejectInvite = useCallback(async (invite_id: number) => {
        try {
            await rejectInviteApi(invite_id);
            setInvites(prev => prev.filter(inv => inv.id !== invite_id));
            toast('Invito rifiutato');
        } catch (err: any) {
            toast.error(err?.message || 'Errore rifiutando invito');
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

    // 5. Gestione selezione chat (carica i messaggi)
    const handleSetSelectedChat = (chat: ChatDAO | null) => {
        setSelectedChat(chat);
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