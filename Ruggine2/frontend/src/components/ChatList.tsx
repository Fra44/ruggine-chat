// components/ChatList.tsx

import React from 'react';
import { ListGroup } from 'react-bootstrap';
import './ChatList.css';
import { type ChatDAO } from '../api/api';
import type { User } from '../models/models';

interface ChatListProps {
    chats: ChatDAO[];
    selectedChatId: number | undefined;
    onSelectChat: (chat: ChatDAO) => void;
    user: User;
    search: string;
}

export const ChatList: React.FC<ChatListProps> = ({ chats, selectedChatId, onSelectChat, user, search }) => {

    const getChatName = (chat: ChatDAO): string => {
        if (chat.chat_type === 'GROUP') {
            return chat.group_name || `Group Chat ${chat.id}`;
        } else if (chat.chat_type === 'PRIVATE') {
            // For private chats, show the other user's name
            if (chat.user_id_1 === user?.user_id) {
                return chat.username_2 || `Private Chat ${chat.id}`;
            } else {
                return chat.username_1 || `Private Chat ${chat.id}`;
            }
        }
        return `Chat ${chat.id}`;
    };

    // Filtra le chat in base al testo della searchbox (case-insensitive)
    const filteredChats = chats.filter(chat =>
        getChatName(chat).toLowerCase().includes(search.toLowerCase())
    );

    return (
        <ListGroup variant="flush" className="chat-list-group">
            {filteredChats.length === 0 ? (
                <div className="text-center mt-3 auth-secondary-text">No chats yet.</div>
            ) : (
                filteredChats.map((chat) => (
                    <ListGroup.Item
                        key={chat.id}
                        action
                        onClick={() => onSelectChat(chat)}
                        active={chat.id === selectedChatId}
                        className="chat-list-item d-flex"
                    >
                                                <div className="chat-avatar me-3">
                                                        {chat.chat_type === 'GROUP' ? (
                                                                <svg viewBox="0 0 48 48" height="48" width="48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                                                                    <title>Icona Gruppo</title>
                                                                    <path 
                                                                        fillRule="evenodd" 
                                                                        clipRule="evenodd" 
                                                                        d="M17.822 21.678Q19.143 23 21 23t3.178-1.322T25.5 18.5t-1.322-3.178Q22.857 14 21 14t-3.178 1.322T16.5 18.5t1.322 3.178M12.66 32.34q.66.66 1.589.661h13.5q.928 0 1.59-.66.66-.662.66-1.59v-.9q0-.956-.492-1.758A3.3 3.3 0 0 0 28.2 26.87a16.7 16.7 0 0 0-3.544-1.308q-1.8-.435-3.656-.436-1.856 0-3.656.436T13.8 26.869a3.3 3.3 0 0 0-1.308 1.223A3.3 3.3 0 0 0 12 29.85v.9q0 .928.66 1.59m21.09.66h-2.392A4.16 4.16 0 0 0 32 30.75v-.9c0-1-.263-1.95-.788-2.804a5.3 5.3 0 0 0-1.675-1.713q.563.093 1.119.228 1.8.436 3.544 1.308.815.422 1.308 1.223.492.802.492 1.758v.9q0 .928-.661 1.59-.66.66-1.59.66M27 23a4.6 4.6 0 0 1-1.18-.147c1.105-1.211 1.68-2.692 1.68-4.353s-.575-3.142-1.68-4.353A4.6 4.6 0 0 1 27 14q1.856 0 3.178 1.322Q31.5 16.643 31.5 18.5t-1.322 3.178T27 23"
                                                                        fill="currentColor">
                                                                    </path>
                                                                </svg>
                                                        ) : (
                                                                getChatName(chat).split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase()
                                                        )}
                                                </div>
                        <div className="flex-grow-1 chat-item-body">
                            <div className="d-flex justify-content-between align-items-start">
                                <div className="chat-item-name text-truncate">{getChatName(chat)}</div>
                                <small className="chat-item-time text-nowrap ms-2">
                                    {chat.last_message_at ? new Date(chat.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                </small>
                            </div>
                            {chat.last_message_preview ? (
                                <div className="chat-item-subtitle text-truncate text-muted">{chat.last_message_preview}</div>
                            ) : null}
                        </div>
                    </ListGroup.Item>
                ))
            )}
        </ListGroup>
    );
};

export default ChatList;