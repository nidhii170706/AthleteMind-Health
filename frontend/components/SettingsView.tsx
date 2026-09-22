"use client";

import React, { useState } from "react";

interface SettingsViewProps {
  activeSoundpack: string;
  activeShader: string;
  isMuted: boolean;
  isRestDay: boolean;
  energyCores: number;
  flexibilityTolerance?: number;
  onSelectFlexibilityTolerance?: (val: number) => void;
  onToggleMute: () => void;
  onToggleRestDay: () => void;
  onSelectSoundpack: (sp: "arcade_synth" | "heavy_mecha") => void;
  onSelectShader: (sh: "cyberpunk" | "molten_core" | "void_phantom") => void;
  onResetAllData: () => void;
  onBack: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  activeSoundpack,
  activeShader,
  isMuted,
  isRestDay,
  energyCores,
  flexibilityTolerance = 20,
  onSelectFlexibilityTolerance,
  onToggleMute,
  onToggleRestDay,
  onSelectSoundpack,
  onSelectShader,
  onResetAllData,
  onBack,
}) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  return (
    <div className="relative w-full h-full min-h-screen bg-[#050811] text-white flex flex-col font-mono select-none overflow-y-auto p-4 sm:p-6">
      {/* Top Navigation Header */}
      <header className="relative z-20 w-full max-w-5xl mx-auto flex items-center justify-between pb-6 border-b border-slate-800">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-300 transition-all cursor-pointer flex items-center gap-2 shadow-lg"
        >
          <span>←</span>
          <span>BACK TO MENU</span>
        </button>

        <div className="flex items-center gap-2.5">
          <span className="text-2xl">⚙️</span>
          <div className="flex flex-col text-left sm:text-right">
            <h1 className="text-base sm:text-xl font-black text-slate-200 uppercase tracking-widest">
              SYSTEM SETTINGS & PREFERENCES
            </h1>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">
              AUDIO, SHADERS, REST CONTROLS & STORAGE
            </span>
          </div>
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-400">
          V2.5 ENGINE
        </div>
      </header>

      {/* Main Settings Form */}
      <main className="relative z-10 w-full max-w-5xl mx-auto flex flex-col gap-6 mt-8 mb-8">
        {/* Section 1: Audio Synthesizer Soundpack */}
        <div className="p-6 rounded-3xl bg-slate-950/80 border border-slate-800 backdrop-blur-md shadow-xl flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider">
                AUDIO SYNTHESIS PROFILE
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time procedural Web Audio API tones synthesized during movement and parries.
              </p>
            </div>
            <button
              onClick={onToggleMute}
              className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                isMuted
                  ? "bg-rose-950/80 border-rose-500 text-rose-300"
                  : "bg-emerald-950/80 border-emerald-500 text-emerald-300"
              }`}
            >
              {isMuted ? "🔇 AUDIO MUTED" : "🔊 AUDIO ACTIVE"}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => onSelectSoundpack("arcade_synth")}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-2 ${
                activeSoundpack === "arcade_synth"
                  ? "bg-cyan-950/60 border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.3)]"
                  : "bg-black/50 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-white">ARCADE SYNTH</span>
                {activeSoundpack === "arcade_synth" && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500 text-black font-black">
                    EQUIPPED
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Standard crisp square and sawtooth synth tones. High-frequency pitch shifts corresponding to eccentric depth.
              </p>
            </button>

            <button
              onClick={() => onSelectSoundpack("heavy_mecha")}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-2 ${
                activeSoundpack === "heavy_mecha"
                  ? "bg-amber-950/60 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                  : "bg-black/50 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-white">HEAVY MECHA</span>
                {activeSoundpack === "heavy_mecha" && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500 text-black font-black">
                    EQUIPPED
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Low-frequency 45Hz sub-bass impacts, industrial hydraulic hums, and metallic parry deflection clangs.
              </p>
            </button>
          </div>
        </div>

        {/* Section 2: Skeletal Shader Cosmetic Loadout */}
        <div className="p-6 rounded-3xl bg-slate-950/80 border border-slate-800 backdrop-blur-md shadow-xl flex flex-col gap-4">
          <div>
            <h2 className="text-base font-black text-white uppercase tracking-wider">
              SKELETAL SHADER PREFERENCES
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Visual biomechanical skeleton palette rendered directly over the live camera feed.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Cyberpunk */}
            <button
              onClick={() => onSelectShader("cyberpunk")}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-2 ${
                activeShader === "cyberpunk"
                  ? "bg-cyan-950/60 border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.3)]"
                  : "bg-black/50 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-white">CYBERPUNK</span>
                {activeShader === "cyberpunk" && (
                  <span className="text-[9px] px-2 py-0.5 rounded bg-cyan-500 text-black font-black">
                    ACTIVE
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-cyan-400" />
                <span className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="text-xs text-slate-400">Cyan / Emerald</span>
              </div>
            </button>

            {/* Molten Core */}
            <button
              onClick={() => onSelectShader("molten_core")}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-2 ${
                activeShader === "molten_core"
                  ? "bg-amber-950/60 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                  : "bg-black/50 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-white">MOLTEN CORE</span>
                {activeShader === "molten_core" && (
                  <span className="text-[9px] px-2 py-0.5 rounded bg-amber-500 text-black font-black">
                    ACTIVE
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="w-3 h-3 rounded-full bg-rose-500" />
                <span className="text-xs text-slate-400">Amber / Fiery Red</span>
              </div>
            </button>

            {/* Void Phantom */}
            <button
              onClick={() => onSelectShader("void_phantom")}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-2 ${
                activeShader === "void_phantom"
                  ? "bg-purple-950/60 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                  : "bg-black/50 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-white">VOID PHANTOM</span>
                {activeShader === "void_phantom" && (
                  <span className="text-[9px] px-2 py-0.5 rounded bg-purple-500 text-white font-black">
                    ACTIVE
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="w-3 h-3 rounded-full bg-fuchsia-400" />
                <span className="text-xs text-slate-400">Deep Violet / Fuchsia</span>
              </div>
            </button>
          </div>
        </div>

        {/* Section 3: Clinical Rest-Day Mode */}
        <div className="p-6 rounded-3xl bg-slate-950/80 border border-slate-800 backdrop-blur-md shadow-xl flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span>🌿</span>
              <span>CLINICAL REST DAY SERENITY</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 max-w-xl">
              When enabled, incoming boss projectile damage is locked to zero and streak decay is paused, allowing safe mobility recovery without penalty.
            </p>
          </div>

          <button
            onClick={onToggleRestDay}
            className={`px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              isRestDay
                ? "bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.5)]"
                : "bg-slate-900 border border-slate-700 text-slate-400 hover:text-white"
            }`}
          >
            <span>{isRestDay ? "🌿 ACTIVE" : "OFF"}</span>
          </button>
        </div>

        {/* Section: Biomechanical Flexibility Range Tolerance */}
        {onSelectFlexibilityTolerance && (
          <div className="p-6 rounded-3xl bg-slate-950/80 border border-slate-800 backdrop-blur-md shadow-xl flex flex-col gap-4">
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span>🎯</span>
                <span>BIOMECHANICAL FLEXIBILITY RANGE TOLERANCE</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 max-w-xl">
                Adjusts target joint ROM thresholds to match your personal mobility. Higher tolerance allows shallower flexion for rehabilitation.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { pct: 10, label: "STRICT (10%)", desc: "90° Deep Parallel Depth" },
                { pct: 20, label: "STANDARD (20%)", desc: "~105° Functional Depth" },
                { pct: 30, label: "REHAB (30%)", desc: "~118° Mobility Leniency" },
                { pct: 40, label: "ASSISTED (40%)", desc: "~128° Gentle Recovery" },
              ].map(({ pct, label, desc }) => (
                <button
                  key={pct}
                  onClick={() => onSelectFlexibilityTolerance(pct)}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                    flexibilityTolerance === pct
                      ? "bg-cyan-950/70 border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.3)]"
                      : "bg-black/50 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-white">{label}</span>
                    {flexibilityTolerance === pct && (
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">{desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Section 4: Data Management & Reset */}
        <div className="p-6 rounded-3xl bg-rose-950/20 border border-rose-500/30 backdrop-blur-md shadow-xl flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-rose-300 uppercase tracking-wider flex items-center gap-2">
              <span>⚠️</span>
              <span>RESET PERSISTENT CLIENT DATA</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Purges local telemetry logs, baseline sessions, achievements, and unlock history from browser storage.
            </p>
          </div>

          <button
            onClick={() => setShowResetConfirm(true)}
            className="px-4 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/60 text-rose-300 hover:text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
          >
            PURGE DATA
          </button>
        </div>
      </main>

      {/* Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-3xl bg-slate-950 border-2 border-rose-500 flex flex-col gap-4 text-center shadow-2xl">
            <span className="text-4xl">⚠️</span>
            <h3 className="text-lg font-black text-white uppercase tracking-wider">
              CONFIRM DATA PURGE
            </h3>
            <p className="text-xs text-slate-300 font-mono leading-relaxed">
              This will erase your personal baseline ROM milestones, streak, and local achievement progress. This action cannot be undone.
            </p>
            <div className="flex items-center justify-center gap-3 mt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  onResetAllData();
                  setShowResetConfirm(false);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase shadow-[0_0_20px_rgba(244,63,94,0.6)]"
              >
                CONFIRM PURGE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
