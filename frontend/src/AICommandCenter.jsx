import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

function token() {
  return localStorage.getItem("campuslink_token") || "";
}

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token()}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.detail || `Request failed (${response.status})`);
  return data;
}

function roleLabel(role) {
  return String(role || "").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

const studentTools = [
  {
    icon: "⌁",
    title: "Resume Intelligence",
    tag: "ANALYZE",
    description: "Extract skills and profile signals from your resume and verify the data before saving.",
    to: "/student/resume-ai",
  },
  {
    icon: "✦",
    title: "AI Profile Extraction",
    tag: "ONBOARD",
    description: "Start with a PDF, review every extracted field, add your photo and complete onboarding.",
    to: "/student/onboarding",
  },
  {
    icon: "▤",
    title: "Resume Studio",
    tag: "BUILD",
    description: "Turn your verified profile into an editable, print-ready resume workspace.",
    to: "/student/resume",
  },
  {
    icon: "◉",
    title: "Job Match Engine",
    tag: "MATCH",
    description: "See graphical match scores, semantic relevance, skill coverage and eligibility together.",
    to: "/student/recommendations",
  },
];

const roleTools = {
  RECRUITER: [
    {
      icon: "✦",
      title: "AI Candidate Ranking",
      tag: "RANK",
      description: "Rank applicants using transparent skill, semantic and CGPA signals.",
      to: "/recruiter/ai-candidates",
    },
    {
      icon: "▣",
      title: "Hiring Dashboard",
      tag: "LIVE",
      description: "Use the live hiring command center to move from ranked candidates to interviews and offers.",
      to: "/recruiter",
    },
  ],
  PLACEMENT_OFFICER: [
    {
      icon: "◫",
      title: "Placement Intelligence",
      tag: "ANALYTICS",
      description: "Explore live placement funnel, drive mix, selection and offer metrics.",
      to: "/placement/analytics",
    },
    {
      icon: "▣",
      title: "Placement Command Center",
      tag: "LIVE",
      description: "Connect students, employers, applications, interviews and offers in one workflow.",
      to: "/placement",
    },
  ],
  ADMIN: [
    {
      icon: "⌬",
      title: "AI Control Center",
      tag: "OVERVIEW",
      description: "Inspect how AI-assisted career and hiring tools are exposed across CampusLink roles.",
      to: "/admin",
    },
  ],
};

export default function AICommandCenter({ role }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [targetRole, setTargetRole] = useState("");
  const [generated, setGenerated] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (role === "STUDENT") {
      Promise.allSettled([api("/auth/me"), api("/student-profile/me")]).then(([a, p]) => {
        setUser(a.status === "fulfilled" ? a.value : null);
        setProfile(p.status === "fulfilled" ? p.value : null);
        if (p.status === "fulfilled") {
          setTargetRole(String(p.value?.preferred_roles || "").split(/[;,\n]+/)[0]?.trim() || "Software Engineer");
        }
      });
    }
  }, [role]);

  const tools = useMemo(() => role === "STUDENT" ? studentTools : (roleTools[role] || []), [role]);

  async function generateWithAI() {
    if (!profile && role === "STUDENT") {
      setError("Complete your profile first so Resume AI has real data to work with.");
      return;
    }
    setGenerating(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        target_role: targetRole || "Software Engineer",
        student_name: user?.full_name || "Student",
        full_name: user?.full_name || "Student",
        email: user?.email || null,
        phone: profile?.phone || null,
        degree: profile?.degree || null,
        department: profile?.department || null,
        graduation_year: profile?.graduation_year || null,
        cgpa: profile?.cgpa ?? null,
        skills: profile?.skills || null,
        projects: profile?.projects || null,
        experience: profile?.experience || null,
        certifications: profile?.certifications || null,
        linkedin: profile?.linkedin || null,
        github: profile?.github || null,
        preferred_roles: profile?.preferred_roles || null,
        preferred_locations: profile?.preferred_locations || null,
        career_objective: profile?.career_objective || null,
        resume_text: profile?.resume_text || null,
      };
      const data = await api("/resume/generate", { method: "POST", body: JSON.stringify(payload) });
      setGenerated(data);
      setMessage("Qwen-powered resume generation completed. Open Resume Studio to edit or print it.");
    } catch (err) {
      setError(err?.message || "AI resume generation is unavailable.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="ai-center-page">
      <section className="ai-center-hero">
        <div>
          <span className="ai-center-eyebrow">CAMPUSLINK AI PLATFORM</span>
          <h1>{role === "STUDENT" ? "Your AI career cockpit" : `${roleLabel(role)} intelligence center`}</h1>
          <p>{role === "STUDENT" ? "Every AI workflow lives in one place — extract, analyze, build and match without losing the human review step." : "Launch the AI-assisted workflow that fits your role without leaving the CampusLink workspace."}</p>
        </div>
        <div className="ai-center-orb" aria-hidden="true"><span>✦</span><i /><b /></div>
      </section>

      {error && <div className="ai-center-alert error">{error}</div>}
      {message && <div className="ai-center-alert success">✓ {message}</div>}

      <section className="ai-tool-grid">
        {tools.map((tool, index) => (
          <Link className={`ai-tool-card ${index === 0 ? "featured" : ""}`} key={tool.to} to={tool.to}>
            <div className="ai-tool-top"><span className="ai-tool-icon">{tool.icon}</span><span className="ai-tool-tag">{tool.tag}</span></div>
            <h2>{tool.title}</h2>
            <p>{tool.description}</p>
            <span className="ai-tool-open">Open tool →</span>
          </Link>
        ))}
      </section>

      {role === "STUDENT" && (
        <>
          <section className="ai-center-builder">
            <div className="builder-copy">
              <span className="ai-center-eyebrow">QWEN RESUME GENERATOR</span>
              <h2>Generate a role-targeted resume draft</h2>
              <p>Use your saved CampusLink profile as the source of truth. The generated result stays editable and reviewable.</p>
              <div className="builder-actions">
                <input value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="Target role e.g. Software Engineer" />
                <button type="button" onClick={generateWithAI} disabled={generating}>{generating ? "Generating…" : "✦ Generate with AI"}</button>
                <button type="button" className="secondary" onClick={() => navigate("/student/resume")}>Open Resume Studio</button>
              </div>
            </div>
            <div className="builder-status">
              <strong>{generated ? "AI draft ready" : "Ready"}</strong>
              <span>{generated ? "Generated response received from CampusLink backend." : "Uses the backend /resume/generate endpoint when available."}</span>
              <div className="builder-progress"><i style={{ width: generated ? "100%" : profile ? "74%" : "24%" }} /></div>
            </div>
          </section>

          <section className="ai-workflow-strip">
            <div><b>01</b><span>Profile source</span><small>Verified PostgreSQL profile</small></div>
            <div><b>02</b><span>AI reasoning</span><small>Resume + role signals</small></div>
            <div><b>03</b><span>Human review</span><small>You approve the result</small></div>
            <div><b>04</b><span>Placement action</span><small>Match → Apply → Interview</small></div>
          </section>
        </>
      )}
    </div>
  );
}
