# Mind Map Server - Point #1: Architecture & Infrastructure

## What's Included

This implementation covers **Point #1 only** - the foundational architecture:

- **System Architecture** - Client-server design with real-time sync  
- **Data Flow Design** - Complete flow from client edit → server → broadcast  
- **MongoDB Setup** - Database configuration and Docker setup  
- **Failover Simulation** - Hot standby health monitoring  
- **Operation Log Format** - Specification for all operations  
- **Sync Protocol** - WebSocket message protocol specification  

---

## Project Structure

```
server/
├── src/
│   ├── config/
│   │   ├── database.js           - MongoDB configuration
│   │   ├── server.js             - Server settings
│   │   └── constants.js          - System constants
│   │
│   ├── models/
│   │   ├── Map.js                - Map schema
│   │   ├── Node.js               - Node schema
│   │   ├── Edge.js               - Edge schema
│   │   ├── Operation.js          - Operation log schema
│   │   └── Session.js            - Session schema
│   │
│   ├── services/
│   │   ├── vectorClock.js        - Vector clock logic
│   │   ├── operationLog.js       - Operation logging
│   │   ├── healthMonitor.js      - Health check service
│   │   ├── syncService.js        - Sync protocol handler
│   │   ├── conflictResolver.js   - CRDT/OT implementation (to be implemented)
│   │   └── graphValidator.js     - Graph validation logic (to be implemented)
│   │
│   ├── controllers/
│   │   ├── mapController.js      - Map CRUD operations
│   │   ├── operationController.js  - Operation handling
│   │   └── sessionController.js  - Session management
│   │
│   ├── routes/
│   │   ├── mapRoutes.js         - REST API for maps
│   │   ├── operationRoutes.js    - Operation endpoints
│   │   └── healthRoutes.js       - Health check endpoint
│   │
│   ├── websocket/
│   │   ├── socketHandler.js      - WebSocket setup
│   │   ├── events/
│   │   │   ├── operationEvents.js      - Handle client operations (to be implemented)
│   │   │   ├── syncEvents.js          - Sync event handlers
│   │   │   └── connectionEvents.js    - Connect/disconnect
│   │   └── middleware/
│   │       ├── authentication.js     - Auth middleware (optional, to be implemented)
│   │       └── validation.js         - Message validation
│   │
│   ├── utils/
│   │   ├── logger.js            - Logging utility
│   │   ├── errorHandler.js      - Error handling
│   │   └── helpers.js           - Helper functions
│   │
│   └── server.js                - Main entry point
│
├── tests/
│   ├── unit/
│   │   ├── vectorClock.test.js  - Unit tests (to be added)
│   │   └── operationLog.test.js - Unit tests (to be added)
│   └── integration/
│       └── sync.test.js         - Integration tests (to be added)
│
├── .env.example                 - Environment template
├── .gitignore                   - Git ignore file
├── package.json                 - Dependencies
├── README.md                    - Setup instructions
└── docker-compose.yml           - MongoDB setup
```

---

## How to Run

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Set Up Environment
```bash
# Copy environment template
cp .env.example .env

# Edit if needed (defaults work fine)
nano .env
```

### Step 3: Set Up MongoDB Atlas (Cloud)

```bash
# 1. Create free account at https://www.mongodb.com/cloud/atlas
# 2. Create a cluster (takes 3-5 minutes)
# 3. Click "Connect" → "Connect your application"
# 4. Copy the connection string
# 5. Update .env with your connection string:
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/mindmap_db

# Important: In Atlas dashboard, add your IP to whitelist
# Or allow all IPs (0.0.0.0/0) for testing
```

### Step 4: Start the Server
```bash
# Development mode (auto-restart on changes)
npm run dev

# Production mode
npm start
```

### Step 5: Test It Works
```bash
# Health check
curl http://localhost:3000/health
```

**Expected output:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-15T10:00:00.000Z",
  "message": "Server is running - Architecture ready for implementation"
}
```

---

## Test Failover Simulation

### If Using MongoDB Atlas (Cloud):
```bash
# 1. Server is running normally
npm run dev

# 2. To test failover, temporarily break the connection:
# Option A: Change MONGODB_URI in .env to invalid connection string
MONGODB_URI=mongodb+srv://invalid:invalid@cluster.mongodb.net/test

# Option B: Pause cluster in MongoDB Atlas dashboard
# Go to Atlas → Clusters → ... → Pause Cluster

# 3. Watch the server logs for failover
# You'll see:
# Health check failed (1/3): Database not connected
# Health check failed (2/3): Database not connected
# Health check failed (3/3): Database not connected
# SERVICE UNHEALTHY - Triggering failover simulation
# Failover Simulation Started...

# 4. Restore connection to see recovery
# Revert MONGODB_URI to correct value or resume cluster in Atlas
# Service recovered
```

### If Using Local MongoDB (Docker):
```bash
# 1. Server is running normally
npm run dev

# 2. In another terminal, stop MongoDB
docker-compose stop mongodb

# 3. Watch the server logs for failover
# 4. Restart MongoDB to see recovery
docker-compose start mongodb
```

---

## Configuration

### Environment Variables (.env)
```bash
NODE_ENV=development                    # Environment
PORT=3000                               # Server port
CLIENT_URL=http://localhost:5173        # Frontend URL

# For MongoDB Atlas (Cloud):
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/mindmap_db

# For Local MongoDB (Docker):
# MONGODB_URI=mongodb://localhost:27017/mindmap_db

HEALTH_CHECK_INTERVAL=5000              # Health check (ms)
```

### Ports Used
- **3000** - Server HTTP/WebSocket
- **27017** - MongoDB (only if using local Docker)

---

## Documentation Files

All architecture specifications are in `docs/` folder:

| File | What It Contains |
|------|------------------|
| **architecture.md** | System architecture diagrams, component descriptions |
| **data-flow.md** | Complete data flow: client → server → broadcast |
| **operation-log-format.md** | Operation structure, types, and examples |
| **sync-protocol.md** | WebSocket message types, sync flows, protocols |

**Read these files** before implementing Points #2-5.

---

## Development Commands

```bash
# Start development server (auto-restart)
npm run dev

# Start production server
npm start

# MongoDB Atlas (Cloud) - No commands needed, always running

# Local MongoDB (Docker only):
# Start MongoDB
docker-compose up -d

# Stop MongoDB
docker-compose down

# View MongoDB logs
docker-compose logs mongodb

# Check MongoDB status
docker ps | grep mongodb
```

---

## Troubleshooting

### Server won't start
```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill the process if needed
kill -9 <PID>
```

### MongoDB connection failed
```bash
# For MongoDB Atlas:
# 1. Check connection string in .env is correct
# 2. Verify username/password are correct
# 3. Check IP whitelist in Atlas (allow 0.0.0.0/0 for testing)
# 4. Ensure cluster is not paused

# For Local MongoDB:
# Check if MongoDB is running
docker ps

# Start MongoDB if stopped
docker-compose up -d

# Check MongoDB logs
docker-compose logs mongodb
```

### Health checks failing
```bash
# For MongoDB Atlas:
# Check that your cluster is running in Atlas dashboard
# Verify connection string is correct in .env
# Check IP whitelist settings

# For Local MongoDB:
# This is normal if MongoDB is not running
# Start MongoDB:
docker-compose up -d

# Server will auto-recover in 5-15 seconds
```

---

## System Overview

### Architecture
```
┌─────────────┐         WebSocket         ┌─────────────┐
│   Client    │ ←────────────────────────→ │   Server    │
│  (React)    │                            │  (Node.js)  │
│             │   Operation Events         │             │
│ • UI Layer  │ ─────────────────────────→ │ • Conflict  │
│ • Local     │ ←─────── Broadcast ──────  │   Resolution│
│   State     │                            │ • Op Log    │
└─────────────┘                            └─────────────┘
                                                   │
                                                   ↓
                                           ┌─────────────┐
                                           │   MongoDB   │
                                           │  (Database) │
                                           └─────────────┘
```

### Data Flow
```
User Edit → Generate Operation → Send to Server → 
Validate → Persist → Broadcast → Update Other Clients
```

See `docs/` for detailed diagrams.

---

## Verification Checklist

After setup, verify everything works:

- [ ] `npm install` completes successfully
- [ ] MongoDB is ready (Atlas cluster running OR Docker container running)
- [ ] `.env` file has correct MONGODB_URI
- [ ] Server starts with `npm run dev`
- [ ] Health check returns status "ok"
- [ ] Can see "Database connected" in logs
- [ ] Can see "Health monitoring started" in logs
- [ ] Server running on http://localhost:3000