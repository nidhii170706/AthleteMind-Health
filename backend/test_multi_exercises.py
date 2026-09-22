from main import ExerciseSession

def test_multi_exercises():
    session = ExerciseSession()
    sim_time = 1000.0

    print("--- 1. Testing Squat Engine (Standard Tier) ---")
    standing_landmarks = {
        "shoulder": [0.6, 0.2],
        "hip": [0.6, 0.5],
        "knee": [0.6, 0.7],
        "ankle": [0.6, 0.9],
        "right_hip": [0.4, 0.5],
    }
    squat_bottom = {
        "shoulder": [0.55, 0.55],
        "hip": [0.45, 0.65],
        "knee": [0.6, 0.65],
        "ankle": [0.6, 0.9],
        "right_hip": [0.35, 0.65],
    }
    # Initial standing
    session.process_frame("squat", "standard", standing_landmarks, sim_time)
    
    # Transition to bottom
    for _ in range(3):
        sim_time += 0.1
        res = session.process_frame("squat", "standard", squat_bottom, sim_time)
    assert res["phase"] == "HOLDING", f"Expected HOLDING, got {res['phase']}"
    
    # Hold 1.6s -> Critical Hit
    sim_time += 1.6
    res = session.process_frame("squat", "standard", squat_bottom, sim_time)
    assert res["status"] == "hit", f"Expected hit, got {res['status']}"
    assert res["damage"] == 100

    # Stand -> Rep Count 1
    sim_time += 0.5
    res = session.process_frame("squat", "standard", standing_landmarks, sim_time)
    assert res["rep_count"] == 1
    print("Squat test PASSED!")

    print("\n--- 2. Testing Push-up Engine & Lumbar Sag Fault ---")
    # Plank setup: straight line shoulder(0.2, 0.5) -> hip(0.5, 0.5) -> ankle(0.8, 0.5) = 180 deg
    plank_landmarks = {
        "shoulder": [0.2, 0.5],
        "elbow": [0.2, 0.7],
        "wrist": [0.2, 0.9],
        "hip": [0.5, 0.5],
        "ankle": [0.8, 0.5],
    }
    # Bottom push-up: chest to floor, elbow bent to 85 deg
    pushup_bottom = {
        "shoulder": [0.2, 0.75],
        "elbow": [0.1, 0.75], # elbow behind/bent
        "wrist": [0.2, 0.9],
        "hip": [0.5, 0.75],
        "ankle": [0.8, 0.75],
    }
    session.process_frame("pushup", "standard", plank_landmarks, sim_time)
    for _ in range(3):
        sim_time += 0.1
        res = session.process_frame("pushup", "standard", pushup_bottom, sim_time)
    assert res["phase"] == "BOTTOM_HOLD", f"Expected BOTTOM_HOLD, got {res['phase']}"

    # Hold 0.9s -> Depth reached
    sim_time += 0.9
    res = session.process_frame("pushup", "standard", pushup_bottom, sim_time)
    assert res["status"] == "hit"

    # Lockout -> Rep 1 (2 transition frames for smoothing)
    for _ in range(2):
        sim_time += 0.1
        res = session.process_frame("pushup", "standard", plank_landmarks, sim_time)
    assert res["rep_count"] == 1
    print("Push-up Rep test PASSED!")

    # Test Lumbar Sag fault (hip drops down to 0.9 while shoulder is 0.5 and ankle is 0.5)
    sagging_landmarks = {
        "shoulder": [0.2, 0.5],
        "elbow": [0.2, 0.7],
        "wrist": [0.2, 0.9],
        "hip": [0.5, 0.75], # sagging core
        "ankle": [0.8, 0.5],
    }
    res_sag = session.process_frame("pushup", "standard", sagging_landmarks, sim_time)
    assert res_sag["fault_detected"] is True
    assert res_sag["fault_name"] == "LUMBAR SAG"
    print("Push-up Lumbar Sag test PASSED!")

    print("\n--- 3. Testing Overhead Press Engine ---")
    ohp_rack = {
        "shoulder": [0.5, 0.5],
        "elbow": [0.5, 0.7], # elbow bent down
        "wrist": [0.5, 0.5], # wrist near shoulder
        "hip": [0.5, 0.8],
        "knee": [0.5, 1.0],
    }
    ohp_lockout = {
        "shoulder": [0.5, 0.5],
        "elbow": [0.5, 0.35],
        "wrist": [0.5, 0.15], # full extension overhead
        "hip": [0.5, 0.8],
        "knee": [0.5, 1.0],
    }
    session.process_frame("overhead_press", "standard", ohp_rack, sim_time)
    for _ in range(3):
        sim_time += 0.1
        res = session.process_frame("overhead_press", "standard", ohp_lockout, sim_time)
    assert res["phase"] == "LOCKOUT", f"Expected LOCKOUT, got {res['phase']}"

    sim_time += 1.1
    res = session.process_frame("overhead_press", "standard", ohp_lockout, sim_time)
    assert res["status"] == "hit"

    for _ in range(2):
        sim_time += 0.1
        res = session.process_frame("overhead_press", "standard", ohp_rack, sim_time)
    assert res["rep_count"] == 1
    print("Overhead Press test PASSED!")

    print("\n--- 4. Testing Romanian Deadlift (RDL) & Squatting Hinge Fault ---")
    rdl_standing = {
        "shoulder": [0.5, 0.2],
        "hip": [0.5, 0.5],
        "knee": [0.5, 0.75],
        "ankle": [0.5, 0.95],
    }
    # Pure hip hinge: torso horizontal (hip angle ~80 deg), knee soft (~160 deg)
    rdl_hinge = {
        "shoulder": [0.75, 0.55], # chest pushed forward
        "hip": [0.45, 0.55],     # butt pushed back
        "knee": [0.5, 0.75],     # soft knee
        "ankle": [0.5, 0.95],
    }
    session.process_frame("rdl", "standard", rdl_standing, sim_time)
    for _ in range(3):
        sim_time += 0.1
        res = session.process_frame("rdl", "standard", rdl_hinge, sim_time)
    assert res["phase"] == "HINGE_HOLD", f"Expected HINGE_HOLD, got {res['phase']}"

    sim_time += 1.6
    res = session.process_frame("rdl", "standard", rdl_hinge, sim_time)
    assert res["status"] == "hit"

    for _ in range(2):
        sim_time += 0.1
        res = session.process_frame("rdl", "standard", rdl_standing, sim_time)
    assert res["rep_count"] == 1
    print("RDL Rep test PASSED!")

    # Test "Squatting the hinge" (knee bends excessively to 120 deg)
    rdl_squatted = {
        "shoulder": [0.75, 0.55],
        "hip": [0.45, 0.7],
        "knee": [0.65, 0.7], # deep knee bend
        "ankle": [0.5, 0.95],
    }
    res_squat_hinge = session.process_frame("rdl", "standard", rdl_squatted, sim_time)
    assert res_squat_hinge["fault_detected"] is True
    assert res_squat_hinge["fault_name"] == "SQUATTING HINGE"
    print("RDL Squatting-the-hinge fault test PASSED!")

    print("\n ALL 4 EXERCISE BIOMECHANICAL ENGINES PASSED VERIFICATION!")

if __name__ == "__main__":
    test_multi_exercises()
