const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all for prototype
        methods: ["GET", "POST"]
    }
});

// --- QUIZ STORAGE (File System) ---
const QUIZZES_FILE = path.join(__dirname, 'quizzes.json');

const readQuizzes = () => {
    try {
        if (!fs.existsSync(QUIZZES_FILE)) fs.writeFileSync(QUIZZES_FILE, '[]');
        const data = fs.readFileSync(QUIZZES_FILE, 'utf8');
        return JSON.parse(data || '[]');
    } catch (err) {
        console.error("Error reading quizzes:", err);
        return [];
    }
};

const writeQuizzes = (quizzes) => {
    try {
        fs.writeFileSync(QUIZZES_FILE, JSON.stringify(quizzes, null, 2));
    } catch (err) {
        console.error("Error writing quizzes:", err);
    }
};

// --- API Endpoints ---
app.get('/api/quizzes', (req, res) => {
    res.json(readQuizzes());
});

// Serve Static Frontend (Production)
// Serve Static Frontend (Production)
const clientBuildPath = path.join(__dirname, '../client/dist');
const parentDir = path.join(__dirname, '../');

if (fs.existsSync(clientBuildPath)) {
    app.use(express.static(clientBuildPath));
} else {
    // Debug info if build is missing
    app.get('/', (req, res) => {
        let debugInfo = `<h1>Deployment Pending or Failed</h1>`;
        debugInfo += `<p>Expected Client Path: ${clientBuildPath}</p>`;
        debugInfo += `<p>Exists: ${fs.existsSync(clientBuildPath)}</p>`;

        try {
            const files = fs.readdirSync(parentDir);
            debugInfo += `<p>Contents of ${parentDir}: ${JSON.stringify(files)}</p>`;
            if (files.includes('client')) {
                const clientFiles = fs.readdirSync(path.join(parentDir, 'client'));
                debugInfo += `<p>Contents of client: ${JSON.stringify(clientFiles)}</p>`;
            }
        } catch (e) {
            debugInfo += `<p>Error listing files: ${e.message}</p>`;
        }
        res.send(debugInfo);
    });
}

app.post('/api/quizzes', (req, res) => {
    const quizzes = readQuizzes();
    const newQuiz = { ...req.body, id: Date.now().toString(), createdAt: new Date().toISOString() };
    quizzes.push(newQuiz);
    writeQuizzes(quizzes);
    res.json(newQuiz);
});

app.delete('/api/quizzes/:id', (req, res) => {
    let quizzes = readQuizzes();
    quizzes = quizzes.filter(q => q.id !== req.params.id);
    writeQuizzes(quizzes);
    res.json({ success: true });
});

// Game State

// Game State
let gameState = {
    questions: [],
    currentQuestionIndex: -1,
    isActive: false,
    // timer: removed from public state to avoid circular dependency
};
let gameTimer = null;

// Teams: { teamCode: { members: [{id, name}], score: 0, answers: {} } }
let teams = {};
// Admins: Set of socket IDs
let admins = new Set();

const generateTeamCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // --- ADMIN EVENTS ---
    socket.on('admin_login', () => {
        admins.add(socket.id);
        socket.emit('admin_data', { teams, gameState });
    });

    socket.on('set_questions', (questions) => {
        if (!admins.has(socket.id)) return;
        gameState.questions = questions;
        gameState.currentQuestionIndex = -1; // Reset
        gameState.isActive = true;
        io.emit('game_state_update', {
            isActive: gameState.isActive,
            totalQuestions: gameState.questions.length
        });
    });

    // --- AUTOMATIC GAME LOOP ---
    const startQuestionTimer = () => {
        if (gameTimer) clearTimeout(gameTimer);

        if (!gameState.questions || gameState.questions.length === 0 || gameState.currentQuestionIndex < 0) {
            console.log("No questions to start or index invalid.");
            return;
        }

        const currentQ = gameState.questions[gameState.currentQuestionIndex];
        if (!currentQ) {
            console.error("Current Question is undefined. Ending game?");
            nextQuestionOrEnd(); // Skip or end
            return;
        }

        const timeLimit = 15; // Set to 15s
        gameState.questionStartTime = Date.now();

        io.emit('new_question', {
            index: gameState.currentQuestionIndex,
            text: currentQ.text || "Question Text Missing",
            type: (currentQ.type && currentQ.type.length > 0) ? currentQ.type : 'fill-up',
            options: currentQ.options || [],
            timeLimit: timeLimit
        });

        // 1. Wait for Time Limit
        gameTimer = setTimeout(() => {
            // 2. Show Results/Leaderboard for a brief period
            gameState.isLeaderboard = true;
            io.emit('times_up'); // Clients show "Time's up!"

            // Calculate round results here if not already done continuously?
            // Actually, we do real-time updates, so just transition UI.

            // 3. Wait 5-8 seconds then move to next or End
            gameTimer = setTimeout(() => {
                nextQuestionOrEnd();
            }, 5000); // reduced to 5s for snappier flow
        }, timeLimit * 1000);
    };

    const nextQuestionOrEnd = () => {
        if (gameState.currentQuestionIndex < gameState.questions.length - 1) {
            gameState.currentQuestionIndex++;
            gameState.isLeaderboard = false;
            startQuestionTimer();
        } else {
            // Game Over
            const sortedTeams = Object.values(teams).sort((a, b) => b.score - a.score);
            io.emit('game_over', sortedTeams);
            gameState.isActive = false;
            gameTimer = null;
        }
    };

    socket.on('launch_game', (questions) => {
        if (!admins.has(socket.id)) return;
        gameState.questions = questions;
        gameState.currentQuestionIndex = 0;
        gameState.isActive = true;

        // Reset Scores logic if desired? 
        // For now, assume fresh start usually precedes this.

        io.emit('game_state_update', {
            isActive: gameState.isActive,
            totalQuestions: gameState.questions.length
        });

        startQuestionTimer();
    });

    // Manual specific overrides
    socket.on('end_game', () => {
        if (!admins.has(socket.id)) return;
        if (gameTimer) clearTimeout(gameTimer);
        gameTimer = null;

        const sortedTeams = Object.values(teams).sort((a, b) => b.score - a.score);
        io.emit('game_over', sortedTeams);
        gameState.isActive = false;
    });

    // Manual specific overrides (optional, keeping for safety or skips)
    socket.on('next_question', () => {
        if (!admins.has(socket.id)) return;
        nextQuestionOrEnd();
    });

    socket.on('approve_results', () => {
        // Admin can manually trigger "Show Results" or "Update Scores" 
        // For Soul Sync, let's say real-time calculation happens, but results shown when Admin says so?
        // Or maybe "Live Scores" just update automatically.
        // User: "in the admin bashboard should appears the live scores"
        // User: "approve the question bank on the spot"
    });

    // --- PLAYER EVENTS ---
    socket.on('create_team', ({ playerName }) => {
        const teamCode = generateTeamCode();
        teams[teamCode] = {
            code: teamCode,
            members: [{ id: socket.id, name: playerName }],
            score: 0,
            answers: {} // { qIndex: { pId: answer } }
        };
        socket.join(teamCode);
        socket.emit('team_created', { teamCode });
        io.emit('admin_teams_update', teams); // Update admin
    });

    socket.on('join_team', ({ teamCode, playerName }) => {
        const team = teams[teamCode];
        if (team && team.members.length < 2) {
            team.members.push({ id: socket.id, name: playerName });
            socket.join(teamCode);
            socket.emit('team_joined', { teamCode, members: team.members });
            io.to(teamCode).emit('team_ready', { members: team.members }); // Notify partner
            io.emit('admin_teams_update', teams);
        } else {
            socket.emit('error', 'Team not found or full');
        }
    });

    socket.on('submit_answer', ({ teamCode, answer, qIndex }) => {
        const team = teams[teamCode];
        if (!team) return;

        if (!team.answers[qIndex]) team.answers[qIndex] = {};
        team.answers[qIndex][socket.id] = answer;

        // Check if both answered
        if (Object.keys(team.answers[qIndex]).length === 2) {
            // Logic: If answers match (and are not empty)
            const memberIds = team.members.map(m => m.id);
            const ans1 = team.answers[qIndex][memberIds[0]];
            const ans2 = team.answers[qIndex][memberIds[1]];

            let synced = false;
            // Simple string comparison (case insensitive?)
            if (ans1 && ans2 && ans1.toLowerCase().trim() === ans2.toLowerCase().trim()) {
                // Speed Scoring
                const now = Date.now();
                const timeTaken = (now - (gameState.questionStartTime || now)) / 1000; // seconds
                const timeLimit = 15;
                const speedBonus = Math.max(0, Math.floor((timeLimit - timeTaken) * 10)); // 10 pts per second remaining

                team.score += (100 + speedBonus);
                synced = true;
            }

            // Notify Team
            io.to(teamCode).emit('round_result', {
                match: synced,
                score: team.score,
                ans1,
                ans2
            });

            // Update Admin
            io.emit('admin_teams_update', teams);
        }
    });

    socket.on('reset_game', () => {
        if (!admins.has(socket.id)) return;
        gameState = {
            questions: [],
            currentQuestionIndex: -1,
            isActive: false,
        };
        if (gameTimer) clearTimeout(gameTimer);
        gameTimer = null;

        // Clear all teams/players on reset
        teams = {};
        io.emit('game_reset', { teams });
        io.emit('teams_cleared'); // Tell clients to go back to Join screen
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Cleanup if needed (remove from teams? might annoy users if momentary disconnect)
    });
});

// Catch-all for SPA handling
if (fs.existsSync(clientBuildPath)) {
    // Use app.use() to match all remaining routes without path parsing errors
    app.use((req, res) => {
        if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not Found' });
        res.sendFile(path.join(clientBuildPath, 'index.html'));
    });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
