import { useEffect, useState } from 'react';
import { Modal, Button, Form, Spinner, ListGroup } from 'react-bootstrap';
import { useAppContext } from '../context/AppContext';
import { searchUsersByPrefix, inviteUser } from '../api/api';
import type { User } from '../models/models';

interface InviteUserModalProps {
    show: boolean;
    onHide: () => void;
    chatId: number;
}

export default function InviteUserModal({ show, onHide, chatId }: InviteUserModalProps) {
    const { chatComponents } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [inviting, setInviting] = useState<number | null>(null);

    useEffect(() => {
        if (searchTerm.length > 2) {
            const search = async () => {
                setLoading(true);
                try {
                    const results = await searchUsersByPrefix(searchTerm);
                    // Filter out users already in the chat
                    const filtered = results.filter(user =>
                        !chatComponents.some(comp => comp.user_id === user.id)
                    );
                    setSearchResults(filtered);
                } catch (error) {
                    console.error('Error searching users:', error);
                    setSearchResults([]);
                } finally {
                    setLoading(false);
                }
            };
            const timeoutId = setTimeout(search, 300);
            return () => clearTimeout(timeoutId);
        } else {
            setSearchResults([]);
        }
    }, [searchTerm, chatComponents]);

    const handleInvite = async (userId: number) => {
        setInviting(userId);
        try {
            await inviteUser(userId, chatId);
            // Remove from search results
            setSearchResults(prev => prev.filter(u => u.id !== userId));
        } catch (error) {
            console.error('Error inviting user:', error);
        } finally {
            setInviting(null);
        }
    };

    const handleClose = () => {
        setSearchTerm('');
        setSearchResults([]);
        onHide();
    };

    return (
        <Modal show={show} onHide={handleClose} centered className="text-dark">
            <Modal.Header closeButton>
                <Modal.Title>Invite Users to Group</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form.Group className="mb-3">
                    <Form.Label className="text-dark">Search Users</Form.Label>
                    <Form.Control
                        type="text"
                        placeholder="Type username..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </Form.Group>
                {loading && <Spinner animation="border" />}
                <ListGroup variant="flush">
                    {searchResults.map(user => (
                        <ListGroup.Item key={user.id} className="d-flex justify-content-between align-items-center">
                            <span>{user.username}</span>
                            <Button
                                size="sm"
                                onClick={() => handleInvite(user.id)}
                                disabled={inviting === user.id}
                            >
                                {inviting === user.id ? <Spinner animation="border" size="sm" /> : 'Invite'}
                            </Button>
                        </ListGroup.Item>
                    ))}
                </ListGroup>
                {searchTerm.length > 2 && !loading && searchResults.length === 0 && (
                    <div className="text-muted">No users found or already in group.</div>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>Close</Button>
            </Modal.Footer>
        </Modal>
    );
}