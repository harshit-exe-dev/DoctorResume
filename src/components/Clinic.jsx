import { useEffect, useRef, useState } from "react";
import { analyzeResume } from "../lib/ats";
import { ROLES, ROLE_KEYS } from "../lib/roles";
import { parseFile, reconstructResume, resumeToText } from "../lib/parse";
import { SAMPLE_RESUME, SAMPLE_FILENAME } from "../lib/sampleResume";
import ResumeDoc from "./ResumeDoc";
import { printResume } from "../lib/printResume.js";

const STEPS = [
  "checking pulse — contact information",
  "drawing blood — keyword analysis",
  "x-ray — scanning file structure",
  "neurology — reading your bullets",
  "writing up the diagnosis",
];

const DOT = {
  healthy: "bg-faint",
  watch: "bg-ink",
  critical: "bg-red",
};

const STATUS_LABEL = { healthy: "healthy", watch: "needs watch", critical: "critical" };

// Contact details the parser looks for. Anything missing gets asked for
// (optionally) before the treated resume is printed.
const MISSING_FIELDS = [
  { key: "email", label: "Email address", placeholder: "you@example.com" },
  { key: "phone", label: "Phone number", placeholder: "+91 98765 43210" },
  { key: "linkedin", label: "LinkedIn profile URL", placeholder: "linkedin.com/in/yourname" },
  { key: "github", label: "GitHub / portfolio link", placeholder: "github.com/yourname" },
  { key: "location", label: "Location", placeholder: "City, State" },
];

const VERDICT_TAG = {
  fit: "bg-ink text-white border-ink",
  stable: "bg-ink text-white border-ink",
  treatment: "border-ink text-ink",
  critical: "border-red text-red",
  codeblue: "bg-red text-white border-red",
};

function CategoryRow({ cat }) {
  return (
    <details className="group border-t border-line last:border-b">
      <summary className="cursor-pointer list-none grid grid-cols-[1fr_auto] md:grid-cols-[auto_1fr_auto_auto] items-center gap-x-5 gap-y-1 px-1 py-5">
        <span className="flex items-center gap-2.5">
          <span className={`w-2 h-2 ${DOT[cat.status]}`} />
          <span className="label !text-[10px]">{STATUS_LABEL[cat.status]}</span>
        </span>
        <span className="text-xl font-medium tracking-tight">{cat.name}</span>
        <span className="font-mono text-sm text-mute tabular">
          {cat.score}<span className="text-faint">/{cat.max}</span>
        </span>
        <span className="text-mute group-open:rotate-90 transition-transform justify-self-end">→</span>
      </summary>
      <div className="pb-7 pl-1 pr-1 md:pl-[4.5rem] max-w-3xl">
        <div className="h-px bg-line mb-5 relative">
          <div className={`h-px fillbar ${cat.status === "critical" ? "bg-red" : "bg-ink"}`} style={{ width: `${(cat.score / cat.max) * 100}%` }} />
        </div>
        <ul className="space-y-2.5">
          {cat.findings.map((f, i) => (
            <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-mute">
              <span className={`mt-[9px] w-1.5 h-1.5 shrink-0 ${DOT[f.severity]}`} />
              <span className={f.severity === "healthy" ? "" : "text-ink"}>{f.text}</span>
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
  const [provided, setProvided] = useState({});
  const [missingOpen, setMissingOpen] = useState(true);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setProvided({});
    setMissingOpen(true);
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
    setProvided({});
    setMissingOpen(true);
    setPasteText("");
    setError("");
  };

  const missingList = resumeData ? MISSING_FIELDS.filter((f) => !resumeData.contact[f.key]) : [];

  const applyProvided = () => {
    const contact = { ...resumeData.contact };
    for (const f of MISSING_FIELDS) {
      const v = (provided[f.key] || "").trim().replace(/[?,.]+$/, "");
      if (v) contact[f.key] = v;
    }
    setResumeData({ ...resumeData, contact });
    setMissingOpen(false);
  };

  const dateStr = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <section id="clinic" className="max-w-6xl mx-auto px-5 md:px-8 pt-24 md:pt-36 pb-16 scroll-mt-6">
      <p className="label">01 — the clinic</p>
      <h2 className="font-bold lowercase leading-[0.9] tracking-[-0.04em] text-6xl md:text-8xl mt-6">
        walk in.
        <br />
        get diagnosed.
      </h2>

      {phase === "intake" && (
        <div className="rise mt-12 md:mt-16 border-t border-ink">
          <div className="grid md:grid-cols-[1fr_1.4fr] gap-10 py-10">
            <div>
              <p className="label !text-ink">patient intake</p>
              <p className="mt-4 text-[15px] leading-relaxed text-mute max-w-xs">
                Tell us the role you're targeting, hand over your resume, and
                the doctor will see you now. Takes ten seconds.
              </p>
              <p className="label mt-8">no account · nothing uploaded</p>
            </div>
            <div className="space-y-8">
              <div>
                <label className="label block mb-3">target role</label>
                <select
                  value={roleKey}
                  onChange={(e) => setRoleKey(e.target.value)}
                  className="w-full bg-transparent border-b border-ink py-3 text-lg font-medium focus:outline-none cursor-pointer"
                >
                  {ROLE_KEYS.map((k) => (
                    <option key={k} value={k}>{ROLES[k].label}</option>
                  ))}
                </select>
                <p className="text-sm text-mute mt-2">the keyword bloodwork is calibrated against this role.</p>
              </div>

              {!pasteMode ? (
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Upload your resume: PDF, DOCX or TXT"
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
                  onClick={() => fileInput.current?.click()}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.current?.click(); } }}
                  className={`border ${dragOver ? "border-red bg-red/[0.03]" : "border-line"} px-8 py-14 text-center cursor-pointer transition-colors hover:border-ink focus:outline-none focus:border-ink`}
                >
                  <input ref={fileInput} type="file" accept=".pdf,.docx,.txt,.md" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                  <p className="text-2xl font-medium tracking-tight">drop your resume here</p>
                  <p className="text-mute mt-2 text-[15px]">
                    or <span className="tlink text-ink">browse files</span> — pdf, docx or txt
                  </p>
                </div>
              ) : (
                <div>
                  <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    rows={8}
                    placeholder="paste your resume text here…"
                    className="w-full bg-transparent border border-line px-4 py-3 font-mono text-sm focus:outline-none focus:border-ink resize-y"
                  />
                  <button
                    onClick={() => runAnalysis(pasteText, { hasImages: false, fileType: "TEXT" }, "pasted-resume.txt")}
                    className="mt-4 bg-ink text-white font-mono text-[11px] uppercase tracking-[0.18em] px-7 py-4 hover:bg-red transition-colors"
                  >
                    run the diagnosis →
                  </button>
                </div>
              )}

              {error && <p className="text-red text-[15px] border border-red/40 px-4 py-3">{error}</p>}

              <div className="flex flex-wrap gap-x-8 gap-y-2 font-mono text-[11px] uppercase tracking-[0.18em]">
                <button onClick={() => setPasteMode(!pasteMode)} className="tlink cursor-pointer">
                  {pasteMode ? "← back to file upload" : "paste text instead"}
                </button>
                <button onClick={runSample} className="tlink cursor-pointer text-red">
                  try a sample patient
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {phase === "analyzing" && (
        <div className="rise mt-12 md:mt-16 border-t border-ink py-12 max-w-2xl">
          <p className="label mb-8">the doctor is with your resume now</p>
          <ul className="space-y-4 font-mono text-sm">
            {STEPS.map((s, i) => (
              <li key={s} className={`flex items-center gap-4 transition-opacity ${i <= stepIdx ? "opacity-100" : "opacity-25"}`}>
                <span className={`w-2 h-2 shrink-0 ${i < stepIdx ? "bg-ink" : i === stepIdx ? "bg-red" : "bg-faint"}`} />
                <span className={i === stepIdx ? "caret" : ""}>{s}…</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {phase === "report" && report && (
        <div id="diagnosis" className="scroll-mt-8 mt-12 md:mt-16">
          {/* ---- report header ---- */}
          <div className="rise border-t border-ink pt-8">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className="label !text-ink">diagnosis report</p>
              <p className="font-mono text-[11px] text-mute uppercase tracking-[0.14em]">
                {dateStr} · {fileName} · {report.roleLabel}
              </p>
            </div>

            <div className="grid md:grid-cols-[auto_1fr] gap-10 md:gap-16 mt-10 items-end">
              <div>
                <p className="font-bold tabular leading-none tracking-[-0.05em] text-[7rem] md:text-[10rem]">
                  {report.total}
                  <span className="text-2xl md:text-3xl text-faint font-medium tracking-normal">/100</span>
                </p>
                <div className="h-px bg-line mt-4 relative max-w-[280px]">
                  <div
                    className={`h-px fillbar ${report.total < 55 ? "bg-red" : "bg-ink"}`}
                    style={{ width: `${report.total}%` }}
                  />
                </div>
                <p className="label mt-3">ats health score</p>
              </div>
              <div className="pb-2">
                <p className="label">patient</p>
                <p className="text-4xl md:text-5xl font-semibold tracking-tight mt-2 lowercase">{report.patient}</p>
                <div className={`inline-block mt-6 border font-mono text-[11px] uppercase tracking-[0.2em] px-4 py-2 ${VERDICT_TAG[report.verdict.key]}`}>
                  {report.verdict.label}
                </div>
                <p className="mt-5 text-mute leading-relaxed max-w-md text-[15px]">
                  <span className="text-ink font-medium">doctor's note — </span>
                  {report.verdict.note}
                </p>
              </div>
            </div>

            {/* vitals */}
            <div className="grid grid-cols-3 md:grid-cols-6 border-t border-l border-line mt-12">
              {[
                [report.stats.words, "words"],
                [report.stats.pages, "est. pages"],
                [report.stats.bullets, "bullets"],
                [`${report.stats.keywords.hits}/${report.stats.keywords.total}`, "keywords"],
                [`${report.stats.verbPct}%`, "action verbs"],
                [`${report.stats.quantPct}%`, "quantified"],
              ].map(([v, l]) => (
                <div key={l} className="border-b border-r border-line px-4 py-5">
                  <p className="text-2xl font-semibold tabular tracking-tight">{v}</p>
                  <p className="label mt-1.5 !text-[10px]">{l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ---- chief complaints ---- */}
          {report.chiefComplaints.length > 0 && (
            <div className="mt-16 md:mt-24">
              <p className="label">chief complaints</p>
              <div className="mt-6 border-t border-ink">
                {report.chiefComplaints.map((c, i) => (
                  <div key={i} className="grid grid-cols-[auto_1fr] gap-6 py-6 border-b border-line">
                    <span className="font-mono text-sm text-red tabular">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <p className="label !text-[10px] mb-2">{c.category}</p>
                      <p className="text-lg leading-relaxed max-w-2xl">{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ---- full-body scan ---- */}
          <div className="mt-16 md:mt-24">
            <p className="label">full-body scan — 8 systems</p>
            <div className="mt-6">
              {report.categories.map((c) => <CategoryRow key={c.id} cat={c} />)}
            </div>
          </div>

          {/* ---- prescription ---- */}
          {report.prescriptions.length > 0 && (
            <div className="mt-16 md:mt-24">
              <div className="flex items-baseline justify-between">
                <p className="label">℞ prescription</p>
                <p className="label !text-[10px]">most critical first · refills unlimited</p>
              </div>
              <ol className="mt-6 border-t border-ink">
                {report.prescriptions.map((p, i) => (
                  <li key={i} className="grid grid-cols-[auto_1fr] gap-6 py-5 border-b border-line">
                    <span className="font-mono text-sm text-red tabular">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <p className="text-lg leading-relaxed max-w-2xl">{p.text}</p>
                      <p className="label !text-[10px] mt-2">{p.category} · {p.severity}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* ---- actions ---- */}
          <div className="no-print flex flex-wrap items-center gap-x-10 gap-y-4 mt-12">
            <button
              onClick={() => { setShowResume(true); setTimeout(() => document.getElementById("treatment")?.scrollIntoView({ behavior: "smooth" }), 80); }}
              className="bg-red text-white font-mono text-[11px] uppercase tracking-[0.18em] px-8 py-4 hover:bg-ink transition-colors"
            >
              generate my ats-safe resume ↓
            </button>
            <button onClick={reset} className="tlink font-mono text-[11px] uppercase tracking-[0.18em] cursor-pointer">
              diagnose another
            </button>
          </div>
          <p className="no-print label !text-[10px] mt-6">
            a heuristic checkup, not a guarantee — but exactly what real ats filters screen for
          </p>

          {/* ---- treatment ---- */}
          {showResume && resumeData && (
            <div id="treatment" className="scroll-mt-8 mt-16 md:mt-24">
              <p className="label">treatment complete</p>
              <h3 className="font-bold lowercase leading-[0.9] tracking-[-0.04em] text-5xl md:text-7xl mt-6">
                cured<span className="text-red">.</span>
              </h3>
              <p className="text-mute mt-5 max-w-xl text-[15px] leading-relaxed">
                We rebuilt your resume into a clean, single-column, ATS-safe format.
                Click any text to tweak it, then print to PDF.
              </p>

              {missingList.length > 0 && missingOpen && (
                <div className="no-print border border-ink px-6 py-6 md:px-8 mt-8 mb-2 max-w-3xl">
                  <p className="label !text-ink">missing details — optional</p>
                  <p className="mt-3 text-[15px] leading-relaxed text-mute max-w-xl">
                    We couldn't find{" "}
                    {missingList.length > 1
                      ? missingList.slice(0, -1).map((f) => f.label.toLowerCase()).join(", ") +
                        " and " +
                        missingList[missingList.length - 1].label.toLowerCase()
                      : missingList[0].label.toLowerCase()}{" "}
                    in your resume. Type {missingList.length > 1 ? "them" : "it"} below and we'll
                    add {missingList.length > 1 ? "them" : "it"} to your treated resume — or leave{" "}
                    {missingList.length > 1 ? "them" : "it"} blank and carry on without.
                  </p>
                  <div className="mt-6 space-y-5">
                    {missingList.map((f) => (
                      <div key={f.key}>
                        <label className="label block mb-2">{f.label}</label>
                        <input
                          value={provided[f.key] || ""}
                          onChange={(e) => setProvided({ ...provided, [f.key]: e.target.value })}
                          placeholder={f.placeholder}
                          className="w-full bg-transparent border-b border-line focus:border-ink focus:outline-none py-2.5 text-[15px] placeholder:text-faint"
                        />
                        {f.key === "github" && (
                          <p className="text-sm text-mute mt-1.5">
                            not from a tech background? skip this one — no problem.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-8 gap-y-3 mt-7">
                    <button
                      onClick={applyProvided}
                      className="bg-ink text-white font-mono text-[11px] uppercase tracking-[0.18em] px-7 py-3.5 hover:bg-red transition-colors cursor-pointer"
                    >
                      add to my resume →
                    </button>
                    <button
                      onClick={() => setMissingOpen(false)}
                      className="tlink font-mono text-[11px] uppercase tracking-[0.18em] cursor-pointer"
                    >
                      skip — continue without
                    </button>
                  </div>
                </div>
              )}

              <div className="no-print flex flex-wrap gap-x-8 gap-y-3 mt-8 mb-10 font-mono text-[11px] uppercase tracking-[0.18em]">
                <button onClick={printResume} className="bg-ink text-white px-7 py-3.5 hover:bg-red transition-colors cursor-pointer">
                  print / save as pdf
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
                  className="tlink cursor-pointer"
                >
                  download .txt
                </button>
                <button
                  onClick={() => { navigator.clipboard?.writeText(resumeToText(resumeData)); }}
                  className="tlink cursor-pointer"
                >
                  copy text
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
