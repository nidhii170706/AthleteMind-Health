import time
import numpy as np
from main import (
    calculate_angle_3d,
    detect_orientation,
    check_frontal_valgus,
    check_knee_valgus,
    SquatEngine,
    PushUpEngine,
    OverheadPressEngine,
    RDLEngine,
    BossCombatEngine,
    global_telemetry,
)

def test_phase5_multi_exercise_3d_engine():
    print("--- 1. Testing True 3D Angle & Orientation Calculations ---")
    angle_straight = calculate_angle_3d([0.5, 0.2, 0.0], [0.5, 0.5, 0.0], [0.5, 0.8, 0.0])
    assert abs(angle_straight - 180.0) < 1.0

    angle_90 = calculate_angle_3d([0.5, 0.2, 0.0], [0.5, 0.5, 0.0], [0.5, 0.5, 0.3])
    assert abs(angle_90 - 90.0) < 1.0

    orient_front = detect_orientation([0.4, 0.2, 0.0], [0.6, 0.2, 0.0], [0.45, 0.5, 0.0], [0.55, 0.5, 0.0])
    assert orient_front == "front"

    orient_side = detect_orientation([0.5, 0.2, 0.0], [0.55, 0.2, 0.1], [0.5, 0.5, 0.0], [0.52, 0.5, 0.1])
    assert orient_side == "side"

    print("--- 2. Testing Frontal Valgus & Frontal Squat Depth ---")
    valgus_normal = check_frontal_valgus([0.4, 0.65], [0.6, 0.65], [0.38, 0.9], [0.62, 0.9])
    assert not valgus_normal

    valgus_caved = check_frontal_valgus([0.48, 0.65], [0.52, 0.65], [0.35, 0.9], [0.65, 0.9])
    assert valgus_caved

    engine = SquatEngine(global_telemetry, difficulty="standard")
    res_front = engine.process(
        hip=[0.45, 0.68, 0.0],
        knee=[0.42, 0.70, 0.1],
        ankle=[0.42, 0.90, 0.0],
        shoulder=[0.45, 0.30, 0.0],
        right_hip=[0.55, 0.68, 0.0],
        left_shoulder=[0.40, 0.30, 0.0],
        right_shoulder=[0.60, 0.30, 0.0],
        left_knee=[0.42, 0.70, 0.1],
        right_knee=[0.58, 0.70, 0.1],
        left_ankle=[0.40, 0.90, 0.0],
        right_ankle=[0.60, 0.90, 0.0],
        now=100.0,
    )
    assert res_front["view_orientation"] == "front"
    assert res_front["phase"] == "HOLDING"

    print("--- 3. Testing Push-Up State Machine & Lumbar Sag Fault ---")
    push_engine = PushUpEngine(global_telemetry, difficulty="standard")
    sim_t = 200.0

    res_pu_lock = push_engine.process(
        shoulder=[0.2, 0.5, 0.0],
        elbow=[0.2, 0.65, 0.0],
        wrist=[0.2, 0.8, 0.0],
        hip=[0.5, 0.5, 0.0],
        ankle=[0.8, 0.5, 0.0],
        now=sim_t,
    )
    assert res_pu_lock["phase"] in ("STARTING", "LOCKOUT")

    for _ in range(8):
        sim_t += 0.1
        res_pu_bot = push_engine.process(
            shoulder=[0.2, 0.65, 0.0],
            elbow=[0.35, 0.65, 0.0],
            wrist=[0.35, 0.8, 0.0],
            hip=[0.5, 0.65, 0.0],
            ankle=[0.8, 0.65, 0.0],
            now=sim_t,
        )
    assert res_pu_bot["phase"] == "HOLDING"

    for _ in range(4):
        sim_t += 0.1
        res_pu_sag = push_engine.process(
            shoulder=[0.2, 0.65, 0.0],
            elbow=[0.35, 0.65, 0.0],
            wrist=[0.35, 0.8, 0.0],
            hip=[0.5, 0.85, 0.0],
            ankle=[0.8, 0.65, 0.0],
            now=sim_t,
        )
    assert res_pu_sag["has_fault"]
    assert res_pu_sag["fault_type"] == "lumbar_sag"

    print("--- 4. Testing Overhead Press & Lumbar Arch Fault ---")
    ohp_engine = OverheadPressEngine(global_telemetry, difficulty="rehab")
    sim_t = 300.0
    for _ in range(5):
        sim_t += 0.1
        res_ohp_lock = ohp_engine.process(
            hip=[0.5, 0.6, 0.0],
            shoulder=[0.5, 0.35, 0.0],
            elbow=[0.5, 0.15, 0.0],
            knee=[0.5, 0.8, 0.0],
            now=sim_t,
        )
    assert res_ohp_lock["phase"] == "HOLDING"

    for _ in range(4):
        sim_t += 0.1
        res_ohp_arch = ohp_engine.process(
            hip=[0.4, 0.6, 0.0],
            shoulder=[0.5, 0.35, 0.0],
            elbow=[0.5, 0.15, 0.0],
            knee=[0.5, 0.8, 0.0],
            now=sim_t,
        )
    assert res_ohp_arch["has_fault"]
    assert res_ohp_arch["fault_type"] == "lumbar_arch"

    print("--- 5. Testing Romanian Deadlift (RDL) & Squatting the Hinge ---")
    rdl_engine = RDLEngine(global_telemetry, difficulty="standard")
    sim_t = 400.0
    for _ in range(5):
        sim_t += 0.1
        res_rdl_hinge = rdl_engine.process(
            shoulder=[0.75, 0.55, 0.0],
            hip=[0.5, 0.55, 0.0],
            knee=[0.5, 0.75, 0.0],
            ankle=[0.5, 0.95, 0.0],
            now=sim_t,
        )
    assert res_rdl_hinge["phase"] == "HOLDING"

    for _ in range(4):
        sim_t += 0.1
        res_rdl_squatted = rdl_engine.process(
            shoulder=[0.75, 0.55, 0.0],
            hip=[0.5, 0.55, 0.0],
            knee=[0.65, 0.65, 0.0],
            ankle=[0.5, 0.95, 0.0],
            now=sim_t,
        )
    assert res_rdl_squatted["has_fault"]
    assert res_rdl_squatted["fault_type"] == "squatting_the_hinge"

    print("--- 6. Testing Telemetry & Multi-Exercise CSV ---")
    global_telemetry.reset()
    global_telemetry.record_rep(1, 88.0, 1.6, False, "", time.time(), "squats")
    global_telemetry.record_rep(2, 85.0, 1.5, False, "", time.time(), "pushups")
    summary = global_telemetry.get_summary()
    assert summary["total_reps"] == 2
    assert summary["purity_score"] == 100.0

    csv_out = global_telemetry.generate_csv()
    assert "Rep_Index,Exercise,Min_Angle_Deg" in csv_out
    assert "pushups" in csv_out
    print("CSV Multi-Exercise Content Verified!")


def test_phase6_boss_combat_and_parrying():
    print("\n--- 7. Testing Phase 6 Boss Combat & Kinetic Multipliers ---")
    combat = BossCombatEngine()
    sim_time = 1000.0

    # Test Initial Standard State
    status = combat.update(sim_time, is_holding=False, rep_count=0, had_fault=False, is_critical=False)
    assert status["boss_hp"] == 500
    assert status["boss_state"] == "STANDARD"
    assert status["combo_multiplier"] == 1.0

    # Test Kinetic Combo Multiplier: 1 rep -> 1.0x (100 dmg)
    sim_time += 1.0
    status_r1 = combat.update(sim_time, is_holding=False, rep_count=1, had_fault=False, is_critical=True)
    assert status_r1["combo_streak"] == 1
    assert status_r1["combo_multiplier"] == 1.0
    assert status_r1["combat_damage_dealt"] == 100
    assert status_r1["boss_hp"] == 400

    # Rep 2 -> 1.5x (150 dmg)
    sim_time += 1.0
    status_r2 = combat.update(sim_time, is_holding=False, rep_count=2, had_fault=False, is_critical=True)
    assert status_r2["combo_streak"] == 2
    assert status_r2["combo_multiplier"] == 1.5
    assert status_r2["combat_damage_dealt"] == 150
    assert status_r2["boss_hp"] == 250
    # At 250 HP (<= 50%), state transitions to ENRAGED
    assert status_r2["boss_state"] == "ENRAGED"

    # Rep 3 -> 2.0x (200 dmg)
    sim_time += 1.0
    status_r3 = combat.update(sim_time, is_holding=False, rep_count=3, had_fault=False, is_critical=True)
    assert status_r3["combo_streak"] == 3
    assert status_r3["combo_multiplier"] == 2.0
    assert status_r3["combat_damage_dealt"] == 200
    assert status_r3["boss_hp"] == 50

    # Rep 4+ -> 3.0x (300 dmg, "HYPER OVERDRIVE")
    sim_time += 1.0
    status_r4 = combat.update(sim_time, is_holding=False, rep_count=4, had_fault=False, is_critical=True)
    assert status_r4["combo_streak"] == 4
    assert status_r4["combo_multiplier"] == 3.0
    assert status_r4["combat_damage_dealt"] == 300

    # Test Form Fault Streak Collapse Gate
    sim_time += 1.0
    status_fault = combat.update(sim_time, is_holding=False, rep_count=4, had_fault=True, is_critical=False)
    assert status_fault["streak_collapsed"]
    assert status_fault["combo_streak"] == 0
    assert status_fault["combo_multiplier"] == 1.0
    print("Kinetic Multiplier & Streak Collapse Verified!")

    print("\n--- 8. Testing Timed Evasion & Biomechanical Parrying ---")
    combat.reset()
    sim_time = 2000.0
    # Let attack timer count down (10s)
    for _ in range(101):
        sim_time += 0.1
        res = combat.update(sim_time, is_holding=False, rep_count=0, had_fault=False, is_critical=False)

    assert res["incoming_attack"]
    assert res["parry_window_sec"] > 0

    # Player holds depth during telegraph window -> Deflected!
    sim_time += 0.2
    res_parry = combat.update(sim_time, is_holding=True, rep_count=0, had_fault=False, is_critical=False)
    assert res_parry["parry_success"]
    assert res_parry["combat_damage_dealt"] == 50
    assert res_parry["boss_hp"] == 450
    assert not res_parry["incoming_attack"]
    print("Parry Deflection with 50 Counter-Damage Verified!")

    # Test Parry Failure: Let window expire without holding
    combat.reset()
    sim_time = 3000.0
    for _ in range(101):
        sim_time += 0.1
        res = combat.update(sim_time, is_holding=False, rep_count=0, had_fault=False, is_critical=False)
    assert res["incoming_attack"]

    # 3 seconds elapse without holding -> parry_failed pulse event
    failed_observed = False
    for _ in range(35):
        sim_time += 0.1
        res_fail = combat.update(sim_time, is_holding=False, rep_count=0, had_fault=False, is_critical=False)
        if res_fail["parry_failed"]:
            failed_observed = True

    assert failed_observed
    assert combat.player_hp == 65
    print("Parry Failure with 35 Direct Player Damage Verified!")

    print("\n[OK] ALL PHASE 6 ARCADE COMBAT TESTS PASSED!")


def test_phase7_mutators_and_leaderboard():
    print("\n--- 9. Testing Phase 7 Progressive Encounter Mutators ---")
    # 1. Hyper-Tension Protocol (3.0s hold requirement & 150 base damage)
    squat_ht = SquatEngine(difficulty="standard", modifiers=["HYPER_TENSION"])
    sim_t = 100.0
    # Squat at bottom depth: 90 deg knee angle, 90 deg hip angle
    hip = [0.2, 0.65, 0.0]
    knee = [0.5, 0.65, 0.0]
    ankle = [0.5, 0.95, 0.0]
    shoulder = [0.2, 0.35, 0.0]

    # Holding at depth for 2.0s should NOT trigger hit under Hyper-Tension
    p1 = squat_ht.process(hip=hip, knee=knee, ankle=ankle, shoulder=shoulder, now=sim_t)
    assert p1["phase"] == "HOLDING"
    sim_t += 2.0
    p2 = squat_ht.process(hip=hip, knee=knee, ankle=ankle, shoulder=shoulder, now=sim_t)
    assert p2["status"] == "HOLDING"

    # Holding until 3.0s triggers hit
    sim_t += 1.0
    p3 = squat_ht.process(hip=hip, knee=knee, ankle=ankle, shoulder=shoulder, now=sim_t)
    assert p3["status"] == "hit"
    assert p3["event"] == "HOLD_HIT"
    print("Hyper-Tension 3.0s Hold Enforcement Verified!")

    # Combat Engine with Hyper-Tension deals 150 base damage
    combat_ht = BossCombatEngine(modifiers=["HYPER_TENSION"])
    st = combat_ht.update(100.0, is_holding=False, rep_count=1, had_fault=False, is_critical=True)
    assert st["combat_damage_dealt"] == 150
    assert st["boss_hp"] == 350
    print("Hyper-Tension +50% Bonus Damage (150 DMG) Verified!")

    # 2. Clinical Strictness Protocol (+-10% valgus tolerance)
    # Ratio = 0.82: fails strict (0.90 threshold) but passes standard (0.75 threshold)
    l_knee = [0.41, 0.7, 0.0]
    r_knee = [0.59, 0.7, 0.0]  # knee_sep = 0.18
    l_ankle = [0.39, 0.95, 0.0]
    r_ankle = [0.61, 0.95, 0.0]  # ankle_sep = 0.22 -> 0.18 / 0.22 = 0.818
    assert not check_frontal_valgus(l_knee, r_knee, l_ankle, r_ankle, strict=False)
    assert check_frontal_valgus(l_knee, r_knee, l_ankle, r_ankle, strict=True)
    print("Clinical Strictness Valgus Gate Verified!")

    # 3. Endurance Gauntlet (1,000 HP, 5s attack cycle)
    combat_eg = BossCombatEngine(modifiers=["ENDURANCE_GAUNTLET"])
    assert combat_eg.boss_max_hp == 1000
    assert combat_eg.boss_hp == 1000
    assert combat_eg.attack_timer == 5.0
    print("Endurance Gauntlet 1000 HP & 5.0s Cycle Verified!")

    print("\n--- 10. Testing Phase 7 Global Bounty Leaderboard Engine ---")
    from main import calculate_bounty_score, submit_leaderboard_entry, get_top_leaderboard

    # Test Bounty Score Formula: (Purity * 100) + (Tension * 10) - (ClearTime * 2)
    score = calculate_bounty_score(purity=98.5, tension_sec=24.0, clear_time_sec=28.4)
    expected = round((98.5 * 100.0) + (24.0 * 10.0) - (28.4 * 2.0), 1)
    assert score == expected == 10033.2

    # Anti-cheat disqualification: purity < 70%
    disq = submit_leaderboard_entry(
        operator_name="CHEATER_BOT",
        boss_clear_time_sec=12.0,
        form_purity_score=62.0,
        total_tension_time_sec=5.0,
    )
    assert disq["status"] == "disqualified"
    print("Leaderboard Anti-Cheat Disqualification (<70% Purity) Verified!")

    # Valid score submission
    sub = submit_leaderboard_entry(
        operator_name="PILOT_TEST",
        boss_clear_time_sec=32.0,
        form_purity_score=96.0,
        total_tension_time_sec=22.0,
    )
    assert sub["status"] == "accepted"
    assert sub["rank"] >= 1
    assert sub["purity_grade"] == "S"

    # Query top 10
    top = get_top_leaderboard(10)
    assert len(top) >= 1
    assert len(top) <= 10
    # Verify sorted in descending order of bounty_score
    scores = [r["bounty_score"] for r in top]
    assert scores == sorted(scores, reverse=True)
    print("Global Bounty Leaderboard Top 10 Ranked Query Verified!")

    print("\n[OK] ALL PHASE 7 PROGRESSIVE MUTATOR & LEADERBOARD TESTS PASSED!")


def test_dual_profile_adaptive_kinematics():
    print("\n--- 11. Testing Dual Profile Adaptive Kinematics & Hysteresis ---")
    from main import OrientationTracker, calculate_angle_2d

    # 1. Test 2D Angle via arctan2
    # 90-degree right angle (vertex at [0.5, 0.5])
    a_90 = calculate_angle_2d([0.2, 0.5], [0.5, 0.5], [0.5, 0.8])
    assert abs(a_90 - 90.0) < 0.5
    # Straight angle
    a_180 = calculate_angle_2d([0.5, 0.2], [0.5, 0.5], [0.5, 0.8])
    assert abs(a_180 - 180.0) < 0.5

    # 2. Test Orientation Hysteresis Buffer (5 consecutive frames required to switch)
    tracker = OrientationTracker(initial_profile="FRONT")
    assert tracker.active_profile == "FRONT"

    # Front coordinates: shoulder width = 0.2, hip width = 0.14 -> W = 0.17 >= 0.12
    sh_l_front, sh_r_front = [0.4, 0.2], [0.6, 0.2]
    hip_l_front, hip_r_front = [0.43, 0.5], [0.57, 0.5]

    # Side coordinates: shoulder width = 0.04, hip width = 0.03 -> W = 0.035 < 0.12
    sh_l_side, sh_r_side = [0.5, 0.2], [0.54, 0.2]
    hip_l_side, hip_r_side = [0.5, 0.5], [0.53, 0.5]

    tracker.update(sh_l_front, sh_r_front, hip_l_front, hip_r_front)
    assert tracker.active_profile == "FRONT"

    # Feed 3 side frames: hysteresis buffer should hold FRONT
    for _ in range(3):
        res = tracker.update(sh_l_side, sh_r_side, hip_l_side, hip_r_side)
        assert res == "FRONT"

    # 4th side frame: still FRONT
    assert tracker.update(sh_l_side, sh_r_side, hip_l_side, hip_r_side) == "FRONT"

    # 5th consecutive side frame: switches to SIDE!
    assert tracker.update(sh_l_side, sh_r_side, hip_l_side, hip_r_side) == "SIDE"
    print("5-Frame Orientation Hysteresis Smoothing Verified!")

    # 3. Test Relaxed Side Profile Mode (Squat depth <= 100 deg, 1.0s hold)
    engine = SquatEngine(global_telemetry, difficulty="standard")
    # Feed 5 side frames to initialize into SIDE mode
    sim_t = 500.0
    for _ in range(5):
        sim_t += 0.1
        # Standing posture (knee ~180 deg)
        res_side = engine.process(
            hip=[0.5, 0.5, 0.0],
            knee=[0.5, 0.7, 0.0],
            ankle=[0.5, 0.9, 0.0],
            shoulder=[0.5, 0.2, 0.0],
            left_shoulder=sh_l_side,
            right_shoulder=sh_r_side,
            right_hip=hip_r_side,
            now=sim_t,
        )
    assert res_side["active_profile"] == "SIDE"
    assert res_side["view_orientation"] == "side"

    # Knee at ~98 degrees (relaxed from < 90)
    # Vertex at knee [0.5, 0.65], hip at [0.22, 0.65], ankle at [0.54, 0.95]
    for _ in range(4):
        sim_t += 0.1
        res_squat_side = engine.process(
            hip=[0.22, 0.65, 0.0],
            knee=[0.5, 0.65, 0.0],
            ankle=[0.54, 0.95, 0.0],
            shoulder=[0.22, 0.35, 0.0],
            left_shoulder=sh_l_side,
            right_shoulder=sh_r_side,
            right_hip=hip_r_side,
            now=sim_t,
        )
    assert res_squat_side["active_profile"] == "SIDE"
    assert res_squat_side["primary_angle"] <= 100.0
    assert res_squat_side["phase"] == "HOLDING"
    assert res_squat_side["hold_target"] == 1.0
    assert not res_squat_side["has_fault"]  # Valgus inactive in side mode
    print("Relaxed Side Profile Depth (<=100 deg & 1.0s hold) Verified!")

    # 4. Test Normalized Front Profile Mode (Hip Drop >= 28% and 3-Frame Valgus Filter)
    engine_front = SquatEngine(global_telemetry, difficulty="standard")
    sim_t = 600.0
    # Standing reference calibration frame
    res_front_stand = engine_front.process(
        hip=[0.45, 0.45, 0.0],
        knee=[0.45, 0.70, 0.0],
        ankle=[0.45, 0.95, 0.0],
        shoulder=[0.45, 0.20, 0.0],
        right_hip=[0.55, 0.45, 0.0],
        left_shoulder=sh_l_front,
        right_shoulder=sh_r_front,
        left_knee=[0.45, 0.70, 0.0],
        right_knee=[0.55, 0.70, 0.0],
        left_ankle=[0.45, 0.95, 0.0],
        right_ankle=[0.55, 0.95, 0.0],
        now=sim_t,
    )
    assert res_front_stand["active_profile"] == "FRONT"

    # User drops hips: hip drops from 0.45 down to 0.62 (leg length = 0.50 -> drop ratio = 0.17 / 0.50 = 34% >= 28%)
    sim_t += 0.1
    res_front_drop = engine_front.process(
        hip=[0.45, 0.62, 0.0],
        knee=[0.43, 0.68, 0.0],
        ankle=[0.45, 0.95, 0.0],
        shoulder=[0.45, 0.35, 0.0],
        right_hip=[0.55, 0.62, 0.0],
        left_shoulder=sh_l_front,
        right_shoulder=sh_r_front,
        left_knee=[0.43, 0.68, 0.0],
        right_knee=[0.57, 0.68, 0.0],
        left_ankle=[0.45, 0.95, 0.0],
        right_ankle=[0.55, 0.95, 0.0],
        now=sim_t,
    )
    assert res_front_drop["active_profile"] == "FRONT"
    assert res_front_drop["phase"] == "HOLDING"
    assert res_front_drop["metric_value"] >= 28.0
    print("Normalized Front Profile Hip Drop (>=28%) Verified!")

    # 5. Test 3-Frame Valgus Persistence Filter in Front Mode
    # Single frame valgus noise (ratio 0.04 / 0.30 = 0.13 < 0.65)
    caved_lk, caved_rk = [0.48, 0.68, 0.0], [0.52, 0.68, 0.0]
    caved_la, caved_ra = [0.35, 0.95, 0.0], [0.65, 0.95, 0.0]

    # Frame 1: Valgus detected but not yet persisted (frame count 1 < 3)
    sim_t += 0.1
    f1 = engine_front.process(
        hip=[0.45, 0.62, 0.0], knee=[0.48, 0.68, 0.0], ankle=[0.35, 0.95, 0.0],
        right_hip=[0.55, 0.62, 0.0], left_shoulder=sh_l_front, right_shoulder=sh_r_front,
        left_knee=caved_lk, right_knee=caved_rk, left_ankle=caved_la, right_ankle=caved_ra, now=sim_t
    )
    assert not f1["has_fault"]  # Ignored as potential tracking noise

    # Frame 2: Still < 3
    sim_t += 0.1
    f2 = engine_front.process(
        hip=[0.45, 0.62, 0.0], knee=[0.48, 0.68, 0.0], ankle=[0.35, 0.95, 0.0],
        right_hip=[0.55, 0.62, 0.0], left_shoulder=sh_l_front, right_shoulder=sh_r_front,
        left_knee=caved_lk, right_knee=caved_rk, left_ankle=caved_la, right_ankle=caved_ra, now=sim_t
    )
    assert not f2["has_fault"]

    # Frame 3: 3 consecutive frames -> Confirmed Valgus!
    sim_t += 0.1
    f3 = engine_front.process(
        hip=[0.45, 0.62, 0.0], knee=[0.48, 0.68, 0.0], ankle=[0.35, 0.95, 0.0],
        right_hip=[0.55, 0.62, 0.0], left_shoulder=sh_l_front, right_shoulder=sh_r_front,
        left_knee=caved_lk, right_knee=caved_rk, left_ankle=caved_la, right_ankle=caved_ra, now=sim_t
    )
    assert f3["has_fault"]
    assert f3["fault_type"] == "valgus"
    print("3-Frame Valgus Persistence Noise Filter Verified!")

    print("\n[OK] ALL DUAL PROFILE ADAPTIVE KINEMATICS TESTS PASSED!")


def test_phase9_kinetic_deflection_and_stage_fsm():
    print("\n--- 12. Testing Phase 9 Kinetic Deflection & Stage State Machine ---")
    combat = BossCombatEngine()
    assert combat.game_stage == "ACTIVE"

    # In ACTIVE, attack timer ticks down
    res1 = combat.update(now=10.0, is_holding=False, rep_count=0, had_fault=False, is_critical=False)
    assert res1["boss_attack_timer"] <= 10.0
    res2 = combat.update(now=11.0, is_holding=False, rep_count=0, had_fault=False, is_critical=False)
    assert res2["boss_attack_timer"] < res1["boss_attack_timer"]

    # Pause the game stage
    combat.game_stage = "PAUSED"
    paused_timer = res2["boss_attack_timer"]
    res_paused = combat.update(now=20.0, is_holding=False, rep_count=0, had_fault=False, is_critical=False)
    assert res_paused["boss_attack_timer"] == paused_timer
    assert not res_paused["incoming_attack"]
    print("Pause & Calibration Timer Freeze Verified!")

    # Resume to ACTIVE
    combat.game_stage = "ACTIVE"
    res_resumed = combat.update(now=20.1, is_holding=False, rep_count=0, had_fault=False, is_critical=False)
    assert res_resumed["boss_attack_timer"] <= paused_timer
    print("Resume Protocol Functionality Verified!")

    print("\n[OK] ALL PHASE 9 KINETIC DEFLECTION & STAGE TESTS PASSED!")


if __name__ == "__main__":
    test_phase5_multi_exercise_3d_engine()
    test_phase6_boss_combat_and_parrying()
    test_phase7_mutators_and_leaderboard()
    test_dual_profile_adaptive_kinematics()
    test_phase9_kinetic_deflection_and_stage_fsm()
