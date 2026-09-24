// File parsing + resume reconstruction.
// PDF via pdfjs-dist (with an "X-ray" pass that counts embedded images),
// DOCX via mammoth, TXT as-is. All local, nothing leaves the browser.

import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import mammoth from "mammoth";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

function itemsToLinesDetailed(items) {
  // pdfjs gives raw text runs with x/y positions but no line breaks.
  // Group runs by their y-coordinate so real resumes keep their lines.
  const rows = [];
  for (const it of items) {
    if (!it.str || !it.str.trim()) continue;
    const y = it.transform ? it.transform[5] : 0;
    let row = rows.find((r) => Math.abs(r.y - y) < 3);
    if (!row) {
      row = { y, items: [] };
      rows.push(row);
    }
    row.items.push(it);
  }
  rows.sort((a, b) => b.y - a.y);
  return rows
    .map((r) => {
      r.items.sort((a, b) => (a.transform ? a.transform[4] : 0) - (b.transform ? b.transform[4] : 0));
      const text = r.items
        .map((i) => i.str)
        .join(" ")
        .replace(/  +/g, " ")
        .trim();
      return { y: r.y, text };
    })
    .filter((r) => r.text);
}

function itemsToLines(items) {
  return itemsToLinesDetailed(items)
    .map((r) => r.text)
    .join("\n");
}

function normalizeUrl(u) {
  return u.toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}

async function parsePdf(buffer) {
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let text = "";
  let imageCount = 0;
  const seenLinks = [];
  const unmatchedLinks = [];
  for (let p = 1; p <= Math.min(pdf.numPages, 5); p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const lineRows = itemsToLinesDetailed(content.items);
    try {
      const ops = await page.getOperatorList();
      const OPS = pdfjsLib.OPS;
      for (let i = 0; i < ops.fnArray.length; i++) {
        const fn = ops.fnArray[i];
        if (fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject || fn === OPS.paintImageMaskXObject) {
          imageCount++;
        }
      }
    } catch {
      /* operator list is best-effort */
    }
    try {
      // Hyperlinks live in annotations, not text runs. Attach each link to
      // its text line so the rebuilt resume carries the same links.
      const annots = await page.getAnnotations();
      for (const a of annots) {
        if (!a || a.subtype !== "Link" || !a.url || !/^https?:\/\//i.test(a.url) || /^mailto:/i.test(a.url)) continue;
        const clean = a.url.split("#")[0].split("?")[0].replace(/\/$/, "");
        const norm = normalizeUrl(clean);
        if (seenLinks.includes(norm)) continue;
        seenLinks.push(norm);
        const ay = a.rect ? a.rect[1] : null;
        let target = null;
        if (ay != null) {
          let best = 12;
          for (const row of lineRows) {
            const d = Math.abs(row.y - ay);
            if (d < best) {
              best = d;
              target = row;
            }
          }
        }
        if (target && !normalizeUrl(target.text).includes(norm)) {
          target.text += " (" + clean + ")";
        } else if (!target) {
          unmatchedLinks.push(clean);
        }
      }
    } catch {
      /* annotations are best-effort */
    }
    text += lineRows.map((r) => r.text).join("\n") + "\n";
    if (unmatchedLinks.length) {
      text += unmatchedLinks.join("\n") + "\n";
      unmatchedLinks.length = 0;
    }
  }
  return { text: text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim(), hasImages: imageCount > 0, pages: pdf.numPages, fileType: "PDF" };
}

async function parseDocx(buffer) {
  const res = await mammoth.extractRawText({ arrayBuffer: buffer });
  return { text: (res.value || "").trim(), hasImages: false, pages: 1, fileType: "DOCX" };
}

async function parseTxt(buffer) {
  const text = new TextDecoder().decode(buffer);
  return { text: text.trim(), hasImages: false, pages: 1, fileType: "TXT" };
}

export async function parseFile(file) {
  const buffer = await file.arrayBuffer();
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return parsePdf(buffer);
  if (name.endsWith(".docx")) return parseDocx(buffer);
  if (name.endsWith(".txt") || name.endsWith(".md")) return parseTxt(buffer);
  throw new Error("Unsupported file type — please upload a PDF, DOCX or TXT.");
}

/* ------------------------------------------------------------------ */
/* Resume reconstruction: turn messy parsed text into a clean structure */
/* ------------------------------------------------------------------ */

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(\+91[\s-]?)?[6-9]\d{9}|\(\d{3}\)\s?\d{3}[-.\s]?\d{4}|\d{3}[-.\s]\d{3}[-.\s]\d{4}/;
const LINKEDIN_RE = /linkedin\.com\/[^\s)]+/i;
const GITHUB_RE = /github\.com\/[^\s)]+/i;
const DATE_RE = /((Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{4})\s*[–—\-to]+\s*((Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{4}|present|current)/i;

function isBullet(line) {
  const t = line.trim();
  return /^[•\-\*▪◦‣○●►◆]\s+/.test(t) || /^\d+[.)]\s+\S/.test(t);
}
function stripBullet(line) {
  return line.trim().replace(/^[•\-\*▪◦‣○●►◆]\s+/, "").replace(/^\d+[.)]\s+/, "").trim();
}

function guessName(lines) {
  for (const raw of lines.slice(0, 6)) {
    const t = raw.trim();
    if (!t || t.length > 42) continue;
    if (EMAIL_RE.test(t) || PHONE_RE.test(t) || /\d{4}/.test(t)) continue;
    if (/^(resume|curriculum vitae|cv)\b/i.test(t)) continue;
    const words = t.split(/\s+/);
    if (words.length >= 2 && words.length <= 4 && /^[A-Za-z][A-Za-z.'-]*(\s+[A-Za-z][A-Za-z.'-]*)+$/.test(t)) {
      return t.replace(/\s+/g, " ");
    }
  }
  return "Your Name";
}

function parseEntries(sectionText) {
  // Split an experience/projects section into entries by date-lines or blank gaps.
  const lines = sectionText.split("\n").map((l) => l.trim());
  const entries = [];
  let cur = null;
  const pushCur = () => {
    if (cur && (cur.title || cur.bullets.length || cur.lines.length)) entries.push(cur);
  };
  for (const line of lines) {
    if (!line) {
      if (cur && cur.bullets.length >= 1 && cur.lines.length > 1) { pushCur(); cur = null; }
      continue;
    }
    // A carried-over hyperlink (parenthesized URL) shouldn't count toward
    // the "short standalone line" heuristic below.
    const bare = line.replace(/https?:\/\/[^\s)]+/g, "").replace(/\(\s*\)/g, " ").replace(/\s{2,}/g, " ").trim();
    if (isBullet(line)) {
      if (!cur) cur = { title: "", dates: "", bullets: [], lines: [] };
      cur.bullets.push(stripBullet(line));
      continue;
    }
    if (DATE_RE.test(line) && line.length < 60) {
      if (!cur) cur = { title: "", dates: "", bullets: [], lines: [] };
      if (!cur.dates) cur.dates = line;
      else { pushCur(); cur = { title: "", dates: line, bullets: [], lines: [] }; }
      continue;
    }
    // A short standalone line after bullets likely starts a new entry.
    // So does any line carrying its own date range (long titles like
    // "Org | Role | Location September 2025 – August 2026").
    const startsNewEntry =
      cur &&
      cur.bullets.length > 0 &&
      bare.length > 0 &&
      !/[.!?]$/.test(bare) &&
      (bare.length < 70 || DATE_RE.test(bare));
    if (startsNewEntry) {
      pushCur();
      cur = { title: line, dates: "", bullets: [], lines: [] };
      continue;
    }
    if (!cur) cur = { title: line, dates: "", bullets: [], lines: [] };
    else if (!cur.title) cur.title = line;
    // A leftover line after bullets is almost always a wrapped bullet
    // continuation — glue it to the last bullet instead of dropping it.
    else if (cur.bullets.length > 0) cur.bullets[cur.bullets.length - 1] += " " + line;
    else cur.lines.push(line);
  }
  pushCur();

  return entries.slice(0, 6).map((e) => {
    let role = e.title, org = "";
    // A link carried over from the original resume (PDF hyperlink) lives on
    // the title line — lift it out so it renders as a real link.
    let link = "";
    const urlM = e.title.match(/https?:\/\/[^\s)]+/);
    if (urlM) {
      link = urlM[0].replace(/[),.]+$/, "");
      role = role.replace(urlM[0], "").replace(/\s{2,}/g, " ").replace(/\s*\(\s*\)\s*/g, " ").trim();
    }
    const m = role.match(/^(.*?)\s+(?:at|@|\||–|—|-)\s+(.*)$/);
    if (m) { role = m[1].trim(); org = m[2].trim(); }
    // Dates trailing the org ("Volunteer | X University September 2025 – August 2026")
    // move to their own dates line.
    let dates = e.dates;
    const dm = !dates && org.match(DATE_RE);
    if (dm) {
      dates = dm[0].trim();
      org = org.replace(dm[0], "").replace(/\s{2,}/g, " ").replace(/\s*[|–—-]\s*$/, "").trim();
    }
    const extra = e.lines.filter((l) => l && !DATE_RE.test(l)).slice(0, 2).join(" ");
    return { role: role || "Role / Project", org, dates, link, bullets: e.bullets.slice(0, 6), extra };
  });
}

export function reconstructResume(text) {
  // The treatment applies its own prescription: drop the
  // "References available upon request" line instead of carrying it over.
  text = text
    .split("\n")
    .filter((l) => !/^\s*references(\s+available)?(\s+upon\s+request)?\s*\.?\s*$/i.test(l))
    .join("\n");
  const lines = text.split("\n");
  const name = guessName(lines);

  // Standalone URL lines (from PDF link annotations): capture for contact,
  // then keep them out of the section bodies.
  const urlLines = [];
  const bodyLines = lines.filter((l) => {
    const t = l.trim();
    if (/^https?:\/\/\S+$/i.test(t)) {
      urlLines.push(t);
      return false;
    }
    return true;
  });
  const urlBlob = urlLines.join(" ");

  const headBlock = bodyLines.slice(0, 10).join("\n");
  const email = (headBlock.match(EMAIL_RE) || [""])[0];
  const phone = (headBlock.match(PHONE_RE) || [""])[0].trim();
  const findUrl = (re) => {
    const m = headBlock.match(re) || urlBlob.match(re) || bodyLines.join("\n").match(re);
    return m ? m[0].split("?")[0].replace(/[\/),.]+$/, "") : "";
  };
  const linkedin = findUrl(LINKEDIN_RE);
  const github = findUrl(GITHUB_RE);
  // Prefer the location segment of the contact line itself ("City, State • phone • email").
  const contactLine = bodyLines
    .slice(0, 6)
    .map((l) => l.trim())
    .find((l) => EMAIL_RE.test(l) || PHONE_RE.test(l));
  let location = "";
  if (contactLine) {
    location =
      contactLine
        .split(/[•|]/)
        .map((s) => s.trim())
        .find(
          (s) =>
            /,/.test(s) &&
            !EMAIL_RE.test(s) &&
            !PHONE_RE.test(s) &&
            !/https?:|linkedin|github/i.test(s) &&
            s.length < 48
        ) || "";
  }
  if (!location) {
    location =
      bodyLines
        .slice(0, 10)
        .map((l) => l.trim())
        .find(
          (l) =>
            /,/.test(l) && !EMAIL_RE.test(l) && !PHONE_RE.test(l) && l.length < 48 && !/linkedin|github/i.test(l)
        ) || "";
  }

  // Reuse the section splitter from the engine via a light local copy of patterns.
  const HEADER_PATTERNS = {
    experience: /^(work\s+)?experience|employment(\s+history)?|work history|leadership|volunteer|internships?/i,
    projects: /^(academic|personal|key|selected)?\s*projects?/i,
    education: /^education|academic\s+background|academic\s+qualifications?/i,
    skills: /^(technical\s+)?skills|technologies|tech(nical)?\s+stack|core\s+competencies|tools?\s+and\s+technologies/i,
    summary: /^(professional\s+)?summary|objective|profile|about(\s+me)?/i,
    coursework: /^(relevant\s+)?coursework/i,
  };
  const cleanH = (l) => l.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, "").trim();
  const sections = {};
  let curId = "preamble";
  let curLines = [];
  let experienceLeadership = false;
  const flush = () => {
    const body = curLines.join("\n").trim();
    if (body) sections[curId] = (sections[curId] ? sections[curId] + "\n" : "") + body;
    curLines = [];
  };
  for (const raw of bodyLines) {
    const t = raw.trim();
    const h = cleanH(t);
    let hit = null;
    if (h && h.length <= 48) {
      for (const [id, re] of Object.entries(HEADER_PATTERNS)) if (re.test(h)) { hit = id; break; }
    }
    if (hit) {
      flush();
      curId = hit;
      // Leadership / volunteering content is not job experience — remember its
      // origin so the generated resume labels it honestly (freshers often have
      // no work experience at all, and it must not be dressed up as one).
      if (hit === "experience" && /\bleadership\b|volunteer|extracurricular|involvement|community/i.test(h)) experienceLeadership = true;
    } else curLines.push(raw);
  }
  flush();

  const experience = sections.experience ? parseEntries(sections.experience) : [];
  const projects = sections.projects ? parseEntries(sections.projects) : [];
  const skillsRaw = (sections.skills || "").split("\n").map((l) => l.trim()).filter(Boolean).join(" ");
  const skills = skillsRaw.split(/[,•|]/).map((s) => s.replace(/^[•\-\*]\s*/, "").trim()).filter((s) => s && s.length < 40).slice(0, 24);
  const education = (sections.education || "").split("\n").map((l) => l.trim()).filter((l) => l && !isBullet(l)).slice(0, 4);
  const summary = (sections.summary || "").split("\n").map((l) => l.trim()).filter(Boolean).join(" ").slice(0, 400);
  const courseworkRaw = (sections.coursework || "").split("\n").map((l) => l.trim()).filter(Boolean).join(" ");
  const coursework = courseworkRaw.split(/[,•|]/).map((s) => s.replace(/^[•\-\*]\s*/, "").trim()).filter((s) => s && s.length < 60).slice(0, 12);

  return {
    name,
    headline: "",
    contact: { email, phone, linkedin, github, location },
    summary,
    experience,
    // Honest heading: volunteering / leadership is not job experience.
    // When a fresher has no work history at all, this section is simply omitted.
    experienceLabel: experienceLeadership ? "Leadership & Volunteer Experience" : "Experience",
    projects,
    education,
    coursework,
    skills,
  };
}

export function resumeToText(r) {
  const out = [];
  out.push(r.name.toUpperCase());
  const c = [r.contact.email, r.contact.phone, r.contact.linkedin, r.contact.github, r.contact.location].filter(Boolean);
  if (c.length) out.push(c.join(" | "));
  out.push("");
  if (r.summary) { out.push("SUMMARY", r.summary, ""); }
  if (r.skills.length) { out.push("SKILLS", r.skills.join(", "), ""); }
  if (r.experience.length) {
    out.push((r.experienceLabel || "Experience").toUpperCase());
    for (const e of r.experience) {
      out.push(`${e.role}${e.org ? " — " + e.org : ""}${e.dates ? " | " + e.dates : ""}`);
      if (e.link) out.push(e.link);
      if (e.extra) out.push(e.extra);
      for (const b of e.bullets) out.push("• " + b);
      out.push("");
    }
  }
  if (r.projects.length) {
    out.push("PROJECTS");
    for (const e of r.projects) {
      out.push(`${e.role}${e.org ? " — " + e.org : ""}${e.dates ? " | " + e.dates : ""}`);
      if (e.link) out.push(e.link);
      if (e.extra) out.push(e.extra);
      for (const b of e.bullets) out.push("• " + b);
      out.push("");
    }
  }
  if (r.education.length) { out.push("EDUCATION", ...r.education, ""); }
  if (r.coursework && r.coursework.length) { out.push("RELEVANT COURSEWORK", r.coursework.join(", "), ""); }
  return out.join("\n");
}
