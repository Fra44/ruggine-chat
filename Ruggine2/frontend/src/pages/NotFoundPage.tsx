import React from "react";

export default function NotFoundPage() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
            <h1 style={{ fontSize: '6rem', marginBottom: '1rem' }}>404</h1>
            <h2 style={{ marginBottom: '1rem' }}>Page Not Found</h2>
            <p style={{ fontSize: '1.2rem', color: '#666' }}>The page you are looking for does not exist.</p>
        </div>
    );
}