import { io } from 'socket.io-client';

// Production: Use env var (e.g., from Render/Firebase config)
// Development: Fallback to localhost:3000
const URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

export const socket = io(URL, {
    autoConnect: false
});
