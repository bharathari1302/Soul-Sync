import React, { useEffect, useState } from 'react';
import { socket } from '../socket';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

// Helper for vibrant colors
const getRankColor = (index) => {
    const colors = ['#FFD700', '#C0C0C0', '#CD7F32']; // Gold, Silver, Bronze
    return colors[index] || `hsl(${Math.random() * 360}, 70%, 60%)`;
};

const Scoreboard = () => {
    const [view, setView] = useState('lobby'); // lobby | question | leaderboard | game_over

    // Confetti Helper
    const EffectTrigger = () => {
        useEffect(() => {
            const duration = 3 * 1000;
            const end = Date.now() + duration;

            (function frame() {
                confetti({
                    particleCount: 5,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: ['#FFD700', '#C0C0C0', '#CD7F32']
                });
                confetti({
                    particleCount: 5,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: ['#FFD700', '#C0C0C0', '#CD7F32']
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            }());
        }, []);
        return null;
    };

    const [gameState, setGameState] = useState({
        isActive: false,
        currentQ: null,
        timer: 0,
        totalQuestions: 0
    });
    const [teams, setTeams] = useState({});
    const [timeLeft, setTimeLeft] = useState(0);
    const [finalTeams, setFinalTeams] = useState([]);
    const transitionTimeout = React.useRef(null);


    useEffect(() => {
        socket.emit('admin_login'); // Identify as listener (or just listen broadly)

        socket.on('admin_data', (data) => {
            setTeams(data.teams);
            if (data.gameState && data.gameState.isActive) {
                // Determine Sync State
                if (data.gameState.isLeaderboard) {
                    setView('leaderboard');
                } else {
                    const currentQ = data.gameState.questions[data.gameState.currentQuestionIndex];
                    if (currentQ) {
                        setView('question');
                        setGameState(prev => ({
                            ...prev,
                            currentQ: currentQ,
                            isActive: true
                        }));
                        // We can't easily sync exact timeLeft without server sending startTime, 
                        // but showing the question is better than "Waiting...".
                        // Optional: Server could send 'questionStartTime' for precision.
                        setTimeLeft(15); // Default reset or just show Q
                    }
                }
            } else {
                setView('lobby');
            }
        });

        socket.on('admin_teams_update', (updatedTeams) => {
            setTeams(updatedTeams || {});
        });

        socket.on('new_question', (q) => {
            setView('question');
            setGameState(prev => ({ ...prev, currentQ: q }));

            // Absolute Sync
            if (q.endTime) {
                setTimeLeft(Math.max(0, Math.ceil((q.endTime - Date.now()) / 1000)));
            } else {
                setTimeLeft(q.timeLimit || 15);
            }
        });

        socket.on('times_up', () => {
            setView('leaderboard');
        });

        socket.on('game_reset', () => {
            if (transitionTimeout.current) clearTimeout(transitionTimeout.current);
            setView('lobby');
            setTeams({});
            setFinalTeams([]);
            setGameState({ isActive: false, currentQ: null, timer: 0 });
        });

        socket.on('game_over', (sortedTeamsPayload) => {
            setFinalTeams(sortedTeamsPayload || []);
            // Enforce "Leaderboard -> 5s -> Podium" flow
            setView('leaderboard');

            if (transitionTimeout.current) clearTimeout(transitionTimeout.current);
            transitionTimeout.current = setTimeout(() => {
                setView('game_over');
            }, 5000);
        });

        return () => {
            if (transitionTimeout.current) clearTimeout(transitionTimeout.current);
            socket.off('admin_data');
            socket.off('admin_teams_update');
            socket.off('new_question');
            socket.off('times_up');
            socket.off('game_reset');
            socket.off('game_over');
        };
    }, []);

    // Timer countdown effect - Absolute Sync
    useEffect(() => {
        let timer;
        if (view === 'question' && gameState.currentQ?.endTime) {
            const updateTimer = () => {
                const now = Date.now();
                const remaining = Math.max(0, Math.ceil((gameState.currentQ.endTime - now) / 1000));
                setTimeLeft(remaining);
            };
            updateTimer();
            timer = setInterval(updateTimer, 1000);
        } else if (view === 'question' && timeLeft > 0) {
            // Fallback
            timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        }
        return () => clearInterval(timer);
    }, [view, gameState.currentQ]); // Depend on currentQ to get new endTime

    const sortedTeams = Object.values(teams).sort((a, b) => b.score - a.score);
    const displayTeams = view === 'game_over' ? finalTeams : sortedTeams;

    return (
        <div className="scoreboard-container" style={{
            width: '100vw',
            height: '100vh',
            background: 'radial-gradient(circle at center, #2e0235 0%, #000 100%)',
            color: 'white',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Outfit', sans-serif"
        }}>
            {/* Background Animation Elements (Abstract blobs) */}
            <div className="blob" style={{ position: 'absolute', top: '10%', left: '10%', width: '300px', height: '300px', background: '#ff0055', filter: 'blur(100px)', opacity: 0.4, borderRadius: '50%' }}></div>
            <div className="blob" style={{ position: 'absolute', bottom: '10%', right: '10%', width: '400px', height: '400px', background: '#00ccff', filter: 'blur(120px)', opacity: 0.3, borderRadius: '50%' }}></div>

            <AnimatePresence mode="wait">
                {view === 'lobby' && (
                    <motion.div
                        key="lobby"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, y: -50 }}
                        style={{ textAlign: 'center', zIndex: 10 }}
                    >
                        <h1 style={{ fontSize: '5rem', marginBottom: '1rem', textShadow: '0 0 20px rgba(255,255,255,0.5)' }}>Soul Sync</h1>
                        <p style={{ fontSize: '2rem', color: '#aaa' }}>Join the game to start!</p>

                        <div style={{ marginTop: '3rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '2rem', maxWidth: '80vw' }}>
                            {sortedTeams.map(team => (
                                <motion.div
                                    key={team.code}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    style={{
                                        background: 'rgba(255,255,255,0.1)',
                                        backdropFilter: 'blur(10px)',
                                        padding: '1rem 2rem',
                                        borderRadius: '50px',
                                        fontSize: '1.5rem',
                                        border: '1px solid rgba(255,255,255,0.2)'
                                    }}
                                >
                                    {team.members.map(m => m.name).join(' & ')}
                                </motion.div>
                            ))}
                        </div>
                        <div style={{ marginTop: '4rem', fontSize: '1.2rem', opacity: 0.7 }}>
                            Waiting for Admin to launch...
                        </div>
                    </motion.div>
                )}

                {view === 'question' && (
                    <motion.div
                        key="question"
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        style={{ width: '80%', textAlign: 'center', zIndex: 10 }}
                    >
                        <div style={{ fontSize: '2rem', color: '#ff0055', marginBottom: '1rem' }}>
                            Question {gameState.currentQ?.index + 1}
                        </div>
                        <h2 style={{ fontSize: '4rem', lineHeight: '1.2', marginBottom: '3rem' }}>
                            {gameState.currentQ?.text}
                        </h2>

                        <div className="timer-circle" style={{
                            width: '150px', height: '150px',
                            borderRadius: '50%', border: '10px solid white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '4rem', fontWeight: 'bold', margin: '0 auto',
                            boxShadow: '0 0 30px rgba(255,0,85,0.5)',
                            background: timeLeft < 10 ? '#ff0055' : 'transparent',
                            transition: 'background 0.5s'
                        }}>
                            {timeLeft}
                        </div>

                        {gameState.currentQ?.type === 'mcq' && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '4rem' }}>
                                {gameState.currentQ.options.map((opt, i) => (
                                    <div key={i} style={{
                                        background: 'rgba(255,255,255,0.1)',
                                        padding: '2rem',
                                        borderRadius: '20px',
                                        fontSize: '2rem',
                                        textAlign: 'center'
                                    }}>
                                        {opt}
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}

                {(view === 'leaderboard' || view === 'game_over') && (
                    <motion.div
                        key="leaderboard"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ width: '80%', textAlign: 'center', zIndex: 10 }}
                    >
                        <h1 style={{ fontSize: '4rem', marginBottom: '2rem' }}>
                            {view === 'game_over' ? 'FINAL PODIUM' : 'LEADERBOARD'}
                        </h1>

                        {view === 'game_over' ? (
                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                {/* PREMIUM PODIUM DESIGN */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'flex-end',
                                    justifyContent: 'center',
                                    gap: '0', // Touching for podium look
                                    height: '450px', // Slightly shorter to make room
                                    marginTop: '1rem',
                                    width: '100%',
                                    maxWidth: '1000px',
                                    position: 'relative',
                                    marginBottom: '3rem'
                                }}>
                                    {/* Confetti Effect */}
                                    <EffectTrigger />

                                    {(() => {
                                        // Visual Order: 2nd, 1st, 3rd
                                        const top3 = displayTeams.slice(0, 3);
                                        if (top3.length === 0) return <p>No scores recorded.</p>;

                                        // Map to slots: [2nd, 1st, 3rd] logic
                                        const first = top3[0];
                                        const second = top3[1];
                                        const third = top3[2];

                                        const podiumOrder = [];
                                        if (second) podiumOrder.push({ ...second, rank: 2, color: 'silver', height: '60%', delay: 0.5 });
                                        if (first) podiumOrder.push({ ...first, rank: 1, color: '#ffd700', height: '80%', delay: 1.0 });
                                        if (third) podiumOrder.push({ ...third, rank: 3, color: '#cd7f32', height: '40%', delay: 1.5 });

                                        return podiumOrder.map((team) => (
                                            <motion.div
                                                key={team.code}
                                                initial={{ height: 0 }}
                                                animate={{ height: team.height }}
                                                transition={{ duration: 0.8, delay: team.delay, type: 'spring' }}
                                                style={{
                                                    flex: 1,
                                                    maxWidth: '250px',
                                                    background: `linear-gradient(to bottom, ${team.color}, rgba(0,0,0,0.8))`,
                                                    borderRadius: '20px 20px 0 0',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    justifyContent: 'flex-end',
                                                    position: 'relative',
                                                    boxShadow: `0 0 50px ${team.color}80`, // Colored glow
                                                    border: `2px solid ${team.color}`,
                                                    zIndex: team.rank === 1 ? 10 : 1, // Winner in front
                                                    transform: team.rank === 1 ? 'scale(1.1)' : 'scale(1)', // Slight pop for winner
                                                }}
                                            >
                                                {/* Rank Badge */}
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '-60px',
                                                    left: '50%',
                                                    transform: 'translateX(-50%)',
                                                    fontSize: team.rank === 1 ? '5rem' : '3rem',
                                                }}>
                                                    {team.rank === 1 ? '👑' : team.rank === 2 ? '🥈' : '🥉'}
                                                </div>

                                                {/* Score */}
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '10px',
                                                    width: '100%',
                                                    textAlign: 'center',
                                                    fontSize: '2.5rem',
                                                    fontWeight: 'bold',
                                                    color: 'white',
                                                    textShadow: '0 2px 4px black'
                                                }}>
                                                    {team.score}
                                                </div>

                                                {/* Names */}
                                                <div style={{
                                                    padding: '1rem',
                                                    background: 'rgba(0,0,0,0.6)',
                                                    width: '100%',
                                                    textAlign: 'center',
                                                    borderTop: `1px solid ${team.color}40`,
                                                    backdropFilter: 'blur(5px)'
                                                }}>
                                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                                                        {team.members.map(m => m.name.split(' ')[0]).join(' & ')}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ));
                                    })()}
                                </div>

                                {/* RUNNERS UP SECTION */}
                                {displayTeams.length > 3 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 50 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 2.5, duration: 0.8 }}
                                        style={{ width: '100%', maxWidth: '1200px' }}
                                    >
                                        <h3 style={{ marginBottom: '1rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '2px' }}>Honorable Mentions</h3>
                                        <div style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            justifyContent: 'center',
                                            gap: '1rem',
                                            maxHeight: '200px',
                                            overflowY: 'auto',
                                            padding: '1rem'
                                        }}>
                                            {displayTeams.slice(3).map((team, index) => (
                                                <div key={team.code} style={{
                                                    background: 'rgba(255,255,255,0.05)',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: '15px',
                                                    padding: '0.8rem 1.5rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '1rem',
                                                    minWidth: '200px',
                                                    backdropFilter: 'blur(5px)'
                                                }}>
                                                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#aaa' }}>#{index + 4}</span>
                                                    <div style={{ flex: 1, textAlign: 'left' }}>
                                                        <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{team.members.map(m => m.name).join(' & ')}</div>
                                                        <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{team.score} pts</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        ) : (
                            // STANDARD LIST FOR LEADERBOARD (Mid-game)
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {displayTeams.slice(0, 5).map((team, index) => (
                                    <motion.div
                                        key={team.code}
                                        initial={{ x: -50, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: index * 0.1 }}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            background: index === 0 ? 'linear-gradient(90deg, #FFD700 0%, rgba(0,0,0,0) 100%)' : 'rgba(255,255,255,0.1)',
                                            padding: '1.5rem 3rem',
                                            borderRadius: '15px',
                                            fontSize: '2rem',
                                            borderLeft: `10px solid ${getRankColor(index)}`
                                        }}
                                    >
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                            <span style={{ fontWeight: 'bold', width: '40px' }}>#{index + 1}</span>
                                            <span>{team.members.map(m => m.name).join(' & ')}</span>
                                        </div>
                                        <div style={{ fontWeight: 'bold' }}>{team.score}</div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Scoreboard;
