import React, { useState } from "react";
import { Container, Form, Button, Card, Row, Col } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";

import { registerUser, type RegisterUserPayload } from "../api/api";
import "../styles/auth.css";
import { useAppContext } from "../context/AppContext";

export default function RegisterPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const { user } = useAppContext();

    const isFormValid = username.trim() !== "" && password.trim() !== "";

    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!isFormValid) return;
        setLoading(true);

        try {
            const payload: RegisterUserPayload = {
                username: username.trim(),
                plain_password: password.trim(),
            };

            await registerUser(payload);
            toast.success("Registration completed!");
            navigate("/login");
        } catch (err: any) {
            console.error("Registration error:", err);
            // Assicurati che l'oggetto errore abbia una proprietà message
            toast.error(err?.message ?? "Registration failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // we do not allow user to access login page if already logged in
    if(user) navigate("/homepage");

    return (
        <Container className="my-5 auth-container">
            <Row className="justify-content-md-center">
                <Col md={9} lg={6} xl={12}>
                    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
                        <div className="login-link-header mb-4">
                            <span className="text-muted me-2 auth-secondary-text">Already have an account?</span>
                            <Link to="/login" className="auth-link-header-button">
                                Log in
                            </Link>
                        </div>

                        <Card className="auth-card">
                            <Card.Body>
                                <motion.h2
                                    className="text-center mb-4 auth-title"
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.05 }}
                                >
                                    Create account
                                </motion.h2>
                                <p className="text-center mb-4 auth-subtitle">
                                    Register to start using Ruggine2 Chat — it's fast and private.
                                </p>

                                <Form onSubmit={handleSubmit} className="d-flex flex-column auth-grid-gap">
                                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
                                        <Form.Group controlId="formUsername">
                                            <Form.Label>Username</Form.Label>
                                            <Form.Control
                                                type="text"
                                                placeholder="your.username"
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value)}
                                                required
                                                className="auth-input"
                                                autoComplete="username"
                                            />
                                        </Form.Group>
                                    </motion.div>

                                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
                                        <Form.Group controlId="formPassword">
                                            <Form.Label>Password</Form.Label>
                                            <Form.Control
                                                type="password"
                                                placeholder="At least 8 characters"
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
                                                    Registering...
                                                </>
                                            ) : (
                                                "Create account"
                                            )}
                                        </Button>
                                    </motion.div>
                                </Form>
                            </Card.Body>
                        </Card>
                    </motion.div>
                </Col>
            </Row>
        </Container>
    );
}