import os
import io
import csv
import time
import json
import sqlite3
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np

app = FastAPI(title="AthleteMind Phase 7 - Biomechanics, Vault & Global Leaderboards", version="7.0.0")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Biomechanical Kinematics Engine (True 3D Euclidean Vector Math)
# ---------------------------------------------------------------------------

def calculate_angle_3d(a: Any, b: Any, c: Any) -> float:
    """Calculates 3D Euclidean joint angle at vertex b using vector dot product:
    theta = arccos((u . v) / (||u|| ||v||))
    where u = a - b and v = c - b in 3D Euclidean space (x, y, z).
    """
    if a is None or b is None or c is None:
        return 180.0

    # Extract 3D or 2D coordinates
    a_arr = np.array(a[:3] if len(a) >= 3 else [a[0], a[1], 0.0], dtype=float)
    b_arr = np.array(b[:3] if len(b) >= 3 else [b[0], b[1], 0.0], dtype=float)
    c_arr = np.array(c[:3] if len(c) >= 3 else [c[0], c[1], 0.0], dtype=float)

    u = a_arr - b_arr
    v = c_arr - b_arr

    norm_u = float(np.linalg.norm(u))
    norm_v = float(np.linalg.norm(v))

    if norm_u < 1e-6 or norm_v < 1e-6:
        return 180.0

    cosine = float(np.dot(u, v) / (norm_u * norm_v))
    cosine = max(-1.0, min(1.0, cosine))
    angle = np.arccos(cosine) * 180.0 / np.pi
    return round(float(angle), 1)


def calculate_angle_2d(a: Any, b: Any, c: Any) -> float:
    """Calculates 2D joint angle at vertex b using arctan2 on (x, y) coordinates."""
    if a is None or b is None or c is None:
        return 180.0
    ax, ay = float(a[0]), float(a[1])
    bx, by = float(b[0]), float(b[1])
    cx, cy = float(c[0]), float(c[1])
    u = np.array([ax - bx, ay - by], dtype=float)
    v = np.array([cx - bx, cy - by], dtype=float)
    norm_u = float(np.linalg.norm(u))
    norm_v = float(np.linalg.norm(v))
    if norm_u < 1e-6 or norm_v < 1e-6:
        return 180.0
    angle_u = np.arctan2(u[1], u[0])
    angle_v = np.arctan2(v[1], v[0])
    diff = abs(angle_u - angle_v) * 180.0 / np.pi
    if diff > 180.0:
        diff = 360.0 - diff
    return round(float(diff), 1)


calculate_angle = calculate_angle_3d


def detect_orientation(left_shoulder: Any, right_shoulder: Any, left_hip: Any, right_hip: Any) -> str:
    """Auto-Orientation Detection:
    Compute normalized horizontal shoulder span: delta_x_sh = |x11 - x12|
    and hip span: delta_x_hip = |x23 - x24|.
    Average torso width W = (delta_x_sh + delta_x_hip) / 2.
    If W >= 0.12: FRONT_PROFILE ("front")
    If W < 0.12: SIDE_PROFILE ("side")
    """
    sh_w = abs(float(left_shoulder[0]) - float(right_shoulder[0])) if (left_shoulder and right_shoulder) else None
    hip_w = abs(float(left_hip[0]) - float(right_hip[0])) if (left_hip and right_hip) else None
    if sh_w is not None and hip_w is not None:
        w = (sh_w + hip_w) / 2.0
    elif sh_w is not None:
        w = sh_w
    elif hip_w is not None:
        w = hip_w
    else:
        w = 0.0
    return "front" if w >= 0.12 else "side"


class OrientationTracker:
    """Temporal hysteresis buffer (5 consecutive frames) before switching profiles to prevent flicker."""

    def __init__(self, initial_profile: str = "FRONT"):
        self.active_profile = initial_profile  # "FRONT" or "SIDE"
        self.candidate_history: List[str] = []
        self.hysteresis_frames = 5

    def reset(self, profile: str = "FRONT"):
        self.active_profile = profile
        self.candidate_history.clear()

    def update(self, left_shoulder: Any, right_shoulder: Any, left_hip: Any, right_hip: Any) -> str:
        raw = detect_orientation(left_shoulder, right_shoulder, left_hip, right_hip)
        cand = "FRONT" if raw == "front" else "SIDE"
        self.candidate_history.append(cand)
        if len(self.candidate_history) > self.hysteresis_frames:
            self.candidate_history.pop(0)

        # Only switch profile if all frames in the hysteresis buffer agree
        if len(self.candidate_history) == self.hysteresis_frames:
            if all(c == cand for c in self.candidate_history):
                self.active_profile = cand
        elif len(self.candidate_history) == 1:
            self.active_profile = cand

        return self.active_profile


def check_knee_valgus(hip: Any, knee: Any, ankle: Any, side: str = "left", right_hip: Any = None, strict: bool = False) -> bool:
    """Knee valgus tracking: flags if knee collapses inward relative to hip & ankle.
    If strict: threshold shrunk to 0.02 (Clinical Strictness Protocol).
    Default: threshold is 0.05.
    """
    if not (hip and knee and ankle):
        return False
    hx, hy = float(hip[0]), float(hip[1])
    kx, ky = float(knee[0]), float(knee[1])
    ax, ay = float(ankle[0]), float(ankle[1])

    if right_hip:
        rx = float(right_hip[0])
        mid_x = (hx + rx) / 2.0
        dy = ay - hy
        if abs(dy) < 1e-4:
            return False
        expected_kx = hx + ((ky - hy) / dy) * (ax - hx)
        inward = (expected_kx - kx) if hx > mid_x else (kx - expected_kx)
        thresh = 0.02 if strict else 0.05
        return bool(inward > thresh)

    return False


def check_frontal_valgus(left_knee: Any, right_knee: Any, left_ankle: Any, right_ankle: Any, strict: bool = False) -> bool:
    """Frontal Valgus / Alignment Tracking:
    Compare |x_left_knee - x_right_knee| against |x_left_ankle - x_right_ankle|.
    Ratio = knee_width / ankle_width.
    Flag valgus only if Ratio < 0.65 (relaxed from 0.75, allowing natural knee taper).
    If strict (CLINICAL_STRICT): threshold is 0.85 (tighter tolerance).
    """
    if not (left_knee and right_knee and left_ankle and right_ankle):
        return False
    knee_sep = abs(float(left_knee[0]) - float(right_knee[0]))
    ankle_sep = abs(float(left_ankle[0]) - float(right_ankle[0]))
    thresh = 0.85 if strict else 0.65
    return bool(ankle_sep >= 0.05 and knee_sep < (ankle_sep * thresh))


# ---------------------------------------------------------------------------
# In-Memory Clinician Telemetry Store
# ---------------------------------------------------------------------------

class SessionTelemetryStore:
    """Maintains downsampled angle time-series, form deviation counts, and rep breakdown."""

    def __init__(self):
        self.reset()

    def reset(self):
        self.session_start = time.time()
        self.last_sample_time = 0.0
        self.angle_trace: List[Dict[str, float]] = []  # 10Hz downsampled {timestamp, angle}
        self.rep_records: List[Dict[str, Any]] = []
        self.valgus_faults = 0
        self.depth_failures = 0
        self.ego_lifts = 0
        self.posture_faults = 0
        self.min_angle_achieved = 180.0
        self.active_exercise = "squats"
        self.total_tension_time = 0.0

    def log_angle_sample(self, angle: float, now: float):
        if now - self.last_sample_time >= 0.1:  # 10Hz downsampling
            elapsed = round(now - self.session_start, 2)
            self.angle_trace.append({"timestamp": elapsed, "angle": round(angle, 1)})
            self.last_sample_time = now
            if angle < self.min_angle_achieved:
                self.min_angle_achieved = angle

    def record_valgus(self):
        self.valgus_faults += 1

    def record_depth_failure(self):
        self.depth_failures += 1

    def record_ego_lift(self):
        self.ego_lifts += 1

    def record_posture_fault(self):
        self.posture_faults += 1

    def record_rep(self, rep_idx: int, min_ang: float, hold_dur: float, had_fault: bool,
                   fault_name: str, now: float, exercise_name: str = "squats", target_hold: float = 1.5):
        verdict = "OPTIMAL"
        purity = 100.0
        faults: List[str] = []

        if had_fault:
            verdict = fault_name.upper() if fault_name else "FORM_FAULT"
            purity -= 35.0
            faults.append(fault_name.upper() if fault_name else "FORM_FAULT")

        if hold_dur < (target_hold - 0.1):
            verdict = "INCOMPLETE_HOLD"
            purity -= 20.0
            faults.append("FAST_HOLD")

        purity = round(max(0.0, purity), 1)
        self.total_tension_time += round(hold_dur, 2)

        self.rep_records.append({
            "rep_index": rep_idx,
            "exercise": exercise_name,
            "min_angle": round(min_ang, 1),
            "hold_duration": round(hold_dur, 2),
            "purity_score": purity,
            "quality_verdict": verdict,
            "faults": ", ".join(faults) if faults else "NONE",
            "timestamp": time.strftime("%H:%M:%S", time.localtime(now)),
        })

    def get_summary(self) -> Dict[str, Any]:
        total_reps = len(self.rep_records)
        mean_hold = (
            float(np.mean([r["hold_duration"] for r in self.rep_records]))
            if total_reps > 0 else 0.0
        )
        pure_reps = sum(1 for r in self.rep_records if r["quality_verdict"] == "OPTIMAL")
        purity_score = round((pure_reps / max(1, total_reps)) * 100.0, 1) if total_reps > 0 else 100.0

        return {
            "exercise": self.active_exercise,
            "total_reps": total_reps,
            "mean_bottom_hold_time": round(mean_hold, 2),
            "total_tension_time_sec": round(self.total_tension_time, 2),
            "max_depth_angle": round(self.min_angle_achieved, 1) if self.min_angle_achieved < 180.0 else 90.0,
            "purity_score": purity_score,
            "biomechanical_fault_breakdown": {
                "valgus_faults": self.valgus_faults,
                "depth_failures": self.depth_failures,
                "ego_lifts": self.ego_lifts,
                "posture_faults": self.posture_faults,
            },
            "angle_trace": self.angle_trace[-200:],
            "reps": self.rep_records,
        }

    def generate_csv(self) -> str:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Rep_Index", "Exercise", "Min_Angle_Deg", "Hold_Duration_s", "Purity_Score_Pct", "Quality_Verdict", "Faults", "Timestamp"])

        for r in self.rep_records:
            writer.writerow([
                r["rep_index"],
                r.get("exercise", "squats"),
                r["min_angle"],
                r["hold_duration"],
                r["purity_score"],
                r["quality_verdict"],
                r["faults"],
                r["timestamp"],
            ])

        return output.getvalue()


global_telemetry = SessionTelemetryStore()


# ---------------------------------------------------------------------------
# Base Exercise Processor
# ---------------------------------------------------------------------------

class BaseExerciseEngine:
    """Base class for modular 3D kinematic exercise state machines."""

    def __init__(self, exercise_type: str, difficulty: str = "standard", telemetry: Optional[SessionTelemetryStore] = None, modifiers: Optional[List[str]] = None):
        self.exercise_type = exercise_type
        self.difficulty = difficulty
        self.telemetry = telemetry or global_telemetry
        self.modifiers: List[str] = [m.upper() for m in (modifiers or [])]
        self.rep_count = 0
        self.phase = "STARTING"
        self.hold_start_time: Optional[float] = None
        self.hold_duration = 0.0
        self.rep_hit_awarded = False
        self.current_rep_min_angle = 180.0
        self.current_rep_had_fault = False
        self.current_rep_fault_name = ""

        # Stun & Ego-Lift
        self.is_stunned = False
        self.stun_until = 0.0
        self.weapon_overheated = False
        self.in_shallow_dip = False
        self.sloppy_dips: List[float] = []

        # Smoothing
        self.smooth_primary: Optional[float] = None
        self.smooth_secondary: Optional[float] = None

    def set_modifiers(self, modifiers: List[str]):
        self.modifiers = [m.upper() for m in (modifiers or [])]

    def set_difficulty(self, difficulty: str):
        if difficulty in ("rehab", "standard", "athlete"):
            self.difficulty = difficulty

    def reset(self):
        self.rep_count = 0
        self.phase = "STARTING"
        self.hold_start_time = None
        self.hold_duration = 0.0
        self.rep_hit_awarded = False
        self.current_rep_min_angle = 180.0
        self.current_rep_had_fault = False
        self.current_rep_fault_name = ""
        self.is_stunned = False
        self.stun_until = 0.0
        self.weapon_overheated = False
        self.in_shallow_dip = False
        self.sloppy_dips.clear()
        self.smooth_primary = None
        self.smooth_secondary = None

    def _smooth_angles(self, raw_p: float, raw_s: float):
        if self.smooth_primary is None:
            self.smooth_primary = raw_p
            self.smooth_secondary = raw_s
        else:
            self.smooth_primary = round(0.75 * raw_p + 0.25 * self.smooth_primary, 1)
            self.smooth_secondary = round(0.75 * raw_s + 0.25 * self.smooth_secondary, 1)
        return self.smooth_primary, self.smooth_secondary

    def _build_base_payload(
        self,
        status: str,
        phase: str,
        primary_ang: float,
        primary_name: str,
        secondary_ang: float,
        secondary_name: str,
        hold_dur: float,
        target_hold: float,
        damage: int,
        damage_taken: int,
        has_fault: bool,
        fault_type: str,
        overheated: bool,
        message: str,
        audio_cue: str,
        event: str,
        active_joint_idx: int,
        fault_joint_indices: List[int],
        view_orientation: str = "side",
        active_profile: str = "FRONT",
        metric_value: float = 0.0,
    ) -> Dict[str, Any]:
        purity = 100.0
        if has_fault:
            purity -= 35.0
        if overheated:
            purity -= 50.0
        purity = round(max(0.0, purity), 1)

        is_critical = status in ("hit", "CRITICAL HIT!") or damage >= 100

        return {
            "event": event,
            "exercise_type": self.exercise_type,
            "difficulty": self.difficulty,
            "view_orientation": view_orientation,
            "active_profile": active_profile,
            "metric_value": metric_value,
            "status": status,
            "phase": phase,
            "primary_angle": primary_ang,
            "primary_angle_name": primary_name,
            "secondary_angle": secondary_ang,
            "secondary_angle_name": secondary_name,
            # Backward compatibility aliases
            "knee_angle": primary_ang if self.exercise_type in ("squats", "rdl") else secondary_ang,
            "hip_angle": secondary_ang if self.exercise_type in ("squats", "pushups") else primary_ang,
            "rep_count": self.rep_count,
            "hold_time": round(hold_dur, 2),
            "hold_progress": round(min(1.0, hold_dur / target_hold), 2) if target_hold > 0 else 0.0,
            "hold_target": target_hold,
            "damage": damage,
            "damage_taken": damage_taken,
            "purity": purity,
            "has_fault": has_fault,
            "fault_type": fault_type,
            "valgus": bool(fault_type == "valgus"),
            "knee_caved_in": bool(fault_type == "valgus"),
            "warning": "KNEES CAVING INWARD - DRIVE KNEES OUT" if fault_type == "valgus" else "",
            "weapon_overheated": overheated,
            "error": fault_type.upper() if has_fault else "",
            "message": message,
            "audio_cue": audio_cue,
            "is_critical": is_critical,
            "active_joint_index": active_joint_idx,
            "fault_joint_indices": fault_joint_indices,
        }


# ---------------------------------------------------------------------------
# Exercise 1: Squat Processor (3D + Frontal / Sagittal Agnostic)
# ---------------------------------------------------------------------------

class SquatEngine(BaseExerciseEngine):
    """Squat Kinematics: Dual Profile (Side Sagittal & Front Coronal) with adaptive thresholds."""

    def __init__(self, telemetry: Optional[SessionTelemetryStore] = None, difficulty: str = "standard", modifiers: Optional[List[str]] = None):
        super().__init__("squats", difficulty, telemetry, modifiers=modifiers)
        self.orientation_tracker = OrientationTracker(initial_profile="FRONT")
        self.y_hip_stand: Optional[float] = None
        self.h_stand: Optional[float] = None
        self.valgus_consecutive_frames = 0

    def reset(self):
        super().reset()
        self.orientation_tracker.reset("FRONT")
        self.y_hip_stand = None
        self.h_stand = None
        self.valgus_consecutive_frames = 0

    def process(self, hip: Any, knee: Any, ankle: Any, shoulder: Any = None,
                now: Optional[float] = None, right_hip: Any = None,
                left_knee: Any = None, right_knee: Any = None,
                left_ankle: Any = None, right_ankle: Any = None,
                left_shoulder: Any = None, right_shoulder: Any = None,
                **kwargs) -> Dict[str, Any]:
        if now is None:
            now = time.time()

        # Hold target baseline is 1.0s (adaptive & forgiving)
        target_hold = 1.0
        if self.difficulty == "athlete":
            target_hold = 1.5
        elif self.difficulty == "rehab":
            target_hold = 0.8

        if "HYPER_TENSION" in self.modifiers:
            target_hold = 3.0

        # Auto-Orientation Detection with 5-frame temporal hysteresis buffer
        active_profile = self.orientation_tracker.update(left_shoulder, right_shoulder, hip, right_hip)
        view_mode = "front" if active_profile == "FRONT" else "side"

        # Handle Stun
        if self.is_stunned:
            if now >= self.stun_until:
                self.is_stunned = False
                self.weapon_overheated = False
                self.phase = "STANDING"
            else:
                return self._build_base_payload(
                    status="penalty",
                    phase="STUNNED",
                    primary_ang=self.smooth_primary or 180.0,
                    primary_name="Knee",
                    secondary_ang=self.smooth_secondary or 90.0,
                    secondary_name="Hip",
                    hold_dur=0.0,
                    target_hold=target_hold,
                    damage=0,
                    damage_taken=0,
                    has_fault=True,
                    fault_type="ego_lift",
                    overheated=True,
                    message="WEAPON OVERHEATED - STUNNED!",
                    audio_cue="Slow down, control your tempo",
                    event="FRAME",
                    active_joint_idx=25,
                    fault_joint_indices=[23, 25, 27],
                    view_orientation=view_mode,
                    active_profile=active_profile,
                    metric_value=0.0,
                )

        # Select limb with higher visibility for Sagittal / 2D Tracking
        def get_vis(pt):
            return float(pt[3]) if (pt and len(pt) >= 4) else 1.0

        l_vis = (get_vis(hip) + get_vis(knee) + get_vis(ankle)) / 3.0
        r_vis = (get_vis(right_hip) + get_vis(right_knee) + get_vis(right_ankle)) / 3.0 if (right_hip and right_knee and right_ankle) else 0.0

        if r_vis > l_vis + 0.10 and right_hip and right_knee and right_ankle:
            chosen_hip, chosen_knee, chosen_ankle = right_hip, right_knee, right_ankle
        else:
            chosen_hip, chosen_knee, chosen_ankle = hip, knee, ankle

        valgus = False
        strict = "CLINICAL_STRICT" in self.modifiers

        if active_profile == "SIDE":
            # ---------------------------------------------------------------
            # 2. Relaxed & Adaptive Side Profile Mode (Sagittal View)
            # ---------------------------------------------------------------
            # Knee angle using 2D arctan2 on (x, y) of limb with higher visibility
            raw_knee_2d = calculate_angle_2d(chosen_hip, chosen_knee, chosen_ankle)
            raw_hip_2d = calculate_angle_2d(shoulder, hip, knee) if shoulder else 90.0
            knee_ang, hip_ang = self._smooth_angles(raw_knee_2d, raw_hip_2d)

            self.telemetry.log_angle_sample(knee_ang, now)
            if knee_ang < self.current_rep_min_angle:
                self.current_rep_min_angle = knee_ang

            # Forgiving Thresholds:
            # Depth: Knee angle <= 100 deg (relaxed from strict < 90 deg)
            is_bottom_depth = (knee_ang <= 100.0)
            # Standing Reset: Knee angle >= 150 deg (relaxed from 160 deg)
            is_standing = (knee_ang >= 150.0)

            # Knee Valgus: Inactive in Side Mode (cannot be reliably measured in sagittal plane)
            valgus = False
            self.valgus_consecutive_frames = 0

            primary_name = "Knee"
            secondary_name = "Hip"
            metric_value = round(knee_ang, 1)

            # Anti-Ego Lift
            is_shallow = (knee_ang < 130.0 and not is_bottom_depth)

        else:
            # ---------------------------------------------------------------
            # 3. Normalized Front Profile Mode (Coronal View)
            # ---------------------------------------------------------------
            raw_knee_3d = calculate_angle_3d(hip, knee, ankle)
            knee_ang, hip_ang = self._smooth_angles(raw_knee_3d, 180.0)

            self.telemetry.log_angle_sample(knee_ang, now)
            if knee_ang < self.current_rep_min_angle:
                self.current_rep_min_angle = knee_ang

            # Standing baseline: capture standing hip-to-ankle vertical distance
            y_hip_mid = (float(hip[1]) + float(right_hip[1])) / 2.0 if right_hip else float(hip[1])
            y_ankle_mid = (float(ankle[1]) + float(right_ankle[1])) / 2.0 if right_ankle else float(ankle[1])
            curr_h = abs(y_hip_mid - y_ankle_mid)

            if self.y_hip_stand is None or (y_hip_mid < self.y_hip_stand and (knee_ang >= 145.0 or self.phase == "STARTING")):
                self.y_hip_stand = y_hip_mid
                self.h_stand = max(0.15, curr_h)
            elif knee_ang >= 150.0:
                self.y_hip_stand = min(self.y_hip_stand, y_hip_mid)
                self.h_stand = max(0.15, curr_h)

            h_ref = self.h_stand or max(0.15, curr_h)
            y_stand_ref = self.y_hip_stand if self.y_hip_stand is not None else y_hip_mid
            drop_ratio = max(0.0, (y_hip_mid - y_stand_ref) / max(0.1, h_ref))

            # Forgiving Valgus Threshold: Ratio = |x_lk - x_rk| / |x_la - x_ra| < 0.65 (3-frame filter)
            raw_valgus = False
            if left_knee and right_knee and left_ankle and right_ankle:
                raw_valgus = check_frontal_valgus(left_knee, right_knee, left_ankle, right_ankle, strict=strict)
            elif right_hip:
                raw_valgus = check_knee_valgus(hip, knee, ankle, side="left", right_hip=right_hip, strict=strict)

            if raw_valgus:
                self.valgus_consecutive_frames += 1
            else:
                self.valgus_consecutive_frames = 0

            valgus = (self.valgus_consecutive_frames >= 3)
            if valgus:
                self.current_rep_had_fault = True
                self.current_rep_fault_name = "knee_valgus"
                self.telemetry.record_valgus()

            # Depth Threshold: Drop Ratio >= 0.28 (hip drops >= 28% lower body length) or 3D knee <= 105 deg
            hip_at_knee = bool(float(hip[1]) >= float(knee[1]) - 0.05)
            is_bottom_depth = (drop_ratio >= 0.28 or knee_ang <= 105.0 or hip_at_knee) and not valgus

            # Standing Reset: Drop Ratio <= 0.10 or knee angle >= 150 deg
            is_standing = (drop_ratio <= 0.10 or knee_ang >= 150.0)

            primary_name = "Drop"
            secondary_name = "Knee"
            metric_value = round(drop_ratio * 100.0, 1)

            # Anti-Ego Lift
            is_shallow = (drop_ratio > 0.15 and not is_bottom_depth)

        # Anti-Ego Lift Logic with forgiving multi-bounce filter
        if is_shallow:
            self.in_shallow_dip = True

        if self.in_shallow_dip and is_standing:
            if not self.rep_hit_awarded:
                self.telemetry.record_depth_failure()
                self.sloppy_dips.append(now)
                self.sloppy_dips = [t for t in self.sloppy_dips if now - t <= 3.0]
                if len(self.sloppy_dips) >= 3:
                    self.is_stunned = True
                    self.stun_until = now + 2.5
                    self.weapon_overheated = True
                    self.telemetry.record_ego_lift()
                    self.sloppy_dips.clear()
                    self.in_shallow_dip = False
                    return self._build_base_payload(
                        status="penalty",
                        phase="STUNNED",
                        primary_ang=knee_ang,
                        primary_name=primary_name,
                        secondary_ang=hip_ang,
                        secondary_name=secondary_name,
                        hold_dur=0.0,
                        target_hold=target_hold,
                        damage=0,
                        damage_taken=20,
                        has_fault=True,
                        fault_type="ego_lift",
                        overheated=True,
                        message="EGO LIFT DETECTED - CONTROL TEMPO!",
                        audio_cue="Slow down, control your tempo",
                        event="EGO_LIFT",
                        active_joint_idx=25,
                        fault_joint_indices=[23, 25, 27],
                        view_orientation=view_mode,
                        active_profile=active_profile,
                        metric_value=metric_value,
                    )
            self.in_shallow_dip = False

        status = "TRACKING"
        damage = 0
        if active_profile == "SIDE":
            message = f"SQUAT DOWN (SIDE VIEW • TARGET <= 100° • NOW {int(knee_ang)}°)"
        else:
            message = f"SQUAT DOWN (FRONT VIEW • HIP DROP >= 28% • NOW {int(metric_value)}%)"
        audio_cue = ""
        event = "FRAME"

        if is_bottom_depth:
            self.phase = "HOLDING"
            if self.hold_start_time is None:
                self.hold_start_time = now
            self.hold_duration = now - self.hold_start_time

            if self.hold_duration >= target_hold:
                status = "hit"
                damage = 100
                message = "CRITICAL HIT! STAND UP"
                audio_cue = "Critical hit! Stand up"
                event = "HOLD_HIT"
                self.rep_hit_awarded = True
            else:
                status = "HOLDING"
                message = f"HOLD SQUAT... ({self.hold_duration:.1f}s / {target_hold}s)"
        else:
            if now - (self.hold_start_time or 0) > 0.6:
                self.hold_start_time = None
                self.hold_duration = 0.0

            if is_standing:
                if self.rep_hit_awarded:
                    self.rep_count += 1
                    status = "CRITICAL HIT!"
                    damage = 100
                    event = "REP_COMPLETE"
                    message = f"REP {self.rep_count} COMPLETE! (+100 DMG)"
                    audio_cue = f"Rep {self.rep_count} complete!"

                    self.telemetry.record_rep(
                        rep_idx=self.rep_count,
                        min_ang=self.current_rep_min_angle,
                        hold_dur=max(target_hold, self.hold_duration),
                        had_fault=self.current_rep_had_fault,
                        fault_name=self.current_rep_fault_name,
                        now=now,
                        exercise_name="squats",
                        target_hold=target_hold,
                    )

                    self.rep_hit_awarded = False
                    self.current_rep_min_angle = 180.0
                    self.current_rep_had_fault = False
                    self.current_rep_fault_name = ""
                else:
                    status = "TRACKING"
                    message = "READY • SQUAT DOWN"
                    damage = 0
                self.phase = "STANDING"
            else:
                self.phase = "ASCENDING" if self.rep_hit_awarded else "DESCENDING"
                if valgus:
                    message = "KNEES CAVING INWARD - DRIVE KNEES OUT"
                    audio_cue = "Push your knees out"
                elif self.rep_hit_awarded:
                    message = "RETURN TO STANDING"
                else:
                    if active_profile == "SIDE":
                        message = f"SQUAT TO 100° ({int(knee_ang)}°)"
                    else:
                        message = f"LOWER HIPS TO 28% ({int(metric_value)}%)"

        fault_type = "valgus" if valgus else ""
        fault_joints = [25, 26] if valgus else []

        return self._build_base_payload(
            status=status,
            phase=self.phase,
            primary_ang=knee_ang,
            primary_name=primary_name,
            secondary_ang=hip_ang,
            secondary_name=secondary_name,
            hold_dur=self.hold_duration,
            target_hold=target_hold,
            damage=damage,
            damage_taken=0,
            has_fault=valgus,
            fault_type=fault_type,
            overheated=False,
            message=message,
            audio_cue=audio_cue,
            event=event,
            active_joint_idx=25,
            fault_joint_indices=fault_joints,
            view_orientation=view_mode,
            active_profile=active_profile,
            metric_value=metric_value,
        )

    def process_frame(self, *args, **kwargs) -> Dict[str, Any]:
        """Test suite and backward compatibility adapter."""
        if kwargs:
            now = kwargs.get("now", time.time())
            hip = kwargs.get("hip", [0.5, 0.5, 0.0])
            knee = kwargs.get("knee", [0.5, 0.7, 0.0])
            ankle = kwargs.get("ankle", [0.5, 0.9, 0.0])
            shoulder = kwargs.get("shoulder", [0.5, 0.2, 0.0])
            right_hip = kwargs.get("right_hip")
            return self.process(hip, knee, ankle, shoulder=shoulder, now=now, right_hip=right_hip)
        if len(args) >= 3:
            return self.process(args[0], args[1], args[2])
        return self.process([0.5, 0.5, 0.0], [0.5, 0.7, 0.0], [0.5, 0.9, 0.0])


# ---------------------------------------------------------------------------
# Exercise 2: Push-up Processor (Upper Body Push & Core Plank)
# ---------------------------------------------------------------------------

class PushUpEngine(BaseExerciseEngine):
    """Push-ups: Shoulder(11) - Elbow(13) - Wrist(15) + Plank Trunk(11-23-27)."""

    def __init__(self, telemetry: Optional[SessionTelemetryStore] = None, difficulty: str = "standard", modifiers: Optional[List[str]] = None):
        super().__init__("pushups", difficulty, telemetry, modifiers=modifiers)

    def process(self, shoulder: Any, elbow: Any, wrist: Any, hip: Any = None,
                ankle: Any = None, now: Optional[float] = None, **kwargs) -> Dict[str, Any]:
        if now is None:
            now = time.time()

        if self.difficulty == "rehab":
            bottom_elbow_max = 105.0
            lockout_min = 155.0
            target_hold = 1.0
        elif self.difficulty == "athlete":
            bottom_elbow_max = 80.0
            lockout_min = 170.0
            target_hold = 2.0
        else:  # standard
            bottom_elbow_max = 90.0
            lockout_min = 165.0
            target_hold = 1.5

        if "HYPER_TENSION" in self.modifiers:
            target_hold = 3.0

        if self.is_stunned:
            if now >= self.stun_until:
                self.is_stunned = False
                self.weapon_overheated = False
                self.phase = "LOCKOUT"
            else:
                return self._build_base_payload(
                    status="penalty",
                    phase="STUNNED",
                    primary_ang=self.smooth_primary or 170.0,
                    primary_name="Elbow",
                    secondary_ang=self.smooth_secondary or 180.0,
                    secondary_name="Plank Core",
                    hold_dur=0.0,
                    target_hold=target_hold,
                    damage=0,
                    damage_taken=0,
                    has_fault=True,
                    fault_type="lumbar_sag",
                    overheated=True,
                    message="LUMBAR SAG DETECTED - STUNNED!",
                    audio_cue="Squeeze your core, don't sag your hips",
                    event="FRAME",
                    active_joint_idx=13,
                    fault_joint_indices=[11, 23, 27],
                )

        raw_elbow = calculate_angle_3d(shoulder, elbow, wrist)
        raw_plank = calculate_angle_3d(shoulder, hip, ankle) if (hip and ankle) else 180.0
        elbow_ang, plank_ang = self._smooth_angles(raw_elbow, raw_plank)

        self.telemetry.log_angle_sample(elbow_ang, now)
        if elbow_ang < self.current_rep_min_angle:
            self.current_rep_min_angle = elbow_ang

        # Plank integrity check (Clinical Strictness Protocol reduces tolerance to 10 deg)
        plank_tol = 10.0 if "CLINICAL_STRICT" in self.modifiers else 20.0
        lumbar_sag = abs(180.0 - plank_ang) > plank_tol
        if lumbar_sag:
            self.current_rep_had_fault = True
            self.current_rep_fault_name = "lumbar_sag"
            self.telemetry.record_posture_fault()

        is_bottom = (elbow_ang <= bottom_elbow_max) and not lumbar_sag
        is_lockout = (elbow_ang >= lockout_min) and not lumbar_sag

        # Anti-Ego Lift
        if raw_elbow < 135.0 or elbow_ang < 140.0:
            self.in_shallow_dip = True

        if self.in_shallow_dip and is_lockout:
            if not self.rep_hit_awarded:
                self.telemetry.record_depth_failure()
                self.sloppy_dips.append(now)
                self.sloppy_dips = [t for t in self.sloppy_dips if now - t <= 3.0]
                if len(self.sloppy_dips) >= 2:
                    self.is_stunned = True
                    self.stun_until = now + 3.0
                    self.weapon_overheated = True
                    self.telemetry.record_ego_lift()
                    self.sloppy_dips.clear()
                    self.in_shallow_dip = False
                    return self._build_base_payload(
                        status="penalty",
                        phase="STUNNED",
                        primary_ang=elbow_ang,
                        primary_name="Elbow",
                        secondary_ang=plank_ang,
                        secondary_name="Plank Core",
                        hold_dur=0.0,
                        target_hold=target_hold,
                        damage=0,
                        damage_taken=25,
                        has_fault=True,
                        fault_type="ego_lift",
                        overheated=True,
                        message="SHALLOW PUSH-UPS DETECTED - STUNNED! (-25 HP)",
                        audio_cue="Chest to floor, slow down",
                        event="EGO_LIFT",
                        active_joint_idx=13,
                        fault_joint_indices=[11, 13, 15],
                    )
            self.in_shallow_dip = False

        status = "TRACKING"
        damage = 0
        message = f"LOWER CHEST (TARGET <= {int(bottom_elbow_max)}°)"
        audio_cue = ""
        event = "FRAME"

        if is_bottom:
            self.phase = "HOLDING"
            if self.hold_start_time is None:
                self.hold_start_time = now
            self.hold_duration = now - self.hold_start_time

            if self.hold_duration >= target_hold:
                status = "hit"
                damage = 100
                message = "CRITICAL HIT! PUSH TO LOCKOUT"
                audio_cue = "Critical hit! Push up to lockout"
                event = "HOLD_HIT"
                self.rep_hit_awarded = True
            else:
                status = "HOLDING"
                message = f"HOLD BOTTOM... ({self.hold_duration:.1f}s / {target_hold}s)"
        else:
            if now - (self.hold_start_time or 0) > 0.6:
                self.hold_start_time = None
                self.hold_duration = 0.0

            if is_lockout:
                if self.rep_hit_awarded:
                    self.rep_count += 1
                    status = "CRITICAL HIT!"
                    damage = 100
                    event = "REP_COMPLETE"
                    message = f"PUSH-UP {self.rep_count} COMPLETE! (+100 DMG)"
                    audio_cue = f"Push-up {self.rep_count} complete!"

                    self.telemetry.record_rep(
                        rep_idx=self.rep_count,
                        min_ang=self.current_rep_min_angle,
                        hold_dur=max(target_hold, self.hold_duration),
                        had_fault=self.current_rep_had_fault,
                        fault_name=self.current_rep_fault_name,
                        now=now,
                        exercise_name="pushups",
                        target_hold=target_hold,
                    )

                    self.rep_hit_awarded = False
                    self.current_rep_min_angle = 180.0
                    self.current_rep_had_fault = False
                    self.current_rep_fault_name = ""
                else:
                    status = "TRACKING"
                    message = "READY • LOWER CHEST"
                    damage = 0
                self.phase = "LOCKOUT"
            else:
                self.phase = "ASCENDING" if self.rep_hit_awarded else "DESCENDING"
                if lumbar_sag:
                    message = "LUMBAR SAG DETECTED - SQUEEZE YOUR CORE"
                    audio_cue = "Squeeze your core"
                elif self.rep_hit_awarded:
                    message = "PUSH ALL THE WAY UP TO LOCKOUT"
                else:
                    message = f"LOWER TO {int(bottom_elbow_max)}° ({int(elbow_ang)}°)"

        fault_type = "lumbar_sag" if lumbar_sag else ""
        fault_joints = [11, 23, 27] if lumbar_sag else []

        return self._build_base_payload(
            status=status,
            phase=self.phase,
            primary_ang=elbow_ang,
            primary_name="Elbow",
            secondary_ang=plank_ang,
            secondary_name="Plank Core",
            hold_dur=self.hold_duration,
            target_hold=target_hold,
            damage=damage,
            damage_taken=0,
            has_fault=lumbar_sag,
            fault_type=fault_type,
            overheated=False,
            message=message,
            audio_cue=audio_cue,
            event=event,
            active_joint_idx=13,
            fault_joint_indices=fault_joints,
        )


# ---------------------------------------------------------------------------
# Exercise 3: Overhead Press Processor (Scapular Plane / Vertical Push)
# ---------------------------------------------------------------------------

class OverheadPressEngine(BaseExerciseEngine):
    """Overhead Press: Hip(23) - Shoulder(11) - Elbow(13) + Lumbar Arch(11-23-25)."""

    def __init__(self, telemetry: Optional[SessionTelemetryStore] = None, difficulty: str = "standard", modifiers: Optional[List[str]] = None):
        super().__init__("overhead_press", difficulty, telemetry, modifiers=modifiers)

    def process(self, hip: Any, shoulder: Any, elbow: Any, knee: Any = None,
                wrist: Any = None, now: Optional[float] = None, **kwargs) -> Dict[str, Any]:
        if now is None:
            now = time.time()

        if self.difficulty == "rehab":
            top_lockout_min = 150.0
            rack_position_max = 90.0
            target_hold = 1.0
        elif self.difficulty == "athlete":
            top_lockout_min = 170.0
            rack_position_max = 75.0
            target_hold = 2.0
        else:  # standard
            top_lockout_min = 165.0
            rack_position_max = 80.0
            target_hold = 1.5

        if "HYPER_TENSION" in self.modifiers:
            target_hold = 3.0

        if self.is_stunned:
            if now >= self.stun_until:
                self.is_stunned = False
                self.weapon_overheated = False
                self.phase = "RACK"
            else:
                return self._build_base_payload(
                    status="penalty",
                    phase="STUNNED",
                    primary_ang=self.smooth_primary or 80.0,
                    primary_name="Shoulder",
                    secondary_ang=self.smooth_secondary or 180.0,
                    secondary_name="Lumbar Spine",
                    hold_dur=0.0,
                    target_hold=target_hold,
                    damage=0,
                    damage_taken=0,
                    has_fault=True,
                    fault_type="lumbar_arch",
                    overheated=True,
                    message="LUMBAR ARCH COMPENSATION DETECTED!",
                    audio_cue="Don't arch your back, brace your core",
                    event="FRAME",
                    active_joint_idx=11,
                    fault_joint_indices=[11, 23, 25],
                )

        raw_shoulder = calculate_angle_3d(hip, shoulder, elbow)
        raw_spine = calculate_angle_3d(shoulder, hip, knee) if knee else 180.0
        shoulder_ang, spine_ang = self._smooth_angles(raw_shoulder, raw_spine)

        self.telemetry.log_angle_sample(shoulder_ang, now)
        if shoulder_ang > self.current_rep_min_angle or self.current_rep_min_angle == 180.0:
            self.current_rep_min_angle = shoulder_ang

        # Spine integrity check (Clinical Strictness Protocol reduces tolerance to 10 deg)
        spine_tol = 10.0 if "CLINICAL_STRICT" in self.modifiers else 20.0
        lumbar_arch = abs(180.0 - spine_ang) > spine_tol
        if lumbar_arch:
            self.current_rep_had_fault = True
            self.current_rep_fault_name = "lumbar_arch"
            self.telemetry.record_posture_fault()

        is_top_lockout = (shoulder_ang >= top_lockout_min) and not lumbar_arch
        is_rack = (shoulder_ang <= rack_position_max) and not lumbar_arch

        # Anti-Ego Lift
        if raw_shoulder > 115.0 or shoulder_ang > 120.0:
            self.in_shallow_dip = True

        if self.in_shallow_dip and is_rack:
            if not self.rep_hit_awarded:
                self.telemetry.record_depth_failure()
                self.sloppy_dips.append(now)
                self.sloppy_dips = [t for t in self.sloppy_dips if now - t <= 3.0]
                if len(self.sloppy_dips) >= 2:
                    self.is_stunned = True
                    self.stun_until = now + 3.0
                    self.weapon_overheated = True
                    self.telemetry.record_ego_lift()
                    self.sloppy_dips.clear()
                    self.in_shallow_dip = False
                    return self._build_base_payload(
                        status="penalty",
                        phase="STUNNED",
                        primary_ang=shoulder_ang,
                        primary_name="Shoulder",
                        secondary_ang=spine_ang,
                        secondary_name="Lumbar Spine",
                        hold_dur=0.0,
                        target_hold=target_hold,
                        damage=0,
                        damage_taken=25,
                        has_fault=True,
                        fault_type="ego_lift",
                        overheated=True,
                        message="INCOMPLETE PRESS DETECTED - STUNNED! (-25 HP)",
                        audio_cue="Lock out overhead, slow down",
                        event="EGO_LIFT",
                        active_joint_idx=11,
                        fault_joint_indices=[23, 11, 13],
                    )
            self.in_shallow_dip = False

        status = "TRACKING"
        damage = 0
        message = f"PRESS OVERHEAD (TARGET >= {int(top_lockout_min)}°)"
        audio_cue = ""
        event = "FRAME"

        if is_top_lockout:
            self.phase = "HOLDING"
            if self.hold_start_time is None:
                self.hold_start_time = now
            self.hold_duration = now - self.hold_start_time

            if self.hold_duration >= target_hold:
                status = "hit"
                damage = 100
                message = "CRITICAL HIT! LOWER TO RACK"
                audio_cue = "Critical hit! Lower to shoulders"
                event = "HOLD_HIT"
                self.rep_hit_awarded = True
            else:
                status = "HOLDING"
                message = f"HOLD OVERHEAD... ({self.hold_duration:.1f}s / {target_hold}s)"
        else:
            if now - (self.hold_start_time or 0) > 0.6:
                self.hold_start_time = None
                self.hold_duration = 0.0

            if is_rack:
                if self.rep_hit_awarded:
                    self.rep_count += 1
                    status = "CRITICAL HIT!"
                    damage = 100
                    event = "REP_COMPLETE"
                    message = f"PRESS {self.rep_count} COMPLETE! (+100 DMG)"
                    audio_cue = f"Overhead press {self.rep_count} complete!"

                    self.telemetry.record_rep(
                        rep_idx=self.rep_count,
                        min_ang=self.current_rep_min_angle,
                        hold_dur=max(target_hold, self.hold_duration),
                        had_fault=self.current_rep_had_fault,
                        fault_name=self.current_rep_fault_name,
                        now=now,
                        exercise_name="overhead_press",
                        target_hold=target_hold,
                    )

                    self.rep_hit_awarded = False
                    self.current_rep_min_angle = 180.0
                    self.current_rep_had_fault = False
                    self.current_rep_fault_name = ""
                else:
                    status = "TRACKING"
                    message = "READY • PRESS OVERHEAD"
                    damage = 0
                self.phase = "RACK"
            else:
                self.phase = "ASCENDING" if not self.rep_hit_awarded else "DESCENDING"
                if lumbar_arch:
                    message = "DON'T ARCH YOUR BACK - SQUEEZE CORE"
                    audio_cue = "Don't arch your back"
                elif self.rep_hit_awarded:
                    message = "LOWER WEIGHT TO SHOULDERS"
                else:
                    message = f"DRIVE TO {int(top_lockout_min)}° ({int(shoulder_ang)}°)"

        fault_type = "lumbar_arch" if lumbar_arch else ""
        fault_joints = [11, 23, 25] if lumbar_arch else []

        return self._build_base_payload(
            status=status,
            phase=self.phase,
            primary_ang=shoulder_ang,
            primary_name="Shoulder",
            secondary_ang=spine_ang,
            secondary_name="Lumbar Spine",
            hold_dur=self.hold_duration,
            target_hold=target_hold,
            damage=damage,
            damage_taken=0,
            has_fault=lumbar_arch,
            fault_type=fault_type,
            overheated=False,
            message=message,
            audio_cue=audio_cue,
            event=event,
            active_joint_idx=11,
            fault_joint_indices=fault_joints,
        )


# ---------------------------------------------------------------------------
# Exercise 4: Romanian Deadlift (RDL) / Hip Hinge Processor
# ---------------------------------------------------------------------------

class RDLEngine(BaseExerciseEngine):
    """Romanian Deadlifts: Shoulder(11) - Hip(23) - Knee(25) + Knee Flexion(23-25-27)."""

    def __init__(self, telemetry: Optional[SessionTelemetryStore] = None, difficulty: str = "standard", modifiers: Optional[List[str]] = None):
        super().__init__("rdl", difficulty, telemetry, modifiers=modifiers)

    def process(self, shoulder: Any, hip: Any, knee: Any, ankle: Any = None,
                now: Optional[float] = None, **kwargs) -> Dict[str, Any]:
        if now is None:
            now = time.time()

        if self.difficulty == "rehab":
            hinge_flex_max = 95.0
            hinge_flex_min = 60.0
            stand_min = 155.0
            knee_min = 140.0
            target_hold = 1.0
        elif self.difficulty == "athlete":
            hinge_flex_max = 75.0
            hinge_flex_min = 55.0
            stand_min = 165.0
            knee_min = 140.0
            target_hold = 2.0
        else:  # standard
            hinge_flex_max = 90.0
            hinge_flex_min = 70.0
            stand_min = 160.0
            knee_min = 135.0
            target_hold = 1.5

        if "HYPER_TENSION" in self.modifiers:
            target_hold = 3.0
        if "CLINICAL_STRICT" in self.modifiers:
            knee_min = max(knee_min, 145.0)

        if self.is_stunned:
            if now >= self.stun_until:
                self.is_stunned = False
                self.weapon_overheated = False
                self.phase = "STANDING"
            else:
                return self._build_base_payload(
                    status="penalty",
                    phase="STUNNED",
                    primary_ang=self.smooth_primary or 180.0,
                    primary_name="Hip Hinge",
                    secondary_ang=self.smooth_secondary or 160.0,
                    secondary_name="Knee Bend",
                    hold_dur=0.0,
                    target_hold=target_hold,
                    damage=0,
                    damage_taken=0,
                    has_fault=True,
                    fault_type="squatting_the_hinge",
                    overheated=True,
                    message="SQUATTING THE HINGE DETECTED!",
                    audio_cue="Don't squat the hinge, push hips back",
                    event="FRAME",
                    active_joint_idx=23,
                    fault_joint_indices=[23, 25, 27],
                )

        raw_hip = calculate_angle_3d(shoulder, hip, knee)
        raw_knee = calculate_angle_3d(hip, knee, ankle) if ankle else 165.0
        hip_ang, knee_ang = self._smooth_angles(raw_hip, raw_knee)

        self.telemetry.log_angle_sample(hip_ang, now)
        if hip_ang < self.current_rep_min_angle:
            self.current_rep_min_angle = hip_ang

        # Check if squatting the hinge
        squatting_hinge = (hip_ang < 120.0) and (knee_ang < knee_min)
        if squatting_hinge:
            self.current_rep_had_fault = True
            self.current_rep_fault_name = "squatting_the_hinge"
            self.telemetry.record_posture_fault()

        is_hinge_depth = (hinge_flex_min <= hip_ang <= hinge_flex_max) and not squatting_hinge
        is_standing = (hip_ang >= stand_min) and not squatting_hinge

        # Anti-Ego Lift
        if raw_hip < 135.0 or hip_ang < 140.0:
            self.in_shallow_dip = True

        if self.in_shallow_dip and is_standing:
            if not self.rep_hit_awarded:
                self.telemetry.record_depth_failure()
                self.sloppy_dips.append(now)
                self.sloppy_dips = [t for t in self.sloppy_dips if now - t <= 3.0]
                if len(self.sloppy_dips) >= 2:
                    self.is_stunned = True
                    self.stun_until = now + 3.0
                    self.weapon_overheated = True
                    self.telemetry.record_ego_lift()
                    self.sloppy_dips.clear()
                    self.in_shallow_dip = False
                    return self._build_base_payload(
                        status="penalty",
                        phase="STUNNED",
                        primary_ang=hip_ang,
                        primary_name="Hip Hinge",
                        secondary_ang=knee_ang,
                        secondary_name="Knee Bend",
                        hold_dur=0.0,
                        target_hold=target_hold,
                        damage=0,
                        damage_taken=25,
                        has_fault=True,
                        fault_type="ego_lift",
                        overheated=True,
                        message="INCOMPLETE HINGE DETECTED - STUNNED! (-25 HP)",
                        audio_cue="Hinge deeper at your hips, slow down",
                        event="EGO_LIFT",
                        active_joint_idx=23,
                        fault_joint_indices=[11, 23, 25],
                    )
            self.in_shallow_dip = False

        status = "TRACKING"
        damage = 0
        message = f"HINGE AT HIPS (TARGET <= {int(hinge_flex_max)}°)"
        audio_cue = ""
        event = "FRAME"

        if is_hinge_depth:
            self.phase = "HOLDING"
            if self.hold_start_time is None:
                self.hold_start_time = now
            self.hold_duration = now - self.hold_start_time

            if self.hold_duration >= target_hold:
                status = "hit"
                damage = 100
                message = "CRITICAL HIT! STAND & SQUEEZE GLUTES"
                audio_cue = "Critical hit! Stand up and squeeze glutes"
                event = "HOLD_HIT"
                self.rep_hit_awarded = True
            else:
                status = "HOLDING"
                message = f"HOLD HINGE... ({self.hold_duration:.1f}s / {target_hold}s)"
        else:
            if now - (self.hold_start_time or 0) > 0.6:
                self.hold_start_time = None
                self.hold_duration = 0.0

            if is_standing:
                if self.rep_hit_awarded:
                    self.rep_count += 1
                    status = "CRITICAL HIT!"
                    damage = 100
                    event = "REP_COMPLETE"
                    message = f"RDL {self.rep_count} COMPLETE! (+100 DMG)"
                    audio_cue = f"RDL rep {self.rep_count} complete!"

                    self.telemetry.record_rep(
                        rep_idx=self.rep_count,
                        min_ang=self.current_rep_min_angle,
                        hold_dur=max(target_hold, self.hold_duration),
                        had_fault=self.current_rep_had_fault,
                        fault_name=self.current_rep_fault_name,
                        now=now,
                        exercise_name="rdl",
                        target_hold=target_hold,
                    )

                    self.rep_hit_awarded = False
                    self.current_rep_min_angle = 180.0
                    self.current_rep_had_fault = False
                    self.current_rep_fault_name = ""
                else:
                    status = "TRACKING"
                    message = "READY • HINGE AT HIPS"
                    damage = 0
                self.phase = "STANDING"
            else:
                self.phase = "ASCENDING" if self.rep_hit_awarded else "DESCENDING"
                if squatting_hinge:
                    message = "DON'T SQUAT THE HINGE - PUSH HIPS BACK"
                    audio_cue = "Don't squat the hinge, push hips back"
                elif self.rep_hit_awarded:
                    message = "RETURN TO STANDING"
                else:
                    message = f"HINGE TO {int(hinge_flex_max)}° ({int(hip_ang)}°)"

        fault_type = "squatting_the_hinge" if squatting_hinge else ""
        fault_joints = [23, 25, 27] if squatting_hinge else []

        return self._build_base_payload(
            status=status,
            phase=self.phase,
            primary_ang=hip_ang,
            primary_name="Hip Hinge",
            secondary_ang=knee_ang,
            secondary_name="Knee Bend",
            hold_dur=self.hold_duration,
            target_hold=target_hold,
            damage=damage,
            damage_taken=0,
            has_fault=squatting_hinge,
            fault_type=fault_type,
            overheated=False,
            message=message,
            audio_cue=audio_cue,
            event=event,
            active_joint_idx=23,
            fault_joint_indices=fault_joints,
        )


class GenericRehabEngine(BaseExerciseEngine):
    """Modular engine for single leg balance, scaption, calf raise, high knee march, torso rotation, lateral lunge."""

    def __init__(self, exercise_type: str, difficulty: str = "standard", telemetry: Optional[SessionTelemetryStore] = None, modifiers: Optional[List[str]] = None):
        super().__init__(exercise_type, difficulty, telemetry, modifiers=modifiers)

    def process(self, hip: Any, shoulder: Any, elbow: Any, knee: Any = None,
                wrist: Any = None, ankle: Any = None, now: Optional[float] = None, **kwargs) -> Dict[str, Any]:
        if now is None:
            now = time.time()

        target_hold = 1.5
        if self.difficulty == "rehab":
            target_hold = 1.0
        elif self.difficulty == "athlete":
            target_hold = 2.0
        if "HYPER_TENSION" in self.modifiers:
            target_hold = 3.0

        ex = self.exercise_type.lower()
        primary_ang = 180.0
        secondary_ang = 180.0
        primary_name = "Joint Angle"
        secondary_name = "Secondary"
        active_joint = 23
        is_depth = False
        fault_detected = False
        fault_type = ""
        fault_message = ""
        fault_joints: List[int] = []

        if ex in ("single_leg_balance", "single_leg", "balance"):
            primary_name = "Trunk Sway"
            secondary_name = "Pelvis Level"
            active_joint = 27
            target_hold = 3.0
            left_ankle = kwargs.get("left_ankle") or ankle
            right_ankle = kwargs.get("right_ankle")
            if left_ankle and right_ankle:
                dy = abs(float(left_ankle[1]) - float(right_ankle[1]))
                is_depth = dy >= 0.07
                primary_ang = round(dy * 1000, 1)
            else:
                is_depth = False
                primary_ang = 180.0

        elif ex == "scaption":
            primary_name = "Abduction"
            secondary_name = "Scapular Shrug"
            active_joint = 11
            target_hold = 1.0
            primary_ang = calculate_angle_3d(hip, shoulder, elbow)
            is_depth = 75.0 <= primary_ang <= 110.0

        elif ex == "calf_raise":
            primary_name = "Plantar Lift"
            secondary_name = "Symmetry"
            active_joint = 27
            target_hold = 2.0
            is_depth = True
            primary_ang = 100.0

        elif ex == "high_knee_march":
            primary_name = "Hip Flexion"
            secondary_name = "Torso Lean"
            active_joint = 25
            target_hold = 1.5
            primary_ang = calculate_angle_3d(shoulder, hip, knee)
            is_depth = primary_ang <= 100.0

        elif ex == "torso_rotation":
            primary_name = "Thoracic Twist"
            secondary_name = "Pelvis Drift"
            active_joint = 11
            target_hold = 1.5
            primary_ang = 35.0
            is_depth = True

        elif ex == "lateral_lunge":
            primary_name = "Lunge Depth"
            secondary_name = "Trail Knee"
            active_joint = 25
            target_hold = 1.5
            primary_ang = calculate_angle_3d(hip, knee, ankle)
            is_depth = primary_ang <= 110.0

        else:
            primary_ang = calculate_angle_3d(hip, knee, ankle)
            is_depth = primary_ang <= 95.0

        primary_ang, secondary_ang = self._smooth_angles(primary_ang, secondary_ang)

        status = "TRACKING"
        damage = 0
        message = f"EXECUTE {ex.replace('_', ' ').upper()}"
        audio_cue = ""
        event = "FRAME"

        if is_depth:
            self.phase = "HOLDING"
            if self.hold_start_time is None:
                self.hold_start_time = now
            self.hold_duration = now - self.hold_start_time

            if self.hold_duration >= target_hold:
                status = "hit"
                damage = 100
                message = f"CRITICAL HIT! {ex.upper()} DEFLECTION COMPLETE!"
                audio_cue = "Deflection complete, reset stance"
                event = "HOLD_HIT"
                self.rep_hit_awarded = True
            else:
                status = "HOLDING"
                message = f"HOLD POSITION... ({self.hold_duration:.1f}s / {target_hold}s)"
        else:
            if now - (self.hold_start_time or 0) > 0.6:
                self.hold_start_time = None
                self.hold_duration = 0.0
            if self.phase == "HOLDING" and self.rep_hit_awarded:
                self.rep_count += 1
                self.rep_hit_awarded = False
                event = "REP_COMPLETE"
                message = f"REP {self.rep_count} REGISTERED!"
                self.telemetry.record_rep(
                    exercise_type=ex,
                    depth_angle=primary_ang,
                    hold_time=target_hold,
                    purity=100.0,
                    had_fault=False,
                    fault_name="",
                )
            self.phase = "STARTING"

        return self._build_base_payload(
            status=status,
            phase=self.phase,
            primary_ang=primary_ang,
            primary_name=primary_name,
            secondary_ang=secondary_ang,
            secondary_name=secondary_name,
            hold_dur=self.hold_duration,
            target_hold=target_hold,
            damage=damage,
            damage_taken=0,
            has_fault=fault_detected,
            fault_type=fault_type,
            overheated=False,
            message=message,
            audio_cue=audio_cue,
            event=event,
            active_joint_idx=active_joint,
            fault_joint_indices=fault_joints,
        )


def create_exercise_engine(exercise_type: str, difficulty: str = "standard", telemetry: Optional[SessionTelemetryStore] = None, modifiers: Optional[List[str]] = None) -> BaseExerciseEngine:
    """Factory function for instantiating exercise processors."""
    ex = exercise_type.lower()
    mods = modifiers or []
    if ex in ("pushups", "pushup", "push_ups", "push_up", "wall_pushup"):
        return PushUpEngine(telemetry, difficulty, modifiers=mods)
    elif ex in ("overhead_press", "overhead", "ohp", "shoulder_press"):
        return OverheadPressEngine(telemetry, difficulty, modifiers=mods)
    elif ex in ("rdl", "romanian_deadlift", "hip_hinge"):
        return RDLEngine(telemetry, difficulty, modifiers=mods)
    elif ex in ("single_leg_balance", "single_leg", "balance", "scaption", "calf_raise", "high_knee_march", "torso_rotation", "lateral_lunge"):
        return GenericRehabEngine(ex, difficulty, telemetry, modifiers=mods)
    return SquatEngine(telemetry, difficulty, modifiers=mods)


# ---------------------------------------------------------------------------
# Phase 6 & 7: Arcade Combat Engine & Progressive Encounter Mutators
# ---------------------------------------------------------------------------

class BossCombatEngine:
    """Arcade Boss Combat Engine with progressive encounter mutators:
    - Standard Encounter: Boss HP 500, attacks every 10s (6s enraged)
    - ENDURANCE_GAUNTLET: Boss HP 1000, attacks every 5s (3.5s enraged)
    - HYPER_TENSION: Grants +50% bonus damage (150 base) per critical hit
    - CLINICAL_STRICT: Strict valgus / alignment tolerances
    """
    def __init__(self, modifiers: Optional[List[str]] = None):
        self.modifiers: List[str] = [m.upper() for m in (modifiers or [])]
        self.game_stage: str = "ACTIVE"
        self.reset()

    def set_modifiers(self, modifiers: List[str]):
        self.modifiers = [m.upper() for m in (modifiers or [])]
        if "ENDURANCE_GAUNTLET" in self.modifiers:
            self.boss_max_hp = 1000
            if self.boss_hp == 500:
                self.boss_hp = 1000
            self.attack_timer = min(self.attack_timer, 5.0)

    def reset(self):
        is_endurance = "ENDURANCE_GAUNTLET" in self.modifiers
        self.boss_max_hp = 1000 if is_endurance else 500
        self.boss_hp = self.boss_max_hp
        self.player_hp = 100
        self.player_max_hp = 100
        self.boss_state = "STANDARD"
        self.attack_timer = 5.0 if is_endurance else 10.0
        self.last_update_time: Optional[float] = None
        self.incoming_attack = False
        self.parry_window_left = 0.0
        self.combo_streak = 0
        self.damage_multiplier = 1.0
        self.streak_collapsed = False
        self.last_rep_awarded_idx = 0
        self.telegraph_announced = False

    def update(self, now: float, is_holding: bool, rep_count: int, had_fault: bool, is_critical: bool) -> Dict[str, Any]:
        if self.game_stage not in ["ACTIVE", "ACTIVE_DEFLECTION"]:
            self.last_update_time = None
            return {
                "boss_hp": self.boss_hp,
                "boss_max_hp": self.boss_max_hp,
                "player_hp": self.player_hp,
                "player_max_hp": self.player_max_hp,
                "boss_state": self.boss_state,
                "boss_attack_timer": round(self.attack_timer, 1),
                "incoming_attack": False,
                "parry_window_sec": 0.0,
                "parry_success": False,
                "parry_failed": False,
                "combo_streak": self.combo_streak,
                "combo_multiplier": self.damage_multiplier,
                "streak_collapsed": False,
                "combat_damage_dealt": 0,
                "combat_damage_taken": 0,
            }

        dt = 0.1
        if self.last_update_time is not None:
            dt = max(0.01, min(0.5, now - self.last_update_time))
        self.last_update_time = now

        # Update Boss Phase
        enrage_threshold = self.boss_max_hp * 0.5
        if self.boss_hp <= enrage_threshold:
            self.boss_state = "ENRAGED"
        else:
            self.boss_state = "STANDARD"

        is_endurance = "ENDURANCE_GAUNTLET" in self.modifiers
        if is_endurance:
            base_attack_interval = 3.5 if self.boss_state == "ENRAGED" else 5.0
        else:
            base_attack_interval = 6.0 if self.boss_state == "ENRAGED" else 10.0

        parry_success = False
        parry_failed = False
        self.streak_collapsed = False
        damage_dealt = 0
        damage_taken = 0

        # Form Fault Gate -> Collapse Streak immediately
        if had_fault:
            if self.combo_streak > 0:
                self.streak_collapsed = True
            self.combo_streak = 0
            self.damage_multiplier = 1.0

        # Rep Complete -> Calculate Kinetic Multiplier & Deduct Boss HP
        if rep_count > self.last_rep_awarded_idx:
            self.last_rep_awarded_idx = rep_count
            if not had_fault:
                self.combo_streak += 1
            else:
                self.combo_streak = 1

            if self.combo_streak >= 4:
                self.damage_multiplier = 3.0
            elif self.combo_streak == 3:
                self.damage_multiplier = 2.0
            elif self.combo_streak == 2:
                self.damage_multiplier = 1.5
            else:
                self.damage_multiplier = 1.0

            # Hyper-Tension grants +50% bonus damage (150 base)
            base_rep_damage = 150 if "HYPER_TENSION" in self.modifiers else 100
            damage_dealt = int(base_rep_damage * self.damage_multiplier)
            self.boss_hp = max(0, self.boss_hp - damage_dealt)
            # Reset attack cycle on player hit
            self.attack_timer = base_attack_interval
            self.incoming_attack = False
            self.parry_window_left = 0.0

        # Timed Evasion & Parry Handling
        if self.incoming_attack:
            self.parry_window_left -= dt
            if is_holding:
                # Parry Deflected!
                parry_success = True
                self.incoming_attack = False
                self.parry_window_left = 0.0
                counter_damage = 50
                self.boss_hp = max(0, self.boss_hp - counter_damage)
                damage_dealt += counter_damage
                self.attack_timer = base_attack_interval
            elif self.parry_window_left <= 0:
                # Parry Failed! Heavy hit to player
                parry_failed = True
                self.incoming_attack = False
                self.parry_window_left = 0.0
                attack_damage = 35
                self.player_hp = max(0, self.player_hp - attack_damage)
                damage_taken += attack_damage
                self.attack_timer = base_attack_interval
        else:
            # Countdown boss attack when player is idle (not holding)
            if not is_holding:
                self.attack_timer = max(0.0, self.attack_timer - dt)
                if self.attack_timer <= 0.0:
                    self.incoming_attack = True
                    self.parry_window_left = 3.0

        if self.boss_hp <= enrage_threshold:
            self.boss_state = "ENRAGED"

        return {
            "boss_hp": self.boss_hp,
            "boss_max_hp": self.boss_max_hp,
            "player_hp": self.player_hp,
            "player_max_hp": self.player_max_hp,
            "boss_state": self.boss_state,
            "boss_attack_timer": round(self.attack_timer, 1),
            "incoming_attack": self.incoming_attack,
            "parry_window_sec": round(max(0.0, self.parry_window_left), 1),
            "parry_success": parry_success,
            "parry_failed": parry_failed,
            "combo_streak": self.combo_streak,
            "combo_multiplier": self.damage_multiplier,
            "streak_collapsed": self.streak_collapsed,
            "combat_damage_dealt": damage_dealt,
            "combat_damage_taken": damage_taken,
            "modifiers": self.modifiers,
        }


# ---------------------------------------------------------------------------
# Phase 5 REST API Endpoints
# ---------------------------------------------------------------------------

@app.get("/")
def read_root():
    return {"status": "ok", "service": "AthleteMind Phase 5 Multi-Exercise Bio-Engine", "version": "5.0.0"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/api/session-summary")
def get_session_summary():
    """Returns aggregated statistics for clinician debrief."""
    return global_telemetry.get_summary()


@app.get("/api/export-report")
@app.post("/api/export-report")
def export_telemetry_csv():
    """Generates downloadable CSV medical export."""
    csv_content = global_telemetry.generate_csv()
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=athletemind_clinical_telemetry.csv"},
    )


@app.post("/api/session-reset")
def reset_session_telemetry():
    """Clears all in-memory telemetry for a fresh clinical workout session."""
    global_telemetry.reset()
    return {"status": "cleared", "total_reps": 0}


# ---------------------------------------------------------------------------
# Phase 7: Global Bounty Leaderboard Database & Service (SQLite)
# ---------------------------------------------------------------------------

DB_PATH = os.path.join(os.path.dirname(__file__), "leaderboard.db")


def init_leaderboard_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS leaderboard (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            operator_name TEXT NOT NULL,
            boss_clear_time_sec REAL NOT NULL,
            form_purity_score REAL NOT NULL,
            total_tension_time_sec REAL NOT NULL,
            bounty_score REAL NOT NULL,
            timestamp TEXT NOT NULL
        )
    """)
    cursor.execute("SELECT COUNT(*) FROM leaderboard")
    count = cursor.fetchone()[0]
    if count == 0:
        initial_benchmarks = [
            ("APEX_PILOT", 28.4, 98.5, 24.0, "2026-09-12 18:20:00"),
            ("TITAN_REHAB", 36.2, 94.0, 22.5, "2026-09-12 18:45:00"),
            ("VIBRO_STRIKER", 31.0, 91.5, 19.0, "2026-09-12 19:10:00"),
            ("CYBER_VALKYRIE", 42.5, 88.0, 20.0, "2026-09-12 19:25:00"),
            ("KINETIC_GHOST", 48.0, 82.0, 18.0, "2026-09-12 19:40:00"),
            ("BIO_HUNTER_07", 55.0, 76.0, 16.0, "2026-09-12 19:55:00"),
        ]
        for name, clear_time, purity, tension, ts in initial_benchmarks:
            b_score = round((purity * 100.0) + (tension * 10.0) - (clear_time * 2.0), 1)
            cursor.execute("""
                INSERT INTO leaderboard (operator_name, boss_clear_time_sec, form_purity_score, total_tension_time_sec, bounty_score, timestamp)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (name, clear_time, purity, tension, b_score, ts))
        conn.commit()
    conn.close()


init_leaderboard_db()


def calculate_bounty_score(purity: float, tension_sec: float, clear_time_sec: float) -> float:
    return round((purity * 100.0) + (tension_sec * 10.0) - (clear_time_sec * 2.0), 1)


def get_purity_grade(purity: float) -> str:
    if purity >= 90.0:
        return "S"
    elif purity >= 80.0:
        return "A"
    elif purity >= 70.0:
        return "B"
    return "C"


def submit_leaderboard_entry(operator_name: str, boss_clear_time_sec: float, form_purity_score: float, total_tension_time_sec: float) -> Dict[str, Any]:
    if form_purity_score < 70.0:
        return {
            "status": "disqualified",
            "message": "Disqualified: Form Purity Score below 70% threshold.",
            "form_purity_score": form_purity_score,
        }

    bounty_score = calculate_bounty_score(form_purity_score, total_tension_time_sec, boss_clear_time_sec)
    ts = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO leaderboard (operator_name, boss_clear_time_sec, form_purity_score, total_tension_time_sec, bounty_score, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (operator_name.strip() or "ANONYMOUS_OPERATOR", boss_clear_time_sec, form_purity_score, total_tension_time_sec, bounty_score, ts))
    entry_id = cursor.lastrowid
    conn.commit()

    cursor.execute("SELECT COUNT(*) FROM leaderboard WHERE bounty_score > ?", (bounty_score,))
    rank = cursor.fetchone()[0] + 1
    conn.close()

    return {
        "status": "accepted",
        "id": entry_id,
        "operator_name": operator_name.strip() or "ANONYMOUS_OPERATOR",
        "bounty_score": bounty_score,
        "purity_grade": get_purity_grade(form_purity_score),
        "rank": rank,
        "timestamp": ts,
    }


def get_top_leaderboard(limit: int = 10) -> List[Dict[str, Any]]:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, operator_name, boss_clear_time_sec, form_purity_score, total_tension_time_sec, bounty_score, timestamp
        FROM leaderboard
        ORDER BY bounty_score DESC
        LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()

    results = []
    for idx, r in enumerate(rows, start=1):
        results.append({
            "rank": idx,
            "id": r[0],
            "operator_name": r[1],
            "boss_clear_time_sec": r[2],
            "form_purity_score": r[3],
            "total_tension_time_sec": r[4],
            "bounty_score": r[5],
            "purity_grade": get_purity_grade(r[3]),
            "timestamp": r[6],
        })
    return results


class LeaderboardSubmission(BaseModel):
    operator_name: str
    boss_clear_time_sec: float
    form_purity_score: float
    total_tension_time_sec: float


@app.post("/api/leaderboard/submit")
def submit_score(sub: LeaderboardSubmission):
    result = submit_leaderboard_entry(
        operator_name=sub.operator_name,
        boss_clear_time_sec=sub.boss_clear_time_sec,
        form_purity_score=sub.form_purity_score,
        total_tension_time_sec=sub.total_tension_time_sec,
    )
    if result.get("status") == "disqualified":
        return Response(
            content=json.dumps(result),
            media_type="application/json",
            status_code=400,
        )
    return result


@app.get("/api/leaderboard")
def get_leaderboard():
    return {"leaderboard": get_top_leaderboard(10)}


# ---------------------------------------------------------------------------
# WebSocket Endpoint: Stream Landmarks & Broadcast Live Status
# ---------------------------------------------------------------------------

@app.websocket("/ws/pose")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    current_exercise = "squats"
    current_difficulty = "standard"
    current_modifiers: List[str] = []
    engine: BaseExerciseEngine = SquatEngine(global_telemetry, difficulty=current_difficulty, modifiers=current_modifiers)
    combat_engine = BossCombatEngine(modifiers=current_modifiers)

    try:
        while True:
            data = await websocket.receive_json()

            # Handle reset action
            if data.get("action") == "reset":
                mods = data.get("modifiers")
                if mods is not None:
                    current_modifiers = [m.upper() for m in mods]
                    engine.set_modifiers(current_modifiers)
                    combat_engine.set_modifiers(current_modifiers)
                engine.reset()
                global_telemetry.reset()
                combat_engine.reset()
                await websocket.send_json({
                    "event": "SESSION_RESET",
                    "status": "RESET_COMPLETE",
                    "rep_count": 0,
                    "knee_angle": 180.0,
                    "hip_angle": 180.0,
                    "primary_angle": 180.0,
                    "secondary_angle": 180.0,
                    "message": "READY • COMMENCE EXERCISE",
                    "damage": 0,
                    "damage_taken": 0,
                    "purity": 100.0,
                    "audio_cue": "Session reset",
                    "boss_hp": combat_engine.boss_hp,
                    "boss_max_hp": combat_engine.boss_max_hp,
                    "player_hp": 100,
                    "player_max_hp": 100,
                    "boss_state": combat_engine.boss_state,
                    "boss_attack_timer": combat_engine.attack_timer,
                    "incoming_attack": False,
                    "parry_window_sec": 0.0,
                    "combo_streak": 0,
                    "combo_multiplier": 1.0,
                    "modifiers": current_modifiers,
                })
                continue

            # Handle switching exercise, difficulty mode, or encounter protocol modifiers
            if data.get("action") == "set_exercise":
                new_ex = data.get("exercise_type", current_exercise)
                new_diff = data.get("difficulty", current_difficulty)
                new_mods = data.get("modifiers")
                if new_mods is not None:
                    current_modifiers = [m.upper() for m in new_mods]
                current_exercise = new_ex
                current_difficulty = new_diff
                global_telemetry.active_exercise = current_exercise
                engine = create_exercise_engine(current_exercise, current_difficulty, global_telemetry, modifiers=current_modifiers)
                combat_engine.set_modifiers(current_modifiers)
                await websocket.send_json({
                    "event": "EXERCISE_CHANGED",
                    "exercise_type": current_exercise,
                    "difficulty": current_difficulty,
                    "modifiers": current_modifiers,
                    "status": "TRACKING",
                    "message": f"SWITCHED TO {current_exercise.upper()} ({current_difficulty.upper()})",
                    "audio_cue": f"Ready for {current_exercise}",
                    "boss_hp": combat_engine.boss_hp,
                    "boss_max_hp": combat_engine.boss_max_hp,
                    "player_hp": combat_engine.player_hp,
                    "boss_state": combat_engine.boss_state,
                    "combo_streak": combat_engine.combo_streak,
                    "combo_multiplier": combat_engine.damage_multiplier,
                })
            # Handle session stage transitions (CALIBRATING, ACTIVE, PAUSED, COMPLETED, IDLE)
            if data.get("action") == "set_stage":
                new_stage = str(data.get("stage", "ACTIVE")).upper()
                combat_engine.game_stage = new_stage
                combat_engine.last_update_time = None
                await websocket.send_json({
                    "event": "STAGE_CHANGED",
                    "stage": new_stage,
                    "status": "STAGE_SYNCED",
                    "boss_hp": combat_engine.boss_hp,
                    "player_hp": combat_engine.player_hp,
                })
                continue

            # Handle kinetic deflection reports
            if data.get("action") == "report_deflect":
                success = bool(data.get("success", False))
                if success:
                    combat_engine.combo_streak += 1
                    if combat_engine.combo_streak >= 4:
                        combat_engine.damage_multiplier = 3.0
                    elif combat_engine.combo_streak == 3:
                        combat_engine.damage_multiplier = 2.0
                    elif combat_engine.combo_streak == 2:
                        combat_engine.damage_multiplier = 1.5
                    else:
                        combat_engine.damage_multiplier = 1.0
                    combat_engine.boss_hp = max(0, combat_engine.boss_hp - 50)
                else:
                    if "REST_DAY" not in current_modifiers:
                        combat_engine.combo_streak = 0
                        combat_engine.damage_multiplier = 1.0
                        damage = int(data.get("damage", 20))
                        combat_engine.player_hp = max(0, combat_engine.player_hp - damage)
                await websocket.send_json({
                    "event": "DEFLECTION_PROCESSED",
                    "success": success,
                    "boss_hp": combat_engine.boss_hp,
                    "player_hp": combat_engine.player_hp,
                    "combo_streak": combat_engine.combo_streak,
                    "combo_multiplier": combat_engine.damage_multiplier,
                })
                continue

            # Check if dynamic exercise/difficulty/modifiers sent inline with coordinates
            inline_ex = data.get("exercise_type")
            inline_diff = data.get("difficulty")
            inline_mods = data.get("modifiers")
            if inline_mods is not None and set(inline_mods) != set(current_modifiers):
                current_modifiers = [m.upper() for m in inline_mods]
                engine.set_modifiers(current_modifiers)
                combat_engine.set_modifiers(current_modifiers)
            if inline_ex and inline_ex != current_exercise:
                current_exercise = inline_ex
                global_telemetry.active_exercise = current_exercise
                engine = create_exercise_engine(current_exercise, current_difficulty, global_telemetry, modifiers=current_modifiers)
            if inline_diff and inline_diff != current_difficulty:
                current_difficulty = inline_diff
                engine.set_difficulty(current_difficulty)

            left = data.get("left", {})
            right = data.get("right", {})

            l_sh = left.get("shoulder") or data.get("shoulder")
            r_sh = right.get("shoulder")
            l_el = left.get("elbow") or data.get("elbow")
            r_el = right.get("elbow")
            l_wr = left.get("wrist") or data.get("wrist")
            r_wr = right.get("wrist")
            l_hip = left.get("hip") or data.get("hip")
            r_hip = right.get("hip")
            l_kn = left.get("knee") or data.get("knee")
            r_kn = right.get("knee")
            l_ak = left.get("ankle") or data.get("ankle")
            r_ak = right.get("ankle")

            # Determine side with highest visibility
            def get_vis(pt):
                return float(pt[3]) if (pt and len(pt) >= 4) else 1.0

            l_vis = (get_vis(l_sh) + get_vis(l_hip) + get_vis(l_kn)) / 3.0
            r_vis = (get_vis(r_sh) + get_vis(r_hip) + get_vis(r_kn)) / 3.0

            if r_vis > l_vis + 0.15 and (r_sh and r_hip and r_kn):
                active_shoulder = r_sh
                active_elbow = r_el or l_el
                active_wrist = r_wr or l_wr
                active_hip = r_hip
                active_knee = r_kn
                active_ankle = r_ak or l_ak
            else:
                active_shoulder = l_sh or r_sh
                active_elbow = l_el or r_el
                active_wrist = l_wr or r_wr
                active_hip = l_hip or r_hip
                active_knee = l_kn or r_kn
                active_ankle = l_ak or r_ak

            now = time.time()
            payload: Dict[str, Any] = {}

            # Route to the appropriate exercise kinematic state machine
            if current_exercise == "pushups":
                if active_shoulder and active_elbow and active_wrist:
                    payload = engine.process(
                        shoulder=active_shoulder,
                        elbow=active_elbow,
                        wrist=active_wrist,
                        hip=active_hip,
                        ankle=active_ankle,
                        now=now,
                    )
                else:
                    payload = {
                        "event": "FRAME",
                        "status": "TRACKING",
                        "phase": "CALIBRATING",
                        "exercise_type": current_exercise,
                        "view_orientation": "side",
                        "active_profile": "SIDE",
                        "metric_value": 180.0,
                        "primary_angle": 180.0,
                        "primary_angle_name": "Elbow",
                        "secondary_angle": 180.0,
                        "secondary_angle_name": "Plank Core",
                        "knee_angle": 180.0,
                        "hip_angle": 180.0,
                        "rep_count": engine.rep_count,
                        "message": "POSITION UPPER BODY IN VIEW (SHOULDER/ELBOW/WRIST)",
                        "damage": 0,
                        "damage_taken": 0,
                        "purity": 100.0,
                        "active_joint_index": 13,
                        "fault_joint_indices": [],
                    }
            elif current_exercise == "overhead_press":
                if active_hip and active_shoulder and active_elbow:
                    payload = engine.process(
                        hip=active_hip,
                        shoulder=active_shoulder,
                        elbow=active_elbow,
                        knee=active_knee,
                        wrist=active_wrist,
                        now=now,
                    )
                else:
                    payload = {
                        "event": "FRAME",
                        "status": "TRACKING",
                        "phase": "CALIBRATING",
                        "exercise_type": current_exercise,
                        "view_orientation": "front",
                        "active_profile": "FRONT",
                        "metric_value": 80.0,
                        "primary_angle": 80.0,
                        "primary_angle_name": "Shoulder",
                        "secondary_angle": 180.0,
                        "secondary_angle_name": "Lumbar Spine",
                        "knee_angle": 180.0,
                        "hip_angle": 80.0,
                        "rep_count": engine.rep_count,
                        "message": "STAND WITH TORSO & ARMS IN CAMERA VIEW",
                        "damage": 0,
                        "damage_taken": 0,
                        "purity": 100.0,
                        "active_joint_index": 11,
                        "fault_joint_indices": [],
                    }
            elif current_exercise == "rdl":
                if active_shoulder and active_hip and active_knee:
                    payload = engine.process(
                        shoulder=active_shoulder,
                        hip=active_hip,
                        knee=active_knee,
                        ankle=active_ankle,
                        now=now,
                    )
                else:
                    payload = {
                        "event": "FRAME",
                        "status": "TRACKING",
                        "phase": "CALIBRATING",
                        "exercise_type": current_exercise,
                        "view_orientation": "side",
                        "active_profile": "SIDE",
                        "metric_value": 180.0,
                        "primary_angle": 180.0,
                        "primary_angle_name": "Hip Hinge",
                        "secondary_angle": 165.0,
                        "secondary_angle_name": "Knee Bend",
                        "knee_angle": 165.0,
                        "hip_angle": 180.0,
                        "rep_count": engine.rep_count,
                        "message": "POSITION SIDE PROFILE IN VIEW (SHOULDER/HIP/KNEE)",
                        "damage": 0,
                        "damage_taken": 0,
                        "purity": 100.0,
                        "active_joint_index": 23,
                        "fault_joint_indices": [],
                    }
            else:  # squats default
                if active_hip and active_knee and active_ankle:
                    payload = engine.process(
                        hip=active_hip,
                        knee=active_knee,
                        ankle=active_ankle,
                        shoulder=active_shoulder,
                        now=now,
                        right_hip=r_hip,
                        left_knee=l_kn,
                        right_knee=r_kn,
                        left_ankle=l_ak,
                        right_ankle=r_ak,
                        left_shoulder=l_sh,
                        right_shoulder=r_sh,
                    )
                else:
                    payload = {
                        "event": "FRAME",
                        "status": "TRACKING",
                        "phase": "CALIBRATING",
                        "exercise_type": "squats",
                        "view_orientation": "front",
                        "active_profile": "FRONT",
                        "metric_value": 0.0,
                        "primary_angle": 180.0,
                        "primary_angle_name": "Knee",
                        "secondary_angle": 180.0,
                        "secondary_angle_name": "Hip",
                        "knee_angle": 180.0,
                        "hip_angle": 180.0,
                        "rep_count": engine.rep_count,
                        "message": "POSITION FULL BODY IN CAMERA VIEW",
                        "damage": 0,
                        "damage_taken": 0,
                        "purity": 100.0,
                        "active_joint_index": 25,
                        "fault_joint_indices": [],
                    }

            # Guarantee active_profile & metric_value
            if "active_profile" not in payload:
                payload["active_profile"] = "SIDE" if payload.get("view_orientation") == "side" else "FRONT"
            if "metric_value" not in payload:
                payload["metric_value"] = payload.get("primary_angle", 0.0)

            # Run Authoritative Combat Engine Update
            is_holding = bool(payload.get("phase") == "HOLDING" or payload.get("hold_progress", 0) > 0.3)
            had_fault = bool(payload.get("has_fault", False) or payload.get("event") == "EGO_LIFT" or payload.get("status") == "penalty")
            rep_count = payload.get("rep_count", 0)
            is_crit = bool(payload.get("is_critical", False))

            combat_data = combat_engine.update(
                now=now,
                is_holding=is_holding,
                rep_count=rep_count,
                had_fault=had_fault,
                is_critical=is_crit,
            )
            payload.update(combat_data)

            # Reflect dynamic combo damage into payload
            if combat_data.get("combat_damage_dealt", 0) > 0:
                payload["damage"] = combat_data["combat_damage_dealt"]
            if combat_data.get("combat_damage_taken", 0) > 0:
                payload["damage_taken"] = combat_data["combat_damage_taken"]

            # Set dynamic status and audio messages
            if combat_data.get("parry_success"):
                payload["status"] = "hit"
                payload["message"] = "PARRY SUCCESSFUL! (+50 COUNTER DMG)"
                payload["audio_cue"] = "Parry successful!"
            elif combat_data.get("incoming_attack"):
                sec_left = combat_data.get("parry_window_sec", 3.0)
                payload["message"] = f"INCOMING ATTACK - PARRY BY HOLDING DEPTH ({sec_left:.1f}s)"
                if not getattr(combat_engine, "telegraph_announced", False):
                    payload["audio_cue"] = "Incoming attack! Hold depth to parry!"
                    combat_engine.telegraph_announced = True
            else:
                combat_engine.telegraph_announced = False

            if combat_data.get("streak_collapsed"):
                payload["message"] = "FORM FAULT - STREAK COLLAPSED!"
                payload["audio_cue"] = "Streak lost"

            payload["modifiers"] = current_modifiers
            payload["total_tension_time_sec"] = round(global_telemetry.total_tension_time, 2)

            await websocket.send_json(payload)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[ERROR] WebSocket: {e}")