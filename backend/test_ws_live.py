import asyncio
import json
import websockets

async def test_live_websocket():
    uri = "ws://localhost:8000/ws/pose"
    print(f"Connecting to live WebSocket at {uri}...")

    async with websockets.connect(uri) as ws:
        print("[CONNECTED] Testing Scenario A: Pure Squat with 1.6s Clinical Hold...")
        
        # 1. Standing frame
        standing_frame = {
            "shoulder": [0.6, 0.2],
            "hip": [0.6, 0.5],
            "right_hip": [0.4, 0.5],
            "knee": [0.6, 0.7],
            "ankle": [0.6, 0.9]
        }
        await ws.send(json.dumps(standing_frame))
        resp = json.loads(await ws.recv())
        print(f"Standing: Phase={resp['phase']}, RepCount={resp['rep_count']}, KneeAngle={resp['knee_angle']}")
        assert resp["phase"] == "STANDING"

        # 2. Descend into squat bottom (Knee ~90°, Hip ~45° < 90°)
        squat_bottom = {
            "shoulder": [0.55, 0.55],
            "hip": [0.45, 0.65],
            "right_hip": [0.35, 0.65],
            "knee": [0.6, 0.65],
            "ankle": [0.6, 0.9]
        }
        for _ in range(3):
            await asyncio.sleep(0.05)
            await ws.send(json.dumps(squat_bottom))
            resp = json.loads(await ws.recv())

        print(f"Squat Bottom Entered: Phase={resp['phase']}, Status={resp['status']}, KneeAngle={resp['knee_angle']}")
        assert resp["phase"] == "HOLDING"

        # 3. Hold for 1.6 seconds
        print("Holding squat position for 1.6 seconds...")
        hit_detected = False
        for _ in range(8):
            await asyncio.sleep(0.2)
            await ws.send(json.dumps(squat_bottom))
            resp = json.loads(await ws.recv())
            if resp.get("status") == "hit" and resp.get("damage") == 100:
                print(f"-> EVENT: {resp['message']}! Damage={resp['damage']}, HoldProgress={resp['hold_progress']}")
                hit_detected = True
                break

        assert hit_detected, "Clinical hold did not trigger CRITICAL HIT!"

        # 4. Ascend back to standing
        await ws.send(json.dumps(standing_frame))
        resp = json.loads(await ws.recv())
        print(f"Ascended to Standing: Phase={resp['phase']}, RepCount={resp['rep_count']}")
        assert resp["rep_count"] == 1, "Rep counter was not incremented after pure squat!"

    # Scenario B: Test Ego-Lift Penalty in a fresh connection
    async with websockets.connect(uri) as ws:
        print("\n[CONNECTED] Testing Scenario B: Ego-Lift Penalty (Rapid Sloppy Half-Squats)...")
        # Start standing
        await ws.send(json.dumps(standing_frame))
        await ws.recv()

        # Dip 1: Shallow dip (< 140° knee) and immediately bounce back
        shallow_dip = {
            "shoulder": [0.6, 0.2],
            "hip": [0.45, 0.65],
            "right_hip": [0.4, 0.5],
            "knee": [0.6, 0.7],
            "ankle": [0.6, 0.9]
        }
        await ws.send(json.dumps(shallow_dip))
        await ws.recv()
        await asyncio.sleep(0.3)

        await ws.send(json.dumps(standing_frame))
        resp1 = json.loads(await ws.recv())
        print(f"Half-Squat 1 finished. Status={resp1['status']}")

        # Dip 2: Immediate second shallow bounce (within 1s)
        await asyncio.sleep(0.2)
        await ws.send(json.dumps(shallow_dip))
        await ws.recv()
        await asyncio.sleep(0.3)

        await ws.send(json.dumps(standing_frame))
        resp2 = json.loads(await ws.recv())
        print(f"Half-Squat 2 finished. Status={resp2['status']}, Error={resp2.get('error')}, DamageTaken={resp2.get('damage_taken')}")
        
        assert resp2["status"] == "penalty", "Ego-lift penalty was not triggered!"
        assert resp2["damage_taken"] == 25, "Penalty did not apply 25 damage taken!"
        assert "EGO LIFT" in resp2["error"], "Error message does not mention EGO LIFT!"
        assert resp2["weapon_overheated"] is True, "Weapon was not marked as overheated!"

    print("\n ALL LIVE WEBSOCKET INTEGRATION TESTS PASSED!")

if __name__ == "__main__":
    asyncio.run(test_live_websocket())
