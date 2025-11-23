"use client";

import { useState, useRef, useEffect } from 'react';
import { Trash2 } from 'lucide-react';

interface HoldToDeleteButtonProps {
  onDelete: () => void;
  label?: string;
  disabled?: boolean;
}

export function HoldToDeleteButton({ 
  onDelete, 
  label = 'Hold to Delete',
  disabled = false 
}: HoldToDeleteButtonProps) {
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const HOLD_DURATION = 2000; // 2 seconds
  const UPDATE_INTERVAL = 16; // ~60fps

  const startHold = () => {
    if (disabled) return;
    
    setIsHolding(true);
    setProgress(0);
    
    const startTime = Date.now();
    
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / HOLD_DURATION) * 100, 100);
      setProgress(newProgress);
      
      if (newProgress >= 100) {
        // Hold completed - trigger delete
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsHolding(false);
        setProgress(0);
        onDelete();
      }
    }, UPDATE_INTERVAL);
  };

  const stopHold = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsHolding(false);
    setProgress(0);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <button
      ref={buttonRef}
      onMouseDown={startHold}
      onMouseUp={stopHold}
      onMouseLeave={stopHold}
      onTouchStart={startHold}
      onTouchEnd={stopHold}
      disabled={disabled}
      className="relative w-full px-4 py-3 rounded-lg font-medium text-white overflow-hidden transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        background: isHolding
          ? `linear-gradient(90deg, #DC2626 ${progress}%, #EF4444 ${progress}%)`
          : '#EF4444',
        transform: isHolding ? 'scale(0.98)' : 'scale(1)',
      }}
    >
      {/* Progress fill */}
      {isHolding && (
        <div
          className="absolute inset-0 bg-red-700 transition-all duration-75 ease-linear"
          style={{
            width: `${progress}%`,
            transition: 'width 0.016s linear',
          }}
        />
      )}
      
      {/* Content */}
      <div className="relative z-10 flex items-center justify-center gap-2">
        <Trash2 className="w-4 h-4" />
        <span>{label}</span>
        {isHolding && (
          <span className="text-xs opacity-90">
            {Math.round(progress)}%
          </span>
        )}
      </div>
    </button>
  );
}

