import { useEffect, useState } from 'react';
import { Modal, Button, Spinner } from 'react-bootstrap';
import { useAppContext } from '../context/AppContext';
import { getUsernameFromUserId } from '../api/api';

export default function InviteModal() {
    const { invites, acceptInvite, rejectInvite, chats } = useAppContext();
    const [show, setShow] = useState(false);
    const [currentInvite, setCurrentInvite] = useState<any | null>(null);
    const [senderName, setSenderName] = useState<string | null>(null);
    const [groupName, setGroupName] = useState<string | null>(null);
    const [loadingSender, setLoadingSender] = useState(false);
    const [loadingGroup, setLoadingGroup] = useState(false);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (invites && invites.length > 0) {
            setCurrentInvite(invites[0]);
            setShow(true);
        } else {
            setCurrentInvite(null);
            setShow(false);
        }
    }, [invites]);

    useEffect(() => {
        let mounted = true;
        const loadInfo = async () => {
            if (!currentInvite) {
                setSenderName(null);
                setGroupName(null);
                return;
            }

            // load sender name: prefer sender_username if provided in invite payload
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

            // load group name: prefer group_name if provided in invite payload
            setLoadingGroup(true);
            try {
                if (currentInvite.group_name) {
                    if (mounted) setGroupName(currentInvite.group_name);
                } else {
                    // prefer local chats state (fast) to avoid extra API calls and delays
                    const found = chats?.find(c => c.id === Number(currentInvite.chat_id));
                    if (found) {
                        if (mounted) setGroupName(found.group_name ?? `Chat ${currentInvite.chat_id}`);
                    } else {
                        // fallback to immediate placeholder; avoid long fetch here
                        if (mounted) setGroupName(`Chat ${currentInvite.chat_id}`);
                    }
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

    const handleAccept = async () => {
        setProcessing(true);
        try {
            await acceptInvite(currentInvite.id);
            setShow(false);
        } catch (e) {
            // error shown by context
        } finally {
            setProcessing(false);
        }
    };

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
