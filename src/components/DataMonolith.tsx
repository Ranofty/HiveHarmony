/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { Html } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';
import { useGameStore } from '../store';
import { useState, useEffect } from 'react';

export function DataMonolith({ id, title, position, rotation, type }: { id: string, title: string, position: [number, number, number], rotation: [number, number, number], type: 'alpha' | 'stats' | 'staking' }) {
  const [signals, setSignals] = useState<{ id: string, msg: string }[]>([]);
  const localPosition = useGameStore(state => state.localPosition);
  const stakedAmount = useGameStore(state => state.stakedAmount);
  const stake = useGameStore(state => state.stake);
  const addEvent = useGameStore(state => state.addEvent);
  const [isNear, setIsNear] = useState(false);
  const [stakeInput, setStakeInput] = useState('');
  
  useEffect(() => {
    const dist = Math.sqrt(
      Math.pow(localPosition[0] - position[0], 2) +
      Math.pow(localPosition[2] - position[2], 2)
    );
    setIsNear(dist < 15);
  }, [localPosition, position]);

  useEffect(() => {
    if (type === 'alpha') {
      const interval = setInterval(() => {
        const assets = ['SOL', 'JUP', 'PYTH', 'BONK', 'HIVE'];
        const types = ['BUY', 'SELL', 'HOLD'];
        const asset = assets[Math.floor(Math.random() * assets.length)];
        const type = types[Math.floor(Math.random() * types.length)];
        const conf = Math.floor(Math.random() * 30) + 70;
        const newSignal = { id: Math.random().toString(), msg: `${type} ${asset} @ $${(Math.random() * 100).toFixed(2)} - ${conf}% Conf.` };
        setSignals(prev => [newSignal, ...prev].slice(0, 8));
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [type]);

  const handleStake = () => {
    const val = parseFloat(stakeInput);
    if (!isNaN(val) && val > 0) {
      stake(val);
      setStakeInput('');
    }
  };

  return (
    <RigidBody type="fixed" position={position} rotation={rotation}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[12, 18, 1]} />
        <meshStandardMaterial color="#000000" roughness={0.1} metalness={0.9} />
        
        {/* Glowing Frame */}
        <mesh position={[0, 0, 0.51]}>
          <planeGeometry args={[11.8, 17.8]} />
          <meshBasicMaterial color="#FFD700" transparent opacity={0.05} />
        </mesh>
        
        {/* Top Bar */}
        <mesh position={[0, 8.5, 0.52]}>
          <planeGeometry args={[12, 1]} />
          <meshBasicMaterial color="#FFD700" />
        </mesh>
      </mesh>

      <Html
        transform
        distanceFactor={10}
        position={[0, 0, 0.53]}
        className="select-none"
        pointerEvents="auto"
      >
        <div className={`w-[400px] h-[600px] bg-black/80 backdrop-blur-xl border-2 flex flex-col p-6 font-sans overflow-hidden rounded-lg shadow-[0_0_50px_rgba(255,215,0,0.2)] pointer-events-auto transition-all duration-500 ${isNear ? 'border-yellow-500 scale-105 opacity-100' : 'border-yellow-500/20 scale-95 opacity-50'}`}>
          <div className={`text-yellow-500 text-2xl font-black tracking-[0.2em] mb-6 border-b border-yellow-500/30 pb-4 uppercase italic transition-opacity duration-500 ${isNear ? 'opacity-100' : 'opacity-30'}`}>
            {title}
          </div>

          {type === 'alpha' && (
            <div className="flex flex-col gap-3">
              {signals.map(s => (
                <button 
                  key={s.id} 
                  onClick={() => addEvent(`Analyzing ${s.msg.split(' ')[1]}...`, 'info')}
                  className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded text-yellow-400 text-sm font-mono animate-in fade-in slide-in-from-bottom-2 duration-500 hover:bg-yellow-500/20 hover:border-yellow-500/40 text-left transition-colors"
                >
                  <span className="text-yellow-500/50 mr-2">{'>>'}</span>
                  {s.msg}
                </button>
              ))}
              {signals.length === 0 && <div className="text-yellow-500/30 text-xs animate-pulse">Scanning network...</div>}
            </div>
          )}

          {type === 'stats' && (
            <div className="flex flex-col gap-8 mt-4">
              <StatItem label="Active Bees" value="12,482" trend="+12%" onClick={() => addEvent("Swarm activity is increasing", "info")} />
              <StatItem label="Total Staked" value={`${(1200000 + stakedAmount).toLocaleString()} SOL`} trend="+45k" onClick={() => addEvent("Staking volume at all-time high", "info")} />
              <StatItem label="Hive APY" value="24.8%" trend="Stable" onClick={() => addEvent("Yields are currently optimal", "info")} />
              <StatItem label="Harmony Index" value="0.94" trend="Optimal" onClick={() => addEvent("Hive synchronization is perfect", "info")} />
              
              <div className="mt-auto bg-yellow-500/5 p-4 rounded border border-yellow-500/10">
                <div className="text-[10px] text-yellow-500/50 uppercase tracking-widest mb-2">Network Health</div>
                <div className="h-1 bg-yellow-500/20 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500 w-[92%] animate-pulse" />
                </div>
              </div>
            </div>
          )}

          {type === 'staking' && (
            <div className="flex flex-col gap-6 mt-4">
              <div className="text-yellow-500/70 text-sm leading-relaxed">
                Deposit SOL to increase your Hive Influence and unlock higher-tier AI signals.
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-[10px] text-yellow-500/50 uppercase tracking-widest">Amount (SOL)</label>
                <div className="bg-black border border-yellow-500/30 p-3 rounded text-yellow-400 font-mono flex justify-between items-center focus-within:border-yellow-500 transition-colors">
                  <input 
                    type="number" 
                    value={stakeInput}
                    onChange={(e) => setStakeInput(e.target.value)}
                    placeholder="0.00"
                    className="bg-transparent border-none outline-none w-full text-yellow-400 placeholder:text-yellow-500/20"
                  />
                  <button 
                    onClick={() => setStakeInput('100')}
                    className="text-yellow-500/30 text-xs hover:text-yellow-500 transition-colors"
                  >
                    MAX
                  </button>
                </div>
              </div>

              <button 
                onClick={handleStake}
                disabled={!stakeInput || parseFloat(stakeInput) <= 0}
                className="w-full py-4 bg-yellow-500 text-black font-black rounded-lg hover:bg-white transition-all duration-300 uppercase tracking-widest text-sm shadow-[0_0_20px_rgba(255,215,0,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Stake HIVE
              </button>

              <div className="mt-auto grid grid-cols-2 gap-4">
                <div className="bg-yellow-500/5 p-3 rounded border border-yellow-500/10">
                  <div className="text-[8px] text-yellow-500/50 uppercase mb-1">Your Stake</div>
                  <div className="text-yellow-400 font-bold">{stakedAmount.toFixed(2)} SOL</div>
                </div>
                <div className="bg-yellow-500/5 p-3 rounded border border-yellow-500/10">
                  <div className="text-[8px] text-yellow-500/50 uppercase mb-1">Rewards</div>
                  <div className="text-yellow-400 font-bold">{(stakedAmount * 0.1).toFixed(2)} HIVE</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Html>
    </RigidBody>
  );
}

function StatItem({ label, value, trend, onClick }: { label: string, value: string, trend: string, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="flex justify-between items-end border-b border-yellow-500/10 pb-2 w-full text-left hover:bg-yellow-500/5 transition-colors group"
    >
      <div>
        <div className="text-[10px] text-yellow-500/50 uppercase tracking-widest mb-1 group-hover:text-yellow-500/70">{label}</div>
        <div className="text-yellow-400 text-xl font-bold font-mono">{value}</div>
      </div>
      <div className="text-[10px] text-yellow-500 font-bold bg-yellow-500/10 px-2 py-1 rounded">
        {trend}
      </div>
    </button>
  );
}
