import Ekg, { Cross } from "./Ekg";

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Admit",
      body: "Drop in your PDF, DOCX or pasted text and tell us the role you're targeting. Takes ten seconds, no account, no upload — it never leaves your browser.",
    },
    {
      n: "02",
      title: "Diagnose",
      body: "The doctor runs an 8-point inspection: contact info, file health, length, sections, keyword bloodwork, impact language, polish and ATS structure.",
    },
    {
      n: "03",
      title: "Prescribe",
      body: "Get a prioritized prescription of fixes — then one click generates a clean, single-column, ATS-friendly rewrite of your resume.",
    },
  ];
  return (
    <section id="how" className="max-w-6xl mx-auto px-5 py-16 md:py-20 scroll-mt-6">
      <h2 className="font-display font-black text-4xl md:text-5xl tracking-tight text-center">Triage in <em className="text-scrub">three steps</em></h2>
      <div className="grid md:grid-cols-3 gap-5 mt-10">
        {steps.map((s, i) => (
          <div key={s.n} className={`bg-cream border-2 border-ink rounded-2xl p-7 shadow-[5px_5px_0_0_var(--color-ink)] ${i === 1 ? "md:-rotate-1" : i === 2 ? "md:rotate-1" : ""}`}>
            <p className="font-report text-sm text-coral font-semibold tracking-widest">{s.n}</p>
            <h3 className="font-display font-black text-3xl mt-2">{s.title}</h3>
            <p className="text-inksoft mt-3 leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const CASES = [
  { t: "Tables & text boxes", d: "Parsers read left-to-right, top-to-bottom. Tables get scrambled into word soup — your experience ends up under your name." },
  { t: "Photos, icons & graphics", d: "The ATS is blind to images. Anything inside a graphic — skills, logos, charts — simply doesn't exist to it." },
  { t: "Headers & footers", d: "Many parsers skip them entirely. Contact info hiding in a header is contact info the recruiter never sees." },
  { t: "Scanned / image PDFs", d: "A photo of your resume is not a resume. Zero extractable text means instant rejection before a human ever looks." },
  { t: "Missing keywords", d: "Recruiters filter by skills first. No keyword match, no interview — even if you'd be perfect for the job." },
  { t: "Walls of text", d: "No bullets, no sections, 3 pages of paragraphs. Humans skim for 7 seconds; parsers choke on the structure." },
];

function Intel() {
  return (
    <section id="intel" className="bg-ink text-cream py-16 md:py-24 scroll-mt-6">
      <div className="max-w-6xl mx-auto px-5">
        <p className="font-report text-xs uppercase tracking-[0.25em] text-coral mb-4">Case files</p>
        <h2 className="font-display font-black text-4xl md:text-5xl tracking-tight max-w-2xl">
          Know your enemy: <em className="text-coral">the ATS</em>
        </h2>
        <p className="text-cream/70 mt-4 max-w-2xl leading-relaxed">
          Roughly 3 out of 4 resumes are rejected by software before a human sees them.
          These are the usual suspects the doctor screens for in every checkup.
        </p>
        <div className="grid md:grid-cols-3 gap-5 mt-10">
          {CASES.map((c) => (
            <div key={c.t} className="border border-cream/20 rounded-2xl p-6 hover:border-coral transition-colors bg-cream/[0.03]">
              <Cross className="w-5 h-5 text-coral mb-4" />
              <h3 className="font-display font-bold text-xl">{c.t}</h3>
              <p className="text-cream/65 mt-2 leading-relaxed text-[15px]">{c.d}</p>
            </div>
          ))}
        </div>
        <Ekg className="w-full h-14 text-coral/70 mt-12" />
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t-2 border-ink">
      <div className="max-w-6xl mx-auto px-5 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-coral text-cream grid place-items-center">
            <Cross className="w-4 h-4" />
          </span>
          <div>
            <p className="font-display font-black">Doctor<span className="text-coral">Resume</span></p>
            <p className="font-report text-[11px] uppercase tracking-widest text-inksoft">the resume clinic</p>
          </div>
        </div>
        <p className="text-sm text-inksoft text-center">
          Built by <a href="https://github.com/harshit-exe-dev" className="underline hover:text-coral font-medium text-ink">Harshit Bharti</a>
          <span className="mx-2">·</span>not actual medical advice, but solid career advice
        </p>
        <a href="#clinic" className="bg-ink text-cream font-report text-xs uppercase tracking-widest px-5 py-3 rounded-full hover:bg-coral transition-colors">
          Book a checkup
        </a>
      </div>
    </footer>
  );
}

export default function InfoSections() {
  return (
    <>
      <HowItWorks />
      <Intel />
      <Footer />
    </>
  );
}
