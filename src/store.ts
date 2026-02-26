/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

export type GameState = 'menu' | 'playing' | 'gameover';
export type EntityState = 'active' | 'disabled';

export interface PlayerData {
  id: string;
  name: string;
  position: [number, number, number];
  rotation: number;
  state: EntityState;
  disabledUntil: number;
  score: number;
  color: string;
  walletAddress?: string;
}

export interface LaserData {
  id: string;
  start: [number, number, number];
  end: [number, number, number];
  timestamp: number;
  color: string;
}

export interface ParticleData {
  id: string;
  position: [number, number, number];
  timestamp: number;
  color: string;
}

export interface AISignal {
  id: string;
  type: 'BUY' | 'SELL' | 'HOLD';
  asset: string;
  price: string;
  confidence: string;
  message: string;
  timestamp: number;
}

export interface GameEvent {
  id: string;
  message: string;
  timestamp: number;
  type?: 'info' | 'signal';
}

export interface MonolithData {
  id: string;
  title: string;
  position: [number, number, number];
  rotation: [number, number, number];
  type: 'alpha' | 'stats' | 'staking';
}

interface GameStore {
  gameState: GameState;
  score: number;
  timeLeft: number;
  playerState: EntityState;
  playerDisabledUntil: number;
  lasers: LaserData[];
  particles: ParticleData[];
  events: GameEvent[];
  monoliths: MonolithData[];
  pendingSignal: AISignal | null;
  stakedAmount: number;
  
  // Wallet
  walletAddress: string | null;
  isConnecting: boolean;
  
  // Multiplayer
  socket: Socket | null;
  otherPlayers: Record<string, PlayerData>;
  localPosition: [number, number, number];

  connectWallet: () => Promise<void>;
  startGame: () => void;
  endGame: () => void;
  leaveGame: () => void;
  updateTime: (delta: number) => void;
  hitPlayer: () => void;
  addLaser: (start: [number, number, number], end: [number, number, number], color: string) => void;
  addParticles: (position: [number, number, number], color: string) => void;
  addEvent: (message: string, type?: 'info' | 'signal') => void;
  cleanupEffects: (time: number) => void;
  setPlayerState: (state: EntityState) => void;
  executeTrade: () => void;
  stake: (amount: number) => void;
  updatePlayerPosition: (position: [number, number, number], rotation: number) => void;

  // Mobile Controls
  mobileInput: {
    move: { x: number, y: number };
    look: { x: number, y: number };
    shooting: boolean;
  };
  setMobileInput: (input: Partial<{
    move: { x: number, y: number };
    look: { x: number, y: number };
    shooting: boolean;
  }>) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: 'menu',
  score: 0,
  timeLeft: 3600,
  playerState: 'active',
  playerDisabledUntil: 0,
  lasers: [],
  particles: [],
  events: [],
  monoliths: [
    { id: 'alpha', title: 'MARKET ALPHA', position: [0, 5, -30], rotation: [0, 0, 0], type: 'alpha' },
    { id: 'stats', title: 'HIVE STATS', position: [30, 5, 0], rotation: [0, -Math.PI / 2, 0], type: 'stats' },
    { id: 'staking', title: 'STAKING TERMINAL', position: [-30, 5, 0], rotation: [0, Math.PI / 2, 0], type: 'staking' },
  ],
  pendingSignal: null,
  stakedAmount: 0,
  
  walletAddress: null,
  isConnecting: false,

  socket: null,
  otherPlayers: {},
  localPosition: [0, 0, 0],

  mobileInput: {
    move: { x: 0, y: 0 },
    look: { x: 0, y: 0 },
    shooting: false
  },

  setMobileInput: (input) => set((state) => ({
    mobileInput: { ...state.mobileInput, ...input }
  })),

  connectWallet: async () => {
    set({ isConnecting: true });
    await new Promise(resolve => setTimeout(resolve, 1000));
    const mockAddress = `HivE${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
    set({ walletAddress: mockAddress, isConnecting: false });
  },

  startGame: () => {
    const { socket, walletAddress } = get();
    if (socket) socket.disconnect();

    const newSocket = io(window.location.origin);
    
    newSocket.on('connect', () => {
      newSocket.emit('joinGame', { walletAddress });
    });

    newSocket.on('gameError', (msg: string) => {
      alert(msg);
      get().leaveGame();
    });

    newSocket.on('gameJoined', (players: Record<string, PlayerData>) => {
      const otherPlayers = { ...players };
      delete otherPlayers[newSocket.id!];
      set({ 
        otherPlayers,
        gameState: 'playing',
        timeLeft: 3600,
        score: 0,
      });
    });

    newSocket.on('aiSignal', (signal: AISignal) => {
      const { otherPlayers, socket } = get();
      const now = Date.now();
      get().addEvent(signal.message, 'signal');
      const center: [number, number, number] = [0, 5, 0];
      
      set({ pendingSignal: signal });
      
      // Auto-clear signal after 8 seconds
      setTimeout(() => {
        set(state => state.pendingSignal?.id === signal.id ? { pendingSignal: null } : state);
      }, 8000);

      // Pulse to other players
      Object.values(otherPlayers).forEach(p => {
        set(state => ({
          lasers: [...state.lasers, { 
            id: Math.random().toString(36).substr(2, 9), 
            start: center, 
            end: p.position, 
            timestamp: now, 
            color: '#FFD700' 
          }]
        }));
      });

      // Pulse to local player
      set(state => ({
        lasers: [...state.lasers, { 
          id: Math.random().toString(36).substr(2, 9), 
          start: center, 
          end: state.localPosition, 
          timestamp: now, 
          color: '#FFD700' 
        }]
      }));
    });

    newSocket.on('playerJoined', (player: PlayerData) => {
      set(state => ({
        otherPlayers: { ...state.otherPlayers, [player.id]: player },
        events: [...state.events, { id: Math.random().toString(), message: `${player.name} entered the hive`, timestamp: Date.now() }]
      }));
    });

    newSocket.on('playerMoved', (data: { id: string, position: [number, number, number], rotation: number }) => {
      set(state => {
        if (!state.otherPlayers[data.id]) return state;
        return {
          otherPlayers: {
            ...state.otherPlayers,
            [data.id]: {
              ...state.otherPlayers[data.id],
              position: data.position,
              rotation: data.rotation
            }
          }
        };
      });
    });

    newSocket.on('playerShot', (data: { id: string, start: [number, number, number], end: [number, number, number], color: string }) => {
      set(state => ({
        lasers: [...state.lasers, { id: Math.random().toString(36).substr(2, 9), start: data.start, end: data.end, timestamp: Date.now(), color: data.color }],
        particles: [...state.particles, { id: Math.random().toString(36).substr(2, 9), position: data.end, timestamp: Date.now(), color: data.color }]
      }));
    });

    newSocket.on('playerHit', (data: { targetId: string, shooterId: string, targetDisabledUntil: number, shooterScore: number }) => {
      set(state => {
        const now = Date.now();
        const isLocalShooter = data.shooterId === newSocket.id;
        const isLocalTarget = data.targetId === newSocket.id;
        const shooterName = isLocalShooter ? 'You' : (state.otherPlayers[data.shooterId]?.name || 'Unknown');
        const targetName = isLocalTarget ? 'You' : (state.otherPlayers[data.targetId]?.name || 'Unknown');
        const eventMsg = `${shooterName} pinged ${targetName}`;
        
        let newState: Partial<GameStore> = {
          events: [...state.events, { id: Math.random().toString(), message: eventMsg, timestamp: now }]
        };

        if (isLocalTarget) {
          newState.playerState = 'disabled';
          newState.playerDisabledUntil = data.targetDisabledUntil;
        }

        if (isLocalShooter) {
          newState.score = data.shooterScore;
        }

        const players = { ...state.otherPlayers };
        if (!isLocalTarget && players[data.targetId]) {
          players[data.targetId] = { ...players[data.targetId], state: 'disabled', disabledUntil: data.targetDisabledUntil };
        }
        if (!isLocalShooter && players[data.shooterId]) {
          players[data.shooterId] = { ...players[data.shooterId], score: data.shooterScore };
        }
        newState.otherPlayers = players;
        return newState;
      });
    });

    newSocket.on('playerLeft', (id: string) => {
      set(state => {
        const players = { ...state.otherPlayers };
        const playerName = players[id]?.name || 'Unknown';
        delete players[id];
        return { 
          otherPlayers: players,
          events: [...state.events, { id: Math.random().toString(), message: `${playerName} left the hive`, timestamp: Date.now() }]
        };
      });
    });

    set({
      gameState: 'playing',
      score: 0,
      timeLeft: 3600,
      playerState: 'active',
      playerDisabledUntil: 0,
      lasers: [],
      particles: [],
      events: [],
      socket: newSocket,
      otherPlayers: {},
    });
  },

  endGame: () => {
    const { socket } = get();
    if (socket) socket.disconnect();
    set({ gameState: 'gameover', socket: null });
  },

  leaveGame: () => {
    const { socket } = get();
    if (socket) socket.disconnect();
    set({
      gameState: 'menu',
      socket: null,
      otherPlayers: {},
      lasers: [],
      particles: [],
      events: [],
      score: 0,
      timeLeft: 3600,
      playerState: 'active'
    });
  },

  updateTime: (delta) => set((state) => {
    if (state.gameState !== 'playing') return state;
    const newTime = state.timeLeft - delta;
    if (newTime <= 0) {
      if (state.socket) state.socket.disconnect();
      return { timeLeft: 0, gameState: 'gameover', socket: null };
    }
    return { timeLeft: newTime };
  }),

  hitPlayer: () => set((state) => {
    if (state.playerState === 'disabled' || state.gameState !== 'playing') return state;
    return {
      playerState: 'disabled',
      playerDisabledUntil: Date.now() + 3000,
      score: Math.max(0, state.score - 50),
    };
  }),

  addLaser: (start, end, color) => {
    const { socket } = get();
    if (socket) socket.emit('shoot', { start, end, color });
    set((state) => ({
      lasers: [...state.lasers, { id: Math.random().toString(36).substr(2, 9), start, end, timestamp: Date.now(), color }]
    }));
  },

  addParticles: (position, color) => set((state) => ({
    particles: [...state.particles, { id: Math.random().toString(36).substr(2, 9), position, timestamp: Date.now(), color }]
  })),

  addEvent: (message, type = 'info') => set((state) => ({
    events: [...state.events, { id: Math.random().toString(), message, timestamp: Date.now(), type }]
  })),

  cleanupEffects: (time) => set((state) => {
    const lasers = state.lasers.filter(l => time - l.timestamp < 200);
    const particles = state.particles.filter(p => time - p.timestamp < 500);
    const events = state.events.filter(e => time - e.timestamp < 5000);
    if (lasers.length !== state.lasers.length || particles.length !== state.particles.length || events.length !== state.events.length) {
      return { lasers, particles, events };
    }
    return state;
  }),

  setPlayerState: (playerState) => set({ playerState }),

  executeTrade: () => {
    const { pendingSignal, score } = get();
    if (!pendingSignal) return;
    
    const points = 100;
    set({ 
      score: score + points,
      pendingSignal: null,
    });
    get().addEvent(`Executed ${pendingSignal.type} ${pendingSignal.asset} (+${points} Score)`, 'info');
  },

  stake: (amount: number) => {
    const { stakedAmount, score } = get();
    if (amount <= 0) return;
    set({ 
      stakedAmount: stakedAmount + amount,
      score: score + Math.floor(amount * 10) // Reward for staking
    });
    get().addEvent(`Staked ${amount} SOL in Hive Harmony`, 'info');
  },

  updatePlayerPosition: (position, rotation) => {
    const { socket } = get();
    if (socket) socket.emit('updatePosition', { position, rotation });
    set({ localPosition: position });
  }
}));
