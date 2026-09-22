"use client";

import React, { useState, useEffect } from "react";

interface ClinicalSoapCardProps {
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

export const ClinicalSoapCard: React.FC<ClinicalSoapCardProps> = ({
  callsign,
  exercise,
  repsCompleted,
  avgDepthAngle,
  maxHoldDuration,
  valgusEvents,
  stabilityScore,
  streakDays,
  baseline = {
    avgDepthAngle: 108.0,
    maxHoldDuration: 0.5,
    valgusEvents: 6,
    stabilityScore: 62.0,
  },
}) => {
  const [soapNote, setSoapNote] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [expanded, setExpanded] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    fetch("/api/generate-soap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callsign,
        exercise,
        repsCompleted,
        avgDepthAngle,
        maxHoldDuration,
        valgusEvents,
        stabilityScore,
        streakDays,
        baseline,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!isCancelled && data?.soapNote) {
          setSoapNote(data.soapNote);
        }
      })
      .catch((err) => console.warn("SOAP Note Generation error:", err))
      .finally(() => {
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [
    callsign,
    exercise,
    repsCompleted,
    avgDepthAngle,
    maxHoldDuration,
    valgusEvents,
    stabilityScore,
    streakDays,
    baseline.avgDepthAngle,
    baseline.maxHoldDuration,
    baseline.valgusEvents,
    baseline.stabilityScore,
  ]);

  const handleCopyForDoctor = () => {
    if (!soapNote) return;
    const formattedHeader = `ATHLETEMIND CLINICAL TELEMETRY & PM&R SOAP NOTE\nPatient ID: ${callsign}\nProtocol: ${exercise.toUpperCase()}\nDate: ${new Date().toLocaleDateString()}\n\n`;
    navigator.clipboard.writeText(formattedHeader + soapNote).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  return (
    <div className="w-full rounded-3xl bg-[#090e1c]/90 border border-teal-500/40 p-5 sm:p-6 shadow-[0_0_35px_rgba(20,184,166,0.15)] backdrop-blur-xl font-mono">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-950/80 border border-teal-400/50 flex items-center justify-center text-xl shadow-[0_0_15px_rgba(20,184,166,0.3)]">
            🩺
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-teal-300 uppercase tracking-widest">
                AI CLINICAL SYNTHESIS • SOAP REHAB NOTE
              </h3>
              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-teal-950 border border-teal-500/60 text-teal-300">
                GEMINI PM&R ENGINE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 uppercase tracking-wider mt-0.5">
              Automated Documentation for Physical Therapy & Orthopedic Discharge
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={handleCopyForDoctor}
            disabled={!soapNote || loading}
            className={`px-4 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-lg ${
              copied
                ? "bg-emerald-500 text-black border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                : "bg-teal-950/80 hover:bg-teal-900 border-teal-500/70 text-teal-200 hover:text-white"
            }`}
          >
            <span>{copied ? "✅" : "📋"}</span>
            <span>{copied ? "COPIED FOR DOCTOR!" : "COPY FOR DOCTOR"}</span>
          </button>

          <button
            onClick={() => setExpanded((prev) => !prev)}
            className="px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 transition-all cursor-pointer"
            title={expanded ? "Collapse Note" : "Expand Note"}
          >
            {expanded ? "▲" : "▼"}
          </button>
        </div>
      </div>

      {/* Body Content */}
      {expanded && (
        <div className="mt-4 text-xs sm:text-sm text-slate-300 leading-relaxed font-mono">
          {loading ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-teal-400">
              <div className="w-6 h-6 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs tracking-widest uppercase animate-pulse">
                GENERATING CLINICAL SOAP SYNTHESIS...
              </span>
            </div>
          ) : soapNote ? (
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {soapNote.split("### ").filter(Boolean).map((section, idx) => {
                const lines = section.trim().split("\n");
                const heading = lines[0];
                const content = lines.slice(1).join("\n");
                return (
                  <div key={idx} className="p-3.5 rounded-2xl bg-black/40 border border-slate-800/80">
                    <h4 className="text-xs font-black text-teal-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-teal-400" />
                      {heading}
                    </h4>
                    <div className="text-slate-300 text-xs sm:text-sm whitespace-pre-line leading-relaxed">
                      {content}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-slate-500 py-4 text-center">
              Awaiting session metrics to generate documentation...
            </p>
          )}
        </div>
      )}
    </div>
  );
};
