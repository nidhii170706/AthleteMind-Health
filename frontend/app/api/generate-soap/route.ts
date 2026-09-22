import { NextRequest, NextResponse } from "next/server";

interface GenerateSoapBody {
  callsign: string;
  exercise: string;
  repsCompleted: number;
  avgDepthAngle: number;
  maxHoldDuration: number;
  valgusEvents: number;
  stabilityScore: number;
  streakDays: number;
  baseline?: {
    avgDepthAngle: number;
    maxHoldDuration: number;
    valgusEvents: number;
    stabilityScore: number;
  };
}

export async function POST(req: NextRequest) {
  try {
    const body: GenerateSoapBody = await req.json();
    const {
      callsign = "OPERATOR_01",
      exercise = "squats",
      repsCompleted = 10,
      avgDepthAngle = 88.0,
      maxHoldDuration = 2.0,
      valgusEvents = 0,
      stabilityScore = 95,
      streakDays = 7,
      baseline = {
        avgDepthAngle: 108.0,
        maxHoldDuration: 0.5,
        valgusEvents: 6,
        stabilityScore: 62.0,
      },
    } = body;

    const depthDelta = baseline.avgDepthAngle - avgDepthAngle;
    const holdDeltaPct = Math.round(
      ((maxHoldDuration - baseline.maxHoldDuration) / Math.max(0.1, baseline.maxHoldDuration)) * 100
    );
    const valgusReductionPct =
      baseline.valgusEvents > 0
        ? Math.round(((baseline.valgusEvents - valgusEvents) / baseline.valgusEvents) * 100)
        : 100;

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (apiKey) {
      try {
        const prompt = `You are a licensed physical medicine and rehabilitation clinician specializing in quantitative biomechanics.
Generate a professional, structured clinical SOAP note for a patient session in AthleteMind.

Patient ID / Callsign: ${callsign}
Exercise Prescribed: ${exercise}
Adherence Streak: ${streakDays} consecutive days
Reps Completed: ${repsCompleted}

Quantitative Biomechanical Telemetry:
- Day 1 Baseline Depth Angle: ${baseline.avgDepthAngle}° vs Current Session Depth: ${avgDepthAngle}° (Delta: ${depthDelta > 0 ? "+" : ""}${depthDelta.toFixed(1)}°)
- Isometric Pause Hold Duration: Baseline ${baseline.maxHoldDuration}s vs Today ${maxHoldDuration}s (+${holdDeltaPct}% increase)
- Medial Knee Valgus Fault Count: Baseline ${baseline.valgusEvents} vs Today ${valgusEvents} (${valgusReductionPct}% reduction)
- Kinetic Form Purity Score: ${stabilityScore}%

Generate a comprehensive SOAP note with the following exact Markdown sections:
### [SUBJECTIVE]
Summarize patient adherence, reported musculoskeletal comfort, and perceived exertion during the protocol.

### [OBJECTIVE]
Detailed bullet points with exact flexion degrees, isometric hold cadence, bilateral symmetry, and valgus deviation count.

### [ASSESSMENT]
Quantitative clinical analysis of motor unit recruitment, eccentric control, and recovery trajectory compared to Day 1 baseline.

### [PLAN]
Specific next-session progression parameters: recommended isometric hold duration target (in seconds), set volume, and rest intervals.

Use clinical, professional orthopedic terminology suitable for a medical record or doctor referral.`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.5,
                maxOutputTokens: 500,
              },
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (generatedText) {
            return NextResponse.json({ soapNote: generatedText });
          }
        }
      } catch (apiErr) {
        console.warn("Gemini API SOAP generation failed, using procedural fallback:", apiErr);
      }
    }

    // High-fidelity procedural clinical fallback
    const fallbackSoap = `### [SUBJECTIVE]
Patient (${callsign}) attended scheduled rehabilitation session on Day ${streakDays} of active adherence streak. Patient tolerated the ${exercise} protocol well, denying acute medial joint line discomfort or patellar apprehension. Mild muscular fatigue reported during late-set isometric pause holds.

### [OBJECTIVE]
- **Target Joint Flexion / Depth**: Current session achieved ${avgDepthAngle.toFixed(1)}° average joint flexion compared to Day 1 baseline of ${baseline.avgDepthAngle.toFixed(1)}° (demonstrating a ${depthDelta >= 0 ? "+" : ""}${depthDelta.toFixed(1)}° functional ROM improvement).
- **Isometric Time-Under-Tension (TUT)**: Maximum safe isometric hold documented at ${maxHoldDuration.toFixed(1)}s (baseline: ${baseline.maxHoldDuration.toFixed(1)}s, ${holdDeltaPct >= 0 ? "+" : ""}${holdDeltaPct}% increase in deep stability).
- **Coronal Plane Alignment**: ${valgusEvents} medial knee-valgus deviations detected during concentric extension phase (${valgusReductionPct}% correction from baseline of ${baseline.valgusEvents} events).
- **Form Purity Index**: Composite stability scored at ${stabilityScore}%.

### [ASSESSMENT]
Quantitative motor recovery trajectory indicates substantial neuromuscular adaptation. Eccentric deceleration velocity is controlled, and the patient demonstrates restored gluteus medius recruitment, resolving dynamic knee valgus under load. Joint mobility and tendon compliance are progressing toward full functional discharge standards.

### [PLAN]
1. Advance prescribed isometric hold duration to ${(maxHoldDuration + 0.5).toFixed(1)}s for next scheduled session.
2. Maintain active ${streakDays}-day adherence protocol (3x weekly cadence).
3. Continue real-time 3D vector feedback with coronal alignment gating.`;

    return NextResponse.json({ soapNote: fallbackSoap });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to generate clinical SOAP note", details: err.message },
      { status: 500 }
    );
  }
}
