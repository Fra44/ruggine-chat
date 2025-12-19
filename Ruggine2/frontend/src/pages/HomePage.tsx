// pages/HomePage.tsx

// Rimosso: import React, { useState, useEffect } from "react";
import React, { useEffect, useState } from "react"; // Manteniamo React per JSX
import { Container, Row, Spinner, Button, Modal, Form } from "react-bootstrap";
// Rimosso: import { getChats, type ChatDAO, type MessageDAO, getChatMessages } from "../api/api";
// Rimosso: import { type User } from "../models/models";
import ChatList from "../components/ChatList";
import ChatWindow from "../components/ChatWindow";
import { useNavigate } from "react-router-dom"; // Mantenuto solo per navigate

import { useAppContext } from "../context/AppContext"; // Importiamo il Context
import type { ChatDAO } from "../api/api";
import { createNewPrivateChat, createNewGroupChat, getChats, getUserIdByUsername, inviteUser } from "../api/api";

// Rimosso: interface HomePageProps { user: User | null; }

// Modificato: non riceve più props
export default function HomePage() {
    const {
        user,
        chats,
        selectedChat,
        messages,
        loadingChats,
        loadingMessages,
        setSelectedChat, // Funzione per selezionare la chat
        logout, // Funzione di logout
        // sendMessage, // Se volessi implementare la logica qui
        setChats // <--- aggiunto dal context
    } = useAppContext(); // Otteniamo tutti gli stati e le azioni dal Context

    const navigate = useNavigate();

    useEffect(() => {
        if (!user) {
            // Questa condizione può essere rimossa se la logica di reindirizzamento
            // è centralizzata nel Provider, ma è un buon fallback.
            navigate("/login");
        }
    }, []);
    // Reindirizzamento se l'utente non è loggato (logica gestita meglio nel provider)


    // Le logiche di caricamento iniziale e WS sono ora nel Context.
    // L'UI è molto più pulita.

    const handleSelectChat = (chat: ChatDAO) => {
        setSelectedChat(chat);
    };


    const [search, setSearch] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [username, setUsername] = useState("");
    const [groupName, setGroupName] = useState("");
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState("");

    // Funzione per creare una nuova chat privata
    const handleCreateChat = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setError("");
        setCreating(true);
        try {
            const raw = username.trim();
            if (!raw) {
                setError("Inserisci un username valido");
                setCreating(false);
                return;
            }

            // split usernames by semicolon, comma or whitespace
            const parts = raw.split(/[;,\s]+/).map(s => s.trim()).filter(Boolean);

            // validation: no self-invite and no duplicates (case-insensitive)
            if (!user) {
                setError("Utente non autenticato");
                setCreating(false);
                return;
            }
            const lowerSelf = user.username.toLowerCase();
            const seen = new Set<string>();
            const uniqueParts: string[] = [];
            const dupes: string[] = [];
            for (const p of parts) {
                const lp = p.toLowerCase();
                if (lp === lowerSelf) {
                    setError("Non puoi invitare te stesso nella chat.");
                    setCreating(false);
                    return;
                }
                if (seen.has(lp)) {
                    dupes.push(p);
                } else {
                    seen.add(lp);
                    uniqueParts.push(p);
                }
            }
            if (dupes.length > 0) {
                setError(`Hai inserito utenti duplicati: ${[...new Set(dupes)].join(', ')}`);
                setCreating(false);
                return;
            }

            if (uniqueParts.length === 1) {
                // private chat
                const otherUserId = await getUserIdByUsername(uniqueParts[0]);
                const newChat = await createNewPrivateChat(otherUserId);
                const updatedChats = await getChats();
                setChats(updatedChats);
                setShowModal(false);
                setUsername("");
                setGroupName("");
                setSelectedChat(newChat);
            } else {
                // group chat: create group then invite users
                if (!groupName.trim()) {
                    setError("Inserisci un nome per il gruppo");
                    setCreating(false);
                    return;
                }
                const newGroupId = await createNewGroupChat(groupName.trim());

                // try inviting each username; collect failures but continue
                const inviteErrors: string[] = [];
                for (const name of uniqueParts) {
                    try {
                        const uid = await getUserIdByUsername(name);
                        await inviteUser(uid, newGroupId);
                    } catch (err) {
                        inviteErrors.push(name);
                    }
                }

                const updatedChats = await getChats();
                setChats(updatedChats);
                const created = updatedChats.find(c => c.id === newGroupId) ?? null;
                setShowModal(false);
                setUsername("");
                setGroupName("");
                if (created) setSelectedChat(created);
                if (inviteErrors.length > 0) {
                    setError(`Non è stato possibile invitare: ${inviteErrors.join(", ")}`);
                }
            }
        } catch (e) {
            setError("Errore nella creazione della chat: utente non trovato o chat già esistente");
        } finally {
            setCreating(false);
        }
    };

    return (
        <Container fluid className="homepage-container" style={{ marginLeft: '5%', marginRight: '5%', width: '90%', height: '90vh' }}>
            <Row className="h-100" style={{ display: 'flex', height: '100%' }}>
                {/* ------------------------------------- */}
                {/* COLONNA SINISTRA: CHAT LIST (30% larghezza) */}
                {/* ------------------------------------- */}
                <div style={{ width: '30%', height: '100%', flexShrink: 0, minWidth: 0 }} className="chatlist-sidebar">
                    <div className="d-flex justify-content-between align-items-center mt-3 mb-4">
                        <h4 className="auth-title" style={{ fontSize: '1.5rem', textAlign: 'center' }}>
                            Chats - {user ? user.username : ""}
                        </h4>
                        <Button variant="outline-danger" size="sm" onClick={logout}>
                            Logout
                        </Button>
                    </div>
                    {/* Search bar */}
                    <div className="mb-3 d-flex gap-2">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Cerca chat..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    {/* New chat button */}
                    <div className="mb-3 d-flex gap-2">
                        <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
                            Nuova chat
                        </Button>
                    </div>
                    {/* Modal per inserire username */}
                    <Modal show={showModal} onHide={() => setShowModal(false)} className="text-dark">
                        <Modal.Header closeButton>
                            <Modal.Title className="text-dark">Nuova chat</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            <Form onSubmit={handleCreateChat}>
                                <Form.Group>
                                    <Form.Label className="text-dark">Username destinatario</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        placeholder="Inserisci username"
                                        disabled={creating}
                                        className="text-dark"
                                    />
                                </Form.Group>
                                    {(() => {
                                        const partsPreview = username.split(/[;\s,]+/).map(s => s.trim()).filter(Boolean);
                                        if (partsPreview.length > 1) {
                                            return (
                                                <Form.Group className="mt-3">
                                                    <Form.Label className="text-dark">Nome gruppo</Form.Label>
                                                    <Form.Control
                                                        type="text"
                                                        value={groupName}
                                                        onChange={e => setGroupName(e.target.value)}
                                                        placeholder="Inserisci il nome del gruppo"
                                                        disabled={creating}
                                                        className="text-dark"
                                                    />
                                                </Form.Group>
                                            );
                                        }
                                        return null;
                                    })()}
                                {error && <div className="text-danger mt-2">{error}</div>}
                            </Form>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={() => setShowModal(false)} disabled={creating}>
                                Annulla
                            </Button>
                                <Button variant="primary" onClick={handleCreateChat} disabled={creating || !username.trim() || (username.split(/[;\s,]+/).map(s=>s.trim()).filter(Boolean).length>1 && !groupName.trim())}>
                                {(() => {
                                    if (creating) return "Creazione...";
                                    const parts = username.split(/[;\s]+/).map(s => s.trim()).filter(Boolean);
                                    return parts.length > 1 ? "Crea chat di gruppo" : "Crea chat privata";
                                })()}
                            </Button>
                        </Modal.Footer>
                    </Modal>
                    {loadingChats ? (
                        <div className="text-center mt-5">
                            <Spinner animation="border" variant="light" />
                        </div>
                    ) : (
                        user && <ChatList
                            chats={chats}
                            selectedChatId={selectedChat?.id}
                            onSelectChat={handleSelectChat}
                            user={user} // Passiamo l'utente dal Context
                            search={search}
                        />
                    )}
                </div>

                {/* ------------------------------------- */}
                {/* COLONNA DESTRA: FINESTRA MESSAGGI (60% larghezza) */}
                {/* ------------------------------------- */}
                <div style={{ width: '60%', height: '100%', flexShrink: 0, minWidth: 0 }} className="chat-area-main p-0">
                    {user && (
                        <ChatWindow
                            chat={selectedChat}
                            messages={messages}
                            loading={loadingMessages}
                            currentUser={user}
                            onClose={() => setSelectedChat(null)}
                        // L'invio del messaggio sarà gestito da ChatWindow usando il Context
                        />
                    )}
                </div>

            </Row>
        </Container>
    );
}