"use client";

import React from "react";

interface FuturisticCockpitFrameProps {
  currentAngle: number;
  targetAngle?: number;
  formPurity: number;
  holdProgress: number;
  exerciseName: string;
  torsoTilt?: number;
  isShieldActive?: boolean;
  repCycleStatus?: "STAND_READY" | "HOLDING" | "STAND_UP_TO_RECHARGE";
  flexibilityTolerance?: number; // 10, 20, 30, 40
  onFlexibilityChange?: (val: number) => void;
  children: React.ReactNode;
  leftPanel?: React.ReactNode;
  rightPanel?: React.ReactNode;
  className?: string;
}

export const FuturisticCockpitFrame: React.FC<FuturisticCockpitFrameProps> = ({
  currentAngle,
  targetAngle = 90,
  formPurity,
  holdProgress,
  exerciseName,
  torsoTilt = 0,
  isShieldActive = false,
  repCycleStatus = "STAND_READY",
  flexibilityTolerance = 20,
  onFlexibilityChange,
  children,
  leftPanel,
  rightPanel,
  className = "",
}) => {
  // Angle needle rotation (0 to 180 deg mapped to -120deg to +120deg)
  const clampedAngle = Math.max(0, Math.min(180, currentAngle || 0));
  const purityPct = Math.max(0, Math.min(100, formPurity || 0));

  return (
    <div
      className={`relative w-full h-full flex flex-col rounded-3xl overflow-hidden border-2 border-cyan-500/50 bg-[#030712] shadow-[0_0_60px_rgba(0,240,255,0.18)] font-mono select-none ${className}`}
    >
      {/* ------------------------------------------------------------------- */}
      {/* 1. TOP COCKPIT COMMAND BAR & ARTIFICIAL HORIZON GYRO                */}
      {/* ------------------------------------------------------------------- */}
      <div className="relative z-30 w-full bg-slate-950/90 border-b border-cyan-500/40 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between text-xs backdrop-blur-md gap-2">
        {/* Left Sensor Status */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-950/70 border border-cyan-500/50 text-[10px] text-cyan-300 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            <span>SENSOR // 60 FPS</span>
          </div>

          {/* Difficulty / Flexibility Range Tolerance Selector */}
          {onFlexibilityChange && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-900/90 border border-cyan-500/30">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider hidden md:inline">
                FLEX:
              </span>
              {[10, 20, 30, 40].map((pct) => (
                <button
                  key={pct}
                  onClick={() => onFlexibilityChange(pct)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition-all cursor-pointer ${
                    flexibilityTolerance === pct
                      ? "bg-cyan-400 text-slate-950 font-black shadow-[0_0_8px_rgba(0,240,255,0.8)]"
                      : "bg-slate-800/80 text-slate-300 hover:text-cyan-300 hover:bg-slate-700"
                  }`}
                  title={`Set Mobility / Flexibility Range Tolerance to ${pct}% (Target: ~${Math.round(90 + (pct / 100) * 80)}°)`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Center: Artificial Horizon & Gyroscope Reticle */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="relative w-28 h-6 flex items-center justify-center overflow-hidden border border-slate-700/60 rounded bg-black/60 px-2">
            {/* Horizon pitch line tilting with user torso */}
            <div
              className="absolute w-20 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent transition-transform duration-100"
              style={{ transform: `rotate(${Math.max(-25, Math.min(25, torsoTilt))}deg)` }}
            />
            {/* Center crosshair */}
            <div className="absolute w-2 h-2 rounded-full border border-amber-400/80 pointer-events-none" />
            <span className="absolute bottom-0.5 text-[8px] text-slate-500 font-bold">
              HORIZON
            </span>
          </div>
        </div>

        {/* Right Tactical Telemetry & Shield Status */}
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-[10px] text-slate-300 hidden lg:inline">
            PROTOCOL: <span className="text-cyan-300 font-bold">{exerciseName.toUpperCase()}</span>
          </span>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900/80 border border-slate-700 text-[10px] text-slate-300">
            <span>AEGIS:</span>
            <span
              className={
                isShieldActive
                  ? "text-cyan-300 font-black animate-pulse"
                  : repCycleStatus === "STAND_UP_TO_RECHARGE"
                  ? "text-amber-400 font-black animate-pulse"
                  : "text-slate-500"
              }
            >
              {isShieldActive
                ? "SHIELD UP"
                : repCycleStatus === "STAND_UP_TO_RECHARGE"
                ? "STAND UP TO RECHARGE"
                : "OFFLINE"}
            </span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 2. MAIN CENTER COCKPIT DISPLAY WITH SIDE WINGS                      */}
      {/* ------------------------------------------------------------------- */}
      <div className="relative flex-1 w-full min-h-0 flex overflow-hidden">
        {/* Camera Canvas Viewport */}
        <div className="relative flex-1 w-full h-full flex items-center justify-center bg-black overflow-hidden">
          {children}

          {/* CRT Scanline & Phosphor Grid Texture Overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none z-20 opacity-35" />

          {/* Optical Corner Targeting Brackets */}
          <div className="absolute top-4 left-4 text-cyan-500/60 text-lg font-mono pointer-events-none z-20">┌</div>
          <div className="absolute top-4 right-4 text-cyan-500/60 text-lg font-mono pointer-events-none z-20">┐</div>
          <div className="absolute bottom-4 left-4 text-cyan-500/60 text-lg font-mono pointer-events-none z-20">└</div>
          <div className="absolute bottom-4 right-4 text-cyan-500/60 text-lg font-mono pointer-events-none z-20">┘</div>

          {/* Left Wing Dock (Rocket Blueprint HUD & Core Rep Metrics) */}
          {leftPanel && (
            <div className="absolute top-4 left-4 z-25 flex flex-col gap-3 pointer-events-auto">
              {leftPanel}
            </div>
          )}

          {/* Right Wing Dock (Deflections, Boss HP, & Strike alerts) */}
          {rightPanel && (
            <div className="absolute top-4 right-4 z-25 flex flex-col gap-3 text-right items-end pointer-events-auto">
              {rightPanel}
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 3. BOTTOM FLIGHT INSTRUMENT PANEL: RADIAL DIALS & TENSION BARS      */}
      {/* ------------------------------------------------------------------- */}
      <div className="relative z-30 w-full bg-slate-950/95 border-t border-cyan-500/40 px-4 py-2.5 flex flex-wrap items-center justify-between gap-4 backdrop-blur-md">
        {/* DIAL 1: Joint Flexion & Angle Dial */}
        <div className="flex items-center gap-3">
          <div className="relative w-14 h-14 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 80 80">
              {/* Outer gauge dial ring */}
              <circle
                cx="40"
                cy="40"
                r="34"
                stroke="currentColor"
                strokeWidth="4"
                className="text-slate-800"
                fill="none"
              />
              {/* Target zone arc */}
              <circle
                cx="40"
                cy="40"
                r="34"
                stroke="#00f0ff"
                strokeWidth="5"
                strokeDasharray="213"
                strokeDashoffset="140"
                fill="none"
                className="opacity-40"
              />
              {/* Live sweep arc */}
              <circle
                cx="40"
                cy="40"
                r="34"
                stroke={clampedAngle <= targetAngle ? "#10b981" : "#00f0ff"}
                strokeWidth="5"
                strokeDasharray="213"
                strokeDashoffset={213 - (clampedAngle / 180) * 160}
                strokeLinecap="round"
                fill="none"
                className="transition-all duration-75"
              />
            </svg>
            {/* Live Angle Number */}
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-xs font-black text-cyan-300 font-mono leading-none">
                {Math.round(clampedAngle)}°
              </span>
            </div>
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              JOINT FLEXION
            </span>
            <span className="text-xs font-black text-cyan-300 font-mono">
              TARGET: {Math.round(targetAngle)}°
            </span>
          </div>
        </div>

        {/* GAUGE 2: Segmented LED Warp Tension / Hold Progress Bar */}
        <div className="flex flex-col items-center flex-1 max-w-xs mx-auto">
          <div className="w-full flex items-center justify-between text-[10px] font-bold mb-1">
            <span className="text-slate-400 uppercase tracking-widest">
              {repCycleStatus === "STAND_UP_TO_RECHARGE" ? "CAPACITOR RECHARGE" : "KINETIC TENSION"}
            </span>
            <span
              className={
                repCycleStatus === "STAND_UP_TO_RECHARGE"
                  ? "text-amber-400 font-black animate-pulse"
                  : isShieldActive
                  ? "text-cyan-300 font-black"
                  : "text-slate-400"
              }
            >
              {repCycleStatus === "STAND_UP_TO_RECHARGE"
                ? "STAND UP!"
                : isShieldActive
                ? "SHIELD UP"
                : `${Math.round(holdProgress * 100)}%`}
            </span>
          </div>
          <div className="w-full flex gap-1 h-3 bg-slate-900 rounded p-0.5 border border-slate-800">
            {[...Array(10)].map((_, i) => {
              const active = isShieldActive || holdProgress >= (i + 1) * 0.1;
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-sm transition-all duration-100 ${
                    active
                      ? i >= 8
                        ? "bg-cyan-400 shadow-[0_0_8px_rgba(0,240,255,0.9)]"
                        : "bg-cyan-500 shadow-[0_0_5px_rgba(6,182,212,0.6)]"
                      : repCycleStatus === "STAND_UP_TO_RECHARGE"
                      ? "bg-amber-600/30"
                      : "bg-slate-800/80"
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* DIAL 3: Form Purity Tachometer */}
        <div className="flex items-center gap-3">
          <div className="relative w-14 h-14 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r="34"
                stroke="currentColor"
                strokeWidth="4"
                className="text-slate-800"
                fill="none"
              />
              <circle
                cx="40"
                cy="40"
                r="34"
                stroke={purityPct >= 80 ? "#10b981" : purityPct >= 60 ? "#f59e0b" : "#ef4444"}
                strokeWidth="5"
                strokeDasharray="213"
                strokeDashoffset={213 - (purityPct / 100) * 160}
                strokeLinecap="round"
                fill="none"
                className="transition-all duration-200"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-xs font-black text-emerald-400 font-mono leading-none">
                {purityPct}%
              </span>
            </div>
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              FORM PURITY
            </span>
            <span className="text-xs font-black text-emerald-300 font-mono">
              {purityPct >= 80 ? "OPTIMAL" : purityPct >= 60 ? "STABLE" : "FAULT"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
