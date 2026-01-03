import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import AdminDashboard from './pages/AdminDashboard';
import PlayerGame from './pages/PlayerGame';
import Scoreboard from './pages/Scoreboard';
import { socket } from './socket';

function App() {
  useEffect(() => {
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <Router>
      <div className="main-content">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/game" element={<PlayerGame />} />
          <Route path="/scoreboard" element={<Scoreboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
