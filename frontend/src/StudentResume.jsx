import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const EMPTY = {
  full_name: "",
  email: "",
  phone: "",
  degree: "",
  department: "",
  graduation_year: "",
  cgpa: "",
  skills: "",
  projects: "",
  experience: "",
  certifications: "",
  linkedin: "",
  github: "",
  preferred_roles: "",
  career_objective: "",
  resume_text: "",
};

const TEMPLATE_OPTIONS = [
  { id: "modern", name: "Modern", note: "Bold header · contemporary accent", icon: "◈" },
  { id: "ats", name: "ATS clean", note: "Simple · recruiter-system friendly", icon: "▤" },
  { id: "executive", name: "Executive", note: "Editorial · refined typography", icon: "✳" },
];

const ACCENTS = ["#315efb", "#0f766e", "#7c3aed", "#c2410c", "#0f172a"];
const DEFAULT_SECTIONS = { summary: true, education: true, skills: true, projects: true, experience: true, certifications: true, links: true };

function getToken() {
  return localStorage.getItem("campuslink_token") || "";
}

function readableError(detail, status) {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((item) => item?.msg || item?.message || JSON.stringify(item)).join(" · ");
  if (detail && typeof detail === "object") return detail.message || detail.detail || JSON.stringify(detail);
  return `Request failed (${status})`;
}

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(readableError(data?.detail, response.status));
  return data;
}

function splitList(value) {
  return String(value || "").split(/[;|\n,]+/).map((part) => part.trim()).filter(Boolean);
}

function splitEntries(value) {
  return String(value || "")
    .split(/\n\s*\n|\n(?=[•*\-])|\n(?=[A-Z][^\n]{2,65}\s*[|—–-])/)
    .map((part) => part.replace(/^\s*[•*\-]\s*/, "").trim())
    .filter(Boolean);
}

function splitLines(value) {
  return String(value || "").split(/[\n;]+/).map((part) => part.replace(/^\s*[•*\-]\s*/, "").trim()).filter(Boolean);
}


function asResumeText(value) {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === "string" || typeof item === "number") return String(item).trim();
      if (item && typeof item === "object") {
        const title = item.title || item.name || item.role || item.project || item.company || "";
        const detail = item.description || item.details || item.summary || item.bullets || item.impact || "";
        return [title, Array.isArray(detail) ? detail.join("; ") : detail].filter(Boolean).join(" — ").trim() || JSON.stringify(item);
      }
      return "";
    }).filter(Boolean).join("\n");
  }
  if (typeof value === "object") {
    const title = value.title || value.name || value.role || value.project || "";
    const detail = value.description || value.details || value.summary || "";
    return [title, detail].filter(Boolean).join(" — ").trim();
  }
  return "";
}

function parseJsonLike(value) {
  if (value && typeof value === "object") return value;
  if (typeof value !== "string") return null;
  const source = value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try { return JSON.parse(source); } catch { /* try to find an embedded JSON object */ }
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try { return JSON.parse(source.slice(start, end + 1)); } catch { /* plain-text model output */ }
  }
  return null;
}

function unwrapResumeAIResponse(response) {
  const seen = new Set();
  const queue = [response];
  const keys = ["profile", "generated_profile", "resume_json", "generated_resume", "edited_resume", "resume", "result", "output", "content", "response", "data"];
  while (queue.length) {
    const candidate = queue.shift();
    if (!candidate || (typeof candidate !== "object" && typeof candidate !== "string")) continue;
    if (typeof candidate === "string") {
      const parsed = parseJsonLike(candidate);
      if (parsed && typeof parsed === "object") queue.unshift(parsed);
      continue;
    }
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    const hasResumeFields = ["career_objective", "professional_summary", "summary", "skills", "projects", "experience", "certifications", "preferred_roles", "target_role", "degree", "education"].some((key) => Object.prototype.hasOwnProperty.call(candidate, key));
    if (hasResumeFields) return candidate;
    for (const key of keys) {
      if (candidate[key] != null) queue.push(candidate[key]);
    }
    if (candidate.message && typeof candidate.message === "string") queue.push(candidate.message);
  }
  return null;
}

function inferResumeRole(profile) {
  const explicit = String(profile?.preferred_roles || "").trim();
  if (explicit) return explicit.split(/[;,|]/)[0].trim();
  const text = `${profile?.department || ""} ${profile?.degree || ""} ${profile?.skills || ""} ${profile?.resume_text || ""}`.toLowerCase();
  if (/electrical|power system|plc|scada|electronic|embedded|circuit/.test(text)) return "Graduate Engineer Trainee — Electrical";
  if (/mechanical|solidworks|autocad|thermodynamics|manufacturing|cad|ansys/.test(text)) return "Graduate Engineer Trainee — Mechanical";
  if (/civil|autocad|revit|construction|structural/.test(text)) return "Graduate Engineer Trainee — Civil";
  if (/chemical|process engineering|plant operations/.test(text)) return "Graduate Engineer Trainee — Chemical";
  if (/computer science|software|python|java|javascript|react|sql|git|web development/.test(text)) return "Graduate Software / IT Engineer";
  if (/business|commerce|finance|accounting|marketing|management/.test(text)) return "Graduate Trainee — Business Operations";
  return "Graduate Trainee / Entry-Level Associate";
}

function extractSkillsFromSource(text) {
  const source = String(text || "");
  if (!source.trim()) return [];
  const catalogue = [
    ["MATLAB", /\bmatlab\b/i], ["Simulink", /\bsimulink\b/i], ["PLC", /\bplc\b/i], ["SCADA", /\bscada\b/i],
    ["ETAP", /\betap\b/i], ["Proteus", /\bproteus\b/i], ["Power Systems", /\bpower systems?\b/i], ["Circuit Analysis", /\bcircuit analysis\b/i],
    ["AutoCAD", /\bautocad\b/i], ["SolidWorks", /\bsolidworks\b/i], ["ANSYS", /\bansys\b/i], ["Fusion 360", /\bfusion\s*360\b/i],
    ["Arduino", /\barduino\b/i], ["PCB Design", /\bpcb design\b/i], ["Microcontrollers", /\bmicrocontrollers?\b/i], ["Embedded Systems", /\bembedded systems?\b/i],
    ["Python", /\bpython\b/i], ["JavaScript", /\bjavascript\b/i], ["Java", /\bjava\b/i], ["React", /\breact(?:\.js)?\b/i], ["Node.js", /\bnode\.js\b/i],
    ["SQL", /\bsql\b/i], ["Git", /\bgit\b/i], ["GitHub", /\bgithub\b/i], ["HTML", /\bhtml\b/i], ["CSS", /\bcss\b/i],
    ["Excel", /\bexcel\b/i], ["Power BI", /\bpower bi\b/i], ["Tableau", /\btableau\b/i], ["Machine Learning", /\bmachine learning\b/i],
    ["Communication", /\bcommunication skills?\b/i], ["Project Management", /\bproject management\b/i], ["Problem Solving", /\bproblem.solving\b/i], ["Teamwork", /\bteamwork\b/i],
    ["Thermodynamics", /\bthermodynamics\b/i], ["Heat Transfer", /\bheat transfer\b/i], ["HVAC", /\bhvac\b/i], ["CNC", /\bcnc\b/i], ["Welding", /\bwelding\b/i],
    ["Revit", /\brevit\b/i], ["STAAD.Pro", /\bstaad(?:\.pro)?\b/i], ["ETABS", /\betabs\b/i], ["Surveying", /\bsurveying\b/i],
  ];
  const detected = catalogue.filter(([, pattern]) => pattern.test(source)).map(([label]) => label);
  return [...new Set(detected)];
}

function localResumeSummary(profile, role) {
  const degree = [profile?.degree, profile?.department].filter(Boolean).join(" in ").trim();
  const actualSkills = splitList(profile?.skills || "");
  const skills = actualSkills.slice(0, 6);
  const base = degree ? `${degree} student / graduate` : "Entry-level candidate";
  const skillSentence = skills.length ? ` Brings knowledge of ${skills.join(", ")}.` : " Building practical, role-relevant technical and professional skills.";
  return `${base} interested in ${role}.${skillSentence} Seeking an entry-level opportunity to apply academic learning, contribute to real team projects and continue developing role-specific expertise.`;
}

function localProjectIdeas(profile, role) {
  const source = `${profile?.department || ""} ${profile?.skills || ""} ${role || ""}`.toLowerCase();
  if (/electrical|power|plc|scada|electronics|embedded/.test(source)) return [
    "[PROJECT IDEA — ONLY LIST AFTER COMPLETING] Build a small electrical load-monitoring prototype and document measured readings, components and safety checks.",
    "[PROJECT IDEA — ONLY LIST AFTER COMPLETING] Model a basic power-system or circuit scenario using a tool you know, then record the input assumptions and verified results."
  ];
  if (/mechanical|solidworks|ansys|manufacturing|cad/.test(source)) return [
    "[PROJECT IDEA — ONLY LIST AFTER COMPLETING] Create a CAD model of a component or assembly and document design constraints, material choices and revisions.",
    "[PROJECT IDEA — ONLY LIST AFTER COMPLETING] Run a basic simulation or performance comparison using a tool you know and report only results you actually observed."
  ];
  if (/civil|construction|structural|revit/.test(source)) return [
    "[PROJECT IDEA — ONLY LIST AFTER COMPLETING] Prepare a small building or infrastructure model with clearly documented assumptions, drawings and quantity estimates.",
    "[PROJECT IDEA — ONLY LIST AFTER COMPLETING] Compare two design alternatives using a tool or method taught in your course and record verified findings."
  ];
  if (/business|finance|commerce|marketing|operations/.test(source)) return [
    "[PROJECT IDEA — ONLY LIST AFTER COMPLETING] Analyze a public business dataset and summarize three findings supported by charts or calculations.",
    "[PROJECT IDEA — ONLY LIST AFTER COMPLETING] Create a simple process-improvement or market-research case study using documented sources and clear assumptions."
  ];
  return [
    "[PROJECT IDEA — ONLY LIST AFTER COMPLETING] Build a small portfolio project that solves one clearly defined problem using tools you can demonstrate, then document your approach and tests.",
    "[PROJECT IDEA — ONLY LIST AFTER COMPLETING] Analyze a public dataset or build a prototype related to your target role and publish a short report with verified results."
  ];
}

function Field({ label, value, onChange, placeholder, type = "text", hint, required = false }) {
  return (
    <label className="rs-field">
      <span className="rs-label">{label}{required && <i>Required</i>}</span>
      <input type={type} value={value ?? ""} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      {hint && <small>{hint}</small>}
    </label>
  );
}

function Area({ label, value, onChange, placeholder, rows = 4, hint, full = true }) {
  return (
    <label className={`rs-field ${full ? "rs-full" : ""}`}>
      <span className="rs-label">{label}</span>
      <textarea rows={rows} value={value ?? ""} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      {hint && <small>{hint}</small>}
    </label>
  );
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
}

function linesToHtml(values) {
  return values.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function ResumeSections({ form, sections, skills, projects, experience, certifications, template, accent }) {
  const isModern = template === "modern";
  const isExecutive = template === "executive";
  const contact = [form.email, form.phone, form.linkedin, form.github].filter(Boolean);
  const title = form.preferred_roles.split(/[;,|]/)[0]?.trim();

  return (
    <article className={`rs-paper rs-paper-${template}`} style={{ "--rs-accent": accent }} id="resume-preview">
      {isModern && <div className="rs-paper-band" />}
      <header className="rs-paper-header">
        <div className="rs-paper-initials">{(form.full_name || "Your Name").trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "YN"}</div>
        <div className="rs-paper-identity">
          <h2>{form.full_name || "YOUR NAME"}</h2>
          {title && <div className="rs-paper-role">{title}</div>}
          <div className="rs-paper-contact">{contact.length ? contact.join("  ·  ") : "Email · Phone · LinkedIn · GitHub"}</div>
        </div>
      </header>

      {sections.summary && form.career_objective.trim() && <section className="rs-paper-section"><h3>{isExecutive ? "Professional Profile" : "Profile"}</h3><p>{form.career_objective}</p></section>}

      {sections.education && (form.degree.trim() || form.department.trim() || form.graduation_year.trim() || form.cgpa.trim()) && (
        <section className="rs-paper-section">
          <h3>Education</h3>
          <div className="rs-paper-row"><strong>{form.degree || "Degree"}</strong><span>{form.graduation_year}</span></div>
          {form.department && <p className="rs-paper-muted">{form.department}</p>}
          {form.cgpa && <p className="rs-paper-muted">CGPA: {form.cgpa}/10</p>}
        </section>
      )}

      {sections.skills && skills.length > 0 && <section className="rs-paper-section"><h3>Skills</h3><div className="rs-paper-skills">{skills.map((skill, index) => <span key={`${skill}-${index}`}>{skill}</span>)}</div></section>}

      {sections.projects && projects.length > 0 && <section className="rs-paper-section"><h3>Projects</h3>{projects.map((project, index) => <div className="rs-paper-entry" key={`${project}-${index}`}><strong>{project.split(/[|—–]/)[0] || `Project ${index + 1}`}</strong>{project.includes("|") || /[—–]/.test(project) ? <p>{project.replace(/^[^|—–]+[|—–]\s*/, "")}</p> : <p>{project}</p>}</div>)}</section>}

      {sections.experience && experience.length > 0 && <section className="rs-paper-section"><h3>Experience</h3>{experience.map((item, index) => <div className="rs-paper-entry" key={`${item}-${index}`}><strong>{item.split(/[|—–]/)[0] || `Experience ${index + 1}`}</strong><p>{item.includes("|") || /[—–]/.test(item) ? item.replace(/^[^|—–]+[|—–]\s*/, "") : item}</p></div>)}</section>}

      {sections.certifications && certifications.length > 0 && <section className="rs-paper-section"><h3>Certifications & Training</h3><ul>{certifications.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></section>}

      {sections.links && (form.linkedin || form.github) && <section className="rs-paper-section"><h3>Professional Links</h3><ul>{form.linkedin && <li>LinkedIn: {form.linkedin}</li>}{form.github && <li>GitHub: {form.github}</li>}</ul></section>}

      {isExecutive && <div className="rs-paper-footer">Prepared with CampusLink Resume Studio</div>}
    </article>
  );
}

export default function StudentResume() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [template, setTemplate] = useState("modern");
  const [accent, setAccent] = useState(ACCENTS[0]);
  const [activeTab, setActiveTab] = useState("content");
  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [previewMobile, setPreviewMobile] = useState(false);
  const [targetDescription, setTargetDescription] = useState("");
  const [aiFilling, setAiFilling] = useState(false);
  const [aiFillMode, setAiFillMode] = useState("missing");
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [aiFillSource, setAiFillSource] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");
      const [user, profile] = await Promise.all([api("/auth/me"), api("/student-profile/me")]);
      setForm({
        ...EMPTY,
        full_name: user?.full_name || "",
        email: user?.email || "",
        phone: profile?.phone || "",
        degree: profile?.degree || "",
        department: profile?.department || "",
        graduation_year: profile?.graduation_year != null ? String(profile.graduation_year) : "",
        cgpa: profile?.cgpa != null ? String(profile.cgpa) : "",
        skills: profile?.skills || "",
        projects: profile?.projects || "",
        experience: profile?.experience || "",
        certifications: profile?.certifications || "",
        linkedin: profile?.linkedin || "",
        github: profile?.github || "",
        preferred_roles: profile?.preferred_roles || "",
        career_objective: profile?.career_objective || "",
        resume_text: profile?.resume_text || "",
      });
    } catch (err) {
      setError(err.message || "Unable to load your profile.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage("");
    setError("");
  }

  async function saveProfile(quiet = false, sourceForm = form) {
    const cgpa = sourceForm.cgpa.trim() === "" ? null : Number(sourceForm.cgpa);
    const year = sourceForm.graduation_year.trim() === "" ? null : Number(sourceForm.graduation_year);
    if (cgpa !== null && (!Number.isFinite(cgpa) || cgpa < 0 || cgpa > 10)) {
      setError("CGPA must be between 0 and 10.");
      return false;
    }
    if (year !== null && (!Number.isInteger(year) || year < 1950 || year > 2100)) {
      setError("Enter a valid graduation year.");
      return false;
    }

    try {
      setSaving(true);
      setError("");
      await api("/student-profile/me", {
        method: "PUT",
        body: JSON.stringify({
          cgpa,
          skills: sourceForm.skills || null,
          resume_text: sourceForm.resume_text || "",
          phone: sourceForm.phone || null,
          degree: sourceForm.degree || null,
          department: sourceForm.department || null,
          graduation_year: year,
          projects: sourceForm.projects || null,
          experience: sourceForm.experience || null,
          certifications: sourceForm.certifications || null,
          linkedin: sourceForm.linkedin || null,
          github: sourceForm.github || null,
          preferred_roles: sourceForm.preferred_roles || null,
          preferred_locations: null,
          career_objective: sourceForm.career_objective || null,
          profile_photo_url: null,
        }),
      });
      if (!quiet) setMessage("Profile details saved to CampusLink.");
      return true;
    } catch (err) {
      setError(err.message || "Unable to save resume profile data.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function generateDraft() {
    if (!form.full_name.trim() || !form.email.trim() || !form.degree.trim() || !form.skills.trim()) {
      setError("Add your name, email, degree and at least one skill before generating your resume.");
      setActiveTab("content");
      return;
    }
    setGenerating(true);
    setMessage("");
    setError("");
    try {
      const saved = await saveProfile(true);
      if (!saved) return;
      setMessage("Resume built from your current profile. Review the live preview, then print to PDF or export HTML.");
      setActiveTab("design");
      setPreviewMobile(true);
    } catch (err) {
      setError(err.message || "Resume generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  async function autoFillResume(mode = "missing") {
    if (aiFilling || saving) return;
    setAiFilling(true);
    setAiFillMode(mode);
    setError("");
    setMessage("");
    setAiSuggestions([]);

    const role = inferResumeRole(form);
    const snapshot = { ...form, preferred_roles: form.preferred_roles.trim() || role };
    const sourceResume = [
      `Name: ${snapshot.full_name || "Not provided"}`,
      `Email: ${snapshot.email || "Not provided"}`,
      `Phone: ${snapshot.phone || "Not provided"}`,
      `Degree: ${snapshot.degree || "Not provided"}`,
      `Department: ${snapshot.department || "Not provided"}`,
      `Graduation year: ${snapshot.graduation_year || "Not provided"}`,
      `CGPA: ${snapshot.cgpa || "Not provided"}`,
      `Skills: ${snapshot.skills || "Not provided"}`,
      `Projects: ${snapshot.projects || "Not provided"}`,
      `Experience: ${snapshot.experience || "Not provided"}`,
      `Certifications: ${snapshot.certifications || "Not provided"}`,
      `LinkedIn: ${snapshot.linkedin || "Not provided"}`,
      `GitHub: ${snapshot.github || "Not provided"}`,
      `Career objective: ${snapshot.career_objective || "Not provided"}`,
      `Existing resume text: ${snapshot.resume_text || "Not provided"}`,
    ].join("\n");
    const instructions = `You are CampusLink Resume Studio's fast resume-writing model. Target role: ${role}. The user wants you to fill and professionally write their resume from the source facts below. Return ONLY valid JSON, with no markdown, using these keys: full_name, email, phone, degree, department, graduation_year, cgpa, skills, projects, experience, certifications, linkedin, github, preferred_roles, career_objective, project_ideas, experience_templates, certification_ideas. Use strings for scalar fields; strings or arrays are accepted for list fields. Write concise recruiter-ready language and improve grammar, clarity, ATS relevance and action verbs. Mode: ${mode === "all" ? "rewrite/upgrade the existing content sections, while retaining factual identity/education" : "fill missing sections and lightly polish the content provided"}. CRITICAL TRUTH RULES: preserve name, email, phone, degree, branch, years, CGPA, URLs and certifications exactly from source facts; never invent employers, internship, courses, certificates, dates, awards, metrics, tools or completed projects. Do not convert ideas into completed achievements. Rewrite existing projects/experience only using the supplied details; if a section has no source facts, return an empty string for that resume field and put relevant ideas in project_ideas / experience_templates / certification_ideas instead. Skills may contain only source-listed skills or skills explicitly present in existing resume text. Do not output skills inferred merely from the target role. Do not add fabricated metrics. The career_objective may be freshly drafted using only the real degree/branch, actual listed skills and target role; avoid generic buzzword stuffing. For missing factual values use an empty string. project_ideas, experience_templates and certification_ideas must be arrays of concise ideas, explicitly labelled as suggestions to complete/verify before ever adding to a resume. Source facts:\n${sourceResume}`;

    let generated = null;
    let aiWorked = false;
    try {
      // Use the existing CampusLink Resume AI Agent route. Multiple compatible
      // field names are included so older request schemas can ignore extras.
      const aiController = new AbortController();
      const aiTimeout = window.setTimeout(() => aiController.abort(), 25000);
      let response;
      try {
        response = await api("/resume/agent-edit", {
          method: "POST",
          signal: aiController.signal,
          body: JSON.stringify({
            resume_text: sourceResume,
            current_resume: snapshot,
            resume: snapshot,
            profile: snapshot,
            instruction: instructions,
            prompt: instructions,
            target_role: role,
            action: "autofill_resume",
            mode,
          }),
        });
      } finally {
        window.clearTimeout(aiTimeout);
      }
      generated = unwrapResumeAIResponse(response);
      aiWorked = Boolean(generated && typeof generated === "object");
    } catch (aiError) {
      // No block on slow/misconfigured local AI: a safe, rule-based draft still
      // fills available fields, while the message makes the fallback explicit.
      console.warn("CampusLink resume AI is unavailable; using safe local filler.", aiError);
    }

    try {
      const next = { ...snapshot };
      const factualKeys = ["full_name", "email", "phone", "degree", "department", "graduation_year", "cgpa", "linkedin", "github"];
      const aliases = {
        full_name: ["full_name", "name", "candidate_name"],
        email: ["email", "email_address"],
        phone: ["phone", "mobile", "phone_number"],
        degree: ["degree", "qualification", "education"],
        department: ["department", "branch", "major", "discipline"],
        graduation_year: ["graduation_year", "graduationYear", "passing_year"],
        cgpa: ["cgpa", "gpa", "grade"],
        skills: ["skills", "technical_skills", "skill_set"],
        projects: ["projects", "project_experience", "project_work"],
        experience: ["experience", "work_experience", "internships"],
        certifications: ["certifications", "certificates", "training"],
        linkedin: ["linkedin", "linkedin_url"],
        github: ["github", "github_url"],
        preferred_roles: ["preferred_roles", "target_role", "role_title", "headline"],
        career_objective: ["career_objective", "summary", "professional_summary", "objective", "profile_summary"],
      };
      const readValue = (object, keys) => {
        for (const key of keys) {
          if (object?.[key] != null && object[key] !== "") return asResumeText(object[key]);
        }
        return "";
      };

      if (generated) {
        for (const [field, names] of Object.entries(aliases)) {
          const value = readValue(generated, names);
          if (!value) continue;
          if (factualKeys.includes(field)) {
            if (!String(snapshot[field] || "").trim()) next[field] = value;
          } else if (mode === "all" || !String(snapshot[field] || "").trim()) {
            next[field] = value;
          }
        }
      }

      // Safe fallback when model output cannot be reached or parsed.
      next.preferred_roles = next.preferred_roles.trim() || role;
      if (mode === "all" && !aiWorked) {
        next.career_objective = localResumeSummary(next, role);
      } else if (!next.career_objective.trim()) {
        next.career_objective = localResumeSummary(next, role);
      }
      if (!next.skills.trim() && next.resume_text.trim()) {
        next.skills = extractSkillsFromSource(next.resume_text).join(", ");
      }
      // Never create fictitious completed project/experience/certification entries.
      // Suggestions are kept separate from the resume until the student reviews them.
      const suggestionKeys = ["project_ideas", "suggested_projects", "experience_templates", "suggested_experience", "certification_ideas", "suggested_certifications"];
      const suggestions = [];
      if (generated) {
        for (const key of suggestionKeys) {
          const value = generated[key];
          if (Array.isArray(value)) suggestions.push(...value.map(asResumeText).filter(Boolean));
          else if (typeof value === "string" && value.trim()) suggestions.push(...value.split(/\n|•/).map((x) => x.trim()).filter(Boolean));
        }
      }
      const uniqueSuggestions = [...new Set(suggestions)].slice(0, 8);
      if (!next.projects.trim()) uniqueSuggestions.push(...localProjectIdeas(next, role).filter((item) => !uniqueSuggestions.includes(item)));
      if (!next.experience.trim()) uniqueSuggestions.push("[EXPERIENCE TEMPLATE — replace with real facts] Role / organisation — dates | Add 2–3 tasks you actually completed, tools used and a verified outcome.");
      if (!next.certifications.trim()) uniqueSuggestions.push("[CERTIFICATION REMINDER] Add only courses or certificates you have actually completed, including the provider and year if known.");
      setAiSuggestions([...new Set(uniqueSuggestions)].slice(0, 8));
      setForm(next);
      const saved = await saveProfile(true, next);
      if (!saved) {
        setMessage(aiWorked ? "AI drafted your resume. Saving failed, so your draft is still visible here." : "Your quick draft is ready. Saving failed, so your draft is still visible here.");
        setAiFillSource(aiWorked ? "ai-unsaved" : "local-unsaved");
        return;
      }
      setActiveTab("content");
      setPreviewMobile(false);
      setAiFillSource(aiWorked ? "ai" : "local");
      setMessage(aiWorked
        ? (mode === "all" ? "AI rewrote your resume sections and saved them. Review the draft before submitting it." : "AI filled available fields from your profile, saved the draft and listed factual gaps separately.")
        : (mode === "all" ? "Quick-fill draft saved. The AI agent was unavailable, so only safe profile-based writing was generated." : "Quick-fill complete and saved. The AI agent was unavailable, so only safe profile-based writing was generated."));
    } catch (fillError) {
      setError(fillError.message || "Resume autofill failed. Your existing profile has not been removed.");
    } finally {
      setAiFilling(false);
    }
  }

  function useSuggestionAsDraft(suggestion) {
    const marked = String(suggestion || "").trim();
    if (!marked) return;
    const nextProjects = [form.projects.trim(), marked].filter(Boolean).join("\n\n");
    update("projects", nextProjects);
    setMessage("Added as a clearly labelled draft idea. Remove the warning and use it only after you have actually completed the project.");
    setActiveTab("content");
  }

  function exportHtml() {
    const skills = splitList(form.skills);
    const projects = splitEntries(form.projects);
    const experience = splitEntries(form.experience);
    const certifications = splitLines(form.certifications);
    const sectionsHtml = [
      sections.summary && form.career_objective.trim() ? `<section><h2>PROFILE</h2><p>${escapeHtml(form.career_objective).replace(/\n/g, "<br>")}</p></section>` : "",
      sections.education && (form.degree || form.department || form.graduation_year || form.cgpa) ? `<section><h2>EDUCATION</h2><div class="row"><strong>${escapeHtml(form.degree)}</strong><span>${escapeHtml(form.graduation_year)}</span></div><p>${escapeHtml(form.department)}${form.cgpa ? ` · CGPA ${escapeHtml(form.cgpa)}` : ""}</p></section>` : "",
      sections.skills && skills.length ? `<section><h2>SKILLS</h2><p>${skills.map(escapeHtml).join(" · ")}</p></section>` : "",
      sections.projects && projects.length ? `<section><h2>PROJECTS</h2><ul>${linesToHtml(projects)}</ul></section>` : "",
      sections.experience && experience.length ? `<section><h2>EXPERIENCE</h2><ul>${linesToHtml(experience)}</ul></section>` : "",
      sections.certifications && certifications.length ? `<section><h2>CERTIFICATIONS & TRAINING</h2><ul>${linesToHtml(certifications)}</ul></section>` : "",
      sections.links && (form.linkedin || form.github) ? `<section><h2>PROFESSIONAL LINKS</h2><p>${[form.linkedin, form.github].filter(Boolean).map(escapeHtml).join(" · ")}</p></section>` : "",
    ].filter(Boolean).join("\n");
    const documentHtml = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(form.full_name || "Resume")} — Resume</title><style>*{box-sizing:border-box}body{margin:0;background:#edf1f7;color:#172033;font:14px/1.55 Arial,sans-serif}.page{max-width:850px;min-height:1100px;margin:24px auto;padding:54px 62px;background:white;border-top:8px solid ${accent};box-shadow:0 10px 36px #14213d18}.head{border-bottom:2px solid ${accent};padding-bottom:20px;margin-bottom:22px}.name{font-size:32px;line-height:1.1;font-weight:800;letter-spacing:-.8px}.role{margin-top:8px;color:${accent};font-weight:700}.contact{margin-top:9px;color:#4b5563;font-size:11px;overflow-wrap:anywhere}section{margin:20px 0;break-inside:avoid}h2{font-size:11px;letter-spacing:1.4px;text-transform:uppercase;border-bottom:1px solid #d8dee9;padding-bottom:6px;margin:0 0 9px;color:${accent}}p{white-space:pre-wrap;margin:5px 0}.row{display:flex;justify-content:space-between;gap:16px}ul{margin:6px 0;padding-left:20px}li{margin:4px 0}.footer{margin-top:30px;color:#94a3b8;font-size:10px}@media print{body{background:white}.page{margin:0;box-shadow:none;width:auto;max-width:none;min-height:0;padding:18mm;border-top-width:5px}@page{size:A4;margin:0}}</style></head><body><main class="page"><header class="head"><div class="name">${escapeHtml(form.full_name || "YOUR NAME")}</div>${form.preferred_roles ? `<div class="role">${escapeHtml(form.preferred_roles)}</div>` : ""}<div class="contact">${[form.email, form.phone, form.linkedin, form.github].filter(Boolean).map(escapeHtml).join(" · ")}</div></header>${sectionsHtml}<div class="footer">Prepared with CampusLink Resume Studio</div></main></body></html>`;
    const blob = new Blob([documentHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${(form.full_name || "campuslink-resume").trim().replace(/[^a-z0-9_-]+/gi, "-")}-resume.html`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setMessage("Editable HTML resume exported.");
  }

  async function downloadProfileBackup() {
    const blob = new Blob([JSON.stringify({ ...form, exported_at: new Date().toISOString(), template, accent, sections }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${(form.full_name || "campuslink-profile").trim().replace(/[^a-z0-9_-]+/gi, "-")}-resume-data.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setMessage("Resume data backup downloaded.");
  }

  function toggleSection(key) {
    setSections((current) => ({ ...current, [key]: !current[key] }));
  }

  const skills = useMemo(() => splitList(form.skills), [form.skills]);
  const projects = useMemo(() => splitEntries(form.projects), [form.projects]);
  const experience = useMemo(() => splitEntries(form.experience), [form.experience]);
  const certifications = useMemo(() => splitLines(form.certifications), [form.certifications]);
  const wordCount = useMemo(() => [form.career_objective, form.projects, form.experience].join(" ").trim().split(/\s+/).filter(Boolean).length, [form.career_objective, form.projects, form.experience]);
  const completion = useMemo(() => {
    const checks = [form.full_name, form.email, form.phone, form.degree, form.department, form.graduation_year, form.career_objective, form.skills, form.projects, form.experience, form.certifications, form.linkedin || form.github];
    return Math.round(checks.filter((value) => String(value || "").trim()).length / checks.length * 100);
  }, [form]);
  const targetKeywords = useMemo(() => {
    if (!targetDescription.trim()) return [];
    const terms = [...new Set((targetDescription.toLowerCase().match(/[a-z][a-z+#.]{2,}/g) || []))];
    const text = [form.skills, form.projects, form.experience, form.career_objective].join(" ").toLowerCase();
    const stop = new Set(["and", "the", "for", "with", "you", "your", "our", "are", "will", "this", "that", "from", "have", "has", "years", "year", "ability", "work", "role", "job", "required", "preferred", "good", "strong", "using", "including", "team", "skills", "experience", "knowledge"]);
    return terms.filter((term) => !stop.has(term) && term.length > 2).slice(0, 50).map((term) => ({ term, matched: new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`, "i").test(text) }));
  }, [targetDescription, form.skills, form.projects, form.experience, form.career_objective]);
  const keywordScore = targetKeywords.length ? Math.round(targetKeywords.filter((item) => item.matched).length / targetKeywords.length * 100) : null;

  if (loading) return <div className="rs-loading"><span className="rs-loader" />Loading your Resume Studio…</div>;

  return (
    <main className="rs-page" style={{ "--rs-accent": accent }}>
      <style>{CSS}</style>
      <header className="rs-topbar">
        <div className="rs-brandline"><div className="rs-brandmark">C</div><div><span className="rs-eyebrow">CAMPUSLINK CAREER TOOLS</span><h1>Resume Studio</h1><p>Build a recruiter-ready resume with a live preview, ATS checks and export tools.</p></div></div>
        <div className="rs-top-actions">
          <button className="rs-button rs-button-quiet" type="button" onClick={() => navigate("/student/profile")}>← Profile</button>
          <button className="rs-button rs-button-quiet" type="button" onClick={load}>↻ Reload profile</button>
          <button className="rs-button rs-button-primary" type="button" onClick={generateDraft} disabled={generating || saving}>{generating ? "Building…" : "Build resume ↗"}</button>
        </div>
      </header>

      <section className="rs-hero">
        <div className="rs-hero-copy"><span className="rs-eyebrow rs-eyebrow-light">YOUR CAREER, WELL PRESENTED</span><h2>Make your experience<br /><em>impossible to overlook.</em></h2><p>Shape your story, choose a visual style, check job keywords and export a clean resume ready for applications.</p><div className="rs-hero-pills"><span>Live preview</span><span>ATS-focused layout</span><span>Print-ready PDF</span></div></div>
        <div className="rs-hero-progress"><div className="rs-progress-top"><span>PROFILE COMPLETENESS</span><strong>{completion}%</strong></div><div className="rs-progress"><span style={{ width: `${completion}%` }} /></div><div className="rs-progress-foot"><span>{completion >= 90 ? "Excellent profile coverage" : completion >= 65 ? "Good start — fill the remaining gaps" : "Keep adding details to strengthen your resume"}</span><span>{wordCount} words</span></div><div className="rs-hero-stats"><div><strong>{skills.length}</strong><span>Skills</span></div><div><strong>{projects.length}</strong><span>Projects</span></div><div><strong>{experience.length}</strong><span>Experience entries</span></div></div></div>
      </section>

      {error && <div className="rs-alert rs-alert-error"><span>!</span><div><strong>Something needs attention</strong><p>{error}</p></div><button type="button" aria-label="Dismiss error" onClick={() => setError("")}>×</button></div>}
      {message && <div className="rs-alert rs-alert-success"><span>✓</span><p>{message}</p><button type="button" aria-label="Dismiss message" onClick={() => setMessage("")}>×</button></div>}

      <section className="rs-ai-fill">
        <div className="rs-ai-fill-icon">✦</div>
        <div className="rs-ai-fill-copy">
          <span className="rs-eyebrow">CAMPUSLINK SMART WRITER</span>
          <h2>Make my resume for me</h2>
          <p>Use your saved profile as the source. The AI writes the summary and improves existing project / experience wording, fills missing known details, saves the draft and lists anything that needs your real input.</p>
          <label className="rs-ai-role"><span>Target role <small>Optional, but improves wording</small></span><input value={form.preferred_roles} onChange={(event) => update("preferred_roles", event.target.value)} placeholder="e.g. Electrical Design Engineer" /></label>
          <div className="rs-ai-fill-truth"><strong>Truth-first rule</strong><span>It will not invent grades, employers, certifications or completed projects. Suggestions are kept separate until you review them.</span></div>
        </div>
        <div className="rs-ai-fill-actions">
          <button className="rs-button rs-button-primary" type="button" onClick={() => autoFillResume("missing")} disabled={aiFilling || saving}>{aiFilling && aiFillMode === "missing" ? "Filling your resume…" : "Auto-fill my resume ✦"}</button>
          <button className="rs-button rs-button-quiet" type="button" onClick={() => autoFillResume("all")} disabled={aiFilling || saving}>{aiFilling && aiFillMode === "all" ? "Improving writing…" : "Improve all writing"}</button>
          <small>{aiFilling ? "Working on your profile — keep this page open." : "One click · no long forms · editable result"}</small>
        </div>
        {aiSuggestions.length > 0 && <div className="rs-ai-suggestions">
          <div className="rs-ai-suggestions-head"><div><strong>Items that need your input</strong><p>Ideas and templates are separate from verified resume facts.</p></div><button type="button" className="rs-button rs-button-quiet rs-small" onClick={() => setAiSuggestions([])}>Hide</button></div>
          {aiSuggestions.map((suggestion, index) => <div className="rs-ai-suggestion" key={`${index}-${suggestion}`}><span>{suggestion}</span>{/PROJECT IDEA/i.test(suggestion) && <button className="rs-button rs-button-quiet rs-small" type="button" onClick={() => useSuggestionAsDraft(suggestion)}>Add as labelled draft</button>}</div>)}
        </div>}
      </section>

      <div className="rs-workspace">
        <section className={`rs-editor-card ${previewMobile ? "rs-hide-mobile-editor" : ""}`}>
          <div className="rs-panel-header"><div><span className="rs-eyebrow">RESUME WORKSPACE</span><h2>Craft your resume</h2><p>Update your information once. The preview refreshes as you type.</p></div><button className="rs-button rs-button-quiet rs-small" type="button" onClick={downloadProfileBackup}>Export data</button></div>
          <div className="rs-tabs" role="tablist" aria-label="Resume editor tabs"><button type="button" className={activeTab === "content" ? "active" : ""} onClick={() => { setActiveTab("content"); setPreviewMobile(false); }}> <span>01</span> Content</button><button type="button" className={activeTab === "design" ? "active" : ""} onClick={() => setActiveTab("design")}><span>02</span> Design</button><button type="button" className={activeTab === "ats" ? "active" : ""} onClick={() => setActiveTab("ats")}><span>03</span> Job match</button></div>

          {activeTab === "content" && <div className="rs-tab-content">
            <div className="rs-section-title"><div className="rs-section-icon">✳</div><div><h3>Contact & headline</h3><p>Make it easy for a recruiter to identify and contact you.</p></div></div>
            <div className="rs-form-grid"><Field label="Full name" value={form.full_name} onChange={(v) => update("full_name", v)} placeholder="e.g. Aditi Sharma" required /><Field label="Email address" type="email" value={form.email} onChange={(v) => update("email", v)} placeholder="you@example.com" required /><Field label="Phone number" value={form.phone} onChange={(v) => update("phone", v)} placeholder="+91 98765 43210" /><Field label="Target role / headline" value={form.preferred_roles} onChange={(v) => update("preferred_roles", v)} placeholder="e.g. Electrical Design Engineer" hint="This appears directly under your name." /></div>

            <div className="rs-section-divider" />
            <div className="rs-section-title"><div className="rs-section-icon">⌂</div><div><h3>Education</h3><p>Show your degree, discipline and academic performance.</p></div></div>
            <div className="rs-form-grid"><Field label="Degree" value={form.degree} onChange={(v) => update("degree", v)} placeholder="B.Tech / B.E. / B.Sc." required /><Field label="Department / branch" value={form.department} onChange={(v) => update("department", v)} placeholder="Electrical Engineering" /><Field label="Graduation year" type="number" value={form.graduation_year} onChange={(v) => update("graduation_year", v)} placeholder="2026" /><Field label="CGPA (out of 10)" type="number" value={form.cgpa} onChange={(v) => update("cgpa", v)} placeholder="8.50" hint="Leave blank if you do not want to show it." /></div>

            <div className="rs-section-divider" />
            <div className="rs-section-title"><div className="rs-section-icon">✎</div><div><h3>Professional summary</h3><p>A short 2–4 line introduction tailored to your target role.</p></div></div>
            <Area label="Summary / career objective" value={form.career_objective} onChange={(v) => update("career_objective", v)} rows={4} placeholder="Example: Electrical engineering student with hands-on experience in circuit analysis, MATLAB and power systems. Interested in applying simulation and troubleshooting skills to real engineering projects." hint="Avoid generic statements. Mention your discipline, strengths and the kind of work you want to do." />

            <div className="rs-section-divider" />
            <div className="rs-section-title"><div className="rs-section-icon">⌘</div><div><h3>Skills</h3><p>Separate skills with commas, semicolons or new lines.</p></div></div>
            <Area label="Technical & professional skills" value={form.skills} onChange={(v) => update("skills", v)} rows={4} placeholder="MATLAB, Simulink, PLC, SCADA, Power Systems, Circuit Analysis" hint={`${skills.length} skill${skills.length === 1 ? "" : "s"} detected`} />

            <div className="rs-section-divider" />
            <div className="rs-section-title"><div className="rs-section-icon">▣</div><div><h3>Projects</h3><p>Use one project per paragraph. Put the project name first, then tools and outcome.</p></div></div>
            <Area label="Project work" value={form.projects} onChange={(v) => update("projects", v)} rows={6} placeholder={`Solar tracking system | Designed a prototype using Arduino and sensor feedback; documented tracking accuracy.\n\nPower system load-flow analysis | Modelled a sample network and compared bus voltage profiles.`} hint="Strong project entries explain what you built, the tools used and the result." />

            <div className="rs-section-divider" />
            <div className="rs-section-title"><div className="rs-section-icon">▤</div><div><h3>Experience & internships</h3><p>Include role, organisation, dates and concrete work. One entry per paragraph.</p></div></div>
            <Area label="Work experience" value={form.experience} onChange={(v) => update("experience", v)} rows={6} placeholder={`Electrical Intern — ABC Energy | Jun–Jul 2025\n• Assisted with preventive maintenance and inspection records.\n• Supported testing and fault-report documentation.`} />

            <div className="rs-section-divider" />
            <div className="rs-section-title"><div className="rs-section-icon">◇</div><div><h3>Certifications & training</h3><p>Add relevant courses, licences or technical training.</p></div></div>
            <Area label="Certifications" value={form.certifications} onChange={(v) => update("certifications", v)} rows={3} placeholder="PLC Programming Fundamentals — Provider, 2025\nMATLAB Onramp — MathWorks, 2025" />

            <div className="rs-section-divider" />
            <div className="rs-section-title"><div className="rs-section-icon">↗</div><div><h3>Professional links</h3><p>Use full URLs so they remain clickable after export.</p></div></div>
            <div className="rs-form-grid"><Field label="LinkedIn URL" value={form.linkedin} onChange={(v) => update("linkedin", v)} placeholder="https://linkedin.com/in/your-name" /><Field label="GitHub / portfolio URL" value={form.github} onChange={(v) => update("github", v)} placeholder="https://github.com/your-name" /></div>
            <div className="rs-editor-footer"><span>Changes appear in the preview immediately.</span><button className="rs-button rs-button-primary" type="button" onClick={generateDraft} disabled={generating || saving}>{generating ? "Building…" : "Save & build resume ↗"}</button></div>
          </div>}

          {activeTab === "design" && <div className="rs-tab-content">
            <div className="rs-section-title"><div className="rs-section-icon">◈</div><div><h3>Choose a resume style</h3><p>Pick a professional design. The preview and HTML export use your selection.</p></div></div>
            <div className="rs-template-grid">{TEMPLATE_OPTIONS.map((option) => <button key={option.id} type="button" className={`rs-template-option ${template === option.id ? "selected" : ""}`} onClick={() => setTemplate(option.id)}><div className={`rs-template-mini rs-mini-${option.id}`}><div /><i /><i /><i /><b /><b /></div><span className="rs-template-name">{option.icon} {option.name}</span><small>{option.note}</small>{template === option.id && <em>Selected</em>}</button>)}</div>
            <div className="rs-section-divider" />
            <div className="rs-section-title"><div className="rs-section-icon">◉</div><div><h3>Accent colour</h3><p>Use one accent so section headings and highlights feel consistent.</p></div></div>
            <div className="rs-colour-row">{ACCENTS.map((color) => <button key={color} type="button" title={`Set accent ${color}`} aria-label={`Set accent ${color}`} className={`rs-colour-swatch ${accent === color ? "chosen" : ""}`} style={{ background: color }} onClick={() => setAccent(color)} />)}<span>Selected colour is applied to the resume, not to the printed editor UI.</span></div>
            <div className="rs-section-divider" />
            <div className="rs-section-title"><div className="rs-section-icon">☷</div><div><h3>Sections to include</h3><p>Hide sections that do not add value to this particular application.</p></div></div>
            <div className="rs-section-toggles">{[["summary", "Professional summary"], ["education", "Education"], ["skills", "Skills"], ["projects", "Projects"], ["experience", "Experience"], ["certifications", "Certifications & training"], ["links", "Professional links"]].map(([key, label]) => <label key={key} className="rs-toggle"><span>{label}</span><input type="checkbox" checked={sections[key]} onChange={() => toggleSection(key)} /><i /></label>)}</div>
            <div className="rs-tip"><strong>Design tip</strong><p>For online applications, choose <b>ATS clean</b>, keep headings conventional and avoid graphics that contain important text. For networking, use Modern or Executive.</p></div>
          </div>}

          {activeTab === "ats" && <div className="rs-tab-content">
            <div className="rs-section-title"><div className="rs-section-icon">◎</div><div><h3>Target-job keyword check</h3><p>Paste the job description to compare its terms with your current resume content.</p></div></div>
            <Area label="Job description" value={targetDescription} onChange={setTargetDescription} rows={9} placeholder="Paste the job responsibilities and requirements here…" hint="This is a local keyword overlap check, not a hiring prediction." />
            {keywordScore !== null ? <div className="rs-keyword-result"><div className="rs-keyword-score"><strong>{keywordScore}%</strong><span>keyword overlap</span></div><div className="rs-keyword-detail"><div className="rs-keyword-bar"><span style={{ width: `${keywordScore}%` }} /></div><p>{targetKeywords.filter((item) => item.matched).length} matched from {targetKeywords.length} unique description terms checked.</p></div></div> : <div className="rs-tip"><strong>How this works</strong><p>Paste a role description to reveal terms already present in your skills, projects, experience and summary. It does not send this text to an AI service.</p></div>}
            {targetKeywords.length > 0 && <div className="rs-keyword-cloud">{targetKeywords.map((item) => <span key={item.term} className={item.matched ? "matched" : "missing"}>{item.matched ? "✓" : "+"} {item.term}</span>)}</div>}
            <div className="rs-tip"><strong>Content quality checklist</strong><ul><li>Use real, verifiable skills—never add a keyword just because it appears in a job description.</li><li>Start project and experience bullets with action verbs.</li><li>Add outcomes, scale, tools or measurements where you have evidence.</li><li>Keep the first page focused on the most role-relevant information.</li></ul></div>
          </div>}
        </section>

        <aside className={`rs-preview-card ${previewMobile ? "rs-show-mobile-preview" : ""}`}>
          <div className="rs-preview-header"><div><span className="rs-eyebrow">LIVE DOCUMENT</span><h2>Resume preview</h2><p>Paper preview updates with every edit.</p></div><button className="rs-button rs-button-quiet rs-small rs-mobile-back" type="button" onClick={() => setPreviewMobile(false)}>← Edit content</button><span className="rs-a4-pill">A4 · PRINT READY</span></div>
          <div className="rs-preview-toolbar"><span className="rs-preview-dot" />Live preview <span className="rs-preview-template">{TEMPLATE_OPTIONS.find((item) => item.id === template)?.name}</span><button type="button" onClick={() => window.print()}>Print / Save PDF ↗</button></div>
          <div className="rs-paper-stage"><ResumeSections form={form} sections={sections} skills={skills} projects={projects} experience={experience} certifications={certifications} template={template} accent={accent} /></div>
          <div className="rs-export-row"><button className="rs-button rs-button-primary" type="button" onClick={() => window.print()}>↓ Print / Save as PDF</button><button className="rs-button rs-button-outline" type="button" onClick={exportHtml}>Export HTML</button><button className="rs-button rs-button-outline" type="button" onClick={downloadProfileBackup}>Backup data</button></div>
          <div className="rs-preview-footnote"><span>✓ Editable</span><span>✓ A4 layout</span><span>✓ No invented data</span></div>
        </aside>
      </div>
    </main>
  );
}

const CSS = `
.rs-page{--rs-accent:#315efb;min-height:100vh;padding:26px clamp(14px,2.2vw,34px) 48px;background:radial-gradient(ellipse at 0% 0%,rgba(49,94,251,.08),transparent 34%),#f3f6fb;color:#172033;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-sizing:border-box}.rs-page *{box-sizing:border-box}.rs-loading{min-height:60vh;display:flex;align-items:center;justify-content:center;gap:12px;color:#475569;font-weight:700}.rs-loader{width:21px;height:21px;border:2px solid #dbe5ff;border-top-color:#315efb;border-radius:50%;animation:rs-spin .8s linear infinite}@keyframes rs-spin{to{transform:rotate(360deg)}}
.rs-topbar{max-width:1600px;margin:0 auto 22px;display:flex;align-items:center;justify-content:space-between;gap:22px}.rs-brandline{display:flex;align-items:center;gap:14px}.rs-brandmark{width:48px;height:48px;display:grid;place-items:center;border-radius:15px;background:linear-gradient(135deg,#2f65f5,#7454f7);color:#fff;font-size:21px;font-weight:950;box-shadow:0 10px 24px #315efb35}.rs-eyebrow{display:block;color:#52647d;font-size:10px;font-weight:900;letter-spacing:.15em;text-transform:uppercase}.rs-topbar h1{margin:5px 0 4px;font-size:clamp(25px,2vw,32px);letter-spacing:-.045em;line-height:1.1;color:#101827}.rs-topbar p{margin:0;color:#64748b;font-size:13px}.rs-top-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap}.rs-button{appearance:none;border:1px solid transparent;border-radius:11px;padding:11px 15px;min-height:40px;display:inline-flex;align-items:center;justify-content:center;gap:7px;font:inherit;font-size:12px;font-weight:850;cursor:pointer;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease;text-decoration:none;white-space:nowrap}.rs-button:hover{transform:translateY(-1px)}.rs-button:disabled{opacity:.55;cursor:not-allowed;transform:none}.rs-button-primary{background:linear-gradient(135deg,var(--rs-accent),#6249ee);color:#fff;box-shadow:0 7px 16px #315efb25}.rs-button-primary:hover{box-shadow:0 10px 24px #315efb35}.rs-button-quiet{background:#fff;color:#344256;border-color:#dce4ef}.rs-button-outline{background:#fff;color:#24344c;border-color:#d8e0eb}.rs-small{min-height:34px;padding:8px 11px;font-size:11px}
.rs-hero{max-width:1600px;margin:0 auto 22px;min-height:235px;padding:clamp(23px,3vw,38px);border-radius:24px;overflow:hidden;position:relative;display:grid;grid-template-columns:minmax(0,1.4fr) minmax(300px,.75fr);gap:38px;align-items:center;color:white;background:radial-gradient(circle at 75% 8%,#4b7bff55,transparent 30%),radial-gradient(circle at 96% 100%,#9c7bff45,transparent 38%),linear-gradient(120deg,#111d3d 0%,#172e5f 55%,#263c78 100%);box-shadow:0 20px 42px #14264921}.rs-hero:after{content:"";position:absolute;right:-70px;top:-145px;width:430px;height:430px;border:1px solid #ffffff1a;border-radius:50%;box-shadow:0 0 0 45px #ffffff08,0 0 0 90px #ffffff05;pointer-events:none}.rs-hero-copy,.rs-hero-progress{position:relative;z-index:1}.rs-eyebrow-light{color:#9fb7ff}.rs-hero h2{margin:12px 0 11px;font-size:clamp(29px,3vw,42px);line-height:1.04;letter-spacing:-.05em}.rs-hero h2 em{font-family:Georgia,serif;color:#b8c8ff;font-weight:500}.rs-hero-copy>p{max-width:650px;margin:0;color:#c4d1e8;font-size:13px;line-height:1.7}.rs-hero-pills{display:flex;flex-wrap:wrap;gap:7px;margin-top:20px}.rs-hero-pills span{border:1px solid #ffffff28;background:#ffffff0c;border-radius:999px;padding:7px 10px;color:#edf3ff;font-size:10px;font-weight:750}.rs-hero-progress{background:#ffffff0d;border:1px solid #ffffff24;border-radius:18px;padding:20px;backdrop-filter:blur(9px)}.rs-progress-top,.rs-progress-foot{display:flex;justify-content:space-between;align-items:center;gap:12px}.rs-progress-top span{color:#b7c7e4;font-size:9px;font-weight:900;letter-spacing:.12em}.rs-progress-top strong{font-size:25px;letter-spacing:-.05em}.rs-progress{height:7px;background:#ffffff22;border-radius:99px;overflow:hidden;margin:12px 0 9px}.rs-progress span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#8ac8ff,#c2b7ff);transition:width .35s ease}.rs-progress-foot{font-size:10px;color:#c5d2e8}.rs-hero-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:21px;padding-top:15px;border-top:1px solid #ffffff22}.rs-hero-stats div{display:grid;gap:4px}.rs-hero-stats strong{font-size:22px;letter-spacing:-.04em}.rs-hero-stats span{color:#c5d2e8;font-size:10px}
.rs-alert{max-width:1600px;margin:0 auto 13px;border-radius:13px;padding:12px 15px;display:flex;align-items:center;gap:11px;font-size:12px}.rs-alert>span{width:25px;height:25px;display:grid;place-items:center;border-radius:8px;font-weight:900;flex:none}.rs-alert p{margin:2px 0 0}.rs-alert button{margin-left:auto;background:transparent;border:0;font-size:21px;cursor:pointer;color:inherit}.rs-alert-error{color:#a32929;background:#fff3f3;border:1px solid #ffd2d2}.rs-alert-error>span{background:#ffe1e1}.rs-alert-success{color:#08734f;background:#effcf6;border:1px solid #b9efd7}.rs-alert-success>span{background:#d7f7e8}
.rs-workspace{max-width:1600px;margin:0 auto;display:grid;grid-template-columns:minmax(400px,.93fr) minmax(500px,1.07fr);gap:20px;align-items:start}.rs-editor-card,.rs-preview-card{background:#fff;border:1px solid #e2e8f1;border-radius:21px;box-shadow:0 8px 30px #12213e08;min-width:0}.rs-editor-card{padding:22px}.rs-panel-header{display:flex;justify-content:space-between;align-items:flex-start;gap:15px}.rs-panel-header h2,.rs-preview-header h2{margin:6px 0 5px;font-size:20px;letter-spacing:-.035em;color:#151f31}.rs-panel-header p,.rs-preview-header p{font-size:12px;line-height:1.55;margin:0;color:#718096}.rs-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;padding:5px;border-radius:13px;background:#f1f4f9;margin:20px 0 23px}.rs-tabs button{border:1px solid transparent;border-radius:9px;background:transparent;color:#65738a;padding:10px 7px;font:inherit;font-size:11px;font-weight:850;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px}.rs-tabs button span{font-size:9px;color:#98a4b7}.rs-tabs button.active{background:#fff;color:#182438;border-color:#e1e7f0;box-shadow:0 2px 5px #1323430b}.rs-tabs button.active span{color:var(--rs-accent)}.rs-tab-content{animation:rs-fade .2s ease}@keyframes rs-fade{from{opacity:.7;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}.rs-section-title{display:flex;align-items:flex-start;gap:11px;margin:4px 0 14px}.rs-section-icon{width:34px;height:34px;display:grid;place-items:center;border-radius:10px;background:#edf2ff;color:var(--rs-accent);font-size:17px;font-weight:900;flex:none}.rs-section-title h3{margin:0;font-size:14px;letter-spacing:-.02em;color:#192437}.rs-section-title p{margin:4px 0 0;color:#78869b;font-size:11px;line-height:1.5}.rs-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.rs-field{display:grid;gap:7px;min-width:0}.rs-label{display:flex;align-items:center;gap:7px;color:#39475d;font-size:11px;font-weight:850}.rs-label i{font-style:normal;color:#315efb;background:#eef3ff;border-radius:99px;padding:3px 6px;font-size:8px;letter-spacing:.03em;text-transform:uppercase}.rs-field input,.rs-field textarea{width:100%;min-width:0;color:#182438;background:#fbfcff;border:1px solid #d7e0ec;border-radius:11px;padding:12px 13px;font:500 12px/1.55 Inter,ui-sans-serif,system-ui,sans-serif;outline:none;transition:border-color .15s ease,box-shadow .15s ease,background .15s ease;box-shadow:none}.rs-field input{min-height:43px}.rs-field textarea{resize:vertical;min-height:86px}.rs-field input:focus,.rs-field textarea:focus{background:#fff;border-color:var(--rs-accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--rs-accent) 13%,transparent)}.rs-field input::placeholder,.rs-field textarea::placeholder{color:#7b879a!important;opacity:1!important;font-weight:450}.rs-field small{color:#7b879a;font-size:10px;line-height:1.45}.rs-section-divider{height:1px;background:#edf0f5;margin:22px 0}.rs-editor-footer{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;border-top:1px solid #edf0f5;margin-top:24px;padding-top:17px}.rs-editor-footer>span{font-size:10px;color:#7d8aa0}
.rs-template-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.rs-template-option{position:relative;min-width:0;text-align:left;padding:10px;border:1px solid #dfe6f0;background:#fff;border-radius:13px;cursor:pointer;transition:border-color .15s ease,box-shadow .15s ease}.rs-template-option.selected{border-color:var(--rs-accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--rs-accent) 10%,transparent)}.rs-template-mini{height:120px;border:1px solid #e1e6ee;border-radius:7px;background:#fff;margin-bottom:10px;padding:12px;position:relative;overflow:hidden}.rs-template-mini div{height:8px;width:67%;background:#24344d;margin-bottom:7px}.rs-template-mini i{display:block;height:3px;width:86%;background:#d1d9e5;margin:6px 0}.rs-template-mini i:nth-of-type(2){width:75%}.rs-template-mini i:nth-of-type(3){width:58%}.rs-template-mini b{display:inline-block;height:10px;width:23%;margin:8px 4px 0 0;background:#dbe5ff;border-radius:2px}.rs-mini-modern{border-top:9px solid var(--rs-accent);padding-top:9px}.rs-mini-modern div{background:var(--rs-accent)}.rs-mini-ats{border-radius:2px}.rs-mini-ats div{height:5px;background:#111827}.rs-mini-ats i{height:2px;background:#8d99aa;margin:8px 0}.rs-mini-executive{padding-top:20px}.rs-mini-executive div{margin-left:auto;margin-right:auto;height:7px}.rs-mini-executive i{margin-left:auto;margin-right:auto;width:75%}.rs-template-name{display:block;font-size:11px;font-weight:900;color:#172338}.rs-template-option small{display:block;margin-top:4px;min-height:29px;color:#75839a;font-size:9px;line-height:1.45}.rs-template-option em{position:absolute;right:8px;top:8px;padding:4px 5px;border-radius:5px;color:#fff;background:var(--rs-accent);font-size:8px;font-style:normal;font-weight:850}.rs-colour-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.rs-colour-swatch{width:29px;height:29px;border-radius:50%;border:3px solid white;box-shadow:0 0 0 1px #ccd5e3;cursor:pointer}.rs-colour-swatch.chosen{box-shadow:0 0 0 2px var(--rs-accent)}.rs-colour-row>span{flex:1 1 180px;color:#78869a;font-size:10px}.rs-section-toggles{display:grid;gap:8px}.rs-toggle{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid #e5eaf2;border-radius:11px;padding:11px 12px;color:#35445b;font-size:11px;font-weight:750;cursor:pointer}.rs-toggle input{position:absolute;opacity:0;pointer-events:none}.rs-toggle i{width:34px;height:20px;border-radius:99px;background:#d5dce7;position:relative;transition:background .15s ease;flex:none}.rs-toggle i:after{content:"";position:absolute;left:3px;top:3px;width:14px;height:14px;border-radius:50%;background:white;box-shadow:0 1px 4px #0b122024;transition:transform .15s ease}.rs-toggle input:checked+i{background:var(--rs-accent)}.rs-toggle input:checked+i:after{transform:translateX(14px)}.rs-tip{margin-top:20px;padding:15px 16px;border:1px solid #dbe6ff;background:#f5f8ff;border-radius:13px;color:#374967;font-size:11px;line-height:1.65}.rs-tip strong{font-size:11px;color:#1a2a46}.rs-tip p{margin:5px 0 0}.rs-tip ul{padding-left:18px;margin:8px 0 0}.rs-tip li{margin:4px 0}
.rs-keyword-result{display:flex;align-items:center;gap:16px;border:1px solid #e2e9f4;border-radius:14px;padding:15px;margin-top:16px}.rs-keyword-score{min-width:96px;display:grid;gap:3px}.rs-keyword-score strong{font-size:27px;letter-spacing:-.05em;color:var(--rs-accent)}.rs-keyword-score span{font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#7b8799}.rs-keyword-detail{flex:1;min-width:0}.rs-keyword-bar{height:7px;background:#e8edf5;border-radius:99px;overflow:hidden}.rs-keyword-bar span{display:block;background:var(--rs-accent);height:100%;border-radius:inherit}.rs-keyword-detail p{font-size:10px;color:#728198;margin:7px 0 0}.rs-keyword-cloud{display:flex;gap:7px;flex-wrap:wrap;margin-top:14px}.rs-keyword-cloud span{border-radius:7px;padding:6px 8px;font-size:10px;font-weight:750}.rs-keyword-cloud .matched{color:#08734f;background:#e7f8f0}.rs-keyword-cloud .missing{color:#64748b;background:#eef1f6}
.rs-preview-card{position:sticky;top:18px;overflow:hidden}.rs-preview-header{display:flex;align-items:center;gap:12px;justify-content:space-between;padding:21px 22px 16px}.rs-preview-header h2{font-size:18px}.rs-a4-pill{font-size:8px;font-weight:900;letter-spacing:.08em;color:#52647f;background:#f0f4fa;border:1px solid #e2e8f1;border-radius:99px;padding:6px 8px;white-space:nowrap}.rs-preview-toolbar{min-height:43px;padding:9px 20px;background:#f9fbfe;border-top:1px solid #eef1f6;border-bottom:1px solid #eef1f6;display:flex;align-items:center;gap:8px;color:#718096;font-size:10px}.rs-preview-dot{width:7px;height:7px;border-radius:50%;background:#13a779;box-shadow:0 0 0 3px #d8f8ec}.rs-preview-template{color:#475d80;font-weight:850}.rs-preview-toolbar button{margin-left:auto;background:white;border:1px solid #dce4ef;color:#34445d;border-radius:8px;padding:7px 10px;font:inherit;font-weight:850;cursor:pointer}.rs-paper-stage{overflow:auto;max-height:calc(100vh - 240px);min-height:640px;padding:20px;background:linear-gradient(135deg,#f0f3f8,#e9eef6)}.rs-paper{position:relative;isolation:isolate;width:100%;max-width:794px;min-height:950px;margin:0 auto;padding:clamp(25px,3.5vw,48px);background:#fff;color:#182033;box-shadow:0 8px 28px #15294c1a;font-family:Arial,Helvetica,sans-serif;overflow:hidden}.rs-paper-band{position:absolute;z-index:-1;top:0;left:0;right:0;height:12px;background:var(--rs-accent)}.rs-paper-header{display:flex;align-items:center;gap:16px;padding-bottom:20px;margin-bottom:18px;border-bottom:2px solid var(--rs-accent)}.rs-paper-initials{width:51px;height:51px;border-radius:13px;display:grid;place-items:center;background:var(--rs-accent);color:#fff;font-size:15px;font-weight:900;flex:none}.rs-paper-identity{min-width:0}.rs-paper-header h2{overflow-wrap:anywhere;font-size:clamp(22px,2vw,29px);line-height:1.1;letter-spacing:-.04em;margin:0;color:#101828}.rs-paper-role{font-size:11px;font-weight:800;color:var(--rs-accent);margin-top:7px}.rs-paper-contact{font-size:9px;line-height:1.55;color:#566276;overflow-wrap:anywhere;margin-top:7px}.rs-paper-section{break-inside:avoid;margin-top:19px}.rs-paper-section h3{margin:0 0 9px;padding-bottom:5px;font-size:10px;text-transform:uppercase;letter-spacing:.14em;color:var(--rs-accent);border-bottom:1px solid #dbe2eb}.rs-paper-section p{white-space:pre-wrap;font-size:10px;line-height:1.65;margin:5px 0;color:#394458;overflow-wrap:anywhere}.rs-paper-row{display:flex;justify-content:space-between;gap:12px;font-size:10px;line-height:1.5}.rs-paper-row strong{color:#182033}.rs-paper-row span{font-size:9px;color:#657186;white-space:nowrap}.rs-paper-muted{font-size:9px!important;color:#64748b!important}.rs-paper-skills{display:flex;flex-wrap:wrap;gap:5px}.rs-paper-skills span{border:1px solid #dbe2eb;border-radius:4px;padding:4px 6px;font-size:8.5px;color:#334155;overflow-wrap:anywhere}.rs-paper-entry{margin:0 0 11px;break-inside:avoid}.rs-paper-entry strong{font-size:10px;color:#263348}.rs-paper-entry p{margin:4px 0}.rs-paper-section ul{padding-left:18px;margin:4px 0}.rs-paper-section li{font-size:9.5px;line-height:1.6;margin:3px 0;color:#394458;overflow-wrap:anywhere}.rs-paper-footer{margin-top:30px;padding-top:9px;border-top:1px solid #e4e8ef;color:#a0a8b6;font-size:8px}.rs-paper-ats{padding:45px 48px;box-shadow:0 8px 28px #15294c1a;border-radius:0}.rs-paper-ats .rs-paper-initials{display:none}.rs-paper-ats .rs-paper-header{border-bottom:1px solid #111827;text-align:left}.rs-paper-ats .rs-paper-header h2{font-family:Arial,sans-serif;font-size:27px;letter-spacing:0;color:#111827;text-transform:uppercase}.rs-paper-ats .rs-paper-role,.rs-paper-ats .rs-paper-section h3{color:#111827}.rs-paper-ats .rs-paper-header{border-color:#111827}.rs-paper-ats .rs-paper-section h3{border-color:#9ca3af}.rs-paper-ats .rs-paper-skills span{border:0;padding:0;font-size:9px}.rs-paper-executive{font-family:Georgia,"Times New Roman",serif;padding-top:54px}.rs-paper-executive .rs-paper-header{display:block;text-align:center;border-bottom:1px solid var(--rs-accent);padding-bottom:24px}.rs-paper-executive .rs-paper-initials{margin:0 auto 13px;border-radius:50%;width:42px;height:42px;font-family:Arial,sans-serif}.rs-paper-executive .rs-paper-header h2{font-family:Georgia,serif;font-size:31px;letter-spacing:.01em;font-weight:600}.rs-paper-executive .rs-paper-contact{font-family:Arial,sans-serif}.rs-paper-executive .rs-paper-section h3{font-family:Arial,sans-serif;letter-spacing:.17em}.rs-paper-executive .rs-paper-section p,.rs-paper-executive .rs-paper-entry p{font-size:10.5px}.rs-export-row{display:flex;flex-wrap:wrap;gap:8px;padding:15px 18px;border-top:1px solid #edf0f5}.rs-export-row .rs-button{flex:1 1 auto}.rs-preview-footnote{display:flex;flex-wrap:wrap;gap:14px;padding:0 20px 17px;color:#8090a4;font-size:9px}.rs-mobile-back{display:none}
@media(max-width:1200px){.rs-workspace{grid-template-columns:minmax(0,.95fr) minmax(430px,1.05fr);gap:14px}.rs-editor-card{padding:17px}.rs-paper-stage{padding:12px}.rs-preview-header{padding:17px}.rs-paper{padding:30px}.rs-paper-ats{padding:32px}.rs-hero{gap:22px}}
@media(max-width:980px){.rs-topbar{align-items:flex-start;flex-direction:column}.rs-top-actions{justify-content:flex-start}.rs-hero{grid-template-columns:1fr;gap:22px}.rs-hero-progress{max-width:none}.rs-workspace{grid-template-columns:1fr}.rs-preview-card{position:static}.rs-paper-stage{max-height:none;min-height:400px}.rs-paper{max-width:794px;min-height:900px}}
@media(max-width:620px){.rs-page{padding:14px 10px 30px}.rs-brandmark{width:40px;height:40px;border-radius:12px}.rs-brandline{align-items:flex-start}.rs-topbar h1{font-size:26px}.rs-top-actions{width:100%}.rs-top-actions .rs-button{flex:1}.rs-hero{padding:22px 18px;border-radius:18px}.rs-hero h2{font-size:30px}.rs-hero-progress{padding:15px}.rs-editor-card{padding:15px}.rs-panel-header{align-items:flex-start}.rs-tabs button{font-size:10px;gap:4px}.rs-form-grid{grid-template-columns:1fr}.rs-template-grid{grid-template-columns:1fr}.rs-template-option{display:grid;grid-template-columns:72px 1fr;column-gap:12px;align-items:center}.rs-template-mini{grid-row:span 3;height:92px;margin:0}.rs-template-option small{min-height:0}.rs-template-option em{left:7px;right:auto;top:7px;font-size:7px}.rs-preview-header{padding:16px;flex-wrap:wrap}.rs-a4-pill{display:none}.rs-paper-stage{padding:8px;min-height:300px}.rs-paper{min-height:0;padding:24px 20px}.rs-paper-ats{padding:24px 20px}.rs-paper-header{gap:10px}.rs-paper-initials{width:40px;height:40px;border-radius:10px}.rs-paper-header h2{font-size:23px}.rs-paper-executive .rs-paper-header h2{font-size:26px}.rs-export-row{padding:12px}.rs-export-row .rs-button{flex:1 1 100%}.rs-editor-footer{align-items:stretch}.rs-editor-footer .rs-button{width:100%}.rs-keyword-result{align-items:flex-start}.rs-keyword-score{min-width:74px}.rs-keyword-cloud{gap:5px}}
@media(max-width:760px){.rs-hide-mobile-editor{display:none}.rs-mobile-back{display:inline-flex}.rs-show-mobile-preview{display:block}.rs-preview-card:not(.rs-show-mobile-preview){display:block}.rs-preview-card{position:relative;top:auto}}
.rs-ai-fill{display:grid;grid-template-columns:48px minmax(0,1fr) minmax(220px,285px);align-items:start;gap:18px;margin:20px 0 18px;padding:22px 24px;border:1px solid #dce6f4;border-radius:20px;background:radial-gradient(circle at 0% 0%,rgba(49,94,251,.10),transparent 36%),linear-gradient(135deg,#fff,#f8faff);box-shadow:0 14px 34px rgba(19,36,73,.055)}.rs-ai-fill-icon{width:46px;height:46px;display:grid;place-items:center;border-radius:14px;background:linear-gradient(135deg,#315efb,#7545ee);box-shadow:0 8px 18px rgba(49,94,251,.22);color:#fff;font-size:22px}.rs-ai-fill-copy{min-width:0}.rs-ai-fill-copy h2{margin:5px 0 6px;color:#121c31;font-size:21px;letter-spacing:-.04em}.rs-ai-fill-copy>p{margin:0;color:#68778e;font-size:12px;line-height:1.7;max-width:780px}.rs-ai-role{display:grid;gap:6px;margin-top:13px;max-width:520px}.rs-ai-role>span{display:flex;align-items:center;gap:8px;color:#35455e;font-size:10px;font-weight:850}.rs-ai-role>span small{font-size:9px;color:#8793a5;font-weight:600}.rs-ai-role input{width:100%;min-height:39px;padding:10px 12px;background:#fff;border:1px solid #d4dfed;border-radius:10px;color:#172033;font:inherit;font-size:12px;outline:none;transition:border-color .15s,box-shadow .15s}.rs-ai-role input::placeholder{color:#8b97a9;opacity:1}.rs-ai-role input:focus{border-color:#315efb;box-shadow:0 0 0 3px #315efb19}.rs-ai-fill-truth{display:flex;gap:9px;align-items:flex-start;margin-top:11px;padding:9px 11px;border:1px solid #dce9ff;border-radius:10px;background:#f4f8ff;color:#4d5e7a;font-size:10px;line-height:1.55}.rs-ai-fill-truth strong{flex:none;color:#1d4ed8}.rs-ai-fill-actions{display:flex;flex-direction:column;align-items:stretch;gap:8px}.rs-ai-fill-actions .rs-button{justify-content:center;min-height:41px}.rs-ai-fill-actions small{color:#8490a4;text-align:center;font-size:9px;line-height:1.5}.rs-ai-suggestions{grid-column:2/4;min-width:0;border-top:1px solid #e6edf7;padding-top:15px;margin-top:2px}.rs-ai-suggestions-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px}.rs-ai-suggestions-head strong{color:#20304a;font-size:12px}.rs-ai-suggestions-head p{margin:4px 0 0;color:#8190a4;font-size:10px}.rs-ai-suggestion{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:11px 0;border-top:1px solid #edf1f7;color:#596981;font-size:10px;line-height:1.6}.rs-ai-suggestion:first-of-type{border-top:0}.rs-ai-suggestion>span{min-width:0;overflow-wrap:anywhere}.rs-ai-suggestion .rs-button{flex:none}.rs-ai-fill button:disabled{opacity:.58;cursor:wait}.rs-ai-fill-actions .rs-button-primary{box-shadow:0 6px 16px rgba(49,94,251,.18)}
@media(max-width:980px){.rs-ai-fill{grid-template-columns:44px minmax(0,1fr)}.rs-ai-fill-actions{grid-column:2;flex-direction:row;flex-wrap:wrap}.rs-ai-fill-actions .rs-button{flex:1}.rs-ai-fill-actions small{flex:1 1 100%}.rs-ai-suggestions{grid-column:1/3}}
@media(max-width:620px){.rs-ai-fill{grid-template-columns:1fr;padding:17px;gap:12px;border-radius:16px}.rs-ai-fill-icon{width:40px;height:40px}.rs-ai-fill-copy h2{font-size:19px}.rs-ai-fill-actions{grid-column:1;flex-direction:column}.rs-ai-fill-actions .rs-button{width:100%}.rs-ai-suggestions{grid-column:1}.rs-ai-suggestion{flex-direction:column;align-items:stretch}.rs-ai-suggestion .rs-button{align-self:flex-start}.rs-ai-fill-truth{flex-direction:column;gap:3px}}
@media print{.rs-ai-fill{display:none!important}}
@media print{body *{visibility:hidden!important}.rs-paper,.rs-paper *{visibility:visible!important}.rs-paper{position:absolute!important;left:0!important;top:0!important;width:210mm!important;max-width:none!important;min-height:297mm!important;margin:0!important;padding:16mm!important;border:0!important;border-top:0!important;border-radius:0!important;box-shadow:none!important;overflow:visible!important;print-color-adjust:exact;-webkit-print-color-adjust:exact}.rs-paper-band{display:block!important}.rs-page{padding:0!important;background:#fff!important}.rs-topbar,.rs-hero,.rs-alert,.rs-editor-card,.rs-preview-header,.rs-preview-toolbar,.rs-export-row,.rs-preview-footnote{display:none!important}.rs-workspace{display:block!important;max-width:none!important;margin:0!important}.rs-preview-card{position:static!important;border:0!important;box-shadow:none!important;overflow:visible!important}.rs-paper-section{break-inside:avoid}.rs-paper-entry{break-inside:avoid}@page{size:A4;margin:0}}
`;
