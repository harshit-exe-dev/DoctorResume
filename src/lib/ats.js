// DoctorResume diagnostic engine.
// Pure heuristics, runs 100% in the browser. No servers, no AI calls —
// just everything applicant tracking systems are known to check for.

import { ROLES } from "./roles";

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(\+91[\s-]?)?[6-9]\d{9}|\(\d{3}\)\s?\d{3}[-.\s]?\d{4}|\d{3}[-.\s]\d{3}[-.\s]\d{4}/;
const LINKEDIN_RE = /linkedin\.com\/[^\s)]+/i;
const GITHUB_RE = /github\.com\/[^\s)]+/i;
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u;

const ACTION_VERBS = [
  "achieved", "accelerated", "architected", "automated", "boosted", "built",
  "collaborated", "crafted", "created", "cut", "decreased", "delivered",
  "designed", "developed", "deployed", "drove", "engineered", "established",
  "founded", "grew", "headed", "implemented", "improved", "increased",
  "initiated", "integrated", "introduced", "launched", "led", "mentored",
  "migrated", "optimized", "orchestrated", "owned", "pioneered", "raised",
  "rebuilt", "reduced", "refactored", "revamped", "scaled", "shipped",
  "slashed", "spearheaded", "streamlined", "supervised", "trained",
  "transformed", "tripled", "doubled",
];

const WEAK_PHRASES = [
  "responsible for", "helped with", "worked on", "assisted with",
  "tasked with", "duties included", "in charge of", "helped to",
];

const SECTION_DEFS = [
  { id: "experience", label: "Experience", need: 6, rx: "Add a Work Experience section — it is the first thing recruiters and ATS filters look for." },
  { id: "projects", label: "Projects", need: 0, alt: true },
  { id: "education", label: "Education", need: 4, rx: "Add an Education section with your degree, university and graduation year." },
  { id: "skills", label: "Skills", need: 5, rx: "Add a dedicated Skills section — without one, keyword filters have nothing to match against." },
];

const HEADER_PATTERNS = {
  experience: /^(work\s+)?experience|employment(\s+history)?|work history|leadership/i,
  projects: /^(academic|personal|key|selected)?\s*projects?/i,
  education: /^education|academic\s+background|academic\s+qualifications?/i,
  skills: /^(technical\s+)?skills|technologies|tech(nical)?\s+stack|core\s+competencies|tools?\s+and\s+technologies/i,
  summary: /^(professional\s+)?summary|objective|profile|about(\s+me)?/i,
  certifications: /^certifications?|certificates|licenses/i,
  achievements: /^achievements?|awards|honors|accomplishments/i,
  coursework: /^(relevant\s+)?coursework/i,
};

function cleanHeader(line) {
  return line.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, "").trim();
}

function isHeaderLine(line) {
  const t = cleanHeader(line);
  if (!t || t.length > 48) return null;
  if (/[.]{2,}|:$/.test(line) && t.length > 48) return null;
  for (const [id, re] of Object.entries(HEADER_PATTERNS)) {
    if (re.test(t)) return id;
  }
  return null;
}

export function splitSections(text) {
  const lines = text.split("\n");
  const sections = [];
  let current = { id: "preamble", lines: [] };
  for (const raw of lines) {
    const id = isHeaderLine(raw.trim());
    if (id) {
      if (current.lines.some((l) => l.trim())) sections.push(current);
      current = { id, lines: [] };
    } else {
      current.lines.push(raw);
    }
  }
  if (current.lines.some((l) => l.trim())) sections.push(current);
  const map = {};
  for (const s of sections) {
    map[s.id] = (map[s.id] ? map[s.id] + "\n" : "") + s.lines.join("\n");
  }
  return map;
}

function getBullets(text) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^[•\-\*▪◦‣○●►◆]\s+/.test(l) || /^\d+[.)]\s+\S/.test(l));
}

function stripBullet(l) {
  return l.replace(/^[•\-\*▪◦‣○●►◆]\s+/, "").replace(/^\d+[.)]\s+/, "").trim();
}

function kwRegex(kw) {
  const lowered = kw.toLowerCase();
  if (/[^a-z]/.test(lowered)) {
    const esc = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(esc, "i");
  }
  return new RegExp(`\\b${kw}\\b`, "i");
}

const QUANT_RE = /\d+\s*(%|percent|x|\+|k\b|million|billion)/i;
const IMPACT_NOUN_RE = /\b\d[\d,]*\s*(users|customers|clients|requests|visitors|downloads|revenue|sales|traffic|conversion|uptime|latency|members|students|projects|apps?|endpoints|tests?|ms|seconds?|minutes?|hours?|days?)\b/i;
const MONEY_RE = /[₹$€]\s?[\d,]+/;

function hasQuantification(line) {
  return QUANT_RE.test(line) || IMPACT_NOUN_RE.test(line) || MONEY_RE.test(line);
}

export function analyzeResume(rawText, roleKey = "fullstack", meta = {}) {
  const text = (rawText || "").replace(/\r/g, "");
  const lowered = text.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const bullets = getBullets(text);
  const sections = splitSections(text);
  const role = ROLES[roleKey] || ROLES.fullstack;

  const categories = [];
  const push = (cat) => categories.push(cat);

  /* ---------- 1. Contact & Identity (15) ---------- */
  {
    let score = 0;
    const findings = [];
    const checks = [
      { ok: EMAIL_RE.test(text), pts: 5, bad: "No email address found — recruiters literally cannot reach you.", rx: "Put your email in the top header of the resume." },
      { ok: PHONE_RE.test(text), pts: 5, bad: "No phone number found.", rx: "Add a phone number next to your email in the header." },
      { ok: LINKEDIN_RE.test(text), pts: 3, bad: "No LinkedIn URL — recruiters check this before replying.", rx: "Add your LinkedIn profile URL (linkedin.com/in/you) to the header." },
      { ok: GITHUB_RE.test(text), pts: 2, bad: "No GitHub/portfolio link — for tech roles this is proof of work.", rx: "Add your GitHub or portfolio link to the header." },
    ];
    for (const c of checks) {
      if (c.ok) score += c.pts;
      else findings.push({ severity: c.pts >= 5 ? "critical" : "watch", text: c.bad, rx: c.rx });
    }
    push({ id: "contact", name: "Contact & Identity", score, max: 15, findings });
  }

  /* ---------- 2. File Health (10) ---------- */
  {
    let score = 10;
    const findings = [];
    if (text.trim().length < 400) {
      score -= 7;
      findings.push({ severity: "critical", text: "Almost no readable text extracted — this looks like a scanned image or an image-only PDF. ATS software cannot read it at all.", rx: "Export a real text-based PDF (Print → Save as PDF) instead of scanning or screenshotting." });
    }
    if (meta.hasImages) {
      score -= 3;
      findings.push({ severity: "watch", text: "X-ray found embedded graphics/photos in the file. ATS parsers ignore images — anything inside them is invisible.", rx: "Remove photos, icons and graphics. Keep the resume 100% text." });
    }
    const emojiCount = (text.match(EMOJI_RE) || []).length;
    if (emojiCount > 0) {
      score -= Math.min(2, emojiCount);
      findings.push({ severity: "watch", text: `Found ${emojiCount} emoji/symbol character(s) — they render as garbage in ATS databases.`, rx: "Strip all emojis and decorative symbols; use plain text bullets (•)." });
    }
    if (!findings.length) findings.push({ severity: "healthy", text: "File parsed cleanly — the ATS can actually read your resume." });
    push({ id: "file", name: "File Health", score: Math.max(0, score), max: 10, findings });
  }

  /* ---------- 3. Length & Dose (10) ---------- */
  {
    let score = 10;
    const findings = [];
    const pages = Math.max(1, Math.round(wordCount / 500));
    if (wordCount < 150) {
      score = 2;
      findings.push({ severity: "critical", text: `Only ~${wordCount} words — far too thin to convince anyone.`, rx: "Flesh out each role/project with 3–5 achievement bullets." });
    } else if (wordCount < 300) {
      score = 5;
      findings.push({ severity: "watch", text: `~${wordCount} words — a little light. Strong resumes usually carry more proof.`, rx: "Add one more project or expand bullets with measurable results." });
    } else if (wordCount <= 950) {
      findings.push({ severity: "healthy", text: `~${wordCount} words — a healthy one-page dose.` });
    } else if (wordCount <= 1400) {
      score = 6;
      findings.push({ severity: "watch", text: `~${wordCount} words (~${pages} pages) — recruiters skim; cut the weakest 30%.`, rx: "Trim older roles and keep only the strongest, most relevant bullets." });
    } else {
      score = 2;
      findings.push({ severity: "critical", text: `~${wordCount} words (~${pages} pages) — nobody reads page three.`, rx: "Cut ruthlessly to one page: keep only achievements from the last 3–4 years." });
    }
    push({ id: "length", name: "Length & Dose", score, max: 10, findings, stat: `${pages} page${pages > 1 ? "s" : ""}` });
  }

  /* ---------- 4. Section Anatomy (15) ---------- */
  {
    let score = 0;
    const findings = [];
    const hasWork = !!sections.experience || !!sections.projects;
    if (hasWork) {
      score += 6;
      findings.push({ severity: "healthy", text: `Proof-of-work section present (${[sections.experience && "Experience", sections.projects && "Projects"].filter(Boolean).join(" + ")}).` });
    } else {
      findings.push({ severity: "critical", text: "No Experience or Projects section — there is no evidence you can do the job.", rx: "Add a Work Experience or Projects section with 3–5 bullets each." });
    }
    if (sections.education) { score += 4; }
    else findings.push({ severity: "watch", text: "No Education section detected.", rx: "Add your degree, university and graduation year." });
    if (sections.skills) { score += 5; }
    else findings.push({ severity: "critical", text: "No Skills section — keyword filters have nothing to match.", rx: "Add a Skills section listing your tools and technologies." });
    push({ id: "sections", name: "Section Anatomy", score, max: 15, findings });
  }

  /* ---------- 5. Keyword Bloodwork (15) ---------- */
  {
    const hits = role.keywords.filter((k) => kwRegex(k).test(text));
    const missing = role.keywords.filter((k) => !kwRegex(k).test(text));
    const score = Math.round((15 * hits.length) / role.keywords.length);
    const findings = [];
    if (hits.length / role.keywords.length >= 0.5) {
      findings.push({ severity: "healthy", text: `Matched ${hits.length}/${role.keywords.length} ${role.label} keywords.` });
    } else if (hits.length / role.keywords.length >= 0.25) {
      findings.push({ severity: "watch", text: `Only ${hits.length}/${role.keywords.length} ${role.label} keywords matched — the ATS filter may skip you.`, rx: `Weave missing keywords (${missing.slice(0, 6).join(", ")}) naturally into your skills and bullets.` });
    } else {
      findings.push({ severity: "critical", text: `Only ${hits.length}/${role.keywords.length} ${role.label} keywords matched — keyword filters will reject this.`, rx: `Add relevant keywords you genuinely know (${missing.slice(0, 8).join(", ")}) to skills and project bullets.` });
    }
    push({ id: "keywords", name: "Keyword Bloodwork", score, max: 15, findings, hits, missing: missing.slice(0, 8), total: role.keywords.length });
  }

  /* ---------- 6. Impact Language (15) ---------- */
  {
    const findings = [];
    let score = 0;
    if (!bullets.length) {
      findings.push({ severity: "critical", text: "No bullet points found — walls of paragraph text don't get read.", rx: "Rewrite experience as bullets: strong verb + what you did + measurable result." });
    } else {
      const verbHits = bullets.filter((b) => {
        const first = stripBullet(b).split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, "");
        return ACTION_VERBS.some((v) => first.startsWith(v.slice(0, 5)) || v.startsWith(first.slice(0, 5)));
      });
      const quantHits = bullets.filter((b) => hasQuantification(stripBullet(b)));
      const verbPct = verbHits.length / bullets.length;
      const quantPct = quantHits.length / bullets.length;
      score = Math.round(verbPct * 8 + quantPct * 7);
      if (verbPct >= 0.6) findings.push({ severity: "healthy", text: `${Math.round(verbPct * 100)}% of bullets start with a strong action verb.` });
      else findings.push({ severity: "watch", text: `Only ${Math.round(verbPct * 100)}% of bullets start with a strong action verb.`, rx: "Start every bullet with verbs like Built, Led, Shipped, Reduced, Automated." });
      if (quantPct >= 0.4) findings.push({ severity: "healthy", text: `${Math.round(quantPct * 100)}% of bullets quantify impact with numbers.` });
      else findings.push({ severity: quantPct === 0 ? "critical" : "watch", text: `${Math.round(quantPct * 100)}% of bullets include numbers — unmeasured work looks unimpressive.`, rx: "Add numbers everywhere: users, %, ms, revenue, team size. 'Built API' → 'Built REST API serving 10k requests/day'." });
      push._stats = { bullets: bullets.length, verbPct, quantPct };
    }
    const cat = { id: "impact", name: "Impact Language", score, max: 15, findings };
    if (push._stats) { cat.stats = push._stats; delete push._stats; }
    push(cat);
  }

  /* ---------- 7. Professional Polish (10) ---------- */
  {
    let score = 10;
    const findings = [];
    const firstPerson = (lowered.match(/\b(i|me|my|mine)\b/g) || []).length;
    if (firstPerson > 2) {
      score -= 3;
      findings.push({ severity: "watch", text: `First-person language ("I / me / my" ×${firstPerson}) — resumes drop the subject.`, rx: "Delete 'I/me/my'. Write 'Built dashboard…' not 'I built a dashboard…'." });
    }
    let weakHits = 0;
    for (const w of WEAK_PHRASES) {
      const c = lowered.split(w).length - 1;
      if (c > 0) { weakHits += c; }
    }
    if (weakHits > 0) {
      score -= Math.min(3, weakHits);
      findings.push({ severity: "watch", text: `Weak phrasing detected (${weakHits}×: e.g. "responsible for", "worked on").`, rx: "Replace weak phrases with action verbs: 'Responsible for API' → 'Built and scaled REST API'." });
    }
    if (/references(\s+available)?(\s+upon\s+request)?/i.test(text)) {
      score -= 2;
      findings.push({ severity: "watch", text: '"References available upon request" wastes prime space.', rx: "Delete it — everyone assumes references exist." });
    }
    const shouty = text.split("\n").filter((l) => l.trim().length > 30 && /^[A-Z0-9\s\-–—,.;:()&/]+$/.test(l.trim())).length;
    if (shouty > 0) {
      score -= 1;
      findings.push({ severity: "watch", text: "Long ALL-CAPS lines look like shouting and hurt readability.", rx: "Use Title Case for headings instead of full caps sentences." });
    }
    if (!findings.length) findings.push({ severity: "healthy", text: "Tone is professional — no filler, no weak phrasing." });
    push({ id: "polish", name: "Professional Polish", score: Math.max(0, score), max: 10, findings });
  }

  /* ---------- 8. ATS Structure (10) ---------- */
  {
    let score = 10;
    const findings = [];
    if (bullets.length === 0) {
      score -= 4;
    } else {
      const styles = new Set(bullets.map((b) => b.trim()[0]));
      if (styles.size > 2) {
        score -= 1;
        findings.push({ severity: "watch", text: "Mixed bullet styles — keep one consistent marker.", rx: "Use a single bullet character (•) everywhere." });
      }
    }
    const tableLines = text.split("\n").filter((l) => (l.match(/\|/g) || []).length >= 2 || (l.match(/\t/g) || []).length >= 2).length;
    if (tableLines >= 3) {
      score -= 3;
      findings.push({ severity: "critical", text: "Table-like formatting detected — most ATS parsers scramble tables into unreadable soup.", rx: "Flatten tables into simple stacked lines and bullets." });
    }
    if (/(header|footer)/i.test(text) && false) { /* reserved */ }
    if (!findings.length) findings.push({ severity: "healthy", text: "Clean single-column-friendly structure — parsers will read top to bottom correctly." });
    push({ id: "structure", name: "ATS Structure", score: Math.max(0, score), max: 10, findings });
  }

  /* ---------- totals ---------- */
  for (const c of categories) {
    const pct = c.score / c.max;
    c.status = pct >= 0.75 ? "healthy" : pct >= 0.45 ? "watch" : "critical";
  }
  const total = categories.reduce((a, c) => a + c.score, 0);

  const verdict =
    total >= 85 ? { key: "fit", label: "Match Fit", note: "Olympic-level resume health. The ATS will read every word — now go get interviewed." } :
    total >= 70 ? { key: "stable", label: "Stable", note: "Fundamentally healthy, a few checkups needed. Follow the prescription below." } :
    total >= 55 ? { key: "treatment", label: "Needs Treatment", note: "Showing clear symptoms. Treatable — work through the prescription in order." } :
    total >= 40 ? { key: "critical", label: "Critical", note: "Serious conditions found. The ATS is likely rejecting this today. Major treatment required." } :
                  { key: "codeblue", label: "Code Blue", note: "Flatlining. Do not send this to employers — generate the treated resume below first." };

  /* ---------- chief complaints + prescriptions ---------- */
  const bad = [];
  for (const c of categories) {
    for (const f of c.findings) {
      if (f.severity !== "healthy") bad.push({ ...f, category: c.name, catStatus: c.status });
    }
  }
  bad.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "critical" ? -1 : 1));
  const chiefComplaints = bad.slice(0, 4);

  const seen = new Set();
  const prescriptions = [];
  for (const f of bad) {
    if (f.rx && !seen.has(f.rx)) {
      seen.add(f.rx);
      prescriptions.push({ text: f.rx, severity: f.severity, category: f.category });
    }
  }

  const impactCat = categories.find((c) => c.id === "impact");
  const stats = {
    words: wordCount,
    pages: Math.max(1, Math.round(wordCount / 500)),
    bullets: bullets.length,
    keywords: { hits: (categories.find((c) => c.id === "keywords") || {}).hits?.length || 0, total: role.keywords.length },
    verbPct: impactCat?.stats ? Math.round(impactCat.stats.verbPct * 100) : 0,
    quantPct: impactCat?.stats ? Math.round(impactCat.stats.quantPct * 100) : 0,
  };

  return { total, verdict, categories, chiefComplaints, prescriptions, stats, roleLabel: role.label };
}

export { splitSections as _splitSections };
