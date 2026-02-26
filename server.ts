/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
    },
  });

  // Global Game State
  const MAX_PLAYERS = 60;
  let playerCounter = 1;
  const players: Record<string, { id: string, name: string, position: [number, number, number], rotation: number, state: 'active' | 'disabled', disabledUntil: number, score: number, color: string, walletAddress?: string }> = {};

  // AI Conductor Logic
  const signals = [
    { type: 'BUY', asset: 'SOL', price: '$145', confidence: '88%' },
    { type: 'SELL', asset: 'BONK', price: '$0.00002', confidence: '72%' },
    { type: 'BUY', asset: 'JUP', price: '$1.12', confidence: '94%' },
    { type: 'HOLD', asset: 'PYTH', price: '$0.45', confidence: '65%' },
    { type: 'BUY', asset: 'HIVE', price: '$2.50', confidence: '99%' },
  ];

  setInterval(() => {
    const signal = signals[Math.floor(Math.random() * signals.length)];
    const fullSignal = {
      ...signal,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      message: `${signal.type} ${signal.asset} @ ${signal.price} - ${signal.confidence} Confidence`
    };
    io.emit('aiSignal', fullSignal);
  }, 10000);

  app.get('/api/conductor', (req, res) => {
    res.json({ status: 'active', nextSignalIn: '10s' });
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('joinGame', (data: { walletAddress?: string }) => {
      if (Object.keys(players).length >= MAX_PLAYERS) {
        socket.emit('gameError', 'Hive is full (60/60 bees)');
        return;
      }
      
      // Assign random color (Bee colors: gold, yellow, black, orange)
      const colors = ['#FFD700', '#FFFF00', '#FFA500', '#FF8C00', '#B8860B'];
      const color = colors[Object.keys(players).length % colors.length];
      
      const playerName = data?.walletAddress 
        ? `${data.walletAddress.slice(0, 4)}...${data.walletAddress.slice(-4)}`
        : `Bee ${playerCounter++}`;

      players[socket.id] = {
        id: socket.id,
        name: playerName,
        position: [(Math.random() - 0.5) * 20, 1, (Math.random() - 0.5) * 20],
        rotation: 0,
        state: 'active',
        disabledUntil: 0,
        score: 0,
        color,
        walletAddress: data?.walletAddress
      };

      // Send initial state
      socket.emit('gameJoined', players);
      // Broadcast to others
      socket.broadcast.emit('playerJoined', players[socket.id]);
    });

    socket.on('updatePosition', (data: { position: [number, number, number], rotation: number }) => {
      if (players[socket.id]) {
        players[socket.id].position = data.position;
        players[socket.id].rotation = data.rotation;
        socket.broadcast.emit('playerMoved', { id: socket.id, ...data });
      }
    });

    socket.on('shoot', (data: { start: [number, number, number], end: [number, number, number], color: string }) => {
      socket.broadcast.emit('playerShot', { id: socket.id, ...data });
    });

    socket.on('hitPlayer', (targetId: string) => {
      if (players[targetId] && players[socket.id]) {
        const now = Date.now();
        // Allow hit if active OR if disabled period has expired
        if (players[targetId].state === 'active' || now > players[targetId].disabledUntil) {
          players[targetId].state = 'disabled';
          players[targetId].disabledUntil = now + 3000;
          players[socket.id].score += 100;
          
          io.emit('playerHit', {
            targetId,
            shooterId: socket.id,
            targetDisabledUntil: players[targetId].disabledUntil,
            shooterScore: players[socket.id].score
          });
        }
      }
    });

    socket.on('disconnect', () => {
      if (players[socket.id]) {
        delete players[socket.id];
        io.emit('playerLeft', socket.id);
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();