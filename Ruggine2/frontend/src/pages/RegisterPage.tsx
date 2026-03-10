import { Container, Form, Button, Card, Row, Col } from "react-bootstrap";
import { registerUser, type RegisterUserPayload } from "../api/api";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
import "../styles/auth.css";

/**
 * RegisterPage component — handles user registration.
 *
 * Responsibilities:
 * - Collects username and password from user input.
 * - Validates inputs (presence, length, forbidden characters).
 * - Calls the registration API and handles success/error responses.
 * - Redirects to login page on successful registration.
 * - Prevents access if user is already authenticated.
 */
export default function RegisterPage() {
    const [username, setUsername] = useState("");              // Username input value
    const [usernameError, setUsernameError] = useState("");    // Error message for username validation
    const [password, setPassword] = useState("");              // Password input value
    const [passwordError, setPasswordError] = useState("");    // Error message for password validation
    const [loading, setLoading] = useState(false);             // Loading state during registration

    const { user } = useAppContext();

    const isFormValid = username.trim() !== "" && password.trim() !== "";

    const navigate = useNavigate();

    /**
     * Handles form submission for user registration.
     * Validates username and password inputs, calls the registration API,
     * displays success/error toasts, and navigates to login on success.
     */
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (username.trim() === "" || password.trim() === "") {
            if (username.trim() === "") setUsernameError('Username required');
            if (password.trim() === "") setPasswordError('Password required');
            return;
        }
        if (password.trim().length < 8) {
            setPasswordError('Password must be at least 8 characters');
            return;
        }
        setLoading(true);
        if (/[;\s]/.test(username)) {
            setLoading(false);
            setUsernameError('Username contains unauthorised characters (spaces or ";")');
            return;
        }

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
            toast.error(err?.message ?? "Registration failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    /** 
     * Prevent access to registration page if user is already authenticated
     */
    if(user) {
        return <Navigate to="/homepage" replace />;
    }

    return (
        <Container fluid className="auth-container d-flex align-items-center justify-content-center">
            <Row className="w-100 justify-content-center">
                <Col xs={12} sm={8} md={9} lg={6} xl={5}>
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
                                    Register to start using Ruggine — it's fast and private.
                                </p>

                                {/* Registration form */}
                                <Form onSubmit={handleSubmit} className="d-flex flex-column auth-grid-gap">
                                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
                                        <Form.Group controlId="formUsername">
                                            <Form.Label>Username</Form.Label>
                                            <Form.Control
                                                type="text"
                                                placeholder="your.username"
                                                value={username}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    const cleaned = val.replace(/[;,\s]+/g, "");
                                                    if (cleaned !== val) {
                                                        setUsernameError("Unauthorised characters removed (spaces/;/,)");
                                                    } else {
                                                        setUsernameError("");
                                                    }
                                                    setUsername(cleaned);
                                                }}
                                                required
                                                className="auth-input"
                                                autoComplete="username"
                                            />
                                            {usernameError && <div className="text-danger mt-1">{usernameError}</div>}
                                        </Form.Group>
                                    </motion.div>
                                    
                                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
                                        <Form.Group controlId="formPassword">
                                            <Form.Label>Password</Form.Label>
                                            <Form.Control
                                                type="password"
                                                placeholder="At least 8 characters"
                                                value={password}
                                                onChange={(e) => {
                                                    const v = e.target.value;
                                                    setPassword(v);
                                                    if (passwordError) setPasswordError('');
                                                }}
                                                required
                                                className="auth-input"
                                                autoComplete="new-password"
                                            />
                                            {passwordError && <div className="text-danger mt-1">{passwordError}</div>}
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