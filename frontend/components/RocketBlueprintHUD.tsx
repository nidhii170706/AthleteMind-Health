"use client";

import React from "react";

interface RocketBlueprintHUDProps {
  playerHp: number;
  playerMaxHp?: number;
  isShieldActive: boolean;
  shieldHoldProgress?: number;
  isBreached?: boolean;
  isExploding?: boolean;
  repCycleStatus?: "STAND_READY" | "HOLDING" | "STAND_UP_TO_RECHARGE";
  className?: string;
}

export const RocketBlueprintHUD: React.FC<RocketBlueprintHUDProps> = ({
  playerHp,
  playerMaxHp = 100,
  isShieldActive,
  shieldHoldProgress = 0,
  isBreached = false,
  isExploding = false,
  repCycleStatus = "STAND_READY",
  className = "",
}) => {
  const hpPct = Math.max(0, Math.min(100, Math.round((playerHp / playerMaxHp) * 100)));

  // Determine damage severity per anatomical zone
  const isThrusterDamaged = hpPct < 85 || isBreached || isExploding;
  const isCoreDamaged = hpPct < 60 || (isBreached && hpPct < 80) || isExploding;
  const isCockpitDamaged = hpPct < 30 || (isBreached && hpPct < 50) || isExploding;

  const getSystemStatus = () => {
    if (isExploding || hpPct <= 0) return { text: "VESSEL DESTROYED", color: "text-rose-500 font-black animate-ping", bg: "bg-rose-600" };
    if (isBreached) return { text: "IMPACT // BREACHED", color: "text-rose-400", bg: "bg-rose-500" };
    if (repCycleStatus === "STAND_UP_TO_RECHARGE") return { text: "DISCHARGED // STAND UP", color: "text-amber-400 font-black animate-pulse", bg: "bg-amber-400" };
    if (hpPct <= 25) return { text: "CRITICAL INTEGRITY", color: "text-rose-400 animate-pulse", bg: "bg-rose-500" };
    if (isShieldActive) return { text: "SHIELD ONLINE", color: "text-cyan-300 animate-pulse", bg: "bg-cyan-400" };
    if (hpPct <= 60) return { text: "MODERATE DAMAGE", color: "text-amber-400", bg: "bg-amber-500" };
    return { text: "READY // SQUAT TO ENGAGE", color: "text-slate-400", bg: "bg-cyan-500" };
  };

  const status = getSystemStatus();

  return (
    <div
      className={`relative flex flex-col items-center bg-slate-950/85 backdrop-blur-md border border-cyan-500/40 rounded-2xl p-3 shadow-[0_0_25px_rgba(0,240,255,0.15)] font-mono select-none ${className}`}
    >
      {/* Top Header Bar */}
      <div className="w-full flex items-center justify-between pb-2 border-b border-slate-800/80 mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${status.bg} ${isBreached || isShieldActive || isExploding ? "animate-ping" : ""}`} />
          <span className="text-[10px] font-black text-cyan-300 uppercase tracking-widest">
            EXPLORER SCHEMATIC
          </span>
        </div>
        <span className={`text-[9px] font-black tracking-wider uppercase ${status.color}`}>
          {status.text}
        </span>
      </div>

      {/* Blueprint Visualizer Container */}
      <div className="relative w-36 sm:w-40 h-64 sm:h-72 flex items-center justify-center overflow-hidden my-1">
        {/* Dynamic Kinetic Shield Forcefield Envelope */}
        {isShieldActive && !isExploding && (
          <div className="absolute inset-x-2 inset-y-1 rounded-full border-2 border-cyan-400/90 bg-cyan-500/15 shadow-[0_0_30px_rgba(0,240,255,0.85)] z-20 pointer-events-none animate-pulse flex items-center justify-center">
            {/* Hexagonal / Radial Forcefield Grid Rings */}
            <div className="absolute inset-0 rounded-full border border-cyan-300/40 scale-95" />
            <div className="absolute inset-0 rounded-full border border-cyan-200/20 scale-90" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[9px] font-black text-cyan-200 tracking-widest uppercase bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-400/60 shadow-lg">
              AEGIS SHIELD
            </div>
          </div>
        )}

        {/* Breach Alert Flashing Glitch Ring */}
        {isBreached && !isExploding && (
          <div className="absolute inset-0 border-2 border-rose-500 bg-rose-600/25 rounded-2xl z-25 pointer-events-none animate-ping" />
        )}

        {/* Exploding Vessel Fireball & Debris Overlay */}
        {isExploding && (
          <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
            <div className="absolute inset-0 bg-radial from-yellow-300 via-rose-600 to-transparent animate-ping opacity-75" />
            <div className="relative text-3xl animate-bounce">💥</div>
          </div>
        )}

        {/* Base Blueprint Image */}
        <img
          src="/blueprint.png"
          alt="Rocket Blueprint Schematic"
          className={`w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(0,240,255,0.4)] transition-all duration-300 ${
            isExploding ? "brightness-50 contrast-200 blur-[1px] rotate-3 scale-95" : isBreached ? "brightness-150 contrast-125" : ""
          }`}
        />

        {/* ----------------------------------------------------------------- */}
        {/* DAMAGE OVERLAY MASKS (SECTOR-SPECIFIC RED GLOW)                   */}
        {/* ----------------------------------------------------------------- */}

        {/* 1. Cockpit & Avionics Bay (Top 28%) */}
        {isCockpitDamaged && (
          <div
            className="absolute top-[3%] left-[20%] right-[20%] h-[26%] bg-gradient-to-b from-rose-600/70 to-rose-500/50 mix-blend-screen rounded-t-full pointer-events-none z-10 animate-pulse"
            style={{ filter: "drop-shadow(0 0 10px rgba(244,63,94,0.9))" }}
          >
            <span className="absolute -right-8 top-2 text-[8px] font-black text-rose-300 uppercase bg-black/80 px-1 rounded border border-rose-500/60">
              AVIONICS
            </span>
          </div>
        )}

        {/* 2. Core Fusion Reactor & Mid-Hull (Middle 42%) */}
        {isCoreDamaged && (
          <div
            className="absolute top-[30%] left-[16%] right-[16%] h-[40%] bg-gradient-to-b from-rose-600/60 via-rose-500/70 to-rose-600/60 mix-blend-screen pointer-events-none z-10 animate-pulse"
            style={{ filter: "drop-shadow(0 0 12px rgba(244,63,94,0.9))" }}
          >
            <span className="absolute -left-6 top-1/2 -translate-y-1/2 text-[8px] font-black text-rose-300 uppercase bg-black/80 px-1 rounded border border-rose-500/60">
              CORE
            </span>
          </div>
        )}

        {/* 3. Ion Propulsion & Thruster Bay (Bottom 30%) */}
        {isThrusterDamaged && (
          <div
            className="absolute bottom-[3%] left-[18%] right-[18%] h-[28%] bg-gradient-to-t from-rose-600/80 to-rose-500/40 mix-blend-screen rounded-b-2xl pointer-events-none z-10 animate-pulse"
            style={{ filter: "drop-shadow(0 0 10px rgba(244,63,94,0.9))" }}
          >
            <span className="absolute -right-8 bottom-3 text-[8px] font-black text-rose-300 uppercase bg-black/80 px-1 rounded border border-rose-500/60">
              THRUST
            </span>
          </div>
        )}
      </div>

      {/* Hull Integrity & Shield Capacity Gauges */}
      <div className="w-full flex flex-col gap-1.5 mt-2 pt-2 border-t border-slate-800/80">
        {/* SHIP INTEGRITY */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center justify-between text-[9px] font-bold">
            <span className="text-slate-400">SHIP INTEGRITY</span>
            <span
              className={
                hpPct > 60 ? "text-cyan-400" : hpPct > 25 ? "text-amber-400" : "text-rose-400 animate-pulse font-black"
              }
            >
              {hpPct}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-700">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                hpPct > 60
                  ? "bg-gradient-to-r from-cyan-500 to-emerald-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]"
                  : hpPct > 25
                  ? "bg-gradient-to-r from-amber-500 to-orange-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
                  : "bg-gradient-to-r from-red-600 to-rose-500 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.9)]"
              }`}
              style={{ width: `${hpPct}%` }}
            />
          </div>
        </div>

        {/* AEGIS SHIELD POWER */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center justify-between text-[9px] font-bold">
            <span className="text-slate-400">AEGIS CAPACITOR</span>
            <span className={isShieldActive ? "text-cyan-300 font-black" : repCycleStatus === "STAND_UP_TO_RECHARGE" ? "text-amber-400 font-bold" : "text-slate-500"}>
              {isShieldActive ? "ONLINE (100%)" : repCycleStatus === "STAND_UP_TO_RECHARGE" ? "DISCHARGED" : "OFFLINE (0%)"}
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-700">
            <div
              className={`h-full rounded-full transition-all duration-150 ${
                isShieldActive
                  ? "bg-gradient-to-r from-cyan-400 to-blue-400 shadow-[0_0_10px_rgba(0,240,255,0.8)]"
                  : repCycleStatus === "STAND_UP_TO_RECHARGE"
                  ? "bg-amber-600/40 animate-pulse"
                  : "bg-slate-800"
              }`}
              style={{ width: isShieldActive ? "100%" : repCycleStatus === "STAND_UP_TO_RECHARGE" ? "15%" : "0%" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
