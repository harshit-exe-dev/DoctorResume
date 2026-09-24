function Nav() {
  return (
    <nav className="no-print">
      {/* thin red rule, like the reference */}
      <div className="h-[3px] bg-red" />
      <div className="max-w-6xl mx-auto px-5 md:px-8 pt-6 pb-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-[13px]">
        <div>
          <a href="#top" className="font-semibold tracking-tight text-[15px]">
            doctorresume<sup className="text-red">®</sup>
          </a>
          <p className="label mt-3">the resume clinic</p>
        </div>
        <div className="flex flex-col gap-1.5 text-mute">
          <a href="#clinic" className="hover:text-ink w-fit">the clinic</a>
          <a href="#how" className="hover:text-ink w-fit">how it works</a>
          <a href="#intel" className="hover:text-ink w-fit">ats intel</a>
        </div>
        <div className="flex flex-col gap-1.5 text-mute">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("doctorresume:sample"))}
            className="hover:text-ink w-fit text-left cursor-pointer"
          >
            sample diagnosis
          </button>
          <a href="https://github.com/harshit-exe-dev/DoctorResume" target="_blank" rel="noreferrer" className="hover:text-ink w-fit">
            github
          </a>
        </div>
        <div className="md:text-right">
          <a href="#clinic" className="font-mono text-[11px] uppercase tracking-[0.18em] text-red">
            ↓ admit your resume
          </a>
        </div>
      </div>
    </nav>
  );
}

export default function Hero() {
  return (
    <header>
      <Nav />
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        {/* red square accent */}
        <div className="w-3 h-3 bg-red mb-8" />
        <h1 className="font-bold lowercase leading-[0.88] tracking-[-0.045em] text-[19vw] md:text-[10.5rem]">
          your resume,
          <br />
          diagnosed.
        </h1>

        <div className="grid md:grid-cols-2 gap-8 mt-12 md:mt-16 pb-16 md:pb-24">
          <p className="label !text-ink max-w-[220px]">
            upload your resume.
            <br />
            get an ats health score,
            <br />
            a full diagnosis,
            <br />
            and a cured rewrite.
          </p>
          <div className="md:justify-self-end max-w-sm">
            <p className="text-[15px] leading-relaxed text-mute">
              DoctorResume x-rays your resume for everything applicant tracking
              systems reject — then writes the prescription, including a brand-new
              ATS-friendly resume. Runs entirely in your browser. Nothing uploaded.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <a
                href="#clinic"
                className="bg-ink text-white font-mono text-[11px] uppercase tracking-[0.18em] px-7 py-4 w-fit hover:bg-red transition-colors"
              >
                start the checkup ↓
              </a>
              <button
                onClick={() => {
                  document.getElementById("clinic")?.scrollIntoView({ behavior: "smooth" });
                  window.dispatchEvent(new CustomEvent("doctorresume:sample"));
                }}
                className="font-mono text-[11px] uppercase tracking-[0.18em] text-red w-fit cursor-pointer"
              >
                ↓ or see a sample diagnosis
              </button>
            </div>
          </div>
        </div>

        {/* vitals strip — hairline table */}
        <div className="no-print grid grid-cols-2 md:grid-cols-4 border-t border-l border-line">
          {[
            ["8-point", "full-body inspection"],
            ["100%", "private — runs locally"],
            ["0", "servers see your resume"],
            ["2 min", "upload to prescription"],
          ].map(([big, small]) => (
            <div key={small} className="border-b border-r border-line px-5 py-6">
              <p className="text-4xl font-semibold tracking-tight tabular">{big}</p>
              <p className="label mt-2">{small}</p>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}
