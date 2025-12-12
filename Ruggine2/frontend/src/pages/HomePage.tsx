// pages/HomePage.tsx

import React, { useState, useEffect } from "react";
import { Container, Row, Col, Spinner } from "react-bootstrap";
import { getChats, type ChatDAO, type MessageDAO, getChatMessages } from "../api/api";
import { type User } from "../models/models";
import ChatList from "../components/ChatList";
import ChatWindow from "../components/ChatWindow";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router";

// Definiamo le props che riceverà la HomePage
interface HomePageProps {
    user: User | null;
}

export default function HomePage({ user }: HomePageProps) {
    // Stato per l'elenco delle chat
    const [chats, setChats] = useState<ChatDAO[]>([]);
    // Stato per la chat selezionata (null se nessuna)
    const [selectedChat, setSelectedChat] = useState<ChatDAO | null>(null);
    // Stato per i messaggi della chat selezionata
    const [messages, setMessages] = useState<MessageDAO[]>([]);
    const [loadingChats, setLoadingChats] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);

    const navigate = useNavigate();

    // 1. Caricamento Iniziale delle Chat
    useEffect(() => {
        const fetchChats = async () => {
            if (!user) return;
            try {
                const fetchedChats = await getChats();
                
                setChats(fetchedChats);
            } catch (error) {
                console.error("Error fetching chats:", error);
                toast.error("Failed to load chats.");
            } finally {
                setLoadingChats(false);
            }
        };
        fetchChats();
    }, [user]);

    // 2. Caricamento dei Messaggi quando la chat cambia
    useEffect(() => {
        const fetchMessages = async () => {
            if (selectedChat) {
                setLoadingMessages(true);
                try {
                    const fetchedMessages = await getChatMessages(selectedChat.id);
                    setMessages(fetchedMessages);
                    // Scorri in fondo al caricamento, gestito nel ChatWindow
                } catch (error) {
                    console.error("Error fetching messages:", error);
                    toast.error("Failed to load messages.");
                    setMessages([]); // Svuota i messaggi in caso di errore
                } finally {
                    setLoadingMessages(false);
                }
            } else {
                setMessages([]);
            }
        };
        fetchMessages();
    }, [selectedChat]);

    // Funzione per selezionare una chat dalla lista
    const handleSelectChat = (chat: ChatDAO) => {
        setSelectedChat(chat);
    };

    if (!user) { navigate("/login") }; // Non dovrebbe succedere grazie a ProtectedRoute

    return (
        <Container fluid className="homepage-container">
            <Row className="h-100">

                {/* ------------------------------------- */}
                {/* COLONNA SINISTRA: CHAT LIST (1/4 o 1/3) */}
                {/* ------------------------------------- */}
                <Col xs={12} sm={4} lg={3} className="chatlist-sidebar">
                    <h4 className="mt-3 mb-4 auth-title" style={{ fontSize: '1.5rem', textAlign: 'center' }}>
                        Chats
                    </h4>
                    {loadingChats ? (
                        <div className="text-center mt-5">
                            <Spinner animation="border" variant="light" />
                        </div>
                    ) : (
                        <ChatList
                            chats={chats}
                            selectedChatId={selectedChat?.id}
                            onSelectChat={handleSelectChat}
                            user = {user!}
                        />
                    )}
                </Col>

                {/* ------------------------------------- */}
                {/* COLONNA DESTRA: FINESTRA MESSAGGI (Spazio Rimanente) */}
                {/* ------------------------------------- */}
                <Col xs={12} sm={8} lg={9} className="chat-area-main p-0">
                    <ChatWindow
                        chat={selectedChat}
                        messages={messages}
                        loading={loadingMessages}
                        currentUser={user!}
                    // Qui andrebbe passata una funzione per inviare messaggi
                    />
                </Col>

            </Row>
        </Container>
    );
}