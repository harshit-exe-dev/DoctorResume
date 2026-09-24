import { useEffect, useRef, useState } from "react";
import { analyzeResume } from "../lib/ats";
import { ROLES, ROLE_KEYS } from "../lib/roles";
import { parseFile, reconstructResume, resumeToText } from "../lib/parse";
import { SAMPLE_RESUME, SAMPLE_FILENAME } from "../lib/sampleResume";
import Ekg, { Cross } from "./Ekg";
import ResumeDoc from "./ResumeDoc";

const STEPS = [
  "Checking pulse — contact information…",
  "Drawing blood — keyword analysis…",
  "X-ray — scanning file structure…",
  "Neurology — reading your bullets…",
  "Writing up the diagnosis…",
];

const STATUS_STYLE = {
  healthy: { pill: "bg-mint text-scrubdark", bar: "bg-scrub", dot: "bg-scrub", label: "Healthy" },
  watch: { pill: "bg-amber/15 text-amber", bar: "bg-amber", dot: "bg-amber", label: "Needs watch" },
  critical: { pill: "bg-coral/15 text-coraldark", bar: "bg-coral", dot: "bg-coral", label: "Critical" },
};

const VERDICT_STYLE = {
  fit: { stamp: "border-scrub text-scrubdark", label: "Match Fit" },
  stable: { stamp: "border-scrub text-scrubdark", label: "Stable" },
  treatment: { stamp: "border-amber text-amber", label: "Needs Treatment" },
  critical: { stamp: "border-coral text-coral", label: "Critical" },
  codeblue: { stamp: "border-coraldark text-coraldark", label: "Code Blue" },
};

function Gauge({ score }) {
  const angle = -90 + (score / 100) * 180;
  const color = score >= 70 ? "var(--color-scrub)" : score >= 55 ? "var(--color-amber)" : "var(--color-coral)";
  return (
    <div className="relative w-52">
      <svg viewBox="0 0 200 112" className="w-full">
        <path d="M12 100 A88 88 0 0 1 188 100" fill="none" stroke="var(--color-line)" strokeWidth="14" strokeLinecap="round" />
        <path d="M12 100 A88 88 0 0 1 188 100" fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
          strokeDasharray="276.5" strokeDashoffset={276.5 * (1 - score / 100)} style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.25,1,.35,1)" }} />
        <g className="needle" style={{ transform: `rotate(${angle}deg)` }}>
          <line x1="100" y1="100" x2="100" y2="34" stroke="var(--color-ink)" strokeWidth="3.5" strokeLinecap="round" />
        </g>
        <circle cx="100" cy="100" r="7" fill="var(--color-ink)" />
        <text x="12" y="112" fontSize="9" fill="var(--color-inksoft)" fontFamily="IBM Plex Mono, monospace">0</text>
        <text x="96" y="112" fontSize="9" fill="var(--color-inksoft)" fontFamily="IBM Plex Mono, monospace">50</text>
        <text x="182" y="112" fontSize="9" fill="var(--color-inksoft)" fontFamily="IBM Plex Mono, monospace">100</text>
      </svg>
      <p className="text-center -mt-3">
        <span className="font-report font-semibold text-5xl tabular">{score}</span>
        <span className="font-report text-sm text-inksoft">/100</span>
      </p>
    </div>
  );
}

function CategoryRow({ cat }) {
  const st = STATUS_STYLE[cat.status];
  return (
    <details className="group bg-cream border-2 border-ink rounded-xl overflow-hidden">
      <summary className="cursor-pointer list-none flex items-center gap-4 px-5 py-4 hover:bg-paper/60 transition-colors">
        <span className={`font-report text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full ${st.pill}`}>{st.label}</span>
        <span className="font-display font-bold text-lg flex-1">{cat.name}</span>
        <span className="font-report text-sm tabular text-inksoft">{cat.score}/{cat.max}</span>
        <span className="text-inksoft group-open:rotate-90 transition-transform">→</span>
      </summary>
      <div className="px-5 pb-5">
        <div className="h-2.5 bg-paper border border-line rounded-full overflow-hidden mb-4">
          <div className={`h-full rounded-full fillbar ${st.bar}`} style={{ width: `${(cat.score / cat.max) * 100}%` }} />
        </div>
        <ul className="space-y-2.5">
          {cat.findings.map((f, i) => (
            <li key={i} className="flex gap-3 text-[15px] leading-relaxed">
              <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${f.severity === "healthy" ? "bg-scrub" : f.severity === "watch" ? "bg-amber" : "bg-coral"}`} />
              <span className={f.severity === "healthy" ? "text-inksoft" : ""}>{f.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

export default function Clinic() {
  const [phase, setPhase] = useState("intake");
  const [stepIdx, setStepIdx] = useState(0);
  const [roleKey, setRoleKey] = useState("fullstack");
  const [fileName, setFileName] = useState("");
  const [report, setReport] = useState(null);
  const [resumeData, setResumeData] = useState(null);
  const [showResume, setShowResume] = useState(false);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const timer = useRef(null);
  const fileInput = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    const onSample = () => runSample();
    window.addEventListener("doctorresume:sample", onSample);
    return () => window.removeEventListener("doctorresume:sample", onSample);
  }, [roleKey]);

  const runAnalysis = (text, meta, name) => {
    if (!text || text.trim().length < 50) {
      setError("That file looks empty — the doctor needs something to examine.");
      setPhase("intake");
      return;
    }
    setError("");
    setFileName(name);
    setShowResume(false);
    setPhase("analyzing");
    setStepIdx(0);
    let i = 0;
    const tick = () => {
      i++;
      if (i < STEPS.length) {
        setStepIdx(i);
        timer.current = setTimeout(tick, 620);
      } else {
        const r = analyzeResume(text, roleKey, meta);
        setReport({ ...r, patient: reconstructResume(text).name });
        setResumeData(reconstructResume(text));
        setPhase("report");
        setTimeout(() => document.getElementById("diagnosis")?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
      }
    };
    timer.current = setTimeout(tick, 620);
  };

  const handleFiles = async (files) => {
    const f = files && files[0];
    if (!f) return;
    setPhase("analyzing");
    setStepIdx(0);
    try {
      const parsed = await parseFile(f);
      runAnalysis(parsed.text, { hasImages: parsed.hasImages, fileType: parsed.fileType }, f.name);
    } catch (e) {
      setError(e.message || "Couldn't read that file.");
      setPhase("intake");
    }
  };

  const runSample = () => {
    setPasteMode(false);
    runAnalysis(SAMPLE_RESUME, { hasImages: false, fileType: "PDF" }, SAMPLE_FILENAME);
  };

  const reset = () => {
    setPhase("intake");
    setReport(null);
    setResumeData(null);
    setShowResume(false);
    setPasteText("");
    setError("");
  };

  const dateStr = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <section id="clinic" className="max-w-6xl mx-auto px-5 py-16 md:py-24 scroll-mt-6">
      <div className="text-center mb-10">
        <p className="font-report text-xs uppercase tracking-[0.25em] text-scrubdark mb-4">↓ the clinic ↓</p>
        <h2 className="font-display font-black text-4xl md:text-6xl tracking-tight">
          Walk in. <em className="text-coral">Get diagnosed.</em>
        </h2>
        <p className="mt-4 text-inksoft max-w-xl mx-auto">
          Fill the intake form, hand over your resume, and the doctor will see you now.
        </p>
      </div>

      {phase === "intake" && (
        <div className="max-w-3xl mx-auto bg-cream border-2 border-ink rounded-2xl shadow-[8px_8px_0_0_var(--color-ink)] overflow-hidden">
          <div className="bg-ink text-cream px-6 py-4 flex items-center justify-between">
            <p className="font-report text-xs uppercase tracking-[0.2em]">✚ Patient intake form</p>
            <p className="font-report text-xs text-cream/60">no. {String(Math.floor(Math.random() * 900) + 100)}</p>
          </div>
          <div className="p-6 md:p-8 space-y-6">
            <div>
              <label className="font-report text-xs uppercase tracking-widest text-inksoft block mb-2">
                What role are you targeting?
              </label>
              <select
                value={roleKey}
                onChange={(e) => setRoleKey(e.target.value)}
                className="w-full bg-paper border-2 border-ink rounded-xl px-4 py-3.5 font-medium focus:outline-none focus:border-coral cursor-pointer"
              >
                {ROLE_KEYS.map((k) => (
                  <option key={k} value={k}>{ROLES[k].label}</option>
                ))}
              </select>
              <p className="text-sm text-inksoft mt-2">The keyword bloodwork is calibrated against this role.</p>
            </div>

            {!pasteMode ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
                onClick={() => fileInput.current?.click()}
                className={`suture-coral rounded-2xl p-10 text-center cursor-pointer transition-colors ${dragOver ? "bg-mint" : "bg-paper/60 hover:bg-mint/50"}`}
              >
                <input ref={fileInput} type="file" accept=".pdf,.docx,.txt,.md" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                <svg viewBox="0 0 48 48" className="w-12 h-12 mx-auto mb-4 text-scrubdark" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="10" y="6" width="28" height="36" rx="3" />
                  <path d="M18 6a6 6 0 0 1 12 0" />
                  <path d="M18 24h12M18 30h12M18 36h7" strokeLinecap="round" />
                </svg>
                <p className="font-display font-bold text-xl">Drop your resume here</p>
                <p className="text-inksoft mt-1">or <span className="underline text-scrubdark font-medium">browse files</span> — PDF, DOCX or TXT</p>
              </div>
            ) : (
              <div>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  rows={9}
                  placeholder="Paste your resume text here…"
                  className="w-full bg-paper border-2 border-ink rounded-xl px-4 py-3 font-report text-sm focus:outline-none focus:border-coral resize-y"
                />
                <button
                  onClick={() => runAnalysis(pasteText, { hasImages: false, fileType: "TEXT" }, "pasted-resume.txt")}
                  className="mt-3 bg-scrub text-cream px-6 py-3.5 rounded-full font-semibold hover:bg-scrubdark transition-colors shadow-[3px_3px_0_0_var(--color-ink)]"
                >
                  Run the diagnosis →
                </button>
              </div>
            )}

            {error && <p className="text-coraldark font-medium bg-coral/10 border border-coral/40 rounded-xl px-4 py-3">{error}</p>}

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 font-report text-xs uppercase tracking-widest text-inksoft">
              <button onClick={() => setPasteMode(!pasteMode)} className="underline hover:text-coral">
                {pasteMode ? "← back to file upload" : "paste text instead"}
              </button>
              <button onClick={runSample} className="underline hover:text-coral">
                try a sample patient first
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === "analyzing" && (
        <div className="max-w-2xl mx-auto bg-ink text-cream rounded-2xl p-8 md:p-12 shadow-[8px_8px_0_0_var(--color-coral)]">
          <Ekg className="w-full h-16 text-coral mb-8" fast />
          <ul className="space-y-4 font-report text-sm">
            {STEPS.map((s, i) => (
              <li key={s} className={`flex items-center gap-3 transition-opacity ${i <= stepIdx ? "opacity-100" : "opacity-30"}`}>
                <span className={`w-6 h-6 rounded-full grid place-items-center text-xs border ${i < stepIdx ? "bg-scrub border-scrub" : i === stepIdx ? "border-coral" : "border-cream/40"}`}>
                  {i < stepIdx ? "✓" : i === stepIdx ? <span className="w-2 h-2 rounded-full bg-coral pulse-dot inline-block" /> : "·"}
                </span>
                <span className={i === stepIdx ? "caret" : ""}>{s}</span>
              </li>
            ))}
          </ul>
          <p className="mt-8 font-report text-xs uppercase tracking-widest text-cream/50">the doctor is with your resume now…</p>
        </div>
      )}

      {phase === "report" && report && (
        <div id="diagnosis" className="scroll-mt-8 space-y-8">
          {/* ---- chart header ---- */}
          <div className="bg-cream border-2 border-ink rounded-2xl shadow-[8px_8px_0_0_var(--color-ink)] overflow-hidden">
            <div className="border-b-2 border-ink px-6 py-4 flex flex-wrap items-center justify-between gap-3 bg-paper">
              <p className="font-report text-xs uppercase tracking-[0.2em]">✚ Medical chart — confidential</p>
              <p className="font-report text-xs text-inksoft">{dateStr} · {fileName} · {report.roleLabel}</p>
            </div>
            <div className="p-6 md:p-10 grid md:grid-cols-[auto_1fr] gap-10 items-center">
              <Gauge score={report.total} />
              <div className="relative">
                <p className="font-report text-xs uppercase tracking-widest text-inksoft">Patient</p>
                <p className="font-display font-black text-3xl md:text-4xl mt-1">{report.patient}</p>
                <div className={`stamp inline-block mt-5 border-4 font-report font-semibold uppercase tracking-[0.18em] px-5 py-2 rounded-md text-xl bg-cream/70 ${VERDICT_STYLE[report.verdict.key].stamp}`}>
                  {VERDICT_STYLE[report.verdict.key].label}
                </div>
                <p className="mt-4 text-inksoft max-w-md leading-relaxed"><span className="font-semibold text-ink">Doctor's note:</span> {report.verdict.note}</p>
              </div>
            </div>
            {/* vitals */}
            <div className="grid grid-cols-3 md:grid-cols-6 border-t-2 border-ink divide-x-2 divide-ink/10">
              {[
                [report.stats.words, "words"],
                [report.stats.pages, "est. pages"],
                [report.stats.bullets, "bullets"],
                [`${report.stats.keywords.hits}/${report.stats.keywords.total}`, "keywords"],
                [`${report.stats.verbPct}%`, "action verbs"],
                [`${report.stats.quantPct}%`, "quantified"],
              ].map(([v, l]) => (
                <div key={l} className="px-3 py-4 text-center bg-cream">
                  <p className="font-report font-semibold text-xl tabular">{v}</p>
                  <p className="font-report text-[10px] uppercase tracking-widest text-inksoft mt-1">{l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ---- chief complaints ---- */}
          {report.chiefComplaints.length > 0 && (
            <div>
              <h3 className="font-display font-black text-2xl md:text-3xl mb-4 flex items-center gap-3">
                <Cross className="w-6 h-6 text-coral" /> Chief complaints
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {report.chiefComplaints.map((c, i) => (
                  <div key={i} className="bg-cream border-2 border-ink rounded-xl p-5 shadow-[4px_4px_0_0_var(--color-ink)]">
                    <p className="font-report text-[10px] uppercase tracking-widest text-inksoft mb-2">{c.category}</p>
                    <p className="leading-relaxed">{c.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ---- full body scan ---- */}
          <div>
            <h3 className="font-display font-black text-2xl md:text-3xl mb-4">Full-body scan</h3>
            <div className="space-y-3">
              {report.categories.map((c) => <CategoryRow key={c.id} cat={c} />)}
            </div>
          </div>

          {/* ---- prescription ---- */}
          {report.prescriptions.length > 0 && (
            <div className="bg-cream border-2 border-ink rounded-2xl shadow-[8px_8px_0_0_var(--color-scrub)] overflow-hidden">
              <div className="px-6 md:px-8 pt-6 flex items-start gap-4">
                <p className="font-display italic font-black text-6xl text-scrubdark leading-none">℞</p>
                <div>
                  <h3 className="font-display font-black text-2xl md:text-3xl">Prescription</h3>
                  <p className="text-inksoft mt-1">Take in order. Most critical first. Refills unlimited.</p>
                </div>
              </div>
              <ol className="px-6 md:px-8 py-6 space-y-4">
                {report.prescriptions.map((p, i) => (
                  <li key={i} className="flex gap-4 items-start border-b border-dashed border-line pb-4 last:border-0 last:pb-0">
                    <span className="font-report font-semibold text-lg text-scrubdark tabular shrink-0 w-8">{String(i + 1).padStart(2, "0")}</span>
                    <div className="flex-1">
                      <p className="leading-relaxed">{p.text}</p>
                      <p className="font-report text-[10px] uppercase tracking-widest text-inksoft mt-1">{p.category} · {p.severity}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* ---- actions ---- */}
          <div className="flex flex-wrap gap-4 justify-center pt-2 no-print">
            <button
              onClick={() => { setShowResume(true); setTimeout(() => document.getElementById("treatment")?.scrollIntoView({ behavior: "smooth" }), 80); }}
              className="bg-coral text-cream px-8 py-4 rounded-full font-semibold text-lg hover:bg-coraldark transition-colors shadow-[4px_4px_0_0_var(--color-ink)]"
            >
              Generate my ATS-safe resume ↓
            </button>
            <button onClick={reset} className="suture px-8 py-4 rounded-full font-semibold text-lg bg-cream hover:border-coral hover:text-coral transition-colors">
              Diagnose another
            </button>
          </div>
          <p className="text-center font-report text-[11px] uppercase tracking-widest text-inksoft no-print">
            heuristic checkup, not a guarantee — but these are exactly what real ATS filters screen for
          </p>

          {/* ---- treatment: generated resume ---- */}
          {showResume && resumeData && (
            <div id="treatment" className="scroll-mt-8 pt-4">
              <div className="text-center mb-6">
                <h3 className="font-display font-black text-3xl md:text-4xl">Treatment <em className="text-scrub">complete.</em></h3>
                <p className="text-inksoft mt-2 max-w-xl mx-auto">
                  We surgically rebuilt your resume into a clean, single-column, ATS-safe format.
                  Click any text to tweak it, then print to PDF.
                </p>
              </div>
              <div className="no-print flex flex-wrap justify-center gap-3 mb-6">
                <button onClick={() => window.print()} className="bg-ink text-cream px-6 py-3 rounded-full font-semibold hover:bg-coral transition-colors">
                  🖨 Print / Save as PDF
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([resumeToText(resumeData)], { type: "text/plain" });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = "ats-friendly-resume.txt";
                    a.click();
                    URL.revokeObjectURL(a.href);
                  }}
                  className="suture px-6 py-3 rounded-full font-semibold bg-cream hover:border-coral hover:text-coral transition-colors"
                >
                  Download .txt
                </button>
                <button
                  onClick={() => { navigator.clipboard?.writeText(resumeToText(resumeData)); }}
                  className="suture px-6 py-3 rounded-full font-semibold bg-cream hover:border-coral hover:text-coral transition-colors"
                >
                  Copy text
                </button>
              </div>
              <ResumeDoc data={resumeData} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
