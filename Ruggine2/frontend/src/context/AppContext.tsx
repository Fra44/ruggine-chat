import React, {
    createContext,
    useState,
    useContext,
    useEffect,
    useCallback
} from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

import type { User } from '../models/models';
import type { ChatDAO, MessageDAO, LoginUserPayload, LoginResponse, ServerWsMessage, WsEventType } from '../api/api';
import { loginUser, getChats, getChatMessages, sendChatMessage } from '../api/api';

interface AppContextType {
    user: User | null;
    chats: ChatDAO[];
    selectedChat: ChatDAO | null;
    messages: MessageDAO[];
    loadingChats: boolean;
    loadingMessages: boolean;

    // Azioni esposte
    login: (payload: LoginUserPayload) => Promise<LoginResponse>;
    logout: () => void;
    setSelectedChat: (chat: ChatDAO | null) => void;
    sendMessage: (chatId: number, content: string) => Promise<void>;
    fetchMessages: (chatId: number) => Promise<void>;
    // Usato solo per simulare l'aggiornamento (in un'app reale, questo è un'API REST)
    // setMessages: React.Dispatch<React.SetStateAction<MessageDAO[]>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// =========================================================================
// 2. FUNZIONE CUSTOM HOOK: useWebSocket (Gestione Connessione)
// =========================================================================

/**
 * Hook customizzato per gestire la logica di connessione/riconnessione WebSocket.
 * Non gestisce lo stato dell'app, ma solo il flusso di dati WS.
 */
const useWebSocket = (handleWsMessage: (msg: ServerWsMessage<any>) => void) => {
    const [socket, setSocket] = useState<WebSocket | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
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

    }, [handleWsMessage]);

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

            case 'CHAT_UPDATED':
                // Logica per gestire altri aggiornamenti, es. un messaggio letto
                // (Non implementato in dettaglio ma la struttura è qui)
                break;

            default:
                console.warn(`Unknown WS message type: ${type}`);
        }
    }, [selectedChat, chats]);

    // Avvia la connessione WebSocket
    useWebSocket(handleWsMessage);

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
                // In un'app reale, qui faresti una chiamata API per ottenere 
                // i dati dell'utente dal token (es. GET /api/me). 
                // Per ora, assumiamo di non avere i dati qui e reindirizziamo al login.
                // o cerchiamo di estrarre l'ID utente dal token se possibile lato client.

                // Per simulazione, navighiamo alla home e lasciamo che la HomePage 
                // gestisca la verifica, ma prima proviamo a estrarre l'ID utente 
                // dal token (se fosse un JWT non criptato)

                // Dato che LoginPage salva User info, proviamo a usare localStorage
                // per l'utente, se non è un dato sensibile.

                // In mancanza di un endpoint /me, forziamo il logout se il token è solo
                // una stringa vuota, altrimenti reindirizziamo.
                navigate('/homepage');
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

        login,
        logout,
        setSelectedChat: handleSetSelectedChat,
        sendMessage: handleSendMessage,
        fetchMessages,
    };

    return (
        <AppContext.Provider value={contextValue}>
            {children}
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