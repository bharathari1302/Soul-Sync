import React, { useState, useEffect } from 'react';
import { socket } from '../socket';
import { auth } from '../firebase';
import { onAuthStateChanged, signOut } from "firebase/auth";
import AdminLogin from '../components/AdminLogin';
import QuizEditor from '../components/QuizEditor';
import SEO from '../components/SEO';

const AdminDashboard = () => {
    const [user, setUser] = useState(null);
    const [view, setView] = useState('dashboard'); // dashboard | create | live | results
    const [quizzes, setQuizzes] = useState([]);
    const [gameState, setGameState] = useState({ isActive: false, currentQ: null, currentQIndex: -1 });
    const [teams, setTeams] = useState({});

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                socket.emit('admin_login');
                fetchQuizzes();
            }
        });

        socket.on('admin_data', (data) => {
            setTeams(data.teams || {});
            setGameState(prev => ({
                ...prev,
                isActive: data.gameState.isActive,
                currentQIndex: data.gameState.currentQuestionIndex
            }));
            if (data.gameState.isActive) {
                setView('live');
            } else {
                setView('dashboard');
            }
        });

        socket.on('admin_teams_update', (updatedTeams) => {
            setTeams(updatedTeams || {});
        });

        socket.on('new_question', (q) => {
            setGameState(prev => ({ ...prev, currentQ: q, currentQIndex: q.index }));
        });

        socket.on('game_reset', () => {
            setView('dashboard');
            setGameState({ isActive: false, currentQ: null, currentQIndex: -1 });
        });

        socket.on('game_over', () => {
            setView('results');
        });

        return () => {
            unsubscribe();
            socket.off('admin_data');
            socket.off('admin_teams_update');
            socket.off('new_question');
            socket.off('game_reset');
            socket.off('game_over');
        };
    }, []);

    const fetchQuizzes = async () => {
        try {
            // Use relative path - works for Create React App / Vite proxy in dev AND production/tunnel
            const res = await fetch('/api/quizzes');
            if (res.ok) {
                const data = await res.json();
                setQuizzes(data);
            } else {
                console.error("Failed to fetch quizzes");
                setQuizzes([]);
            }
        } catch (err) {
            console.error("API Error:", err);
        }
    };

    const deleteQuiz = async (id) => {
        if (!window.confirm("Delete this quiz?")) return;

        // Optimistic / Local cleanup
        const localQuizzes = JSON.parse(localStorage.getItem('quizzes') || '[]');
        const updated = localQuizzes.filter(q => q.id !== id);
        localStorage.setItem('quizzes', JSON.stringify(updated));

        try {
            await fetch(`/api/quizzes/${id}`, { method: 'DELETE' });
            fetchQuizzes();
        } catch (err) {
            console.error("Error deleting quiz", err);
            // Re-fetch to ensure sync
            fetchQuizzes();
        }
    };

    const launchQuiz = (quiz) => {
        if (window.confirm(`Launch "${quiz.name}"?`)) {
            // Do NOT reset game here, as it clears teams!
            // We want to launch with the CURRENT connected teams.
            socket.emit('launch_game', quiz.questions);
            setView('live');
        }
    };

    const stopGame = () => {
        if (window.confirm("Stop current game?")) {
            socket.emit('reset_game');
            setView('dashboard');
        }
    };

    if (!user) return <AdminLogin />;

    return (
        <div className="container">
            <SEO title="Admin Dashboard - Soul Sync" description="Manage quizzes and control the game live." name="Soul Sync" type="website" />
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
                <h1>Admin Dashboard</h1>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button className="btn btn-secondary" onClick={() => window.open('/scoreboard', '_blank')}>Open Projector View</button>
                    <span>{user.email}</span>
                    <button className="btn btn-secondary" onClick={() => signOut(auth)}>Logout</button>
                </div>
            </header>

            {view === 'dashboard' && (
                <div>
                    {/* Active Lobby Section */}
                    {Object.keys(teams).length > 0 && (
                        <div className="glass-panel" style={{ marginBottom: '2rem', border: '1px solid #00ccff' }}>
                            <h3 style={{ color: '#00ccff', marginBottom: '1rem' }}>
                                🟢 Active Lobby ({Object.keys(teams).length} Teams Ready)
                            </h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                                {Object.values(teams).map(t => (
                                    <div key={t.code} style={{
                                        background: 'rgba(255,255,255,0.1)',
                                        padding: '0.5rem 1rem',
                                        borderRadius: '20px',
                                        fontSize: '0.9rem'
                                    }}>
                                        {t.members.map(m => m.name).join(' & ')}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h2>My Quizzes</h2>
                        <button className="btn" onClick={() => setView('create')}>+ Create New Quiz</button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                        {quizzes.length === 0 && <p style={{ opacity: 0.5 }}>No quizzes found. Create one to get started!</p>}
                        {quizzes.map(q => (
                            <div key={q.id} className="glass-panel" style={{ transition: 'transform 0.2s', cursor: 'default' }}>
                                <h3 style={{ marginBottom: '0.5rem' }}>{q.name}</h3>
                                <p style={{ marginBottom: '1rem', opacity: 0.7 }}>{q.questions?.length || 0} Questions</p>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button className="btn" style={{ flex: 1 }} onClick={() => launchQuiz(q)}>LAUNCH</button>
                                    <button className="btn-secondary" style={{ color: 'red', borderColor: 'red' }} onClick={() => deleteQuiz(q.id)}>Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {view === 'create' && (
                <QuizEditor
                    user={user}
                    onCancel={() => setView('dashboard')}
                    onSave={() => {
                        setView('dashboard');
                        fetchQuizzes();
                    }}
                />
            )}

            {view === 'live' && (
                <div className="glass-panel" style={{ textAlign: 'center', border: '2px solid #00ccff' }}>
                    <h2 style={{ color: '#00ccff', marginBottom: '2rem' }}>GAME IS LIVE</h2>

                    <div style={{ marginBottom: '2rem' }}>
                        <h3>Question {gameState.currentQIndex + 1} / {gameState.currentQIndex >= 0 ? '?' : '0'}</h3>
                        {gameState.currentQ ? (
                            <p style={{ fontSize: '1.5rem' }}>{gameState.currentQ.text}</p>
                        ) : (
                            <p>Waiting for next question or Lobby...</p>
                        )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '2rem' }}>
                        <div style={{ textAlign: 'center' }}>
                            <h1>{Object.keys(teams).length}</h1>
                            <p>Teams Joined</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button className="btn btn-secondary" onClick={stopGame} style={{ background: 'red', border: 'none', color: 'white', padding: '1rem 3rem', fontSize: '1.2rem' }}>
                            STOP GAME
                        </button>
                    </div>

                    <div style={{ marginTop: '2rem', textAlign: 'left', maxHeight: '300px', overflowY: 'auto' }}>
                        <h3>Teams</h3>
                        {Object.values(teams).map(t => (
                            <div key={t.code} style={{ padding: '0.5rem', borderBottom: '1px solid #333' }}>
                                {t.members.map(m => m.name).join(' & ')} - {t.score}pts
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {view === 'results' && (
                <div className="glass-panel" style={{ border: '2px solid #FFD700', maxWidth: '800px', margin: '0 auto' }}>
                    <h1 style={{ textAlign: 'center', color: '#FFD700', marginBottom: '2rem' }}>🏆 Final Results</h1>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.2)' }}>
                                    <th style={{ padding: '1rem', textAlign: 'left' }}>Rank</th>
                                    <th style={{ padding: '1rem', textAlign: 'left' }}>Team Members</th>
                                    <th style={{ padding: '1rem', textAlign: 'right' }}>Final Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.values(teams)
                                    .sort((a, b) => b.score - a.score)
                                    .map((t, index) => (
                                        <tr key={t.code} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', background: index < 3 ? 'rgba(255,215,0,0.05)' : 'transparent' }}>
                                            <td style={{ padding: '1rem' }}>
                                                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ fontWeight: 'bold' }}>{t.members.map(m => m.name).join(' & ')}</div>
                                                <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>Code: {t.code}</div>
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'right', fontSize: '1.2rem', fontWeight: 'bold' }}>
                                                {t.score}
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ marginTop: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                        <p style={{ opacity: 0.7 }}>Record these scores before resetting!</p>
                        <button
                            className="btn"
                            style={{ background: '#FFD700', color: 'black', padding: '1rem 3rem', fontSize: '1.2rem', fontWeight: 'bold' }}
                            onClick={stopGame}
                        >
                            Finish & Reset Game
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
