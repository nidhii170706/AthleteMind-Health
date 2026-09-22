"use client";

import React from "react";

export type BannerState =
  | "ACTION_START"
  | "SQUAT_DOWN"
  | "HOLD_POSITION"
  | "STAND_UP"
  | "EGO_LIFT"
  | "PARRY_ATTACK";

interface GiantActionBannerProps {
  state: BannerState;
  holdProgress: number; // 0.0 to 1.0
  targetHoldDuration?: number; // in seconds, default 1.5
  customMessage?: string;
  subMessage?: string;
}

export const GiantActionBanner: React.FC<GiantActionBannerProps> = ({
  state,
  holdProgress,
  targetHoldDuration = 1.5,
  customMessage,
  subMessage,
}) => {
  let title = "INITIATE MOVEMENT";
  let subtitle = "BEGIN CONTROLLED MOVEMENT";
  let textClass =
    "text-cyan-300 animate-pulse drop-shadow-[0_0_35px_rgba(6,182,212,0.9)]";
  let containerBg = "";
  let showProgressBar = false;

  switch (state) {
    case "ACTION_START":
    case "SQUAT_DOWN":
      title = customMessage || "INITIATE MOVEMENT";
      subtitle = subMessage || "BEGIN CONTROLLED ECCENTRIC PHASE";
      textClass =
        "text-cyan-300 animate-pulse drop-shadow-[0_0_35px_rgba(6,182,212,0.9)]";
      break;

    case "HOLD_POSITION":
      title =
        customMessage ||
        `HOLD POSITION (${targetHoldDuration.toFixed(1)}s)`;
      subtitle = subMessage || "MAINTAIN POSTURE // ENGAGE KINETIC SHIELD";
      textClass =
        "text-amber-400 scale-105 transition-transform drop-shadow-[0_0_40px_rgba(245,158,11,0.95)]";
      showProgressBar = true;
      break;

    case "STAND_UP":
      title = customMessage || "REP COMPLETE // DEFLECT!";
      subtitle = subMessage || "RETURN TO START • ATTACK PARRIED!";
      textClass =
        "text-emerald-400 drop-shadow-[0_0_40px_rgba(16,185,129,0.95)] animate-pulse";
      break;

    case "EGO_LIFT":
      title = customMessage || "FORM FAULT DETECTED";
      subtitle =
        subMessage || "ALIGNMENT WARNING • STABILIZE JOINTS & SLOW DOWN";
      textClass =
        "text-red-500 font-black drop-shadow-[0_0_40px_rgba(239,68,68,0.95)]";
      containerBg =
        "bg-red-950/85 border-2 border-red-500/70 py-4 px-6 rounded-3xl shadow-[0_0_50px_rgba(239,68,68,0.85)] animate-bounce";
      break;

    case "PARRY_ATTACK":
      title = customMessage || "⚠️ INCOMING BOSS STRIKE!";
      subtitle = subMessage || "PARRY BY HOLDING DEFLECTION POSTURE NOW!";
      textClass =
        "text-rose-400 animate-pulse drop-shadow-[0_0_40px_rgba(244,63,94,0.95)]";
      containerBg =
        "bg-rose-950/70 border-2 border-rose-500/80 py-3 px-6 rounded-3xl shadow-[0_0_40px_rgba(244,63,94,0.8)]";
      break;
  }

  return (
    <div className="pointer-events-none absolute top-8 sm:top-10 left-1/2 -translate-x-1/2 z-30 w-full max-w-4xl text-center px-4 transition-all duration-200">
      <div className={`inline-block max-w-full ${containerBg}`}>
        {/* Massive Primary Notification Text Visible from 8+ Feet Away */}
        <h1
          className={`text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-wider font-mono drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)] leading-tight ${textClass}`}
        >
          {title}
        </h1>

        {/* Dynamic Hold Progress Bar */}
        {showProgressBar && (
          <div className="w-72 sm:w-88 md:w-96 mx-auto mt-3 sm:mt-4 h-4 sm:h-5 bg-slate-950/90 rounded-full overflow-hidden border-2 border-amber-400/80 p-0.5 shadow-[0_0_25px_rgba(245,158,11,0.7)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-400 transition-all duration-75 shadow-[0_0_15px_rgba(251,191,36,0.9)]"
              style={{ width: `${Math.min(100, Math.max(0, holdProgress * 100))}%` }}
            />
          </div>
        )}

        {/* High-Visibility Subtitle Cue */}
        <p className="mt-2 text-xs sm:text-sm font-mono font-bold tracking-widest text-slate-200 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] uppercase">
          {subtitle}
        </p>
      </div>
    </div>
  );
};
