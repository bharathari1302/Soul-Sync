import React, { useState, useEffect } from 'react';
import { socket } from '../socket';
import SEO from '../components/SEO';

// Player Game doesn't need Firebase Auth, just anonymous socket/pseudo-auth via simple names
const PlayerGame = () => {
    const [step, setStep] = useState('join');
    const [name, setName] = useState('');
    const [teamCode, setTeamCode] = useState('');
    const [teamMembers, setTeamMembers] = useState([]);
    const [currentQ, setCurrentQ] = useState(null);
    const [answer, setAnswer] = useState('');
    const [roundResult, setRoundResult] = useState(null);
    const [timeLeft, setTimeLeft] = useState(15);
    const [finalRank, setFinalRank] = useState(null);

    useEffect(() => {
        let timer;
        // Run timer if we have an absolute end time
        if (step === 'question' && currentQ?.endTime) {
            const updateTimer = () => {
                const now = Date.now();
                const remaining = Math.max(0, Math.ceil((currentQ.endTime - now) / 1000));
                setTimeLeft(remaining);
            };
            updateTimer(); // Initial call
            timer = setInterval(updateTimer, 1000); // Check every second
        } else if (step === 'question') {
            // Fallback if no endTime (shouldn't happen with new server)
            timer = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000);
        }
        return () => clearInterval(timer);
    }, [step, currentQ]); // Depend on currentQ to get new endTime

    useEffect(() => {
        socket.on('team_created', ({ teamCode }) => {
            setTeamCode(teamCode);
            setStep('lobby');
        });

        socket.on('team_joined', ({ teamCode, members }) => {
            setTeamCode(teamCode);
            setTeamMembers(members);
            setStep('lobby');
        });

        socket.on('team_ready', ({ members }) => {
            setTeamMembers(members);
        });

        socket.on('new_question', (q) => {
            // Intelligent Fallback: If type is missing but options exist, assume MCQ
            if (!q.type && q.options && q.options.length > 0 && q.options[0]) {
                q.type = 'mcq';
            }

            setCurrentQ(q);
            setStep('question');
            setAnswer('');
            setRoundResult(null);

            // Set initial timeLeft based on endTime if available
            if (q.endTime) {
                setTimeLeft(Math.max(0, Math.ceil((q.endTime - Date.now()) / 1000)));
            } else {
                setTimeLeft(15);
            }
        });

        socket.on('round_result', (result) => {
            setRoundResult(result);
            setStep('result');
        });

        socket.on('times_up', () => {
            setStep('waiting');
        });

        socket.on('teams_cleared', () => {
            setStep('join');
            setName('');
            setTeamCode('');
            setTeamMembers([]);
        });

        socket.on('game_over', (teams) => {
            setStep('game_over');
            // We don't show rank anymore
        });

        socket.on('error', (msg) => alert(msg));

        return () => {
            socket.off('team_created');
            socket.off('team_joined');
            socket.off('team_ready');
            socket.off('new_question');
            socket.off('round_result');
            socket.off('times_up');
            socket.off('game_over');
            socket.off('teams_cleared');
        };
    }, [step, teamCode]); // dependencies for effect

    const [violation, setViolation] = useState(null);

    const [isFullscreen, setIsFullscreen] = useState(false);

    // --- ANTI-CHEAT MONITORING ---
    useEffect(() => {
        if (violation) return; // Already caught

        const handleViolation = (reason) => {
            setViolation(reason);
            // Optional: Notify server? socket.emit('player_violation', reason);
        };

        const handleVisibilityChange = () => {
            if (document.hidden) handleViolation("Tab Switched / Minimized");
        };

        const handleBlur = () => {
            handleViolation("Window Unfocused");
        };

        const handleFullscreenChange = () => {
            const isFs = !!document.fullscreenElement;
            setIsFullscreen(isFs);

            // Only penalize exiting fullscreen if we are in an active game state
            // and we transitioned FROM fullscreen TO windowed.
            const gameActive = ['question', 'waiting', 'result'].includes(step);

            if (!isFs && gameActive) {
                handleViolation("Exited Fullscreen");
            }
        };

        const preventContextMenu = (e) => e.preventDefault();

        const preventDevTools = (e) => {
            if (e.key === "F12" || (e.ctrlKey && e.shiftKey && e.key === "I")) {
                e.preventDefault();
            }
        };

        // Monitor strict anti-cheat only during actual game rounds
        const strictMode = ['question', 'waiting', 'result'].includes(step);

        if (strictMode) {
            document.addEventListener("visibilitychange", handleVisibilityChange);
            window.addEventListener("blur", handleBlur);
        }

        // Always monitor fullscreen changes to update UI state, but violation logic is inside the handler
        document.addEventListener("fullscreenchange", handleFullscreenChange);

        // Always block context menu/dev tools
        document.addEventListener("contextmenu", preventContextMenu);
        document.addEventListener("keydown", preventDevTools);

        // Check initial state
        setIsFullscreen(!!document.fullscreenElement);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("blur", handleBlur);
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
            document.removeEventListener("contextmenu", preventContextMenu);
            document.removeEventListener("keydown", preventDevTools);
        };
    }, [step, violation]);

    // Force Fullscreen helper
    const enterFullscreen = () => {
        const docEl = document.documentElement;
        if (docEl.requestFullscreen) {
            docEl.requestFullscreen().catch(err => {
                console.error("Fullscreen blocked:", err);
                alert("Please click 'Enter Fullscreen' to play.");
            });
        }
    };

    const createTeam = () => {
        if (!name) return alert('Enter name');
        // enterFullscreen(); // Removed: Fullscreen triggers on game start
        socket.emit('create_team', { playerName: name });
    };

    const joinTeam = () => {
        if (!name || !teamCode) return alert('Enter name and code');
        // enterFullscreen(); // Removed: Fullscreen triggers on game start
        socket.emit('join_team', { teamCode, playerName: name });
    };

    const submitAnswer = (ans) => {
        if (!ans) return;
        socket.emit('submit_answer', { teamCode, answer: ans, qIndex: currentQ.index });
        setStep('waiting');
    };

    if (violation) {
        return (
            <div className="container flex-center" style={{ minHeight: '80vh', background: 'black', color: 'red' }}>
                <div className="glass-panel" style={{ width: '400px', borderColor: 'red' }}>
                    <h1 style={{ fontSize: '3rem' }}>❌ CHEATING DETECTED</h1>
                    <h2 style={{ marginTop: '1rem', color: 'white' }}>{violation}</h2>
                    <p style={{ marginTop: '2rem', fontSize: '1.2rem' }}>You have been disqualified.</p>
                    <p style={{ marginTop: '1rem', color: '#aaa' }}>Score for this round: 0</p>
                    <button className="btn" style={{ marginTop: '2rem', background: '#333' }} onClick={() => window.location.reload()}>Retry (Refresh)</button>
                </div>
            </div>
        );
    }

    return (
        <div className="container flex-center" style={{ minHeight: '80vh' }}>
            <SEO title="Play Game - Soul Sync" description="Join the game, finding your partner and sync your souls!" name="Soul Sync" type="website" keywords="join soul sync, multiplayer couples game, play soul sync, sync with partner, couple quiz" />

            {step === 'join' && (
                <div className="glass-panel" style={{ width: '400px' }}>
                    <h2>Join Game</h2>
                    <input placeholder="Your Name" value={name} onChange={e => setName(e.target.value)} />

                    <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                        <p style={{ marginBottom: '0.5rem' }}>Create a new team:</p>
                        <button className="btn" style={{ width: '100%' }} onClick={createTeam}>Create Team & Enter Fullscreen</button>
                    </div>

                    <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                        <p style={{ marginBottom: '0.5rem' }}>Or join existing:</p>
                        <input placeholder="Team Code" value={teamCode} onChange={e => setTeamCode(e.target.value.toUpperCase())} />
                        <button className="btn btn-secondary" style={{ width: '100%' }} onClick={joinTeam}>Join Team & Enter Fullscreen</button>
                    </div>
                </div>
            )}

            {step === 'lobby' && (
                <div className="glass-panel" style={{ textAlign: 'center' }}>
                    <h2>Waiting Area</h2>
                    <div className="lobby-code">{teamCode}</div>
                    <p>Share this code with your partner!</p>

                    <div style={{ marginTop: '2rem' }}>
                        <h3>Team Members:</h3>
                        {teamMembers.map(m => (
                            <div key={m.id} style={{ fontSize: '1.2rem', marginTop: '0.5rem' }}>
                                {m.name === name ? `${m.name} (You)` : m.name}
                            </div>
                        ))}
                        {teamMembers.length < 2 && <p style={{ color: 'var(--accent-color)', marginTop: '1rem' }}>Waiting for partner...</p>}
                        {teamMembers.length === 2 && <p style={{ color: 'var(--secondary-color)', marginTop: '1rem' }}>Ready! Waiting for Admin to start...</p>}
                    </div>
                </div>
            )}

            {step === 'question' && (
                <div className="glass-panel" style={{ textAlign: 'center', width: '600px' }}>
                    {/* Fullscreen Overlay Prompt */}
                    {!isFullscreen && (
                        <div style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.95)', zIndex: 9999,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <h1 style={{ marginBottom: '2rem' }}>Game Starting!</h1>
                            <p style={{ marginBottom: '2rem' }}>Please enter full screen mode to continue.</p>
                            <button className="btn" style={{ fontSize: '1.5rem', padding: '1rem 3rem' }} onClick={enterFullscreen}>
                                Enter Game
                            </button>
                        </div>
                    )}

                    <div style={{ marginBottom: '1rem', color: timeLeft < 10 ? 'red' : 'white', fontWeight: 'bold', fontSize: '1.5rem' }}>
                        ⏱ {timeLeft}s
                    </div>
                    <h3>Question {currentQ.index + 1}</h3>
                    <h2 style={{ fontSize: '2rem', margin: '2rem 0' }}>{currentQ.text}</h2>

                    {currentQ.type === 'mcq' ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            {currentQ.options && currentQ.options
                                .filter(opt => opt && opt.trim() !== '')
                                .map((opt, i) => (
                                    <button key={i} className="btn btn-secondary" onClick={() => submitAnswer(opt)}>
                                        {opt}
                                    </button>
                                ))}
                        </div>
                    ) : (
                        <>
                            <input
                                placeholder="Type your answer..."
                                value={answer}
                                onChange={e => setAnswer(e.target.value)}
                                style={{ fontSize: '1.2rem', textAlign: 'center' }}
                            />
                            <button className="btn" onClick={() => submitAnswer(answer)}>Lock In Answer</button>
                        </>
                    )}
                </div>
            )}

            {step === 'waiting' && (
                <div className="glass-panel" style={{ textAlign: 'center' }}>
                    <h2>Answer Locked!</h2>
                    <p>Waiting for everyone else...</p>
                </div>
            )}

            {step === 'result' && (
                <div className="glass-panel" style={{ textAlign: 'center', width: '500px' }}>
                    <h3 style={{ marginBottom: '2rem', fontSize: '2rem' }}>Round Complete!</h3>

                    <div style={{ fontSize: '5rem', marginBottom: '2rem' }}>
                        👀
                    </div>

                    <p style={{ fontSize: '1.2rem' }}>Look at the Main Screen for results!</p>
                    <p style={{ marginTop: '1rem', opacity: 0.7 }}>Waiting for next question...</p>
                </div>
            )}

            {step === 'game_over' && (
                <div className="glass-panel" style={{ textAlign: 'center', animation: 'pulse-glow 2s infinite' }}>
                    <h1>See Main Screen</h1>
                    <p style={{ marginTop: '2rem' }}>Thank you for playing!</p>
                </div>
            )}

        </div>
    );
};

export default PlayerGame;
