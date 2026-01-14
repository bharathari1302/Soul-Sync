import React from 'react';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';

const Landing = () => {
    const navigate = useNavigate();

    return (
        <div className="container flex-center" style={{ flexDirection: 'column', height: '80vh' }}>
            <SEO title="Soul Sync - Home" description="Can you sync with your partner? Join the ultimate couple's compatibility game!" name="Soul Sync" type="website" />
            <h1 className="logo">SOUL SYNC</h1>
            <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '3rem' }}>
                Can you sync with your partner?
            </p>

            <div className="flex-center" style={{ gap: '2rem', flexWrap: 'wrap' }}>
                <div className="glass-panel" style={{ textAlign: 'center', width: '300px' }}>
                    <h2>Admin</h2>
                    <p style={{ marginBottom: '1.5rem', color: '#ccc' }}>Create questions and control the game.</p>
                    <button className="btn" onClick={() => navigate('/admin')}>
                        Enter Dashboard
                    </button>
                </div>

                <div className="glass-panel" style={{ textAlign: 'center', width: '300px' }}>
                    <h2>Player</h2>
                    <p style={{ marginBottom: '1.5rem', color: '#ccc' }}>Join with a partner and prove your sync.</p>
                    <button className="btn btn-secondary" onClick={() => navigate('/game')}>
                        Join Game
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Landing;
