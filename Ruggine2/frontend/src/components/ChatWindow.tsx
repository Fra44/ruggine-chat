// components/ChatWindow.tsx

import React, { useEffect, useRef, useState } from 'react';
import { Card, Spinner } from 'react-bootstrap';
// Rimosso: import { type ChatDAO, type MessageDAO, type SendMessagePayload, sendChatMessage } from '../api/api';
import { type ChatDAO, type MessageDAO, getUsernameFromUserId } from '../api/api';
import { type User } from '../models/models';
import { useAppContext } from '../context/AppContext'; // Importiamo il Context

interface ChatWindowProps {
    chat: ChatDAO | null;
    messages: MessageDAO[];
    loading: boolean;
    currentUser: User; // Rimosso se provenisse dal Context, ma mantenuto per chiarezza di responsabilità
    onClose: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ chat, messages, loading, currentUser, onClose }) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [messageText, setMessageText] = React.useState<string>("");
    const [usernames, setUsernames] = useState<Record<number, string>>({}); // Cache per username

    // Otteniamo la funzione di invio messaggio dal Context
    const { sendMessage } = useAppContext();

    const handleSendMessage = async () => {
        if (!chat || messageText.trim() === "") return;

        try {
            // Rimuoviamo la logica API locale e usiamo la funzione esposta dal Context
            // che si occuperà di chiamare la REST API e il WS (se implementato)
            await sendMessage(chat.id, messageText.trim());

            // Dato che il server invierà il messaggio tramite WS, 
            // l'aggiornamento della UI avverrà automaticamente dal Context
            setMessageText("");
        } catch (e) {
            console.error("Error sending message:", e);
            // Aggiungi un toast.error se necessario
        }
    }

    // Scorri in fondo quando i messaggi cambiano
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Recupera username per sender_id non cachati
    useEffect(() => {
        const fetchUsernames = async () => {
            const uniqueSenderIds = [...new Set(messages.map(m => m.sender_id))];
            const missingIds = uniqueSenderIds.filter(id => !usernames[id]);

            const promises = missingIds.map(async (id) => {
                try {
                    const username = await getUsernameFromUserId(id);
                    setUsernames(prev => ({ ...prev, [id]: username }));
                } catch (error) {
                    console.error(`Failed to fetch username for ${id}:`, error);
                    setUsernames(prev => ({ ...prev, [id]: `User ${id}` }));
                }
            });

            await Promise.all(promises);
        };

        if (messages.length > 0) {
            fetchUsernames();
        }
    }, [messages]);

    if (!chat) {
        return (
            <div className="d-flex justify-content-center align-items-center h-100 unselected-chat-message" style={{ width: '100%', minWidth: 0 }}>
                <h1>Select a chat to start messaging</h1>
            </div>
        );
    }

    const getChatName = (): string => {
        if (chat.chat_type === 'GROUP') {
            return chat.group_name || `Group Chat ${chat.id}`;
        } else if (chat.chat_type === 'PRIVATE') {
            // Per chat private, mostra il nome dell'altro utente
            if (chat.user_id_1 === currentUser?.user_id) { // Usiamo currentUser.id (assumendo l'aggiornamento in models.ts)
                return chat.username_2 || `Private Chat ${chat.id}`;
            } else {
                return chat.username_1 || `Private Chat ${chat.id}`;
            }
        }
        return `Chat ${chat.id}`;
    };

    // ... (resto del codice JSX invariato)
    return (
        <div className="position-relative h-100" style={{ width: '100%', minWidth: 0 }}>
            <button type="button" className="btn-close position-absolute top-0 end-0 m-2" onClick={onClose} aria-label="Chiudi chat" style={{ zIndex: 10 }}></button>
            <Card className="chat-window-card h-100" style={{ width: '100%', height: '100%', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <Card.Header className="chat-window-header">
                    <h3>{getChatName()}</h3>
                </Card.Header>

            <Card.Body className="chat-messages-container" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                {loading ? (
                    <div className="text-center mt-5" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Spinner animation="border" variant="light" />
                    </div>
                ) : (
                    <div className="messages-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {messages.map((message) => {
                            const isMyMessage = message.sender_id === currentUser.user_id; // Usiamo currentUser.id

                            // Usa lo username dal cache
                            const username = usernames[message.sender_id];
                            const senderLabel = username && username !== 'loading' ? username : null;

                            return (
                                <div
                                    key={message.id}
                                    className={`message-bubble ${isMyMessage ? 'my-message' : 'other-message'}`}
                                    style={{
                                        alignSelf: isMyMessage ? 'flex-end' : 'flex-start',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        maxWidth: '60%',
                                        padding: '10px',
                                        borderRadius: '10px',
                                        backgroundColor: isMyMessage ? '#DCF8C6' : '#FFFFFF',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                        marginBottom: '10px',
                                    }}
                                >
                                    <div className="message-content-wrapper">
                                        {/* Mostra il nome del mittente solo nei gruppi o se non è il mio messaggio */}
                                        {/* Aggiunto controllo per il tipo di chat come suggerito nel tuo codice originale */}
                                        {!isMyMessage && chat.chat_type === 'GROUP' && senderLabel && (
                                            <div className="sender-label" style={{ fontSize: '0.85em', color: '#555' }}>
                                                {senderLabel}
                                            </div>
                                        )}

                                        <div className="message-content" style={{ fontSize: '1em', marginBottom: '5px' }}>
                                            {message.content}
                                        </div>
                                        <small
                                            className="message-timestamp"
                                            style={{
                                                alignSelf: isMyMessage ? 'flex-end' : 'flex-start',
                                                fontSize: '0.75em',
                                                color: '#888',
                                            }}
                                        >
                                            {new Date(message.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </small>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </Card.Body>

            {/* Area di input messaggio */}
            <Card.Footer className="message-input-area">
                <input
                    type="text"
                    placeholder="Type a message..."
                    disabled={loading}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSendMessage();
                    }}
                    className="form-control message-input"
                />
                <button
                    disabled={loading || messageText.trim() === ""}
                    className="btn btn-primary message-send-button"
                    onClick={handleSendMessage}
                >
                    Send
                </button>
            </Card.Footer>
        </Card>
        </div>
    );
};

export default ChatWindow;