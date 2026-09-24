// File parsing + resume reconstruction.
// PDF via pdfjs-dist (with an "X-ray" pass that counts embedded images),
// DOCX via mammoth, TXT as-is. All local, nothing leaves the browser.

import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import mammoth from "mammoth";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

async function parsePdf(buffer) {
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let text = "";
  let imageCount = 0;
  for (let p = 1; p <= Math.min(pdf.numPages, 5); p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    text += content.items.map((it) => it.str).join(" ") + "\n";
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
  }
  return { text: text.replace(/  +/g, " ").trim(), hasImages: imageCount > 0, pages: pdf.numPages, fileType: "PDF" };
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
    if (cur && cur.bullets.length > 0 && line.length < 70 && !/[.!?]$/.test(line)) {
      pushCur();
      cur = { title: line, dates: "", bullets: [], lines: [] };
      continue;
    }
    if (!cur) cur = { title: line, dates: "", bullets: [], lines: [] };
    else if (!cur.title) cur.title = line;
    else cur.lines.push(line);
  }
  pushCur();

  return entries.slice(0, 6).map((e) => {
    let role = e.title, org = "";
    const m = e.title.match(/^(.*?)\s+(?:at|@|\||–|—|-)\s+(.*)$/);
    if (m) { role = m[1].trim(); org = m[2].trim(); }
    const extra = e.lines.filter((l) => l && !DATE_RE.test(l)).slice(0, 2).join(" ");
    return { role: role || "Role / Project", org, dates: e.dates, bullets: e.bullets.slice(0, 6), extra };
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

  const headBlock = lines.slice(0, 10).join("\n");
  const email = (headBlock.match(EMAIL_RE) || [""])[0];
  const phone = (headBlock.match(PHONE_RE) || [""])[0].trim();
  const linkedin = (headBlock.match(LINKEDIN_RE) || [""])[0].replace(/[),.]+$/, "");
  const github = (headBlock.match(GITHUB_RE) || [""])[0].replace(/[),.]+$/, "");
  const locLine = lines.slice(0, 10).map((l) => l.trim()).find((l) => /,/.test(l) && !EMAIL_RE.test(l) && !PHONE_RE.test(l) && l.length < 48 && !/linkedin|github/i.test(l));

  // Reuse the section splitter from the engine via a light local copy of patterns.
  const HEADER_PATTERNS = {
    experience: /^(work\s+)?experience|employment(\s+history)?|work history/i,
    projects: /^(academic|personal|key|selected)?\s*projects?/i,
    education: /^education|academic\s+background|academic\s+qualifications?/i,
    skills: /^(technical\s+)?skills|technologies|tech(nical)?\s+stack|core\s+competencies|tools?\s+and\s+technologies/i,
    summary: /^(professional\s+)?summary|objective|profile|about(\s+me)?/i,
  };
  const cleanH = (l) => l.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, "").trim();
  const sections = {};
  let curId = "preamble";
  let curLines = [];
  const flush = () => {
    const body = curLines.join("\n").trim();
    if (body) sections[curId] = (sections[curId] ? sections[curId] + "\n" : "") + body;
    curLines = [];
  };
  for (const raw of lines) {
    const t = raw.trim();
    const h = cleanH(t);
    let hit = null;
    if (h && h.length <= 48) {
      for (const [id, re] of Object.entries(HEADER_PATTERNS)) if (re.test(h)) { hit = id; break; }
    }
    if (hit) { flush(); curId = hit; } else curLines.push(raw);
  }
  flush();

  const experience = sections.experience ? parseEntries(sections.experience) : [];
  const projects = sections.projects ? parseEntries(sections.projects) : [];
  const skillsRaw = (sections.skills || "").split("\n").map((l) => l.trim()).filter(Boolean).join(" ");
  const skills = skillsRaw.split(/[,•|]/).map((s) => s.replace(/^[•\-\*]\s*/, "").trim()).filter((s) => s && s.length < 40).slice(0, 24);
  const education = (sections.education || "").split("\n").map((l) => l.trim()).filter((l) => l && !isBullet(l)).slice(0, 4);
  const summary = (sections.summary || "").split("\n").map((l) => l.trim()).filter(Boolean).join(" ").slice(0, 400);

  return {
    name,
    headline: "",
    contact: { email, phone, linkedin, github, location: locLine || "" },
    summary,
    experience,
    projects,
    education,
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
    out.push("EXPERIENCE");
    for (const e of r.experience) {
      out.push(`${e.role}${e.org ? " — " + e.org : ""}${e.dates ? " | " + e.dates : ""}`);
      for (const b of e.bullets) out.push("• " + b);
      out.push("");
    }
  }
  if (r.projects.length) {
    out.push("PROJECTS");
    for (const e of r.projects) {
      out.push(`${e.role}${e.org ? " — " + e.org : ""}${e.dates ? " | " + e.dates : ""}`);
      for (const b of e.bullets) out.push("• " + b);
      out.push("");
    }
  }
  if (r.education.length) { out.push("EDUCATION", ...r.education, ""); }
  return out.join("\n");
}
