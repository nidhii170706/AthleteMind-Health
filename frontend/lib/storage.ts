// ---------------------------------------------------------------------------
// AthleteMind / Bio-Bounty Hunter - Local Storage & Persistence Engine
// ---------------------------------------------------------------------------

export interface PlayerProfile {
  handle: string;
  rankTitle: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  bioCredits: number;
  streak: number;
  lastWorkoutDate: string;
}

export interface MatchRecord {
  id: string;
  timestamp: string;
  formattedDate: string;
  bossName: string;
  exercise: string;
  result: "VICTORY" | "DEFEAT";
  durationSeconds: number;
  reps: number;
  formPurity: number;
  score: number;
  symmetry: number;
  valgusWarnings: number;
  egoPenalties: number;
  maxCombo: number;
  cadenceAccuracy: number;
}

export interface AggregatedStats {
  totalReps: number;
  totalBattleTimeSeconds: number;
  careerPurityIndex: number;
  totalBossTakedowns: number;
  totalMatches: number;
  victories: number;
  defeats: number;
  totalCrits: number;
  totalParries: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
  category: "KINEMATICS" | "COMBAT" | "DEDICATION";
}

export interface LeaderboardEntry {
  rank: number;
  player: string;
  bossDefeated: string;
  purity: number;
  timeFormatted: string;
  score: number;
  isPlayer?: boolean;
}

export interface AppSettings {
  masterVolume: number;
  musicEnabled: boolean;
  voiceTauntsEnabled: boolean;
  countdownSeconds: 3 | 5 | 10;
  squatDepthSensitivity: "rehab" | "standard" | "olympic";
  selectedCameraId?: string;
}

const STORAGE_KEYS = {
  PROFILE: "athletemind_profile_v2",
  MATCH_HISTORY: "athletemind_match_history_v2",
  STATS: "athletemind_stats_v2",
  ACHIEVEMENTS: "athletemind_achievements_v2",
  SETTINGS: "athletemind_settings_v2",
};

const DEFAULT_PROFILE: PlayerProfile = {
  handle: "KINETIC-HUNTER",
  rankTitle: "Kinetic Stalker",
  level: 3,
  xp: 720,
  xpToNextLevel: 1200,
  bioCredits: 450,
  streak: 4,
  lastWorkoutDate: "",
};

const DEFAULT_STATS: AggregatedStats = {
  totalReps: 48,
  totalBattleTimeSeconds: 520,
  careerPurityIndex: 94,
  totalBossTakedowns: 5,
  totalMatches: 6,
  victories: 5,
  defeats: 1,
  totalCrits: 28,
  totalParries: 14,
};

const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  {
    id: "flawless_form",
    title: "Flawless Form",
    description: "Finish a boss encounter with 100% kinematic form purity.",
    icon: "🏅",
    unlocked: false,
    category: "KINEMATICS",
  },
  {
    id: "parry_vanguard",
    title: "Parry Vanguard",
    description: "Successfully parry or deflect 5 incoming attacks.",
    icon: "🛡️",
    unlocked: true,
    unlockedAt: "Recent Encounter",
    category: "COMBAT",
  },
  {
    id: "overdrive_striker",
    title: "Overdrive Striker",
    description: "Reach a 5x Hyper Overdrive consecutive combo streak.",
    icon: "⚡",
    unlocked: true,
    unlockedAt: "Recent Encounter",
    category: "COMBAT",
  },
  {
    id: "relentless",
    title: "Relentless",
    description: "Maintain a 7-day consecutive workout streak.",
    icon: "🔥",
    unlocked: false,
    category: "DEDICATION",
  },
  {
    id: "iron_knees",
    title: "Iron Knees",
    description: "Zero medial knee valgus collapses flagged during full encounter.",
    icon: "🦾",
    unlocked: true,
    unlockedAt: "Recent Encounter",
    category: "KINEMATICS",
  },
  {
    id: "static_titan",
    title: "Static Titan",
    description: "Average >= 2.0 seconds isometric pause hold at rep bottom.",
    icon: "⏱️",
    unlocked: false,
    category: "KINEMATICS",
  },
];

const DEFAULT_SETTINGS: AppSettings = {
  masterVolume: 80,
  musicEnabled: true,
  voiceTauntsEnabled: true,
  countdownSeconds: 5,
  squatDepthSensitivity: "standard",
  selectedCameraId: "default",
};

const MOCK_RIVALS: LeaderboardEntry[] = [
  { rank: 1, player: "VEX-9", bossDefeated: "CHRONO WARDEN", purity: 99, timeFormatted: "00:42", score: 9850 },
  { rank: 2, player: "CYBER_VALKYRIE", bossDefeated: "GOLIATH UNIT", purity: 97, timeFormatted: "00:54", score: 8920 },
  { rank: 3, player: "KINETIC_GHOST", bossDefeated: "VELOCITY STALKER", purity: 95, timeFormatted: "01:02", score: 8100 },
  { rank: 4, player: "ZERO_ONE", bossDefeated: "GOLIATH UNIT", purity: 92, timeFormatted: "01:15", score: 7450 },
];

export function getProfile(): PlayerProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (!raw) {
      saveProfile(DEFAULT_PROFILE);
      return DEFAULT_PROFILE;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(profile: PlayerProfile): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  } catch (e) {
    console.error("Failed saving profile:", e);
  }
}

export function getMatchHistory(): MatchRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MATCH_HISTORY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveMatchHistory(history: MatchRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.MATCH_HISTORY, JSON.stringify(history.slice(0, 10)));
  } catch (e) {
    console.error("Failed saving match history:", e);
  }
}

export function getAggregatedStats(): AggregatedStats {
  if (typeof window === "undefined") return DEFAULT_STATS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STATS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(DEFAULT_STATS));
      return DEFAULT_STATS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_STATS;
  }
}

export function saveAggregatedStats(stats: AggregatedStats): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
  } catch (e) {
    console.error("Failed saving stats:", e);
  }
}

export function getAchievements(): Achievement[] {
  if (typeof window === "undefined") return DEFAULT_ACHIEVEMENTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(DEFAULT_ACHIEVEMENTS));
      return DEFAULT_ACHIEVEMENTS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_ACHIEVEMENTS;
  }
}

export function saveAchievements(achievements: Achievement[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(achievements));
  } catch (e) {
    console.error("Failed saving achievements:", e);
  }
}

export function getSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed saving settings:", e);
  }
}

export function getLeaderboard(): LeaderboardEntry[] {
  const profile = getProfile();
  const history = getMatchHistory();
  const rivals = [...MOCK_RIVALS];

  const winningMatches = history.filter((m) => m.result === "VICTORY");
  const bestRun: MatchRecord | undefined = winningMatches.sort((a, b) => b.score - a.score)[0];

  if (bestRun) {
    const minutes = Math.floor(bestRun.durationSeconds / 60).toString().padStart(2, "0");
    const seconds = Math.floor(bestRun.durationSeconds % 60).toString().padStart(2, "0");
    rivals.push({
      rank: 0,
      player: profile.handle,
      bossDefeated: bestRun.bossName,
      purity: bestRun.formPurity,
      timeFormatted: `${minutes}:${seconds}`,
      score: bestRun.score,
      isPlayer: true,
    });
  } else {
    rivals.push({
      rank: 0,
      player: profile.handle,
      bossDefeated: "GOLIATH UNIT",
      purity: 94,
      timeFormatted: "01:08",
      score: 7920,
      isPlayer: true,
    });
  }

  rivals.sort((a, b) => b.score - a.score);
  return rivals.map((r, idx) => ({ ...r, rank: idx + 1 }));
}

export function recordMatchResult(record: Omit<MatchRecord, "id" | "timestamp" | "formattedDate">): {
  profile: PlayerProfile;
  achievements: Achievement[];
  newAchievementsUnlocked: string[];
} {
  const now = new Date();
  const id = `match_${Date.now()}`;
  const formattedDate = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const fullRecord: MatchRecord = {
    ...record,
    id,
    timestamp: now.toISOString(),
    formattedDate,
  };

  const history = [fullRecord, ...getMatchHistory()].slice(0, 10);
  saveMatchHistory(history);

  const stats = getAggregatedStats();
  stats.totalReps += record.reps;
  stats.totalBattleTimeSeconds += record.durationSeconds;
  stats.totalMatches += 1;
  if (record.result === "VICTORY") {
    stats.victories += 1;
    stats.totalBossTakedowns += 1;
  } else {
    stats.defeats += 1;
  }
  stats.careerPurityIndex = Math.round(
    (stats.careerPurityIndex * (stats.totalMatches - 1) + record.formPurity) / stats.totalMatches
  );
  saveAggregatedStats(stats);

  const profile = getProfile();
  const today = now.toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  if (!profile.lastWorkoutDate || profile.lastWorkoutDate === yesterday) {
    profile.streak += 1;
  } else if (profile.lastWorkoutDate !== today) {
    profile.streak = 1;
  }
  profile.lastWorkoutDate = today;

  const xpEarned =
    100 +
    record.reps * 18 +
    Math.round(record.formPurity * 2.5) +
    (record.result === "VICTORY" ? 300 : 80);

  const creditsEarned = record.result === "VICTORY" ? 80 : 30;
  profile.bioCredits += creditsEarned;
  profile.xp += xpEarned;

  while (profile.xp >= profile.xpToNextLevel) {
    profile.xp -= profile.xpToNextLevel;
    profile.level += 1;
    profile.xpToNextLevel = Math.round(profile.xpToNextLevel * 1.35);

    if (profile.level >= 10) profile.rankTitle = "Grandmaster Titan";
    else if (profile.level >= 7) profile.rankTitle = "Cyber Vanguard";
    else if (profile.level >= 4) profile.rankTitle = "Kinetic Stalker";
    else if (profile.level >= 2) profile.rankTitle = "Kinetic Operative";
  }
  saveProfile(profile);

  const achievements = getAchievements();
  const newAchievementsUnlocked: string[] = [];

  const unlock = (achId: string) => {
    const ach = achievements.find((a) => a.id === achId);
    if (ach && !ach.unlocked) {
      ach.unlocked = true;
      ach.unlockedAt = formattedDate;
      newAchievementsUnlocked.push(ach.title);
    }
  };

  if (record.formPurity >= 98 && record.result === "VICTORY") unlock("flawless_form");
  if (record.valgusWarnings === 0 && record.reps >= 5) unlock("iron_knees");
  if (record.maxCombo >= 5) unlock("overdrive_striker");
  if (profile.streak >= 7) unlock("relentless");

  saveAchievements(achievements);

  return { profile, achievements, newAchievementsUnlocked };
}

export function resetAllData(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEYS.PROFILE);
    localStorage.removeItem(STORAGE_KEYS.MATCH_HISTORY);
    localStorage.removeItem(STORAGE_KEYS.STATS);
    localStorage.removeItem(STORAGE_KEYS.ACHIEVEMENTS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    localStorage.removeItem("athletemind_streak");
    localStorage.removeItem("athletemind_last_date");
  } catch (e) {
    console.error("Reset failed:", e);
  }
}
