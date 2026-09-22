"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Script from "next/script";
import { GiantActionBanner, BannerState } from "@/components/GiantActionBanner";
import { MainMenu, ActiveView } from "@/components/MainMenu";
import { CameraTestView } from "@/components/CameraTestView";
import { TelemetryView } from "@/components/TelemetryView";
import { ComparisonView } from "@/components/ComparisonView";
import { AchievementsView, AchievementItem } from "@/components/AchievementsView";
import { CircuitSelectView, CircuitMode } from "@/components/CircuitSelectView";
import { SettingsView } from "@/components/SettingsView";
import { ClinicalSoapCard } from "@/components/ClinicalSoapCard";
import { ExerciseSelectorModal } from "@/components/ExerciseSelectorModal";
import { RocketBlueprintHUD } from "@/components/RocketBlueprintHUD";
import { FuturisticCockpitFrame } from "@/components/FuturisticCockpitFrame";
import {
  EXERCISE_CONFIGS,
  EXERCISE_REGISTRY,
  EXERCISE_LIST,
  getExerciseConfig,
  ExerciseConfig,
} from "@/lib/exercises";

// ---------------------------------------------------------------------------
// Types & Declarations
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    Pose: any;
  }
}

export type ExerciseType =
  | "squats"
  | "pushups"
  | "single_leg_balance"
  | "overhead_press"
  | "scaption"
  | "rdl"
  | "calf_raise"
  | "high_knee_march"
  | "torso_rotation"
  | "lateral_lunge"
  | "wall_pushup";
type DifficultyType = "rehab" | "standard" | "athlete";
type SkeletalShader = "cyberpunk" | "molten_core" | "void_phantom";
type Soundpack = "arcade_synth" | "heavy_mecha";
type WireframeTheme = "cyan" | "emerald" | "violet" | "amber";

interface VaultData {
  energyCores: number;
  unlockedShaders: SkeletalShader[];
  unlockedSoundpacks: Soundpack[];
  activeShader: SkeletalShader;
  activeSoundpack: Soundpack;
  activeTheme: WireframeTheme;
}

interface LeaderboardEntry {
  rank: number;
  id: number;
  operator_name: string;
  boss_clear_time_sec: number;
  form_purity_score: number;
  total_tension_time_sec: number;
  bounty_score: number;
  purity_grade: "S" | "A" | "B";
  timestamp: string;
}

const DEFAULT_VAULT: VaultData = {
  energyCores: 100,
  unlockedShaders: ["cyberpunk"],
  unlockedSoundpacks: ["arcade_synth"],
  activeShader: "cyberpunk",
  activeSoundpack: "arcade_synth",
  activeTheme: "cyan",
};

const SHADER_CONFIGS: Record<
  SkeletalShader,
  {
    name: string;
    cost: number;
    baseColor: string;
    holdingColor: string;
    targetColor: string;
    bracketColor: string;
    glowColor: string;
    description: string;
    badgeStyle: string;
  }
> = {
  cyberpunk: {
    name: "CYBERPUNK STANDARD",
    cost: 0,
    baseColor: "#00f0ff",
    holdingColor: "#ffd700",
    targetColor: "#10b981",
    bracketColor: "rgba(0, 240, 255, 0.4)",
    glowColor: "#00f0ff",
    description: "High-contrast neon cyan with emerald target lock and golden holding arc.",
    badgeStyle: "border-cyan-500/40 text-cyan-300 bg-cyan-950/60",
  },
  molten_core: {
    name: "MOLTEN CORE",
    cost: 150,
    baseColor: "#ff7700",
    holdingColor: "#ffaa00",
    targetColor: "#ff2200",
    bracketColor: "rgba(255, 119, 0, 0.5)",
    glowColor: "#ff5500",
    description: "Thermal reactor amber and molten red heat signatures for high-intensity reps.",
    badgeStyle: "border-amber-500/40 text-amber-300 bg-amber-950/60",
  },
  void_phantom: {
    name: "VOID PHANTOM",
    cost: 300,
    baseColor: "#a855f7",
    holdingColor: "#d946ef",
    targetColor: "#ec4899",
    bracketColor: "rgba(168, 85, 247, 0.5)",
    glowColor: "#a855f7",
    description: "Ethereal dark violet and quantum fuchsia spectral resonance.",
    badgeStyle: "border-purple-500/40 text-purple-300 bg-purple-950/60",
  },
};

const THEME_STYLES: Record<
  WireframeTheme,
  {
    name: string;
    headerBorder: string;
    primaryText: string;
    badgeBg: string;
    hudBorder: string;
    glowClass: string;
    buttonBg: string;
  }
> = {
  cyan: {
    name: "NEON CYAN",
    headerBorder: "border-cyan-500/20",
    primaryText: "text-cyan-400",
    badgeBg: "bg-cyan-950/80 border-cyan-500/40 text-cyan-300",
    hudBorder: "border-cyan-500/30",
    glowClass: "shadow-[0_0_15px_rgba(0,240,255,0.15)]",
    buttonBg: "bg-cyan-500 text-black shadow-[0_0_12px_rgba(6,182,212,0.6)]",
  },
  emerald: {
    name: "BIO EMERALD",
    headerBorder: "border-emerald-500/20",
    primaryText: "text-emerald-400",
    badgeBg: "bg-emerald-950/80 border-emerald-500/40 text-emerald-300",
    hudBorder: "border-emerald-500/30",
    glowClass: "shadow-[0_0_15px_rgba(16,185,129,0.15)]",
    buttonBg: "bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.6)]",
  },
  violet: {
    name: "CYBER VIOLET",
    headerBorder: "border-purple-500/20",
    primaryText: "text-purple-400",
    badgeBg: "bg-purple-950/80 border-purple-500/40 text-purple-300",
    hudBorder: "border-purple-500/30",
    glowClass: "shadow-[0_0_15px_rgba(168,85,247,0.15)]",
    buttonBg: "bg-purple-500 text-black shadow-[0_0_12px_rgba(168,85,247,0.6)]",
  },
  amber: {
    name: "TACTICAL AMBER",
    headerBorder: "border-amber-500/20",
    primaryText: "text-amber-400",
    badgeBg: "bg-amber-950/80 border-amber-500/40 text-amber-300",
    hudBorder: "border-amber-500/30",
    glowClass: "shadow-[0_0_15px_rgba(245,158,11,0.15)]",
    buttonBg: "bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.6)]",
  },
};

interface BioEnginePacket {
  event?: string;
  exercise_type?: string;
  difficulty?: string;
  view_orientation?: string;
  active_profile?: "SIDE" | "FRONT";
  metric_value?: number;
  status: string;
  phase: string;
  primary_angle?: number;
  primary_angle_name?: string;
  secondary_angle?: number;
  secondary_angle_name?: string;
  knee_angle?: number;
  hip_angle?: number;
  rep_count: number;
  hold_time?: number;
  hold_progress?: number;
  hold_target?: number;
  damage?: number;
  damage_taken?: number;
  purity?: number;
  has_fault?: boolean;
  fault_type?: string;
  knee_caved_in?: boolean;
  valgus?: boolean;
  weapon_overheated?: boolean;
  error?: string;
  message: string;
  audio_cue?: string;
  is_critical?: boolean;
  active_joint_index?: number;
  fault_joint_indices?: number[];
  boss_hp?: number;
  boss_max_hp?: number;
  player_hp?: number;
  player_max_hp?: number;
  boss_state?: "STANDARD" | "ENRAGED" | "DEFEATED";
  boss_attack_timer?: number;
  incoming_attack?: boolean;
  parry_window_sec?: number;
  parry_success?: boolean;
  parry_failed?: boolean;
  combo_streak?: number;
  combo_multiplier?: number;
  streak_collapsed?: boolean;
  combat_damage_dealt?: number;
  combat_damage_taken?: number;
  modifiers?: string[];
  total_tension_time_sec?: number;
}

interface AngleSample {
  timestamp: number;
  angle: number;
}

interface RepDetail {
  repIndex: number;
  exercise: string;
  minAngle: number;
  holdDuration: number;
  purityScore: number;
  verdict: string;
  faults: string;
  timestamp: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
  alpha: number;
  life: number;
  maxLife: number;
}

interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
  opacity: number;
  life: number;
  maxLife: number;
}

export interface RecoverySession {
  id: string;
  date: string;
  avgDepthAngle: number;
  maxHoldDuration: number;
  valgusEvents: number;
  stabilityScore: number; // 0 - 100%
  repsCompleted: number;
  exerciseId?: string;
}

export interface ClinicalBadge {
  id: string;
  name: string;
  icon: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

export type CampaignStage =
  | "PROLOGUE"
  | "CALIBRATION_ARMS"
  | "CALIBRATION_STANCE"
  | "CALIBRATION_SHIELD"
  | "BOSS_INTRO"
  | "ACTIVE_DEFLECTION"
  | "PAUSED"
  | "EPILOGUE";

export type GameStage = CampaignStage;

export type CharacterState =
  | "OPERATIVE_NEUTRAL"
  | "OPERATIVE_CALIBRATING"
  | "AI_ALERT"
  | "OPERATIVE_EMPOWERED";

export interface DialogueSlide {
  id: number;
  speaker: "AI_SUIT_OPERATOR" | "APEX_ANOMALY" | "SYSTEM_CORE";
  speakerTitle: string;
  portraitState: CharacterState;
  dialogue: string;
  actionLabel: string; // e.g., "NEXT >>", "COMMENCE CALIBRATION", "ENGAGE SHIELD"
  targetStage?: CampaignStage;
}

export const STORY_SCRIPT: DialogueSlide[] = [
  {
    id: 1,
    speaker: "AI_SUIT_OPERATOR",
    speakerTitle: "TAC-COM // UNIT 07",
    portraitState: "OPERATIVE_NEUTRAL",
    dialogue: "Neural telemetry detected. Operative, your cybernetic kinetic conduits suffered catastrophic collapse during the breach. Motor recalibration is mandatory.",
    actionLabel: "NEXT: INITIATE DIAGNOSTICS >>",
    targetStage: "PROLOGUE",
  },
  {
    id: 2,
    speaker: "AI_SUIT_OPERATOR",
    speakerTitle: "TAC-COM // CALIBRATION PROTOCOL",
    portraitState: "OPERATIVE_CALIBRATING",
    dialogue: "We must test the Kinetic Aegis system before environmental breach. We will run range-of-motion verification across arms, full stance, and shield generation.",
    actionLabel: "COMMENCE CALIBRATION >>",
    targetStage: "CALIBRATION_ARMS",
  },
  {
    id: 3,
    speaker: "SYSTEM_CORE",
    speakerTitle: "SYSTEM CORE // APEX ALERT",
    portraitState: "AI_ALERT",
    dialogue: "CRITICAL WARNING: The Apex Core has located our frequency. Heavy kinetic shockwaves incoming. Drop into full depth to deflect the blast!",
    actionLabel: "ENGAGE DEFLECTION SHIELD >>",
    targetStage: "ACTIVE_DEFLECTION",
  },
  {
    id: 4,
    speaker: "AI_SUIT_OPERATOR",
    speakerTitle: "TAC-COM // MISSION DEBRIEF",
    portraitState: "OPERATIVE_EMPOWERED",
    dialogue: "Threat neutralized. Kinetic integrity restored to 98.4%. Range of motion logs have been compiled for clinical discharge.",
    actionLabel: "VIEW RECOVERY DOSSIER >>",
    targetStage: "EPILOGUE",
  },
];

export interface KineticProjectile {
  id: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  progress: number; // 0.0 to 1.0
  duration: number; // 4000ms
  spawnTime: number;
  radius: number;
  color: string;
  status: "FLYING" | "DEFLECTED" | "BREACHED";
  rotation?: number;
  rotSpeed?: number;
  sizeScale?: number;
  variant?: "SMALL" | "MEDIUM" | "LARGE";
}

const DEFAULT_CLINICAL_BADGES: ClinicalBadge[] = [
  {
    id: "tendon_vanguard",
    name: "Tendon Vanguard",
    icon: "🛡️",
    description: "Completed set with zero medial knee wobble.",
    unlocked: false,
  },
  {
    id: "static_anchor",
    name: "Static Anchor",
    icon: "⏱️",
    description: "≥ 20 cumulative seconds held in safe pauses.",
    unlocked: false,
  },
  {
    id: "kinetic_symmetry",
    name: "Kinetic Symmetry",
    icon: "🔄",
    description: "Left and right joint tracking within < 5% variance.",
    unlocked: false,
  },
];

export const INITIAL_ACHIEVEMENTS: AchievementItem[] = [
  {
    id: "first_blood",
    title: "First Blood",
    icon: "🥉",
    tier: "BRONZE",
    description: "Complete your first calibrated session.",
    category: "MILESTONE",
    unlocked: true,
    unlockedAt: "Aug 29, 2026",
    currentProgress: 1,
    maxProgress: 1,
    progressUnit: "session",
  },
  {
    id: "centurion_1",
    title: "Centurion Tier 1",
    icon: "🥈",
    tier: "SILVER",
    description: "Accumulate 50 total lifetime squats.",
    category: "MILESTONE",
    unlocked: false,
    currentProgress: 48,
    maxProgress: 50,
    progressUnit: "squats",
  },
  {
    id: "centurion_2",
    title: "Centurion Tier 2",
    icon: "🥇",
    tier: "GOLD",
    description: "Accumulate 100 total lifetime squats.",
    category: "MILESTONE",
    unlocked: false,
    currentProgress: 48,
    maxProgress: 100,
    progressUnit: "squats",
  },
  {
    id: "iron_tendons",
    title: "Iron Tendons",
    icon: "🛡️",
    tier: "PLATINUM",
    description: "Complete a full set with zero knee-valgus deviations.",
    category: "CLINICAL",
    unlocked: true,
    unlockedAt: "Sep 07, 2026",
    currentProgress: 1,
    maxProgress: 1,
    progressUnit: "flawless set",
  },
  {
    id: "zen_anchor",
    title: "Zen Anchor",
    icon: "⏱️",
    tier: "SILVER",
    description: "Accumulate over 30 cumulative seconds in isometric pause holds.",
    category: "CLINICAL",
    unlocked: false,
    currentProgress: 24,
    maxProgress: 30,
    progressUnit: "seconds held",
  },
  {
    id: "unbroken_rhythm",
    title: "Unbroken Rhythm",
    icon: "⚡",
    tier: "GOLD",
    description: "Achieve a 5x perfect deflection combo streak.",
    category: "COMBAT",
    unlocked: true,
    unlockedAt: "Sep 09, 2026",
    currentProgress: 5,
    maxProgress: 5,
    progressUnit: "streak",
  },
  {
    id: "bilateral_master",
    title: "Bilateral Master",
    icon: "🔄",
    tier: "PLATINUM",
    description: "Maintain < 3% symmetry variance between left and right knees.",
    category: "CLINICAL",
    unlocked: true,
    unlockedAt: "Sep 11, 2026",
    currentProgress: 1.6,
    maxProgress: 3.0,
    progressUnit: "% variance",
  },
  {
    id: "pushup_pioneer",
    title: "Push-Up Pioneer",
    icon: "💪",
    tier: "SILVER",
    description: "Complete 10 clean push-ups in a row (or circuit mode).",
    category: "MILESTONE",
    unlocked: false,
    currentProgress: 6,
    maxProgress: 10,
    progressUnit: "push-ups",
  },
  {
    id: "relentless_adherence",
    title: "Relentless Adherence",
    icon: "🔥",
    tier: "DIAMOND",
    description: "Maintain a 7-day workout streak.",
    category: "MILESTONE",
    unlocked: true,
    unlockedAt: "Sep 11, 2026",
    currentProgress: 7,
    maxProgress: 7,
    progressUnit: "days",
  },
  {
    id: "clinical_graduation",
    title: "Clinical Graduation",
    icon: "🏆",
    tier: "DIAMOND",
    description: "Achieve ≥ 95% purity score across 3 consecutive sessions.",
    category: "CLINICAL",
    unlocked: false,
    currentProgress: 2,
    maxProgress: 3,
    progressUnit: "sessions",
  },
];

const DEFAULT_BASELINE_SESSION: RecoverySession = {
  id: "baseline_day_1",
  date: "2026-08-29",
  avgDepthAngle: 108.0,
  maxHoldDuration: 0.6,
  valgusEvents: 4,
  stabilityScore: 65.0,
  repsCompleted: 6,
};

export interface AdherenceData {
  lastSessionDate: string;
  streakDays: number;
  restDaysTaken: number;
  totalSessions: number;
  restDayActive: boolean;
}

const DEFAULT_ADHERENCE: AdherenceData = {
  lastSessionDate: "2026-09-11",
  streakDays: 7,
  restDaysTaken: 2,
  totalSessions: 14,
  restDayActive: false,
};

const SEED_RECOVERY_HISTORY: RecoverySession[] = [
  { id: "rec_1", date: "2026-08-29", avgDepthAngle: 108.0, maxHoldDuration: 0.6, valgusEvents: 4, stabilityScore: 65.0, repsCompleted: 6 },
  { id: "rec_2", date: "2026-09-01", avgDepthAngle: 104.5, maxHoldDuration: 0.9, valgusEvents: 3, stabilityScore: 72.0, repsCompleted: 8 },
  { id: "rec_3", date: "2026-09-04", avgDepthAngle: 99.0, maxHoldDuration: 1.2, valgusEvents: 2, stabilityScore: 79.0, repsCompleted: 10 },
  { id: "rec_4", date: "2026-09-07", avgDepthAngle: 94.5, maxHoldDuration: 1.6, valgusEvents: 1, stabilityScore: 86.0, repsCompleted: 12 },
  { id: "rec_5", date: "2026-09-09", avgDepthAngle: 91.0, maxHoldDuration: 1.9, valgusEvents: 1, stabilityScore: 91.0, repsCompleted: 14 },
  { id: "rec_6", date: "2026-09-11", avgDepthAngle: 88.5, maxHoldDuration: 2.2, valgusEvents: 0, stabilityScore: 96.0, repsCompleted: 15 },
];

// ---------------------------------------------------------------------------
// Browser Audio Synthesizer (FX + Procedural Audio)
// ---------------------------------------------------------------------------

class AudioSynth {
  private ctx: AudioContext | null = null;
  public muted: boolean = false;
  public soundpack: Soundpack = "arcade_synth";

  private init() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  playHoldTick(progress: number) {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      if (this.soundpack === "heavy_mecha") {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "triangle";
        const baseFreq = 140 + Math.min(1.0, progress) * 180;
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(70, now + 0.07);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.07);
      } else {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        const baseFreq = 320 + Math.min(1.0, progress) * 480;
        osc.frequency.setValueAtTime(baseFreq, now);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      }
    } catch {
      // safe
    }
  }

  playCritHit() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      if (this.soundpack === "heavy_mecha") {
        // Heavy sub-bass thud (45-85Hz)
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = "sawtooth";
        sub.frequency.setValueAtTime(85, now);
        sub.frequency.exponentialRampToValueAtTime(35, now + 0.4);
        subGain.gain.setValueAtTime(0.45, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        sub.connect(subGain);
        subGain.connect(this.ctx.destination);
        sub.start(now);
        sub.stop(now + 0.4);

        // Metallic impact clang
        const clang = this.ctx.createOscillator();
        const clangGain = this.ctx.createGain();
        clang.type = "square";
        clang.frequency.setValueAtTime(520, now);
        clang.frequency.exponentialRampToValueAtTime(220, now + 0.22);
        clangGain.gain.setValueAtTime(0.25, now);
        clangGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        clang.connect(clangGain);
        clangGain.connect(this.ctx.destination);
        clang.start(now);
        clang.stop(now + 0.22);
      } else {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.35);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);

        const ping = this.ctx.createOscillator();
        const pingGain = this.ctx.createGain();
        ping.type = "sine";
        ping.frequency.setValueAtTime(880, now);
        ping.frequency.exponentialRampToValueAtTime(1760, now + 0.18);

        pingGain.gain.setValueAtTime(0.2, now);
        pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        ping.connect(pingGain);
        pingGain.connect(this.ctx.destination);
        ping.start(now);
        ping.stop(now + 0.18);
      }
    } catch {
      // safe
    }
  }

  playStun() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      if (this.soundpack === "heavy_mecha") {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(60, now);
        osc.frequency.exponentialRampToValueAtTime(28, now + 0.45);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.45);
      } else {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.setValueAtTime(75, now + 0.18);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.45);
      }
    } catch {
      // safe
    }
  }

  playBossAttack() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      if (this.soundpack === "heavy_mecha") {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(90, now);
        osc.frequency.exponentialRampToValueAtTime(25, now + 0.55);
        gain.gain.setValueAtTime(0.45, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.55);
      } else {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.5);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.5);
      }
    } catch {
      // safe
    }
  }

  playVictory() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const start = this.ctx!.currentTime + idx * 0.12;
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.2, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(start);
        osc.stop(start + 0.35);
      });
    } catch {
      // safe
    }
  }

  playDefeat() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const notes = [440, 392, 349.23, 293.66];
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const start = this.ctx!.currentTime + idx * 0.15;
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.2, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(start);
        osc.stop(start + 0.3);
      });
    } catch {
      // safe
    }
  }

  playParrySuccess() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      if (this.soundpack === "heavy_mecha") {
        // Resonant industrial anvil clash
        const clang = this.ctx.createOscillator();
        const clangGain = this.ctx.createGain();
        clang.type = "square";
        clang.frequency.setValueAtTime(680, now);
        clang.frequency.exponentialRampToValueAtTime(340, now + 0.35);
        clangGain.gain.setValueAtTime(0.4, now);
        clangGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        clang.connect(clangGain);
        clangGain.connect(this.ctx.destination);
        clang.start(now);
        clang.stop(now + 0.35);

        // Sub recoil pulse
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = "sine";
        sub.frequency.setValueAtTime(75, now);
        sub.frequency.exponentialRampToValueAtTime(40, now + 0.25);
        subGain.gain.setValueAtTime(0.35, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        sub.connect(subGain);
        subGain.connect(this.ctx.destination);
        sub.start(now);
        sub.stop(now + 0.25);
      } else {
        // Metallic clash primary
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.type = "triangle";
        osc1.frequency.setValueAtTime(1200, now);
        osc1.frequency.exponentialRampToValueAtTime(750, now + 0.3);
        gain1.gain.setValueAtTime(0.4, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc1.connect(gain1);
        gain1.connect(this.ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.35);

        // High metallic sheen
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(2400, now);
        osc2.frequency.exponentialRampToValueAtTime(1600, now + 0.25);
        gain2.gain.setValueAtTime(0.25, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc2.connect(gain2);
        gain2.connect(this.ctx.destination);
        osc2.start(now);
        osc2.stop(now + 0.25);
      }
    } catch {
      // safe
    }
  }

  playStreakBreak() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.35);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);

      // Dissonant sub-tone
      const sub = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      sub.type = "square";
      sub.frequency.setValueAtTime(145, now);
      sub.frequency.exponentialRampToValueAtTime(40, now + 0.25);
      subGain.gain.setValueAtTime(0.2, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      sub.connect(subGain);
      subGain.connect(this.ctx.destination);
      sub.start(now);
      sub.stop(now + 0.25);
    } catch {
      // safe
    }
  }

  playStreakLevelUp(multiplier: number) {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const base = multiplier >= 3.0 ? 600 : multiplier >= 2.0 ? 500 : 400;
      const freqs = [base, base * 1.25, base * 1.5, base * 2.0];
      freqs.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const start = this.ctx!.currentTime + idx * 0.07;
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.18, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(start);
        osc.stop(start + 0.22);
      });
    } catch {
      // safe
    }
  }

  playHarmonicChord() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const freqs = [261.63, 329.63, 392.0, 493.88, 587.33]; // C-Major 9th (C4, E4, G4, B4, D5)
      const now = this.ctx.currentTime;
      freqs.forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.12, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now);
        osc.stop(now + 1.4);
      });
    } catch {
      // safe
    }
  }

  playCalibrationBeep(isFinal: boolean = false) {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      if (!isFinal) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(660, now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.2, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
      } else {
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          const start = now + idx * 0.055;
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, start);
          gain.gain.setValueAtTime(0.001, start);
          gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
          osc.connect(gain);
          gain.connect(this.ctx!.destination);
          osc.start(start);
          osc.stop(start + 0.4);
        });
      }
    } catch {
      // safe
    }
  }

  playPerfectDeflect() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const freqs = [330.0, 659.25, 1318.5, 2637.0];
      freqs.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = idx === 0 ? "sawtooth" : "sine";
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(idx === 0 ? 0.3 : 0.15, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (idx === 0 ? 0.6 : 0.9));
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now);
        osc.stop(now + 1.0);
      });
    } catch {
      // safe
    }
  }

  playShieldBreach() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(95, now);
      osc.frequency.exponentialRampToValueAtTime(32, now + 0.28);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.28);
    } catch {
      // safe
    }
  }

  playShipExplosion() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      // White noise explosion blast
      const bufferSize = Math.floor(this.ctx.sampleRate * 1.6);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(650, now);
      filter.frequency.exponentialRampToValueAtTime(35, now + 1.5);
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.75, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(now);

      // Deep saw sub-bass pitch rumble
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(18, now + 1.3);
      oscGain.gain.setValueAtTime(0.65, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);
      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 1.3);
    } catch {
      // safe
    }
  }

  playShieldDischarge() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.35);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch {
      // safe
    }
  }

  playCapacitorRecharged() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const freqs = [392.0, 523.25, 659.25, 783.99]; // G4, C5, E5, G5
      freqs.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const start = now + idx * 0.05;
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(start);
        osc.stop(start + 0.28);
      });
    } catch {
      // safe
    }
  }

  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;

  startAmbientDrone() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      if (this.droneGain) return; // already running
      const now = this.ctx.currentTime;
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(160, now);

      const osc1 = this.ctx.createOscillator();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(55, now); // A1 Sub-drone

      const osc2 = this.ctx.createOscillator();
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(110, now); // A2 Harmonic

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.05, now + 1.2);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);

      this.droneOsc1 = osc1;
      this.droneOsc2 = osc2;
      this.droneGain = gain;
    } catch {
      // safe
    }
  }

  stopAmbientDrone() {
    try {
      if (this.droneGain && this.ctx) {
        const now = this.ctx.currentTime;
        this.droneGain.gain.setValueAtTime(this.droneGain.gain.value, now);
        this.droneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
        setTimeout(() => {
          try {
            this.droneOsc1?.stop();
            this.droneOsc2?.stop();
          } catch {}
          this.droneOsc1 = null;
          this.droneOsc2 = null;
          this.droneGain = null;
        }, 450);
      }
    } catch {
      // safe
    }
  }

  playCalibrationPing() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1320, now + 0.05);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.22, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    } catch {
      // safe
    }
  }

  playShieldOptimalChime() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const freqs = [392.0, 523.25, 659.25, 783.99, 1046.5];
      freqs.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const start = this.ctx!.currentTime + idx * 0.055;
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.exponentialRampToValueAtTime(0.2, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(start);
        osc.stop(start + 0.4);
      });
    } catch {
      // safe
    }
  }

  playBossAlarm() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(880, now + 0.12);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // safe
    }
  }
}

const synth = new AudioSynth();

// ---------------------------------------------------------------------------
// Typewriter Text Component (Glassmorphic Terminal Effect)
// ---------------------------------------------------------------------------

function TypewriterText({
  text,
  speed = 25,
  onComplete,
  className = "",
}: {
  text: string;
  speed?: number;
  onComplete?: () => void;
  className?: string;
}) {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let index = 0;
    setDisplayedText("");
    setIsComplete(false);
    const interval = setInterval(() => {
      index++;
      if (index <= text.length) {
        setDisplayedText(text.slice(0, index));
      } else {
        clearInterval(interval);
        setIsComplete(true);
        if (onComplete) onComplete();
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed, onComplete]);

  return (
    <span className={className}>
      {displayedText}
      {!isComplete && <span className="inline-block w-2 h-4 ml-1 bg-cyan-400 animate-pulse align-middle" />}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Character Portrait Component: Procedural Sci-Fi Avatar Sprite
// ---------------------------------------------------------------------------

function CharacterPortrait({
  state,
  size = 120,
  className = "",
}: {
  state: CharacterState;
  size?: number;
  className?: string;
}) {
  const isNeutral = state === "OPERATIVE_NEUTRAL";
  const isCalibrating = state === "OPERATIVE_CALIBRATING";
  const isAlert = state === "AI_ALERT";
  const isEmpowered = state === "OPERATIVE_EMPOWERED";

  const primaryColor = isAlert
    ? "#ff0055"
    : isEmpowered
    ? "#10b981"
    : isCalibrating
    ? "#f59e0b"
    : "#00f0ff";

  const secondaryColor = isAlert
    ? "#f43f5e"
    : isEmpowered
    ? "#34d399"
    : isCalibrating
    ? "#fbbf24"
    : "#38bdf8";

  const filterId = isAlert
    ? "url(#glow_rose)"
    : isEmpowered
    ? "url(#glow_emerald)"
    : isCalibrating
    ? "url(#glow_amber)"
    : "url(#glow_cyan)";

  return (
    <div
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 120 120"
        width={size}
        height={size}
        className="w-full h-full overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="glow_cyan" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow_amber" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow_rose" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow_emerald" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Radial Backdrops */}
          <radialGradient id="holoBg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={primaryColor} stopOpacity="0.22" />
            <stop offset="60%" stopColor={primaryColor} stopOpacity="0.06" />
            <stop offset="100%" stopColor="#050811" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. Holographic Backdrop & Framing */}
        <circle cx="60" cy="60" r="54" fill="url(#holoBg)" />
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke={primaryColor}
          strokeWidth="1"
          strokeDasharray="8 6"
          opacity="0.35"
        />
        <circle
          cx="60"
          cy="60"
          r="57"
          fill="none"
          stroke={primaryColor}
          strokeWidth="0.75"
          strokeDasharray="2 6"
          opacity="0.25"
        />

        {/* Four High-Tech Corner Brackets */}
        <path d="M 6 16 L 6 6 L 16 6" fill="none" stroke={primaryColor} strokeWidth="1.5" opacity="0.85" />
        <path d="M 104 6 L 114 6 L 114 16" fill="none" stroke={primaryColor} strokeWidth="1.5" opacity="0.85" />
        <path d="M 6 104 L 6 114 L 16 114" fill="none" stroke={primaryColor} strokeWidth="1.5" opacity="0.85" />
        <path d="M 104 114 L 114 114 L 114 104" fill="none" stroke={primaryColor} strokeWidth="1.5" opacity="0.85" />

        {/* 2. Armored Shoulder Chassis & Collar */}
        <path
          d="M 24 116 L 36 94 L 84 94 L 96 116 Z"
          fill="#0a0f1d"
          stroke={primaryColor}
          strokeWidth="1.5"
          opacity="0.9"
        />
        <path
          d="M 42 94 L 46 84 L 74 84 L 78 94 Z"
          fill="#070c18"
          stroke={primaryColor}
          strokeWidth="1.2"
        />

        {/* State Collar Conduits */}
        {isNeutral && (
          <>
            <line x1="60" y1="94" x2="60" y2="114" stroke="#00f0ff" strokeWidth="1.5" opacity="0.7" />
            <circle cx="60" cy="104" r="2.5" fill="#00f0ff" />
          </>
        )}
        {isCalibrating && (
          <>
            <line x1="50" y1="96" x2="50" y2="114" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="3 2" className="animate-pulse" />
            <line x1="70" y1="96" x2="70" y2="114" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="3 2" className="animate-pulse" />
            <circle cx="60" cy="104" r="3" fill="#f59e0b" className="animate-ping" />
          </>
        )}
        {isAlert && (
          <>
            <line x1="60" y1="94" x2="60" y2="114" stroke="#ff0055" strokeWidth="2.5" className="animate-pulse" filter="url(#glow_rose)" />
            <circle cx="50" cy="104" r="2" fill="#ff0055" className="animate-ping" />
            <circle cx="70" cy="104" r="2" fill="#ff0055" className="animate-ping" />
          </>
        )}
        {isEmpowered && (
          <>
            <path
              d="M 38 114 L 46 96 L 46 84 L 42 74"
              fill="none"
              stroke="#34d399"
              strokeWidth="2"
              strokeDasharray="4 2"
              className="animate-pulse"
              filter="url(#glow_emerald)"
            />
            <path
              d="M 82 114 L 74 96 L 74 84 L 78 74"
              fill="none"
              stroke="#34d399"
              strokeWidth="2"
              strokeDasharray="4 2"
              className="animate-pulse"
              filter="url(#glow_emerald)"
            />
            <line x1="60" y1="94" x2="60" y2="114" stroke="#00ffaa" strokeWidth="2.5" className="animate-pulse" filter="url(#glow_emerald)" />
          </>
        )}

        {/* 3. Helmet Shell & Cranium Dome */}
        <path
          d="M 38 52 C 38 26, 82 26, 82 52 L 84 68 L 76 84 L 60 89 L 44 84 L 36 68 Z"
          fill="#0c1222"
          stroke={primaryColor}
          strokeWidth="2"
          filter={filterId}
        />

        {/* Ear Sensor Pods */}
        <path d="M 31 52 L 37 48 L 37 68 L 31 64 Z" fill="#080e1a" stroke={primaryColor} strokeWidth="1.2" />
        <path d="M 89 52 L 83 48 L 83 68 L 89 64 Z" fill="#080e1a" stroke={primaryColor} strokeWidth="1.2" />
        <circle cx="34" cy="58" r="1.5" fill={secondaryColor} />
        <circle cx="86" cy="58" r="1.5" fill={secondaryColor} />

        {/* 4. Tactical Visor Faceplate */}
        <path
          d="M 43 50 L 77 50 L 74 68 L 60 74 L 46 68 Z"
          fill={isAlert ? "#2a0812" : isEmpowered ? "#04241a" : "#050914"}
          stroke={primaryColor}
          strokeWidth="1.8"
        />

        {/* 5. Specific State Expressions & Neural Visor Holograms */}
        {/* OPERATIVE_NEUTRAL: Steady cyan holographic outline, calm digital eyes, static collar */}
        {isNeutral && (
          <g>
            <rect x="47" y="56" width="10" height="3.5" rx="1.5" fill="#00f0ff" filter="url(#glow_cyan)" />
            <rect x="63" y="56" width="10" height="3.5" rx="1.5" fill="#00f0ff" filter="url(#glow_cyan)" />
            <line x1="46" y1="64" x2="74" y2="64" stroke="#00f0ff" strokeWidth="0.8" strokeDasharray="3 2" opacity="0.6" />
            <circle cx="60" cy="58" r="1" fill="#38bdf8" />
          </g>
        )}

        {/* OPERATIVE_CALIBRATING: Ambient gold scanning rings rotating around the visor */}
        {isCalibrating && (
          <g>
            <circle
              cx="60"
              cy="58"
              r="34"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeDasharray="16 12 4 12"
              className="animate-spin"
              style={{ transformOrigin: "60px 58px", animationDuration: "5s" }}
              opacity="0.9"
            />
            <circle
              cx="60"
              cy="58"
              r="27"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="1"
              strokeDasharray="8 6"
              className="animate-spin"
              style={{ transformOrigin: "60px 58px", animationDirection: "reverse", animationDuration: "3.5s" }}
              opacity="0.75"
            />
            {/* Visor Reticle Crosshair */}
            <circle cx="60" cy="58" r="6" fill="none" stroke="#fbbf24" strokeWidth="1" />
            <line x1="50" y1="58" x2="70" y2="58" stroke="#fbbf24" strokeWidth="0.9" strokeDasharray="2 2" />
            <line x1="60" y1="51" x2="60" y2="65" stroke="#fbbf24" strokeWidth="0.9" strokeDasharray="2 2" />
            <rect x="58.5" y="56.5" width="3" height="3" fill="#fbbf24" className="animate-ping" />
            {/* Amber Laser Sweep Bar */}
            <line x1="44" y1="54" x2="76" y2="54" stroke="#f59e0b" strokeWidth="1.5" opacity="0.8" className="animate-pulse" />
          </g>
        )}

        {/* AI_ALERT: Sharp crimson-tinted neural visor, warning waveforms pulsing across chin piece */}
        {isAlert && (
          <g>
            {/* Flashing chevrons flanking helmet */}
            <path d="M 25 52 L 21 58 L 25 64" stroke="#ff0055" strokeWidth="2" fill="none" className="animate-ping" />
            <path d="M 95 52 L 99 58 L 95 64" stroke="#ff0055" strokeWidth="2" fill="none" className="animate-ping" />
            {/* Sharp Angled Crimson Ocular Lenses */}
            <polygon points="46,55 58,58 47,62" fill="#ff0055" filter="url(#glow_rose)" />
            <polygon points="74,55 62,58 73,62" fill="#ff0055" filter="url(#glow_rose)" />
            {/* Warning Waveforms Across Chin Piece */}
            <path
              d="M 44 80 L 49 80 L 52 74 L 56 86 L 60 76 L 64 84 L 68 80 L 76 80"
              fill="none"
              stroke="#ff0055"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-pulse"
              filter="url(#glow_rose)"
            />
            {/* Pulsing Alert Chevrons on Forehead */}
            <polygon points="56,36 60,32 64,36" fill="#ff0055" className="animate-pulse" />
          </g>
        )}

        {/* OPERATIVE_EMPOWERED: Emerald bio-luminescent glow, active energy conduits running up suit */}
        {isEmpowered && (
          <g>
            {/* Blazing Twin Diamond Ocular Optics */}
            <polygon points="53,53 58,58 53,63 48,58" fill="#00ffaa" filter="url(#glow_emerald)" />
            <polygon points="67,53 72,58 67,63 62,58" fill="#00ffaa" filter="url(#glow_emerald)" />
            <circle cx="53" cy="58" r="1.5" fill="#ffffff" />
            <circle cx="67" cy="58" r="1.5" fill="#ffffff" />
            {/* Ascending Spark Nodes */}
            <circle cx="46" cy="40" r="1.5" fill="#34d399" className="animate-ping" />
            <circle cx="74" cy="40" r="1.5" fill="#34d399" className="animate-ping" />
            <circle cx="60" cy="22" r="2" fill="#00ffaa" className="animate-pulse" filter="url(#glow_emerald)" />
            {/* Forehead Crest Shield */}
            <polygon points="60,30 64,36 60,42 56,36" fill="#10b981" opacity="0.8" />
          </g>
        )}

        {/* Top-Right Holographic Online Status LED */}
        <circle cx="106" cy="14" r="2.5" fill={primaryColor} className="animate-ping" />
        <circle cx="106" cy="14" r="2.5" fill={primaryColor} />
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component: AthleteMind Multi-Exercise & 3D Clinician Engine
// ---------------------------------------------------------------------------

export default function AthleteMindPage() {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const [scriptReady, setScriptReady] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [aiAudioGuidance, setAiAudioGuidance] = useState(true);
  const aiAudioGuidanceRef = useRef(true);
  const lastFaultTypeRef = useRef<string | null>(null);
  const faultRepeatCountRef = useRef<number>(0);
  const lastFaultEpisodeTimeRef = useRef<number>(0);
  const lastAiCoachCallTimeRef = useRef<number>(0);
  const recentFaultsListRef = useRef<string[]>([]);
  const repCountRef = useRef<number>(0);
  const holdDurationsRef = useRef<number[]>([]);

  useEffect(() => {
    aiAudioGuidanceRef.current = aiAudioGuidance;
  }, [aiAudioGuidance]);

  // Exercise & Difficulty Configuration
  const [exercise, setExercise] = useState<ExerciseType>("squats");
  const [selectedExercise, setSelectedExercise] = useState<string>("squats");
  const activeExerciseRef = useRef<string>("squats");
  const [difficulty, setDifficulty] = useState<DifficultyType>("standard");
  const [orientationView, setOrientationView] = useState<string>("front");
  const [activeProfile, setActiveProfile] = useState<"SIDE" | "FRONT">("FRONT");
  const [profileMetricValue, setProfileMetricValue] = useState<number>(0);
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);

  // Dynamic Joint Angle Tracking
  const [primaryAngle, setPrimaryAngle] = useState(180);
  const [primaryAngleName, setPrimaryAngleName] = useState("Knee");
  const [secondaryAngle, setSecondaryAngle] = useState(180);
  const [secondaryAngleName, setSecondaryAngleName] = useState("Hip");
  const [activeJointIdx, setActiveJointIdx] = useState(25);
  const [faultJointIndices, setFaultJointIndices] = useState<number[]>([]);

  // Dynamically Dispatched Exercise HUD Variables
  const [currentDisplayAngle, setCurrentDisplayAngle] = useState<number>(180);
  const [isHolding, setIsHolding] = useState<boolean>(false);
  const [isDepthTargetMet, setIsDepthTargetMet] = useState<boolean>(false);
  const [hasFault, setHasFault] = useState<boolean>(false);
  const [faultFeedback, setFaultFeedback] = useState<string>("");

  // Combat State
  const [playerHp, setPlayerHp] = useState(100);
  const playerHpRef = useRef(100);
  const [bossHp, setBossHp] = useState(500);
  const [bossMaxHp, setBossMaxHp] = useState(500);
  const [bossAttackTimer, setBossAttackTimer] = useState(10.0);
  const [overheatMeter, setOverheatMeter] = useState(0);
  const [stunTimer, setStunTimer] = useState(0);
  const [isStunned, setIsStunned] = useState(false);

  // Phase 6: Arcade Combat & Mechanics
  const [bossState, setBossState] = useState<"STANDARD" | "ENRAGED" | "DEFEATED">("STANDARD");
  const [comboStreak, setComboStreak] = useState(0);
  const [comboMultiplier, setComboMultiplier] = useState(1.0);
  const [incomingAttack, setIncomingAttack] = useState(false);
  const [parryWindowSec, setParryWindowSec] = useState(0.0);
  const [screenGlitch, setScreenGlitch] = useState(false);

  const isEnraged = bossState === "ENRAGED" || (bossHp > 0 && bossHp <= bossMaxHp * 0.5);

  // Kinematics & Metrics
  const [repCount, setRepCount] = useState(0);
  const [formPurity, setFormPurity] = useState(100);
  const [holdProgress, setHoldProgress] = useState(0);
  const [targetHoldDuration, setTargetHoldDuration] = useState(1.0);

  // Banner
  const [combatBanner, setCombatBanner] = useState("READY • POSITION BODY");
  const [combatBannerType, setCombatBannerType] = useState<"WAITING" | "HOLD" | "CRIT" | "EGO_LIFT" | "FAULT">("WAITING");

  // Game Flow & Clinician Modal
  const [matchStatus, setMatchStatus] = useState<"ACTIVE" | "VICTORY" | "DEFEAT">("ACTIVE");
  const [showClinicianModal, setShowClinicianModal] = useState(false);
  const [battleStartTime, setBattleStartTime] = useState<number>(Date.now());

  // Shield Capacitor, Rep Recalibration & Ship Integrity Mechanics
  const [isShieldActiveState, setIsShieldActiveState] = useState(false);
  const [repCycleStatus, setRepCycleStatus] = useState<"STAND_READY" | "HOLDING" | "STAND_UP_TO_RECHARGE">("STAND_READY");
  const [flexibilityTolerance, setFlexibilityTolerance] = useState<number>(20);
  const [isShipExploding, setIsShipExploding] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);

  // Clinician Telemetry History
  const [angleTrace, setAngleTrace] = useState<AngleSample[]>([]);
  const [repDetails, setRepDetails] = useState<RepDetail[]>([]);
  const [valgusCount, setValgusCount] = useState(0);
  const [egoLiftsCount, setEgoLiftsCount] = useState(0);
  const [postureFaultsCount, setPostureFaultsCount] = useState(0);
  const [minSessionAngle, setMinSessionAngle] = useState(180);
  const [holdDurations, setHoldDurations] = useState<number[]>([]);

  // Phase 7: Loadout Vault & Customization
  const [vault, setVault] = useState<VaultData>(DEFAULT_VAULT);
  const [showVaultModal, setShowVaultModal] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [earnedCoresNotice, setEarnedCoresNotice] = useState<number | null>(null);

  // Phase 7: Progressive Encounter Modifiers (Mutators)
  const [modifiers, setModifiers] = useState<string[]>([]);
  const modifiersRef = useRef<string[]>([]);

  // Phase 7: Global Bounty Leaderboard & Tension Telemetry
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [callsign, setCallsign] = useState("OPERATOR_01");
  const [isSubmittingLeaderboard, setIsSubmittingLeaderboard] = useState(false);
  const [leaderboardStatus, setLeaderboardStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [totalTensionTimeSec, setTotalTensionTimeSec] = useState(0);

  // Phase 8: Clinical Mastery Reward Loop & Dedicated Progress Comparison Suite
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [bioCredits, setBioCredits] = useState<number>(350);
  const [romToast, setRomToast] = useState<string | null>(null);
  const [isRestDay, setIsRestDay] = useState(false);
  const [recoveryHistory, setRecoveryHistory] = useState<RecoverySession[]>(SEED_RECOVERY_HISTORY);
  const [baselineSession, setBaselineSession] = useState<RecoverySession>(DEFAULT_BASELINE_SESSION);
  const [clinicalBadges, setClinicalBadges] = useState<ClinicalBadge[]>(DEFAULT_CLINICAL_BADGES);
  const [adherence, setAdherence] = useState<AdherenceData>(DEFAULT_ADHERENCE);

  // Campaign State Machine & Interactive Calibration
  const [gameStage, setGameStage] = useState<CampaignStage>("PROLOGUE");
  const [deflectionsCompleted, setDeflectionsCompleted] = useState<number>(0);
  const [deflectionsTarget, setDeflectionsTarget] = useState<number>(8);
  const [shieldTestHoldProgress, setShieldTestHoldProgress] = useState<number>(0);
  const [bossIntroCountdown, setBossIntroCountdown] = useState<number>(3);
  const [armCalibrationVerified, setArmCalibrationVerified] = useState(false);
  const [stanceCalibrationVerified, setStanceCalibrationVerified] = useState(false);

  // Arcade Visual-Novel Exposition Engine State
  const [activeDialogueId, setActiveDialogueId] = useState<number | null>(1);
  const activeDialogueIdRef = useRef<number | null>(1);
  const currentSlide = STORY_SCRIPT.find((s) => s.id === activeDialogueId) || null;

  // Active Menu View State
  const [activeView, setActiveView] = useState<ActiveView>("MAIN_MENU");
  const [activeCircuitMode, setActiveCircuitMode] = useState<CircuitMode | null>(null);
  const [circuitStep, setCircuitStep] = useState<number>(1);

  // 10-Achievement System State
  const [achievementsList, setAchievementsList] = useState<AchievementItem[]>(INITIAL_ACHIEVEMENTS);

  // Camera & Hardware Diagnostics State
  const [currentFps, setCurrentFps] = useState<number>(60);
  const fpsRef = useRef<number>(60);
  const lastFrameTimeRef = useRef<number>(0);
  const lastDiagnosticUpdateRef = useRef<number>(0);
  const [jointVisibility, setJointVisibility] = useState({
    hips: 0.95,
    knees: 0.92,
    ankles: 0.88,
    shoulders: 0.96,
    overall: 0.93,
  });
  const [distanceStatus, setDistanceStatus] = useState<"OPTIMAL" | "TOO_CLOSE" | "TOO_FAR" | "SEARCHING">("SEARCHING");

  // DOM References
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Engine Refs
  const landmarksRef = useRef<any>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const poseInstanceRef = useRef<any>(null);
  const isProcessingPoseRef = useRef(false);
  const animFrameIdRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const screenShakeRef = useRef(0);
  const lastHoldTickTimeRef = useRef(0);
  const lastTraceSampleTimeRef = useRef(0);
  const lastSpeechTimeRef = useRef(0);

  // Clinical Mastery & Kinetic Charge Refs (Decoupled from 60FPS React re-renders)
  const descentStartTimeRef = useRef<number | null>(null);
  const isDescentControlledRef = useRef(false);
  const descentEvaluatedRef = useRef(false);
  const descentWarningTimerRef = useRef(0);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const shockwaveTriggeredForHoldRef = useRef(false);
  const recoveryHistoryRef = useRef<RecoverySession[]>(SEED_RECOVERY_HISTORY);
  const baselineSessionRef = useRef<RecoverySession>(DEFAULT_BASELINE_SESSION);
  const bioCreditsRef = useRef<number>(350);
  const isRestDayRef = useRef(false);

  // Fast-Access Refs for Campaign & Interactive Calibration
  const gameStageRef = useRef<CampaignStage>("PROLOGUE");
  const projectilesRef = useRef<KineticProjectile[]>([]);
  const asteroidImgRef = useRef<HTMLImageElement | null>(null);
  const nextProjectileTimeRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const img = new Image();
      img.src = "/asteroid.png";
      asteroidImgRef.current = img;
    }
  }, []);
  const hitStopUntilRef = useRef<number>(0);
  const shieldBreachFlashRef = useRef<number>(0);
  const calibrationGreenFlashRef = useRef<number>(0);
  const pauseStartTimeRef = useRef<number>(0);
  const totalPausedDurationRef = useRef<number>(0);
  const deflectionsCompletedRef = useRef<number>(0);

  // Interactive Calibration Tracking Refs
  const calibrationArmFramesRef = useRef<number>(0);
  const calibrationStanceFramesRef = useRef<number>(0);
  const calibrationShieldHoldSecRef = useRef<number>(0);
  const bossIntroStartTimeRef = useRef<number>(0);
  const lastBossAlarmSecRef = useRef<number>(-1);

  // Fast access mirrors
  const primaryAngleRef = useRef(180);
  const holdProgressRef = useRef(0);
  const isStunnedRef = useRef(false);
  const isEnragedRef = useRef(false);
  const activeJointIdxRef = useRef(25);
  const faultJointIndicesRef = useRef<number[]>([]);
  const exerciseRef = useRef<ExerciseType>("squats");
  const difficultyRef = useRef<DifficultyType>("standard");
  const activeShaderRef = useRef<SkeletalShader>("cyberpunk");
  const vaultRef = useRef<VaultData>(DEFAULT_VAULT);

  // Shield capacitor & rep-gated defense refs
  const shieldCapacitorChargedRef = useRef<boolean>(true);
  const hasStoodUpSinceDeflectRef = useRef<boolean>(true);
  const isSquatHoldingRef = useRef<boolean>(false);
  const shieldActiveRef = useRef<boolean>(false);
  const repCycleStatusRef = useRef<"STAND_READY" | "HOLDING" | "STAND_UP_TO_RECHARGE">("STAND_READY");
  const flexibilityToleranceRef = useRef<number>(20);
  const isShipExplodingRef = useRef<boolean>(false);

  useEffect(() => {
    isEnragedRef.current = isEnraged;
  }, [isEnraged]);

  useEffect(() => {
    activeExerciseRef.current = selectedExercise;
    exerciseRef.current = selectedExercise as ExerciseType;
    if (exercise !== selectedExercise) {
      setExercise(selectedExercise as ExerciseType);
    }
  }, [selectedExercise, exercise]);

  useEffect(() => {
    if (exercise !== selectedExercise) {
      setSelectedExercise(exercise);
      activeExerciseRef.current = exercise;
      exerciseRef.current = exercise;
    }
  }, [exercise, selectedExercise]);

  useEffect(() => {
    difficultyRef.current = difficulty;
  }, [difficulty]);

  useEffect(() => {
    modifiersRef.current = modifiers;
  }, [modifiers]);

  useEffect(() => {
    isRestDayRef.current = isRestDay;
  }, [isRestDay]);

  useEffect(() => {
    bioCreditsRef.current = bioCredits;
  }, [bioCredits]);

  useEffect(() => {
    recoveryHistoryRef.current = recoveryHistory;
  }, [recoveryHistory]);

  useEffect(() => {
    gameStageRef.current = gameStage;
  }, [gameStage]);

  useEffect(() => {
    deflectionsCompletedRef.current = deflectionsCompleted;
  }, [deflectionsCompleted]);

  useEffect(() => {
    activeDialogueIdRef.current = activeDialogueId;
  }, [activeDialogueId]);

  const activeCircuitModeRef = useRef<CircuitMode | null>(null);
  const circuitStepRef = useRef<number>(1);

  useEffect(() => {
    activeCircuitModeRef.current = activeCircuitMode;
  }, [activeCircuitMode]);

  useEffect(() => {
    circuitStepRef.current = circuitStep;
  }, [circuitStep]);

  useEffect(() => {
    repCountRef.current = repCount;
  }, [repCount]);

  useEffect(() => {
    holdDurationsRef.current = holdDurations;
  }, [holdDurations]);

  // Load vault, callsign, and clinical history on mount
  useEffect(() => {
    try {
      const savedVault = localStorage.getItem("athletemind_vault");
      if (savedVault) {
        const parsed: VaultData = JSON.parse(savedVault);
        setVault((prev) => ({ ...prev, ...parsed }));
        vaultRef.current = { ...DEFAULT_VAULT, ...parsed };
        if (parsed.activeSoundpack) {
          synth.soundpack = parsed.activeSoundpack;
        }
        if (parsed.activeShader) {
          activeShaderRef.current = parsed.activeShader;
        }
      }
      const savedCallsign = localStorage.getItem("athletemind_callsign");
      if (savedCallsign) setCallsign(savedCallsign);

      // Load Recovery History & Clinical Telemetry
      const savedHistory = localStorage.getItem("athletemind_recovery_history");
      if (savedHistory) {
        const parsedHist: RecoverySession[] = JSON.parse(savedHistory);
        if (Array.isArray(parsedHist) && parsedHist.length > 0) {
          setRecoveryHistory(parsedHist);
          recoveryHistoryRef.current = parsedHist;
        }
      } else {
        localStorage.setItem("athletemind_recovery_history", JSON.stringify(SEED_RECOVERY_HISTORY));
      }

      const savedBaseline = localStorage.getItem("athletemind_baseline_session");
      if (savedBaseline) {
        const parsedBase: RecoverySession = JSON.parse(savedBaseline);
        setBaselineSession(parsedBase);
        baselineSessionRef.current = parsedBase;
      } else {
        localStorage.setItem("athletemind_baseline_session", JSON.stringify(DEFAULT_BASELINE_SESSION));
      }

      const savedBadges = localStorage.getItem("athletemind_badges");
      if (savedBadges) {
        const parsedBadges: ClinicalBadge[] = JSON.parse(savedBadges);
        setClinicalBadges(parsedBadges);
      } else {
        localStorage.setItem("athletemind_badges", JSON.stringify(DEFAULT_CLINICAL_BADGES));
      }

      const savedAdherence = localStorage.getItem("athletemind_adherence");
      if (savedAdherence) {
        const parsedAdh: AdherenceData = JSON.parse(savedAdherence);
        setAdherence(parsedAdh);
        setIsRestDay(parsedAdh.restDayActive || false);
        isRestDayRef.current = parsedAdh.restDayActive || false;
      } else {
        localStorage.setItem("athletemind_adherence", JSON.stringify(DEFAULT_ADHERENCE));
      }

      const savedCredits = localStorage.getItem("athletemind_bio_credits");
      if (savedCredits) {
        const creds = parseInt(savedCredits, 10);
        if (!isNaN(creds)) {
          setBioCredits(creds);
          bioCreditsRef.current = creds;
        }
      } else {
        localStorage.setItem("athletemind_bio_credits", "350");
      }

      // Load Achievements
      const savedAchievements = localStorage.getItem("unlocked_achievements");
      if (savedAchievements) {
        const parsedAch: AchievementItem[] = JSON.parse(savedAchievements);
        if (Array.isArray(parsedAch) && parsedAch.length > 0) {
          setAchievementsList(parsedAch);
        }
      } else {
        localStorage.setItem("unlocked_achievements", JSON.stringify(INITIAL_ACHIEVEMENTS));
      }
    } catch {}
  }, []);

  const updateVault = useCallback((newVault: VaultData) => {
    setVault(newVault);
    vaultRef.current = newVault;
    activeShaderRef.current = newVault.activeShader;
    synth.soundpack = newVault.activeSoundpack;
    try {
      localStorage.setItem("athletemind_vault", JSON.stringify(newVault));
    } catch {}
  }, []);

  const fetchLeaderboard = useCallback(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/pose";
    const httpUrl = wsUrl.replace(/^wss?:/, (m) => (m === "wss:" ? "https:" : "http:")).replace(/\/ws\/pose$/, "");
    fetch(`${httpUrl}/api/leaderboard`)
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.leaderboard)) {
          setLeaderboard(data.leaderboard);
        }
      })
      .catch((err) => console.warn("Leaderboard fetch error:", err));
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const handleBuyOrEquipShader = (shaderKey: SkeletalShader) => {
    const current = vaultRef.current;
    if (current.unlockedShaders.includes(shaderKey)) {
      updateVault({ ...current, activeShader: shaderKey });
      speakCoachCue(`${SHADER_CONFIGS[shaderKey].name} shader activated`);
      return;
    }
    const cost = SHADER_CONFIGS[shaderKey].cost;
    if (current.energyCores >= cost) {
      updateVault({
        ...current,
        energyCores: current.energyCores - cost,
        unlockedShaders: [...current.unlockedShaders, shaderKey],
        activeShader: shaderKey,
      });
      speakCoachCue(`${SHADER_CONFIGS[shaderKey].name} unlocked and equipped`);
    } else {
      speakCoachCue("Insufficient energy cores");
    }
  };

  const handleBuyOrEquipSoundpack = (soundKey: Soundpack) => {
    const current = vaultRef.current;
    if (current.unlockedSoundpacks.includes(soundKey)) {
      updateVault({ ...current, activeSoundpack: soundKey });
      speakCoachCue(`${soundKey.replace("_", " ")} soundpack equipped`);
      return;
    }
    const cost = soundKey === "heavy_mecha" ? 200 : 0;
    if (current.energyCores >= cost) {
      updateVault({
        ...current,
        energyCores: current.energyCores - cost,
        unlockedSoundpacks: [...current.unlockedSoundpacks, soundKey],
        activeSoundpack: soundKey,
      });
      speakCoachCue("Heavy mecha soundpack unlocked and equipped");
    } else {
      speakCoachCue("Insufficient energy cores");
    }
  };

  const handleSelectTheme = (themeKey: WireframeTheme) => {
    const current = vaultRef.current;
    updateVault({ ...current, activeTheme: themeKey });
    speakCoachCue(`${THEME_STYLES[themeKey].name} theme engaged`);
  };

  const handleToggleModifier = (mod: string) => {
    setModifiers((prev) => {
      const next = prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod];
      modifiersRef.current = next;

      // Update boss HP if ENDURANCE_GAUNTLET
      const maxHp = next.includes("ENDURANCE_GAUNTLET") ? 1000 : 500;
      setBossMaxHp(maxHp);
      if (next.includes("ENDURANCE_GAUNTLET") && bossHp <= 500) {
        setBossHp(1000);
      } else if (!next.includes("ENDURANCE_GAUNTLET") && bossHp > 500) {
        setBossHp(500);
      }

      // Update hold target duration if HYPER_TENSION
      if (next.includes("HYPER_TENSION")) {
        setTargetHoldDuration(3.0);
      } else {
        setTargetHoldDuration(difficultyRef.current === "rehab" ? 0.8 : difficultyRef.current === "athlete" ? 1.5 : 1.0);
      }

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            action: "set_exercise",
            exercise_type: exerciseRef.current,
            difficulty: difficultyRef.current,
            modifiers: next,
          })
        );
      }
      speakCoachCue(`Modifier ${mod.replace("_", " ")} ${next.includes(mod) ? "engaged" : "disengaged"}`);
      return next;
    });
  };

  const handleSubmitLeaderboard = async () => {
    if (!callsign.trim()) return;
    setIsSubmittingLeaderboard(true);
    setLeaderboardStatus(null);
    try {
      localStorage.setItem("athletemind_callsign", callsign.trim().toUpperCase());
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/pose";
      const httpUrl = wsUrl.replace(/^wss?:/, (m) => (m === "wss:" ? "https:" : "http:")).replace(/\/ws\/pose$/, "");
      const durationSec = Number(((Date.now() - battleStartTime) / 1000).toFixed(1));

      const res = await fetch(`${httpUrl}/api/leaderboard/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operator_name: callsign.trim().toUpperCase(),
          boss_clear_time_sec: durationSec,
          form_purity_score: formPurity,
          total_tension_time_sec: Number(totalTensionTimeSec.toFixed(1)),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLeaderboardStatus({
          type: "error",
          msg: data.detail || "DISQUALIFIED: Form Purity < 70% threshold required for leaderboard ranking.",
        });
      } else {
        setLeaderboardStatus({
          type: "success",
          msg: `TRANSMITTED! Rank #${data.rank} • Bounty Score: ${data.entry.bounty_score} [Grade ${data.entry.purity_grade}]`,
        });
        fetchLeaderboard();
      }
    } catch {
      setLeaderboardStatus({
        type: "error",
        msg: "Failed to connect to Leaderboard Telemetry Matrix.",
      });
    } finally {
      setIsSubmittingLeaderboard(false);
    }
  };

  // Real-Time Audio Biomechanical Coach (Browser SpeechSynthesis API with 3s cooldown)
  const speakCoachCue = useCallback((cue: string) => {
    if (!cue || synth.muted || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const now = Date.now();
    if (now - lastSpeechTimeRef.current < 3000) return; // 3-second cooldown throttle

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cue);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = 0.9;
      window.speechSynthesis.speak(utterance);
      lastSpeechTimeRef.current = now;
    } catch {
      // safe
    }
  }, []);

  const spawnParticles = useCallback((cx: number, cy: number, count = 25, color = "#00f0ff") => {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = 2.5 + Math.random() * 5.0;
      particlesRef.current.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        radius: 2.5 + Math.random() * 2.5,
        alpha: 1.0,
        life: 0,
        maxLife: 30 + Math.random() * 15,
      });
    }
  }, []);

  const spawnFloatingText = useCallback((text: string, x: number, y: number, color = "#ffd700", fontSize = 30) => {
    floatingTextsRef.current.push({
      id: Math.random().toString(),
      text,
      x,
      y,
      color,
      fontSize,
      opacity: 1.0,
      life: 0,
      maxLife: 45,
    });
  }, []);

  // Exercise Change Handler
  const handleSelectExercise = (newEx: string | ExerciseType) => {
    const exType = newEx as ExerciseType;
    setExercise(exType);
    setSelectedExercise(newEx);
    activeExerciseRef.current = newEx;
    exerciseRef.current = exType;
    const config = EXERCISE_REGISTRY[newEx] || getExerciseConfig(newEx);
    setPrimaryAngleName(config.primaryAngleName);
    setSecondaryAngleName(config.secondaryAngleName);
    setActiveJointIdx(config.defaultActiveJointIndex);
    activeJointIdxRef.current = config.defaultActiveJointIndex;
    setTargetHoldDuration(config.deflectionHoldTime);
    setHoldProgress(0);
    holdProgressRef.current = 0;
    setIsDepthTargetMet(false);
    setIsHolding(false);
    setHasFault(false);
    setFaultFeedback("");

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          action: "set_exercise",
          exercise_type: newEx,
          difficulty: difficultyRef.current,
          modifiers: modifiersRef.current,
        })
      );
    }
    speakCoachCue(`Switched protocol to ${config.name}`);
  };

  // Difficulty Change Handler
  const handleSelectDifficulty = (newDiff: DifficultyType) => {
    setDifficulty(newDiff);
    difficultyRef.current = newDiff;
    if (modifiersRef.current.includes("HYPER_TENSION")) {
      setTargetHoldDuration(3.0);
    } else {
      setTargetHoldDuration(newDiff === "rehab" ? 0.8 : newDiff === "athlete" ? 1.5 : 1.0);
    }
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          action: "set_exercise",
          exercise_type: exerciseRef.current,
          difficulty: newDiff,
          modifiers: modifiersRef.current,
        })
      );
    }
    speakCoachCue(`${newDiff} mode activated`);
  };

  // Reset Session
  const handleResetCombat = useCallback(() => {
    const targetMaxHp = modifiersRef.current.includes("ENDURANCE_GAUNTLET") ? 1000 : 500;
    playerHpRef.current = 100;
    setPlayerHp(100);
    setBossMaxHp(targetMaxHp);
    setBossHp(targetMaxHp);
    setOverheatMeter(0);
    setStunTimer(0);
    setIsStunned(false);
    setRepCount(0);
    setFormPurity(100);
    setPrimaryAngle(180);
    setSecondaryAngle(180);
    setHoldProgress(0);
    setBossAttackTimer(10.0);
    setCombatBanner("READY • COMMENCE EXERCISE");
    setCombatBannerType("WAITING");
    setMatchStatus("ACTIVE");
    setShowClinicianModal(false);
    setBattleStartTime(Date.now());
    setValgusCount(0);
    setEgoLiftsCount(0);
    setPostureFaultsCount(0);
    setMinSessionAngle(180);
    setAngleTrace([]);
    setRepDetails([]);
    setHoldDurations([]);
    setTotalTensionTimeSec(0);
    setEarnedCoresNotice(null);
    setLeaderboardStatus(null);

    primaryAngleRef.current = 180;
    holdProgressRef.current = 0;
    isStunnedRef.current = false;
    particlesRef.current = [];
    floatingTextsRef.current = [];

    // Reset Shield Capacitor & Ship Integrity Game Over
    setIsGameOver(false);
    setIsShipExploding(false);
    isShipExplodingRef.current = false;
    shieldCapacitorChargedRef.current = true;
    hasStoodUpSinceDeflectRef.current = true;
    isSquatHoldingRef.current = false;
    shieldActiveRef.current = false;
    setIsShieldActiveState(false);
    repCycleStatusRef.current = "STAND_READY";
    setRepCycleStatus("STAND_READY");

    // Reset Phase 6 Arcade Combat State
    setBossState("STANDARD");
    setComboStreak(0);
    setComboMultiplier(1.0);
    setIncomingAttack(false);
    setParryWindowSec(0.0);
    setScreenGlitch(false);

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: "reset" }));
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/pose";
    const httpUrl = wsUrl.replace(/^wss?:/, (m) => (m === "wss:" ? "https:" : "http:")).replace(/\/ws\/pose$/, "");
    fetch(`${httpUrl}/api/session-reset`, { method: "POST" }).catch(() => {});
  }, []);

  const triggerShipExplosion = useCallback(() => {
    if (isShipExplodingRef.current) return;
    isShipExplodingRef.current = true;
    setIsShipExploding(true);
    shieldActiveRef.current = false;
    setIsShieldActiveState(false);
    screenShakeRef.current = 15;
    synth.playShipExplosion();
    synth.playDefeat();
    speakCoachCue("Critical integrity failure! Vessel destroyed!");

    setTimeout(() => {
      setIsShipExploding(false);
      isShipExplodingRef.current = false;
      setIsGameOver(true);
      setMatchStatus("DEFEAT");
    }, 1800);
  }, [speakCoachCue]);

  const handleToggleMute = () => {
    synth.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // Download Clinical Telemetry CSV
  const handleDownloadCsv = () => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/pose";
    const httpUrl = wsUrl.replace(/^wss?:/, (m) => (m === "wss:" ? "https:" : "http:")).replace(/\/ws\/pose$/, "");

    fetch(`${httpUrl}/api/export-report`)
      .then((res) => {
        if (!res.ok) throw new Error("HTTP error");
        return res.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `athletemind_${exercise}_telemetry.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch(() => {
        // Fallback: Client-Side CSV generation
        const headers = ["Rep_Index", "Exercise", "Min_Angle_Deg", "Hold_Duration_s", "Purity_Score_Pct", "Quality_Verdict", "Faults", "Timestamp"];
        const rows = repDetails.map((r) => [
          r.repIndex,
          r.exercise,
          r.minAngle,
          r.holdDuration,
          r.purityScore,
          r.verdict,
          r.faults,
          r.timestamp,
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `athletemind_${exercise}_telemetry.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
  };

  // Phase 8: Record Session Metrics to Clinical History & Evaluate Badges
  const recordSessionAndEvaluateBadges = useCallback(() => {
    if (repCount === 0) return;
    const sessionDate = new Date().toISOString().split("T")[0];
    const avgDepth = minSessionAngle < 180 ? minSessionAngle : 90;
    const maxHold = holdDurations.length > 0 ? Math.max(...holdDurations) : targetHoldDuration;
    const totalHold = holdDurations.reduce((a, b) => a + b, 0);

    const newSession: RecoverySession = {
      id: `rec_${Date.now()}`,
      date: sessionDate,
      avgDepthAngle: avgDepth,
      maxHoldDuration: Number(maxHold.toFixed(1)),
      valgusEvents: valgusCount,
      stabilityScore: formPurity,
      repsCompleted: repCount,
      exerciseId: exerciseRef.current,
    };

    setRecoveryHistory((prev) => {
      const updated = [...prev, newSession];
      recoveryHistoryRef.current = updated;
      try {
        localStorage.setItem("athletemind_recovery_history", JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Update Adherence Record
    setAdherence((prev) => {
      const updated: AdherenceData = {
        ...prev,
        lastSessionDate: sessionDate,
        totalSessions: prev.totalSessions + 1,
        streakDays: prev.lastSessionDate === sessionDate ? prev.streakDays : prev.streakDays + 1,
      };
      try {
        localStorage.setItem("athletemind_adherence", JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Evaluate Clinical Mastery Badges
    setClinicalBadges((prevBadges) => {
      const updated = prevBadges.map((b) => {
        if (b.unlocked) return b;
        let unlocked = false;
        if (b.id === "tendon_vanguard" && valgusCount === 0 && repCount >= 5) {
          unlocked = true;
        } else if (b.id === "static_anchor" && totalHold >= 20) {
          unlocked = true;
        } else if (b.id === "kinetic_symmetry" && formPurity >= 90 && repCount >= 5) {
          unlocked = true;
        }
        if (unlocked) {
          synth.playHarmonicChord();
          return { ...b, unlocked: true, unlockedAt: sessionDate };
        }
        return b;
      });
      try {
        localStorage.setItem("athletemind_badges", JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Evaluate 10-Achievement System
    setAchievementsList((prevAchs) => {
      const updated = prevAchs.map((ach) => {
        if (ach.unlocked) return ach;
        let unlocked = false;
        let newProgress = ach.currentProgress;

        if (ach.id === "first_blood") {
          newProgress = 1;
          unlocked = true;
        } else if (ach.id === "centurion_1") {
          newProgress = Math.min(ach.maxProgress, ach.currentProgress + repCount);
          if (newProgress >= 50) unlocked = true;
        } else if (ach.id === "centurion_2") {
          newProgress = Math.min(ach.maxProgress, ach.currentProgress + repCount);
          if (newProgress >= 100) unlocked = true;
        } else if (ach.id === "iron_tendons" && valgusCount === 0 && repCount >= 5) {
          newProgress = 1;
          unlocked = true;
        } else if (ach.id === "zen_anchor") {
          newProgress = Math.min(ach.maxProgress, Math.round(ach.currentProgress + totalHold));
          if (newProgress >= 30) unlocked = true;
        } else if (ach.id === "unbroken_rhythm") {
          newProgress = Math.min(ach.maxProgress, Math.max(ach.currentProgress, comboStreak));
          if (newProgress >= 5) unlocked = true;
        } else if (ach.id === "bilateral_master" && formPurity >= 95 && repCount >= 5) {
          newProgress = 1.6;
          unlocked = true;
        } else if (ach.id === "pushup_pioneer" && (exercise === "pushups" || exercise === "wall_pushup")) {
          newProgress = Math.min(ach.maxProgress, Math.max(ach.currentProgress, repCount));
          if (newProgress >= 10) unlocked = true;
        } else if (ach.id === "relentless_adherence") {
          newProgress = Math.min(ach.maxProgress, Math.max(ach.currentProgress, (adherence?.streakDays || 1)));
          if (newProgress >= 7) unlocked = true;
        } else if (ach.id === "clinical_graduation" && avgDepth <= 90 && formPurity >= 95) {
          newProgress = Math.min(ach.maxProgress, ach.currentProgress + 1);
          if (newProgress >= 5) unlocked = true;
        }

        if (unlocked) {
          synth.playHarmonicChord();
          return {
            ...ach,
            unlocked: true,
            currentProgress: newProgress,
            unlockedAt: sessionDate,
          };
        }
        return { ...ach, currentProgress: newProgress };
      });

      try {
        localStorage.setItem("unlocked_achievements", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, [repCount, minSessionAngle, holdDurations, targetHoldDuration, valgusCount, formPurity, comboStreak, exercise, adherence]);

  // Rest-Day Mode Toggle (Locks Combat Hazards, Preserves Daily Streak)
  const handleToggleRestDay = () => {
    setIsRestDay((prev) => {
      const next = !prev;
      isRestDayRef.current = next;
      setAdherence((adh) => {
        const updated = {
          ...adh,
          restDayActive: next,
          restDaysTaken: next ? adh.restDaysTaken + 1 : adh.restDaysTaken,
        };
        try {
          localStorage.setItem("athletemind_adherence", JSON.stringify(updated));
        } catch {}
        return updated;
      });
      speakCoachCue(next ? "System regeneration active. Rest day protocol engaged." : "Combat protocol engaged.");
      return next;
    });
  };

  // Clinician Telemetry Full CSV Export Action
  const handleExportClinicalCsv = () => {
    const headers = [
      "Date",
      "Session_ID",
      "Reps_Completed",
      "Avg_Depth_Angle_Deg",
      "Max_Hold_Duration_s",
      "Valgus_Events",
      "Stability_Score_Pct",
      "Rest_Day_Active"
    ];
    const rows = recoveryHistory.map((s) => [
      s.date,
      s.id,
      s.repsCompleted,
      s.avgDepthAngle,
      s.maxHoldDuration,
      s.valgusEvents,
      s.stabilityScore,
      isRestDay ? "YES" : "NO",
    ]);

    if (repCount > 0) {
      rows.push([
        new Date().toISOString().split("T")[0],
        `live_session_${Date.now()}`,
        repCount,
        minSessionAngle < 180 ? minSessionAngle : 90,
        holdDurations.length > 0 ? Math.max(...holdDurations) : targetHoldDuration,
        valgusCount,
        formPurity,
        isRestDay ? "YES" : "NO",
      ]);
    }

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `athletemind_clinical_telemetry_${callsign}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    speakCoachCue("Clinical telemetry CSV generated");
  };

  // ---------------------------------------------------------------------------
  // Navigation & Protocol Handlers
  // ---------------------------------------------------------------------------

  const handleResetAllData = useCallback(() => {
    try {
      localStorage.removeItem("athletemind_vault");
      localStorage.removeItem("athletemind_callsign");
      localStorage.removeItem("athletemind_recovery_history");
      localStorage.removeItem("athletemind_baseline_session");
      localStorage.removeItem("athletemind_badges");
      localStorage.removeItem("athletemind_adherence");
      localStorage.removeItem("athletemind_bio_credits");
      localStorage.removeItem("unlocked_achievements");
    } catch {}

    setVault(DEFAULT_VAULT);
    vaultRef.current = DEFAULT_VAULT;
    activeShaderRef.current = "cyberpunk";
    synth.soundpack = "arcade_synth";
    setRecoveryHistory(SEED_RECOVERY_HISTORY);
    recoveryHistoryRef.current = SEED_RECOVERY_HISTORY;
    setBaselineSession(DEFAULT_BASELINE_SESSION);
    baselineSessionRef.current = DEFAULT_BASELINE_SESSION;
    setClinicalBadges(DEFAULT_CLINICAL_BADGES);
    setAdherence(DEFAULT_ADHERENCE);
    setIsRestDay(false);
    isRestDayRef.current = false;
    setBioCredits(350);
    bioCreditsRef.current = 350;
    setAchievementsList(INITIAL_ACHIEVEMENTS);

    speakCoachCue("System purged. All clinical and combat data restored to baseline.");
  }, [speakCoachCue]);

  const handleLaunchCircuit = useCallback(
    (mode: CircuitMode) => {
      setActiveCircuitMode(mode);
      setCircuitStep(1);

      if (mode === "HYPER_TENSION") {
        setExercise("squats");
        setDifficulty("athlete");
        setTargetHoldDuration(2.0);
        setIsRestDay(false);
        speakCoachCue("Hyper-Tension Protocol engaged. 2.5s controlled eccentric with 2.0s pause.");
      } else if (mode === "FULL_BODY") {
        setExercise("squats");
        setDifficulty("standard");
        setTargetHoldDuration(1.0);
        setIsRestDay(false);
        speakCoachCue("Full-Body Kinetic Circuit engaged. Stage 1: 5 Squats.");
      } else if (mode === "REHAB_STABILITY") {
        setExercise("squats");
        setDifficulty("rehab");
        setTargetHoldDuration(1.5);
        speakCoachCue("Rehab Stability Protocol engaged. Pacing locked, strict alignment required.");
      }

      setActiveView("ARENA");
    },
    [speakCoachCue]
  );

  const getGiantBannerState = useCallback((): BannerState => {
    if (
      hasFault ||
      combatBannerType === "EGO_LIFT" ||
      combatBannerType === "FAULT" ||
      combatBanner.includes("EGO") ||
      combatBanner.includes("CAVE") ||
      combatBanner.includes("VALGUS") ||
      combatBanner.includes("PENALTY") ||
      combatBanner.includes("FAULT")
    ) {
      return "EGO_LIFT";
    }
    if (incomingAttack) {
      return "PARRY_ATTACK";
    }
    if (repCycleStatus === "STAND_UP_TO_RECHARGE") {
      return "STAND_UP";
    }
    if (isShieldActiveState || isHolding || (holdProgress > 0 && holdProgress < 1)) {
      return "HOLD_POSITION";
    }
    if (
      combatBannerType === "CRIT" ||
      combatBanner.includes("STAND") ||
      combatBanner.includes("DEFLECT") ||
      combatBanner.includes("COMPLETE")
    ) {
      return "STAND_UP";
    }
    return "SQUAT_DOWN";
  }, [hasFault, combatBannerType, combatBanner, incomingAttack, isHolding, holdProgress, isShieldActiveState, repCycleStatus]);

  // ---------------------------------------------------------------------------
  // Lifecycle Finite State Machine & Session Controls
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Campaign State Machine & Interactive Calibration Controls
  // ---------------------------------------------------------------------------

  const handleStartCampaign = useCallback(() => {
    synth.stopAmbientDrone();
    synth.playCalibrationPing();
    setActiveDialogueId(null);
    activeDialogueIdRef.current = null;
    setGameStage("CALIBRATION_ARMS");
    gameStageRef.current = "CALIBRATION_ARMS";
    calibrationArmFramesRef.current = 0;
    calibrationStanceFramesRef.current = 0;
    calibrationShieldHoldSecRef.current = 0;
    deflectionsCompletedRef.current = 0;
    setDeflectionsCompleted(0);
    projectilesRef.current = [];
    nextProjectileTimeRef.current = 0;
    speakCoachCue("Motor synchronization initialized. Raise both hands above shoulders to calibrate range.");

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: "set_stage", stage: "CALIBRATION_ARMS" }));
    }
  }, [speakCoachCue]);

  // Arcade Visual-Novel Exposition Engine Handlers
  const handleAdvanceDialogue = useCallback(() => {
    if (activeDialogueIdRef.current === null) return;
    synth.playCalibrationPing();

    const currentId = activeDialogueIdRef.current;
    if (currentId === 1) {
      // Scene 1 (Awakening) -> Scene 2 (Calibration Briefing)
      setActiveDialogueId(2);
      activeDialogueIdRef.current = 2;
      speakCoachCue("Calibration briefing. Range of motion verification across arms, full stance, and shield generation.");
    } else if (currentId === 2) {
      // Scene 2 -> Start Arm Calibration
      setActiveDialogueId(null);
      activeDialogueIdRef.current = null;
      handleStartCampaign();
    } else if (currentId === 3) {
      // Scene 3 (Pre-Battle Confrontation) -> Active Deflection Combat
      setActiveDialogueId(null);
      activeDialogueIdRef.current = null;
      setGameStage("ACTIVE_DEFLECTION");
      gameStageRef.current = "ACTIVE_DEFLECTION";
      nextProjectileTimeRef.current = performance.now() + 1500;
      synth.playShieldOptimalChime();
      speakCoachCue("Engage deflection shield! Deflect incoming shockwaves!");
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ action: "set_stage", stage: "ACTIVE_DEFLECTION" }));
      }
    } else if (currentId === 4) {
      // Scene 4 (Victory Resolution) -> Open Clinical Recovery Dossier
      setActiveDialogueId(null);
      activeDialogueIdRef.current = null;
      setShowProgressModal(true);
      speakCoachCue("Opening clinical recovery dossier.");
    }
  }, [handleStartCampaign, speakCoachCue]);

  const handleSkipDialogue = useCallback(() => {
    if (activeDialogueIdRef.current === null) return;
    synth.playCalibrationPing();
    const currentId = activeDialogueIdRef.current;

    if (currentId === 1 || currentId === 2) {
      setActiveDialogueId(null);
      activeDialogueIdRef.current = null;
      handleStartCampaign();
    } else if (currentId === 3) {
      setActiveDialogueId(null);
      activeDialogueIdRef.current = null;
      setGameStage("ACTIVE_DEFLECTION");
      gameStageRef.current = "ACTIVE_DEFLECTION";
      nextProjectileTimeRef.current = performance.now() + 1500;
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ action: "set_stage", stage: "ACTIVE_DEFLECTION" }));
      }
    } else if (currentId === 4) {
      setActiveDialogueId(null);
      activeDialogueIdRef.current = null;
      setShowProgressModal(true);
    }
  }, [handleStartCampaign]);

  const handleTogglePause = useCallback(() => {
    if (gameStageRef.current === "ACTIVE_DEFLECTION") {
      setGameStage("PAUSED");
      gameStageRef.current = "PAUSED";
      pauseStartTimeRef.current = performance.now();
      synth.playCalibrationBeep(false);
      speakCoachCue("Session paused. Take a breather.");

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ action: "set_stage", stage: "PAUSED" }));
      }
    } else if (gameStageRef.current === "PAUSED") {
      if (pauseStartTimeRef.current > 0) {
        const pausedDelta = performance.now() - pauseStartTimeRef.current;
        totalPausedDurationRef.current += pausedDelta;
        projectilesRef.current.forEach((p) => {
          p.spawnTime += pausedDelta;
        });
        if (nextProjectileTimeRef.current > 0) {
          nextProjectileTimeRef.current += pausedDelta;
        }
        pauseStartTimeRef.current = 0;
      }
      setGameStage("ACTIVE_DEFLECTION");
      gameStageRef.current = "ACTIVE_DEFLECTION";
      synth.playCalibrationPing();
      speakCoachCue("Resuming protocol.");

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ action: "set_stage", stage: "ACTIVE_DEFLECTION" }));
      }
    }
  }, [speakCoachCue]);

  const handleAbortSession = useCallback(() => {
    setGameStage("EPILOGUE");
    gameStageRef.current = "EPILOGUE";
    recordSessionAndEvaluateBadges();
    setShowProgressModal(true);
    speakCoachCue("Simulation suspended. Viewing recovery telemetry.");

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: "set_stage", stage: "EPILOGUE" }));
    }
  }, [recordSessionAndEvaluateBadges, speakCoachCue]);

  const handleRestartCampaign = useCallback(() => {
    handleResetCombat();
    deflectionsCompletedRef.current = 0;
    setDeflectionsCompleted(0);
    projectilesRef.current = [];
    nextProjectileTimeRef.current = 0;
    setActiveDialogueId(3);
    activeDialogueIdRef.current = 3;
    setGameStage("BOSS_INTRO");
    gameStageRef.current = "BOSS_INTRO";
    bossIntroStartTimeRef.current = performance.now();
    lastBossAlarmSecRef.current = -1;
    speakCoachCue("Re-entering simulation. Apex Core encounter imminent.");

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: "set_stage", stage: "BOSS_INTRO" }));
    }
  }, [handleResetCombat, speakCoachCue]);

  // Ambient Drone for Prologue
  useEffect(() => {
    if (gameStage === "PROLOGUE") {
      synth.startAmbientDrone();
    } else {
      synth.stopAmbientDrone();
    }
    return () => synth.stopAmbientDrone();
  }, [gameStage]);

  // Boss Alert Briefing (3s Strobe Alert Countdown)
  useEffect(() => {
    if (gameStage !== "BOSS_INTRO" || activeDialogueId === 3) return;
    synth.playBossAlarm();
    bossIntroStartTimeRef.current = performance.now();
    lastBossAlarmSecRef.current = -1;

    const interval = setInterval(() => {
      const elapsed = (performance.now() - bossIntroStartTimeRef.current) / 1000;
      const remaining = Math.max(0, Math.ceil(3.0 - elapsed));
      setBossIntroCountdown(remaining);

      if (remaining !== lastBossAlarmSecRef.current && remaining > 0) {
        lastBossAlarmSecRef.current = remaining;
        synth.playBossAlarm();
      }

      if (elapsed >= 3.0) {
        clearInterval(interval);
        setGameStage("ACTIVE_DEFLECTION");
        gameStageRef.current = "ACTIVE_DEFLECTION";
        nextProjectileTimeRef.current = performance.now() + 2000;
        synth.playShieldOptimalChime();
        speakCoachCue("Engage! Deflect all incoming kinetic orbs!");

        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({ action: "set_stage", stage: "ACTIVE_DEFLECTION" }));
        }
      }
    }, 80);

    return () => clearInterval(interval);
  }, [gameStage, activeDialogueId, speakCoachCue]);

  // Global Keyboard Listener for Spacebar and Escape (Pause / Resume / Start / Dialogue)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === " " || e.key === "Escape") {
        if ((e.target as HTMLElement)?.tagName === "INPUT") return;
        if (e.code === "Space" || e.key === " ") {
          e.preventDefault();
        }

        // Advance or skip dialogue if active
        if (activeDialogueIdRef.current !== null) {
          if (e.code === "Space" || e.key === " ") {
            handleAdvanceDialogue();
            return;
          }
          if (e.key === "Escape") {
            handleSkipDialogue();
            return;
          }
        }

        if (gameStageRef.current === "ACTIVE_DEFLECTION" || gameStageRef.current === "PAUSED") {
          handleTogglePause();
        } else if (gameStageRef.current === "PROLOGUE") {
          handleStartCampaign();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleTogglePause, handleStartCampaign, handleAdvanceDialogue, handleSkipDialogue]);

  // Boss Attack & Overheat Timer
  useEffect(() => {
    if (matchStatus !== "ACTIVE" || gameStage !== "ACTIVE_DEFLECTION") return;

    const interval = setInterval(() => {
      setStunTimer((prevStun) => {
        if (prevStun > 0) {
          const next = Math.max(0, prevStun - 0.1);
          if (next === 0) {
            setIsStunned(false);
            isStunnedRef.current = false;
          }
          return next;
        }
        return 0;
      });

      setOverheatMeter((prevOverheat) => {
        if (prevOverheat > 0) {
          return Math.max(0, prevOverheat - 3.5);
        }
        return 0;
      });

      // If WebSocket is not connected, use client-side attack timer fallback
      const isSocketActive = socketRef.current && socketRef.current.readyState === WebSocket.OPEN;
      if (!isSocketActive && holdProgressRef.current === 0) {
        setBossAttackTimer((prevTimer) => {
          if (prevTimer <= 0.1) {
            if (isRestDayRef.current) {
              // Clinical Rest Day Shield: Zero Combat Damage
              const canvas = canvasRef.current;
              if (canvas) {
                spawnFloatingText("🌿 RESTORATIVE SHIELD (0 DMG)", canvas.width / 2, canvas.height / 2, "#10b981", 32);
              }
            } else {
              synth.playBossAttack();
              screenShakeRef.current = 8;

              setPlayerHp((hp) => {
                const nextHp = Math.max(0, hp - 20);
                playerHpRef.current = nextHp;
                if (nextHp <= 0) {
                  setMatchStatus("DEFEAT");
                  setShowClinicianModal(true);
                  synth.playDefeat();
                  speakCoachCue("Mission failed. Retreat and recover.");
                }
                return nextHp;
              });

              const canvas = canvasRef.current;
              if (canvas) {
                spawnParticles(canvas.width / 2, canvas.height * 0.4, 35, "#ff0055");
                spawnFloatingText("-20 BOSS STRIKE!", canvas.width / 2, canvas.height / 2, "#ff0055", 34);
              }
            }

            return isEnragedRef.current ? 6.0 : 10.0;
          }
          return Math.max(0, Number((prevTimer - 0.1).toFixed(1)));
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [matchStatus, spawnParticles, spawnFloatingText, speakCoachCue]);

  // Match completion detection
  useEffect(() => {
    if (bossHp <= 0 && matchStatus === "ACTIVE") {
      setMatchStatus("VICTORY");
      setShowClinicianModal(true);
      synth.playVictory();
      speakCoachCue("Target destroyed! Outstanding biomechanical execution!");

      // Phase 7: Award Energy Cores (50 + +1 per % purity over 80%)
      const bonus = Math.max(0, Math.round(formPurity - 80));
      const earned = 50 + bonus;
      setEarnedCoresNotice(earned);
      const currentVault = vaultRef.current;
      updateVault({
        ...currentVault,
        energyCores: currentVault.energyCores + earned,
      });
      fetchLeaderboard();

      // Phase 8: Record clinical recovery telemetry and evaluate badges
    } else if (playerHp <= 0 && matchStatus === "ACTIVE" && !isShipExplodingRef.current && !isGameOver) {
      triggerShipExplosion();
      recordSessionAndEvaluateBadges();
    }
  }, [bossHp, playerHp, matchStatus, formPurity, speakCoachCue, updateVault, fetchLeaderboard, recordSessionAndEvaluateBadges, triggerShipExplosion, isGameOver]);

  // Campaign Mission Completion Detection (8/8 Deflections)
  useEffect(() => {
    if (deflectionsCompleted >= deflectionsTarget && gameStage === "ACTIVE_DEFLECTION") {
      setGameStage("EPILOGUE");
      gameStageRef.current = "EPILOGUE";
      setActiveDialogueId(4);
      activeDialogueIdRef.current = 4;
      synth.playVictory();
      synth.playHarmonicChord();
      speakCoachCue("Threat purified! Neural alignment restored. Mission accomplished!");
      recordSessionAndEvaluateBadges();

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ action: "set_stage", stage: "EPILOGUE" }));
      }
    }
  }, [deflectionsCompleted, deflectionsTarget, gameStage, speakCoachCue, recordSessionAndEvaluateBadges]);

  // ---------------------------------------------------------------------------
  // Canvas Render Loop with Dynamic Color-Coded Kinematic Skeleton
  // ---------------------------------------------------------------------------

  const renderCanvasPass = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (video && video.videoWidth > 0 && video.videoHeight > 0) {
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
    }

    const width = canvas.width;
    const height = canvas.height;

    // Track FPS
    const nowTs = performance.now();
    if (lastFrameTimeRef.current > 0) {
      const deltaMs = nowTs - lastFrameTimeRef.current;
      if (deltaMs > 0) {
        const instantFps = 1000 / deltaMs;
        fpsRef.current = fpsRef.current * 0.9 + instantFps * 0.1;
      }
    }
    lastFrameTimeRef.current = nowTs;

    // Periodically sync sensor diagnostics to React state (every 400ms)
    if (nowTs - lastDiagnosticUpdateRef.current > 400) {
      lastDiagnosticUpdateRef.current = nowTs;
      setCurrentFps(Math.round(fpsRef.current || 60));

      const lm = landmarksRef.current;
      if (lm && Array.isArray(lm) && lm.length >= 29) {
        const hipsV = ((lm[23]?.visibility || 0) + (lm[24]?.visibility || 0)) / 2;
        const kneesV = ((lm[25]?.visibility || 0) + (lm[26]?.visibility || 0)) / 2;
        const anklesV = ((lm[27]?.visibility || 0) + (lm[28]?.visibility || 0)) / 2;
        const shouldersV = ((lm[11]?.visibility || 0) + (lm[12]?.visibility || 0)) / 2;
        const overallV = (hipsV + kneesV + anklesV + shouldersV) / 4;

        setJointVisibility({
          hips: hipsV,
          knees: kneesV,
          ankles: anklesV,
          shoulders: shouldersV,
          overall: overallV,
        });

        if (hipsV > 0.35 && anklesV > 0.3) {
          const topY = Math.min(lm[11]?.y || 0.2, lm[12]?.y || 0.2);
          const bottomY = Math.max(lm[27]?.y || 0.8, lm[28]?.y || 0.8);
          const span = bottomY - topY;

          if (span >= 0.35 && span <= 0.78) {
            setDistanceStatus("OPTIMAL");
          } else if (span > 0.78 || bottomY > 0.97) {
            setDistanceStatus("TOO_CLOSE");
          } else {
            setDistanceStatus("TOO_FAR");
          }
        } else {
          setDistanceStatus("SEARCHING");
        }
      } else {
        setDistanceStatus("SEARCHING");
      }
    }

    ctx.clearRect(0, 0, width, height);

    // 1. Mirrored Camera Video with Screen Shake
    if (video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      ctx.save();
      if (screenShakeRef.current > 0) {
        const clampedShake = Math.min(7, screenShakeRef.current);
        const dx = (Math.random() - 0.5) * clampedShake;
        const dy = (Math.random() - 0.5) * clampedShake;
        ctx.translate(dx, dy);
        screenShakeRef.current *= 0.86;
        if (screenShakeRef.current < 0.5) screenShakeRef.current = 0;
      }
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, width, height);
      ctx.restore();

      const grad = ctx.createRadialGradient(width / 2, height / 2, width * 0.35, width / 2, height / 2, width * 0.75);
      if (isEnragedRef.current) {
        grad.addColorStop(0, "rgba(255, 0, 85, 0.04)");
        grad.addColorStop(1, "rgba(50, 5, 20, 0.8)");
      } else {
        grad.addColorStop(0, "rgba(5, 10, 20, 0.05)");
        grad.addColorStop(1, "rgba(5, 10, 20, 0.75)");
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.fillStyle = "#0a0e1a";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#00f0ff";
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "center";
      ctx.fillText("TARGET ACQUISITION IN PROGRESS...", width / 2, height / 2);
    }

    // 2. Corner Tech Brackets (Dynamic Shader Color)
    const currentShader = SHADER_CONFIGS[activeShaderRef.current] || SHADER_CONFIGS.cyberpunk;
    ctx.strokeStyle = isEnragedRef.current ? "rgba(255, 0, 85, 0.6)" : currentShader.bracketColor;
    ctx.lineWidth = 2.5;
    const bSize = 22;
    ctx.beginPath();
    ctx.moveTo(14, 14 + bSize);
    ctx.lineTo(14, 14);
    ctx.lineTo(14 + bSize, 14);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(width - 14 - bSize, 14);
    ctx.lineTo(width - 14, 14);
    ctx.lineTo(width - 14, 14 + bSize);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(14, height - 14 - bSize);
    ctx.lineTo(14, height - 14);
    ctx.lineTo(14 + bSize, height - 14);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(width - 14 - bSize, height - 14);
    ctx.lineTo(width - 14, height - 14);
    ctx.lineTo(width - 14, height - 14 - bSize);
    ctx.stroke();

    // 3. Dynamic Color-Coded Kinematic Skeleton
    const landmarks = landmarksRef.current;
    if (landmarks && Array.isArray(landmarks) && landmarks.length >= 29) {
      const getPt = (idx: number) => {
        const pt = landmarks[idx];
        if (!pt || pt.visibility < 0.35) return null;
        return {
          x: (1.0 - pt.x) * width,
          y: pt.y * height,
          idx,
        };
      };

      const lSh = getPt(11);
      const rSh = getPt(12);
      const lEl = getPt(13);
      const rEl = getPt(14);
      const lWr = getPt(15);
      const rWr = getPt(16);
      const lHip = getPt(23);
      const rHip = getPt(24);
      const lKnee = getPt(25);
      const rKnee = getPt(26);
      const lAnk = getPt(27);
      const rAnk = getPt(28);

      // Dynamic Joint Visualizer: Upper body vs Lower body highlight
      const currentExerciseConfig = EXERCISE_REGISTRY[activeExerciseRef.current] || EXERCISE_REGISTRY["squats"];
      const region = currentExerciseConfig.targetRegion;
      const isUpper = region === "UPPER_BODY";
      const isLower = region === "LOWER_BODY" || region === "BALANCE";
      const isSpine = region === "SPINE";
      const isBalance = region === "BALANCE";

      const armLineWidth = isUpper ? 4.5 : 1.5;
      const legLineWidth = isLower ? 4.5 : 1.5;
      const spineLineWidth = isSpine || isBalance ? 4.5 : 3.0;

      const isFaultJoint = (idx1: number, idx2: number) => {
        const faults = faultJointIndicesRef.current;
        return faults.includes(idx1) || faults.includes(idx2);
      };

      const getBoneColor = (idx1: number, idx2: number, isDim: boolean = false) => {
        if (isStunnedRef.current) return "#ff0055";
        if (isFaultJoint(idx1, idx2)) return "#ff2a5f"; // Red alert
        if (isDim) return "rgba(100, 140, 180, 0.25)"; // Faint line for non-tracking limbs
        if (holdProgressRef.current >= 1.0) return currentShader.targetColor;
        if (holdProgressRef.current > 0) return currentShader.holdingColor;
        return isUpper ? "#00f0ff" : currentShader.baseColor;
      };

      const drawBone = (p1: any, p2: any, color: string, lineWidth = 3.5) => {
        if (!p1 || !p2) return;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.shadowColor = color;
        ctx.shadowBlur = lineWidth > 2 ? 12 : 0;
        ctx.lineCap = "round";
        ctx.stroke();
        ctx.restore();
      };

      // Arms (Prominently highlighted with cyan glow for Upper Body)
      drawBone(lSh, rSh, getBoneColor(11, 12, !isUpper && !isSpine), armLineWidth);
      drawBone(lSh, lEl, getBoneColor(11, 13, !isUpper), armLineWidth);
      drawBone(lEl, lWr, getBoneColor(13, 15, !isUpper), armLineWidth);
      drawBone(rSh, rEl, getBoneColor(12, 14, !isUpper), armLineWidth);
      drawBone(rEl, rWr, getBoneColor(14, 16, !isUpper), armLineWidth);

      // Spine & Pelvis
      if (lSh && rSh && lHip && rHip) {
        const midSh = { x: (lSh.x + rSh.x) / 2, y: (lSh.y + rSh.y) / 2 };
        const midHip = { x: (lHip.x + rHip.x) / 2, y: (lHip.y + rHip.y) / 2 };
        drawBone(midSh, midHip, getBoneColor(11, 23, !isSpine && !isBalance), spineLineWidth);
        drawBone(lHip, rHip, getBoneColor(23, 24, !isLower && !isSpine), spineLineWidth);
      }

      // Legs (Prominently highlighted for Lower Body / Balance, faint for Upper Body)
      drawBone(lHip, lKnee, getBoneColor(23, 25, !isLower), legLineWidth);
      drawBone(lKnee, lAnk, getBoneColor(25, 27, !isLower), legLineWidth);
      drawBone(rHip, rKnee, getBoneColor(24, 26, !isLower), legLineWidth);
      drawBone(rKnee, rAnk, getBoneColor(26, 28, !isLower), legLineWidth);

      // Balance Plumb Line Overlay for Single-Leg Balance
      if (isBalance && lSh && rSh && (lAnk || rAnk)) {
        const midSh = { x: (lSh.x + rSh.x) / 2, y: (lSh.y + rSh.y) / 2 };
        const stanceAnk = lAnk && rAnk ? (lAnk.y > rAnk.y ? lAnk : rAnk) : (lAnk || rAnk);
        if (stanceAnk) {
          ctx.save();
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = "rgba(0, 240, 255, 0.45)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(midSh.x, midSh.y);
          ctx.lineTo(stanceAnk.x, stanceAnk.y);
          ctx.stroke();
          ctx.restore();
        }
      }

      // Dynamic Joint Halos
      const joints = [
        { pt: lSh, idx: 11, r: isUpper || isSpine ? 7 : 4, isUpperBone: true },
        { pt: rSh, idx: 12, r: isUpper || isSpine ? 7 : 4, isUpperBone: true },
        { pt: lEl, idx: 13, r: isUpper ? 7 : 3, isUpperBone: true },
        { pt: rEl, idx: 14, r: isUpper ? 7 : 3, isUpperBone: true },
        { pt: lWr, idx: 15, r: isUpper ? 7 : 3, isUpperBone: true },
        { pt: rWr, idx: 16, r: isUpper ? 7 : 3, isUpperBone: true },
        { pt: lHip, idx: 23, r: isLower || isSpine ? 7 : 4, isUpperBone: false },
        { pt: rHip, idx: 24, r: isLower || isSpine ? 7 : 4, isUpperBone: false },
        { pt: lKnee, idx: 25, r: isLower ? 8 : 3, isUpperBone: false },
        { pt: rKnee, idx: 26, r: isLower ? 8 : 3, isUpperBone: false },
        { pt: lAnk, idx: 27, r: isLower ? 6 : 3, isUpperBone: false },
        { pt: rAnk, idx: 28, r: isLower ? 6 : 3, isUpperBone: false },
      ];

      joints.forEach(({ pt, idx, r, isUpperBone }) => {
        if (!pt) return;
        const isTargetTracking = (isUpper && isUpperBone) || (isLower && !isUpperBone) || isSpine;
        const col = isFaultJoint(idx, idx)
          ? "#ff2a5f"
          : idx === activeJointIdxRef.current
          ? holdProgressRef.current >= 1.0
            ? currentShader.targetColor
            : currentShader.holdingColor
          : isTargetTracking
          ? (isUpper ? "#00f0ff" : currentShader.baseColor)
          : "rgba(100, 140, 180, 0.35)";

        ctx.save();
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
        ctx.fillStyle = col;
        if (isTargetTracking || idx === activeJointIdxRef.current) {
          ctx.shadowColor = col;
          ctx.shadowBlur = 16;
        }
        ctx.fill();
        ctx.strokeStyle = isTargetTracking ? "#ffffff" : "rgba(255, 255, 255, 0.35)";
        ctx.lineWidth = isTargetTracking ? 1.5 : 1.0;
        ctx.stroke();
        ctx.restore();
      });

      // Dynamic Circular Hold Gauge on Active Joint
      const activeIdx = activeJointIdxRef.current;
      const targetJoint = getPt(activeIdx) || getPt(activeIdx === 25 ? 26 : activeIdx === 13 ? 14 : activeIdx === 11 ? 12 : 24);

      if (targetJoint && holdProgressRef.current > 0) {
        const radius = 34;
        const progress = Math.min(1.0, holdProgressRef.current);
        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + Math.PI * 2 * progress;

        ctx.save();
        ctx.beginPath();
        ctx.arc(targetJoint.x, targetJoint.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.lineWidth = 4.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(targetJoint.x, targetJoint.y, radius, startAngle, endAngle);
        ctx.strokeStyle = progress >= 1.0 ? currentShader.targetColor : currentShader.holdingColor;
        ctx.lineWidth = 5.5;
        ctx.shadowColor = progress >= 1.0 ? currentShader.targetColor : currentShader.holdingColor;
        ctx.shadowBlur = 14;
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 13px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`${Math.round(primaryAngleRef.current)}°`, targetJoint.x, targetJoint.y - radius - 6);
        ctx.restore();
      }

      // ---------------------------------------------------------------------
      // Kinetic Charge: Eccentric Descent Velocity Tracking & Hold Payoff
      // ---------------------------------------------------------------------
      const pAngle = primaryAngleRef.current;
      const nowSec = performance.now() / 1000;

      // Start tracking descent when flexion begins (< 155°)
      if (pAngle < 155 && descentStartTimeRef.current === null) {
        descentStartTimeRef.current = nowSec;
        descentEvaluatedRef.current = false;
        isDescentControlledRef.current = false;
      }

      // Evaluate descent when reaching inflection depth (< 100°) or active hold
      if ((pAngle <= 100 || holdProgressRef.current > 0) && !descentEvaluatedRef.current && descentStartTimeRef.current !== null) {
        const descentDuration = nowSec - descentStartTimeRef.current;
        descentEvaluatedRef.current = true;
        if (descentDuration >= 2.0) {
          isDescentControlledRef.current = true;
        } else if (descentDuration < 1.0) {
          isDescentControlledRef.current = false;
          descentWarningTimerRef.current = performance.now() + 2000;
        }
      }

      // Reset upon returning to full extension (>= 160°)
      if (pAngle >= 160) {
        descentStartTimeRef.current = null;
        descentEvaluatedRef.current = false;
        isDescentControlledRef.current = false;
        shockwaveTriggeredForHoldRef.current = false;
      }

      // Render Kinetic Charge Ring (Controlled Descent >= 2.0s)
      if (isDescentControlledRef.current) {
        const pulse = 26 + 6 * Math.sin(performance.now() * 0.008);
        const ringTargets = [lKnee, rKnee].filter(Boolean);
        if (ringTargets.length === 0 && targetJoint) ringTargets.push(targetJoint);

        ringTargets.forEach((jt) => {
          if (!jt) return;
          ctx.save();
          ctx.beginPath();
          ctx.arc(jt.x, jt.y, pulse, 0, Math.PI * 2);
          ctx.strokeStyle = "#00f0ff";
          ctx.lineWidth = 3.5;
          ctx.shadowColor = "#10b981";
          ctx.shadowBlur = 18;
          ctx.stroke();

          // Outer dashed kinetic ring
          ctx.beginPath();
          ctx.setLineDash([6, 4]);
          ctx.arc(jt.x, jt.y, pulse + 6, 0, Math.PI * 2);
          ctx.strokeStyle = "#10b981";
          ctx.lineWidth = 2.0;
          ctx.stroke();
          ctx.restore();
        });

        // Kinetic charge HUD label
        if (targetJoint) {
          ctx.save();
          ctx.fillStyle = "#10b981";
          ctx.font = "bold 11px monospace";
          ctx.textAlign = "center";
          ctx.shadowColor = "#00f0ff";
          ctx.shadowBlur = 8;
          ctx.fillText("⚡ KINETIC CHARGE", targetJoint.x, targetJoint.y + 48);
          ctx.restore();
        }
      }

      // Render Rushed Descent Alert (< 1.0s)
      if (descentWarningTimerRef.current > performance.now()) {
        const remaining = (descentWarningTimerRef.current - performance.now()) / 2000;
        const ringTargets = [lKnee, rKnee].filter(Boolean);
        if (ringTargets.length === 0 && targetJoint) ringTargets.push(targetJoint);

        ringTargets.forEach((jt) => {
          if (!jt) return;
          ctx.save();
          ctx.beginPath();
          ctx.arc(jt.x, jt.y, 36 + (1 - remaining) * 22, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 42, 95, ${remaining})`;
          ctx.lineWidth = 3.5;
          ctx.stroke();
          ctx.restore();
        });

        ctx.save();
        ctx.fillStyle = "#ff2a5f";
        ctx.font = "bold 13px monospace";
        ctx.textAlign = "center";
        ctx.shadowColor = "#ff0055";
        ctx.shadowBlur = 12;
        ctx.fillText("CONTROL DESCENT // PROTECT TENDONS", width / 2, height * 0.74);
        ctx.restore();
      }

      // Therapeutic Isometric Hold Payoff (Hold >= 1.5s with Controlled Descent)
      if (
        holdProgressRef.current >= 0.95 &&
        isDescentControlledRef.current &&
        !shockwaveTriggeredForHoldRef.current &&
        targetJoint
      ) {
        shockwaveTriggeredForHoldRef.current = true;
        // Detonate golden radial shockwave
        shockwavesRef.current.push({
          x: targetJoint.x,
          y: targetJoint.y,
          radius: 15,
          maxRadius: Math.max(width, height) * 0.95,
          alpha: 1.0,
          color: "#ffd700",
        });
        synth.playHarmonicChord();
        setBossHp((prev) => Math.max(0, prev - 150));
        spawnParticles(targetJoint.x, targetJoint.y, 45, "#ffd700");
        spawnFloatingText("-150 PURE STRIKE!", targetJoint.x, targetJoint.y - 35, "#ffd700", 38);
        setBioCredits((prev) => {
          const updated = prev + 25;
          try {
            localStorage.setItem("athletemind_bio_credits", updated.toString());
          } catch {}
          return updated;
        });
      }

      // Calculate Patient Center of Mass & Deflection Perimeter
      let pComX = width / 2;
      let pComY = height * 0.55;
      if (lHip && rHip) {
        pComX = (lHip.x + rHip.x) / 2;
        pComY = (lHip.y + rHip.y) / 2;
      } else if (lSh && rSh) {
        pComX = (lSh.x + rSh.x) / 2;
        pComY = (lSh.y + rSh.y) / 2 + 60;
      }

      // 1. Pulsing Circular Deflection Perimeter
      const pPerimeterRadius = 80 + 4 * Math.sin(performance.now() * 0.005);
      ctx.save();
      ctx.beginPath();
      ctx.arc(pComX, pComY, pPerimeterRadius, 0, Math.PI * 2);
      ctx.setLineDash([8, 6]);
      ctx.strokeStyle = "rgba(0, 240, 255, 0.45)";
      ctx.lineWidth = 2.0;
      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.restore();

      // 2. Hexagonal Kinetic Shield Manifestation
      if (isDescentControlledRef.current || holdProgressRef.current > 0) {
        const hexRadius = pPerimeterRadius + 14;
        ctx.save();
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 6;
          const hx = pComX + hexRadius * Math.cos(angle);
          const hy = pComY + hexRadius * Math.sin(angle);
          if (i === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.strokeStyle = holdProgressRef.current >= 1.0 ? "#ffd700" : "#00f0ff";
        ctx.lineWidth = 3.5;
        ctx.shadowColor = holdProgressRef.current >= 1.0 ? "#ffd700" : "#10b981";
        ctx.shadowBlur = 18;
        ctx.stroke();

        ctx.fillStyle = holdProgressRef.current >= 1.0 ? "rgba(255, 215, 0, 0.12)" : "rgba(0, 240, 255, 0.08)";
        ctx.fill();

        ctx.fillStyle = holdProgressRef.current >= 1.0 ? "#ffd700" : "#00f0ff";
        ctx.font = "bold 11px monospace";
        ctx.textAlign = "center";
        ctx.fillText("⬡ KINETIC SHIELD ENGAGED", pComX, pComY - hexRadius - 10);
        ctx.restore();
      }

      // -----------------------------------------------------------------------
      // Interactive Campaign Calibration Verification Loops
      // -----------------------------------------------------------------------
      if (gameStageRef.current === "CALIBRATION_ARMS") {
        if (lWr && rWr && lSh && rSh) {
          const lUp = lWr.y < lSh.y;
          const rUp = rWr.y < rSh.y;
          setArmCalibrationVerified(lUp && rUp);

          // Draw targeting halos on wrists
          [lWr, rWr].forEach((wr, i) => {
            const up = i === 0 ? lUp : rUp;
            ctx.save();
            ctx.beginPath();
            ctx.arc(wr.x, wr.y, 24, 0, Math.PI * 2);
            ctx.strokeStyle = up ? "#10b981" : "#00f0ff";
            ctx.lineWidth = 3;
            ctx.shadowColor = up ? "#10b981" : "#00f0ff";
            ctx.shadowBlur = 16;
            ctx.stroke();
            ctx.fillStyle = up ? "rgba(16,185,129,0.3)" : "rgba(0,240,255,0.15)";
            ctx.fill();
            ctx.restore();
          });

          if (lUp && rUp) {
            calibrationArmFramesRef.current += 1;
            if (calibrationArmFramesRef.current >= 4) {
              synth.playCalibrationPing();
              spawnParticles(lWr.x, lWr.y, 22, "#10b981");
              spawnParticles(rWr.x, rWr.y, 22, "#10b981");
              spawnFloatingText("ARM RANGE VERIFIED", width / 2, height * 0.35, "#10b981", 32);
              setGameStage("CALIBRATION_STANCE");
              gameStageRef.current = "CALIBRATION_STANCE";
              calibrationArmFramesRef.current = 0;
              speakCoachCue("Arm range verified. Step back until hips and ankles are visible.");
              if (socketRef.current?.readyState === WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify({ action: "set_stage", stage: "CALIBRATION_STANCE" }));
              }
            }
          } else {
            calibrationArmFramesRef.current = 0;
          }
        }
      } else if (gameStageRef.current === "CALIBRATION_STANCE") {
        const hasHips = Boolean(lHip && rHip);
        const hasAnkles = Boolean(lAnk && rAnk);
        const visibleHipsAndAnkles = hasHips && hasAnkles;
        setStanceCalibrationVerified(visibleHipsAndAnkles);

        if (visibleHipsAndAnkles) {
          calibrationStanceFramesRef.current += 1;
          if (calibrationStanceFramesRef.current >= 6) {
            calibrationGreenFlashRef.current = performance.now() + 500;
            synth.playCalibrationPing();
            spawnParticles(width / 2, height / 2, 40, "#10b981");
            spawnFloatingText("FULL BODY FRAMED", width / 2, height * 0.35, "#10b981", 32);
            setGameStage("CALIBRATION_SHIELD");
            gameStageRef.current = "CALIBRATION_SHIELD";
            calibrationStanceFramesRef.current = 0;
            const activeCfg = EXERCISE_REGISTRY[activeExerciseRef.current] || EXERCISE_REGISTRY["squats"];
            speakCoachCue(`Full body framed. Test ${activeCfg.name} shield: ${activeCfg.prompts.initial} and hold.`);
            if (socketRef.current?.readyState === WebSocket.OPEN) {
              socketRef.current.send(JSON.stringify({ action: "set_stage", stage: "CALIBRATION_SHIELD" }));
            }
          }
        } else {
          calibrationStanceFramesRef.current = 0;
        }
      } else if (gameStageRef.current === "CALIBRATION_SHIELD") {
        const currentExerciseConfig = EXERCISE_REGISTRY[activeExerciseRef.current] || EXERCISE_REGISTRY["squats"];
        const calibRes = landmarks && currentExerciseConfig.testCalibration
          ? currentExerciseConfig.testCalibration(landmarks)
          : (() => {
              const m = landmarks ? currentExerciseConfig.calculateMetrics(landmarks) : null;
              return {
                isReady: m ? (m.isTargetReached || m.isHolding) : false,
                message: currentExerciseConfig.prompts.hold,
                targetHoldSec: currentExerciseConfig.targetRegion === "UPPER_BODY" ? 1.0 : 1.5,
              };
            })();

        const targetHoldSec = calibRes.targetHoldSec || (currentExerciseConfig.targetRegion === "UPPER_BODY" ? 1.0 : 1.5);
        if (calibRes.isReady) {
          calibrationShieldHoldSecRef.current += 0.025;
          const progress = Math.min(1.0, calibrationShieldHoldSecRef.current / targetHoldSec);
          setShieldTestHoldProgress(progress);

          // Force draw charging gold hexagonal shield
          const hexRadius = pPerimeterRadius + 18;
          ctx.save();
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6;
            const hx = pComX + hexRadius * Math.cos(angle);
            const hy = pComY + hexRadius * Math.sin(angle);
            if (i === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
          }
          ctx.closePath();
          ctx.strokeStyle = "#ffd700";
          ctx.lineWidth = 4.0;
          ctx.shadowColor = "#ffd700";
          ctx.shadowBlur = 24;
          ctx.stroke();
          ctx.fillStyle = `rgba(255, 215, 0, ${0.12 + progress * 0.3})`;
          ctx.fill();

          ctx.fillStyle = "#ffd700";
          ctx.font = "bold 12px monospace";
          ctx.textAlign = "center";
          ctx.fillText(`⬡ SHIELD CHARGING: ${Math.round(progress * 100)}%`, pComX, pComY - hexRadius - 12);
          ctx.restore();

          if (calibrationShieldHoldSecRef.current >= targetHoldSec) {
            synth.playShieldOptimalChime();
            spawnParticles(pComX, pComY, 50, "#ffd700");
            spawnFloatingText("SHIELD SYSTEMS OPTIMAL!", pComX, pComY - 45, "#ffd700", 36);
            setActiveDialogueId(3);
            activeDialogueIdRef.current = 3;
            setGameStage("BOSS_INTRO");
            gameStageRef.current = "BOSS_INTRO";
            bossIntroStartTimeRef.current = performance.now();
            calibrationShieldHoldSecRef.current = 0;
            setShieldTestHoldProgress(1.0);
            speakCoachCue("Shield systems optimal. Critical alert: Apex Core approaching.");
            if (socketRef.current?.readyState === WebSocket.OPEN) {
              socketRef.current.send(JSON.stringify({ action: "set_stage", stage: "BOSS_INTRO" }));
            }
          }
        } else {
          calibrationShieldHoldSecRef.current = Math.max(0, calibrationShieldHoldSecRef.current - 0.05);
          setShieldTestHoldProgress(Math.min(1.0, calibrationShieldHoldSecRef.current / targetHoldSec));
        }
      }
    }

    // -------------------------------------------------------------------------
    // Incoming Kinetic Deflection Engine (4s Trajectory, 6-8s Spacing)
    // -------------------------------------------------------------------------
    const nowMs = performance.now();
    const isHitStopActive = hitStopUntilRef.current > nowMs;
    const comX = width / 2;
    const comY = height * 0.55;
    const perimeterRadius = 55;

    if (gameStageRef.current === "ACTIVE_DEFLECTION") {
      if (nextProjectileTimeRef.current === 0) {
        nextProjectileTimeRef.current = nowMs + 1800;
      } else if (nowMs >= nextProjectileTimeRef.current && !isHitStopActive) {
        // Multi-directional spawn trajectories (top-left, top-center, top-right, left flank, right flank)
        const spawnDirRand = Math.random();
        let sX = width * 0.5;
        let sY = -50;
        if (spawnDirRand < 0.25) {
          // Top-left vector
          sX = width * 0.15 + (Math.random() - 0.5) * 80;
          sY = -50;
        } else if (spawnDirRand < 0.55) {
          // Top-center vector
          sX = width * 0.5 + (Math.random() - 0.5) * 140;
          sY = -50;
        } else if (spawnDirRand < 0.8) {
          // Top-right vector
          sX = width * 0.85 + (Math.random() - 0.5) * 80;
          sY = -50;
        } else if (spawnDirRand < 0.9) {
          // Left flank vector
          sX = -50;
          sY = height * 0.25 + (Math.random() - 0.5) * 100;
        } else {
          // Right flank vector
          sX = width + 50;
          sY = height * 0.25 + (Math.random() - 0.5) * 100;
        }

        // Asteroids of various compact sizes (small: 14px, medium: 20px, large: 28px)
        const sizeRand = Math.random();
        const radius = sizeRand < 0.35 ? 14 : sizeRand < 0.75 ? 20 : 28;
        const variant = sizeRand < 0.35 ? "SMALL" : sizeRand < 0.75 ? "MEDIUM" : "LARGE";

        projectilesRef.current.push({
          id: `ast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          startX: sX,
          startY: sY,
          targetX: comX,
          targetY: comY,
          progress: 0.0,
          duration: 4000,
          spawnTime: nowMs,
          radius,
          color: "#f59e0b",
          status: "FLYING",
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.04,
          sizeScale: radius / 20,
          variant,
        });
        nextProjectileTimeRef.current = nowMs + 5800 + Math.random() * 1600;
      }
    }

    const projectiles = projectilesRef.current;
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      if (p.status === "FLYING") {
        if (gameStageRef.current === "ACTIVE_DEFLECTION" && !isHitStopActive) {
          p.progress = Math.min(1.0, (nowMs - p.spawnTime) / p.duration);
        }
        if (p.rotSpeed) {
          p.rotation = (p.rotation || 0) + p.rotSpeed;
        }
        const curX = p.startX + (p.targetX - p.startX) * p.progress;
        const curY = p.startY + (p.targetY - p.startY) * p.progress;
        const dist = Math.hypot(curX - comX, curY - comY);

        if (dist <= perimeterRadius || p.progress >= 0.90) {
          const isShieldOnline = shieldActiveRef.current;

          if (isShieldOnline) {
            p.status = "DEFLECTED";
            hitStopUntilRef.current = nowMs + 80;
            screenShakeRef.current = 5;
            synth.playPerfectDeflect();
            synth.playShieldDischarge();
            spawnParticles(curX, curY, 45, "#00f0ff");
            spawnParticles(curX, curY, 25, "#ffd700");
            spawnParticles(curX, curY, 25, "#78716c");
            spawnFloatingText("+1 ASTEROID DEFLECTED!", curX, curY - 24, "#00f0ff", 36);
            spawnFloatingText("⚡ STAND UP TO RECHARGE SHIELD!", width / 2, height * 0.45, "#f59e0b", 30);

            deflectionsCompletedRef.current += 1;
            setDeflectionsCompleted((c) => c + 1);
            setRepCount((r) => r + 1);

            // Immediately discharge the capacitor!
            shieldCapacitorChargedRef.current = false;
            hasStoodUpSinceDeflectRef.current = false;
            isSquatHoldingRef.current = false;
            shieldActiveRef.current = false;
            setIsShieldActiveState(false);
            repCycleStatusRef.current = "STAND_UP_TO_RECHARGE";
            setRepCycleStatus("STAND_UP_TO_RECHARGE");
            holdProgressRef.current = 0;
            setHoldProgress(0);

            setBioCredits((prev) => {
              const updated = prev + 25;
              try {
                localStorage.setItem("athletemind_bio_credits", updated.toString());
              } catch {}
              return updated;
            });

            if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
              socketRef.current.send(JSON.stringify({ action: "report_deflect", success: true }));
            }
          } else {
            p.status = "BREACHED";
            synth.playShieldBreach();
            shieldBreachFlashRef.current = nowMs + 400;
            screenShakeRef.current = 8;
            spawnParticles(curX, curY, 25, "#f59e0b");
            spawnParticles(curX, curY, 20, "#ef4444");

            if (!hasStoodUpSinceDeflectRef.current) {
              spawnFloatingText("HULL IMPACT — CAPACITOR EMPTY (STAND UP TO RESET)", curX, curY, "#ef4444", 26);
            } else if (!isSquatHoldingRef.current) {
              spawnFloatingText("HULL IMPACT — SHIELD OFFLINE (NOT HOLDING SQUAT)", curX, curY, "#ef4444", 26);
            } else {
              spawnFloatingText("HULL IMPACT — ASTEROID BREACH", curX, curY, "#ef4444", 28);
            }

            if (isRestDayRef.current) {
              spawnFloatingText("🌿 RESTORATIVE SHIELD (0 DMG)", curX, curY + 32, "#10b981", 28);
            } else {
              const nextHp = Math.max(0, playerHpRef.current - 20);
              playerHpRef.current = nextHp;
              setPlayerHp(nextHp);
              if (nextHp <= 0) {
                triggerShipExplosion();
              }
            }

            if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
              socketRef.current.send(JSON.stringify({ action: "report_deflect", success: false, damage: 20 }));
            }
          }
        }

        if (p.status === "FLYING") {
          ctx.save();
          // Atmospheric friction and dust trail behind incoming asteroid
          for (let step = 1; step <= 3; step++) {
            const tailProgress = Math.max(0, p.progress - step * 0.035);
            const tx = p.startX + (p.targetX - p.startX) * tailProgress;
            const ty = p.startY + (p.targetY - p.startY) * tailProgress;
            ctx.beginPath();
            ctx.arc(tx, ty, p.radius * (1 - step * 0.22), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(245, 158, 11, ${0.35 - step * 0.1})`;
            ctx.fill();
          }

          // Draw rotating textured 3D cratered asteroid rock
          ctx.translate(curX, curY);
          ctx.rotate(p.rotation || 0);

          if (asteroidImgRef.current && asteroidImgRef.current.complete) {
            ctx.shadowColor = "#f59e0b";
            ctx.shadowBlur = 14;
            ctx.drawImage(
              asteroidImgRef.current,
              -p.radius,
              -p.radius,
              p.radius * 2,
              p.radius * 2
            );
          } else {
            // High-contrast rocky fallback
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = "#57534e";
            ctx.shadowColor = "#f59e0b";
            ctx.shadowBlur = 12;
            ctx.fill();
            ctx.strokeStyle = "#d97706";
            ctx.lineWidth = 2;
            ctx.stroke();
          }
          ctx.restore();
        }
      } else {
        projectiles.splice(i, 1);
      }
    }

    if (shieldBreachFlashRef.current > nowMs) {
      const flashAlpha = Math.max(0, (shieldBreachFlashRef.current - nowMs) / 400);
      ctx.save();
      ctx.fillStyle = `rgba(245, 158, 11, ${flashAlpha * 0.28})`;
      ctx.restore();
    }

    // Green boundary flash on stance verification
    if (calibrationGreenFlashRef.current > nowMs) {
      const alpha = Math.max(0, (calibrationGreenFlashRef.current - nowMs) / 500);
      ctx.save();
      ctx.strokeStyle = `rgba(16, 185, 129, ${alpha * 0.9})`;
      ctx.lineWidth = 14;
      ctx.strokeRect(7, 7, width - 14, height - 14);
      ctx.restore();
    }

    // Red emergency strobe during BOSS_INTRO
    if (gameStageRef.current === "BOSS_INTRO") {
      const strobe = Math.sin(nowMs * 0.018) > 0;
      if (strobe) {
        ctx.save();
        ctx.fillStyle = "rgba(225, 29, 72, 0.18)";
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }
    }

    // Cyan epilogue radiant glow
    if (gameStageRef.current === "EPILOGUE") {
      const glowAlpha = 0.12 + 0.05 * Math.sin(nowMs * 0.004);
      ctx.save();
      ctx.fillStyle = `rgba(0, 240, 255, ${glowAlpha})`;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // 4. Update & Render Particles
    const particles = particlesRef.current;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.life++;
      p.alpha = Math.max(0, 1.0 - p.life / p.maxLife);

      if (p.alpha <= 0 || p.life >= p.maxLife) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.restore();
    }

    // 5. Floating Numbers
    const texts = floatingTextsRef.current;
    for (let i = texts.length - 1; i >= 0; i--) {
      const t = texts[i];
      t.y -= 1.6;
      t.life++;
      t.opacity = Math.max(0, 1.0 - t.life / t.maxLife);

      if (t.opacity <= 0 || t.life >= t.maxLife) {
        texts.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.font = `black ${t.fontSize}px monospace`;
      ctx.fillStyle = t.color;
      ctx.shadowColor = t.color;
      ctx.shadowBlur = 14;
      ctx.globalAlpha = t.opacity;
      ctx.textAlign = "center";
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    }

    // 6. Expanding Clinical Golden Shockwaves
    const shockwaves = shockwavesRef.current;
    for (let i = shockwaves.length - 1; i >= 0; i--) {
      const s = shockwaves[i];
      s.radius += 14;
      s.alpha = Math.max(0, 1.0 - s.radius / s.maxRadius);

      if (s.alpha <= 0 || s.radius >= s.maxRadius) {
        shockwaves.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 5.0 * s.alpha;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 20;
      ctx.globalAlpha = s.alpha;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(s.x, s.y, Math.max(0, s.radius - 12), 0, Math.PI * 2);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2.0 * s.alpha;
      ctx.stroke();
      ctx.restore();
    }
  }, [spawnFloatingText, spawnParticles]);

  const renderCanvasPassRef = useRef(renderCanvasPass);
  useEffect(() => {
    renderCanvasPassRef.current = renderCanvasPass;
  });

  // ---------------------------------------------------------------------------
  // Continuous MediaPipe Pose Loop & WebSocket Connection (Bilateral 3D Stream)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!scriptReady || typeof window === "undefined" || !window.Pose) return;

    let isRunning = true;

    const pose = new window.Pose({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    poseInstanceRef.current = pose;

    pose.onResults((results: any) => {
      if (!isRunning) return;
      if (results.poseLandmarks) {
        landmarksRef.current = results.poseLandmarks;

        // Dynamic 10-Exercise Clinical Evaluation Dispatch
        const currentExerciseConfig = EXERCISE_REGISTRY[activeExerciseRef.current] || EXERCISE_REGISTRY["squats"];
        const metrics = currentExerciseConfig.calculateMetrics(results.poseLandmarks);

        // Update HUD variables dynamically based strictly on active exercise:
        setCurrentDisplayAngle(metrics.primaryAngle);
        setIsHolding(metrics.isHolding);
        setIsDepthTargetMet(metrics.isTargetReached);
        setHasFault(metrics.faultDetected);
        setFaultFeedback(metrics.faultMessage || "");

        if (metrics.primaryAngle !== undefined) {
          setPrimaryAngle(Math.round(metrics.primaryAngle));
          primaryAngleRef.current = metrics.primaryAngle;
        }
        if (metrics.secondaryAngle !== undefined) {
          setSecondaryAngle(Math.round(metrics.secondaryAngle));
        }
        if (metrics.activeJointIndices?.[0] !== undefined) {
          setActiveJointIdx(metrics.activeJointIndices[0]);
          activeJointIdxRef.current = metrics.activeJointIndices[0];
        }
        if (metrics.faultJointIndices) {
          setFaultJointIndices(metrics.faultJointIndices);
          faultJointIndicesRef.current = metrics.faultJointIndices;
        }

        // Real-time Dynamic Hold Progress & Banner Update (Authoritative 60 FPS loop)
        if (gameStageRef.current === "ACTIVE_DEFLECTION") {
          const currentAngle = metrics.primaryAngle !== undefined ? metrics.primaryAngle : 180;
          const baseTarget = currentExerciseConfig.targetAngle || 90;
          const effectiveTarget = activeExerciseRef.current === "squats"
            ? Math.round(90 + (flexibilityToleranceRef.current / 100) * 80)
            : baseTarget;

          // Standing Lockout Detection (Knee angle >= 145 degrees for squats)
          const isStanding = activeExerciseRef.current === "squats"
            ? currentAngle >= 145
            : (metrics.primaryAngle !== undefined && metrics.primaryAngle >= 150);

          // Deep Hold Detection (Knee angle <= effectiveTarget for squats)
          const isAtTargetDepth = activeExerciseRef.current === "squats"
            ? currentAngle <= effectiveTarget
            : (metrics.isTargetReached || metrics.isHolding);

          if (metrics.faultDetected) {
            // Fault detected: disable shield immediately
            shieldActiveRef.current = false;
            isSquatHoldingRef.current = false;
            setIsShieldActiveState(false);
            setCombatBanner(metrics.faultMessage || currentExerciseConfig.prompts.fault || currentExerciseConfig.faultPrompt);
            setCombatBannerType("FAULT");
            holdProgressRef.current = 0;
            setHoldProgress(0);
          } else if (isStanding) {
            // User is standing up / upright
            if (!hasStoodUpSinceDeflectRef.current) {
              hasStoodUpSinceDeflectRef.current = true;
              shieldCapacitorChargedRef.current = true;
              synth.playCapacitorRecharged();
              const canvas = canvasRef.current;
              if (canvas) {
                spawnFloatingText("⚡ CAPACITOR RECHARGED! SQUAT TO ENGAGE!", canvas.width / 2, canvas.height * 0.45, "#00f0ff", 30);
              }
              repCycleStatusRef.current = "STAND_READY";
              setRepCycleStatus("STAND_READY");
            }

            // Shield is strictly disabled while standing
            shieldActiveRef.current = false;
            isSquatHoldingRef.current = false;
            setIsShieldActiveState(false);
            holdProgressRef.current = 0;
            setHoldProgress(0);

            if (repCycleStatusRef.current === "STAND_UP_TO_RECHARGE") {
              setCombatBanner("STAND UP FULLY TO RECHARGE SHIELD!");
              setCombatBannerType("WAITING");
            } else {
              setCombatBanner(currentExerciseConfig.prompts.initial);
              setCombatBannerType("WAITING");
            }
          } else if (isAtTargetDepth) {
            // User is at target squat depth!
            if (shieldCapacitorChargedRef.current) {
              // Capacitor is ready: SHIELD IS ONLINE!
              isSquatHoldingRef.current = true;
              shieldActiveRef.current = true;
              setIsShieldActiveState(true);
              repCycleStatusRef.current = "HOLDING";
              setRepCycleStatus("HOLDING");

              const holdTarget = currentExerciseConfig.deflectionHoldTime || 1.5;
              setHoldProgress((prev) => {
                const next = Math.min(1.0, prev + 0.033 / holdTarget);
                holdProgressRef.current = next;
                return next;
              });

              setCombatBanner("🛡️ SHIELD ONLINE // HOLD POSITION!");
              setCombatBannerType("HOLD");
            } else {
              // Capacitor was discharged because user didn't stand up!
              isSquatHoldingRef.current = false;
              shieldActiveRef.current = false;
              setIsShieldActiveState(false);
              repCycleStatusRef.current = "STAND_UP_TO_RECHARGE";
              setRepCycleStatus("STAND_UP_TO_RECHARGE");
              setCombatBanner("STAND UP TO RECHARGE SHIELD!");
              setCombatBannerType("FAULT");
              holdProgressRef.current = 0;
              setHoldProgress(0);
            }
          } else {
            // User is between standing and squat depth (descending or ascending)
            // Shield is DISABLED!
            shieldActiveRef.current = false;
            isSquatHoldingRef.current = false;
            setIsShieldActiveState(false);

            if (repCycleStatusRef.current === "STAND_UP_TO_RECHARGE") {
              setCombatBanner("STAND UP TO RECHARGE SHIELD!");
              setCombatBannerType("FAULT");
            } else {
              setCombatBanner(currentExerciseConfig.prompts.initial);
              setCombatBannerType("WAITING");
            }

            holdProgressRef.current = Math.max(0, holdProgressRef.current - 0.04);
            setHoldProgress(holdProgressRef.current);
          }
        }

        const socket = socketRef.current;
        if (socket && socket.readyState === WebSocket.OPEN) {
          const lms = results.poseLandmarks;
          const getCoord = (idx: number) => {
            const p = lms[idx];
            if (!p) return [0, 0, 0, 0];
            return [p.x, p.y, p.z || 0, p.visibility || 1];
          };

          // Bilateral 3D Coordinates Vector Payload [x, y, z, v]
          const payload = {
            exercise_type: exerciseRef.current,
            difficulty: difficultyRef.current,
            modifiers: modifiersRef.current,
            left: {
              shoulder: getCoord(11),
              elbow: getCoord(13),
              wrist: getCoord(15),
              hip: getCoord(23),
              knee: getCoord(25),
              ankle: getCoord(27),
            },
            right: {
              shoulder: getCoord(12),
              elbow: getCoord(14),
              wrist: getCoord(16),
              hip: getCoord(24),
              knee: getCoord(26),
              ankle: getCoord(28),
            },
          };
          socket.send(JSON.stringify(payload));
        }
      }
    });

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/pose";
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      setWsConnected(true);
      setCombatBanner("READY • POSITION BODY");
      setCombatBannerType("WAITING");
      // Synchronize chosen exercise and difficulty on connect
      socket.send(
        JSON.stringify({
          action: "set_exercise",
          exercise_type: exerciseRef.current,
          difficulty: difficultyRef.current,
          modifiers: modifiersRef.current,
        })
      );
    };

    socket.onclose = () => {
      setWsConnected(false);
    };

    socket.onerror = (err) => {
      console.warn("WebSocket status:", err);
      setWsConnected(false);
    };

    socket.onmessage = (event) => {
      if (!isRunning) return;
      try {
        const data: BioEnginePacket = JSON.parse(event.data);

        // Ignore packets if exercise changed and backend is sending stale exercise data
        if (data.exercise_type && data.exercise_type !== activeExerciseRef.current && data.exercise_type !== exerciseRef.current) {
          return;
        }

        // Update Orientation & Active Evaluation Profile
        if (data.view_orientation) {
          setOrientationView(data.view_orientation);
        }
        if (data.active_profile) {
          setActiveProfile(data.active_profile);
        }
        if (data.metric_value !== undefined) {
          setProfileMetricValue(data.metric_value);
        }

        // Update Dynamic Angle Labels
        if (data.primary_angle_name) setPrimaryAngleName(data.primary_angle_name);
        if (data.secondary_angle_name) setSecondaryAngleName(data.secondary_angle_name);

        if (data.active_joint_index !== undefined) {
          setActiveJointIdx(data.active_joint_index);
          activeJointIdxRef.current = data.active_joint_index;
        }

        if (data.fault_joint_indices) {
          setFaultJointIndices(data.fault_joint_indices);
          faultJointIndicesRef.current = data.fault_joint_indices;
        }

        // Update Kinematics strictly respecting active exercise
        const isSquatProtocol = activeExerciseRef.current === "squats" || activeExerciseRef.current === "squat";
        const currentPriAngle = data.primary_angle !== undefined ? data.primary_angle : (isSquatProtocol ? data.knee_angle : undefined);
        if (currentPriAngle !== undefined) {
          setPrimaryAngle(Math.round(currentPriAngle));
          primaryAngleRef.current = currentPriAngle;
          setCurrentDisplayAngle(currentPriAngle);

          if (currentPriAngle < minSessionAngle) {
            setMinSessionAngle(Math.round(currentPriAngle));
          }

          // 10Hz sparkline angle trace
          const nowMs = Date.now();
          if (nowMs - lastTraceSampleTimeRef.current >= 100) {
            const elapsedSec = (nowMs - battleStartTime) / 1000;
            setAngleTrace((prev) => [...prev.slice(-150), { timestamp: Number(elapsedSec.toFixed(1)), angle: currentPriAngle }]);
            lastTraceSampleTimeRef.current = nowMs;
          }
        }

        const currentSecAngle = data.secondary_angle !== undefined ? data.secondary_angle : data.hip_angle;
        if (currentSecAngle !== undefined) {
          setSecondaryAngle(Math.round(currentSecAngle));
        }

        const isCalibratingStage = Boolean(gameStageRef.current?.startsWith("CALIBRATION_"));
        if (isCalibratingStage || gameStageRef.current !== "ACTIVE_DEFLECTION") {
          return;
        }

        if (data.rep_count !== undefined) {
          setRepCount(data.rep_count);

          // Circuit Mode Automatic Gauntlet Progression (Squats -> Overhead Press)
          if (
            activeCircuitModeRef.current === "FULL_BODY" &&
            circuitStepRef.current === 1 &&
            data.rep_count >= 5
          ) {
            circuitStepRef.current = 2;
            setCircuitStep(2);
            setExercise("overhead_press");
            exerciseRef.current = "overhead_press";
            speakCoachCue("Squats gauntlet cleared! Transitioning to Stage 2: Overhead Press. Deflect incoming vertical attacks!");
            if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
              socketRef.current.send(JSON.stringify({ action: "set_exercise", exercise: "overhead_press" }));
            }
          }
        }

        if (data.purity !== undefined) {
          setFormPurity(Math.round(data.purity));
        }

        // Phase 6 & Phase 7 Boss Combat Synchronization
        if (data.boss_hp !== undefined) {
          setBossHp(data.boss_hp);
        }
        if (data.boss_max_hp !== undefined) {
          setBossMaxHp(data.boss_max_hp);
        }
        if (data.total_tension_time_sec !== undefined) {
          setTotalTensionTimeSec(data.total_tension_time_sec);
        }
        if (data.player_hp !== undefined && !isRestDayRef.current) {
          if (gameStageRef.current === "ACTIVE_DEFLECTION") {
            if (data.player_hp < playerHpRef.current) {
              playerHpRef.current = data.player_hp;
              setPlayerHp(data.player_hp);
            }
          } else {
            playerHpRef.current = data.player_hp;
            setPlayerHp(data.player_hp);
          }
        }
        if (data.boss_state) {
          setBossState(data.boss_state);
        }
        if (data.boss_attack_timer !== undefined) {
          setBossAttackTimer(data.boss_attack_timer);
        }
        if (data.incoming_attack !== undefined) {
          setIncomingAttack(data.incoming_attack);
        }
        if (data.parry_window_sec !== undefined) {
          setParryWindowSec(data.parry_window_sec);
        }
        if (data.combo_streak !== undefined) {
          setComboStreak(data.combo_streak);
        }
        if (data.combo_multiplier !== undefined) {
          setComboMultiplier(data.combo_multiplier);
        }

        // Handle Parry Deflection (Counter Attack)
        if (data.parry_success) {
          synth.playParrySuccess();
          screenShakeRef.current = 14;
          setCombatBanner("PARRY DEFLECTED! (+50 COUNTER DMG)");
          setCombatBannerType("CRIT");
          const canvas = canvasRef.current;
          if (canvas) {
            spawnParticles(canvas.width / 2, canvas.height * 0.45, 45, "#00f0ff");
            spawnFloatingText("🛡️ PARRY DEFLECT! -50", canvas.width / 2, canvas.height * 0.35, "#00f0ff", 36);
          }
        }

        // Handle Parry Failure (Heavy Direct Hit)
        if (data.parry_failed) {
          if (isRestDayRef.current) {
            const canvas = canvasRef.current;
            if (canvas) {
              spawnFloatingText("🌿 RESTORATIVE SHIELD (0 DMG)", canvas.width / 2, canvas.height * 0.5, "#10b981", 32);
            }
          } else {
            synth.playStun();
            synth.playBossAttack();
            screenShakeRef.current = 30;
            setScreenGlitch(true);
            setTimeout(() => setScreenGlitch(false), 500);
            setCombatBanner("PARRY FAILED - DIRECT HIT TAKEN (-35 HP)!");
            setCombatBannerType("EGO_LIFT");
            const canvas = canvasRef.current;
            if (canvas) {
              spawnParticles(canvas.width / 2, canvas.height * 0.5, 40, "#ff0055");
              spawnFloatingText("-35 HP BOSS CRUSH!", canvas.width / 2, canvas.height * 0.5, "#ff0055", 36);
            }
          }
        }

        // Handle Streak Collapse
        if (data.streak_collapsed) {
          synth.playStreakBreak();
          setCombatBanner("FORM FAULT - COMBO STREAK COLLAPSED!");
          setCombatBannerType("FAULT");
          const canvas = canvasRef.current;
          if (canvas) {
            spawnFloatingText("STREAK BROKEN (1.0x)", canvas.width / 2, canvas.height * 0.6, "#ff4444", 30);
          }
        }

        // Audio Biomechanical Coach Cue
        if (data.audio_cue) {
          speakCoachCue(data.audio_cue);
        }

        // Reactive In-Game AI Biomechanical Audio Coach (/api/ai-coach)
        if (data.has_fault && data.fault_type) {
          const fKey = data.fault_type.toLowerCase();
          const now = Date.now();
          if (!lastFaultEpisodeTimeRef.current || now - lastFaultEpisodeTimeRef.current > 1500) {
            lastFaultEpisodeTimeRef.current = now;
            recentFaultsListRef.current.push(fKey);
            if (recentFaultsListRef.current.length > 10) {
              recentFaultsListRef.current.shift();
            }

            if (lastFaultTypeRef.current === fKey) {
              faultRepeatCountRef.current += 1;
            } else {
              lastFaultTypeRef.current = fKey;
              faultRepeatCountRef.current = 1;
            }

            if (
              aiAudioGuidanceRef.current &&
              faultRepeatCountRef.current >= 2 &&
              now - lastAiCoachCallTimeRef.current > 6000
            ) {
              lastAiCoachCallTimeRef.current = now;
              faultRepeatCountRef.current = 0;
              const hd = holdDurationsRef.current;
              const avgHold = hd.length > 0 ? hd.reduce((a, b) => a + b, 0) / hd.length : 1.5;
              fetch("/api/ai-coach", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  reps: data.rep_count ?? repCountRef.current,
                  avgHold: Number(avgHold.toFixed(2)),
                  faults: [...recentFaultsListRef.current],
                  currentStage: gameStageRef.current || "ACTIVE_DEFLECTION",
                  exercise: exerciseRef.current,
                }),
              })
                .then((r) => r.json())
                .then((resData) => {
                  if (resData?.cue) {
                    speakCoachCue(resData.cue);
                  }
                })
                .catch((err) => console.warn("AI coach error:", err));
            }
          }
        }

        // Handle Hold Progress & Audio Tick
        if (data.hold_progress !== undefined) {
          setHoldProgress(data.hold_progress);
          holdProgressRef.current = data.hold_progress;

          if (data.hold_progress > 0) {
            if (Date.now() - lastHoldTickTimeRef.current >= 280) {
              synth.playHoldTick(data.hold_progress);
              lastHoldTickTimeRef.current = Date.now();
            }
          }
        }

        // Handle Stun & Fault Events
        if (data.status === "penalty" || data.phase === "STUNNED" || (data.damage_taken && data.damage_taken > 0 && !data.parry_failed)) {
          setIsStunned(true);
          isStunnedRef.current = true;
          setOverheatMeter(100);
          setStunTimer(3.0);
          setCombatBanner(data.message || "FORM PENALTY - STUNNED!");
          setCombatBannerType("EGO_LIFT");
          setEgoLiftsCount((c) => c + 1);

          if (data.damage_taken && data.damage_taken > 0) {
            if (isRestDayRef.current) {
              const canvas = canvasRef.current;
              if (canvas) {
                spawnFloatingText("🌿 RESTORATIVE SHIELD (0 DMG)", canvas.width / 2, canvas.height / 2 + 50, "#10b981", 32);
              }
            } else {
              synth.playStun();
              screenShakeRef.current = 18;
              setPlayerHp((prev) => {
                const next = Math.max(0, prev - data.damage_taken!);
                playerHpRef.current = next;
                return next;
              });
              const canvas = canvasRef.current;
              if (canvas) {
                spawnFloatingText(`-${data.damage_taken} HP STUN`, canvas.width / 2, canvas.height / 2 + 50, "#ff0055", 34);
              }
            }
          }
        } else if (data.status === "hit" || data.event === "HOLD_HIT" || data.event === "REP_COMPLETE") {
          setIsStunned(false);
          isStunnedRef.current = false;
          setCombatBanner(data.message || "CRITICAL HIT!");
          setCombatBannerType("CRIT");

          const dmg = data.damage || 100;
          if (data.boss_hp === undefined && dmg > 0 && !data.parry_success) {
            synth.playCritHit();
            screenShakeRef.current = 16;
            setBossHp((prev) => Math.max(0, prev - dmg));

            const mult = data.combo_multiplier || 1.0;
            const canvas = canvasRef.current;
            if (canvas) {
              spawnParticles(canvas.width / 2, canvas.height * 0.6, 30, mult >= 3.0 ? "#ff0055" : "#ffd700");
              spawnFloatingText(
                mult > 1.0 ? `-${dmg} (x${mult.toFixed(1)})` : `-${dmg} CRIT!`,
                canvas.width / 2,
                canvas.height * 0.4,
                mult >= 3.0 ? "#ff2a5f" : "#ffd700",
                mult >= 3.0 ? 40 : 36
              );
            }
          }

          if (data.event === "REP_COMPLETE") {
            if (data.combo_multiplier && data.combo_multiplier > 1.0) {
              synth.playStreakLevelUp(data.combo_multiplier);
            }
            if (!data.has_fault) {
              lastFaultTypeRef.current = null;
              faultRepeatCountRef.current = 0;
            }
            const holdDur = Math.max(1.0, data.hold_time || 1.5);
            setHoldDurations((prev) => [...prev, holdDur]);
            const repDepth = Math.round(currentPriAngle || 90);
            setRepDetails((prev) => [
              ...prev,
              {
                repIndex: data.rep_count,
                exercise: exerciseRef.current,
                minAngle: repDepth,
                holdDuration: holdDur,
                purityScore: data.purity || 100,
                verdict: data.has_fault ? (data.fault_type?.toUpperCase() || "FAULT") : "OPTIMAL",
                faults: data.fault_type || "NONE",
                timestamp: new Date().toLocaleTimeString(),
              },
            ]);

            // Phase 8: Clinical ROM Milestone Check (7-Day Historical Rolling Average)
            const hist = recoveryHistoryRef.current;
            const baseline = baselineSessionRef.current;
            const recentSessions = hist.slice(-7);
            const historicalAvg = recentSessions.length > 0
              ? recentSessions.reduce((acc, s) => acc + s.avgDepthAngle, 0) / recentSessions.length
              : baseline.avgDepthAngle;

            if (repDepth <= historicalAvg - 2.0 && (!data.has_fault || data.fault_type !== "valgus")) {
              const deltaGain = Math.round(historicalAvg - repDepth);
              const toastText = `+${deltaGain}° MOBILITY MILESTONE UNLOCKED! (+100 Bio-Credits)`;
              setRomToast(toastText);
              synth.playHarmonicChord();
              setBioCredits((prev) => {
                const updated = prev + 100;
                try {
                  localStorage.setItem("athletemind_bio_credits", updated.toString());
                } catch {}
                return updated;
              });
              const canvas = canvasRef.current;
              if (canvas) {
                spawnParticles(canvas.width / 2, canvas.height * 0.35, 45, "#ffd700");
                spawnFloatingText(`+${deltaGain}° MOBILITY MILESTONE!`, canvas.width / 2, canvas.height * 0.3, "#ffd700", 34);
              }
              setTimeout(() => setRomToast(null), 4500);
            }
          }
        } else if (data.phase === "HOLDING") {
          setIsStunned(false);
          isStunnedRef.current = false;
          setCombatBanner(`HOLD POSITION... (${(data.hold_time || 0).toFixed(1)}s / ${(data.hold_target || 1.5)}s)`);
          setCombatBannerType("HOLD");
        } else if (data.has_fault) {
          setIsStunned(false);
          isStunnedRef.current = false;
          setCombatBanner(data.message);
          setCombatBannerType("FAULT");
          if (data.fault_type === "valgus") setValgusCount((v) => v + 1);
          else setPostureFaultsCount((p) => p + 1);
        } else {
          setIsStunned(false);
          isStunnedRef.current = false;
          setCombatBanner(data.message || "READY • COMMENCE EXERCISE");
          setCombatBannerType("WAITING");
        }
      } catch (err) {
        console.error("Packet parse error:", err);
      }
    };

    const startCamera = async () => {
      try {
        let stream = streamRef.current;
        if (!stream) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
              audio: false,
            });
          } catch {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          }
          if (!isRunning) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          streamRef.current = stream;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCameraActive(true);

        const loop = async () => {
          if (!isRunning) return;

          renderCanvasPassRef.current();

          if (
            videoRef.current &&
            videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
            !isProcessingPoseRef.current &&
            poseInstanceRef.current
          ) {
            isProcessingPoseRef.current = true;
            poseInstanceRef.current
              .send({ image: videoRef.current })
              .catch(() => {})
              .finally(() => {
                isProcessingPoseRef.current = false;
              });
          }

          if (isRunning) {
            animFrameIdRef.current = requestAnimationFrame(loop);
          }
        };

        animFrameIdRef.current = requestAnimationFrame(loop);
      } catch (err) {
        console.error("Camera access failed:", err);
        setCameraActive(false);
      }
    };

    startCamera();

    return () => {
      isRunning = false;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      try {
        pose.close();
      } catch {
        // safe
      }
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
    };
  }, [scriptReady, renderCanvasPass, spawnParticles, spawnFloatingText, battleStartTime, minSessionAngle, speakCoachCue]);

  const purityColor = formPurity >= 90 ? "text-emerald-400" : formPurity >= 70 ? "text-amber-400" : "text-rose-500";
  const durationSeconds = Math.round((Date.now() - battleStartTime) / 1000);
  const avgHoldDuration = holdDurations.length > 0
    ? Number((holdDurations.reduce((a, b) => a + b, 0) / holdDurations.length).toFixed(2))
    : targetHoldDuration;

  // Rules-Based Clinical Recommendation Generator
  const getClinicalRecommendation = () => {
    if (exercise === "squats") {
      if (valgusCount > 2) {
        return "Medial knee collapse (valgus) detected: recommend gluteus medius conditioning, banded abduction squats, and clamshells.";
      }
      if (minSessionAngle > 100) {
        return "Limited squat depth: focus on ankle dorsiflexion and adductor mobility to achieve parallel depth.";
      }
      return "Symmetric lower extremity kinematics: bilateral joint flexion displays steady eccentric control.";
    } else if (exercise === "pushups" || exercise === "wall_pushup") {
      if (postureFaultsCount > 2) {
        return "Core/lumbar sagging detected during push-ups: strengthen anterior core via RKC planks and hollow body holds.";
      }
      return "Optimal sagittal push-up mechanics: scapular protraction and lumbar neutral maintained.";
    } else if (exercise === "overhead_press") {
      if (postureFaultsCount > 2) {
        return "Lumbar hyperextension compensation observed: engage rectus abdominis and improve thoracic extension.";
      }
      return "True vertical pressing plane: scapular upward rotation and spinal bracing meet athletic standards.";
    } else if (exercise === "rdl") {
      if (postureFaultsCount > 2) {
        return "Squatting the hinge detected: maintain soft knee flexion while emphasizing posterior hip drive and hamstring recruitment.";
      }
      return "Pure hip hinge mechanics: posterior chain load transfer and spinal neutrality verified.";
    } else {
      const activeCfg = getExerciseConfig(exercise);
      if (postureFaultsCount > 2) {
        return `${activeCfg.faultPrompt}: ensure strict biomechanical alignment according to clinical guidelines.`;
      }
      return `Superb ${activeCfg.name} kinematic execution: target ROM and neuromuscular control verified.`;
    }
  };

  if (!hasMounted) {
    // Render a clean loading or menu shell during initial server SSR
    return (
      <div className="min-h-screen bg-slate-950 text-cyan-400 flex items-center justify-center font-mono">
        INITIALIZING SYSTEM...
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen bg-[#050811] text-white flex flex-col font-mono select-none overflow-hidden">
      <Script
        src="https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />

      <video ref={videoRef} className="hidden" playsInline muted autoPlay />

      {/* ------------------------------------------------------------------- */}
      {/* MODULAR MENU NAVIGATION SYSTEM & SUB-VIEWS                          */}
      {/* ------------------------------------------------------------------- */}
      {activeView === "MAIN_MENU" && (
        <MainMenu
          streak={adherence?.streakDays || 1}
          unlockedAchievementsCount={achievementsList.filter((a) => a.unlocked).length}
          totalAchievementsCount={achievementsList.length}
          bioCredits={bioCredits}
          energyCores={vault.energyCores}
          callsign={callsign}
          activeExerciseName={getExerciseConfig(exercise).name}
          onOpenExerciseSelector={() => setShowExerciseSelector(true)}
          onNavigate={(view) => setActiveView(view)}
        />
      )}

      {activeView === "CIRCUIT_SELECT" && (
        <CircuitSelectView
          onSelectMode={handleLaunchCircuit}
          onBack={() => setActiveView("MAIN_MENU")}
        />
      )}

      {activeView === "CAMERA_TEST" && (
        <CameraTestView
          canvasRef={canvasRef}
          videoWidth={videoRef.current?.videoWidth || 640}
          videoHeight={videoRef.current?.videoHeight || 480}
          fps={currentFps}
          jointVisibility={jointVisibility}
          distanceStatus={distanceStatus}
          onBack={() => setActiveView("MAIN_MENU")}
          onLaunchArena={() => setActiveView("ARENA")}
        />
      )}

      {activeView === "TELEMETRY" && (
        <TelemetryView
          angleTrace={angleTrace}
          repCount={repCount}
          formPurity={formPurity}
          avgHoldDuration={
            holdDurations.length > 0
              ? holdDurations.reduce((a, b) => a + b, 0) / holdDurations.length
              : targetHoldDuration
          }
          valgusCount={valgusCount}
          minSessionAngle={minSessionAngle}
          exercise={exercise}
          difficulty={difficulty}
          onBack={() => setActiveView("MAIN_MENU")}
        />
      )}

      {activeView === "COMPARISON" && (
        <ComparisonView
          baselineSession={baselineSession}
          recoveryHistory={recoveryHistory}
          activeExercise={exercise}
          currentSession={{
            minAngle: minSessionAngle < 180 ? minSessionAngle : 90,
            holdDuration:
              holdDurations.length > 0
                ? Math.max(...holdDurations)
                : targetHoldDuration,
            valgusCount: valgusCount,
            descentTime: 2.2,
          }}
          onBack={() => setActiveView("MAIN_MENU")}
        />
      )}

      {activeView === "ACHIEVEMENTS" && (
        <AchievementsView
          achievements={achievementsList}
          onBack={() => setActiveView("MAIN_MENU")}
        />
      )}

      {activeView === "SETTINGS" && (
        <SettingsView
          activeSoundpack={vault.activeSoundpack}
          activeShader={vault.activeShader}
          isMuted={isMuted}
          isRestDay={isRestDay}
          energyCores={vault.energyCores}
          flexibilityTolerance={flexibilityTolerance}
          onSelectFlexibilityTolerance={(pct) => {
            setFlexibilityTolerance(pct);
            flexibilityToleranceRef.current = pct;
          }}
          onToggleMute={handleToggleMute}
          onToggleRestDay={handleToggleRestDay}
          onSelectSoundpack={handleBuyOrEquipSoundpack}
          onSelectShader={handleBuyOrEquipShader}
          onResetAllData={handleResetAllData}
          onBack={() => setActiveView("MAIN_MENU")}
        />
      )}

      {/* ------------------------------------------------------------------- */}
      {/* ARENA COMBAT & CALIBRATION VIEW                                     */}
      {/* ------------------------------------------------------------------- */}
      {activeView === "ARENA" && (
        <>
          <header className="relative z-30 flex items-center justify-between px-6 py-2.5 bg-[#080d1a]/85 border-b border-slate-800/80 backdrop-blur-md h-14">
            {/* Left: Pilot Status Callout & Menu Navigation */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveView("MAIN_MENU")}
                className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-cyan-500/20 border border-slate-700 hover:border-cyan-400 text-xs font-bold text-cyan-300 transition-all cursor-pointer flex items-center gap-1.5 shadow-lg mr-1"
                title="Return to Main Menu"
              >
                <span>←</span>
                <span>MENU</span>
              </button>
              <div className="w-8 h-8 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-sm shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                🛡️
              </div>
              <div className="hidden sm:flex flex-col text-left font-mono">
                <span className="text-xs font-black tracking-widest text-cyan-300">ATHLETEMIND</span>
                <span className="text-[10px] text-slate-400 font-bold tracking-wider">
                  PILOT HP: <span className={playerHp > 30 ? "text-emerald-400" : "text-rose-400 animate-pulse"}>{playerHp}%</span>
                </span>
              </div>
              {activeCircuitMode && (
                <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-950/80 border border-amber-500/50 text-[11px] font-bold text-amber-300">
                  <span>⚡ CIRCUIT: {activeCircuitMode.replace("_", " ")}</span>
                  {activeCircuitMode === "FULL_BODY" && <span>• STAGE {circuitStep}/2</span>}
                </div>
              )}
              <button
                onClick={() => setShowExerciseSelector(true)}
                className="px-3 py-1.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 hover:border-cyan-400 text-xs font-mono font-bold text-cyan-300 transition-all cursor-pointer flex items-center gap-1.5 shadow-md group"
                title="Change Clinical Exercise Protocol"
              >
                <span>{getExerciseConfig(exercise).icon}</span>
                <span className="hidden md:inline uppercase">{getExerciseConfig(exercise).name}</span>
                <span className="text-[10px] text-cyan-400/80 group-hover:text-white">▾</span>
              </button>
            </div>

        {/* Center: Large High-Contrast Status Callout */}
        <div className="flex items-center justify-center">
          <div className="text-center font-mono">
            <div className="text-base sm:text-xl font-black text-cyan-300 tracking-widest uppercase animate-pulse flex items-center gap-2">
              <span>
                {gameStage === "PAUSED"
                  ? "⏸️ MOTOR SYNC PAUSED"
                  : gameStage === "PROLOGUE"
                  ? "TACTICAL BRIEFING // AEGIS OFFLINE"
                  : gameStage === "CALIBRATION_ARMS"
                  ? (armCalibrationVerified ? "ARMS VERIFIED // SYNCING" : "CALIBRATING ARMS: RAISE TO SIDES")
                  : gameStage === "CALIBRATION_STANCE"
                  ? (stanceCalibrationVerified ? "STANCE VERIFIED // SYNCING" : "CALIBRATING STANCE: STAND TALL")
                  : gameStage === "CALIBRATION_SHIELD"
                  ? `CHARGING SHIELD: ${Math.round(shieldTestHoldProgress * 100)}%`
                  : gameStage === "BOSS_INTRO"
                  ? `⚠️ COLOSSUS SPAWN IN ${bossIntroCountdown}s`
                  : gameStage === "EPILOGUE"
                  ? "MISSION COMPLETED // PURITY RESTORED"
                  : incomingAttack
                  ? "⚠️ INCOMING BOSS STRIKE — PARRY!"
                  : combatBanner || (EXERCISE_REGISTRY[activeExerciseRef.current] || EXERCISE_REGISTRY["squats"]).prompts.initial}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Subtle Pause / Resume Control */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (gameStage === "ACTIVE_DEFLECTION" || gameStage === "PAUSED") {
                handleTogglePause();
              } else if (gameStage === "PROLOGUE") {
                handleStartCampaign();
              } else if (gameStage === "EPILOGUE") {
                handleRestartCampaign();
              }
            }}
            className={`px-4 py-1.5 rounded-xl border text-xs font-mono font-black tracking-wider transition-all cursor-pointer flex items-center gap-2 shadow-lg ${
              gameStage === "PAUSED"
                ? "bg-cyan-500 hover:bg-cyan-400 border-cyan-400 text-black shadow-[0_0_15px_rgba(0,240,255,0.6)] animate-pulse"
                : "bg-slate-900/80 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
            }`}
            title="Toggle Pause / Resume (Spacebar)"
          >
            <span>
              {gameStage === "PAUSED"
                ? "▶ RESUME"
                : gameStage === "ACTIVE_DEFLECTION"
                ? "⏸ PAUSE"
                : gameStage === "PROLOGUE"
                ? "▶ START"
                : gameStage === "EPILOGUE"
                ? "🔄 RESTART"
                : "⏸ PAUSE"}
            </span>
          </button>
        </div>
      </header>

      {/* Clinical Rest Day Serenity Banner */}
      {isRestDay && (
        <div className="relative z-20 w-full bg-gradient-to-r from-emerald-950/95 via-teal-900/95 to-emerald-950/95 border-b border-emerald-500/50 py-1.5 px-4 text-center text-[11px] font-bold uppercase tracking-widest text-emerald-200 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
          <span className="text-emerald-400">🌿</span>
          <span>SYSTEM REGENERATION ACTIVE // REST PRESERVES YOUR STREAK • COMBAT HAZARDS ZEROED</span>
          <span className="text-emerald-400">🌿</span>
        </div>
      )}

      {/* Real-Time ROM Milestone Toast Banner */}
      {romToast && (
        <div className="relative z-20 w-full bg-gradient-to-r from-amber-950/95 via-yellow-900/95 to-amber-950/95 border-b border-amber-400/80 py-2 px-4 text-center text-xs font-black uppercase tracking-widest text-amber-200 flex items-center justify-center gap-2 animate-bounce shadow-[0_0_25px_rgba(245,158,11,0.6)]">
          <span className="text-yellow-300">🌟</span>
          <span>{romToast}</span>
          <span className="text-yellow-300">🌟</span>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 2. MAIN ARENA VIEWPORT (FUTURISTIC COCKPIT FRAME & ROCKET BLUEPRINT) */}
      {/* ------------------------------------------------------------------- */}
      <main className="relative flex-1 w-full h-[calc(100vh-3.5rem)] flex items-center justify-center p-0 bg-[#050811] overflow-hidden">
        <FuturisticCockpitFrame
          currentAngle={primaryAngle}
          targetAngle={
            activeExerciseRef.current === "squats"
              ? Math.round(90 + (flexibilityTolerance / 100) * 80)
              : (EXERCISE_REGISTRY[activeExerciseRef.current] || EXERCISE_REGISTRY["squats"]).targetAngle || 90
          }
          formPurity={formPurity}
          holdProgress={holdProgress}
          exerciseName={(EXERCISE_REGISTRY[activeExerciseRef.current] || EXERCISE_REGISTRY["squats"]).name}
          torsoTilt={0}
          isShieldActive={isShieldActiveState}
          repCycleStatus={repCycleStatus}
          flexibilityTolerance={flexibilityTolerance}
          onFlexibilityChange={(pct) => {
            setFlexibilityTolerance(pct);
            flexibilityToleranceRef.current = pct;
            synth.playCalibrationBeep(false);
          }}
          className={`h-[92vh] max-h-[92vh] max-w-full aspect-[4/3] md:aspect-[16/9] mx-auto shadow-2xl transition-all duration-500 ${
            isEnraged
              ? "border-rose-500/80 shadow-[0_0_60px_rgba(244,63,94,0.4)]"
              : "border-cyan-500/30 shadow-[0_0_50px_rgba(0,240,255,0.12)]"
          }`}
        >
          <canvas
            ref={canvasRef}
            width={1280}
            height={720}
            className="w-full h-full object-cover"
          />

          {/* Red Glitch Direct Hit Damage Overlay */}
          {screenGlitch && (
            <div className="absolute inset-0 z-35 bg-rose-600/35 pointer-events-none mix-blend-screen animate-pulse backdrop-invert" />
          )}

          {/* Left Lateral HUD: Rocket Blueprint Schematic & Combat Metrics */}
          <div className="absolute top-3 left-3 z-25 flex flex-col gap-2 pointer-events-auto max-w-[190px] sm:max-w-[210px]">
            <RocketBlueprintHUD
              playerHp={playerHp}
              playerMaxHp={100}
              isShieldActive={isShieldActiveState}
              shieldHoldProgress={holdProgress}
              isBreached={(shieldBreachFlashRef.current > performance.now()) || screenGlitch}
              isExploding={isShipExploding}
              repCycleStatus={repCycleStatus}
            />

            {/* Quick Tactical Metrics: REPS & STREAK */}
            <div className="grid grid-cols-2 gap-1.5 w-full">
              <div className="bg-slate-950/85 backdrop-blur-md border border-cyan-500/40 rounded-xl p-2 flex flex-col items-center justify-center text-center shadow-lg">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">REPS</span>
                <span className="text-3xl font-black text-cyan-400 font-mono leading-none mt-0.5">
                  {repCount.toString().padStart(2, "0")}
                </span>
              </div>
              <div className="bg-slate-950/85 backdrop-blur-md border border-amber-500/40 rounded-xl p-2 flex flex-col items-center justify-center text-center shadow-lg">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">STREAK</span>
                <span className="text-2xl font-black text-amber-400 font-mono leading-none mt-0.5 flex items-center justify-center gap-1">
                  <span>🔥</span>
                  <span>{comboStreak > 0 ? `${comboStreak}x` : "1x"}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right Lateral HUD (Deflections, Boss HP, Strike Alert, Restart) */}
          <div className="absolute top-4 right-4 z-20 w-52 flex flex-col gap-3 text-right items-end pointer-events-auto">
            {/* DEFLECTED */}
            <div className="w-full bg-slate-950/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 shadow-xl flex flex-col items-end">
              <div className="text-xs text-slate-400 font-bold uppercase mb-1">DEFLECTED</div>
              <div className="text-4xl font-black text-cyan-400 font-mono tracking-tight flex items-center gap-2">
                <span className="text-2xl">🛡️</span>
                <span>{deflectionsCompleted} / {deflectionsTarget}</span>
              </div>
            </div>

            {/* BOSS / ANOMALY HP */}
            <div className="w-full bg-slate-950/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 shadow-xl flex flex-col items-end">
              <div className="text-xs text-slate-400 font-bold uppercase mb-1 flex items-center gap-1">
                {isEnraged && <span className="text-amber-400 animate-ping">⚡</span>}
                <span className={isEnraged ? "text-rose-400 font-black" : "text-slate-400"}>
                  {isEnraged ? "OVERCLOCKED" : "COLOSSUS HP"}
                </span>
              </div>
              <div className="text-3xl font-black text-red-400 font-mono tracking-tight">
                {bossHp} / {bossMaxHp}
              </div>
              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden p-0.5 border border-red-500/40 mt-2">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isEnraged
                      ? "bg-gradient-to-r from-red-600 via-rose-500 to-amber-400 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.9)]"
                      : "bg-gradient-to-r from-violet-600 to-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]"
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, (bossHp / bossMaxHp) * 100))}%` }}
                />
              </div>
            </div>

            {/* STRIKE / PARRY ALERT */}
            <div className={`w-full bg-slate-950/70 backdrop-blur-md border rounded-2xl p-4 shadow-xl flex flex-col items-end transition-all ${
              incomingAttack
                ? "border-rose-500/80 shadow-[0_0_20px_rgba(244,63,94,0.5)] animate-pulse"
                : "border-slate-800/80"
            }`}>
              <div className="text-xs text-slate-400 font-bold uppercase mb-1">
                {incomingAttack ? "PARRY ALERT" : "STRIKE IN"}
              </div>
              <div
                className={`text-3xl font-black font-mono tracking-tight ${
                  incomingAttack
                    ? "text-rose-400 animate-bounce"
                    : bossAttackTimer <= 3.0
                    ? "text-rose-400 animate-pulse"
                    : "text-amber-300"
                }`}
              >
                {incomingAttack ? `PARRY: ${parryWindowSec.toFixed(1)}s` : `${bossAttackTimer.toFixed(1)}s`}
              </div>
            </div>

            {/* RESTART BUTTON */}
            <button
              onClick={handleRestartCampaign}
              className="w-full bg-slate-900/80 hover:bg-red-500/20 border border-slate-700 hover:border-red-500/50 text-sm font-mono py-2.5 px-4 rounded-xl cursor-pointer text-slate-200 hover:text-white transition-all shadow-lg flex items-center justify-center gap-2"
              title="Restart Campaign Session"
            >
              <span>🔄</span>
              <span>RESTART</span>
            </button>
          </div>

          {/* Timed Evasion & Biomechanical Parry Reticle Overlay */}
          {incomingAttack && matchStatus === "ACTIVE" && (
            <div className="absolute inset-0 z-35 flex flex-col items-center justify-center pointer-events-none">
              <div className="relative flex flex-col items-center p-6 rounded-3xl bg-black/85 border-2 border-rose-500 shadow-[0_0_50px_rgba(244,63,94,0.8)] backdrop-blur-md animate-pulse max-w-md w-full mx-4">
                <div className="text-4xl mb-2 animate-bounce">
                  {holdProgress > 0 ? "🛡️" : "⚠️"}
                </div>
                <div className="text-rose-400 font-black text-lg sm:text-xl tracking-widest uppercase text-center mb-1">
                  INCOMING BOSS STRIKE
                </div>
                <div className="text-xs sm:text-sm font-bold text-amber-300 text-center tracking-wider mb-3">
                  {holdProgress > 0 ? "SHIELD ENGAGED • MAINTAIN POSTURE TO DEFLECT!" : `PARRY BY ENGAGING ${(EXERCISE_REGISTRY[activeExerciseRef.current] || EXERCISE_REGISTRY["squats"]).prompts.initial} NOW!`}
                </div>

                {/* Parry Timer Countdown Bar */}
                <div className="w-56 h-3 bg-slate-900 rounded-full overflow-hidden border border-rose-400/60 p-0.5 mb-2">
                  <div
                    className={`h-full rounded-full transition-all duration-75 ${
                      holdProgress > 0
                        ? "bg-gradient-to-r from-emerald-400 to-cyan-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]"
                        : "bg-gradient-to-r from-amber-400 to-rose-600 shadow-[0_0_12px_rgba(244,63,94,0.8)]"
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, (parryWindowSec / 3.0) * 100))}%` }}
                  />
                </div>

                <div className="text-xs font-mono font-black text-rose-300">
                  PARRY WINDOW: <span className="text-white text-sm">{parryWindowSec.toFixed(1)}s</span>
                </div>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* CAMPAIGN STATE MACHINE & CALIBRATION OVERLAYS (ZERO CAMERA DESYNC) */}
          {/* --------------------------------------------------------------- */}

          {/* 1. PROLOGUE State: Sci-Fi Tactical Reticle Header (When Dialogue is Active) */}
          {gameStage === "PROLOGUE" && activeDialogueId !== null && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-35 pointer-events-none text-center">
              <div className="px-5 py-2 rounded-2xl bg-black/85 border border-cyan-500/50 backdrop-blur-md shadow-[0_0_25px_rgba(0,240,255,0.3)]">
                <div className="text-[10px] font-black font-mono tracking-[0.3em] text-cyan-400 uppercase flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>TACTICAL EXPOSITION // AEGIS RE-INITIALIZATION</span>
                </div>
                <div className="text-xs font-black font-mono text-white tracking-wider mt-0.5">
                  MISSION BRIEFING: STAGE 01
                </div>
              </div>
            </div>
          )}

          {/* 1b. PROLOGUE State: Standalone Sci-Fi Terminal Modal (When Dialogue is Dismissed) */}
          {gameStage === "PROLOGUE" && activeDialogueId === null && (
            <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
              <div className="w-full max-w-xl p-8 rounded-3xl bg-[#090d19]/90 border-2 border-cyan-500/60 shadow-[0_0_50px_rgba(0,240,255,0.35)] backdrop-blur-lg flex flex-col items-center">
                {/* Sci-Fi Terminal Header */}
                <div className="flex items-center justify-between w-full border-b border-cyan-500/30 pb-3 mb-6">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                    <span className="text-[11px] font-mono tracking-widest text-rose-400 font-black">
                      TERMINAL STATUS: CRITICAL
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-cyan-400 tracking-wider">
                    NODE://ATHLETE-AEGIS-V2
                  </div>
                </div>

                <div className="w-16 h-16 rounded-2xl bg-cyan-950/80 border border-cyan-400/80 flex items-center justify-center text-3xl mb-4 shadow-[0_0_25px_rgba(0,240,255,0.5)]">
                  ⚡
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-widest mb-4 font-mono">
                  BIO-BOUNTY HUNTER: <span className="text-cyan-400">AEGIS PROTOCOL</span>
                </h2>

                {/* Terminal Text Container */}
                <div className="w-full p-4 rounded-xl bg-black/70 border border-cyan-500/30 mb-6 text-left font-mono">
                  <div className="text-[10px] text-cyan-500 uppercase tracking-widest mb-1">
                    &gt; INCOMING TRANSMISSION:
                  </div>
                  <p className="text-xs sm:text-sm text-cyan-200 leading-relaxed font-mono">
                    <TypewriterText
                      text="SYSTEM ALERT: Neural connection severed. Kinetic Aegis Suit offline. Re-establishing motor synchronization to counter incoming biomechanical corruption..."
                      speed={25}
                    />
                  </p>
                </div>

                {/* Action Button */}
                <button
                  onClick={handleStartCampaign}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-black font-black text-xs sm:text-sm uppercase tracking-widest cursor-pointer shadow-[0_0_30px_rgba(0,240,255,0.6)] transition-all flex items-center justify-center gap-2 transform hover:scale-105"
                >
                  <span>⚡</span>
                  <span>INITIALIZE NEURAL SYNC</span>
                </button>

                <div className="mt-4 text-[11px] text-slate-400 font-mono">
                  Press <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300">SPACEBAR</kbd> to initialize
                </div>
              </div>
            </div>
          )}

          {/* 2. CALIBRATION_ARMS: Arm Sensor Test */}
          {gameStage === "CALIBRATION_ARMS" && (
            <div className="absolute inset-0 z-30 pointer-events-none flex flex-col items-center justify-between p-6">
              {/* Dedicated Diagnostic Banner */}
              <div className="w-full max-w-2xl px-8 py-4 rounded-3xl bg-cyan-950/90 border-2 border-cyan-400 shadow-[0_0_40px_rgba(0,240,255,0.5)] backdrop-blur-md text-center animate-pulse">
                <div className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold mb-1">
                  CALIBRATION PHASE 1/3 • ARM SENSOR TEST
                </div>
                <div className="text-lg sm:text-2xl font-black font-mono uppercase tracking-wider text-cyan-300 drop-shadow-[0_0_20px_rgba(0,240,255,0.8)]">
                  CALIBRATION: RAISE BOTH ARMS ABOVE SHOULDERS
                </div>
              </div>

              {/* Wrist Feedback Indicators */}
              <div className="flex items-center gap-4 px-5 py-2.5 rounded-2xl bg-black/80 border border-cyan-500/40 backdrop-blur-md">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all ${
                  armCalibrationVerified ? "bg-emerald-950/80 border-emerald-400 text-emerald-300" : "bg-slate-900 border-slate-700 text-slate-400"
                }`}>
                  <span>{armCalibrationVerified ? "✅" : "⏳"}</span>
                  <span>LEFT & RIGHT WRISTS ELEVATED</span>
                </div>
                <div className="text-[11px] text-cyan-400 font-mono">
                  HOLD POSITION TO ADVANCE
                </div>
              </div>
            </div>
          )}

          {/* 3. CALIBRATION_STANCE: Full Body Framing */}
          {gameStage === "CALIBRATION_STANCE" && (
            <div className="absolute inset-0 z-30 pointer-events-none flex flex-col items-center justify-between p-6">
              {/* Dedicated Diagnostic Banner */}
              <div className="w-full max-w-2xl px-8 py-4 rounded-3xl bg-amber-950/90 border-2 border-amber-400 shadow-[0_0_40px_rgba(245,158,11,0.5)] backdrop-blur-md text-center">
                <div className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold mb-1">
                  CALIBRATION PHASE 2/3 • FULL BODY FRAMING
                </div>
                <div className="text-lg sm:text-2xl font-black font-mono uppercase tracking-wider text-amber-300 drop-shadow-[0_0_20px_rgba(245,158,11,0.8)]">
                  CALIBRATION: STEP BACK UNTIL HIPS & ANKLES ARE VISIBLE
                </div>
              </div>

              {/* Full Body Framing Status Chips */}
              <div className="flex items-center gap-4 px-5 py-2.5 rounded-2xl bg-black/80 border border-amber-500/40 backdrop-blur-md">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all ${
                  stanceCalibrationVerified ? "bg-emerald-950/80 border-emerald-400 text-emerald-300" : "bg-slate-900 border-slate-700 text-slate-400"
                }`}>
                  <span>{stanceCalibrationVerified ? "✅" : "⏳"}</span>
                  <span>HIPS & ANKLES IN FRAME</span>
                </div>
                <div className="text-[11px] text-amber-400 font-mono">
                  ALIGN LOWER BODY IN CAMERA
                </div>
              </div>
            </div>
          )}

          {/* 4. CALIBRATION_SHIELD: Movement Shield Activation Test */}
          {gameStage === "CALIBRATION_SHIELD" && (() => {
            const currentExerciseConfig = EXERCISE_REGISTRY[activeExerciseRef.current] || EXERCISE_REGISTRY["squats"];
            const targetSec = currentExerciseConfig.targetRegion === "UPPER_BODY" ? "1.0s" : "1.5s";
            return (
              <div className="absolute inset-0 z-30 pointer-events-none flex flex-col items-center justify-between p-6">
                {/* Dedicated Diagnostic Banner */}
                <div className="w-full max-w-2xl px-8 py-4 rounded-3xl bg-emerald-950/90 border-2 border-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.5)] backdrop-blur-md text-center">
                  <div className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold mb-1">
                    CALIBRATION PHASE 3/3 • {currentExerciseConfig.name.toUpperCase()} SHIELD ACTIVATION
                  </div>
                  <div className="text-lg sm:text-2xl font-black font-mono uppercase tracking-wider text-emerald-300 drop-shadow-[0_0_20px_rgba(16,185,129,0.8)]">
                    {currentExerciseConfig.prompts.initial}: HOLD FOR {targetSec} TO PRIME SHIELD
                  </div>
                </div>

                {/* Shield Hold Meter */}
                <div className="w-full max-w-md p-4 rounded-2xl bg-black/85 border border-emerald-500/50 backdrop-blur-md flex flex-col items-center">
                  <div className="flex justify-between w-full text-xs font-mono font-bold text-emerald-300 mb-1.5">
                    <span>⬡ SHIELD MATRIX CHARGE</span>
                    <span>{Math.round(shieldTestHoldProgress * 100)}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-emerald-500/30 p-0.5 mb-2">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-300 transition-all duration-75 shadow-[0_0_12px_rgba(16,185,129,0.8)]"
                      style={{ width: `${Math.max(0, Math.min(100, shieldTestHoldProgress * 100))}%` }}
                    />
                  </div>
                  <div className="text-[11px] font-mono text-slate-300">
                    {shieldTestHoldProgress >= 1.0 ? "⚡ SHIELD SYSTEMS OPTIMAL!" : `${currentExerciseConfig.prompts.initial} & HOLD (${targetSec})`}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 5. BOSS_INTRO: 3-Second Red Strobe Klaxon Alert */}
          {gameStage === "BOSS_INTRO" && activeDialogueId === null && (
            <div className="absolute inset-0 z-40 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center pointer-events-none">
              <div className="w-full max-w-lg p-8 rounded-3xl bg-rose-950/80 border-2 border-rose-500 shadow-[0_0_60px_rgba(244,63,94,0.6)] backdrop-blur-md flex flex-col items-center animate-pulse">
                <div className="text-4xl mb-3 animate-bounce">⚠️</div>
                <div className="text-xs font-mono font-black text-amber-400 uppercase tracking-[0.3em] mb-2">
                  CRITICAL THREAT INCOMING
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-rose-300 uppercase tracking-widest mb-3 font-mono drop-shadow-[0_0_20px_rgba(244,63,94,0.8)]">
                  WARNING: APEX CORE DETECTED // HIGH-MASS ORBS INCOMING
                </h2>
                <div className="text-7xl font-black font-mono tracking-tight text-white drop-shadow-[0_0_30px_rgba(244,63,94,0.9)] my-3">
                  {bossIntroCountdown > 0 ? bossIntroCountdown : "ENGAGE!"}
                </div>
                <div className="text-xs text-rose-200 font-mono tracking-wider">
                  PREPARE KINETIC AEGIS SHIELD • 8 ORBS INCOMING
                </div>
              </div>
            </div>
          )}

          {/* 6. PAUSED State: Zero Camera Desync Breather */}
          {gameStage === "PAUSED" && (
            <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 rounded-3xl bg-amber-950/80 border-2 border-amber-400 flex items-center justify-center text-3xl mb-3 shadow-[0_0_30px_rgba(245,158,11,0.4)] animate-pulse">
                ⏸️
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-amber-300 uppercase tracking-widest mb-1 font-mono drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                SESSION PAUSED — TAKE A BREATHER
              </h2>
              <p className="text-xs text-emerald-400 font-mono uppercase tracking-wider mb-6 flex items-center justify-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                CAMERA SENSORS LIVE IN BACKGROUND • ZERO DESYNC
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <button
                  onClick={handleTogglePause}
                  className="px-7 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-widest cursor-pointer shadow-[0_0_20px_rgba(0,240,255,0.5)] transition-all flex items-center gap-2 transform hover:scale-105"
                >
                  <span>▶</span>
                  <span>RESUME PROTOCOL [SPACE]</span>
                </button>
                <button
                  onClick={handleAbortSession}
                  className="px-6 py-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-rose-500/50 hover:border-rose-500 text-rose-300 font-bold text-xs uppercase tracking-widest cursor-pointer transition-all flex items-center gap-2"
                >
                  <span>⏹</span>
                  <span>ABORT & VIEW RECOVERY</span>
                </button>
              </div>
            </div>
          )}

          {/* 7. EPILOGUE State: Victory Debrief & Recovery Dashboard */}
          {gameStage === "EPILOGUE" && (
            <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
              <div className="w-full max-w-2xl p-6 sm:p-8 rounded-3xl bg-[#09101c]/90 border-2 border-cyan-400/80 shadow-[0_0_60px_rgba(0,240,255,0.45)] backdrop-blur-lg flex flex-col items-center my-auto">
                <div className="w-16 h-16 rounded-3xl bg-cyan-950/90 border-2 border-cyan-400 flex items-center justify-center text-3xl mb-3 shadow-[0_0_30px_rgba(0,240,255,0.6)] animate-bounce">
                  🏆
                </div>
                <div className="text-xs font-mono font-black text-emerald-400 uppercase tracking-[0.3em] mb-1">
                  CAMPAIGN STAGE COMPLETE
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-cyan-300 uppercase tracking-widest mb-2 font-mono drop-shadow-[0_0_20px_rgba(0,240,255,0.5)]">
                  THREAT PURIFIED // NEURAL ALIGNMENT RESTORED
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mb-6 font-mono max-w-lg leading-relaxed">
                  All {deflectionsCompleted} of {deflectionsTarget} kinetic orbs deflected with eccentric depth and stability. Motor synchronization restored with zero biomechanical corruption.
                </p>

                {/* Recovery Trajectory Quick Summary Matrix */}
                <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  <div className="p-3 rounded-2xl bg-black/70 border border-cyan-500/30 text-center">
                    <div className="text-[9px] uppercase tracking-widest text-slate-400 font-mono">Deflections</div>
                    <div className="text-xl font-black text-cyan-300 font-mono mt-1">
                      {deflectionsCompleted} / {deflectionsTarget}
                    </div>
                    <div className="text-[10px] text-emerald-400 font-mono">100% Success</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-black/70 border border-cyan-500/30 text-center">
                    <div className="text-[9px] uppercase tracking-widest text-slate-400 font-mono">Peak Depth</div>
                    <div className="text-xl font-black text-amber-300 font-mono mt-1">
                      {minSessionAngle !== 999 ? `${minSessionAngle}°` : `${primaryAngle}°`}
                    </div>
                    <div className="text-[10px] text-emerald-400 font-mono">
                      Δ {(baselineSession.avgDepthAngle - (minSessionAngle !== 999 ? minSessionAngle : primaryAngle)).toFixed(1)}° vs Day 1
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-black/70 border border-cyan-500/30 text-center">
                    <div className="text-[9px] uppercase tracking-widest text-slate-400 font-mono">Form Purity</div>
                    <div className="text-xl font-black text-emerald-400 font-mono mt-1">
                      {formPurity}%
                    </div>
                    <div className="text-[10px] text-cyan-300 font-mono">
                      {valgusCount === 0 ? "Zero Wobble" : `${valgusCount} Faults`}
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-black/70 border border-cyan-500/30 text-center">
                    <div className="text-[9px] uppercase tracking-widest text-slate-400 font-mono">Bio-Credits</div>
                    <div className="text-xl font-black text-yellow-300 font-mono mt-1">
                      +{deflectionsCompleted * 25} ⚡
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Vault: {bioCredits}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={handleExportClinicalCsv}
                    className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-widest cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all flex items-center gap-2 transform hover:scale-105"
                  >
                    <span>📥</span>
                    <span>DOWNLOAD TELEMETRY (.CSV)</span>
                  </button>
                  <button
                    onClick={() => setShowProgressModal(true)}
                    className="px-5 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-widest cursor-pointer shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all flex items-center gap-2 transform hover:scale-105"
                  >
                    <span>📈</span>
                    <span>RECOVERY TRAJECTORY</span>
                  </button>
                  <button
                    onClick={handleRestartCampaign}
                    className="px-5 py-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 font-bold text-xs uppercase tracking-widest cursor-pointer transition-all flex items-center gap-2"
                  >
                    <span>🔄</span>
                    <span>RE-ENTER SIMULATION</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* 8. ARCADE VISUAL-NOVEL EXPOSITION ENGINE DIALOGUE BAR           */}
          {/* --------------------------------------------------------------- */}
          {activeDialogueId !== null && currentSlide && (
            <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 z-45 bg-slate-950/90 backdrop-blur-md border border-cyan-500/40 rounded-3xl p-4 sm:p-5 shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col md:flex-row items-center gap-4 sm:gap-5 transition-all">
              {/* Left Side: 120px x 120px Character Portrait Frame */}
              <div className="relative w-24 h-24 sm:w-[120px] sm:h-[120px] flex-shrink-0 rounded-2xl overflow-hidden bg-black/75 border-2 border-cyan-500/50 p-1 flex items-center justify-center shadow-[0_0_25px_rgba(0,240,255,0.3)]">
                <CharacterPortrait state={currentSlide.portraitState} size={112} />
                {/* State label badge */}
                <div className="absolute bottom-1 right-1 text-[8px] font-mono uppercase px-1.5 py-0.5 rounded bg-black/85 border border-cyan-500/40 text-cyan-300">
                  {currentSlide.portraitState.replace("OPERATIVE_", "")}
                </div>
              </div>

              {/* Center: Speaker Callout Badge + Typing Text Animation */}
              <div className="flex-1 flex flex-col items-start justify-center min-w-0 w-full text-left font-mono">
                {/* Speaker Header */}
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                      currentSlide.portraitState === "AI_ALERT"
                        ? "bg-rose-950/80 border-rose-500 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.6)] animate-pulse"
                        : currentSlide.portraitState === "OPERATIVE_CALIBRATING"
                        ? "bg-amber-950/80 border-amber-500 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                        : currentSlide.portraitState === "OPERATIVE_EMPOWERED"
                        ? "bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                        : "bg-cyan-950/80 border-cyan-500 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.4)]"
                    }`}
                  >
                    [ {currentSlide.speakerTitle} ]
                  </span>
                  <span className="text-[10px] text-slate-500 hidden sm:inline-block">
                    SECURE://NEURAL_LINK_ACTIVE
                  </span>
                </div>

                {/* Narrative Dialogue Body */}
                <div className="text-xs sm:text-sm text-slate-100 font-mono leading-relaxed min-h-[3rem]">
                  <TypewriterText
                    key={`dialogue_${currentSlide.id}`}
                    text={currentSlide.dialogue}
                    speed={18}
                    className="tracking-wide"
                  />
                </div>
              </div>

              {/* Right Side: High-Contrast Action Button + Skip Link */}
              <div className="flex flex-col items-center md:items-end justify-center gap-2 flex-shrink-0 w-full md:w-auto">
                <button
                  onClick={handleAdvanceDialogue}
                  className={`w-full md:w-auto px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest cursor-pointer transition-all flex items-center justify-center gap-2 transform hover:scale-105 shadow-xl ${
                    currentSlide.portraitState === "AI_ALERT"
                      ? "bg-rose-500 hover:bg-rose-400 text-white shadow-[0_0_25px_rgba(244,63,94,0.7)] animate-pulse"
                      : currentSlide.portraitState === "OPERATIVE_EMPOWERED"
                      ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_25px_rgba(16,185,129,0.7)]"
                      : currentSlide.portraitState === "OPERATIVE_CALIBRATING"
                      ? "bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_25px_rgba(245,158,11,0.7)]"
                      : "bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_25px_rgba(0,240,255,0.7)]"
                  }`}
                >
                  <span>{currentSlide.actionLabel}</span>
                </button>

                <button
                  onClick={handleSkipDialogue}
                  className="text-[11px] font-mono text-slate-400 hover:text-cyan-300 underline underline-offset-4 cursor-pointer transition-colors"
                  title="Skip Dialogue (Escape)"
                >
                  Skip Dialogue [ESC]
                </button>
              </div>
            </div>
          )}

          {/* Giant Dynamic Center Action Banner (Strict State-Gated: ACTIVE_DEFLECTION Only) */}
          {gameStage === "ACTIVE_DEFLECTION" && (() => {
            const currentExerciseConfig = EXERCISE_REGISTRY[activeExerciseRef.current] || EXERCISE_REGISTRY["squats"];
            const bannerState = getGiantBannerState();

            // Dynamic HUD Prompts strictly from active exercise definition:
            const promptText = !isDepthTargetMet
              ? currentExerciseConfig.prompts.initial
              : isHolding
              ? currentExerciseConfig.prompts.hold
              : currentExerciseConfig.prompts.complete;

            const customMsg = hasFault
              ? (faultFeedback || currentExerciseConfig.prompts.fault || currentExerciseConfig.faultPrompt)
              : incomingAttack
              ? "⚠️ INCOMING BOSS STRIKE!"
              : promptText;

            return (
              <GiantActionBanner
                state={bannerState}
                holdProgress={holdProgress}
                targetHoldDuration={currentExerciseConfig.deflectionHoldTime || targetHoldDuration}
                customMessage={customMsg}
                subMessage={currentExerciseConfig.instructions}
              />
            );
          })()}

          {/* Bottom Cockpit Quick Badges (Sensor & Profile) */}
          <div className="absolute bottom-3 left-4 z-30 flex items-center gap-2 text-xs text-slate-400 pointer-events-auto">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/80 border border-slate-700/80 backdrop-blur-md">
              <span className={`w-2 h-2 rounded-full ${cameraActive ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
              <span className="text-[10px] font-mono font-semibold">{cameraActive ? "3D SENSOR ACTIVE" : "INITIALIZING CAMERA..."}</span>
            </div>
            <div className="px-2.5 py-1.5 rounded-full bg-black/80 border border-cyan-500/40 backdrop-blur-md text-cyan-300 text-[10px] font-mono font-bold">
              {activeProfile === "SIDE" ? "SAGITTAL (SIDE)" : "CORONAL (FRONT)"}
            </div>
          </div>

          {/* Bottom Cockpit Tactical Buttons (Coach, Audio, Debrief, Vault) */}
          <div className="absolute bottom-3 right-4 z-30 flex items-center gap-2 pointer-events-auto">
            <button
              onClick={() => setAiAudioGuidance((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 backdrop-blur-md ${
                aiAudioGuidance
                  ? "bg-emerald-950/80 hover:bg-emerald-900 border-emerald-500/50 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                  : "bg-black/80 hover:bg-black/95 border-slate-700 text-slate-400"
              }`}
              title="Toggle Reactive AI Biomechanical Audio Guidance"
            >
              <span>{aiAudioGuidance ? "🧠 AI COACH: ON" : "🧠 AI COACH: OFF"}</span>
            </button>
            <button
              onClick={handleToggleMute}
              className="px-3 py-1.5 rounded-xl bg-black/80 hover:bg-black/95 border border-slate-700 hover:border-cyan-400 text-xs text-slate-300 font-mono transition-all cursor-pointer flex items-center gap-1.5 backdrop-blur-md"
              title="Toggle Audio Feedback"
            >
              <span>{isMuted ? "🔇 MUTED" : "🔊 COACH AUDIO"}</span>
            </button>
            <button
              onClick={() => setShowClinicianModal(true)}
              className="px-3 py-1.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 hover:border-cyan-400 text-xs text-cyan-300 font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 backdrop-blur-md"
              title="Open Clinician Telemetry Debrief"
            >
              <span>📊 DEBRIEF</span>
            </button>
            <button
              onClick={() => setShowVaultModal(true)}
              className="px-3 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 hover:border-purple-400 text-xs text-purple-300 font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 backdrop-blur-md"
              title="Open Armory Vault"
            >
              <span>🛡️ VAULT</span>
            </button>
          </div>

          {/* --------------------------------------------------------------- */}
          {/* SHIP EXPLOSION SEQUENCE OVERLAY (CRITICAL INTEGRITY 0%)         */}
          {/* --------------------------------------------------------------- */}
          {isShipExploding && (
            <div className="absolute inset-0 z-45 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-200">
              {/* Expanding Shockwave Rings */}
              <div className="absolute w-[350px] sm:w-[550px] h-[350px] sm:h-[550px] rounded-full border-4 border-amber-500/90 animate-ping pointer-events-none" />
              <div className="absolute w-[500px] sm:w-[750px] h-[500px] sm:h-[750px] rounded-full border-2 border-rose-500/70 animate-ping delay-150 pointer-events-none" />
              {/* Central Fireball Sphere */}
              <div className="relative w-64 sm:w-80 h-64 sm:h-80 rounded-full bg-radial from-yellow-300 via-amber-500 to-rose-600 shadow-[0_0_120px_rgba(244,63,94,1)] animate-pulse flex flex-col items-center justify-center text-center">
                <span className="text-7xl animate-bounce">💥</span>
                <span className="text-xs font-mono font-black text-black bg-yellow-300 px-3 py-1 rounded-full mt-2 tracking-widest uppercase">
                  DETONATION
                </span>
              </div>
              <div className="mt-8 text-center px-4">
                <h2 className="text-2xl sm:text-3xl font-black text-rose-400 font-mono tracking-widest uppercase animate-pulse drop-shadow-[0_0_20px_rgba(244,63,94,0.9)]">
                  ⚠️ CRITICAL HULL COLLAPSE // EXPLOSION DETECTED
                </h2>
                <p className="text-xs sm:text-sm font-mono text-slate-300 uppercase tracking-wider mt-1">
                  VESSEL INTEGRITY TERMINATED • STRUCTURAL DISINTEGRATION
                </p>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* DEDICATED ENDGAME SCREEN (VESSEL DESTROYED / MISSION FAILED)    */}
          {/* --------------------------------------------------------------- */}
          {isGameOver && matchStatus === "DEFEAT" && !isShipExploding && (
            <div className="absolute inset-0 z-45 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 animate-in fade-in zoom-in duration-300">
              <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#0e0714] to-[#050811] border-2 border-rose-500/80 rounded-3xl p-6 sm:p-8 shadow-[0_0_80px_rgba(244,63,94,0.4)] flex flex-col items-center text-center font-mono">
                {/* Alert Header Icon */}
                <div className="relative w-20 h-20 rounded-2xl bg-rose-950/80 border-2 border-rose-500/90 flex items-center justify-center text-4xl shadow-[0_0_35px_rgba(244,63,94,0.7)] mb-4 animate-bounce">
                  <span>💀</span>
                </div>

                <div className="inline-block px-3 py-1 rounded-full bg-rose-950/90 border border-rose-500/60 text-rose-300 text-xs font-black tracking-widest uppercase mb-2">
                  CRITICAL FAILURE // INTEGRITY 0%
                </div>

                <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-wider mb-2 drop-shadow-[0_0_25px_rgba(244,63,94,0.8)]">
                  VESSEL DESTROYED
                </h1>

                <p className="text-xs sm:text-sm text-slate-300 uppercase tracking-wider max-w-md mb-6">
                  The Explorer suffered fatal kinetic decompression. Shield capacitor was overwhelmed by asteroid bombardment.
                </p>

                {/* Battle Telemetry Matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full mb-6">
                  <div className="p-3 rounded-2xl bg-black/60 border border-slate-800 flex flex-col items-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Deflected</span>
                    <span className="text-2xl font-black text-cyan-300 mt-1">{deflectionsCompleted} / {deflectionsTarget}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-black/60 border border-slate-800 flex flex-col items-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Integrity</span>
                    <span className="text-2xl font-black text-rose-400 mt-1">0%</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-black/60 border border-slate-800 flex flex-col items-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Form Purity</span>
                    <span className="text-2xl font-black text-emerald-400 mt-1">{formPurity}%</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-black/60 border border-slate-800 flex flex-col items-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Total Reps</span>
                    <span className="text-2xl font-black text-amber-400 mt-1">{repCount}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
                  <button
                    onClick={() => {
                      setIsGameOver(false);
                      handleRestartCampaign();
                    }}
                    className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(244,63,94,0.5)] transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>🔄</span>
                    <span>REPAIR & RETRY</span>
                  </button>

                  <button
                    onClick={() => setShowClinicianModal(true)}
                    className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/60 text-cyan-300 font-black text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>📊</span>
                    <span>DEBRIEF (SOAP)</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsGameOver(false);
                      setActiveView("MAIN_MENU");
                    }}
                    className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>🚀</span>
                    <span>MAIN MENU</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </FuturisticCockpitFrame>
      </main>
      </>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 4. PHASE 5 CLINICIAN MODE / POST-MISSION DEBRIEF MODAL              */}
      {/* ------------------------------------------------------------------- */}
      {showClinicianModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-[#0a101f] border-2 border-cyan-500/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_70px_rgba(0,240,255,0.25)] flex flex-col gap-6 animate-in fade-in zoom-in duration-300">
            {/* Header with Outcome Banner */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-400/50 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                  {matchStatus === "VICTORY" ? "🏆" : matchStatus === "DEFEAT" ? "💀" : "📊"}
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-cyan-300">
                    {exercise.toUpperCase()} TELEMETRY • {matchStatus === "VICTORY" ? "MISSION ACCOMPLISHED" : matchStatus === "DEFEAT" ? "MISSION FAILED" : "CLINICAL DEBRIEF"}
                  </h2>
                  <p className="text-xs text-slate-400 uppercase tracking-widest">
                    True 3D Vector Biomechanics & Kinematic Stability Report ({difficulty.toUpperCase()} MODE)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowClinicianModal(false)}
                className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-600 text-slate-300 text-sm font-bold flex items-center justify-center cursor-pointer transition-all"
              >
                ✕
              </button>
            </div>

            {/* 5-Metric Clinical Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3.5 rounded-2xl bg-black/50 border border-slate-800 flex flex-col items-center text-center">
                <span className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Total Reps</span>
                <span className="text-2xl font-black text-cyan-300 font-mono">{repCount}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-black/50 border border-slate-800 flex flex-col items-center text-center">
                <span className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Form Purity</span>
                <span className={`text-2xl font-black font-mono ${purityColor}`}>{formPurity}%</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-black/50 border border-slate-800 flex flex-col items-center text-center">
                <span className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Mean Hold Time</span>
                <span className="text-2xl font-black text-amber-300 font-mono">{avgHoldDuration}s</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-black/50 border border-slate-800 flex flex-col items-center text-center">
                <span className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Form Deviations</span>
                <span className={`text-2xl font-black font-mono ${valgusCount + postureFaultsCount === 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {valgusCount + postureFaultsCount}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-black/50 border border-slate-800 flex flex-col items-center text-center col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Max Joint ROM</span>
                <span className="text-2xl font-black text-emerald-400 font-mono">
                  {minSessionAngle < 180 ? `${minSessionAngle}°` : "90°"}
                </span>
              </div>
            </div>

            {/* Visual Kinematic Trace (SVG Telemetry Sparkline) */}
            <div className="p-4 rounded-2xl bg-black/60 border border-slate-800 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-bold text-slate-300 uppercase tracking-wider">
                  📈 Visual 3D Kinematic Trace ({primaryAngleName} Angle Over Time)
                </span>
                <span className="text-[11px] text-emerald-400">
                  Green Band = Target Threshold • Top Line = Baseline Lockout
                </span>
              </div>

              {/* SVG Sparkline */}
              <div className="relative w-full h-44 bg-[#080d1a] rounded-xl overflow-hidden border border-slate-800 p-2">
                <svg className="w-full h-full" viewBox="0 0 600 160" preserveAspectRatio="none">
                  {/* Depth Target Threshold Band */}
                  <rect x="0" y="80" width="600" height="80" fill="rgba(16, 185, 129, 0.12)" />
                  <line x1="0" y1="80" x2="600" y2="80" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 4" />
                  <text x="8" y="74" fill="#10b981" fontSize="10" fontFamily="monospace">
                    CLINICAL TARGET ({exercise === "overhead_press" ? "165° TOP" : "90° BOTTOM"})
                  </text>

                  {/* Standing / Lockout Baseline */}
                  <line x1="0" y1="20" x2="600" y2="20" stroke="#64748b" strokeWidth="1" strokeDasharray="3 3" />
                  <text x="8" y="16" fill="#64748b" fontSize="10" fontFamily="monospace">
                    STARTING BASELINE
                  </text>

                  {/* Kinematic Angle Polyline */}
                  {angleTrace.length >= 2 ? (
                    <polyline
                      fill="none"
                      stroke="#00f0ff"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={angleTrace
                        .map((pt, idx) => {
                          const x = (idx / (angleTrace.length - 1)) * 600;
                          const norm = Math.max(0, Math.min(1, (180 - pt.angle) / 120));
                          const y = 10 + norm * 130;
                          return `${x},${y}`;
                        })
                        .join(" ")}
                    />
                  ) : (
                    <text x="300" y="90" fill="#64748b" fontSize="12" fontFamily="monospace" textAnchor="middle">
                      Awaiting live kinematic telemetry data...
                    </text>
                  )}
                </svg>
              </div>
            </div>

            {/* Clinical Recommendation Callout */}
            <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-start gap-3 text-left">
              <span className="text-xl">🩺</span>
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-cyan-300 mb-0.5">
                  Clinical Recommendation & Biomechanical Assessment:
                </div>
                <div className="text-xs text-slate-300 leading-relaxed">
                  {getClinicalRecommendation()}
                </div>
              </div>
            </div>

            {/* Victory Energy Cores Reward Banner */}
            {matchStatus === "VICTORY" && (
              <div className="p-4 rounded-2xl bg-amber-950/60 border border-amber-500/40 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                <div className="flex items-center gap-3">
                  <span className="text-3xl animate-bounce">⚡</span>
                  <div>
                    <div className="text-sm font-black text-amber-300 uppercase tracking-wider">
                      +{earnedCoresNotice || 50} Energy Cores Secured!
                    </div>
                    <div className="text-xs text-amber-200/80">
                      Base Reward: 50 Cores • Biomechanical Purity Bonus: +{Math.max(0, Math.round(formPurity - 80))} Cores
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowClinicianModal(false);
                    setShowVaultModal(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider cursor-pointer transition-all shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                >
                  Enter Armory Vault
                </button>
              </div>
            )}

            {/* In-Debrief Leaderboard Submission Card */}
            <div className="p-4 rounded-2xl bg-black/60 border border-cyan-500/30 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-cyan-300 tracking-wider">
                  🏆 Transmit Bounty to Global Leaderboard Matrix
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Tension: {totalTensionTimeSec.toFixed(1)}s • Purity: {formPurity}%
                </span>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-2.5">
                <input
                  type="text"
                  maxLength={18}
                  value={callsign}
                  onChange={(e) => setCallsign(e.target.value.toUpperCase())}
                  placeholder="OPERATOR CALLSIGN"
                  className="w-full sm:w-64 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-cyan-300 text-xs font-mono font-bold focus:outline-none focus:border-cyan-400 uppercase tracking-widest"
                />
                <button
                  onClick={handleSubmitLeaderboard}
                  disabled={isSubmittingLeaderboard || !callsign.trim()}
                  className="w-full sm:w-auto px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                >
                  {isSubmittingLeaderboard ? "Transmitting..." : "Transmit Telemetry"}
                </button>
                <button
                  onClick={() => {
                    fetchLeaderboard();
                    setShowLeaderboardModal(true);
                  }}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold cursor-pointer transition-all"
                >
                  View Top 10
                </button>
              </div>
              {leaderboardStatus && (
                <div
                  className={`text-xs font-mono px-3.5 py-2 rounded-xl border ${
                    leaderboardStatus.type === "success"
                      ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-300"
                      : "bg-rose-950/80 border-rose-500/50 text-rose-300"
                  }`}
                >
                  {leaderboardStatus.msg}
                </div>
              )}
            </div>

            {/* AI Automated Clinical SOAP Synthesis */}
            <ClinicalSoapCard
              callsign={callsign || "OPERATIVE_01"}
              exercise={exercise}
              repsCompleted={repCount > 0 ? repCount : (recoveryHistory[recoveryHistory.length - 1]?.repsCompleted || 12)}
              avgDepthAngle={
                repCount > 0 && minSessionAngle < 180
                  ? minSessionAngle
                  : (recoveryHistory[recoveryHistory.length - 1]?.avgDepthAngle || 88.5)
              }
              maxHoldDuration={
                holdDurations.length > 0
                  ? Math.max(...holdDurations)
                  : (recoveryHistory[recoveryHistory.length - 1]?.maxHoldDuration || 2.2)
              }
              valgusEvents={
                repCount > 0
                  ? valgusCount
                  : (recoveryHistory[recoveryHistory.length - 1]?.valgusEvents ?? 0)
              }
              stabilityScore={formPurity > 0 ? formPurity : 94.0}
              streakDays={adherence.streakDays}
              baseline={{
                avgDepthAngle: baselineSession.avgDepthAngle,
                maxHoldDuration: baselineSession.maxHoldDuration,
                valgusEvents: baselineSession.valgusEvents,
                stabilityScore: baselineSession.stabilityScore,
              }}
            />

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                onClick={() => {
                  setShowClinicianModal(false);
                  setShowProgressModal(true);
                }}
                className="flex-1 py-3 px-4 rounded-2xl bg-teal-950/80 hover:bg-teal-900 border border-teal-500/60 hover:border-teal-400 text-teal-200 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
              >
                <span>📈 RECOVERY TRAJECTORY</span>
              </button>
              <button
                onClick={handleDownloadCsv}
                className="flex-1 py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-cyan-400 text-slate-200 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
              >
                <span>📥 TELEMETRY (CSV)</span>
              </button>
              <button
                onClick={handleResetCombat}
                className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2"
              >
                <span>⚔️ NEXT TARGET</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 5. PHASE 7 COSMETIC LOADOUT VAULT / ARMORY MODAL                   */}
      {/* ------------------------------------------------------------------- */}
      {showVaultModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-[#0a101f] border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_80px_rgba(245,158,11,0.25)] flex flex-col gap-6 animate-in fade-in zoom-in duration-300">
            {/* Vault Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-950/80 border border-amber-400/50 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                  🛡️
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-amber-300">
                    Cosmetic Loadout Vault & Armory
                  </h2>
                  <p className="text-xs text-slate-400 uppercase tracking-widest">
                    Equip canvas shaders, procedural audio profiles, and wireframe palettes
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="px-3.5 py-1.5 rounded-xl bg-amber-950/80 border border-amber-500/50 text-amber-300 font-mono font-black text-sm shadow-[0_0_12px_rgba(245,158,11,0.3)] flex items-center gap-1.5">
                  <span>⚡</span>
                  <span>{vault.energyCores} CORES</span>
                </div>
                <button
                  onClick={() => setShowVaultModal(false)}
                  className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-600 text-slate-300 text-sm font-bold flex items-center justify-center cursor-pointer transition-all"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* 3 Vault Categories */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Section 1: Skeletal Shaders */}
              <div className="p-4 rounded-2xl bg-black/50 border border-slate-800 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-black uppercase text-cyan-300 tracking-wider">
                    1. Skeletal Shaders
                  </span>
                  <span className="text-[10px] text-slate-400">&lt;canvas&gt; Render</span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {(["cyberpunk", "molten_core", "void_phantom"] as SkeletalShader[]).map((key) => {
                    const s = SHADER_CONFIGS[key];
                    const isUnlocked = vault.unlockedShaders.includes(key);
                    const isEquipped = vault.activeShader === key;
                    return (
                      <div
                        key={key}
                        className={`p-3 rounded-xl border transition-all ${
                          isEquipped
                            ? "bg-slate-900 border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.2)]"
                            : "bg-black/40 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-white tracking-wide">{s.name}</span>
                          <div className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.baseColor }} />
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.holdingColor }} />
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.targetColor }} />
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-400 mb-2 leading-relaxed">{s.description}</p>
                        <button
                          onClick={() => handleBuyOrEquipShader(key)}
                          className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isEquipped
                              ? "bg-cyan-500 text-black font-black"
                              : isUnlocked
                              ? "bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/40"
                              : vault.energyCores >= s.cost
                              ? "bg-amber-500 hover:bg-amber-400 text-black font-black shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                              : "bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed"
                          }`}
                        >
                          {isEquipped
                            ? "✓ EQUIPPED"
                            : isUnlocked
                            ? "EQUIP"
                            : `UNLOCK (${s.cost} CORES)`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 2: Audio Soundpacks */}
              <div className="p-4 rounded-2xl bg-black/50 border border-slate-800 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-black uppercase text-amber-300 tracking-wider">
                    2. Audio Soundpacks
                  </span>
                  <span className="text-[10px] text-slate-400">Web Audio API</span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {/* Arcade Synth */}
                  <div
                    className={`p-3 rounded-xl border transition-all ${
                      vault.activeSoundpack === "arcade_synth"
                        ? "bg-slate-900 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                        : "bg-black/40 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white tracking-wide">ARCADE SYNTH</span>
                      <span className="text-[10px] text-emerald-400 font-mono">DEFAULT</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mb-2 leading-relaxed">
                      Classic square and sawtooth synthesizer chirps, retro combat feedback, and 8-bit tempo ticks.
                    </p>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => synth.playCritHit()}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 cursor-pointer"
                      >
                        Preview
                      </button>
                      <button
                        onClick={() => handleBuyOrEquipSoundpack("arcade_synth")}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          vault.activeSoundpack === "arcade_synth"
                            ? "bg-amber-500 text-black font-black"
                            : "bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40"
                        }`}
                      >
                        {vault.activeSoundpack === "arcade_synth" ? "✓ EQUIPPED" : "EQUIP"}
                      </button>
                    </div>
                  </div>

                  {/* Heavy Mecha */}
                  <div
                    className={`p-3 rounded-xl border transition-all ${
                      vault.activeSoundpack === "heavy_mecha"
                        ? "bg-slate-900 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                        : "bg-black/40 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white tracking-wide">HEAVY MECHA</span>
                      <span className="text-[10px] text-amber-400 font-mono">200 CORES</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mb-2 leading-relaxed">
                      Low-frequency sub-bass impacts (45-85Hz), industrial anvil parry clangs, and hydraulic servo clicks.
                    </p>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => {
                          const prev = synth.soundpack;
                          synth.soundpack = "heavy_mecha";
                          synth.playCritHit();
                          synth.soundpack = prev;
                        }}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 cursor-pointer"
                      >
                        Preview
                      </button>
                      <button
                        onClick={() => handleBuyOrEquipSoundpack("heavy_mecha")}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          vault.activeSoundpack === "heavy_mecha"
                            ? "bg-amber-500 text-black font-black"
                            : vault.unlockedSoundpacks.includes("heavy_mecha")
                            ? "bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40"
                            : vault.energyCores >= 200
                            ? "bg-amber-500 hover:bg-amber-400 text-black font-black shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                            : "bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed"
                        }`}
                      >
                        {vault.activeSoundpack === "heavy_mecha"
                          ? "✓ EQUIPPED"
                          : vault.unlockedSoundpacks.includes("heavy_mecha")
                          ? "EQUIP"
                          : "UNLOCK (200 CORES)"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: HUD Wireframe Themes */}
              <div className="p-4 rounded-2xl bg-black/50 border border-slate-800 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-black uppercase text-purple-300 tracking-wider">
                    3. HUD Wireframe Themes
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono">UNLOCKED</span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {(["cyan", "emerald", "violet", "amber"] as WireframeTheme[]).map((tKey) => {
                    const t = THEME_STYLES[tKey];
                    const isEquipped = vault.activeTheme === tKey;
                    return (
                      <div
                        key={tKey}
                        onClick={() => handleSelectTheme(tKey)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isEquipped
                            ? "bg-slate-900 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                            : "bg-black/40 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-4 h-4 rounded-full border border-white/40"
                            style={{
                              backgroundColor:
                                tKey === "cyan"
                                  ? "#00f0ff"
                                  : tKey === "emerald"
                                  ? "#10b981"
                                  : tKey === "violet"
                                  ? "#a855f7"
                                  : "#f59e0b",
                            }}
                          />
                          <span className="text-xs font-bold text-white tracking-wide">{t.name}</span>
                        </div>
                        <span className={`text-[11px] font-mono font-bold ${isEquipped ? "text-purple-300" : "text-slate-500"}`}>
                          {isEquipped ? "ACTIVE" : "SELECT"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 6. PHASE 7 GLOBAL BOUNTY LEADERBOARD MODAL                         */}
      {/* ------------------------------------------------------------------- */}
      {showLeaderboardModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-[#080d1a] border-2 border-cyan-500/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_80px_rgba(6,182,212,0.25)] flex flex-col gap-6 animate-in fade-in zoom-in duration-300">
            {/* Leaderboard Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-400/50 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                  🏆
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-cyan-300">
                    Global Bounty Leaderboard Matrix
                  </h2>
                  <p className="text-xs text-slate-400 uppercase tracking-widest">
                    Bounty Score = (Purity% × 100) + (Tension Sec × 10) - (Clear Time Sec × 2)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchLeaderboard}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-bold transition-all cursor-pointer"
                >
                  🔄 Refresh
                </button>
                <button
                  onClick={() => setShowLeaderboardModal(false)}
                  className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-600 text-slate-300 text-sm font-bold flex items-center justify-center cursor-pointer transition-all"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Submission Card at Top */}
            <div className="p-3.5 rounded-2xl bg-black/60 border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-300 uppercase">Callsign:</span>
                <input
                  type="text"
                  maxLength={18}
                  value={callsign}
                  onChange={(e) => setCallsign(e.target.value.toUpperCase())}
                  placeholder="OPERATOR CALLSIGN"
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-cyan-300 text-xs font-mono font-bold focus:outline-none focus:border-cyan-400 uppercase"
                />
              </div>
              <button
                onClick={handleSubmitLeaderboard}
                disabled={isSubmittingLeaderboard || !callsign.trim()}
                className="w-full sm:w-auto px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)]"
              >
                {isSubmittingLeaderboard ? "Transmitting..." : "Submit Current Run"}
              </button>
            </div>

            {leaderboardStatus && (
              <div
                className={`text-xs font-mono px-3.5 py-2 rounded-xl border ${
                  leaderboardStatus.type === "success"
                    ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-300"
                    : "bg-rose-950/80 border-rose-500/50 text-rose-300"
                }`}
              >
                {leaderboardStatus.msg}
              </div>
            )}

            {/* Ranked Table */}
            <div className="rounded-2xl bg-black/60 border border-slate-800 overflow-hidden">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="bg-slate-900/80 border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Rank</th>
                    <th className="py-3 px-4">Operator</th>
                    <th className="py-3 px-4">Bounty Score</th>
                    <th className="py-3 px-4">Grade</th>
                    <th className="py-3 px-4">Purity</th>
                    <th className="py-3 px-4">Tension Time</th>
                    <th className="py-3 px-4">Clear Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {leaderboard.length > 0 ? (
                    leaderboard.map((row) => (
                      <tr
                        key={row.id}
                        className={`hover:bg-slate-900/50 transition-colors ${
                          row.rank === 1
                            ? "bg-amber-950/20 text-amber-200"
                            : row.rank === 2
                            ? "bg-slate-800/30 text-slate-200"
                            : row.rank === 3
                            ? "bg-amber-950/10 text-amber-300"
                            : "text-slate-300"
                        }`}
                      >
                        <td className="py-3 px-4 font-bold">
                          {row.rank === 1 ? "🥇 #1" : row.rank === 2 ? "🥈 #2" : row.rank === 3 ? "🥉 #3" : `#${row.rank}`}
                        </td>
                        <td className="py-3 px-4 font-bold tracking-wider text-cyan-300">{row.operator_name}</td>
                        <td className="py-3 px-4 font-black text-amber-400 text-sm">
                          {Number(row.bounty_score).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black ${
                              row.purity_grade === "S"
                                ? "bg-emerald-950 border border-emerald-500/50 text-emerald-300"
                                : row.purity_grade === "A"
                                ? "bg-cyan-950 border border-cyan-500/50 text-cyan-300"
                                : "bg-amber-950 border border-amber-500/50 text-amber-300"
                            }`}
                          >
                            {row.purity_grade}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold">{row.form_purity_score}%</td>
                        <td className="py-3 px-4">{row.total_tension_time_sec}s</td>
                        <td className="py-3 px-4">{row.boss_clear_time_sec}s</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        Awaiting transmissions from verified operators...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 7. PHASE 8 DEDICATED PROGRESS COMPARISON & RECOVERY TRAJECTORY MODAL */}
      {/* ------------------------------------------------------------------- */}
      {showProgressModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="relative w-full max-w-5xl bg-[#070a13] border border-teal-500/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_80px_rgba(20,184,166,0.25)] flex flex-col gap-6 animate-in fade-in zoom-in duration-300 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-4 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-950/80 border border-teal-400/50 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(20,184,166,0.4)]">
                  📈
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-teal-300">
                      Recovery Trajectory & Baseline Comparison
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-teal-950 border border-teal-500/60 text-teal-300">
                      Patient #{callsign}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Protocol Day 14 • 🌿 Kinetic Stabilization Phase • Non-Competitive Mastery Focus
                  </p>
                </div>
              </div>

              {/* Header Badges & Actions */}
              <div className="flex items-center gap-2 self-end sm:self-center">
                <div className="px-3 py-1.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-xs font-black text-cyan-300">
                  💎 {bioCredits} CREDITS
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-amber-950/60 border border-amber-500/40 text-xs font-black text-amber-300">
                  🔥 {adherence.streakDays}D STREAK
                </div>
                <button
                  onClick={handleToggleRestDay}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    isRestDay
                      ? "bg-emerald-950/90 border-emerald-400 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                      : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200"
                  }`}
                  title="Toggle Rest Day Mode"
                >
                  {isRestDay ? "🌿 REST ON" : "🌿 REST OFF"}
                </button>
                <button
                  onClick={() => setShowProgressModal(false)}
                  className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-600 text-slate-300 text-sm font-bold flex items-center justify-center cursor-pointer transition-all"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Split Delta Comparison Cards (Day 1 Baseline vs Current/Today) */}
            {(() => {
              const todayDepth = (repCount > 0 && minSessionAngle < 180)
                ? minSessionAngle
                : (recoveryHistory[recoveryHistory.length - 1]?.avgDepthAngle || 88.5);
              const todayHold = holdDurations.length > 0
                ? Math.max(...holdDurations)
                : (recoveryHistory[recoveryHistory.length - 1]?.maxHoldDuration || 2.2);
              const todayValgus = repCount > 0
                ? valgusCount
                : (recoveryHistory[recoveryHistory.length - 1]?.valgusEvents ?? 0);
              const depthDelta = Number((baselineSession.avgDepthAngle - todayDepth).toFixed(1));
              const holdDelta = Number((todayHold - baselineSession.maxHoldDuration).toFixed(1));
              const valgusReduction = baselineSession.valgusEvents > 0
                ? Math.max(0, Math.round(((baselineSession.valgusEvents - todayValgus) / baselineSession.valgusEvents) * 100))
                : 100;

              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Card 1: ROM Flexion */}
                  <div className="p-5 rounded-2xl bg-[#0a0f1e] border border-teal-500/30 hover:border-teal-500/60 transition-all flex flex-col gap-3 shadow-lg">
                    <div className="flex items-center justify-between text-xs text-slate-400 uppercase font-bold tracking-wider">
                      <span>ROM Flexion Depth</span>
                      <span className="text-teal-400">📐 Mobility</span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-semibold">Day 1 Baseline</div>
                        <div className="text-xl font-mono text-slate-400">{baselineSession.avgDepthAngle.toFixed(1)}°</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-teal-400 uppercase font-bold">Today</div>
                        <div className="text-2xl font-black font-mono text-teal-300">{todayDepth.toFixed(1)}°</div>
                      </div>
                    </div>
                    <div className="px-3 py-1 rounded-xl bg-teal-950/70 border border-teal-500/40 text-xs font-black text-teal-300 flex items-center justify-between">
                      <span>{depthDelta >= 0 ? `+${depthDelta}° GAIN` : `${depthDelta}°`}</span>
                      <span className="text-[10px] font-mono uppercase text-teal-400">Parallel Achieved</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Symmetric bilateral descent verified. Adductor stretch tolerance and ankle dorsiflexion restored.
                    </p>
                  </div>

                  {/* Card 2: Tendon Hold Endurance */}
                  <div className="p-5 rounded-2xl bg-[#0a0f1e] border border-cyan-500/30 hover:border-cyan-500/60 transition-all flex flex-col gap-3 shadow-lg">
                    <div className="flex items-center justify-between text-xs text-slate-400 uppercase font-bold tracking-wider">
                      <span>Tendon Hold Capacity</span>
                      <span className="text-cyan-400">⏱️ Isometric</span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-semibold">Day 1 Baseline</div>
                        <div className="text-xl font-mono text-slate-400">{baselineSession.maxHoldDuration.toFixed(1)}s</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-cyan-400 uppercase font-bold">Today</div>
                        <div className="text-2xl font-black font-mono text-cyan-300">{todayHold.toFixed(1)}s</div>
                      </div>
                    </div>
                    <div className="px-3 py-1 rounded-xl bg-cyan-950/70 border border-cyan-500/40 text-xs font-black text-cyan-300 flex items-center justify-between">
                      <span>{holdDelta >= 0 ? `+${holdDelta}s CAPACITY` : `${holdDelta}s`}</span>
                      <span className="text-[10px] font-mono uppercase text-cyan-400">Safe Pause Verified</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Patellar tendon collagen remodeled via controlled bottom holds, neutralizing patellofemoral shear forces.
                    </p>
                  </div>

                  {/* Card 3: Valgus Reduction */}
                  <div className="p-5 rounded-2xl bg-[#0a0f1e] border border-purple-500/30 hover:border-purple-500/60 transition-all flex flex-col gap-3 shadow-lg">
                    <div className="flex items-center justify-between text-xs text-slate-400 uppercase font-bold tracking-wider">
                      <span>Medial Knee Wobble</span>
                      <span className="text-purple-400">🔄 Valgus Guard</span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-semibold">Day 1 Baseline</div>
                        <div className="text-xl font-mono text-slate-400">{baselineSession.valgusEvents} Faults</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-purple-400 uppercase font-bold">Today</div>
                        <div className="text-2xl font-black font-mono text-purple-300">{todayValgus} Faults</div>
                      </div>
                    </div>
                    <div className="px-3 py-1 rounded-xl bg-purple-950/70 border border-purple-500/40 text-xs font-black text-purple-300 flex items-center justify-between">
                      <span>{valgusReduction}% REDUCTION</span>
                      <span className="text-[10px] font-mono uppercase text-purple-400">Frontal Stability</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Gluteus medius neuromuscular recruitment stabilized; bilateral knees track cleanly through the coronal plane.
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Visual Progression Strip: Minimalist SVG Polyline Graph */}
            <div className="p-5 rounded-2xl bg-[#0a0f1e] border border-slate-800 flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <span>📊 14-Day Knee Flexion Depth Trajectory</span>
                    <span className="text-[10px] text-emerald-400 font-mono font-normal">
                      [Trending Toward 90° Therapeutic Target]
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Knee joint angle at nadir across protocol sessions. Lower values represent deeper parallel squats.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-0.5 bg-emerald-400 inline-block" />
                    <span>90° Therapeutic Target</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-0.5 bg-cyan-400 inline-block" />
                    <span>Patient Trajectory</span>
                  </div>
                </div>
              </div>

              {/* SVG Curve Container */}
              <div className="w-full h-44 bg-black/60 rounded-xl p-3 border border-slate-800/80 relative overflow-hidden">
                {(() => {
                  const points = recoveryHistory;
                  if (!points || points.length === 0) return null;

                  const width = 640;
                  const height = 140;
                  const paddingX = 45;
                  const paddingY = 22;

                  // Map angles (115 deg down to 75 deg)
                  const minA = 75;
                  const maxA = 115;
                  const getY = (angle: number) => {
                    const clamped = Math.max(minA, Math.min(maxA, angle));
                    return paddingY + ((clamped - minA) / (maxA - minA)) * (height - 2 * paddingY);
                  };

                  const getX = (idx: number) => {
                    if (points.length === 1) return width / 2;
                    return paddingX + (idx / (points.length - 1)) * (width - 2 * paddingX);
                  };

                  const polyCoords = points.map((p, idx) => `${getX(idx)},${getY(p.avgDepthAngle)}`).join(" ");
                  const targetY = getY(90);

                  return (
                    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                      <defs>
                        <linearGradient id="curveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#06b6d4" />
                          <stop offset="100%" stopColor="#10b981" />
                        </linearGradient>
                        <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal Gridlines */}
                      <line x1={paddingX} y1={getY(110)} x2={width - paddingX} y2={getY(110)} stroke="#1e293b" strokeDasharray="3 3" />
                      <text x={paddingX - 6} y={getY(110) + 3} fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">110°</text>

                      <line x1={paddingX} y1={targetY} x2={width - paddingX} y2={targetY} stroke="#10b981" strokeWidth="1.5" strokeDasharray="5 4" />
                      <text x={paddingX - 6} y={targetY + 3} fill="#10b981" fontSize="9" textAnchor="end" fontFamily="monospace" fontWeight="bold">90°</text>
                      <text x={width - paddingX + 6} y={targetY + 3} fill="#10b981" fontSize="9" textAnchor="start" fontFamily="monospace">TARGET</text>

                      <line x1={paddingX} y1={getY(80)} x2={width - paddingX} y2={getY(80)} stroke="#1e293b" strokeDasharray="3 3" />
                      <text x={paddingX - 6} y={getY(80) + 3} fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">80°</text>

                      {/* Area Fill Under Curve */}
                      {points.length > 1 && (
                        <polygon
                          points={`${getX(0)},${height - paddingY} ${polyCoords} ${getX(points.length - 1)},${height - paddingY}`}
                          fill="url(#areaGradient)"
                        />
                      )}

                      {/* Main Trajectory Curve */}
                      <polyline
                        points={polyCoords}
                        fill="none"
                        stroke="url(#curveGradient)"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Points & Labels */}
                      {points.map((p, idx) => {
                        const cx = getX(idx);
                        const cy = getY(p.avgDepthAngle);
                        return (
                          <g key={p.id}>
                            <circle cx={cx} cy={cy} r="5.5" fill="#070a13" stroke="#00f0ff" strokeWidth="2.5" />
                            <circle cx={cx} cy={cy} r="2.5" fill="#ffffff" />
                            <text
                              x={cx}
                              y={cy - 10}
                              fill="#e2e8f0"
                              fontSize="10"
                              fontWeight="bold"
                              fontFamily="monospace"
                              textAnchor="middle"
                            >
                              {p.avgDepthAngle}°
                            </text>
                            <text
                              x={cx}
                              y={height - 6}
                              fill="#64748b"
                              fontSize="8.5"
                              fontFamily="monospace"
                              textAnchor="middle"
                            >
                              {p.date.slice(5)}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  );
                })()}
              </div>
            </div>

            {/* Clinical Mastery Badges Showcase */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">
                  🏆 Clinical Mastery Badges
                </h3>
                <span className="text-[11px] text-teal-400 font-mono">
                  {clinicalBadges.filter((b) => b.unlocked).length} / {clinicalBadges.length} Unlocked
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {clinicalBadges.map((badge) => (
                  <div
                    key={badge.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col gap-2 ${
                      badge.unlocked
                        ? "bg-teal-950/30 border-teal-500/60 shadow-[0_0_15px_rgba(20,184,166,0.2)]"
                        : "bg-black/40 border-slate-800 opacity-75"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{badge.icon}</span>
                        <span className="text-xs font-black uppercase text-slate-200">{badge.name}</span>
                      </div>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${
                          badge.unlocked
                            ? "bg-teal-950 border border-teal-400 text-teal-300"
                            : "bg-slate-900 border border-slate-700 text-slate-500"
                        }`}
                      >
                        {badge.unlocked ? "UNLOCKED 🛡️" : "LOCKED 🔒"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">{badge.description}</p>
                    {badge.unlocked && badge.unlockedAt && (
                      <div className="text-[9px] text-teal-400/80 font-mono mt-auto">
                        Earned on {badge.unlockedAt}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* AI Automated Clinical SOAP Synthesis */}
            <ClinicalSoapCard
              callsign={callsign || "OPERATIVE_01"}
              exercise={exercise}
              repsCompleted={repCount > 0 ? repCount : (recoveryHistory[recoveryHistory.length - 1]?.repsCompleted || 12)}
              avgDepthAngle={
                repCount > 0 && minSessionAngle < 180
                  ? minSessionAngle
                  : (recoveryHistory[recoveryHistory.length - 1]?.avgDepthAngle || 88.5)
              }
              maxHoldDuration={
                holdDurations.length > 0
                  ? Math.max(...holdDurations)
                  : (recoveryHistory[recoveryHistory.length - 1]?.maxHoldDuration || 2.2)
              }
              valgusEvents={
                repCount > 0
                  ? valgusCount
                  : (recoveryHistory[recoveryHistory.length - 1]?.valgusEvents ?? 0)
              }
              stabilityScore={formPurity > 0 ? formPurity : 94.0}
              streakDays={adherence.streakDays}
              baseline={{
                avgDepthAngle: baselineSession.avgDepthAngle,
                maxHoldDuration: baselineSession.maxHoldDuration,
                valgusEvents: baselineSession.valgusEvents,
                stabilityScore: baselineSession.stabilityScore,
              }}
            />

            {/* Modal Footer / Telemetry Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-800 pt-4 gap-3">
              <div className="text-xs text-slate-400 font-mono">
                Adherence: <span className="text-emerald-400 font-bold">{adherence.streakDays}d Streak</span> • Total Sessions:{" "}
                <span className="text-slate-200 font-bold">{adherence.totalSessions}</span> • Rest Days Taken:{" "}
                <span className="text-teal-400 font-bold">{adherence.restDaysTaken}</span>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={handleExportClinicalCsv}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-teal-950 hover:bg-teal-900 border border-teal-500/70 hover:border-teal-400 text-teal-200 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_15px_rgba(20,184,166,0.3)] flex items-center justify-center gap-2"
                >
                  <span>📥 DOWNLOAD CLINICAL CSV</span>
                </button>
                <button
                  onClick={() => setShowProgressModal(false)}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Close Trajectory
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 10-Exercise Clinical Rehabilitation Suite Selector Modal */}
      <ExerciseSelectorModal
        isOpen={showExerciseSelector}
        activeExerciseId={exercise}
        onSelectExercise={(newEx) => handleSelectExercise(newEx as ExerciseType)}
        onClose={() => setShowExerciseSelector(false)}
      />
    </div>
  );
}
