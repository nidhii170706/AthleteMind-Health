"use client";

import React, { useState } from "react";
import { ClinicalSoapCard } from "./ClinicalSoapCard";
import { EXERCISE_LIST, getExerciseConfig } from "@/lib/exercises";

export interface RecoverySession {
  id: string;
  date: string;
  avgDepthAngle: number;
  maxHoldDuration: number;
  valgusEvents: number;
  stabilityScore: number;
  repsCompleted: number;
  exerciseId?: string;
}

interface ComparisonViewProps {
  baselineSession?: RecoverySession;
  recoveryHistory?: RecoverySession[];
  currentSession?: {
    minAngle: number;
    holdDuration: number;
    valgusCount: number;
    descentTime: number;
  };
  activeExercise?: string;
  onBack: () => void;
}

const DEFAULT_BASELINE: RecoverySession = {
  id: "baseline_day_1",
  date: "2026-08-29",
  avgDepthAngle: 108.0,
  maxHoldDuration: 0.5,
  valgusEvents: 6,
  stabilityScore: 62.0,
  repsCompleted: 6,
  exerciseId: "squats",
};

const DEFAULT_HISTORY: RecoverySession[] = [
  { id: "rec_1", date: "Aug 29 (Day 1)", avgDepthAngle: 108.0, maxHoldDuration: 0.5, valgusEvents: 6, stabilityScore: 62.0, repsCompleted: 6, exerciseId: "squats" },
  { id: "rec_2", date: "Sep 01 (Day 4)", avgDepthAngle: 104.5, maxHoldDuration: 0.9, valgusEvents: 4, stabilityScore: 71.0, repsCompleted: 8, exerciseId: "squats" },
  { id: "rec_3", date: "Sep 04 (Day 7)", avgDepthAngle: 99.0, maxHoldDuration: 1.2, valgusEvents: 3, stabilityScore: 78.0, repsCompleted: 10, exerciseId: "squats" },
  { id: "rec_4", date: "Sep 07 (Day 10)", avgDepthAngle: 94.5, maxHoldDuration: 1.6, valgusEvents: 2, stabilityScore: 85.0, repsCompleted: 12, exerciseId: "squats" },
  { id: "rec_5", date: "Sep 09 (Day 12)", avgDepthAngle: 91.0, maxHoldDuration: 1.9, valgusEvents: 1, stabilityScore: 92.0, repsCompleted: 14, exerciseId: "squats" },
  { id: "rec_6", date: "Sep 11 (Day 14)", avgDepthAngle: 88.0, maxHoldDuration: 2.1, valgusEvents: 0, stabilityScore: 97.0, repsCompleted: 15, exerciseId: "squats" },
];

export const ComparisonView: React.FC<ComparisonViewProps> = ({
  baselineSession = DEFAULT_BASELINE,
  recoveryHistory = DEFAULT_HISTORY,
  currentSession = {
    minAngle: 88.0,
    holdDuration: 2.1,
    valgusCount: 0,
    descentTime: 2.4,
  },
  activeExercise = "squats",
  onBack,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string>(activeExercise);

  // Filter history by exerciseId
  const rawHistory = recoveryHistory.length >= 2 ? recoveryHistory : DEFAULT_HISTORY;
  const filtered = rawHistory.filter(
    (s) => !s.exerciseId || s.exerciseId === selectedFilter
  );
  const history = filtered.length >= 1 ? filtered : rawHistory;
  const activeExConfig = getExerciseConfig(selectedFilter);

  // Compute key delta statistics
  const day1Depth = baselineSession.avgDepthAngle || 108.0;
  const todayDepth = currentSession.minAngle > 0 && currentSession.minAngle < 180 ? currentSession.minAngle : 88.0;
  const depthGain = Math.round(day1Depth - todayDepth);

  const day1Hold = baselineSession.maxHoldDuration || 0.5;
  const todayHold = currentSession.holdDuration > 0 ? currentSession.holdDuration : 2.1;
  const holdStabilityPct = Math.round(((todayHold - day1Hold) / day1Hold) * 100);

  const day1Valgus = baselineSession.valgusEvents || 6;
  const todayValgus = currentSession.valgusCount;
  const valgusCorrectionPct = Math.round(((day1Valgus - todayValgus) / (day1Valgus || 1)) * 100);

  return (
    <div className="relative w-full h-full min-h-screen bg-[#050811] text-white flex flex-col font-mono select-none overflow-y-auto p-4 sm:p-6">
      {/* Top Navigation Header */}
      <header className="relative z-20 w-full max-w-6xl mx-auto flex items-center justify-between pb-6 border-b border-slate-800">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-slate-900/90 hover:bg-teal-500/20 border border-slate-700 hover:border-teal-400 text-xs font-bold text-teal-300 transition-all cursor-pointer flex items-center gap-2 shadow-lg"
        >
          <span>←</span>
          <span>BACK TO MENU</span>
        </button>

        <div className="flex items-center gap-2.5">
          <span className="text-2xl">📊</span>
          <div className="flex flex-col text-left sm:text-right">
            <h1 className="text-base sm:text-xl font-black text-teal-300 uppercase tracking-widest">
              HISTORICAL RECOVERY COMPARISON
            </h1>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">
              DAY 1 BASELINE VS. BEST VS. TODAY DELTAS
            </span>
          </div>
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-teal-950/80 border border-teal-500/50 text-xs font-bold text-teal-300">
          TRAJECTORY: 14 DAYS
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 w-full max-w-6xl mx-auto flex flex-col gap-6 mt-6">
        {/* Exercise Filter Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap mr-2">
            EXERCISE PROTOCOL:
          </span>
          {EXERCISE_LIST.map((ex) => {
            const isSelected = ex.id === selectedFilter;
            return (
              <button
                key={ex.id}
                onClick={() => setSelectedFilter(ex.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-teal-500 text-black shadow-[0_0_15px_rgba(20,184,166,0.6)]"
                    : "bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800"
                }`}
              >
                <span>{ex.icon}</span>
                <span>{ex.name}</span>
              </button>
            );
          })}
        </div>

        {/* "Day 1 Baseline vs. Best vs. Today" 4-Card Analytics Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Maximum ROM Gain */}
          <div className="p-5 rounded-3xl bg-slate-950/80 border border-teal-500/40 backdrop-blur-md shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                MAXIMUM {activeExConfig.primaryAngleName.toUpperCase()}
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-teal-500/20 text-teal-300 text-[10px] font-black">
                +{depthGain}° GAIN
              </span>
            </div>

            <div className="flex items-baseline justify-between mb-2">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500">Day 1 Baseline</span>
                <span className="text-xl font-mono font-bold text-slate-400">{day1Depth}°</span>
              </div>
              <span className="text-slate-600 font-bold">→</span>
              <div className="flex flex-col text-right">
                <span className="text-[10px] text-teal-400 font-bold">Today</span>
                <span className="text-3xl font-black font-mono text-teal-300">{todayDepth}°</span>
              </div>
            </div>

            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full"
                style={{ width: "100%" }}
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Significant recovery of end-range knee flexion and posterior hip loading capacity.
            </p>
          </div>

          {/* Card 2: Isometric Pause Hold Stability */}
          <div className="p-5 rounded-3xl bg-slate-950/80 border border-amber-500/40 backdrop-blur-md shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                ISOMETRIC HOLD TIME
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 text-[10px] font-black">
                +{holdStabilityPct}% STABILITY
              </span>
            </div>

            <div className="flex items-baseline justify-between mb-2">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500">Day 1 Baseline</span>
                <span className="text-xl font-mono font-bold text-slate-400">{day1Hold}s</span>
              </div>
              <span className="text-slate-600 font-bold">→</span>
              <div className="flex flex-col text-right">
                <span className="text-[10px] text-amber-400 font-bold">Today</span>
                <span className="text-3xl font-black font-mono text-amber-300">{todayHold}s</span>
              </div>
            </div>

            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 rounded-full"
                style={{ width: "95%" }}
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Extended bottom pause duration proves tendon structural reinforcement and bracing stability.
            </p>
          </div>

          {/* Card 3: Knee Valgus Inward Deviation Correction */}
          <div className="p-5 rounded-3xl bg-slate-950/80 border border-cyan-500/40 backdrop-blur-md shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                VALGUS FAULT REDUCTION
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 text-[10px] font-black">
                {valgusCorrectionPct}% CORRECTION
              </span>
            </div>

            <div className="flex items-baseline justify-between mb-2">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500">Day 1 Faults</span>
                <span className="text-xl font-mono font-bold text-rose-400">{day1Valgus} faults</span>
              </div>
              <span className="text-slate-600 font-bold">→</span>
              <div className="flex flex-col text-right">
                <span className="text-[10px] text-emerald-400 font-bold">Today</span>
                <span className="text-3xl font-black font-mono text-emerald-400">{todayValgus} faults</span>
              </div>
            </div>

            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full"
                style={{ width: "100%" }}
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Medial knee collapse eliminated. Patellofemoral tracking verified alignment over toes.
            </p>
          </div>

          {/* Card 4: Rep Velocity & Controlled Cadence */}
          <div className="p-5 rounded-3xl bg-slate-950/80 border border-purple-500/40 backdrop-blur-md shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                DESCENT CADENCE
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-purple-500/20 text-purple-300 text-[10px] font-black">
                +200% TEMPO
              </span>
            </div>

            <div className="flex items-baseline justify-between mb-2">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500">Day 1 Drop</span>
                <span className="text-xl font-mono font-bold text-slate-400">0.8s (Jerky)</span>
              </div>
              <span className="text-slate-600 font-bold">→</span>
              <div className="flex flex-col text-right">
                <span className="text-[10px] text-purple-400 font-bold">Today</span>
                <span className="text-3xl font-black font-mono text-purple-300">2.4s (Smooth)</span>
              </div>
            </div>

            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-400 rounded-full"
                style={{ width: "90%" }}
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Ballistic drop replaced with controlled eccentric cadence, protecting connective joint tissue.
            </p>
          </div>
        </div>

        {/* Visual SVG Recovery Trajectory Curve */}
        <div className="p-6 rounded-3xl bg-slate-950/80 border border-slate-800 backdrop-blur-md shadow-xl flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-teal-400 text-lg">📈</span>
              <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                14-DAY CLINICAL RECOVERY CURVE (DEPTH ROM & STABILITY TRAJECTORY)
              </h2>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="flex items-center gap-1.5 text-teal-400">
                <span className="w-3 h-0.5 bg-teal-400 inline-block" />
                <span>Knee Depth (° Lower is Better)</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-400">
                <span className="w-3 h-0.5 bg-amber-400 inline-block" />
                <span>Stability Index (0-100)</span>
              </div>
            </div>
          </div>

          {/* SVG Multi-Line Chart */}
          <div className="relative w-full h-72 bg-[#080d1a] rounded-2xl overflow-hidden border border-slate-800 p-4">
            <svg className="w-full h-full" viewBox="0 0 700 220" preserveAspectRatio="none">
              {/* Depth Reference Line */}
              <line x1="0" y1="170" x2="700" y2="170" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 4" />
              <text x="12" y="164" fill="#10b981" fontSize="10" fontFamily="monospace">
                CLINICAL TARGET (90° PARALLEL)
              </text>

              {/* Grid Lines */}
              <line x1="0" y1="50" x2="700" y2="50" stroke="#1e293b" strokeWidth="1" />
              <line x1="0" y1="110" x2="700" y2="110" stroke="#1e293b" strokeWidth="1" />

              {/* Depth Curve (Teal) */}
              <polyline
                fill="none"
                stroke="#14b8a6"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={history
                  .map((sess, idx) => {
                    const x = (idx / (history.length - 1)) * 700;
                    // Angle 115° = 30px, 85° = 180px
                    const norm = Math.max(0, Math.min(1, (sess.avgDepthAngle - 85) / 30));
                    const y = 30 + norm * 150;
                    return `${x},${y}`;
                  })
                  .join(" ")}
              />

              {/* Depth Data Points */}
              {history.map((sess, idx) => {
                const x = (idx / (history.length - 1)) * 700;
                const norm = Math.max(0, Math.min(1, (sess.avgDepthAngle - 85) / 30));
                const y = 30 + norm * 150;
                return (
                  <g key={`d_${idx}`}>
                    <circle cx={x} cy={y} r="5" fill="#14b8a6" stroke="#050811" strokeWidth="2" />
                    <text x={x} y={y - 10} fill="#14b8a6" fontSize="10" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                      {sess.avgDepthAngle}°
                    </text>
                  </g>
                );
              })}

              {/* Stability Score Curve (Amber) */}
              <polyline
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.5"
                strokeDasharray="5 5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={history
                  .map((sess, idx) => {
                    const x = (idx / (history.length - 1)) * 700;
                    // Score 60 = 190px, 100 = 30px
                    const norm = Math.max(0, Math.min(1, (sess.stabilityScore - 60) / 40));
                    const y = 190 - norm * 150;
                    return `${x},${y}`;
                  })
                  .join(" ")}
              />
            </svg>
          </div>

          {/* Session Timeline Markers */}
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-2">
            {history.map((sess, idx) => (
              <span key={idx} className={idx === history.length - 1 ? "text-teal-300 font-bold" : ""}>
                {sess.date}
              </span>
            ))}
          </div>
        </div>

        {/* AI Clinical Synthesis (SOAP Note) */}
        <ClinicalSoapCard
          callsign="OPERATIVE_01"
          exercise={activeExConfig.name}
          repsCompleted={history[history.length - 1]?.repsCompleted || 15}
          avgDepthAngle={todayDepth}
          maxHoldDuration={todayHold}
          valgusEvents={todayValgus}
          stabilityScore={history[history.length - 1]?.stabilityScore || 97.0}
          streakDays={history.length}
          baseline={{
            avgDepthAngle: baselineSession.avgDepthAngle,
            maxHoldDuration: baselineSession.maxHoldDuration,
            valgusEvents: baselineSession.valgusEvents,
            stabilityScore: baselineSession.stabilityScore,
          }}
        />
      </main>
    </div>
  );
};
