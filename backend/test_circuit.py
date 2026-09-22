import time
import numpy as np
from main import CircuitEngine, SquatEngine

def test_circuit_engine_progression():
    circuit = CircuitEngine()
    assert circuit.phase_index == 1
    assert circuit.phase_targets[1]["exercise"] == "squat"

    # Simulate 5 clean squat repetitions
    standing_lms = {
        "shoulder": [0.6, 0.2],
        "hip": [0.6, 0.5],
        "knee": [0.6, 0.7],
        "ankle": [0.6, 0.9],
        "right_hip": [0.4, 0.5],
    }
    squat_lms = {
        "shoulder": [0.55, 0.55],
        "hip": [0.45, 0.65],
        "knee": [0.6, 0.65],
        "ankle": [0.6, 0.9],
        "right_hip": [0.35, 0.65],
    }

    now = 1000.0
    for rep in range(1, 6):
        # Initial stand
        circuit.process(standing_lms, "standard", now=now)
        now += 0.2

        # Transition into squat bottom
        for _ in range(3):
            now += 0.1
            circuit.process(squat_lms, "standard", now=now)

        # Hold for 1.4 seconds
        now += 1.4
        circuit.process(squat_lms, "standard", now=now)

        # Return to standing with transition frames
        rep_event = None
        for _ in range(3):
            now += 0.2
            r = circuit.process(standing_lms, "standard", now=now)
            if r.get("event") in ("REP_COMPLETE", "CIRCUIT_PHASE_ADVANCE"):
                rep_event = r

        assert rep_event is not None, f"No completion event detected on rep {rep}"
        if rep < 5:
            assert rep_event.get("event") == "REP_COMPLETE", f"Expected REP_COMPLETE on rep {rep}, got {rep_event.get('event')}"
            assert circuit.phase_index == 1
        else:
            assert rep_event.get("event") == "CIRCUIT_PHASE_ADVANCE", f"Expected CIRCUIT_PHASE_ADVANCE on rep 5, got {rep_event.get('event')}"
            assert circuit.phase_index == 2
            assert rep_event.get("next_exercise") == "overhead_press"
            assert "ARMOR BROKEN" in rep_event.get("circuit_banner", "")

    print("--- Circuit Phase 1 (5 Squats) -> Phase 2 (OHP) PASSED! ---")


def test_rom_calibration_scaling():
    engine = SquatEngine()
    # Baseline squat without calibration
    standing_lms = {
        "left": {"hip": [0.5, 0.4, 0.0], "knee": [0.5, 0.7, 0.0], "ankle": [0.5, 0.95, 0.0], "shoulder": [0.5, 0.2, 0.0]},
        "right": {"hip": [0.6, 0.4, 0.0], "knee": [0.6, 0.7, 0.0], "ankle": [0.6, 0.95, 0.0], "shoulder": [0.6, 0.2, 0.0]}
    }
    # Shallow squat: knee angle ~108-112 degrees with hip lean
    # In profile orientation, depth strictly relies on knee angle (t_max)
    profile_standing = {
        "shoulder": [0.6, 0.2], "hip": [0.6, 0.5], "knee": [0.6, 0.7], "ankle": [0.6, 0.9]
    }
    profile_shallow_squat = {
        "shoulder": [0.58, 0.55], "hip": [0.50, 0.65], "knee": [0.60, 0.70], "ankle": [0.60, 0.90]
    }

    # Test with athlete tier where uncalibrated t_max is 90.0 degrees
    # A 97-degree squat is too shallow for uncalibrated athlete tier (t_max=90.0)
    engine_uncalib = SquatEngine()
    engine_uncalib.process(profile_standing, "athlete", now=99.0)
    res_uncalib = None
    for i in range(4):
        res_uncalib = engine_uncalib.process(profile_shallow_squat, "athlete", now=100.0 + i * 0.1)
    assert res_uncalib.get("phase") != "HOLDING", f"97-deg squat should not hold in uncalibrated athlete tier (t_max=90)"

    # With personalized ROM calibration (athlete's max depth calibrated to 112 degrees -> scales t_max to 120.0)
    calib = {"squat_min": 112.0}
    engine_calib = SquatEngine()
    engine_calib.process(profile_standing, "athlete", now=99.0, rom_calibration=calib)
    res_calib = None
    for i in range(4):
        res_calib = engine_calib.process(profile_shallow_squat, "athlete", now=100.0 + i * 0.1, rom_calibration=calib)
    assert res_calib.get("phase") == "HOLDING", f"Calibrated athlete tier should enter HOLDING, got {res_calib.get('phase')}"

    print("--- Smart ROM Auto-Calibration Scaling PASSED! ---")

if __name__ == "__main__":
    test_circuit_engine_progression()
    test_rom_calibration_scaling()
    print("ALL CIRCUIT & ROM CALIBRATION TESTS PASSED!")
