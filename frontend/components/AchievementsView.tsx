"use client";

import React, { useState } from "react";

export interface AchievementItem {
  id: string;
  title: string;
  icon: string;
  tier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" | "DIAMOND";
  description: string;
  category: "CLINICAL" | "COMBAT" | "MILESTONE";
  unlocked: boolean;
  unlockedAt?: string;
  currentProgress: number;
  maxProgress: number;
  progressUnit: string;
}

interface AchievementsViewProps {
  achievements: AchievementItem[];
  onBack: () => void;
}

export const AchievementsView: React.FC<AchievementsViewProps> = ({
  achievements,
  onBack,
}) => {
  const [filter, setFilter] = useState<"ALL" | "UNLOCKED" | "LOCKED">("ALL");

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const filteredAchievements = achievements.filter((a) => {
    if (filter === "UNLOCKED") return a.unlocked;
    if (filter === "LOCKED") return !a.unlocked;
    return true;
  });

  const getTierBadge = (tier: AchievementItem["tier"]) => {
    switch (tier) {
      case "BRONZE":
        return "bg-amber-900/40 border-amber-700 text-amber-300";
      case "SILVER":
        return "bg-slate-700/40 border-slate-400 text-slate-200";
      case "GOLD":
        return "bg-yellow-900/40 border-yellow-500 text-yellow-300 shadow-[0_0_10px_rgba(234,179,8,0.4)]";
      case "PLATINUM":
        return "bg-cyan-950/60 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.4)]";
      case "DIAMOND":
        return "bg-purple-950/60 border-fuchsia-400 text-fuchsia-300 shadow-[0_0_15px_rgba(217,70,239,0.5)]";
    }
  };

  return (
    <div className="relative w-full h-full min-h-screen bg-[#050811] text-white flex flex-col font-mono select-none overflow-y-auto p-4 sm:p-6">
      {/* Top Navigation Header */}
      <header className="relative z-20 w-full max-w-6xl mx-auto flex items-center justify-between pb-6 border-b border-slate-800">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-slate-900/90 hover:bg-yellow-500/20 border border-slate-700 hover:border-yellow-400 text-xs font-bold text-yellow-300 transition-all cursor-pointer flex items-center gap-2 shadow-lg"
        >
          <span>←</span>
          <span>BACK TO MENU</span>
        </button>

        <div className="flex items-center gap-2.5">
          <span className="text-2xl">🏆</span>
          <div className="flex flex-col text-left sm:text-right">
            <h1 className="text-base sm:text-xl font-black text-yellow-300 uppercase tracking-widest">
              HALL OF ACHIEVEMENTS
            </h1>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">
              10 CLINICAL & ARCADE MASTERY HONORS
            </span>
          </div>
        </div>

        <div className="px-3.5 py-1.5 rounded-xl bg-yellow-950/70 border border-yellow-500/60 text-xs font-black text-yellow-300 shadow-[0_0_15px_rgba(234,179,8,0.3)]">
          {unlockedCount} / {achievements.length} UNLOCKED
        </div>
      </header>

      {/* Filter Tabs & Overall Progress Bar */}
      <div className="relative z-10 w-full max-w-6xl mx-auto mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Filter Buttons */}
        <div className="flex items-center gap-2 bg-black/60 p-1 rounded-2xl border border-slate-800">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
              filter === "ALL"
                ? "bg-yellow-500 text-black shadow-[0_0_12px_rgba(234,179,8,0.5)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            ALL (10)
          </button>
          <button
            onClick={() => setFilter("UNLOCKED")}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
              filter === "UNLOCKED"
                ? "bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            UNLOCKED ({unlockedCount})
          </button>
          <button
            onClick={() => setFilter("LOCKED")}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
              filter === "LOCKED"
                ? "bg-slate-700 text-white shadow-lg"
                : "text-slate-400 hover:text-white"
            }`}
          >
            LOCKED ({achievements.length - unlockedCount})
          </button>
        </div>

        {/* Global Unlock Progress Bar */}
        <div className="w-full sm:w-72 flex flex-col gap-1 text-right">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Overall Completion</span>
            <span className="font-bold text-yellow-300">
              {Math.round((unlockedCount / achievements.length) * 100)}%
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-yellow-500/30">
            <div
              className="h-full rounded-full bg-gradient-to-r from-yellow-500 via-amber-400 to-emerald-400 transition-all duration-300 shadow-[0_0_10px_rgba(234,179,8,0.6)]"
              style={{ width: `${(unlockedCount / achievements.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* 10-Achievement High-Tech Grid */}
      <main className="relative z-10 w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 mb-8">
        {filteredAchievements.map((ach) => {
          const progressPct = Math.min(
            100,
            Math.round((ach.currentProgress / (ach.maxProgress || 1)) * 100)
          );

          return (
            <div
              key={ach.id}
              className={`relative p-5 rounded-3xl border transition-all flex items-start gap-4 backdrop-blur-md shadow-xl overflow-hidden ${
                ach.unlocked
                  ? "bg-gradient-to-br from-slate-950/90 via-[#0a1122]/90 to-slate-900/90 border-yellow-500/60 shadow-[0_0_30px_rgba(234,179,8,0.2)]"
                  : "bg-slate-950/60 border-slate-800/80 opacity-75 hover:opacity-100"
              }`}
            >
              {/* Left Side: Icon Hexagon / Badge */}
              <div
                className={`w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center text-3xl border ${
                  ach.unlocked
                    ? "bg-yellow-950/60 border-yellow-400 text-yellow-300 shadow-[0_0_20px_rgba(234,179,8,0.4)]"
                    : "bg-slate-900 border-slate-700 text-slate-500 grayscale"
                }`}
              >
                {ach.icon}
              </div>

              {/* Right Side: Title, Details, Progress Bar */}
              <div className="flex-1 flex flex-col justify-between">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3
                        className={`text-sm sm:text-base font-black uppercase tracking-wider ${
                          ach.unlocked ? "text-white" : "text-slate-300"
                        }`}
                      >
                        {ach.title}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${getTierBadge(
                          ach.tier
                        )}`}
                      >
                        {ach.tier}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {ach.description}
                    </p>
                  </div>

                  <div className="flex-shrink-0 text-right">
                    {ach.unlocked ? (
                      <span className="px-2.5 py-1 rounded-xl bg-emerald-950/80 border border-emerald-400 text-emerald-300 text-[10px] font-black uppercase tracking-wider shadow-[0_0_10px_rgba(16,185,129,0.4)]">
                        ✅ UNLOCKED
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                        🔒 {progressPct}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Numerical Progress Bar */}
                <div className="mt-3 flex flex-col gap-1">
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>
                      Progress: {ach.currentProgress} / {ach.maxProgress} {ach.progressUnit}
                    </span>
                    {ach.unlocked && ach.unlockedAt && (
                      <span className="text-yellow-400/80 font-semibold">
                        Earned: {ach.unlockedAt}
                      </span>
                    )}
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        ach.unlocked
                          ? "bg-gradient-to-r from-yellow-500 to-emerald-400"
                          : "bg-slate-600"
                      }`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
};
