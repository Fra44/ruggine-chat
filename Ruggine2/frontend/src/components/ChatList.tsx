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
                        className="chat-list-item"
                    >
                        <div className="chat-item-body">
                            <div className="chat-item-name">{getChatName(chat)}</div>
                            <small className="chat-item-time">
                                {chat.last_message_at ? new Date(chat.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No messages'}
                            </small>
                        </div>
                    </ListGroup.Item>
                ))
            )}
        </ListGroup>
    );
};

export default ChatList;