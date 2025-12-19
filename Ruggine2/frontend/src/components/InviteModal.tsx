import { useEffect, useState } from 'react';
import { Modal, Button, Spinner } from 'react-bootstrap';
import { useAppContext } from '../context/AppContext';
import { getUsernameFromUserId } from '../api/api';

export default function InviteModal() {
    const { invites, acceptInvite, rejectInvite } = useAppContext();
    const [show, setShow] = useState(false);
    const [currentInvite, setCurrentInvite] = useState<any | null>(null);
    const [senderName, setSenderName] = useState<string | null>(null);
    const [loadingSender, setLoadingSender] = useState(false);
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
        const loadSender = async () => {
            if (!currentInvite) {
                setSenderName(null);
                return;
            }
            setLoadingSender(true);
            try {
                const name = await getUsernameFromUserId(currentInvite.sender_id);
                if (mounted) setSenderName(name);
            } catch (err) {
                if (mounted) setSenderName(`Utente ${currentInvite.sender_id}`);
            } finally {
                if (mounted) setLoadingSender(false);
            }
        };
        loadSender();
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
                <Modal.Title className="text-dark">Invito a chat</Modal.Title>
            </Modal.Header>
            <Modal.Body className="text-dark">
                <div>
                    <strong>Da:</strong>{' '}
                    {loadingSender ? <Spinner animation="border" size="sm" /> : (senderName || `Utente ${currentInvite.sender_id}`)}
                </div>
                <div className="mt-3">
                    <p>Sei stato invitato a partecipare alla chat con id <strong>{currentInvite.chat_id}</strong>.</p>
                    <p>Accetta per unirti alla chat o rifiuta per ignorare l'invito.</p>
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={() => setShow(false)} disabled={processing}>Chiudi</Button>
                <Button variant="danger" onClick={handleReject} disabled={processing}>Rifiuta</Button>
                <Button variant="primary" onClick={handleAccept} disabled={processing}>Accetta</Button>
            </Modal.Footer>
        </Modal>
    );
}
