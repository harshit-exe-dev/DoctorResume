// The "treated" resume: ruthlessly clean, single column, standard headings,
// no tables, no graphics, no columns — everything an ATS parser loves.
// Links from the patient's original resume are carried over as real,
// clickable links (and they print as visible URLs).

function withProto(u) {
  return /^https?:\/\//i.test(u) ? u : "https://" + u;
}

function shortUrl(u) {
  return u.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");
}

// Turns raw URLs (and bare domains like bumart.vercel.app) in text into links.
// A bare two-label word like "Socket.io" (a library name, not a link) is
// left alone: without a protocol it needs a path or 3+ labels to count.
const TLDS = "(?:com|io|app|dev|in|org|net|edu|gov|co|ai|tech|me|site|link|page|xyz)";
const URL_SPLIT_RE = new RegExp(
  `(https?://(?:[a-zA-Z0-9-]+\\.)+${TLDS}(?:/[^\\s)]*)?|(?:[a-zA-Z0-9-]+\\.){2,}${TLDS}(?:/[^\\s)]*)?|(?:[a-zA-Z0-9-]+\\.)+${TLDS}/[^\\s)]+)`,
  "g"
);

function linkify(text) {
  return String(text)
    .split(URL_SPLIT_RE)
    .map((part, i) =>
      i % 2 === 1 ? (
        <a
          key={i}
          href={withProto(part)}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-[#999] underline-offset-2 break-all"
        >
          {part}
        </a>
      ) : (
        part
      )
    );
}

function SectionTitle({ children }) {
  return (
    <h2 className="font-report text-[13px] print:text-[10.5px] font-semibold uppercase tracking-[0.22em] text-ink border-b-2 border-ink pb-1.5 print:pb-1 mb-3 print:mb-1.5 mt-7 print:mt-3 first:mt-0 print:first:mt-0">
      {children}
    </h2>
  );
}

function Entry({ e }) {
  return (
    <div className="mb-4 print:mb-2">
      <p className="text-[14.5px] print:text-[11px] font-bold">
        {e.role}
        {e.org ? <span className="font-normal"> — {e.org}</span> : null}
        {e.link ? (
          <a
            href={withProto(e.link)}
            target="_blank"
            rel="noreferrer"
            className="font-normal text-[11px] print:text-[9px] text-[#555] ml-2 align-middle no-underline hover:underline"
            style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
          >
            ↗ {shortUrl(e.link)}
          </a>
        ) : null}
      </p>
      {e.dates && (
        <p
          className="text-[12.5px] print:text-[9.5px] text-[#555] italic"
          style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
        >
          {e.dates}
        </p>
      )}
      {e.extra && <p className="text-[13px] print:text-[10px] text-[#333] mt-0.5">{linkify(e.extra)}</p>}
      {e.bullets.length > 0 && (
        <ul className="mt-1.5 print:mt-1 space-y-1 print:space-y-0.5">
          {e.bullets.map((b, j) => (
            <li key={j} className="text-[13.5px] print:text-[10.5px] leading-relaxed print:leading-[1.4] text-[#222] pl-4 relative">
              <span className="absolute left-0">•</span>
              {linkify(b)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const BODY = "text-[13.5px] print:text-[10.5px] leading-relaxed print:leading-[1.4] text-[#222]";

export default function ResumeDoc({ data }) {
  const c = data.contact;
  const bits = [];
  if (c.email)
    bits.push({
      key: "email",
      node: (
        <a href={`mailto:${c.email}`} className="underline decoration-[#999] underline-offset-2">
          {c.email}
        </a>
      ),
    });
  if (c.phone) bits.push({ key: "phone", node: c.phone });
  if (c.linkedin)
    bits.push({
      key: "linkedin",
      node: (
        <a
          href={withProto(c.linkedin)}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-[#999] underline-offset-2"
        >
          {shortUrl(c.linkedin)}
        </a>
      ),
    });
  if (c.github)
    bits.push({
      key: "github",
      node: (
        <a
          href={withProto(c.github)}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-[#999] underline-offset-2"
        >
          {shortUrl(c.github)}
        </a>
      ),
    });
  if (c.location) bits.push({ key: "loc", node: c.location });

  return (
    <div className="max-w-3xl mx-auto">
      <p className="no-print text-center label mb-4">✎ click any text below to edit it before printing</p>
      <div
        id="resume-sheet"
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        className="bg-white text-[#1a1a1a] border border-line px-10 py-12 md:px-14 print:px-0 print:py-0 focus:outline-none"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        <h1 className="text-[32px] print:text-[22px] font-bold tracking-tight leading-none">{data.name}</h1>
        {data.headline && <p className="text-[15px] print:text-[11.5px] mt-1.5 text-[#444]">{data.headline}</p>}
        {bits.length > 0 && (
          <p
            className="text-[12.5px] print:text-[10px] mt-2.5 print:mt-2 text-[#333] break-words"
            style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
          >
            {bits.map((b, i) => (
              <span key={b.key}>
                {i > 0 && <span className="text-[#aaa]"> | </span>}
                {b.node}
              </span>
            ))}
          </p>
        )}

        {data.summary && (
          <>
            <SectionTitle>Summary</SectionTitle>
            <p className={BODY}>{data.summary}</p>
          </>
        )}

        {data.skills.length > 0 && (
          <>
            <SectionTitle>Skills</SectionTitle>
            <p className={BODY} style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
              {data.skills.join(", ")}
            </p>
          </>
        )}

        {data.experience.length > 0 && (
          <>
            <SectionTitle>Experience</SectionTitle>
            {data.experience.map((e, i) => (
              <Entry key={i} e={e} />
            ))}
          </>
        )}

        {data.projects.length > 0 && (
          <>
            <SectionTitle>Projects</SectionTitle>
            {data.projects.map((e, i) => (
              <Entry key={i} e={e} />
            ))}
          </>
        )}

        {data.education.length > 0 && (
          <>
            <SectionTitle>Education</SectionTitle>
            {data.education.map((line, i) => (
              <p key={i} className={BODY}>
                {linkify(line)}
              </p>
            ))}
          </>
        )}

        {data.coursework && data.coursework.length > 0 && (
          <>
            <SectionTitle>Relevant Coursework</SectionTitle>
            <p className={BODY}>{data.coursework.join(", ")}</p>
          </>
        )}
      </div>
      <p className="no-print text-center label mt-5">single column · standard headings · zero graphics — parser-approved</p>
    </div>
  );
}
