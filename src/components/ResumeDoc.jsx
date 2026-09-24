// The "treated" resume: ruthlessly clean, single column, standard headings,
// no tables, no graphics, no columns — everything an ATS parser loves.

function SectionTitle({ children }) {
  return (
    <h2 className="font-report text-[13px] font-semibold uppercase tracking-[0.22em] text-ink border-b-2 border-ink pb-1.5 mb-3 mt-7 first:mt-0">
      {children}
    </h2>
  );
}

export default function ResumeDoc({ data }) {
  const c = data.contact;
  const contactLine = [c.email, c.phone, c.linkedin, c.github, c.location].filter(Boolean).join("  |  ");

  return (
    <div className="max-w-3xl mx-auto">
      <p className="no-print text-center font-report text-[11px] uppercase tracking-widest text-inksoft mb-3">
        ✎ tip — click any text below to edit it before printing
      </p>
      <div
        id="resume-sheet"
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        className="bg-white text-[#1a1a1a] rounded-sm border border-line shadow-[8px_8px_0_0_rgba(28,36,32,0.15)] px-10 py-12 md:px-14 focus:outline-none"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        <h1 className="text-[32px] font-bold tracking-tight leading-none">{data.name}</h1>
        {data.headline && <p className="text-[15px] mt-1.5 text-[#444]">{data.headline}</p>}
        {contactLine && (
          <p className="text-[12.5px] mt-2.5 text-[#333] break-words" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
            {contactLine}
          </p>
        )}

        {data.summary && (
          <>
            <SectionTitle>Summary</SectionTitle>
            <p className="text-[13.5px] leading-relaxed text-[#222]">{data.summary}</p>
          </>
        )}

        {data.skills.length > 0 && (
          <>
            <SectionTitle>Skills</SectionTitle>
            <p className="text-[13.5px] leading-relaxed text-[#222]" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
              {data.skills.join(", ")}
            </p>
          </>
        )}

        {data.experience.length > 0 && (
          <>
            <SectionTitle>Experience</SectionTitle>
            {data.experience.map((e, i) => (
              <div key={i} className="mb-4">
                <p className="text-[14.5px] font-bold">
                  {e.role}{e.org ? <span className="font-normal"> — {e.org}</span> : null}
                </p>
                {e.dates && <p className="text-[12.5px] text-[#555] italic" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>{e.dates}</p>}
                {e.extra && <p className="text-[13px] text-[#333] mt-0.5">{e.extra}</p>}
                {e.bullets.length > 0 && (
                  <ul className="mt-1.5 space-y-1">
                    {e.bullets.map((b, j) => (
                      <li key={j} className="text-[13.5px] leading-relaxed text-[#222] pl-4 relative">
                        <span className="absolute left-0">•</span>{b}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </>
        )}

        {data.projects.length > 0 && (
          <>
            <SectionTitle>Projects</SectionTitle>
            {data.projects.map((e, i) => (
              <div key={i} className="mb-4">
                <p className="text-[14.5px] font-bold">
                  {e.role}{e.org ? <span className="font-normal"> — {e.org}</span> : null}
                </p>
                {e.dates && <p className="text-[12.5px] text-[#555] italic" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>{e.dates}</p>}
                {e.extra && <p className="text-[13px] text-[#333] mt-0.5">{e.extra}</p>}
                {e.bullets.length > 0 && (
                  <ul className="mt-1.5 space-y-1">
                    {e.bullets.map((b, j) => (
                      <li key={j} className="text-[13.5px] leading-relaxed text-[#222] pl-4 relative">
                        <span className="absolute left-0">•</span>{b}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </>
        )}

        {data.education.length > 0 && (
          <>
            <SectionTitle>Education</SectionTitle>
            {data.education.map((line, i) => (
              <p key={i} className="text-[13.5px] leading-relaxed text-[#222]">{line}</p>
            ))}
          </>
        )}
      </div>
      <p className="no-print text-center font-report text-[11px] uppercase tracking-widest text-inksoft mt-4">
        single column · standard headings · zero graphics — parser-approved
      </p>
    </div>
  );
}
