// Target-role keyword banks used for the "keyword bloodwork" check.
// Each bank is what an ATS for that role is typically told to look for.

export const ROLES = {
  fullstack: {
    label: "Full-Stack Developer",
    keywords: [
      "JavaScript", "TypeScript", "React", "Node.js", "Express",
      "MongoDB", "PostgreSQL", "REST API", "Git", "Docker",
      "HTML", "CSS", "Tailwind", "Next.js", "authentication",
      "responsive", "testing", "CI/CD", "AWS", "Redis",
      "GraphQL", "Agile", "deployment", "debugging",
    ],
  },
  frontend: {
    label: "Frontend Developer",
    keywords: [
      "JavaScript", "TypeScript", "React", "Next.js", "HTML",
      "CSS", "Tailwind", "Redux", "responsive", "accessibility",
      "performance", "testing", "Jest", "Git", "Figma",
      "REST API", "hooks", "Vite", "SEO", "cross-browser",
      "UI", "animation", "debugging", "npm",
    ],
  },
  backend: {
    label: "Backend Developer",
    keywords: [
      "Node.js", "Express", "Python", "Java", "PostgreSQL",
      "MongoDB", "Redis", "REST API", "GraphQL", "Docker",
      "Kubernetes", "AWS", "microservices", "CI/CD", "testing",
      "authentication", "SQL", "caching", "system design",
      "message queue", "Linux", "debugging", "API design",
    ],
  },
  data: {
    label: "Data Analyst",
    keywords: [
      "Python", "SQL", "Pandas", "NumPy", "Excel",
      "Tableau", "Power BI", "statistics", "machine learning",
      "data visualization", "ETL", "PostgreSQL", "dashboards",
      "A/B testing", "Jupyter", "data cleaning", "reporting",
      "R", "Google Sheets", "insights", "forecasting",
    ],
  },
  uiux: {
    label: "UI/UX Designer",
    keywords: [
      "Figma", "wireframing", "prototyping", "user research",
      "usability testing", "design systems", "interaction design",
      "responsive", "accessibility", "information architecture",
      "user flows", "typography", "Adobe XD", "Sketch",
      "personas", "A/B testing", "mockups", "design thinking",
    ],
  },
  general: {
    label: "General / Other",
    keywords: [
      "communication", "teamwork", "leadership", "problem solving",
      "time management", "project management", "analytical",
      "presentation", "collaboration", "adaptable",
      "detail-oriented", "Microsoft Office", "Excel",
      "planning", "organized", "multitasking", "training",
      "documentation", "customer", "results",
    ],
  },
};

export const ROLE_KEYS = Object.keys(ROLES);
