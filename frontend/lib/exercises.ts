// ---------------------------------------------------------------------------
// AthleteMind - 10 Clinical Rehabilitation Movement Registry
// Vector Geometry, 3D Kinematics & Therapeutic Criteria
// ---------------------------------------------------------------------------

export type ExerciseRegion = "LOWER_BODY" | "UPPER_BODY" | "SPINE" | "BALANCE";

export interface LandmarkPoint {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export interface ExercisePrompts {
  initial: string;
  hold: string;
  complete: string;
  fault?: string;
}

export interface CalibrationTestResult {
  isReady: boolean;
  message: string;
  targetHoldSec: number;
  highlightJoints?: number[];
}

export interface ExerciseMetricResult {
  primaryAngle: number;
  secondaryAngle?: number;
  isDepthReached: boolean;
  isTargetReached: boolean;
  isHolding: boolean;
  faultDetected: boolean;
  faultMessage?: string;
  activeJointIndices?: number[];
  faultJointIndices?: number[];
  metricLabel?: string;
  metricDisplay?: string;
}

export interface ExerciseConfig {
  id: string;
  name: string;
  targetRegion: ExerciseRegion;
  instructions: string;
  prompts: ExercisePrompts;
  actionPrompt: string;
  holdPrompt: string;
  completePrompt: string;
  faultPrompt: string;
  primaryAngleName: string;
  secondaryAngleName: string;
  defaultActiveJointIndex: number;
  deflectionHoldTime: number; // in seconds
  targetAngle?: number;
  description: string;
  clinicalFocus: string;
  icon: string;
  relevantJoints: number[];
  calculateMetrics: (landmarks: any[]) => ExerciseMetricResult;
  testCalibration: (landmarks: any[]) => CalibrationTestResult;
}

// ---------------------------------------------------------------------------
// 3D Euclidean Vector & Angle Utilities
// ---------------------------------------------------------------------------

export function calculateAngle3D(
  a: LandmarkPoint | undefined,
  b: LandmarkPoint | undefined,
  c: LandmarkPoint | undefined
): number {
  if (!a || !b || !c) return 180.0;
  const ux = a.x - b.x;
  const uy = a.y - b.y;
  const uz = (a.z ?? 0) - (b.z ?? 0);

  const vx = c.x - b.x;
  const vy = c.y - b.y;
  const vz = (c.z ?? 0) - (b.z ?? 0);

  const dot = ux * vx + uy * vy + uz * vz;
  const normU = Math.sqrt(ux * ux + uy * uy + uz * uz);
  const normV = Math.sqrt(vx * vx + vy * vy + vz * vz);

  if (normU < 1e-6 || normV < 1e-6) return 180.0;
  const cosine = Math.max(-1.0, Math.min(1.0, dot / (normU * normV)));
  return Math.round((Math.acos(cosine) * 180.0) / Math.PI * 10) / 10;
}

export function calculateAngle2D(
  a: LandmarkPoint | undefined,
  b: LandmarkPoint | undefined,
  c: LandmarkPoint | undefined
): number {
  if (!a || !b || !c) return 180.0;
  const angleA = Math.atan2(a.y - b.y, a.x - b.x);
  const angleC = Math.atan2(c.y - b.y, c.x - b.x);
  let diff = Math.abs(angleA - angleC) * (180.0 / Math.PI);
  if (diff > 180.0) diff = 360.0 - diff;
  return Math.round(diff * 10) / 10;
}

function getPt(landmarks: any[], idx: number): LandmarkPoint | undefined {
  if (!landmarks || !landmarks[idx]) return undefined;
  const pt = landmarks[idx];
  if (pt.visibility !== undefined && pt.visibility < 0.25) return undefined;
  return pt;
}

// ---------------------------------------------------------------------------
// The 10 Clinical Rehabilitation Movement Definitions
// ---------------------------------------------------------------------------

export const EXERCISE_CONFIGS: Record<string, ExerciseConfig> = {
  // -------------------------------------------------------------------------
  // 1. Therapeutic Squat (Lower Body / Knee Extension)
  // -------------------------------------------------------------------------
  squats: {
    id: "squats",
    name: "Therapeutic Squat",
    targetRegion: "LOWER_BODY",
    instructions: "Descend into a balanced squat with hips moving back and knees tracking in line with toes.",
    prompts: {
      initial: "SQUAT DOWN",
      hold: "HOLD POSITION (1.5s)",
      complete: "STAND UP // DEFLECT!",
      fault: "VALGUS COLLAPSE // DRIVE KNEES OUTWARD",
    },
    actionPrompt: "SQUAT DOWN",
    holdPrompt: "HOLD POSITION (1.5s)",
    completePrompt: "STAND UP // DEFLECT!",
    faultPrompt: "EGO LIFT / KNEE CAVE DETECTED",
    primaryAngleName: "Knee",
    secondaryAngleName: "Hip",
    defaultActiveJointIndex: 25,
    deflectionHoldTime: 1.5,
    targetAngle: 90,
    description: "Lower extremity functional rehabilitation focusing on quadriceps control and patellofemoral tracking.",
    clinicalFocus: "Patellar stabilization & bilateral knee extension capacity.",
    icon: "🦵",
    relevantJoints: [23, 24, 25, 26, 27, 28],
    calculateMetrics: (landmarks: any[]): ExerciseMetricResult => {
      const lHip = getPt(landmarks, 23);
      const rHip = getPt(landmarks, 24);
      const lKnee = getPt(landmarks, 25);
      const rKnee = getPt(landmarks, 26);
      const lAnk = getPt(landmarks, 27);
      const rAnk = getPt(landmarks, 28);

      const lKneeAng = calculateAngle3D(lHip, lKnee, lAnk);
      const rKneeAng = calculateAngle3D(rHip, rKnee, rAnk);
      const kneeAngle = Math.min(lKneeAng, rKneeAng);

      const lHipAng = calculateAngle3D(getPt(landmarks, 11), lHip, lKnee);
      const rHipAng = calculateAngle3D(getPt(landmarks, 12), rHip, rKnee);
      const hipAngle = Math.min(lHipAng, rHipAng);

      // Clinical Guard: Medial Knee Collapse (Valgus)
      let valgusFault = false;
      const faultJoints: number[] = [];
      if (lHip && rHip && lKnee && rKnee && lAnk && rAnk) {
        const hipDist = Math.abs(lHip.x - rHip.x);
        const kneeDist = Math.abs(lKnee.x - rKnee.x);
        const ankleDist = Math.abs(lAnk.x - rAnk.x);

        if (ankleDist > 0.15 && kneeDist < ankleDist * 0.72 && kneeDist < hipDist * 0.85) {
          valgusFault = true;
          faultJoints.push(25, 26);
        }
      }

      const isDepthReached = kneeAngle <= 95;
      const isHolding = isDepthReached && !valgusFault;

      return {
        primaryAngle: kneeAngle,
        secondaryAngle: hipAngle,
        isDepthReached,
        isTargetReached: isDepthReached,
        isHolding,
        faultDetected: valgusFault,
        faultMessage: valgusFault ? "VALGUS COLLAPSE // DRIVE KNEES OUTWARD" : undefined,
        activeJointIndices: [25, 26],
        faultJointIndices: faultJoints,
        metricLabel: "KNEE FLEXION",
        metricDisplay: `${Math.round(kneeAngle)}°`,
      };
    },
    testCalibration: (landmarks: any[]): CalibrationTestResult => {
      const lHip = getPt(landmarks, 23);
      const rHip = getPt(landmarks, 24);
      const lKnee = getPt(landmarks, 25);
      const rKnee = getPt(landmarks, 26);
      const lAnk = getPt(landmarks, 27);
      const rAnk = getPt(landmarks, 28);
      const lKneeAng = calculateAngle3D(lHip, lKnee, lAnk);
      const rKneeAng = calculateAngle3D(rHip, rKnee, rAnk);
      const kneeAngle = Math.min(lKneeAng, rKneeAng);
      const isReady = kneeAngle <= 100;
      return {
        isReady,
        message: isReady ? "HOLD SQUAT DEPTH (1.5s)" : "SQUAT DOWN TO 90°",
        targetHoldSec: 1.5,
        highlightJoints: [23, 24, 25, 26, 27, 28],
      };
    },
  },

  // -------------------------------------------------------------------------
  // 2. Single-Leg Balance Anchor (Ankle & Proprioception Stability)
  // -------------------------------------------------------------------------
  single_leg_balance: {
    id: "single_leg_balance",
    name: "Single-Leg Balance Anchor",
    targetRegion: "BALANCE",
    instructions: "Lift one foot off the ground while maintaining a level pelvis and upright spinal posture.",
    prompts: {
      initial: "LIFT ONE FOOT // ANCHOR STANCE",
      hold: "STABILIZE CORE (3.0s)",
      complete: "SET DOWN // STABILITY SECURED!",
      fault: "PELVIC DROP // ENGAGE GLUTEUS MEDIUS",
    },
    actionPrompt: "LIFT ONE FOOT // ANCHOR STANCE",
    holdPrompt: "STABILIZE CORE (3.0s)",
    completePrompt: "SET DOWN // STABILITY SECURED!",
    faultPrompt: "PELVIC DROP / EXCESSIVE TRUNK SWAY",
    primaryAngleName: "Trunk Sway",
    secondaryAngleName: "Pelvic Tilt",
    defaultActiveJointIndex: 27,
    deflectionHoldTime: 3.0,
    targetAngle: 180,
    description: "Unilateral stability training for ankle proprioceptors and gluteus medius dynamic pelvic leveling.",
    clinicalFocus: "Ankle syndesmosis rehabilitation & Trendelenburg stabilization.",
    icon: "⚖️",
    relevantJoints: [23, 24, 25, 26, 27, 28],
    calculateMetrics: (landmarks: any[]): ExerciseMetricResult => {
      const lHip = getPt(landmarks, 23);
      const rHip = getPt(landmarks, 24);
      const lAnk = getPt(landmarks, 27);
      const rAnk = getPt(landmarks, 28);
      const lSh = getPt(landmarks, 11);
      const rSh = getPt(landmarks, 12);

      let primaryAngle = 180;
      let secondaryAngle = 0;
      let isDepthReached = false;
      let faultDetected = false;
      let faultMessage: string | undefined;
      const faultJoints: number[] = [];

      if (lHip && rHip && lAnk && rAnk) {
        // Vertical delta between left and right ankles
        const ankleYDelta = Math.abs(lAnk.y - rAnk.y);
        isDepthReached = ankleYDelta >= 0.08;

        // Pelvic tilt delta
        const pelvicTilt = Math.abs(lHip.y - rHip.y);
        secondaryAngle = Math.round(pelvicTilt * 100);

        // Trunk sway angle relative to vertical
        if (lSh && rSh) {
          const midShX = (lSh.x + rSh.x) / 2;
          const midShY = (lSh.y + rSh.y) / 2;
          const midHipX = (lHip.x + rHip.x) / 2;
          const midHipY = (lHip.y + rHip.y) / 2;

          const swayRad = Math.atan2(Math.abs(midShX - midHipX), Math.abs(midHipY - midShY));
          const swayDeg = (swayRad * 180) / Math.PI;
          primaryAngle = Math.round(swayDeg * 10) / 10;

          // Clinical Guard: Pelvic drop > 0.04 or torso sway > 10 degrees
          if (pelvicTilt > 0.04) {
            faultDetected = true;
            faultMessage = "PELVIC DROP // ENGAGE GLUTEUS MEDIUS";
            faultJoints.push(23, 24);
          } else if (swayDeg > 10.0) {
            faultDetected = true;
            faultMessage = "TORSO SWAY // MAINTAIN VERTICAL SPINE";
            faultJoints.push(11, 12);
          }
        }
      }

      const activeAnkle = (lAnk?.y ?? 0) < (rAnk?.y ?? 0) ? 27 : 28;

      return {
        primaryAngle,
        secondaryAngle,
        isDepthReached,
        isTargetReached: isDepthReached,
        isHolding: isDepthReached && !faultDetected,
        faultDetected,
        faultMessage,
        activeJointIndices: [activeAnkle, 23, 24],
        faultJointIndices: faultJoints,
        metricLabel: "TRUNK SWAY",
        metricDisplay: `${primaryAngle}°`,
      };
    },
    testCalibration: (landmarks: any[]): CalibrationTestResult => {
      const lAnk = getPt(landmarks, 27);
      const rAnk = getPt(landmarks, 28);
      const ankleDelta = lAnk && rAnk ? Math.abs(lAnk.y - rAnk.y) : 0;
      const isReady = ankleDelta >= 0.06;
      return {
        isReady,
        message: isReady ? "HOLD UNILATERAL BALANCE (2.0s)" : "LIFT ONE FOOT OFF GROUND",
        targetHoldSec: 2.0,
        highlightJoints: [23, 24, 27, 28],
      };
    },
  },

  // -------------------------------------------------------------------------
  // 3. Overhead Shoulder Press / Wall Slide (Rotator Cuff & Impingement)
  // -------------------------------------------------------------------------
  overhead_press: {
    id: "overhead_press",
    name: "Overhead Press / Wall Slide",
    targetRegion: "UPPER_BODY",
    instructions: "Elevate arms overhead smoothly without hyperextending or arching the lumbar spine.",
    prompts: {
      initial: "PRESS OVERHEAD",
      hold: "HOLD LOCKOUT (1.5s)",
      complete: "CONTROL LOWERING",
      fault: "LUMBAR ARCH // BRACE CORE",
    },
    actionPrompt: "PRESS OVERHEAD",
    holdPrompt: "HOLD LOCKOUT (1.5s)",
    completePrompt: "CONTROL LOWERING",
    faultPrompt: "LUMBAR ARCH / SPINAL HYPEREXTENSION",
    primaryAngleName: "Shoulder",
    secondaryAngleName: "Spine Arch",
    defaultActiveJointIndex: 11,
    deflectionHoldTime: 1.5,
    targetAngle: 170,
    description: "Functional scapulohumeral rhythm training promoting subacromial clearance and upward thoracic rotation.",
    clinicalFocus: "Subacromial decompression & serratus anterior activation.",
    icon: "🙌",
    relevantJoints: [11, 12, 13, 14, 15, 16],
    calculateMetrics: (landmarks: any[]): ExerciseMetricResult => {
      const lHip = getPt(landmarks, 23);
      const rHip = getPt(landmarks, 24);
      const lSh = getPt(landmarks, 11);
      const rSh = getPt(landmarks, 12);
      const lEl = getPt(landmarks, 13);
      const rEl = getPt(landmarks, 14);
      const lWr = getPt(landmarks, 15);
      const rWr = getPt(landmarks, 16);
      const lKnee = getPt(landmarks, 25);
      const rKnee = getPt(landmarks, 26);

      const lShAngle = calculateAngle3D(lHip, lSh, lWr || lEl);
      const rShAngle = calculateAngle3D(rHip, rSh, rWr || rEl);
      const shoulderElevation = Math.max(lShAngle, rShAngle);

      // Spine arch check (Shoulder - Hip - Knee)
      const lSpineAngle = calculateAngle3D(lSh, lHip, lKnee);
      const rSpineAngle = calculateAngle3D(rSh, rHip, rKnee);
      const spineAngle = Math.min(lSpineAngle, rSpineAngle);

      let faultDetected = false;
      const faultJoints: number[] = [];
      // Clinical Guard: Lumbar hyperextension (Spine departing from linear 180° by > 22°)
      if (spineAngle < 158.0 && shoulderElevation > 140.0) {
        faultDetected = true;
        faultJoints.push(23, 24);
      }

      const isDepthReached = shoulderElevation >= 165.0;

      return {
        primaryAngle: shoulderElevation,
        secondaryAngle: spineAngle,
        isDepthReached,
        isTargetReached: isDepthReached,
        isHolding: isDepthReached && !faultDetected,
        faultDetected,
        faultMessage: faultDetected ? "LUMBAR ARCH // BRACE CORE TO PREVENT EXTENSION" : undefined,
        activeJointIndices: [11, 12, 13, 14],
        faultJointIndices: faultJoints,
        metricLabel: "SHOULDER REACH",
        metricDisplay: `${Math.round(shoulderElevation)}°`,
      };
    },
    testCalibration: (landmarks: any[]): CalibrationTestResult => {
      const lSh = getPt(landmarks, 11);
      const rSh = getPt(landmarks, 12);
      const lWr = getPt(landmarks, 15);
      const rWr = getPt(landmarks, 16);
      const lHip = getPt(landmarks, 23);
      const rHip = getPt(landmarks, 24);
      const lEl = getPt(landmarks, 13);
      const rEl = getPt(landmarks, 14);
      const lShAngle = calculateAngle3D(lHip, lSh, lWr || lEl);
      const rShAngle = calculateAngle3D(rHip, rSh, rWr || rEl);
      const shoulderElevation = Math.max(lShAngle, rShAngle);
      const wristsAboveShoulders = Boolean(lWr && rWr && lSh && rSh && lWr.y < lSh.y && rWr.y < rSh.y);
      const isReady = wristsAboveShoulders && shoulderElevation >= 155.0;
      return {
        isReady,
        message: isReady ? "HOLD OVERHEAD LOCKOUT (1.0s)" : "EXTEND BOTH ARMS FULLY OVERHEAD",
        targetHoldSec: 1.0,
        highlightJoints: [11, 12, 13, 14, 15, 16],
      };
    },
  },

  // -------------------------------------------------------------------------
  // 4. Shoulder Scaption / Lateral Deltoid Raise (Subacromial Space)
  // -------------------------------------------------------------------------
  scaption: {
    id: "scaption",
    name: "Shoulder Scaption Raise",
    targetRegion: "UPPER_BODY",
    instructions: "Raise arms in the scapular plane (30° forward) to 90° shoulder height without shrugging traps.",
    prompts: {
      initial: "RAISE ARMS IN 30° SCAPTION",
      hold: "HOLD ELEVATION (1.5s)",
      complete: "CONTROL ECCENTRIC DESCENT",
      fault: "SHRUGGING DETECTED // DEPRESS SCAPULA",
    },
    actionPrompt: "RAISE TO 90° SCAPTION",
    holdPrompt: "HOLD SCAPULAR PLANE (1.0s)",
    completePrompt: "LOWER CONTROLLED // DEFLECT!",
    faultPrompt: "TRAPEZIUS SHRUG / ELEVATION DETECTED",
    primaryAngleName: "Abduction",
    secondaryAngleName: "Scapular Shrug",
    defaultActiveJointIndex: 11,
    deflectionHoldTime: 1.0,
    targetAngle: 90,
    description: "Targeted supraspinatus loading within the plane of the scapula minimizing acromial friction.",
    clinicalFocus: "Rotator cuff strengthening & subacromial clearance.",
    icon: "🦅",
    relevantJoints: [11, 12, 13, 14, 15, 16],
    calculateMetrics: (landmarks: any[]): ExerciseMetricResult => {
      const lHip = getPt(landmarks, 23);
      const rHip = getPt(landmarks, 24);
      const lSh = getPt(landmarks, 11);
      const rSh = getPt(landmarks, 12);
      const lEl = getPt(landmarks, 13);
      const rEl = getPt(landmarks, 14);
      const nose = getPt(landmarks, 0);

      const lAbd = calculateAngle3D(lHip, lSh, lEl);
      const rAbd = calculateAngle3D(rHip, rSh, rEl);
      const abductionAngle = Math.max(lAbd, rAbd);

      // Clinical Guard: Shoulder shrugging (distance between shoulder and ear/nose decreases)
      let faultDetected = false;
      let shrugDelta = 0;
      const faultJoints: number[] = [];

      if (lSh && rSh && nose) {
        const leftShrugDist = Math.abs(lSh.y - nose.y);
        const rightShrugDist = Math.abs(rSh.y - nose.y);
        shrugDelta = Math.min(leftShrugDist, rightShrugDist);

        if (shrugDelta < 0.12 && abductionAngle > 60.0) {
          faultDetected = true;
          faultJoints.push(11, 12);
        }
      }

      const isDepthReached = abductionAngle >= 80.0 && abductionAngle <= 105.0;

      return {
        primaryAngle: abductionAngle,
        secondaryAngle: Math.round(shrugDelta * 1000) / 10,
        isDepthReached,
        isTargetReached: isDepthReached,
        isHolding: isDepthReached && !faultDetected,
        faultDetected,
        faultMessage: faultDetected ? "UPPER TRAP SHRUG // PACK SHOULDERS DOWN" : undefined,
        activeJointIndices: [11, 12, 13, 14],
        faultJointIndices: faultJoints,
        metricLabel: "SCAPTION ANGLE",
        metricDisplay: `${Math.round(abductionAngle)}°`,
      };
    },
    testCalibration: (landmarks: any[]): CalibrationTestResult => {
      const lHip = getPt(landmarks, 23);
      const rHip = getPt(landmarks, 24);
      const lSh = getPt(landmarks, 11);
      const rSh = getPt(landmarks, 12);
      const lEl = getPt(landmarks, 13);
      const rEl = getPt(landmarks, 14);
      const lAbd = calculateAngle3D(lHip, lSh, lEl);
      const rAbd = calculateAngle3D(rHip, rSh, rEl);
      const abd = Math.max(lAbd, rAbd);
      const isReady = abd >= 75.0 && abd <= 110.0;
      return {
        isReady,
        message: isReady ? "HOLD SCAPTION ELEVATION (1.0s)" : "RAISE ARMS TO SHOULDER HEIGHT",
        targetHoldSec: 1.0,
        highlightJoints: [11, 12, 13, 14, 15, 16],
      };
    },
  },

  // -------------------------------------------------------------------------
  // 5. Bilateral Romanian Deadlift / Hip Hinge (Hamstring & Posterior Chain)
  // -------------------------------------------------------------------------
  rdl: {
    id: "rdl",
    name: "Romanian Deadlift (Hip Hinge)",
    targetRegion: "LOWER_BODY",
    instructions: "Hinge hips backward with soft knees while maintaining a neutral, non-rounded spine.",
    prompts: {
      initial: "HINGE AT HIPS // GLUTE DRIVE",
      hold: "HOLD HAMSTRING TENSION (1.5s)",
      complete: "EXTEND HIPS TO LOCKOUT",
      fault: "SPINAL ROUNDING // RETRACT SCAPULA",
    },
    actionPrompt: "HINGE HIPS BACKWARD",
    holdPrompt: "HOLD HAMSTRING STRETCH (1.5s)",
    completePrompt: "DRIVE GLUTES FORWARD // DEFLECT!",
    faultPrompt: "LUMBAR ROUNDING / EXCESS KNEE BEND",
    primaryAngleName: "Hip Hinge",
    secondaryAngleName: "Knee Bend",
    defaultActiveJointIndex: 23,
    deflectionHoldTime: 1.5,
    targetAngle: 105,
    description: "Posterior kinetic chain hinge mechanics isolating the hamstrings, gluteus maximus, and lumbar erectors.",
    clinicalFocus: "Hamstring eccentricity & lumbopelvic dissociation.",
    icon: "🏋️",
    relevantJoints: [11, 12, 23, 24, 25, 26],
    calculateMetrics: (landmarks: any[]): ExerciseMetricResult => {
      const lSh = getPt(landmarks, 11);
      const rSh = getPt(landmarks, 12);
      const lHip = getPt(landmarks, 23);
      const rHip = getPt(landmarks, 24);
      const lKnee = getPt(landmarks, 25);
      const rKnee = getPt(landmarks, 26);
      const lAnk = getPt(landmarks, 27);
      const rAnk = getPt(landmarks, 28);

      const lHinge = calculateAngle3D(lSh, lHip, lKnee);
      const rHinge = calculateAngle3D(rSh, rHip, rKnee);
      const hipHingeAngle = Math.min(lHinge, rHinge);

      const lKneeAngle = calculateAngle3D(lHip, lKnee, lAnk);
      const rKneeAngle = calculateAngle3D(rHip, rKnee, rAnk);
      const kneeSoftBend = Math.min(lKneeAngle, rKneeAngle);

      let faultDetected = false;
      let faultMessage: string | undefined;
      const faultJoints: number[] = [];

      // Clinical Guard: Excessive knee bending turns RDL into a squat
      if (kneeSoftBend < 145.0 && hipHingeAngle < 135.0) {
        faultDetected = true;
        faultMessage = "TOO MUCH KNEE BEND // HINGE HIPS BACKWARD";
        faultJoints.push(25, 26);
      }

      // Clinical Guard: Lumbar flexion / forward thoracic collapse
      if (lSh && rSh && lHip && rHip) {
        const midShY = (lSh.y + rSh.y) / 2;
        const midHipY = (lHip.y + rHip.y) / 2;
        if (midShY > midHipY + 0.1) {
          faultDetected = true;
          faultMessage = "LUMBAR ROUNDING // KEEP CHEST PROUD";
          faultJoints.push(11, 23);
        }
      }

      const isDepthReached = hipHingeAngle <= 115.0 && hipHingeAngle >= 85.0;

      return {
        primaryAngle: hipHingeAngle,
        secondaryAngle: kneeSoftBend,
        isDepthReached,
        isTargetReached: isDepthReached,
        isHolding: isDepthReached && !faultDetected,
        faultDetected,
        faultMessage,
        activeJointIndices: [23, 24],
        faultJointIndices: faultJoints,
        metricLabel: "HIP HINGE",
        metricDisplay: `${Math.round(hipHingeAngle)}°`,
      };
    },
    testCalibration: (landmarks: any[]): CalibrationTestResult => {
      const lSh = getPt(landmarks, 11);
      const rSh = getPt(landmarks, 12);
      const lHip = getPt(landmarks, 23);
      const rHip = getPt(landmarks, 24);
      const lKnee = getPt(landmarks, 25);
      const rKnee = getPt(landmarks, 26);
      const lHinge = calculateAngle3D(lSh, lHip, lKnee);
      const rHinge = calculateAngle3D(rSh, rHip, rKnee);
      const hipHingeAngle = Math.min(lHinge, rHinge);
      const isReady = hipHingeAngle <= 130.0;
      return {
        isReady,
        message: isReady ? "HOLD HIP HINGE (1.5s)" : "HINGE HIPS BACKWARD",
        targetHoldSec: 1.5,
        highlightJoints: [11, 12, 23, 24, 25, 26],
      };
    },
  },

  // -------------------------------------------------------------------------
  // 6. Calf Raise & Plantarflexion Hold (Achilles Tendon Rehabilitation)
  // -------------------------------------------------------------------------
  calf_raise: {
    id: "calf_raise",
    name: "Calf Raise & Plantarflexion",
    targetRegion: "LOWER_BODY",
    instructions: "Elevate heels high onto the balls of your feet and hold the peak plantarflexion position.",
    prompts: {
      initial: "DRIVE UP ONTO BALLS OF FEET",
      hold: "HOLD PLANTARFLEXION (2.0s)",
      complete: "LOWER HEELS WITH CONTROL",
      fault: "ANKLE SUPINATION // EVEN PRESSURE",
    },
    actionPrompt: "RISE ONTO BALLS OF FEET",
    holdPrompt: "HOLD PLANTARFLEXION (2.0s)",
    completePrompt: "LOWER HEELS WITH CONTROL!",
    faultPrompt: "UNEVEN HEEL ELEVATION / ASYMMETRY",
    primaryAngleName: "Elevation",
    secondaryAngleName: "Symmetry",
    defaultActiveJointIndex: 27,
    deflectionHoldTime: 2.0,
    targetAngle: 100,
    description: "Achilles tendon mechanical loading protocol optimizing gastrocnemius-soleus tensile strength.",
    clinicalFocus: "Achilles tendinopathy remodeling & triceps surae endurance.",
    icon: "🦶",
    relevantJoints: [25, 26, 27, 28],
    calculateMetrics: (landmarks: any[]): ExerciseMetricResult => {
      const lAnk = getPt(landmarks, 27);
      const rAnk = getPt(landmarks, 28);
      const lToe = getPt(landmarks, 31);
      const rToe = getPt(landmarks, 32);

      let elevationScore = 0;
      let asymmetryPct = 0;
      let isDepthReached = false;
      let faultDetected = false;
      const faultJoints: number[] = [];

      if (lAnk && rAnk && (lToe || rToe)) {
        const groundY = Math.max(lToe?.y || 0.9, rToe?.y || 0.9);
        const lLift = groundY - lAnk.y;
        const rLift = groundY - rAnk.y;
        const meanLift = (lLift + rLift) / 2;

        elevationScore = Math.round(meanLift * 1000);
        isDepthReached = meanLift >= 0.05;

        // Clinical Guard: Asymmetry > 15% between left and right heel height
        if (Math.max(lLift, rLift) > 0.03) {
          asymmetryPct = Math.round(Math.abs(lLift - rLift) / Math.max(lLift, rLift) * 100);
          if (asymmetryPct > 18) {
            faultDetected = true;
            faultJoints.push(27, 28);
          }
        }
      }

      return {
        primaryAngle: elevationScore,
        secondaryAngle: asymmetryPct,
        isDepthReached,
        isTargetReached: isDepthReached,
        isHolding: isDepthReached && !faultDetected,
        faultDetected,
        faultMessage: faultDetected ? "UNEVEN HEEL HEIGHT // DISTRIBUTE WEIGHT EQUALLY" : undefined,
        activeJointIndices: [27, 28, 29, 30],
        faultJointIndices: faultJoints,
        metricLabel: "PLANTAR LIFT",
        metricDisplay: `${elevationScore}`,
      };
    },
    testCalibration: (landmarks: any[]): CalibrationTestResult => {
      const lAnk = getPt(landmarks, 27);
      const rAnk = getPt(landmarks, 28);
      const lToe = getPt(landmarks, 31);
      const rToe = getPt(landmarks, 32);
      let isReady = false;
      if (lAnk && rAnk && (lToe || rToe)) {
        const groundY = Math.max(lToe?.y || 0.9, rToe?.y || 0.9);
        const lLift = groundY - lAnk.y;
        const rLift = groundY - rAnk.y;
        isReady = (lLift + rLift) / 2 >= 0.04;
      }
      return {
        isReady,
        message: isReady ? "HOLD HEELS ELEVATED (1.5s)" : "RISE ONTO BALLS OF FEET",
        targetHoldSec: 1.5,
        highlightJoints: [27, 28],
      };
    },
  },

  // -------------------------------------------------------------------------
  // 7. Standing High-Knee March (Hip Flexor & Core Control)
  // -------------------------------------------------------------------------
  high_knee_march: {
    id: "high_knee_march",
    name: "High-Knee March",
    targetRegion: "LOWER_BODY",
    instructions: "Drive one knee upward until the thigh is parallel with the floor while maintaining a vertical torso.",
    prompts: {
      initial: "DRIVE KNEE TOWARD CHEST",
      hold: "HOLD PEAK FLEXION (1.5s)",
      complete: "PLANT FOOT // SWITCH SIDES",
      fault: "TRUNK LEAN // MAINTAIN POSTURE",
    },
    actionPrompt: "DRIVE KNEE TO HIP HEIGHT",
    holdPrompt: "HOLD MARCH PEAK (1.5s)",
    completePrompt: "STEP DOWN WITH CONTROL // DEFLECT!",
    faultPrompt: "POSTERIOR TRUNK LEAN DETECTED",
    primaryAngleName: "Hip Flexion",
    secondaryAngleName: "Torso Lean",
    defaultActiveJointIndex: 25,
    deflectionHoldTime: 1.5,
    targetAngle: 90,
    description: "Dynamic iliopsoas activation combined with stance-leg gluteal stability and deep abdominal bracing.",
    clinicalFocus: "Hip flexor strength & anti-extension pelvic stability.",
    icon: "🚶",
    relevantJoints: [23, 24, 25, 26],
    calculateMetrics: (landmarks: any[]): ExerciseMetricResult => {
      const lSh = getPt(landmarks, 11);
      const rSh = getPt(landmarks, 12);
      const lHip = getPt(landmarks, 23);
      const rHip = getPt(landmarks, 24);
      const lKnee = getPt(landmarks, 25);
      const rKnee = getPt(landmarks, 26);

      const lHipFlex = calculateAngle3D(lSh, lHip, lKnee);
      const rHipFlex = calculateAngle3D(rSh, rHip, rKnee);
      const activeHipFlexion = Math.min(lHipFlex, rHipFlex);

      let trunkLeanDeg = 0;
      let faultDetected = false;
      const faultJoints: number[] = [];

      // Clinical Guard: Backward trunk lean compensating for weak iliopsoas
      if (lSh && rSh && lHip && rHip) {
        const midShZ = ((lSh.z || 0) + (rSh.z || 0)) / 2;
        const midHipZ = ((lHip.z || 0) + (rHip.z || 0)) / 2;
        const midShY = (lSh.y + rSh.y) / 2;
        const midHipY = (lHip.y + rHip.y) / 2;

        const leanRad = Math.atan2(Math.abs(midShZ - midHipZ), Math.abs(midHipY - midShY));
        trunkLeanDeg = Math.round((leanRad * 180) / Math.PI * 10) / 10;

        if (trunkLeanDeg > 12.0) {
          faultDetected = true;
          faultJoints.push(11, 12, 23, 24);
        }
      }

      const isDepthReached = activeHipFlexion <= 95.0;
      const activeKnee = lHipFlex < rHipFlex ? 25 : 26;

      return {
        primaryAngle: activeHipFlexion,
        secondaryAngle: trunkLeanDeg,
        isDepthReached,
        isTargetReached: isDepthReached,
        isHolding: isDepthReached && !faultDetected,
        faultDetected,
        faultMessage: faultDetected ? "POSTERIOR LEAN // BRACE ABS & STAY UPRIGHT" : undefined,
        activeJointIndices: [activeKnee],
        faultJointIndices: faultJoints,
        metricLabel: "HIP FLEXION",
        metricDisplay: `${Math.round(activeHipFlexion)}°`,
      };
    },
    testCalibration: (landmarks: any[]): CalibrationTestResult => {
      const lSh = getPt(landmarks, 11);
      const rSh = getPt(landmarks, 12);
      const lHip = getPt(landmarks, 23);
      const rHip = getPt(landmarks, 24);
      const lKnee = getPt(landmarks, 25);
      const rKnee = getPt(landmarks, 26);
      const lHipFlex = calculateAngle3D(lSh, lHip, lKnee);
      const rHipFlex = calculateAngle3D(rSh, rHip, rKnee);
      const isReady = Math.min(lHipFlex, rHipFlex) <= 105.0;
      return {
        isReady,
        message: isReady ? "HOLD HIGH KNEE (1.5s)" : "RAISE ONE KNEE TO HIP LEVEL",
        targetHoldSec: 1.5,
        highlightJoints: [23, 24, 25, 26],
      };
    },
  },

  // -------------------------------------------------------------------------
  // 8. Standing Torso Rotation (Thoracic Spine Mobility)
  // -------------------------------------------------------------------------
  torso_rotation: {
    id: "torso_rotation",
    name: "Standing Torso Rotation",
    targetRegion: "SPINE",
    instructions: "Rotate your shoulders and ribcage left and right while keeping your hips firmly squared forward.",
    prompts: {
      initial: "ROTATE THORACIC SPINE",
      hold: "HOLD ROTATION RANGE (2.0s)",
      complete: "RETURN TO NEUTRAL STANCE",
      fault: "PELVIC TWIST // ANCHOR HIPS",
    },
    actionPrompt: "ROTATE THORACIC SPINE",
    holdPrompt: "HOLD END-RANGE ROTATION (1.5s)",
    completePrompt: "RETURN TO CENTER // DEFLECT!",
    faultPrompt: "PELVIC TWIST / HIP DRIFT DETECTED",
    primaryAngleName: "Thoracic Twist",
    secondaryAngleName: "Pelvis Drift",
    defaultActiveJointIndex: 11,
    deflectionHoldTime: 1.5,
    targetAngle: 35,
    description: "Thoracic rotational mobilization isolated from the lumbopelvic junction to restore spinal mobility.",
    clinicalFocus: "Thoracolumbar dissociation & rib cage expansion.",
    icon: "🔄",
    relevantJoints: [11, 12, 23, 24],
    calculateMetrics: (landmarks: any[]): ExerciseMetricResult => {
      const lSh = getPt(landmarks, 11);
      const rSh = getPt(landmarks, 12);
      const lHip = getPt(landmarks, 23);
      const rHip = getPt(landmarks, 24);

      let thoracicRotationDeg = 0;
      let pelvicDriftDeg = 0;
      let faultDetected = false;
      const faultJoints: number[] = [];

      if (lSh && rSh && lHip && rHip) {
        // Shoulder plane vector in X-Z
        const shDx = lSh.x - rSh.x;
        const shDz = (lSh.z || 0) - (rSh.z || 0);
        const shAngle = Math.atan2(shDz, shDx) * (180 / Math.PI);

        // Pelvic plane vector in X-Z
        const hipDx = lHip.x - rHip.x;
        const hipDz = (lHip.z || 0) - (rHip.z || 0);
        const hipAngle = Math.atan2(hipDz, hipDx) * (180 / Math.PI);

        thoracicRotationDeg = Math.round(Math.abs(shAngle - hipAngle));
        pelvicDriftDeg = Math.round(Math.abs(hipAngle));

        // Clinical Guard: Pelvic rotation compensation > 15 degrees
        if (pelvicDriftDeg > 16.0) {
          faultDetected = true;
          faultJoints.push(23, 24);
        }
      }

      const isDepthReached = thoracicRotationDeg >= 28.0;

      return {
        primaryAngle: thoracicRotationDeg,
        secondaryAngle: pelvicDriftDeg,
        isDepthReached,
        isTargetReached: isDepthReached,
        isHolding: isDepthReached && !faultDetected,
        faultDetected,
        faultMessage: faultDetected ? "PELVIC ROTATION // LOCK HIPS FORWARD" : undefined,
        activeJointIndices: [11, 12],
        faultJointIndices: faultJoints,
        metricLabel: "THORACIC ROTATION",
        metricDisplay: `${thoracicRotationDeg}°`,
      };
    },
    testCalibration: (landmarks: any[]): CalibrationTestResult => {
      const lSh = getPt(landmarks, 11);
      const rSh = getPt(landmarks, 12);
      const lHip = getPt(landmarks, 23);
      const rHip = getPt(landmarks, 24);
      let isReady = false;
      if (lSh && rSh && lHip && rHip) {
        const shDx = lSh.x - rSh.x;
        const shDz = (lSh.z || 0) - (rSh.z || 0);
        const shAngle = Math.atan2(shDz, shDx) * (180 / Math.PI);
        const hipDx = lHip.x - rHip.x;
        const hipDz = (lHip.z || 0) - (rHip.z || 0);
        const hipAngle = Math.atan2(hipDz, hipDx) * (180 / Math.PI);
        isReady = Math.abs(shAngle - hipAngle) >= 20.0;
      }
      return {
        isReady,
        message: isReady ? "HOLD ROTATION (1.5s)" : "ROTATE SHOULDERS RELATIVE TO HIPS",
        targetHoldSec: 1.5,
        highlightJoints: [11, 12, 23, 24],
      };
    },
  },

  // -------------------------------------------------------------------------
  // 9. Lateral Lunge / Side Step (Adductor Mobility & Frontal Plane Stability)
  // -------------------------------------------------------------------------
  lateral_lunge: {
    id: "lateral_lunge",
    name: "Lateral Lunge & Adductor Glide",
    targetRegion: "LOWER_BODY",
    instructions: "Step wide to the side, bending the lead knee while keeping the trailing leg completely straight.",
    prompts: {
      initial: "STEP LATERALLY & SINK HIP",
      hold: "HOLD LATERAL DEPTH (1.5s)",
      complete: "PUSH OFF HEEL TO CENTER",
      fault: "KNEE TRANSLATION OVER TOES",
    },
    actionPrompt: "LUNGE TO SIDE // EXTEND TRAIL LEG",
    holdPrompt: "HOLD LATERAL DEPTH (1.5s)",
    completePrompt: "PUSH BACK TO CENTER // DEFLECT!",
    faultPrompt: "KNEE SHEAR / TRAIL LEG BENT",
    primaryAngleName: "Working Knee",
    secondaryAngleName: "Trail Knee",
    defaultActiveJointIndex: 25,
    deflectionHoldTime: 1.5,
    targetAngle: 105,
    description: "Frontal plane deceleration and adductor flexibility conditioning for multi-planar joint resilience.",
    clinicalFocus: "Frontal plane stability & adductor magnus eccentric elongation.",
    icon: "📐",
    relevantJoints: [23, 24, 25, 26, 27, 28],
    calculateMetrics: (landmarks: any[]): ExerciseMetricResult => {
      const lHip = getPt(landmarks, 23);
      const rHip = getPt(landmarks, 24);
      const lKnee = getPt(landmarks, 25);
      const rKnee = getPt(landmarks, 26);
      const lAnk = getPt(landmarks, 27);
      const rAnk = getPt(landmarks, 28);

      const lKneeAng = calculateAngle3D(lHip, lKnee, lAnk);
      const rKneeAng = calculateAngle3D(rHip, rKnee, rAnk);

      const workingKneeAng = Math.min(lKneeAng, rKneeAng);
      const trailKneeAng = Math.max(lKneeAng, rKneeAng);

      let stanceWidth = 0;
      let faultDetected = false;
      let faultMessage: string | undefined;
      const faultJoints: number[] = [];

      if (lAnk && rAnk) {
        stanceWidth = Math.abs(lAnk.x - rAnk.x);

        if (stanceWidth < 0.38) {
          faultDetected = true;
          faultMessage = "WIDEN STANCE FOR LATERAL LUNGE";
          faultJoints.push(27, 28);
        }

        // Clinical Guard: Trailing leg bent (< 160°)
        if (workingKneeAng <= 115.0 && trailKneeAng < 158.0) {
          faultDetected = true;
          faultMessage = "TRAIL LEG BENT // KEEP TRAILING KNEE FULLY LOCKED";
          faultJoints.push(lKneeAng < rKneeAng ? 26 : 25);
        }
      }

      const isDepthReached = workingKneeAng <= 108.0;
      const workingJoint = lKneeAng < rKneeAng ? 25 : 26;

      return {
        primaryAngle: workingKneeAng,
        secondaryAngle: trailKneeAng,
        isDepthReached,
        isTargetReached: isDepthReached,
        isHolding: isDepthReached && !faultDetected,
        faultDetected,
        faultMessage,
        activeJointIndices: [workingJoint],
        faultJointIndices: faultJoints,
        metricLabel: "LUNGE DEPTH",
        metricDisplay: `${Math.round(workingKneeAng)}°`,
      };
    },
    testCalibration: (landmarks: any[]): CalibrationTestResult => {
      const lHip = getPt(landmarks, 23);
      const rHip = getPt(landmarks, 24);
      const lKnee = getPt(landmarks, 25);
      const rKnee = getPt(landmarks, 26);
      const lAnk = getPt(landmarks, 27);
      const rAnk = getPt(landmarks, 28);
      const lKneeAng = calculateAngle3D(lHip, lKnee, lAnk);
      const rKneeAng = calculateAngle3D(rHip, rKnee, rAnk);
      const workingKneeAng = Math.min(lKneeAng, rKneeAng);
      const isReady = workingKneeAng <= 120.0;
      return {
        isReady,
        message: isReady ? "HOLD LATERAL DEPTH (1.5s)" : "SINK INTO LATERAL LUNGE",
        targetHoldSec: 1.5,
        highlightJoints: [23, 24, 25, 26, 27, 28],
      };
    },
  },

  // -------------------------------------------------------------------------
  // 10. Incline / Standing Wall Push-Up (Scapular Protraction & Upper Body)
  // -------------------------------------------------------------------------
  wall_pushup: {
    id: "wall_pushup",
    name: "Incline Wall Push-Up",
    targetRegion: "UPPER_BODY",
    instructions: "Lower chest toward the wall with elbows tracking at 45°, pushing through palms with full scapular protraction.",
    prompts: {
      initial: "LOWER CHEST TOWARD WALL",
      hold: "HOLD PLANK & DEPTH (1.5s)",
      complete: "PUSH BACK & PROTRACT SCAPULA",
      fault: "SAGGING HIPS // MAINTAIN PLANK",
    },
    actionPrompt: "LOWER CHEST TOWARD WALL",
    holdPrompt: "HOLD PLANK & ECCENTRIC DEPTH (1.5s)",
    completePrompt: "PUSH BACK & PROTRACT SCAPULA!",
    faultPrompt: "SAGGING HIPS / LOSS OF PLANK",
    primaryAngleName: "Elbow",
    secondaryAngleName: "Core Plank",
    defaultActiveJointIndex: 13,
    deflectionHoldTime: 1.5,
    targetAngle: 90,
    description: "Regulated closed-chain kinetic push pattern building anterior serratus integrity and pectoral control.",
    clinicalFocus: "Scapular protraction & core anterior chain anti-extension.",
    icon: "🧗",
    relevantJoints: [11, 12, 13, 14, 23, 24],
    calculateMetrics: (landmarks: any[]): ExerciseMetricResult => {
      const lSh = getPt(landmarks, 11);
      const rSh = getPt(landmarks, 12);
      const lEl = getPt(landmarks, 13);
      const rEl = getPt(landmarks, 14);
      const lWr = getPt(landmarks, 15);
      const rWr = getPt(landmarks, 16);
      const lHip = getPt(landmarks, 23);
      const rHip = getPt(landmarks, 24);
      const lAnk = getPt(landmarks, 27);
      const rAnk = getPt(landmarks, 28);

      const lElbow = calculateAngle3D(lSh, lEl, lWr);
      const rElbow = calculateAngle3D(rSh, rEl, rWr);
      const elbowAngle = Math.min(lElbow, rElbow);

      const lPlank = calculateAngle3D(lSh, lHip, lAnk);
      const rPlank = calculateAngle3D(rSh, rHip, rAnk);
      const plankAngle = Math.min(lPlank, rPlank);

      let faultDetected = false;
      const faultJoints: number[] = [];

      // Clinical Guard: Sagging hips (Plank angle departs from linear 180° by > 20°)
      if (plankAngle < 160.0) {
        faultDetected = true;
        faultJoints.push(23, 24);
      }

      const isDepthReached = elbowAngle <= 98.0;

      return {
        primaryAngle: elbowAngle,
        secondaryAngle: plankAngle,
        isDepthReached,
        isTargetReached: isDepthReached,
        isHolding: isDepthReached && !faultDetected,
        faultDetected,
        faultMessage: faultDetected ? "SAGGING HIPS // BRACE GLUTES & MAINTAIN PLANK" : undefined,
        activeJointIndices: [13, 14],
        faultJointIndices: faultJoints,
        metricLabel: "ELBOW FLEXION",
        metricDisplay: `${Math.round(elbowAngle)}°`,
      };
    },
    testCalibration: (landmarks: any[]): CalibrationTestResult => {
      const lSh = getPt(landmarks, 11);
      const rSh = getPt(landmarks, 12);
      const lEl = getPt(landmarks, 13);
      const rEl = getPt(landmarks, 14);
      const lWr = getPt(landmarks, 15);
      const rWr = getPt(landmarks, 16);
      const lElbow = calculateAngle3D(lSh, lEl, lWr);
      const rElbow = calculateAngle3D(rSh, rEl, rWr);
      const elbowAngle = Math.min(lElbow, rElbow);
      const isReady = elbowAngle <= 115.0;
      return {
        isReady,
        message: isReady ? "HOLD WALL PLANK LOCKOUT (1.0s)" : "PLACE HANDS ON WALL & LEAN IN",
        targetHoldSec: 1.0,
        highlightJoints: [11, 12, 13, 14, 23, 24],
      };
    },
  },
};

export const EXERCISE_LIST: ExerciseConfig[] = Object.values(EXERCISE_CONFIGS);

// Export registry object with full indexing and aliases
export const EXERCISE_REGISTRY: Record<string, ExerciseConfig> = EXERCISE_CONFIGS;

// Backward compatibility & shorthand aliases
EXERCISE_CONFIGS["squat"] = EXERCISE_CONFIGS["squats"];
EXERCISE_CONFIGS["pushups"] = EXERCISE_CONFIGS["wall_pushup"];
EXERCISE_CONFIGS["pushup"] = EXERCISE_CONFIGS["wall_pushup"];
EXERCISE_CONFIGS["overhead"] = EXERCISE_CONFIGS["overhead_press"];
EXERCISE_CONFIGS["ohp"] = EXERCISE_CONFIGS["overhead_press"];
EXERCISE_CONFIGS["shoulder_press"] = EXERCISE_CONFIGS["overhead_press"];
EXERCISE_CONFIGS["single_leg"] = EXERCISE_CONFIGS["single_leg_balance"];
EXERCISE_CONFIGS["balance"] = EXERCISE_CONFIGS["single_leg_balance"];

export function getExerciseConfig(id: string): ExerciseConfig {
  return EXERCISE_REGISTRY[id] || EXERCISE_REGISTRY["squat"] || EXERCISE_REGISTRY["squats"];
}
