/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store';

interface JoystickProps {
  onMove: (x: number, y: number) => void;
  className?: string;
  label?: string;
}

function Joystick({ onMove, className, label }: JoystickProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const origin = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    origin.current = { x: centerX, y: centerY };
    isDragging.current = true;
    containerRef.current.setPointerCapture(e.pointerId);
    
    // Process initial touch immediately
    handlePointerMove(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;

    const maxDist = 30; // Reduced from 40 for smaller joystick
    const dx = e.clientX - origin.current.x;
    const dy = e.clientY - origin.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    let x = dx;
    let y = dy;

    if (dist > maxDist) {
      const angle = Math.atan2(dy, dx);
      x = Math.cos(angle) * maxDist;
      y = Math.sin(angle) * maxDist;
    }

    setPosition({ x, y });
    
    // Normalize output -1 to 1
    // Invert Y because screen Y is down, but usually joystick up is -1 or 1 depending on convention.
    // In 3D: Forward is -Z.
    // Screen Up (negative Y) -> Forward (-Z).
    // Screen Down (positive Y) -> Backward (+Z).
    // So we can pass raw normalized values and handle mapping in Player.tsx.
    onMove(x / maxDist, y / maxDist);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    setPosition({ x: 0, y: 0 });
    onMove(0, 0);
    if (containerRef.current) {
      containerRef.current.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative w-24 h-24 bg-white/10 rounded-full flex items-center justify-center touch-none select-none backdrop-blur-sm ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ touchAction: 'none' }}
    >
      {/* Base */}
      <div className="absolute w-full h-full rounded-full border-2 border-white/20" />
      
      {/* Stick */}
      <div 
        className="absolute w-10 h-10 bg-yellow-500/50 rounded-full shadow-[0_0_20px_rgba(255,215,0,0.6)] border border-yellow-500/50"
        style={{ 
          transform: `translate(${position.x}px, ${position.y}px)`,
        }}
      />
      
      {label && (
        <div className="absolute -bottom-8 text-yellow-500/50 text-[10px] font-black uppercase tracking-[0.3em] pointer-events-none">
          {label}
        </div>
      )}
    </div>
  );
}

export function MobileControls() {
  const setMobileInput = useGameStore(state => state.setMobileInput);
  const [shooting, setShooting] = useState(false);
  const isDragging = useRef<{ left: boolean, right: boolean }>({ left: false, right: false });
  const startPos = useRef<{ left: { x: number, y: number }, right: { x: number, y: number } }>({ 
    left: { x: 0, y: 0 }, 
    right: { x: 0, y: 0 } 
  });

  useEffect(() => {
    setMobileInput({ shooting });
  }, [shooting, setMobileInput]);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Ignore if clicking on a button or existing joystick
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.joystick-base')) return;

    const isLeft = e.clientX < window.innerWidth / 2;
    if (isLeft) {
      isDragging.current.left = true;
      startPos.current.left = { x: e.clientX, y: e.clientY };
    } else {
      isDragging.current.right = true;
      startPos.current.right = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const maxDist = 50;
    if (isDragging.current.left) {
      const dx = e.clientX - startPos.current.left.x;
      const dy = e.clientY - startPos.current.left.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const x = Math.max(-1, Math.min(1, dx / maxDist));
      const y = Math.max(-1, Math.min(1, dy / maxDist));
      setMobileInput({ move: { x, y } });
    }
    if (isDragging.current.right) {
      const dx = e.clientX - startPos.current.right.x;
      const dy = e.clientY - startPos.current.right.y;
      const x = Math.max(-1, Math.min(1, dx / maxDist));
      const y = Math.max(-1, Math.min(1, dy / maxDist));
      setMobileInput({ look: { x, y } });
    }
  };

  const handlePointerUp = () => {
    if (isDragging.current.left) {
      isDragging.current.left = false;
      setMobileInput({ move: { x: 0, y: 0 } });
    }
    if (isDragging.current.right) {
      isDragging.current.right = false;
      setMobileInput({ look: { x: 0, y: 0 } });
    }
  };

  return (
    <div 
      className="absolute inset-0 z-50 select-none touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className="absolute inset-x-0 bottom-0 pb-12 px-8 flex justify-between items-end pointer-events-none">
        <div className="flex justify-between items-end w-full pointer-events-auto gap-4">
          {/* Left Stick - Move */}
          <Joystick 
            className="joystick-base"
            label="Move"
            onMove={(x, y) => setMobileInput({ move: { x, y } })} 
          />

          {/* Execute / Shoot Button */}
          <div className="flex flex-col items-center gap-4">
            <button
              className={`w-24 h-24 rounded-full border-4 border-yellow-500 flex items-center justify-center mb-2 active:scale-95 transition-all touch-none ${shooting ? 'bg-yellow-500/50 scale-95' : 'bg-yellow-500/20'}`}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                setShooting(true);
              }}
              onPointerUp={(e) => {
                e.currentTarget.releasePointerCapture(e.pointerId);
                setShooting(false);
              }}
              onPointerCancel={(e) => {
                e.currentTarget.releasePointerCapture(e.pointerId);
                setShooting(false);
              }}
              style={{ touchAction: 'none' }}
            >
              <div className="w-16 h-16 bg-yellow-500 rounded-full shadow-[0_0_30px_rgba(255,215,0,0.8)] flex items-center justify-center">
                <span className="text-black font-black text-xs uppercase tracking-tighter">Pulse</span>
              </div>
            </button>
          </div>

          {/* Right Stick - Look */}
          <Joystick 
            className="joystick-base"
            label="Look"
            onMove={(x, y) => setMobileInput({ look: { x, y } })} 
          />
        </div>
      </div>
      
      {/* Visual Hints for Mouse Drag */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-yellow-500/30 text-[10px] font-black uppercase tracking-[0.5em] pointer-events-none text-center">
        Drag Left: Move | Drag Right: Look
      </div>
    </div>
  );
}
