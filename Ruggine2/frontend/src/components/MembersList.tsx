import React from 'react';
import { ListGroup, Badge } from 'react-bootstrap';
import type { ChatMemberDAO } from '../api/api';

interface MembersListProps {
    members: ChatMemberDAO[];
    isAdmin: boolean;
    currentUserId: number;
    onRemoveMember: (userId: number) => void;
}

const MembersList: React.FC<MembersListProps> = ({ members, isAdmin, currentUserId, onRemoveMember }) => {
    return (
        <ListGroup>
            {members.map((member) => (
                <ListGroup.Item key={member.user_id} className="d-flex justify-content-between align-items-center">
                    {member.username}
                    <div className="d-flex align-items-center">
                        <Badge bg={member.status === 'member' ? 'success' : 'warning'}>
                            {member.status === 'member' ? 'Member' : 'Invited'}
                        </Badge>
                        {isAdmin && member.user_id !== currentUserId && member.status === 'member' && (
                            <span
                                className="ms-2 text-danger"
                                style={{ cursor: 'pointer', fontSize: '1.2em' }}
                                onClick={() => onRemoveMember(member.user_id)}
                                title="Remove member"
                            >
                                🗑️
                            </span>
                        )}
                    </div>
                </ListGroup.Item>
            ))}
        </ListGroup>
    );
};

export default MembersList;