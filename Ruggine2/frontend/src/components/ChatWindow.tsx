// components/ChatWindow.tsx

import React, { useEffect, useRef } from 'react';
import { Card, Spinner } from 'react-bootstrap';
import { type ChatDAO, type MessageDAO, type SendMessagePayload, sendChatMessage } from '../api/api';
import { type User } from '../models/models';

interface ChatWindowProps {
    chat: ChatDAO | null;
    messages: MessageDAO[];
    loading: boolean;
    currentUser: User;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ chat, messages, loading, currentUser }) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [messageText, setMessageText] = React.useState<string>("");

    const handleSendMessage = async () => {
        if (!chat) return;
        const payload: SendMessagePayload = {
            chat_id: chat.id,
            content: messageText,
        }
        await sendChatMessage(payload);
        console.log("Sending message:", payload);
        setMessageText("");
    }

    // Scorri in fondo quando i messaggi cambiano
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    if (!chat) {
        return (
            <div className="d-flex justify-content-center align-items-center h-100 unselected-chat-message">
                <h1>Select a chat to start messaging</h1>
            </div>
        );
    }

    const getChatName = (chat: ChatDAO): string => {
        if (chat.chat_type === 'GROUP') {
            return chat.group_name || `Group Chat ${chat.id}`;
        } else if (chat.chat_type === 'PRIVATE') {
            // For private chats, show the other user's name
            if (chat.user_id_1 === currentUser?.user_id) {
                return chat.username_2 || `Private Chat ${chat.id}`;
            } else {
                return chat.username_1 || `Private Chat ${chat.id}`;
            }
        }
        return `Chat ${chat.id}`;
    };

    // Qui andrebbe il codice per determinare il nome/tipo di chat    
    return (
        <Card className="chat-window-card">
            <Card.Header className="chat-window-header">
                <h4 className="m-0">{getChatName(chat)}</h4>
            </Card.Header>

            <Card.Body className="chat-messages-body">
                {loading ? (
                    <div className="text-center mt-5">
                        <Spinner animation="border" variant="light" />
                    </div>
                ) : (
                    <div className="messages-container">
                        {messages.map((message) => {
                            const isMyMessage = message.sender_id === currentUser.user_id;

                            // Logica per visualizzare l'ID del mittente se NON è l'utente corrente
                            const senderLabel = isMyMessage
                                ? 'You'
                                : chat.chat_type === 'private'
                                    ? `Other user (${message.sender_id})`
                                    : `Sender ID: ${message.sender_id}`;

                            return (
                                <div
                                    key={message.id}
                                    className={`message-bubble-wrapper ${isMyMessage ? 'my-message' : 'other-message'}`}
                                >
                                    <div className={`message-bubble ${isMyMessage ? 'my-bubble' : 'other-bubble'}`}>

                                        {/* Mostra l'ID del mittente per i messaggi non tuoi in chat di gruppo, 
                                            o in chat private se necessario, ma non per i messaggi privati in generale per semplicità 
                                        */}
                                        {!isMyMessage && chat.chat_type === 'group' && (
                                            <div className="sender-label">{senderLabel}</div>
                                        )}

                                        <div className="message-content">{message.content}</div>
                                        <small className="message-timestamp">
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

            {/* Area di input messaggio (MOCK per ora) */}
            <Card.Footer className="message-input-area">
                <input type="text" placeholder="Type a message..." disabled={loading} onChange={(e) => setMessageText(e.target.value)} className="form-control message-input" />
                <button disabled={loading} className="btn btn-primary message-send-button" onClick={handleSendMessage} > Send </button>
            </Card.Footer>
        </Card>
    );
};

export default ChatWindow;