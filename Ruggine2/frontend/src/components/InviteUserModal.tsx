import { Modal, Button, Form, Spinner, ListGroup } from 'react-bootstrap';
import { searchUsersByPrefix, inviteUser } from '../api/api';
import { useAppContext } from '../context/AppContext';
import { useEffect, useState } from 'react';
import type { User } from '../models/models';

interface InviteUserModalProps {
    show: boolean;
    onHide: () => void;
    chatId: number;
}

/**
 * InviteUserModal component that allows group admins to search for and invite users to join a group chat.
 * Provides real-time user search with debouncing, filters out existing group members,
 * and handles invitation sending with loading states and error handling.
 * @param show - Controls modal visibility
 * @param onHide - Callback function to close the modal
 * @param chatId - ID of the group chat to invite users to
 */
export default function InviteUserModal({ show, onHide, chatId }: InviteUserModalProps) {
    const { chatComponents } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');                                         // Current search input value
    const [searchResults, setSearchResults] = useState<User[]>([]);                           // Filtered search results
    const [loading, setLoading] = useState(false);                                           // Loading state for search requests
    const [inviting, setInviting] = useState<number | null>(null);                            // User ID currently being invited

    // Debounced search for users when search term changes (minimum 3 characters)
    useEffect(() => {
        if (searchTerm.length > 2) {
            const search = async () => {
                setLoading(true);
                try {
                    const results = await searchUsersByPrefix(searchTerm);
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

    /**
     * Sends an invitation to a user to join the group chat.
     * Removes the user from search results after successful invitation.
     * @param userId - The ID of the user to invite
     */
    const handleInvite = async (userId: number) => {
        setInviting(userId);
        try {
            await inviteUser(userId, chatId);
            setSearchResults(prev => prev.filter(u => u.id !== userId));
        } catch (error) {
            console.error('Error inviting user:', error);
        } finally {
            setInviting(null);
        }
    };

    /**
     * Closes the modal and resets the search state.
     * Clears search term and results to prepare for next use.
     */
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