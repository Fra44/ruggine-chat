// components/ChatList.tsx

import React from 'react';
import { ListGroup } from 'react-bootstrap';
import { type ChatDAO } from '../api/api';
import type { User } from '../models/models';

interface ChatListProps {
    chats: ChatDAO[];
    selectedChatId: number | undefined;
    onSelectChat: (chat: ChatDAO) => void;
    user: User
}

export const ChatList: React.FC<ChatListProps> = ({ chats, selectedChatId, onSelectChat, user }) => {

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

    return (
        <ListGroup variant="flush" className="chat-list-group">
            {chats.length === 0 ? (
                <div className="text-center mt-3 auth-secondary-text">No chats yet.</div>
            ) : (
                chats.map((chat) => (
                    <ListGroup.Item
                        key={chat.id}
                        action
                        onClick={() => onSelectChat(chat)}
                        active={chat.id === selectedChatId}
                        className="chat-list-item"
                    >
                        <div className="chat-item-name">{getChatName(chat)}</div>
                        <small className="chat-item-time">
                            {chat.last_message_at ? new Date(chat.last_message_at).toLocaleTimeString() : 'No messages'}
                        </small>
                    </ListGroup.Item>
                ))
            )}
        </ListGroup>
    );
};

export default ChatList;