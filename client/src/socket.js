import { io } from 'socket.io-client';

// Production: If VITE_SERVER_URL is set, use it. Otherwise undefined (same-origin).
// Development: localhost:3000
const URL = import.meta.env.MOD === 'production'
    ? (import.meta.env.VITE_SERVER_URL || undefined)
    : 'http://localhost:3000';

export const socket = io(URL, {
    autoConnect: false
});
