import React, { useState } from 'react';
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from '../firebase';

const AdminLogin = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            await signInWithEmailAndPassword(auth, email, password);
            // Auth state listener in parent or just callback
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="flex-center" style={{ minHeight: '60vh' }}>
            <form className="glass-panel" onSubmit={handleLogin} style={{ width: '400px' }}>
                <h2>Admin Login</h2>
                {error && <p style={{ color: 'var(--accent-color)', marginBottom: '1rem' }}>{error}</p>}

                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <button type="submit" className="btn" style={{ width: '100%' }}>Login</button>
            </form>
        </div>
    );
};

export default AdminLogin;
