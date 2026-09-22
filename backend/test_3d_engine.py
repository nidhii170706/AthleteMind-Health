import time
import numpy as np
from main import (
    calculate_angle_3d,
    detect_orientation,
    check_frontal_valgus,
    ExerciseSession
)

def test_3d_angle_math():
    print("--- 1. Testing calculate_angle_3d ---")
    ang_2d = calculate_angle_3d([0, 1], [0, 0], [1, 0])
    assert ang_2d == 90.0, f"Expected 90.0, got {ang_2d}"

    ang_3d_z = calculate_angle_3d([0, 1, 0], [0, 0, 0], [0, 0, 1])
    assert ang_3d_z == 90.0, f"Expected 90.0, got {ang_3d_z}"

    ang_180 = calculate_angle_3d([-1, 0, 0], [0, 0, 0], [1, 0, 0])
    assert ang_180 == 180.0, f"Expected 180.0, got {ang_180}"

    ang_45 = calculate_angle_3d([1, 1, 0], [0, 0, 0], [1, 0, 0])
    assert ang_45 == 45.0, f"Expected 45.0, got {ang_45}"

    ang_4d = calculate_angle_3d([0, 1, 0, 0.99], [0, 0, 0, 0.98], [1, 0, 0, 0.95])
    assert ang_4d == 90.0, f"Expected 90.0, got {ang_4d}"
    print("calculate_angle_3d tests PASSED!")

def test_auto_orientation():
    print("\n--- 2. Testing Auto-Orientation Classifier ---")
    front_landmarks = {
        "left": {
            "shoulder": [0.35, 0.2, 0.0, 0.9],
            "hip": [0.38, 0.5, 0.0, 0.9],
        },
        "right": {
            "shoulder": [0.65, 0.2, 0.0, 0.9],
            "hip": [0.62, 0.5, 0.0, 0.9],
        }
    }
    side_landmarks = {
        "left": {
            "shoulder": [0.50, 0.2, 0.0, 0.9],
            "hip": [0.51, 0.5, 0.0, 0.9],
        },
        "right": {
            "shoulder": [0.54, 0.2, 0.05, 0.2],
            "hip": [0.55, 0.5, 0.05, 0.2],
        }
    }

    assert detect_orientation(front_landmarks) == "FRONT"
    assert detect_orientation(side_landmarks) == "SIDE"
    print("Auto-Orientation tests PASSED!")

def test_frontal_valgus():
    print("\n--- 3. Testing Frontal Valgus Logic ---")
    left_ankle = [0.30, 0.9, 0.0]
    right_ankle = [0.70, 0.9, 0.0]

    good_left_knee = [0.32, 0.7, 0.0]
    good_right_knee = [0.68, 0.7, 0.0]
    assert not check_frontal_valgus(good_left_knee, good_right_knee, left_ankle, right_ankle)

    bad_left_knee = [0.43, 0.7, 0.0]
    bad_right_knee = [0.57, 0.7, 0.0]
    assert check_frontal_valgus(bad_left_knee, bad_right_knee, left_ankle, right_ankle)
    print("Frontal Valgus tests PASSED!")

def test_frontal_squat_flow():
    print("\n--- 4. Testing Frontal Squat Depth & Hold ---")
    session = ExerciseSession()
    sim_time = 2000.0

    standing = {
        "left": {
            "shoulder": [0.35, 0.2, 0.0, 0.9],
            "hip": [0.38, 0.45, 0.0, 0.9],
            "knee": [0.38, 0.72, 0.0, 0.9],
            "ankle": [0.35, 0.92, 0.0, 0.9],
        },
        "right": {
            "shoulder": [0.65, 0.2, 0.0, 0.9],
            "hip": [0.62, 0.45, 0.0, 0.9],
            "knee": [0.62, 0.72, 0.0, 0.9],
            "ankle": [0.65, 0.92, 0.0, 0.9],
        }
    }

    squat_bottom = {
        "left": {
            "shoulder": [0.35, 0.50, 0.0, 0.9],
            "hip": [0.36, 0.68, 0.1, 0.9],
            "knee": [0.34, 0.73, 0.0, 0.9],
            "ankle": [0.35, 0.92, 0.0, 0.9],
        },
        "right": {
            "shoulder": [0.65, 0.50, 0.0, 0.9],
            "hip": [0.64, 0.68, 0.1, 0.9],
            "knee": [0.66, 0.73, 0.0, 0.9],
            "ankle": [0.65, 0.92, 0.0, 0.9],
        }
    }

    res = session.process_frame("squat", "standard", squat_bottom, sim_time)
    assert res["orientation"] == "FRONT"

    for _ in range(5):
        sim_time += 0.35
        res = session.process_frame("squat", "standard", squat_bottom, sim_time)
    
    assert res["status"] == "hit", f"Expected hit, got {res['status']}"
    assert res["damage"] == 100

    sim_time += 0.5
    res = session.process_frame("squat", "standard", standing, sim_time)
    assert res["rep_count"] == 1
    print("Frontal Squat Rep test PASSED!")

    squat_valgus = {
        "left": {
            "shoulder": [0.35, 0.50, 0.0, 0.9],
            "hip": [0.36, 0.68, 0.1, 0.9],
            "knee": [0.46, 0.73, 0.0, 0.9],
            "ankle": [0.32, 0.92, 0.0, 0.9],
        },
        "right": {
            "shoulder": [0.65, 0.50, 0.0, 0.9],
            "hip": [0.64, 0.68, 0.1, 0.9],
            "knee": [0.54, 0.73, 0.0, 0.9],
            "ankle": [0.68, 0.92, 0.0, 0.9],
        }
    }
    res_valgus = session.process_frame("squat", "standard", squat_valgus, sim_time)
    assert res_valgus["valgus"] is True
    assert "DRIVE KNEES OUT" in res_valgus["warning"]
    print("Frontal Valgus Warning test PASSED!")

if __name__ == "__main__":
    test_3d_angle_math()
    test_auto_orientation()
    test_frontal_valgus()
    test_frontal_squat_flow()
    print("\nALL 3D VECTOR & ORIENTATION-AGNOSTIC TESTS PASSED!")
