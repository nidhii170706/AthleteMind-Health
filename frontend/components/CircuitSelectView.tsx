"use client";

import React from "react";

export type CircuitMode = "HYPER_TENSION" | "FULL_BODY" | "REHAB_STABILITY";

interface CircuitSelectViewProps {
  onSelectMode: (mode: CircuitMode) => void;
  onBack: () => void;
}

export const CircuitSelectView: React.FC<CircuitSelectViewProps> = ({
  onSelectMode,
  onBack,
}) => {
  return (
    <div className="relative w-full h-full min-h-screen bg-[#050811] text-white flex flex-col font-mono select-none overflow-y-auto p-4 sm:p-6">
      {/* Top Navigation Header */}
      <header className="relative z-20 w-full max-w-6xl mx-auto flex items-center justify-between pb-6 border-b border-slate-800">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-slate-900/90 hover:bg-amber-500/20 border border-slate-700 hover:border-amber-400 text-xs font-bold text-amber-300 transition-all cursor-pointer flex items-center gap-2 shadow-lg"
        >
          <span>←</span>
          <span>BACK TO MENU</span>
        </button>

        <div className="flex items-center gap-2.5">
          <span className="text-2xl">⚡</span>
          <div className="flex flex-col text-left sm:text-right">
            <h1 className="text-base sm:text-xl font-black text-amber-300 uppercase tracking-widest">
              CIRCUIT TRAINING PROTOCOLS
            </h1>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">
              SELECT FUNCTIONAL ATHLETIC GAUNTLET
            </span>
          </div>
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-amber-950/80 border border-amber-500/50 text-xs font-bold text-amber-300">
          3 PROTOCOLS READY
        </div>
      </header>

      {/* Main Content Grid: 3 Distinct Functional Protocols */}
      <main className="relative z-10 w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8 mb-8">
        {/* Mode A: Hyper-Tension Protocol */}
        <div className="relative p-7 rounded-3xl bg-gradient-to-b from-amber-950/40 via-slate-950/90 to-[#0c0905]/95 border-2 border-amber-500/60 hover:border-amber-400 transition-all duration-300 shadow-2xl hover:shadow-[0_0_45px_rgba(245,158,11,0.35)] flex flex-col justify-between overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-4xl">🔥</span>
            <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-black text-[10px] font-black uppercase tracking-wider shadow-[0_0_12px_rgba(245,158,11,0.6)]">
              ECCENTRIC HYPERTROPHY
            </span>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white group-hover:text-amber-300 uppercase tracking-wider mb-2 transition-colors">
              HYPER-TENSION PROTOCOL
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Heavy focus on deep squat mechanics: strict 2.5s eccentric descent paired with a mandatory 2.0s bottom isometric pause hold. Maximize time-under-tension and recruit high-threshold motor units.
            </p>

            {/* Protocol Specs */}
            <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-black/60 border border-amber-500/30 text-xs text-slate-300 font-mono mb-4">
              <div className="flex justify-between">
                <span>Descent Tempo:</span>
                <span className="text-amber-300 font-bold">2.5s Controlled</span>
              </div>
              <div className="flex justify-between">
                <span>Bottom Pause:</span>
                <span className="text-amber-300 font-bold">2.0s Strict Hold</span>
              </div>
              <div className="flex justify-between">
                <span>Damage Bonus:</span>
                <span className="text-emerald-400 font-bold">+50% CRIT (150 DMG)</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onSelectMode("HYPER_TENSION")}
            className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-widest cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.6)] transition-all flex items-center justify-center gap-2 transform group-hover:scale-[1.02]"
          >
            <span>⚡ ENGAGE HYPER-TENSION</span>
          </button>
        </div>

        {/* Mode B: Full Body Kinetic Circuit */}
        <div className="relative p-7 rounded-3xl bg-gradient-to-b from-cyan-950/40 via-slate-950/90 to-[#050b14]/95 border-2 border-cyan-500/60 hover:border-cyan-400 transition-all duration-300 shadow-2xl hover:shadow-[0_0_45px_rgba(6,182,212,0.35)] flex flex-col justify-between overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-4xl">⚔️</span>
            <span className="px-2.5 py-1 rounded-lg bg-cyan-500 text-black text-[10px] font-black uppercase tracking-wider shadow-[0_0_12px_rgba(6,182,212,0.6)]">
              MULTI-EXERCISE
            </span>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white group-hover:text-cyan-300 uppercase tracking-wider mb-2 transition-colors">
              FULL BODY KINETIC CIRCUIT
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Rapid multi-joint rotation combining lower-body deflections, overhead kinematic presses, and high-knee sprint holding for comprehensive conditioning.
            </p>

            {/* Protocol Specs */}
            <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-black/60 border border-cyan-500/30 text-xs text-slate-300 font-mono mb-4">
              <div className="flex items-center gap-2">
                <span className="text-cyan-400">1.</span>
                <span>5 Deflection Squats (90° Depth)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-cyan-400">2.</span>
                <span>5 Overhead Arm Presses (Full Extension)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-cyan-400">3.</span>
                <span>30s High-Knee Core Stance Hold</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onSelectMode("FULL_BODY")}
            className="w-full py-3.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-widest cursor-pointer shadow-[0_0_20px_rgba(0,240,255,0.6)] transition-all flex items-center justify-center gap-2 transform group-hover:scale-[1.02]"
          >
            <span>⚔️ ENGAGE FULL BODY</span>
          </button>
        </div>

        {/* Mode C: Rehab Stability Endurance */}
        <div className="relative p-7 rounded-3xl bg-gradient-to-b from-emerald-950/40 via-slate-950/90 to-[#04100c]/95 border-2 border-emerald-500/60 hover:border-emerald-400 transition-all duration-300 shadow-2xl hover:shadow-[0_0_45px_rgba(16,185,129,0.35)] flex flex-col justify-between overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-4xl">🌿</span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500 text-black text-[10px] font-black uppercase tracking-wider shadow-[0_0_12px_rgba(16,185,129,0.6)]">
              CLINICAL RESTORATION
            </span>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white group-hover:text-emerald-300 uppercase tracking-wider mb-2 transition-colors">
              REHAB STABILITY ENDURANCE
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Designed for gentle tendon restoration, ligament alignment, and zero speed pressure. Relaxed 100° depth margin with strict medial valgus protection and restorative aegis shield.
            </p>

            {/* Protocol Specs */}
            <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-black/60 border border-emerald-500/30 text-xs text-slate-300 font-mono mb-4">
              <div className="flex justify-between">
                <span>Depth Target:</span>
                <span className="text-emerald-300 font-bold">100° Safe Arc</span>
              </div>
              <div className="flex justify-between">
                <span>Speed Pressure:</span>
                <span className="text-emerald-300 font-bold">Zero (Self-Paced)</span>
              </div>
              <div className="flex justify-between">
                <span>Damage Mitigation:</span>
                <span className="text-cyan-400 font-bold">Restorative Shield (0 DMG)</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onSelectMode("REHAB_STABILITY")}
            className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-widest cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.6)] transition-all flex items-center justify-center gap-2 transform group-hover:scale-[1.02]"
          >
            <span>🌿 ENGAGE REHAB STABILITY</span>
          </button>
        </div>
      </main>
    </div>
  );
};
