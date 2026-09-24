function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "admit",
      body: "Drop in your PDF, DOCX or pasted text and tell us the role you're targeting. Takes ten seconds, no account, no upload — it never leaves your browser.",
    },
    {
      n: "02",
      title: "diagnose",
      body: "The doctor runs an 8-point inspection: contact info, file health, length, sections, keyword bloodwork, impact language, polish and ATS structure.",
    },
    {
      n: "03",
      title: "prescribe",
      body: "Get a prioritized prescription of fixes — then one click generates a clean, single-column, ATS-friendly rewrite of your resume.",
    },
  ];
  return (
    <section id="how" className="max-w-6xl mx-auto px-5 md:px-8 py-20 md:py-28 scroll-mt-6">
      <p className="label">02 — process</p>
      <h2 className="font-bold lowercase leading-[0.9] tracking-[-0.04em] text-5xl md:text-7xl mt-6">
        triage in three steps.
      </h2>
      <div className="grid md:grid-cols-3 gap-10 mt-12 border-t border-ink pt-2">
        {steps.map((s) => (
          <div key={s.n} className="pt-8 border-t border-line md:border-t-0 md:pt-8">
            <p className="font-mono text-sm text-accent tabular">{s.n}</p>
            <h3 className="text-2xl font-semibold tracking-tight lowercase mt-3">{s.title}</h3>
            <p className="text-mute mt-3 leading-relaxed text-[15px]">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const CASES = [
  { t: "tables & text boxes", d: "Parsers read left-to-right, top-to-bottom. Tables get scrambled into word soup — your experience ends up under your name." },
  { t: "photos, icons & graphics", d: "The ATS is blind to images. Anything inside a graphic — skills, logos, charts — simply doesn't exist to it." },
  { t: "headers & footers", d: "Many parsers skip them entirely. Contact info hiding in a header is contact info the recruiter never sees." },
  { t: "scanned / image pdfs", d: "A photo of your resume is not a resume. Zero extractable text means instant rejection before a human ever looks." },
  { t: "missing keywords", d: "Recruiters filter by skills first. No keyword match, no interview — even if you'd be perfect for the job." },
  { t: "walls of text", d: "No bullets, no sections, 3 pages of paragraphs. Humans skim for 7 seconds; parsers choke on the structure." },
];

function Intel() {
  return (
    <section id="intel" className="max-w-6xl mx-auto px-5 md:px-8 py-20 md:py-28 scroll-mt-6">
      <p className="label">03 — case files</p>
      <h2 className="font-bold lowercase leading-[0.9] tracking-[-0.04em] text-5xl md:text-7xl mt-6 max-w-3xl">
        know your enemy: the ats.
      </h2>
      <p className="text-mute mt-6 max-w-xl leading-relaxed text-[15px]">
        Roughly 3 out of 4 resumes are rejected by software before a human sees them.
        These are the usual suspects the doctor screens for in every checkup.
      </p>
      <div className="grid md:grid-cols-3 gap-x-10 gap-y-0 mt-12 border-t border-ink">
        {CASES.map((c, i) => (
          <div key={c.t} className="py-7 border-b border-line">
            <p className="font-mono text-[11px] text-accent tabular">{String(i + 1).padStart(2, "0")}</p>
            <h3 className="text-xl font-semibold tracking-tight lowercase mt-2">{c.t}</h3>
            <p className="text-mute mt-2 leading-relaxed text-[15px]">{c.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="no-print border-t border-ink mt-8">
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-[13px]">
        <div>
          <p className="font-semibold tracking-tight text-[15px]">
            doctorresume<sup className="text-accent">®</sup>
          </p>
          <p className="label mt-3">the resume clinic</p>
        </div>
        <div className="flex flex-col gap-1.5 text-mute">
          <a href="#clinic" className="hover:text-ink w-fit">the clinic</a>
          <a href="#how" className="hover:text-ink w-fit">how it works</a>
          <a href="#intel" className="hover:text-ink w-fit">ats intel</a>
        </div>
        <div className="flex flex-col gap-1.5 text-mute">
          <a href="https://github.com/harshit-exe-dev" target="_blank" rel="noreferrer" className="hover:text-ink w-fit">
            built by harshit bharti
          </a>
          <span className="text-faint">not medical advice.</span>
          <span className="text-faint">solid career advice.</span>
        </div>
        <div className="md:text-right">
          <a href="#clinic" className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
            ↓ book a checkup
          </a>
        </div>
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
