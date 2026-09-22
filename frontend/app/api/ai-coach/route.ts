import { NextRequest, NextResponse } from "next/server";

interface AICoachBody {
  reps: number;
  avgHold: number;
  faults: string[];
  currentStage: string;
  exercise?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: AICoachBody = await req.json();
    const { reps = 0, avgHold = 1.0, faults = [], currentStage = "ACTIVE_DEFLECTION", exercise = "squats" } = body;

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (apiKey) {
      try {
        const prompt = `You are TAC-COM, an advanced sci-fi cybernetic combat suit AI and clinical sports physical therapist in AthleteMind.
The pilot is performing ${exercise}.
Current Stage: ${currentStage}
Reps Completed: ${reps}
Average Isometric Hold: ${avgHold.toFixed(1)}s
Observed Form Faults: ${faults.length > 0 ? faults.join(", ") : "None"}

Give a single, short, punchy 1-sentence tactical coaching cue (maximum 18 words) balancing cybernetic military immersion with real corrective biomechanics.
Do not use markdown or quotes. Speak directly to the operative.`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 60,
              },
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (generatedText) {
            return NextResponse.json({ cue: generatedText });
          }
        }
      } catch (apiErr) {
        console.warn("Gemini API call failed, using procedural fallback:", apiErr);
      }
    }

    // High-fidelity procedural tactical fallback
    let cue = "Kinetic alignment optimal: drive through heels and deflect incoming projectiles.";
    const latestFault = faults[faults.length - 1]?.toLowerCase() || "";

    if (latestFault.includes("valgus") || latestFault.includes("knee")) {
      cue = "TAC-COM ALERT: Kinetic conduits collapsing inward — drive knees outward across toes to stabilize shield.";
    } else if (latestFault.includes("lumbar") || latestFault.includes("arch") || latestFault.includes("sag")) {
      cue = "TAC-COM ALERT: Core stabilization breach detected — brace rectus abdominis and lock pelvic neutrality.";
    } else if (latestFault.includes("depth") || latestFault.includes("shallow")) {
      cue = "TAC-COM ALERT: Insufficient deflection depth — lower hips smoothly toward 90 degrees to engage aegis.";
    } else if (reps > 0 && reps % 5 === 0) {
      cue = `Kinetic resonance surging: ${reps} successful deflections logged, maintain eccentric cadence.`;
    }

    return NextResponse.json({ cue });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to process AI coach request", details: err.message },
      { status: 500 }
    );
  }
}
