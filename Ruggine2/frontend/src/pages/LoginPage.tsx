import React, { useState } from "react";
import { Container, Form, Button, Card, Row, Col } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";

// Rimosso: import { loginUser, type LoginUserPayload } from "../api/api";
import { type LoginUserPayload } from "../api/api";
import "../styles/auth.css";

// Importiamo il Context
import { useAppContext } from "../context/AppContext";

// Rimosso: export default function LoginPage({ user, setUser }) {
export default function LoginPage() {
    const { login } = useAppContext(); // Otteniamo la funzione di login dal Context

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const isFormValid = username.trim() !== "" && password.trim() !== "";

    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!isFormValid) return;
        setLoading(true);

        try {
            const payload: LoginUserPayload = {
                username: username.trim(),
                plain_password: password.trim(),
            };

            // Usiamo la funzione login dal Context
            // Rimosso: const loginRes = await loginUser(payload);
            // Rimosso: localStorage.setItem("token", loginRes.token);
            // Rimosso: setUser({ id: loginRes.user_id, username: username.trim() });
            await login(payload); // La logica di salvare token/utente è ora nel Context

            toast.success("Login completed!");
            navigate("/homepage");
        } catch (err: any) {
            console.error("Login error:", err);
            toast.error(err?.message ?? "Login failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // ... (resto del codice JSX invariato)
    return (
        // ... (JSX invariato)
        <Container fluid className="auth-container d-flex align-items-center justify-content-center">
            <Row className="w-100 justify-content-center">
                <Col xs={12} sm={8} md={6} lg={4} xl={3}>
                    <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                        <Card className="auth-card">
                            <Card.Body>
                                <h2 className="text-center auth-title">Login</h2>
                                <Form onSubmit={handleSubmit}>
                                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
                                        <Form.Group className="mb-3" controlId="formBasicUsername">
                                            <Form.Label className="auth-label">Username</Form.Label>
                                            <Form.Control
                                                type="text"
                                                placeholder="Enter username"
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value)}
                                                required
                                                className="auth-input"
                                            />
                                        </Form.Group>
                                    </motion.div>

                                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
                                        <Form.Group className="mb-4" controlId="formBasicPassword">
                                            <Form.Label className="auth-label">Password</Form.Label>
                                            <Form.Control
                                                type="password"
                                                placeholder="Password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                className="auth-input"
                                                autoComplete="new-password"
                                            />
                                        </Form.Group>
                                    </motion.div>

                                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
                                        <Button variant="primary" type="submit" className="w-100 auth-button-primary" disabled={loading || !isFormValid}>
                                            {loading ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                    Logging in...
                                                </>
                                            ) : (
                                                "Log in "
                                            )}
                                        </Button>
                                    </motion.div>
                                </Form>
                                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }} className="mt-3 text-center auth-secondary-text">
                                    <Link to="/register" className="auth-link">
                                        Don't have an account? Register
                                    </Link>
                                </motion.div>
                            </Card.Body>
                        </Card>
                    </motion.div>
                </Col>
            </Row>
        </Container>
    );
}