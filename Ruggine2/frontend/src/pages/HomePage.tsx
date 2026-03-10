import { Container, Row, Spinner, Button, Modal, Form } from "react-bootstrap";
import { useAppContext } from "../context/AppContext";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { User } from "../models/models";
import type { ChatDAO } from "../api/api";
import ChatList from "../components/ChatList";
import ChatWindow from "../components/ChatWindow";
import { createNewPrivateChat, createNewGroupChat, getChats, getUserIdByUsername, inviteUser, searchUsersByPrefix } from "../api/api";

/**
 * HomePage component — main layout for the messaging UI.
 *
 * Responsibilities:
 * - Obtain global state and actions from `AppContext` (user, chats, messages).
 * - Render the left column (search, new chat modal, chat list) and the
 *   right column (selected chat window and message composer).
 * - Provide helper functions to create chats and select a chat.
 */
export default function HomePage() {
    const {
        user,
        chats,
        selectedChat,
        messages,
        loadingChats,
        loadingMessages,
        setSelectedChat,
        logout,
        refreshChats
    } = useAppContext();

    const navigate = useNavigate();

    /**
     * Redirect to the login page if there is no authenticated user.
     */
    useEffect(() => {
        if (!user) {
            navigate("/login");
        }
    }, []);

    /**
     * Select a chat from the list and update the Context-selected chat.
     * @param chat ChatDAO object to select
     */
    const handleSelectChat = (chat: ChatDAO) => {
        setSelectedChat(chat);
    };


    const [search, setSearch] = useState("");                         // Search term for filtering the chat list
    const [showModal, setShowModal] = useState(false);                // Controls visibility of the new chat modal
    const [username, setUsername] = useState("");                     // Input for usernames in the modal (semicolon/comma/space separated)
    const [suggestions, setSuggestions] = useState<string[]>([]);     // List of username suggestions from API
    const [showSuggestions, setShowSuggestions] = useState(false);    // Controls visibility of the suggestions dropdown
    const [activeSuggestion, setActiveSuggestion] = useState(0);      // Index of the currently highlighted suggestion
    const [groupName, setGroupName] = useState("");                   // Input for group name when creating a group chat
    const [creating, setCreating] = useState(false);                  // Loading state during chat creation
    const [error, setError] = useState("");                           // Error message for chat creation failures
    const debounceRef = React.useRef<number | null>(null);
    const requestIdRef = React.useRef(0);

    /**
     * Create a private or group chat from modal input.
     * Validates usernames, calls the appropriate API, refreshes chats,
     * and selects the newly created chat if successful.
     */
    const handleCreateChat = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setError("");
        setCreating(true);
        try {
            const raw = username.trim();
            if (!raw) {
                setError("Please enter a valid username");
                setCreating(false);
                return;
            }

            const parts = raw.split(/[;,\s]+/).map(s => s.trim()).filter(Boolean);

            // validation: no self-invite and no duplicates (case-insensitive)
            if (!user) {
                setError("User not authenticated");
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
                    setError("You cannot invite yourself to the chat.");
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
                setError(`You entered duplicate users: ${[...new Set(dupes)].join(', ')}`);
                setCreating(false);
                return;
            }

                if (uniqueParts.length === 1) {
                const otherUserId = await getUserIdByUsername(uniqueParts[0]);
                const newChat = await createNewPrivateChat(otherUserId);
                    await refreshChats();
                setShowModal(false);
                setUsername("");
                setGroupName("");
                setSelectedChat(newChat);
            } else {
                if (!groupName.trim()) {
                    setError("Please enter a group name");
                    setCreating(false);
                    return;
                }
                const newGroupId = await createNewGroupChat(groupName.trim());

                const inviteErrors: string[] = [];
                for (const name of uniqueParts) {
                    try {
                        const uid = await getUserIdByUsername(name);
                        await inviteUser(uid, newGroupId);
                    } catch (err) {
                        inviteErrors.push(name);
                    }
                }

                await refreshChats();
                const updated = await getChats();
                const created = updated.find(c => c.id === newGroupId) ?? null;
                setShowModal(false);
                setUsername("");
                setGroupName("");
                if (created) setSelectedChat(created);
                if (inviteErrors.length > 0) {
                    setError(`Could not invite: ${inviteErrors.join(", ")}`);
                }
            }
        } catch (e) {
            setError("Error creating chat: user not found or chat already exists");
        } finally {
            setCreating(false);
        }
    };

    return (
        <Container fluid className="homepage-container" style={{ marginLeft: '5%', marginRight: '5%', width: '90%', height: '90vh' }}>
            <Row className="h-100" style={{ display: 'flex', height: '100%' }}>
                {/* -------------------------------------------------- */}
                {/*               LEFT COLUMN — Chat list              */}
                {/* Contains search, new-chat button and the chat list */}
                {/* -------------------------------------------------- */}
                <div style={{ width: '30%', height: '100%', flexShrink: 0, minWidth: 0, display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }} className="chatlist-sidebar">
                    <div style={{ padding: '0 0.75rem' }}>
                        <div className="d-flex justify-content-between align-items-center mt-3 mb-2">
                            <h4 className="auth-title" style={{ fontSize: '1.5rem', textAlign: 'center' }}>
                                Chats - {user ? user.username : ""}
                            </h4>
                            <Button variant="outline-danger" size="sm" onClick={logout}>
                                Logout
                            </Button>
                        </div>
                        {/* Search bar */}
                        <div className="mb-2 d-flex gap-2">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Search chat..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                        {/* New chat button */}
                        <div className="mb-2 d-flex gap-2">
                            <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
                                New chat
                            </Button>
                        </div>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                    {/* Modal to enter usernames */}
                    <Modal show={showModal} onHide={() => setShowModal(false)} className="text-dark">
                        <Modal.Header closeButton>
                            <Modal.Title className="text-dark">New Chat</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                                        <Form onSubmit={handleCreateChat}>
                                            <Form.Group>
                                                    <Form.Label className="text-dark">1 username = private chat.<br/>1+ usernames = group chat.</Form.Label>
                                                <div style={{ position: 'relative' }}>
                                                    <Form.Control
                                                        type="text"
                                                        value={username}
                                                        onChange={e => {
                                                            const v = e.target.value;
                                                            setUsername(v);
                                                            if (debounceRef.current) window.clearTimeout(debounceRef.current);
                                                            const m = /([^;,\s]+)\s*$/.exec(v);
                                                            const token = m ? m[1] : '';
                                                            if (token.length >= 1) {
                                                                const reqId = ++requestIdRef.current;
                                                                debounceRef.current = window.setTimeout(() => {
                                                                    searchUsersByPrefix(token, 5)
                                                                        .then((list: User[]) => {
                                                                            if (requestIdRef.current === reqId) {
                                                                                const filtered = list.filter(x => x.username.toLowerCase() !== token.toLowerCase());
                                                                                const withoutSelf = filtered.filter(x => !(user && x.username.toLowerCase() === user.username.toLowerCase()));
                                                                                setSuggestions(withoutSelf.map(x => x.username));
                                                                                setShowSuggestions(true);
                                                                                setActiveSuggestion(0);
                                                                            }
                                                                        })
                                                                        .catch(() => {
                                                                            if (requestIdRef.current === reqId) {
                                                                                setSuggestions([]);
                                                                                setShowSuggestions(false);
                                                                            }
                                                                        });
                                                                }, 250);
                                                            } else {
                                                                setSuggestions([]);
                                                                setShowSuggestions(false);
                                                            }
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (showSuggestions && suggestions.length > 0) {
                                                                if (e.key === 'ArrowDown') {
                                                                    e.preventDefault();
                                                                    setActiveSuggestion(i => Math.min(i + 1, suggestions.length - 1));
                                                                    return;
                                                                }
                                                                if (e.key === 'ArrowUp') {
                                                                    e.preventDefault();
                                                                    setActiveSuggestion(i => Math.max(i - 1, 0));
                                                                    return;
                                                                }
                                                                if (e.key === 'Enter' || e.key === 'Tab') {
                                                                    e.preventDefault();
                                                                    const chosen = suggestions[activeSuggestion];
                                                                    if (chosen) {
                                                                        const m = /([^;,\s]+)\s*$/.exec(username);
                                                                        let newVal = '';
                                                                        if (m && typeof m.index === 'number') {
                                                                            newVal = username.slice(0, m.index) + chosen + '; ';
                                                                        } else {
                                                                            newVal = chosen + '; ';
                                                                        }
                                                                        setUsername(newVal);
                                                                        setShowSuggestions(false);
                                                                        setSuggestions([]);
                                                                    }
                                                                    return;
                                                                }
                                                                if (e.key === 'Escape') {
                                                                    setShowSuggestions(false);
                                                                    setSuggestions([]);
                                                                }
                                                            }
                                                        }}
                                                        placeholder="Enter username"
                                                        disabled={creating}
                                                        className="text-dark"
                                                    />
                                                    {showSuggestions && suggestions.length > 0 && (
                                                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 2000, background: 'white', border: '1px solid #ddd', maxHeight: 160, overflowY: 'auto' }}>
                                                            {suggestions.map((s, idx) => (
                                                                <div key={s} onMouseDown={(ev) => { ev.preventDefault(); const m = /([^;,\s]+)\s*$/.exec(username); let newVal = ''; if (m && typeof m.index === 'number') { newVal = username.slice(0, m.index) + s + '; '; } else { newVal = s + '; '; } setUsername(newVal); setShowSuggestions(false); setSuggestions([]); }}
                                                                    style={{ padding: '6px 8px', cursor: 'pointer', background: idx === activeSuggestion ? '#f0f8ff' : 'white' }}
                                                                >
                                                                    {s}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </Form.Group>
                                    {(() => {
                                        const partsPreview = username.split(/[;\s,]+/).map(s => s.trim()).filter(Boolean);
                                        if (partsPreview.length > 1) {
                                            return (
                                                <Form.Group className="mt-3">
                                                            <Form.Label className="text-dark">Group name</Form.Label>
                                                    <Form.Control
                                                        type="text"
                                                        value={groupName}
                                                        onChange={e => setGroupName(e.target.value)}
                                                                placeholder="Enter group name"
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
                                Cancel
                            </Button>
                                <Button variant="primary" onClick={handleCreateChat} disabled={creating || !username.trim() || (username.split(/[;\s,]+/).map(s=>s.trim()).filter(Boolean).length>1 && !groupName.trim())}>
                                {(() => {
                                    if (creating) return "Creating...";
                                    const parts = username.split(/[;\s]+/).map(s => s.trim()).filter(Boolean);
                                    return parts.length > 1 ? "Create Group Chat" : "Create Private Chat";
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
                                user={user}
                                search={search}
                            />
                        )}
                    </div>
                </div>

                {/* -------------------------------------------- */}
                {/*        RIGHT COLUMN — Message window         */}
                {/* Displays selected chat messages and Composer */}
                {/* -------------------------------------------- */}
                <div style={{ width: '60%', height: '100%', flexShrink: 0, minWidth: 0 }} className="chat-area-main p-0">
                    {user && (
                        <ChatWindow
                            chat={selectedChat}
                            messages={messages}
                            loading={loadingMessages}
                            currentUser={user}
                            onClose={() => setSelectedChat(null)}
                        />
                    )}
                </div>

            </Row>
        </Container>
    );
}