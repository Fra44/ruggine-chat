import React, { useState } from 'react';
import { ListGroup, Badge, Modal, Button } from 'react-bootstrap';
import type { ChatMemberDAO } from '../api/api';

interface MembersListProps {
    members: ChatMemberDAO[];
    isAdmin: boolean;
    currentUserId: number;
    onRemoveMember: (userId: number) => void;
}

const MembersList: React.FC<MembersListProps> = ({ members, isAdmin, currentUserId, onRemoveMember }) => {
    const [showConfirm, setShowConfirm] = useState(false);
    const [pendingMember, setPendingMember] = useState<{ user_id: number; username?: string } | null>(null);

    const openConfirm = (user_id: number, username?: string) => {
        setPendingMember({ user_id, username });
        setShowConfirm(true);
    };

    const handleConfirm = () => {
        if (pendingMember) onRemoveMember(pendingMember.user_id);
        setShowConfirm(false);
        setPendingMember(null);
    };

    const handleCancel = () => {
        setShowConfirm(false);
        setPendingMember(null);
    };

    return (
        <>
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
                                    onClick={() => openConfirm(member.user_id, member.username)}
                                    title="Remove member"
                                >
                                    🗑️
                                </span>
                            )}
                        </div>
                    </ListGroup.Item>
                ))}
            </ListGroup>

            <Modal show={showConfirm} onHide={handleCancel} centered>
                <Modal.Header closeButton>
                    <Modal.Title style={{ color: '#000' }}>Confirm removal</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ color: '#000' }}>
                    Are you sure you want to remove {pendingMember?.username ?? 'this user'}?
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCancel}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleConfirm}>
                        Remove
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default MembersList;