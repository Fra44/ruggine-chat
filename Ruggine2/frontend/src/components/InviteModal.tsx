import { Modal, Button, Spinner } from 'react-bootstrap';
import { useAppContext } from '../context/AppContext';
import { getUsernameFromUserId } from '../api/api';
import { useEffect, useState } from 'react';

/**
 * InviteModal component that displays pending chat invitations to the user.
 * Shows the first pending invite with sender information and group details.
 * Allows users to accept or reject invites, with loading states and error handling.
 * Automatically shows when new invites are available and hides when none remain.
 */
export default function InviteModal() {
    const { invites, acceptInvite, rejectInvite } = useAppContext();
    const [currentInvite, setCurrentInvite] = useState<any | null>(null);                      // Currently displayed invite
    const [senderName, setSenderName] = useState<string | null>(null);                        // Cached sender username
    const [groupName, setGroupName] = useState<string | null>(null);                          // Cached group name
    const [loadingSender, setLoadingSender] = useState(false);                               // Loading state for sender name fetch
    const [loadingGroup, setLoadingGroup] = useState(false);                                 // Loading state for group name fetch
    const [processing, setProcessing] = useState(false);                                      // Loading state for accept/reject actions
    const [show, setShow] = useState(false);                                                  // Modal visibility state

    // Show modal when invites are available, hide when none remain
    useEffect(() => {
        if (invites && invites.length > 0) {
            setCurrentInvite(invites[0]);
            setShow(true);
        } else {
            setCurrentInvite(null);
            setShow(false);
        }
    }, [invites]);

    // Fetch sender username and group name when current invite changes
    useEffect(() => {
        let mounted = true;
        const loadInfo = async () => {
            if (!currentInvite) {
                setSenderName(null);
                setGroupName(null);
                return;
            }

            setLoadingSender(true);
            try {
                if (currentInvite.sender_username) {
                    if (mounted) setSenderName(currentInvite.sender_username);
                } else if (currentInvite.sender_id != null) {
                    try {
                        const name = await getUsernameFromUserId(currentInvite.sender_id);
                        if (mounted) setSenderName(name);
                    } catch (_err) {
                        if (mounted) setSenderName(`User ${currentInvite.sender_id}`);
                    }
                } else {
                    if (mounted) setSenderName(null);
                }
            } finally {
                if (mounted) setLoadingSender(false);
            }

            setLoadingGroup(true);
            try {
                if (currentInvite.group_name) {
                    if (mounted) setGroupName(currentInvite.group_name);
                } else {
                    if (mounted) setGroupName(`Chat ${currentInvite.chat_id}`);
                }
            } catch (_err) {
                if (mounted) setGroupName(`Chat ${currentInvite.chat_id}`);
            } finally {
                if (mounted) setLoadingGroup(false);
            }
        };
        loadInfo();
        return () => { mounted = false; };
    }, [currentInvite]);

    if (!currentInvite) return null;

    /**
     * Accepts the current chat invitation and joins the group.
     * Closes the modal after successful acceptance.
     */
    const handleAccept = async () => {
        setProcessing(true);
        try {
            await acceptInvite(currentInvite.id);
            setShow(false);
        } catch (e) {
        } finally {
            setProcessing(false);
        }
    };

    /**
     * Rejects the current chat invitation and removes it from the list.
     * Closes the modal after successful rejection.
     */
    const handleReject = async () => {
        setProcessing(true);
        try {
            await rejectInvite(currentInvite.id);
            setShow(false);
        } catch (e) {
        } finally {
            setProcessing(false);
        }
    };

    return (
        <Modal show={show} onHide={() => setShow(false)} centered className="text-dark">
            <Modal.Header closeButton>
                <Modal.Title className="text-dark">Chat Invite</Modal.Title>
            </Modal.Header>
            <Modal.Body className="text-dark">
                <div>
                    <strong>From:</strong>{' '}
                    {loadingSender ? <Spinner animation="border" size="sm" /> : (senderName || `User ${currentInvite.sender_id}`)}
                </div>
                <div className="mt-2">
                    <strong>Group:</strong>{' '}
                    {loadingGroup ? <Spinner animation="border" size="sm" /> : (groupName || `Chat ${currentInvite.chat_id}`)}
                </div>
                <div className="mt-3">
                    <p>You have been invited by {senderName || `User ${currentInvite.sender_id}`} to join the group {groupName || `Chat ${currentInvite.chat_id}` }.</p>
                    <p>Accept to join the chat or reject to ignore the invite.</p>
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleReject} disabled={processing}>Reject</Button>
                <Button variant="primary" onClick={handleAccept} disabled={processing}>Accept</Button>
            </Modal.Footer>
        </Modal>
    );
}
