import Ekg, { Cross } from "./Ekg";

const SYMPTOMS = [
  "no keywords detected",
  "three pages long",
  "missing contact info",
  "zero measurable results",
  "tables the ATS can't read",
  "buzzword overdose",
  "no skills section",
  "scanned pdf syndrome",
];

function Marquee() {
  const row = [...SYMPTOMS, ...SYMPTOMS];
  return (
    <div className="overflow-hidden bg-coral text-cream border-y-2 border-ink py-2.5 -rotate-1 scale-[1.02] my-2">
      <div className="marquee-track flex whitespace-nowrap w-max">
        {[0, 1].map((half) => (
          <div key={half} className="flex shrink-0">
            {row.map((s, i) => (
              <span key={`${half}-${i}`} className="mx-5 font-report text-sm uppercase tracking-widest flex items-center gap-5">
                {s} <Cross className="w-3 h-3 opacity-70" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <header className="relative overflow-hidden">
      {/* nav */}
      <nav className="no-print relative z-20 max-w-6xl mx-auto flex items-center justify-between px-5 py-4">
        <a href="#top" className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-lg bg-coral text-cream grid place-items-center shadow-[3px_3px_0_0_var(--color-ink)]">
            <Cross className="w-5 h-5" />
          </span>
          <span className="font-display font-black text-xl tracking-tight">
            Doctor<span className="text-coral">Resume</span>
          </span>
        </a>
        <div className="hidden md:flex items-center gap-7 font-report text-xs uppercase tracking-widest text-inksoft">
          <a href="#clinic" className="hover:text-coral transition-colors">The Clinic</a>
          <a href="#how" className="hover:text-coral transition-colors">How it works</a>
          <a href="#intel" className="hover:text-coral transition-colors">ATS intel</a>
        </div>
        <a
          href="#clinic"
          className="bg-ink text-cream font-report text-xs uppercase tracking-widest px-5 py-3 rounded-full hover:bg-coral transition-colors shadow-[3px_3px_0_0_rgba(28,36,32,0.25)]"
        >
          Admit your resume
        </a>
      </nav>

      {/* hero body */}
      <div className="relative z-10 max-w-6xl mx-auto px-5 pt-10 pb-16 md:pt-16 md:pb-24 grid md:grid-cols-[1.15fr_0.85fr] gap-12 items-center">
        <div>
          <p className="font-report text-xs uppercase tracking-[0.25em] text-scrubdark flex items-center gap-2 mb-6">
            <span className="w-2.5 h-2.5 rounded-full bg-coral pulse-dot inline-block" />
            The resume clinic — now receiving patients
          </p>
          <h1 className="font-display font-black text-5xl md:text-7xl leading-[0.95] tracking-tight">
            Your resume
            <br />
            called in <em className="text-coral">sick.</em>
          </h1>
          <p className="mt-6 text-lg text-inksoft max-w-md leading-relaxed">
            DoctorResume X-rays your resume for everything applicant tracking
            systems hate, gives it a health score, and writes the prescription —
            including a brand-new ATS-friendly resume.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="#clinic"
              className="bg-scrub text-cream px-7 py-4 rounded-full font-semibold hover:bg-scrubdark transition-colors shadow-[4px_4px_0_0_var(--color-ink)]"
            >
              Admit your resume →
            </a>
            <a
              href="#clinic"
              onClick={() => window.dispatchEvent(new CustomEvent("doctorresume:sample"))}
              className="suture px-7 py-4 rounded-full font-semibold hover:border-coral hover:text-coral transition-colors bg-cream"
            >
              See a sample diagnosis
            </a>
          </div>
          <p className="mt-6 font-report text-xs text-inksoft uppercase tracking-widest">
            ✚ runs 100% in your browser &nbsp;·&nbsp; nothing uploaded &nbsp;·&nbsp; free forever
          </p>
        </div>

        {/* floating chart cards */}
        <div className="relative h-[420px] hidden md:block" aria-hidden="true">
          <div className="floaty absolute top-2 left-4 w-64 bg-cream rounded-xl border-2 border-ink p-5 shadow-[6px_6px_0_0_var(--color-ink)]" style={{ "--fl-rot": "-4deg" }}>
            <p className="font-report text-[10px] uppercase tracking-[0.2em] text-inksoft border-b border-line pb-2 mb-3">Patient chart</p>
            <p className="font-display font-bold text-lg">Aarav Mehta</p>
            <p className="font-report text-xs text-inksoft">applicant · full-stack role</p>
            <div className="flex items-end justify-between mt-3">
              <p className="font-report text-5xl font-semibold tabular text-coral">54</p>
              <p className="font-report text-[10px] uppercase tracking-widest text-inksoft text-right">ats health<br />score / 100</p>
            </div>
            <Ekg className="w-full h-10 mt-2 text-coral" fast />
          </div>

          <div className="floaty absolute bottom-16 right-0 w-60 bg-cream rounded-xl border-2 border-ink p-5 shadow-[6px_6px_0_0_var(--color-ink)]" style={{ "--fl-rot": "3deg", animationDelay: "1.2s" }}>
            <p className="font-display italic font-semibold text-2xl text-scrubdark">℞</p>
            <p className="font-report text-[10px] uppercase tracking-[0.2em] text-inksoft mt-1 mb-2">Prescription</p>
            <ul className="text-sm space-y-1.5 text-ink">
              <li>→ add numbers to bullets</li>
              <li>→ kill the tables</li>
              <li>→ feed it keywords</li>
            </ul>
            <p className="mt-3 font-report text-[10px] text-inksoft uppercase tracking-widest">refills: unlimited</p>
          </div>

          <div className="stamp absolute top-40 left-56 border-4 border-coral text-coral font-report font-semibold uppercase tracking-[0.2em] px-4 py-2 rounded-md text-lg bg-cream/60">
            Critical
          </div>

          <p className="absolute -bottom-4 -left-6 font-display font-black text-[11rem] leading-none text-ink/5 select-none">Rx</p>
        </div>
      </div>

      <Marquee />

      {/* vitals strip */}
      <div className="max-w-6xl mx-auto px-5 py-10 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          ["8-point", "full-body inspection"],
          ["100%", "private — runs locally"],
          ["0", "servers see your resume"],
          ["2 min", "from upload to prescription"],
        ].map(([big, small]) => (
          <div key={small} className="bg-cream border-2 border-ink rounded-xl px-5 py-4 shadow-[4px_4px_0_0_var(--color-ink)]">
            <p className="font-display font-black text-3xl">{big}</p>
            <p className="font-report text-[11px] uppercase tracking-widest text-inksoft mt-1">{small}</p>
          </div>
        ))}
      </div>
    </header>
  );
}
