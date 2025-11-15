const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const { connectDatabase, connectWithRetry } = require('./config/database');
const HealthMonitor = require('./services/healthMonitor');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Basic health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date(),
        message: 'Server is running - Architecture ready for implementation'
    });
});

// WebSocket setup (placeholder for Point #3)
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        credentials: true
    }
});

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // TODO Point #3: Implement WebSocket event handlers

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Instantiate and start health monitor as early as possible
const healthMonitor = new HealthMonitor();
healthMonitor.startMonitoring();

// Disabled for now: connectWithRetry keeps retrying forever
// Use blocking connectDatabase() instead - on failure, nodemon restarts on file change
// const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mindmap_db';
// connectWithRetry(MONGODB_URI);

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        // Connect to database (blocking - throws on failure)
        // On auth error: fix .env and save → nodemon restarts → tries again
        await connectDatabase();
        console.log('Database connected');

        // Start server
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();