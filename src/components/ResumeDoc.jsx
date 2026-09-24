// The "treated" resume: classic single-column industry pattern —
// centered name + contact line, Education → Technical Skills → Coursework →
// Experience (work, if any) → Projects → Leadership, dates right-aligned on
// title lines. Links from the patient's original resume are carried over as
// real, clickable links.

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
          className="r-link underline decoration-[#999] underline-offset-2 break-all"
        >
          {part}
        </a>
      ) : (
        part
      )
    );
}

const SANS = "Arial, Helvetica, sans-serif";

function SectionTitle({ children }) {
  return (
    <h2 className="r-sec font-report text-[13px] font-semibold uppercase tracking-[0.22em] text-ink border-b border-ink pb-1.5 mb-3 mt-7 first:mt-0">
      {children}
    </h2>
  );
}

function Entry({ e }) {
  return (
    <div className="r-entry mb-4">
      <div className="r-entry-head flex justify-between items-baseline gap-4">
        <p className="r-entry-title text-[14.5px] font-bold leading-snug">
          {e.role}
          {e.org ? <span className="font-normal"> | {e.org}</span> : null}
          {e.link ? (
            <a
              href={withProto(e.link)}
              target="_blank"
              rel="noreferrer"
              className="r-extlink font-normal text-[11px] text-[#555] ml-2 align-baseline no-underline hover:underline"
              style={{ fontFamily: SANS }}
            >
              ↗ {shortUrl(e.link)}
            </a>
          ) : null}
        </p>
        {e.dates ? (
          <p className="r-dates text-[12.5px] text-[#333] whitespace-nowrap" style={{ fontFamily: SANS }}>
            {e.dates}
          </p>
        ) : null}
      </div>
      {e.extra && <p className="r-extra text-[13px] text-[#333] mt-0.5">{linkify(e.extra)}</p>}
      {e.bullets.length > 0 && (
        <ul className="r-bullets mt-1.5 space-y-1">
          {e.bullets.map((b, j) => (
            <li key={j} className="text-[13.5px] leading-relaxed text-[#222] pl-4 relative">
              <span className="r-bmark absolute left-0">•</span>
              {linkify(b)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Education lines often carry a trailing date range or CGPA — split those
// right, like the industry pattern (university left, dates right).
function splitEduLine(line) {
  const t = String(line);
  let m =
    t.match(/^(.*?)\s{2,}(\d{4}\s*[-–]\s*(?:\d{4}|Present))$/) ||
    t.match(/^(.*?)(\d{4}\s*[-–]\s*(?:\d{4}|Present))$/);
  if (m && m[1].trim()) return { left: m[1].trim(), right: m[2].trim() };
  m = t.match(/^(.*?)(Current CGPA:.*)$/i);
  if (m && m[1].trim()) return { left: m[1].trim(), right: m[2].trim() };
  return { left: t };
}

function Education({ lines }) {
  return (
    <div className="r-edu">
      {lines.map((line, i) => {
        const { left, right } = splitEduLine(line);
        return (
          <div key={i} className="r-edu-line flex justify-between items-baseline gap-4">
            <p className={`text-[13.5px] leading-relaxed text-[#222] ${i === 0 ? "font-bold" : ""}`}>
              {linkify(left)}
            </p>
            {right ? (
              <p className="text-[12.5px] text-[#333] whitespace-nowrap" style={{ fontFamily: SANS }}>
                {right}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function Coursework({ items }) {
  if (!items.length) return null;
  const m = items[0].match(/^(.*?)\s*:\s*(.+)$/);
  return (
    <p className="r-coursework text-[13.5px] leading-relaxed text-[#222]">
      {m ? (
        <>
          <strong>{m[1].trim()}: </strong>
          {[m[2].trim(), ...items.slice(1)].join(", ")}
        </>
      ) : (
        items.join(", ")
      )}
    </p>
  );
}

const BODY = "r-body text-[13.5px] leading-relaxed text-[#222]";

export default function ResumeDoc({ data }) {
  const c = data.contact;
  // Industry order: location • phone • email • LinkedIn • GitHub
  const bits = [];
  if (c.location) bits.push({ key: "loc", node: c.location });
  if (c.phone) bits.push({ key: "phone", node: c.phone });
  if (c.email)
    bits.push({
      key: "email",
      node: (
        <a href={`mailto:${c.email}`} className="r-link underline decoration-[#999] underline-offset-2">
          {c.email}
        </a>
      ),
    });
  if (c.linkedin)
    bits.push({
      key: "linkedin",
      node: (
        <a href={withProto(c.linkedin)} target="_blank" rel="noreferrer" className="r-link">
          LinkedIn
        </a>
      ),
    });
  if (c.github)
    bits.push({
      key: "github",
      node: (
        <a href={withProto(c.github)} target="_blank" rel="noreferrer" className="r-link">
          GitHub
        </a>
      ),
    });

  const exp = data.experience || [];
  const expLabel = data.experienceLabel || "Experience";
  const isLeadership = expLabel !== "Experience";

  return (
    <div className="max-w-3xl mx-auto">
      <p className="no-print text-center label mb-4">✎ click any text below to edit it before printing</p>
      <div
        id="resume-sheet"
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        className="bg-white text-[#1a1a1a] border border-line px-10 py-12 md:px-14 focus:outline-none"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        <h1 className="r-name text-[26px] font-bold tracking-tight leading-tight text-center">{data.name}</h1>
        {bits.length > 0 && (
          <p className="r-contact text-[12.5px] mt-2 text-[#333] break-words text-center" style={{ fontFamily: SANS }}>
            {bits.map((b, i) => (
              <span key={b.key}>
                {i > 0 && <span className="text-[#aaa]"> • </span>}
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

        {data.education.length > 0 && (
          <>
            <SectionTitle>Education</SectionTitle>
            <Education lines={data.education} />
          </>
        )}

        {data.skills.length > 0 && (
          <>
            <SectionTitle>Technical Skills</SectionTitle>
            <p className={BODY} style={{ fontFamily: SANS }}>
              {data.skills.join(", ")}
            </p>
          </>
        )}

        {data.coursework && data.coursework.length > 0 && (
          <>
            <SectionTitle>Relevant Coursework</SectionTitle>
            <Coursework items={data.coursework} />
          </>
        )}

        {exp.length > 0 && !isLeadership && (
          <>
            <SectionTitle>Experience</SectionTitle>
            {exp.map((e, i) => (
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

        {exp.length > 0 && isLeadership && (
          <>
            <SectionTitle>{expLabel}</SectionTitle>
            {exp.map((e, i) => (
              <Entry key={i} e={e} />
            ))}
          </>
        )}
      </div>
      <p className="no-print text-center label mt-5">single column · standard headings · zero graphics — parser-approved</p>
    </div>
  );
}
