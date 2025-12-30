import React from 'react';
import { ListGroup, Badge } from 'react-bootstrap';
import type { ChatMemberDAO } from '../api/api';

interface MembersListProps {
    members: ChatMemberDAO[];
}

const MembersList: React.FC<MembersListProps> = ({ members }) => {
    return (
        <ListGroup>
            {members.map((member) => (
                <ListGroup.Item key={member.user_id} className="d-flex justify-content-between align-items-center">
                    {member.username}
                    <Badge bg={member.status === 'member' ? 'success' : 'warning'}>
                        {member.status === 'member' ? 'Member' : 'Invited'}
                    </Badge>
                </ListGroup.Item>
            ))}
        </ListGroup>
    );
};

export default MembersList;