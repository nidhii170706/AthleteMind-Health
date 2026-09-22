"use client";

import React, { useState } from "react";
import {
  EXERCISE_LIST,
  ExerciseConfig,
  ExerciseRegion,
} from "@/lib/exercises";

interface ExerciseSelectorModalProps {
  isOpen: boolean;
  activeExerciseId: string;
  onSelectExercise: (exerciseId: string) => void;
  onClose: () => void;
}

const REGION_FILTERS: { label: string; value: "ALL" | ExerciseRegion }[] = [
  { label: "ALL REGIONS (10)", value: "ALL" },
  { label: "🦵 LOWER BODY (5)", value: "LOWER_BODY" },
  { label: "💪 UPPER BODY (3)", value: "UPPER_BODY" },
  { label: "🔄 SPINE & CORE (1)", value: "SPINE" },
  { label: "⚖️ PROPRIOCEPTION (1)", value: "BALANCE" },
];

export const ExerciseSelectorModal: React.FC<ExerciseSelectorModalProps> = ({
  isOpen,
  activeExerciseId,
  onSelectExercise,
  onClose,
}) => {
  const [selectedRegion, setSelectedRegion] = useState<"ALL" | ExerciseRegion>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  const filteredExercises = EXERCISE_LIST.filter((ex) => {
    const matchesRegion = selectedRegion === "ALL" || ex.targetRegion === selectedRegion;
    const matchesSearch =
      ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.clinicalFocus.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRegion && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-[#070b16] border-2 border-cyan-500/50 rounded-3xl p-6 sm:p-8 shadow-[0_0_80px_rgba(0,240,255,0.3)] flex flex-col gap-6 overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-5 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-400/60 flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(6,182,212,0.4)]">
              🎯
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-cyan-300 font-mono">
                  10-Exercise Clinical Rehabilitation Suite
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase bg-cyan-950 border border-cyan-500/60 text-cyan-300">
                  ACTIVE: {activeExerciseId.toUpperCase().replace("_", " ")}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5 uppercase tracking-widest">
                Prescribe Targeted Kinematic Deflection Protocols for Today&apos;s Gauntlet
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-white font-mono font-bold flex items-center justify-center cursor-pointer transition-all self-end sm:self-center"
            title="Close Suite Selector"
          >
            ✕
          </button>
        </div>

        {/* Region Tabs & Search Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Region Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-slate-950/80 border border-slate-800">
            {REGION_FILTERS.map((filter) => {
              const active = selectedRegion === filter.value;
              return (
                <button
                  key={filter.value}
                  onClick={() => setSelectedRegion(filter.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
                    active
                      ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,240,255,0.6)]"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="FILTER EXERCISES..."
              className="w-full px-3.5 py-2 pl-9 rounded-xl bg-slate-950/90 border border-slate-800 focus:border-cyan-400 text-xs font-mono text-cyan-300 placeholder:text-slate-500 uppercase tracking-wider focus:outline-none"
            />
            <span className="absolute left-3 top-2.5 text-xs text-slate-500">🔍</span>
          </div>
        </div>

        {/* Grid of Movement Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-1 max-h-[58vh]">
          {filteredExercises.map((ex: ExerciseConfig) => {
            const isSelected = ex.id === activeExerciseId;
            return (
              <div
                key={ex.id}
                className={`relative p-5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                  isSelected
                    ? "bg-gradient-to-br from-cyan-950/90 via-slate-950/95 to-[#0b1b2d] border-2 border-cyan-400 shadow-[0_0_30px_rgba(0,240,255,0.35)]"
                    : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950/90"
                }`}
              >
                {/* Active Indicator Top Tag */}
                {isSelected && (
                  <div className="absolute -top-3 right-5 px-3 py-0.5 rounded-full bg-cyan-400 text-black font-mono font-black text-[9px] uppercase tracking-widest shadow-[0_0_12px_rgba(0,240,255,0.8)]">
                    ● ACTIVE PRESCRIBED PROTOCOL
                  </div>
                )}

                {/* Card Title & Icon */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl p-2 rounded-xl bg-black/50 border border-slate-800">{ex.icon}</span>
                    <div>
                      <h3 className="text-base font-black uppercase text-white tracking-wide font-mono">
                        {ex.name}
                      </h3>
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider mt-1 ${
                          ex.targetRegion === "LOWER_BODY"
                            ? "bg-blue-950 text-blue-300 border border-blue-500/40"
                            : ex.targetRegion === "UPPER_BODY"
                            ? "bg-purple-950 text-purple-300 border border-purple-500/40"
                            : ex.targetRegion === "SPINE"
                            ? "bg-amber-950 text-amber-300 border border-amber-500/40"
                            : "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                        }`}
                      >
                        {ex.targetRegion.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end text-right">
                    <span className="text-[10px] text-slate-400 font-mono">DEFLECT HOLD</span>
                    <span className="text-xs font-mono font-black text-amber-300">
                      ⏱ {ex.deflectionHoldTime.toFixed(1)}s
                    </span>
                  </div>
                </div>

                {/* Instructions & Clinical Focus */}
                <div className="space-y-1.5 text-xs font-mono">
                  <p className="text-slate-300 leading-relaxed text-[11px]">{ex.instructions}</p>
                  <div className="p-2.5 rounded-xl bg-black/40 border border-slate-800/80 flex flex-col gap-1">
                    <div className="text-[10px] text-teal-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <span>🩺 CLINICAL FOCUS:</span>
                      <span className="text-slate-300 font-normal">{ex.clinicalFocus}</span>
                    </div>
                    <div className="text-[10px] text-rose-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <span>⚠️ CLINICAL GUARD:</span>
                      <span className="text-slate-400 font-normal">{ex.faultPrompt}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action */}
                <button
                  onClick={() => {
                    onSelectExercise(ex.id);
                    onClose();
                  }}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-mono font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    isSelected
                      ? "bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_20px_rgba(0,240,255,0.6)]"
                      : "bg-slate-900 hover:bg-cyan-950 border border-slate-700 hover:border-cyan-400 text-slate-200 hover:text-cyan-300"
                  }`}
                >
                  <span>{isSelected ? "✓ CURRENTLY PRESCRIBED" : "PRESCRIBE THIS MOVEMENT"}</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 text-[11px] font-mono text-slate-400">
          <span>All 10 movements hook into the continuous 3D camera loop & kinetic parry system.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold uppercase cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
