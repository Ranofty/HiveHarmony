/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { useEffect, useState, useMemo } from 'react';
import { Game } from './components/Game';
import { MobileControls } from './components/MobileControls';
import { useGameStore } from './store';

function HUD() {
  const gameState = useGameStore(state => state.gameState);
  const score = useGameStore(state => state.score);
  const timeLeft = useGameStore(state => state.timeLeft);
  const playerState = useGameStore(state => state.playerState);
  const otherPlayers = useGameStore(state => state.otherPlayers);
  const events = useGameStore(state => state.events);
  const walletAddress = useGameStore(state => state.walletAddress);
  const playerCount = Object.keys(otherPlayers).length + 1;
  const leaveGame = useGameStore(state => state.leaveGame);
  const isMobile = useIsMobile();

  const leaderboard = useMemo(() => {
    const players = [
      { id: 'You', score: score, isMe: true },
      ...Object.values(otherPlayers).map(p => ({
        id: p.name,
        score: p.score,
        isMe: false
      }))
    ];
    return players.sort((a, b) => b.score - a.score);
  }, [score, otherPlayers]);

  const pendingSignal = useGameStore(state => state.pendingSignal);
  const executeTrade = useGameStore(state => state.executeTrade);

  return (
    <>
      {/* Execute Trade Toast */}
      {pendingSignal && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 animate-in zoom-in slide-in-from-bottom-8 duration-300">
          <button
            onClick={() => executeTrade()}
            className="group relative bg-yellow-500 text-black px-8 py-4 rounded-full font-black text-lg uppercase tracking-tighter shadow-[0_0_50px_rgba(255,215,0,0.5)] hover:scale-110 transition-transform active:scale-95"
          >
            <div className="absolute -inset-1 bg-yellow-500 rounded-full blur opacity-30 group-hover:opacity-100 transition-opacity animate-pulse" />
            <span className="relative flex items-center gap-3">
              <span className="text-2xl">⚡</span>
              EXECUTE {pendingSignal.type} {pendingSignal.asset}
            </span>
          </button>
        </div>
      )}

      {/* HUD Left - Score & Leaderboard */}
      <div className="absolute top-2 left-2 md:top-4 md:left-4 flex flex-col gap-2 md:gap-4 pointer-events-none">
        <div className="bg-black/40 backdrop-blur-md border border-yellow-500/30 p-4 rounded-lg">
          <div className="text-yellow-500 text-xs font-bold tracking-widest mb-1">HIVE SCORE</div>
          <div className="text-yellow-400 text-2xl md:text-3xl font-black drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]">
            {score.toString().padStart(6, '0')}
          </div>
        </div>
        
        {!isMobile && (
          <div className="bg-black/40 backdrop-blur-md border border-yellow-500/20 p-3 rounded-lg w-56 flex flex-col gap-1">
            <div className="text-yellow-500/70 text-[10px] font-bold mb-1 border-b border-yellow-500/20 pb-1 tracking-widest uppercase">Active Swarm</div>
            {leaderboard.map((p, i) => (
              <div key={p.id} className={`flex justify-between text-xs ${p.isMe ? 'text-yellow-400 font-bold' : 'text-yellow-400/50'}`}>
                <span className="truncate max-w-[120px]">{i + 1}. {p.id}</span>
                <span className="font-mono">{p.score}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* HUD Right - Time, Leave, Events */}
      <div className="absolute top-2 right-2 md:top-4 md:right-4 flex flex-col items-end gap-1 md:gap-2 pointer-events-auto">
        <div className="bg-black/40 backdrop-blur-md border border-yellow-500/30 p-2 px-4 rounded-lg flex flex-col items-end">
          <div className="text-yellow-500/70 text-[10px] font-bold tracking-widest uppercase">Wallet</div>
          <div className="text-yellow-400 text-xs font-mono">{walletAddress}</div>
        </div>

        <button
          onClick={leaveGame}
          className="mt-2 px-4 py-2 bg-red-500/10 border border-red-500/50 text-red-500 text-[10px] font-bold rounded hover:bg-red-500 hover:text-black transition-all duration-200 tracking-widest uppercase"
        >
          Disconnect
        </button>

        {/* Event Log / Notifications */}
        <div className="mt-4 flex flex-col items-end gap-2 pointer-events-none max-w-xs">
          {events.slice(-5).reverse().map(event => (
            <div 
              key={event.id} 
              className={`text-[10px] md:text-xs font-bold px-3 py-2 rounded border backdrop-blur-md animate-in fade-in slide-in-from-right-4 duration-300 ${
                event.type === 'signal' 
                  ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/50 shadow-[0_0_15px_rgba(255,215,0,0.2)]' 
                  : 'text-cyan-400 bg-cyan-400/10 border-cyan-400/50'
              }`}
            >
              {event.type === 'signal' && <span className="mr-2">⚡</span>}
              {event.message}
            </div>
          ))}
        </div>
      </div>

      {/* Multiplayer Info */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
        <div className="text-yellow-500/50 text-[10px] font-bold tracking-[0.3em] uppercase">
          Bees in Hive: {playerCount}
        </div>
      </div>

      {/* Damage Overlay */}
      {playerState === 'disabled' && (
        <div className="absolute inset-0 bg-red-500/10 pointer-events-none flex items-center justify-center backdrop-blur-[2px]">
          <div className="text-red-500 text-4xl md:text-6xl font-black tracking-[0.5em] drop-shadow-[0_0_20px_rgba(239,68,68,1)] animate-pulse text-center uppercase">
            Signal Lost
          </div>
        </div>
      )}

      {/* Game Controls */}
      {gameState === 'playing' && <MobileControls />}
    </>
  );
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    const uaMatch = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    return uaMatch || coarsePointer || window.innerWidth < 768;
  });

  useEffect(() => {
    const check = () => {
      const uaMatch = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
      setIsMobile(uaMatch || coarsePointer || window.innerWidth < 768);
    };
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return isMobile;
}

export default function App() {
  const gameState = useGameStore(state => state.gameState);
  const walletAddress = useGameStore(state => state.walletAddress);
  const isConnecting = useGameStore(state => state.isConnecting);
  const connectWallet = useGameStore(state => state.connectWallet);
  const startGame = useGameStore(state => state.startGame);

  return (
    <div className="w-screen h-screen bg-black relative overflow-hidden font-sans select-none text-white">
      {/* Hex Grid Background Effect */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #FFD700 1px, transparent 0)', backgroundSize: '40px 40px' }} />

      {/* 3D Canvas */}
      <div className="absolute inset-0">
        <Game />
      </div>

      {/* UI Overlay */}
      {gameState === 'playing' && <HUD />}

      {/* Menus */}
      {gameState === 'menu' && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-10 pointer-events-auto p-6">
          <div className="relative mb-12">
            <h1 className="text-5xl md:text-8xl font-black text-yellow-500 drop-shadow-[0_0_30px_rgba(255,215,0,0.4)] tracking-tighter italic">
              HIVE HARMONY
            </h1>
            <div className="absolute -bottom-4 right-0 text-yellow-500/50 text-xs font-bold tracking-[0.5em] uppercase">
              Decentralized Symphony
            </div>
          </div>
          
          <p className="text-yellow-500/70 mb-12 text-center max-w-md text-sm leading-relaxed tracking-wide">
            Enter the Cyber-Hive Command Center. Harmonize your trading behavior with the swarm and execute AI-driven signals in real-time.
          </p>

          <div className="flex flex-col gap-4 w-full max-w-xs">
            {!walletAddress ? (
              <button
                onClick={() => connectWallet()}
                disabled={isConnecting}
                className="w-full px-8 py-4 bg-yellow-500/10 border-2 border-yellow-500 text-yellow-500 text-lg font-black rounded-xl hover:bg-yellow-500 hover:text-black transition-all duration-300 shadow-[0_0_20px_rgba(255,215,0,0.2)] disabled:opacity-50 uppercase tracking-widest"
              >
                {isConnecting ? 'Syncing...' : 'Connect Wallet'}
              </button>
            ) : (
              <>
                <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-xl text-center mb-4">
                  <div className="text-yellow-500/50 text-[10px] font-bold tracking-widest uppercase mb-1">Connected as</div>
                  <div className="text-yellow-400 font-mono text-sm">{walletAddress}</div>
                </div>
                <button
                  onClick={() => startGame()}
                  className="w-full px-8 py-4 bg-yellow-500 text-black text-lg font-black rounded-xl hover:bg-white transition-all duration-300 shadow-[0_0_30px_rgba(255,215,0,0.4)] uppercase tracking-widest"
                >
                  Enter Hive
                </button>
              </>
            )}
          </div>

          <div className="mt-12 grid grid-cols-3 gap-8 text-center opacity-40">
            <div>
              <div className="text-yellow-500 font-bold">88%</div>
              <div className="text-[10px] uppercase tracking-widest">Accuracy</div>
            </div>
            <div>
              <div className="text-yellow-500 font-bold">12.4k</div>
              <div className="text-[10px] uppercase tracking-widest">Bees</div>
            </div>
            <div>
              <div className="text-yellow-500 font-bold">2.5s</div>
              <div className="text-[10px] uppercase tracking-widest">Latency</div>
            </div>
          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center z-10 pointer-events-auto">
          <h1 className="text-6xl font-black text-yellow-500 mb-4 drop-shadow-[0_0_20px_rgba(255,215,0,0.4)] tracking-tighter">
            HIVE DISCONNECTED
          </h1>
          <div className="text-xl text-yellow-500/70 mb-12 font-bold tracking-widest uppercase">
            Final Harmony Score: {useGameStore.getState().score}
          </div>
          <button
            onClick={() => startGame()}
            className="px-12 py-4 bg-yellow-500 text-black text-xl font-black rounded-xl hover:bg-white transition-all duration-300 shadow-[0_0_30px_rgba(255,215,0,0.4)] uppercase tracking-widest"
          >
            Re-Sync
          </button>
        </div>
      )}
    </div>
  );
}
