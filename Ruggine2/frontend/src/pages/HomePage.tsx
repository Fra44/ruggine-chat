// pages/HomePage.tsx

// Rimosso: import React, { useState, useEffect } from "react";
import React, { useEffect } from "react"; // Manteniamo React per JSX
import { Container, Row, Col, Spinner, Button } from "react-bootstrap";
// Rimosso: import { getChats, type ChatDAO, type MessageDAO, getChatMessages } from "../api/api";
// Rimosso: import { type User } from "../models/models";
import ChatList from "../components/ChatList";
import ChatWindow from "../components/ChatWindow";
import { useNavigate } from "react-router"; // Mantenuto solo per navigate

import { useAppContext } from "../context/AppContext"; // Importiamo il Context
import type { ChatDAO } from "../api/api";

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

    return (
        <Container fluid className="homepage-container">
            <Row className="h-100">
                {/* ------------------------------------- */}
                {/* COLONNA SINISTRA: CHAT LIST (3/12 o 4/12) */}
                {/* ------------------------------------- */}
                <Col xs={12} sm={4} lg={3} className="chatlist-sidebar">
                    <div className="d-flex justify-content-between align-items-center mt-3 mb-4">
                        <h4 className="auth-title" style={{ fontSize: '1.5rem', textAlign: 'center' }}>
                            Chats - {user ? user.username : ""}
                        </h4>
                        <Button variant="outline-danger" size="sm" onClick={logout}>
                            Logout
                        </Button>
                    </div>
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
                        />
                    )}
                </Col>

                {/* ------------------------------------- */}
                {/* COLONNA DESTRA: FINESTRA MESSAGGI (Spazio Rimanente) */}
                {/* ------------------------------------- */}
                <Col xs={12} sm={8} lg={9} className="chat-area-main p-0">
                    {user && (
                        <ChatWindow
                            chat={selectedChat}
                            messages={messages}
                            loading={loadingMessages}
                            currentUser={user}
                        // L'invio del messaggio sarà gestito da ChatWindow usando il Context
                        />
                    )}
                </Col>

            </Row>
        </Container>
    );
}