// components/ChatWindow.tsx

import React, { useEffect, useRef, useState } from 'react';
import { Card, Spinner, Button } from 'react-bootstrap';
// Rimosso: import { type ChatDAO, type MessageDAO, type SendMessagePayload, sendChatMessage } from '../api/api';
import { type ChatDAO, type MessageDAO, type ChatMemberDAO, getUsernameFromUserId, getChatMembers, removeChatMember } from '../api/api';
import { formatToUTCPlus1, chatMessageDateHeader } from '../utils/time';
import { type User } from '../models/models';
import { useAppContext } from '../context/AppContext'; // Importiamo il Context
import InviteUserModal from './InviteUserModal';
import MembersList from './MembersList';

interface ChatWindowProps {
    chat: ChatDAO | null;
    messages: MessageDAO[];
    loading: boolean;
    currentUser: User; // Rimosso se provenisse dal Context, ma mantenuto per chiarezza di responsabilità
    onClose: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ chat, messages, loading, currentUser, onClose }) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement | null>(null);
    const [messageText, setMessageText] = React.useState<string>("");
    const [usernames, setUsernames] = useState<Record<number, string>>({}); // Cache per username
    const [isSending, setIsSending] = useState(false); // Stato per disabilitare il bottone durante l'invio
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showMembers, setShowMembers] = useState(false);
    const [members, setMembers] = useState<ChatMemberDAO[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(false);

    // Otteniamo la funzione di invio messaggio dal Context
    const { sendMessage, chatComponents } = useAppContext();

    const handleSendMessage = async () => {
        if (!chat || messageText.trim() === "" || isSending) return;

        setIsSending(true);
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
        } finally {
            setIsSending(false);
        }
    }

    const handleToggleMembers = async () => {
        if (showMembers) {
            setShowMembers(false);
        } else {
            if (!chat) return;
            setLoadingMembers(true);
            try {
                const membersData = await getChatMembers(chat.id);
                setMembers(membersData);
                setShowMembers(true);
            } catch (error) {
                console.error("Error loading members:", error);
                // Puoi aggiungere un toast di errore qui
            } finally {
                setLoadingMembers(false);
            }
        }
    }

    const handleRemoveMember = async (userId: number) => {
        if (!chat) return;
        try {
            await removeChatMember(chat.id, userId);
            // Refresh the members list
            const membersData = await getChatMembers(chat.id);
            setMembers(membersData);
        } catch (error) {
            console.error("Error removing member:", error);
            // Show error toast
        }
    }

    // Scorri in fondo quando i messaggi cambiano (solo il container dei messaggi,
    // così non si scrolla la scrollbar globale dell'app)
    useEffect(() => {
        const c = messagesContainerRef.current;
        if (c) {
            try {
                c.scrollTo({ top: c.scrollHeight, behavior: 'smooth' });
                return;
            } catch (_e) {
                c.scrollTop = c.scrollHeight;
                return;
            }
        }

        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Reset showMembers when chat changes
    useEffect(() => {
        setShowMembers(false);
        setMembers([]);
    }, [chat]);

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
            if (chat.user_id_1 === currentUser?.id) { // Usiamo currentUser.id
                return chat.username_2 || `Private Chat ${chat.id}`;
            } else {
                return chat.username_1 || `Private Chat ${chat.id}`;
            }
        }
        return `Chat ${chat.id}`;
    };

    const isAdmin = (): boolean => {
        if (chat?.chat_type !== 'GROUP') return false;
        return chatComponents.some(comp => comp.user_id === currentUser?.id && comp.role === 'ADMIN');
    };

    // ... (resto del codice JSX invariato)
    return (
        <div className="position-relative h-100" style={{ width: '100%', minWidth: 0 }}>
            <button type="button" className="btn-close position-absolute top-0 end-0 m-2" onClick={onClose} aria-label="Chiudi chat" style={{ zIndex: 10 }}></button>
            <Card className="chat-window-card h-100" style={{ width: '100%', height: '100%', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <Card.Header className="chat-window-header d-flex justify-content-between align-items-center">
                    <h3>{getChatName()}</h3>
                    <div>
                        {chat?.chat_type === 'GROUP' && (
                            <Button variant="outline-secondary" size="sm" onClick={handleToggleMembers} className="me-2">
                                {loadingMembers ? <Spinner as="span" animation="border" size="sm" /> : 'Members'}
                            </Button>
                        )}
                        {chat?.chat_type === 'GROUP' && isAdmin() && (
                            <Button variant="primary" size="sm" onClick={() => setShowInviteModal(true)}>
                                Invite
                            </Button>
                        )}
                    </div>
                </Card.Header>

            {!showMembers && (
                <Card.Body ref={messagesContainerRef} className="chat-messages-container" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                {loading ? (
                    <div className="text-center mt-5" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Spinner animation="border" variant="light" />
                    </div>
                ) : (
                    <div className="messages-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(() => {
                            const nodes: React.ReactNode[] = [];
                            let prevKey: string | null = null;
                            for (let i = 0; i < messages.length; i++) {
                                const message = messages[i];
                                const adjustedDate = new Date(new Date(message.sent_at).getTime() + 60 * 60 * 1000);
                                const key = adjustedDate.toDateString();
                                if (prevKey !== key) {
                                    nodes.push(
                                        <div key={`d-${i}`} className="date-separator" style={{ textAlign: 'center', margin: '8px 0', fontSize: '0.85rem', color: 'rgba(150,150,150,0.9)' }}>
                                            {chatMessageDateHeader(message.sent_at)}
                                        </div>
                                    );
                                    prevKey = key;
                                }

                                const isMyMessage = message.sender_id === currentUser.id;
                                const username = usernames[message.sender_id];
                                const senderLabel = username && username !== 'loading' ? username : null;

                                nodes.push(
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
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                            marginBottom: '10px',
                                        }}
                                    >
                                        <div className="message-content-wrapper">
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
                                                {formatToUTCPlus1(message.sent_at)}
                                            </small>
                                        </div>
                                    </div>
                                );
                            }
                            nodes.push(<div key="end" ref={messagesEndRef} />);
                            return nodes;
                        })()}
                    </div>
                )}
            </Card.Body>
            )}

            {showMembers && (
                <Card.Body className="members-list position-relative" style={{ height: '100%', overflowY: 'auto' }}>
                    <button type="button" className="btn-close position-absolute top-0 end-0 m-2" onClick={handleToggleMembers} aria-label="Close members list" style={{ zIndex: 10 }}></button>
                    <h5 className="mt-3">Group Members</h5>
                    {loadingMembers ? (
                        <Spinner animation="border" />
                    ) : (
                            <MembersList members={members} isAdmin={isAdmin()} currentUserId={currentUser.id} onRemoveMember={handleRemoveMember} />
                    )}
                </Card.Body>
            )}

            {/* Area di input messaggio */}
            <Card.Footer className="message-input-area">
                <input
                    type="text"
                    placeholder="Type a message..."
                    disabled={loading || isSending}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSendMessage();
                    }}
                    className="form-control message-input"
                />
                <button
                    disabled={loading || messageText.trim() === "" || isSending}
                    className="btn btn-primary message-send-button"
                    onClick={handleSendMessage}
                >
                    Send
                </button>
            </Card.Footer>
        </Card>
        {chat && <InviteUserModal show={showInviteModal} onHide={() => setShowInviteModal(false)} chatId={chat.id} />}
        </div>
    );
};

export default ChatWindow;