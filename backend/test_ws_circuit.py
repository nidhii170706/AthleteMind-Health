import asyncio
import json
import websockets
import time

async def test_live_circuit_and_rom():
    uri = "ws://localhost:8000/ws/pose"
    print(f"Connecting to live WebSocket at {uri}...")
    async with websockets.connect(uri) as ws:
        # 1. Test Smart ROM Calibration Action
        print("\n--- 1. Testing ROM Calibration Action ---")
        calib_req = {
            "action": "calibrate_rom",
            "rom_calibration": {"squat_min": 92.0, "pushup_min": 85.0, "ohp_max": 165.0}
        }
        await ws.send(json.dumps(calib_req))
        resp = json.loads(await ws.recv())
        print(f"ROM Calibration Response: {resp}")
        assert resp.get("event") == "ROM_CALIBRATED"
        assert resp["rom_calibration"]["squat_min"] == 92.0

        # 2. Test Bounty Circuit Phase 1 (5 Squats) -> Phase 2 (OHP)
        print("\n--- 2. Testing Bounty Circuit Mode Progression ---")
        standing_frame = {
            "exercise": "circuit",
            "difficulty": "standard",
            "shoulder": [0.6, 0.2, 0.0, 1.0],
            "hip": [0.6, 0.5, 0.0, 1.0],
            "knee": [0.6, 0.7, 0.0, 1.0],
            "ankle": [0.6, 0.9, 0.0, 1.0],
            "right_hip": [0.4, 0.5, 0.0, 1.0],
        }
        squat_frame = {
            "exercise": "circuit",
            "difficulty": "standard",
            "shoulder": [0.55, 0.55, 0.0, 1.0],
            "hip": [0.45, 0.65, 0.0, 1.0],
            "knee": [0.6, 0.65, 0.0, 1.0],
            "ankle": [0.6, 0.9, 0.0, 1.0],
            "right_hip": [0.35, 0.65, 0.0, 1.0],
        }

        # Rep loop
        for rep in range(1, 6):
            # Stand
            await ws.send(json.dumps(standing_frame))
            await ws.recv()
            await asyncio.sleep(0.05)

            # Squat down and hold
            for _ in range(4):
                await ws.send(json.dumps(squat_frame))
                await ws.recv()
                await asyncio.sleep(0.05)

            # Hold for clinical duration
            await asyncio.sleep(1.3)
            await ws.send(json.dumps(squat_frame))
            await ws.recv()

            # Stand up to complete rep
            rep_event = None
            for _ in range(4):
                await ws.send(json.dumps(standing_frame))
                msg = json.loads(await ws.recv())
                if msg.get("event") in ("REP_COMPLETE", "CIRCUIT_PHASE_ADVANCE"):
                    rep_event = msg
                await asyncio.sleep(0.05)

            assert rep_event is not None, f"No rep event detected on rep {rep}"
            print(f"Rep {rep} logged! Event: {rep_event.get('event')}, Phase: {rep_event.get('circuit_phase')}, Reps: {rep_event.get('circuit_phase_reps')}/5")

            if rep == 5:
                assert rep_event.get("event") == "CIRCUIT_PHASE_ADVANCE", f"Expected CIRCUIT_PHASE_ADVANCE on rep 5, got {rep_event.get('event')}"
                assert rep_event.get("circuit_phase") == 2
                assert rep_event.get("next_exercise") == "overhead_press"
                assert "ARMOR BROKEN" in rep_event.get("circuit_banner", "")
                print(f"Banner received: \"{rep_event.get('circuit_banner')}\"")

        # 3. Test Session Reset
        print("\n--- 3. Testing Session Reset ---")
        await ws.send(json.dumps({"action": "reset"}))
        reset_resp = json.loads(await ws.recv())
        assert reset_resp.get("event") == "SESSION_RESET"
        print(f"Reset Response: {reset_resp}")

    print("\n ALL LIVE BOUNTY CIRCUIT & ROM CALIBRATION TESTS PASSED!")

if __name__ == "__main__":
    asyncio.run(test_live_circuit_and_rom())
