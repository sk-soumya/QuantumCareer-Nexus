import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  Link,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { useEffect, useState } from "react";
import WorkspaceTools from "./components/WorkspaceTools";
import "./App.css";
import "./styles/enterprise.css";

// ============================================================
// STUDENT
// ============================================================


import PlacementStudentDetail from "./PlacementStudentDetail";
import QuantumAI from "./components/QuantumAI";
import StudentJobs from "./StudentJobs";
import StudentApplications from "./StudentApplications";
import StudentInterviews from "./StudentInterviews";
import StudentOffers from "./StudentOffers";
import StudentNotifications from "./StudentNotifications";
import StudentDocuments from "./StudentDocuments";
import StudentAIRecommendations from "./StudentAIRecommendations";
import StudentProfile from "./StudentProfile";
import StudentResume from "./StudentResume";

// ============================================================
// RECRUITER
// ============================================================

import RecruiterAICandidates from "./RecruiterAICandidates";

import {
  RecruiterCompany,
  RecruiterJobs,
  RecruiterApplications,
  RecruiterInterviews,
  RecruiterOffers,
  RecruiterNotifications,
} from "./RecruiterModules";

// ============================================================
// PLACEMENT OFFICER
// ============================================================

import PlacementStudents from "./PlacementStudents";
import PlacementCompanies from "./PlacementCompanies";
import PlacementJobDrives from "./PlacementJobDrives";
import PlacementApplications from "./PlacementApplications";
import PlacementSelectionRounds from "./PlacementSelectionRounds";
import PlacementScheduling from "./PlacementScheduling";
import PlacementOffers from "./PlacementOffers";
import PlacementNotifications from "./PlacementNotifications";
import PlacementDocuments from "./PlacementDocuments";
import PlacementAnalytics from "./PlacementAnalytics";

// ============================================================
// CONFIG
// ============================================================

const API_BASE_URL = "http://127.0.0.1:8000";

// ============================================================
// AUTH
// ============================================================

function getToken() {
  return localStorage.getItem("campuslink_token") || "";
}

function decodeToken(token) {
  try {
    const payload = token.split(".")[1];

    const normalized = payload
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    return JSON.parse(atob(normalized));
  } catch {
    return null;
  }
}

function getRole() {
  const token = getToken();

  if (!token) {
    return null;
  }

  const payload = decodeToken(token);

  return payload?.role || null;
}

function getDashboardPath(role) {
  if (role === "STUDENT") {
    return "/student";
  }

  if (role === "RECRUITER") {
    return "/recruiter";
  }

  if (role === "PLACEMENT_OFFICER") {
    return "/placement";
  }

  if (role === "ADMIN") {
    return "/admin";
  }

  return "/login";
}

function getRoleLabel(role) {
  return String(role || "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function getNotificationPath(role) {
  if (role === "STUDENT") {
    return "/student/notifications";
  }

  if (role === "RECRUITER") {
    return "/recruiter/notifications";
  }

  if (role === "PLACEMENT_OFFICER") {
    return "/placement/notifications";
  }

  return "/admin/notifications";
}

// ============================================================
// PROTECTED ROUTE
// ============================================================

function ProtectedRoute({
  allowedRoles,
  children,
}) {
  const token = getToken();
  const role = getRole();
  const location = useLocation();

  if (!token || !role) {
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  if (
    allowedRoles &&
    !allowedRoles.includes(role)
  ) {
    return (
      <Navigate
        to={getDashboardPath(role)}
        replace
      />
    );
  }

  return children;
}

// ============================================================
// NAVIGATION
// ============================================================

function getNavigation(role) {
  if (role === "STUDENT") {
    return [
      {
        label: "Dashboard",
        icon: "⌂",
        path: "/student",
      },
      {
        label: "My Profile",
        icon: "◎",
        path: "/student/profile",
      },
      {
        label: "Resume AI",
        icon: "✦",
        path: "/student/resume-ai",
      },
      {
        label: "Job Drives",
        icon: "▣",
        path: "/student/jobs",
      },
      {
        label: "Applications",
        icon: "≡",
        path: "/student/applications",
      },
      {
        label: "Interviews",
        icon: "◷",
        path: "/student/interviews",
      },
      {
        label: "Offers",
        icon: "◆",
        path: "/student/offers",
      },
      {
        label: "Documents",
        icon: "▤",
        path: "/student/documents",
      },
      {
        label: "Notifications",
        icon: "◌",
        path: "/student/notifications",
      },
      {
        label: "AI Recommendations",
        icon: "✧",
        path: "/student/recommendations",
      },
    ];
  }

  if (role === "RECRUITER") {
    return [
      {
        label: "Dashboard",
        icon: "⌂",
        path: "/recruiter",
      },
      {
        label: "Company",
        icon: "▦",
        path: "/recruiter/company",
      },
      {
        label: "Job Drives",
        icon: "▣",
        path: "/recruiter/jobs",
      },
      {
        label: "Applications",
        icon: "≡",
        path: "/recruiter/applications",
      },
      {
        label: "AI Candidates",
        icon: "✦",
        path: "/recruiter/ai-candidates",
      },
      {
        label: "Interviews",
        icon: "◷",
        path: "/recruiter/interviews",
      },
      {
        label: "Offers",
        icon: "◆",
        path: "/recruiter/offers",
      },
      {
        label: "Notifications",
        icon: "◌",
        path: "/recruiter/notifications",
      },
    ];
  }

  if (role === "PLACEMENT_OFFICER") {
    return [
      {
        label: "Dashboard",
        icon: "⌂",
        path: "/placement",
      },
      {
        label: "Students",
        icon: "◎",
        path: "/placement/students",
      },
      {
        label: "Companies",
        icon: "▦",
        path: "/placement/companies",
      },
      {
        label: "Job Drives",
        icon: "▣",
        path: "/placement/jobs",
      },
      {
        label: "Applications",
        icon: "≡",
        path: "/placement/applications",
      },
      {
        label: "Selection Rounds",
        icon: "◈",
        path: "/placement/selection-rounds",
      },
      {
        label: "Scheduling",
        icon: "◷",
        path: "/placement/scheduling",
      },
      {
        label: "Offers",
        icon: "◆",
        path: "/placement/offers",
      },
      {
        label: "Documents",
        icon: "▤",
        path: "/placement/documents",
      },
      {
        label: "Notifications",
        icon: "◌",
        path: "/placement/notifications",
      },
    ];
  }

  return [
    {
      label: "Dashboard",
      icon: "⌂",
      path: "/admin",
    },
    {
      label: "Users",
      icon: "◎",
      path: "/admin/users",
    },
    {
      label: "Students",
      icon: "◈",
      path: "/admin/students",
    },
    {
      label: "Recruiters",
      icon: "◍",
      path: "/admin/recruiters",
    },
    {
      label: "Placement Officers",
      icon: "▥",
      path: "/admin/placement-officers",
    },
    {
      label: "Companies",
      icon: "▦",
      path: "/admin/companies",
    },
    {
      label: "Job Drives",
      icon: "▣",
      path: "/admin/jobs",
    },
    {
      label: "Applications",
      icon: "≡",
      path: "/admin/applications",
    },
    {
      label: "Scheduling",
      icon: "◷",
      path: "/admin/scheduling",
    },
    {
      label: "Offers",
      icon: "◆",
      path: "/admin/offers",
    },
    {
      label: "Documents",
      icon: "▤",
      path: "/admin/documents",
    },
    {
      label: "Notifications",
      icon: "◌",
      path: "/admin/notifications",
    },
    {
      label: "Audit Logs",
      icon: "⌁",
      path: "/admin/audit",
    },
  ];
}

// ============================================================
// HEADER
// ============================================================

function DashboardHeader({
  title,
  role,
  onMenuClick,
}) {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem(
      "campuslink_token"
    );

    navigate("/login", {
      replace: true,
    });
  };

  const openNotifications = () => {
    navigate(getNotificationPath(role));
  };

  return (
    <header className="dashboard-header">
      <div className="header-left">
        <button
          type="button"
          className="menu-toggle"
          onClick={onMenuClick}
          aria-label="Open navigation"
        >
          ☰
        </button>

        <div className="brand-block">
          <div className="brand-mark">
            C
          </div>

          <div>
            <h1>CampusLink</h1>
            <p>{title}</p>
          </div>
        </div>
      </div>

      <div className="header-right">
        <ThemeToggle compact />
        <button
          type="button"
          className="icon-btn"
          onClick={openNotifications}
          title="Notifications"
        >
          ◌
        </button>

        <div className="role-chip">
          <span className="role-dot" />
          {getRoleLabel(role)}
        </div>

        <button
          type="button"
          className="logout-btn"
          onClick={logout}
        >
          Logout
        </button>
      </div>
    </header>
  );
}

// ============================================================
// SIDEBAR
// ============================================================

function Sidebar({
  items,
  open,
  onNavigate,
}) {
  const location = useLocation();

  return (
    <aside
      className={`sidebar ${
        open ? "sidebar-open" : ""
      }`}
    >
      <div className="sidebar-inner">
        <div className="sidebar-label">
          WORKSPACE
        </div>

        <nav>
          {items.map((item) => {
            const active =
              location.pathname ===
                item.path ||
              (item.path !== "/student" &&
                item.path !== "/recruiter" &&
                item.path !== "/placement" &&
                item.path !== "/admin" &&
                location.pathname.startsWith(
                  `${item.path}/`
                ));

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-link ${
                  active
                    ? "sidebar-link-active"
                    : ""
                }`}
                onClick={onNavigate}
              >
                <span className="sidebar-icon">
                  {item.icon}
                </span>

                <span>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

// ============================================================
// DASHBOARD SHELL
// ============================================================

function DashboardShell({
  title,
  role,
  children,
}) {
  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const closeSidebar = () =>
    setSidebarOpen(false);

  return (
    <div className="dashboard-page">
      <DashboardHeader
        title={title}
        role={role}
        onMenuClick={() =>
          setSidebarOpen(true)
        }
      />

      <div className="dashboard-body">
        <Sidebar
          items={getNavigation(role)}
          open={sidebarOpen}
          onNavigate={closeSidebar}
        />

        {sidebarOpen && (
          <button
            type="button"
            className="sidebar-overlay"
            onClick={closeSidebar}
            aria-label="Close navigation"
          />
        )}

        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}

// ============================================================
// DASHBOARD CARD
// ============================================================

function DashboardCard({
  to,
  icon,
  title,
  description,
  index = 0,
}) {
  return (
    <Link
      to={to}
      className="dashboard-card"
      style={{
        "--card-delay": `${index * 60}ms`,
      }}
    >
      <div className="card-icon">
        {icon}
      </div>

      <div className="card-content">
        <h3>{title}</h3>

        {description && (
          <p>{description}</p>
        )}
      </div>

      <span className="card-arrow">
        →
      </span>
    </Link>
  );
}

// ============================================================
// PAGE HERO
// ============================================================

function PageHero({
  eyebrow,
  title,
  description,
}) {
  return (
    <div className="page-hero">
      <div>
        {eyebrow && (
          <span className="hero-eyebrow">
            {eyebrow}
          </span>
        )}

        <h2>{title}</h2>

        {description && (
          <p>{description}</p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// GENERIC FEATURE PAGE
// ============================================================

function FeaturePage({
  role,
  title,
}) {
  return (
    <DashboardShell
      role={role}
      title={title}
    >
      <PageHero
        eyebrow="CampusLink"
        title={title}
        description="This module is connected to the CampusLink workspace and ready for the next workflow."
      />

      <div className="empty-state-card">
        <div className="empty-state-icon">
          ◇
        </div>

        <h3>{title}</h3>

        <p>
          Module interface placeholder.
        </p>
      </div>
    </DashboardShell>
  );
}

// ============================================================
// STUDENT DASHBOARD
// ============================================================

function StudentDashboard() {
  const cards = [
    {
      to: "/student/profile",
      icon: "◎",
      title: "My Profile",
      description:
        "Maintain academic and personal profile information.",
    },
    {
      to: "/student/resume-ai",
      icon: "✦",
      title: "Resume AI",
      description:
        "Upload, analyze and optimize your resume.",
    },
    {
      to: "/student/resume",
      icon: "▤",
      title: "Resume Maker AI",
      description:
        "Turn your verified profile into an editable, A4-ready resume.",
    },
    {
      to: "/student/jobs",
      icon: "▣",
      title: "Job Drives",
      description:
        "Explore companies and active placement opportunities.",
    },
    {
      to: "/student/applications",
      icon: "≡",
      title: "Applications",
      description:
        "Track applications and current application status.",
    },
    {
      to: "/student/interviews",
      icon: "◷",
      title: "Interviews",
      description:
        "View scheduled interviews and selection rounds.",
    },
    {
      to: "/student/offers",
      icon: "◆",
      title: "Offers",
      description:
        "Review and respond to placement offers.",
    },
    {
      to: "/student/documents",
      icon: "▤",
      title: "Documents",
      description:
        "Manage your placement-related documents.",
    },
    {
      to: "/student/notifications",
      icon: "◌",
      title: "Notifications",
      description:
        "Stay updated with important placement events.",
    },
    {
      to: "/student/recommendations",
      icon: "✧",
      title: "AI Recommendations",
      description:
        "Discover AI-powered job recommendations.",
    },
  ];

  return (
    <DashboardShell
      role="STUDENT"
      title="Student Dashboard"
    >
      <PageHero
        eyebrow="Student workspace"
        title="Welcome back"
        description="Manage your profile, resume, applications, interviews and placement journey from one workspace."
      />

      <div className="dashboard-grid">
        {cards.map((card, index) => (
          <DashboardCard
            key={card.to}
            {...card}
            index={index}
          />
        ))}
      </div>
    </DashboardShell>
  );
}

// ============================================================
// STUDENT RESUME AI
// ============================================================

function StudentResumeAI() {
  const navigate = useNavigate();
  const token = getToken();

  const [file, setFile] = useState(null);
  const [profile, setProfile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [targetRole, setTargetRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [openTool, setOpenTool] = useState(null);

  // Broad cross-discipline catalog. A skill is only shown when its full name
  // appears as a separate term in the active resume text; substring hits such
  // as the letter "c" inside "electrical" are deliberately not accepted.
  const SKILLS = [
    // Electrical / electronics
    "autocad electrical", "power systems", "power electronics", "electrical wiring", "circuit analysis",
    "electrical machines", "electrical design", "electrical testing", "control systems", "protection relays",
    "relay coordination", "switchgear", "substation", "high voltage", "transformers", "circuit breakers",
    "power generation", "power transmission", "power distribution", "renewable energy", "solar pv",
    "solar photovoltaic", "battery management system", "pcb design", "printed circuit board", "plc",
    "plc programming", "scada", "etap", "eplan", "matlab", "simulink", "proteus", "multisim",
    "ltspice", "pspice", "embedded c", "microcontrollers", "arduino", "esp32", "raspberry pi",
    "digital electronics", "analog electronics", "verilog", "vhdl", "vlsi", "instrumentation",
    "industrial automation", "sensors", "iot", "embedded systems", "electrical maintenance", "earthing",
    "grounding", "motor control", "electric motors", "generators", "power factor correction",
    // Mechanical / manufacturing
    "solidworks", "autocad", "fusion 360", "catia", "creo", "ansys fluent", "ansys mechanical",
    "computational fluid dynamics", "cfd", "finite element analysis", "fea", "thermodynamics", "heat transfer",
    "fluid mechanics", "machine design", "cnc machining", "gd&t", "3d printing", "manufacturing processes",
    "casting", "welding", "sheet metal", "hvac", "refrigeration", "automotive systems", "mechanical testing",
    // Civil / architecture
    "autocad civil 3d", "revit", "staad pro", "etabs", "primavera p6", "quantity surveying", "gis",
    "structural analysis", "surveying", "bim", "construction management",
    // Software / data / IT
    "python", "java", "c++", "c#", "javascript", "typescript", "react", "next.js", "node.js",
    "express", "sql", "mysql", "postgresql", "mongodb", "redis", "git", "github", "docker", "kubernetes",
    "aws", "azure", "gcp", "html", "css", "tailwind", "fastapi", "django", "flask", "spring",
    "kotlin", "flutter", "tensorflow", "pytorch", "machine learning", "deep learning", "nlp", "computer vision",
    "rest api", "graphql", "figma", "power bi", "tableau", "excel", "pandas", "numpy", "scikit-learn",
    "linux", "cybersecurity", "networking", "api testing", "selenium", "postman", "firebase", "android development",
    // Common engineering and analytical tools
    "labview", "multisim live", "matlab simulink", "microsoft office", "ms excel", "technical documentation",
  ];

  const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, Number(n) || 0));
  const text = (...values) => values.filter(Boolean).map((value) => Array.isArray(value) ? value.join(" ") : String(value)).join(" ").toLowerCase();
  const tokens = (value) => String(value || "").toLowerCase().split(/[^a-z0-9+#.]+/).filter(Boolean);
  const unique = (arr) => [...new Set(arr)];

  function hasSkillPhrase(haystack, skill) {
    const hay = String(haystack || "");
    if (skill === "c") {
      return /\b(?:c\s+programming|programming\s+in\s+c|c\s+language)\b/i.test(hay);
    }
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`, "i").test(hay);
  }

  function findSkills(value) {
    const hay = String(value || "");
    const found = SKILLS.filter((skill) => hasSkillPhrase(hay, skill));
    return unique(found).sort((a, b) => a.localeCompare(b));
  }

  function listItems(value) {
    if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean);
    const raw = String(value || "").trim();
    if (!raw) return [];
    return raw.split(/\n\s*\n|[;|]/).map((item) => item.trim()).filter(Boolean);
  }

  function fieldCoverage(p) {
    const fields = [
      p?.degree, p?.department, p?.graduation_year, p?.cgpa,
      p?.skills, p?.projects, p?.experience, p?.certifications,
      p?.linkedin, p?.github, p?.preferred_roles, p?.career_objective,
      p?.resume_text,
    ];
    return clamp((fields.filter((x) => x !== null && x !== undefined && String(x).trim() !== "").length / fields.length) * 100);
  }

  function sectionScore(resumeText) {
    const t = String(resumeText || "").toLowerCase();
    const checks = [
      /(education|academic)/.test(t),
      /(skills|technical skills|technologies)/.test(t),
      /(project|projects)/.test(t),
      /(experience|internship|work experience)/.test(t),
      /(certification|certifications|achievements)/.test(t),
    ];
    return clamp((checks.filter(Boolean).length / checks.length) * 100);
  }

  function evidenceScore(resumeText, p) {
    const t = String(resumeText || "");
    let score = 0;
    if ((t.match(/\d+%|\d+\+|\d+x|reduced|increased|improved|built|developed|deployed|implemented|optimized|automated/gi) || []).length >= 2) score += 45;
    if (String(p?.projects || "").trim()) score += 30;
    if (String(p?.experience || "").trim()) score += 25;
    return clamp(score);
  }

  function atsScore(resumeText) {
    const t = String(resumeText || "");
    if (!t.trim()) return 0;
    const words = t.split(/\s+/).filter(Boolean);
    const bullets = (t.match(/^\s*[-•*]/gm) || []).length;
    const badSymbols = (t.match(/[�]/g) || []).length;
    const contact = /(https?:\/\/|linkedin|github|@)/i.test(t);
    return clamp(
      sectionScore(t) * 0.45 +
      Math.min(words.length / 350, 1) * 20 +
      Math.min(bullets / 6, 1) * 15 +
      (contact ? 10 : 0) +
      (badSymbols === 0 ? 10 : 0)
    );
  }

  function roleAlignment(p, role) {
    const roleText = text(role, p?.preferred_roles, p?.career_objective, p?.degree, p?.department);
    if (!roleText.trim()) return 50;
    const roleWords = unique(tokens(roleText)).filter((w) => w.length >= 4);
    const resumeWords = new Set(tokens(text(p?.resume_text, p?.skills, p?.projects, p?.experience)));
    if (!roleWords.length) return 50;
    const hits = roleWords.filter((w) => resumeWords.has(w)).length;
    return clamp((hits / Math.min(roleWords.length, 12)) * 100);
  }

  function computeScores(p, resumeText, jd) {
    const resume = String(resumeText || "");
    const resumeSkills = findSkills(text(resume, p?.skills, p?.projects, p?.experience));
    const jobSkills = findSkills(jd);
    // Without a target job, match is unknown: use a neutral score, not a fake 100 based on skill count.
    const skillMatch = jobSkills.length
      ? clamp((resumeSkills.filter((s) => jobSkills.includes(s)).length / jobSkills.length) * 100)
      : (resumeSkills.length ? 50 : 0);
    const profileCompleteness = fieldCoverage(p);
    const resumeAts = atsScore(resume);
    const section = sectionScore(resume);
    const evidence = evidenceScore(resume, p);
    const projectSignal = String(p?.projects || "").trim() ? 100 : /(project|built|developed|implemented)/i.test(resume) ? 65 : 0;
    const experienceSignal = String(p?.experience || "").trim() ? 100 : /(internship|work experience|worked at|developer intern)/i.test(resume) ? 70 : 0;
    const education = (p?.degree || p?.department || p?.graduation_year) ? 100 : 25;
    const role = roleAlignment(p, targetRole);
    const resumeScore = clamp(
      section * 0.20 +
      resumeAts * 0.20 +
      evidence * 0.20 +
      Math.min(resumeSkills.length / 8, 1) * 100 * 0.15 +
      projectSignal * 0.10 +
      experienceSignal * 0.10 +
      role * 0.05
    );
    const experienceProject = projectSignal * 0.55 + experienceSignal * 0.45;
    const readiness = clamp(
      skillMatch * 0.30 +
      experienceProject * 0.20 +
      resumeScore * 0.15 +
      education * 0.10 +
      profileCompleteness * 0.10 +
      role * 0.10 +
      evidence * 0.05
    );
    return {
      readiness: Math.round(readiness),
      resumeScore: Math.round(resumeScore),
      skillMatch: Math.round(skillMatch),
      profileCompleteness: Math.round(profileCompleteness),
      evidence: Math.round(evidence),
      ats: Math.round(resumeAts),
      section: Math.round(section),
      education: Math.round(education),
      role: Math.round(role),
      matchedSkills: resumeSkills.filter((s) => jobSkills.includes(s)),
      missingSkills: jobSkills.filter((s) => !resumeSkills.includes(s)),
      detectedSkills: resumeSkills,
    };
  }

  async function loadProfile(show = false) {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/student-profile/me`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.detail || `Profile request failed (${response.status})`);
      setProfile({ ...data, _source: "database" });
      if (show) {
        setMessage("Profile reloaded from CampusLink database.");
        setMessageType("success");
      }
    } catch (error) {
      setMessage(error.message || "Unable to load profile.");
      setMessageType("error");
    }
  }

  useEffect(() => { loadProfile(false); }, []);

  async function analyzeResume() {
    if (!file) {
      setMessage("Choose a PDF resume first.");
      setMessageType("error");
      return;
    }
    setLoading(true);
    setMessage("Reading the uploaded PDF and checking skills against its text…");
    setMessageType("info");
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const formData = new FormData();
      formData.append("file", file);
      let response;
      try {
        response = await fetch(`${API_BASE_URL}/ai/member4/resume/extract`, {
          method: "POST",
          headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
          body: formData,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.detail || `Resume extraction failed (${response.status})`);

      const extractedText = String(data.extracted_text || "").trim();
      if (extractedText.length < 20) {
        throw new Error("The PDF did not return enough readable text. Try exporting the resume as a text-based PDF or run OCR first.");
      }

      // The names displayed as skills are verified against this exact upload.
      // Never fall back to skills from the stored profile or another resume.
      const detectedSkills = findSkills(extractedText);
      const latestEducation = Array.isArray(data.education) && data.education.length
        ? data.education[data.education.length - 1]
        : null;
      const freshAnalysis = { ...data, extracted_text: extractedText, skills: detectedSkills };
      const freshProfile = {
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || null,
        github_url: data.github_url || null,
        linkedin: data.linkedin || null,
        degree: latestEducation?.degree || data.degree || "",
        department: latestEducation?.branch || data.department || data.branch || "",
        graduation_year: latestEducation?.graduation_year ?? data.graduation_year ?? null,
        cgpa: latestEducation?.cgpa ?? data.cgpa ?? null,
        skills: detectedSkills.join(", "),
        projects: listItems(data.projects),
        experience: listItems(data.experience),
        certifications: listItems(data.certifications),
        achievements: listItems(data.achievements),
        preferred_roles: data.preferred_roles || null,
        preferred_locations: data.preferred_locations || null,
        career_objective: data.career_objective || null,
        resume_text: extractedText,
        _source: "uploaded_resume",
      };

      setAnalysis(freshAnalysis);
      setProfile(freshProfile);
      if (detectedSkills.length) {
        setMessage(`Resume analyzed. Verified ${detectedSkills.length} skill names against the uploaded PDF text. Existing saved profile skills were not mixed into this result.`);
        setMessageType("success");
      } else {
        setMessage("The PDF text was extracted, but no technical skills from the supported catalogue could be verified. Check the extracted text below; no old profile skills have been substituted.");
        setMessageType("info");
      }
    } catch (error) {
      setMessage(error.name === "AbortError" ? "Resume analysis exceeded 30 seconds. Check the backend and try again." : (error.message || "Resume analysis failed."));
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    if (!profile) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/student-profile/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          cgpa: profile.cgpa === "" || profile.cgpa == null ? null : Number(profile.cgpa),
          skills: profile.skills || null,
          resume_text: profile.resume_text || "",
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.detail || `Save failed (${response.status})`);
      setProfile((current) => ({ ...current, ...data }));
      setMessage("Profile saved and verified.");
      setMessageType("success");
    } catch (error) {
      setMessage(error.message || "Profile save failed.");
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  }

  const scores = computeScores(profile || {}, analysis?.extracted_text || profile?.resume_text || "", jobDescription);
  const readinessLabel = scores.readiness >= 80 ? "Job ready" : scores.readiness >= 65 ? "Nearly ready" : scores.readiness >= 45 ? "Needs preparation" : "Profile incomplete";
  const resumeText = analysis?.extracted_text || profile?.resume_text || "";

  const toolCards = [
    ["Resume Parser", "Extract text, skills, education and contact data.", "ACTIVE", "parse"],
    ["ATS Scanner", "Check section coverage, parseability and recruiter readability.", "ACTIVE", "ats"],
    ["Job Match", "Compare your skills with the target job description.", "ACTIVE", "match"],
    ["Skill Gap", "List missing role-relevant skills to learn next.", "ACTIVE", "gap"],
    ["Eligibility", "Check basic academic and profile requirements.", "ACTIVE", "eligibility"],
    ["Project Evidence", "Measure whether projects prove practical ability.", "ACTIVE", "projects"],
    ["Experience Signals", "Detect internships, work evidence and impact language.", "ACTIVE", "experience"],
    ["Profile Completeness", "Verify the data CampusLink currently stores.", "ACTIVE", "profile"],
    ["AI Recommendations", "Existing CampusLink recommendation workspace.", "OPEN", "recommend"],
    ["Preparation Plan", "Convert the current skill gap into preparation actions.", "OPEN", "prep"],
    ["GitHub Intelligence", "Use repository evidence when a GitHub project is available.", "OPEN", "github"],
    ["Interview Readiness", "Prepare from skills, evidence and target-role gaps.", "OPEN", "interview"],
  ];

  function toolAction(kind) {
    if (["parse", "ats", "match", "gap", "eligibility", "projects", "experience", "profile"].includes(kind)) {
      setOpenTool(openTool === kind ? null : kind);
      return;
    }
    if (kind === "recommend") navigate("/student/recommendations");
    if (kind === "prep") setOpenTool("gap");
    if (kind === "github") setMessage("GitHub Intelligence is available through the Member 4 AI workspace; repository connection is optional.");
    if (kind === "interview") navigate("/student/interviews");
    setMessageType("info");
  }

  return (
    <DashboardShell role="STUDENT" title="Resume AI">
      <style>{JOB_READY_CSS + JOB_READY_CSS_POLISHED}</style>
      <PageHero
        eyebrow="AI career tools"
        title="Job Readiness Profile"
        description="One transparent score for resume quality, role fit, skills, evidence and the information CampusLink actually stores."
      />

      <div className="jr-top-grid">
        <section className="jr-card jr-hero-score">
          <div className="jr-score-ring" style={{ "--score": `${scores.readiness * 3.6}deg` }}>
            <div><strong>{scores.readiness}</strong><span>/ 100</span><small>{readinessLabel}</small></div>
          </div>
          <div className="jr-score-copy">
            <span className="jr-kicker">JOB READINESS SCORE</span>
            <h3>{targetRole || "General placement readiness"}</h3>
            <p>Set a target role and paste its job description to turn this into a job-specific score.</p>
            <div className="jr-score-pills"><span>Resume {scores.resumeScore}</span><span>Skills {scores.skillMatch}</span><span>Profile {scores.profileCompleteness}</span></div>
          </div>
        </section>

        <section className="jr-card jr-target">
          <div className="jr-kicker">TARGET ROLE</div>
          <input className="jr-input" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="e.g. Backend Developer" />
          <textarea className="jr-input jr-jd" value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste the job description here for skill matching…" />
          <div className="jr-hint">Fast scoring is local. No Ollama call is required for this score.</div>
        </section>
      </div>

      <section className="jr-card jr-metrics">
        <div className="jr-section-head"><div><span className="jr-kicker">BREAKDOWN</span><h3>What is driving your score?</h3></div><button className="jr-btn secondary" onClick={() => loadProfile(true)}>↻ Verify database</button></div>
        <div className="jr-breakdown-grid">
          {[
            ["Skill match", scores.skillMatch, "30%", jobDescription ? "Target-job requirements found in resume text" : "Neutral until a job description is supplied"],
            ["Projects + experience", Math.round(scores.evidence * .55 + (String(profile?.experience || profile?.projects || "").trim() ? 45 : 0)), "20%", "Practical proof and work evidence"],
            ["Resume quality", scores.resumeScore, "15%", "ATS structure + content quality"],
            ["Education", scores.education, "10%", "Degree / branch / graduation signals"],
            ["Profile completeness", scores.profileCompleteness, "10%", "Fields saved in CampusLink"],
            ["Role alignment", scores.role, "10%", "Target-role language alignment"],
            ["Evidence strength", scores.evidence, "5%", "Impact verbs + measurable outcomes"],
          ].map(([label, value, weight, help]) => <div className="jr-break-row" key={label}><div><strong>{label}</strong><small>{help}</small></div><div className="jr-bar"><i style={{ width: `${clamp(value)}%` }} /></div><b>{value}</b><span>{weight}</span></div>)}
        </div>
      </section>

      <div className="jr-two-col">
        <section className="jr-card">
          <div className="jr-section-head"><div><span className="jr-kicker">RESUME INTELLIGENCE</span><h3>{file ? file.name : "Upload your resume"}</h3><p>Fast parser first. Deep AI can be added later without blocking the workflow.</p></div><span className="jr-status active">FAST</span></div>
          <label className="jr-upload"><input type="file" accept="application/pdf,.pdf" onChange={(e) => { const f=e.target.files?.[0]; if (f) { setFile(f); setAnalysis(null); setProfile((current) => current?._source === "uploaded_resume" ? null : current); setMessage("New resume selected. Analyze it to replace the previous extracted facts."); setMessageType("info"); } }} /><div className="jr-upload-icon">↑</div><strong>{file ? file.name : "Choose a PDF resume"}</strong><span>{file ? "Selected — analyze to extract fresh details" : "Click to browse · PDF up to 10 MB · text-based PDF recommended"}</span></label>
          <div className="jr-actions"><button className="jr-btn primary" onClick={analyzeResume} disabled={loading}>{loading ? "Analyzing…" : "Analyze Resume"}</button><button className="jr-btn secondary" onClick={saveProfile} disabled={saving || !profile}>{saving ? "Saving…" : "Save to CampusLink"}</button></div>
          {message && <div className={`jr-message ${messageType}`}>{message}</div>}
          {analysis && <div className="jr-analysis-note"><strong>Analysis mode:</strong> {analysis.analysis_mode || "fast_local"} · {analysis.warning || "Instant local extraction complete."}</div>}
        </section>

        <section className="jr-card jr-profile-facts">
          <div className="jr-section-head">
            <div>
              <span className="jr-kicker">PROFILE DATA</span>
              <h3>{profile?._source === "uploaded_resume" ? "Facts verified from this resume" : "Saved CampusLink profile"}</h3>
              <p>{profile?._source === "uploaded_resume" ? "These fields come from the PDF just analyzed; previous database skills are excluded." : "Database facts are shown until a new resume is analyzed."}</p>
            </div>
            <span className="jr-status">{profile?._source === "uploaded_resume" ? "UPLOAD" : `${scores.profileCompleteness}%`}</span>
          </div>
          <div className="jr-mini-grid">
            <div><small>Verified skills</small><strong>{scores.detectedSkills.length}</strong></div>
            <div><small>Projects</small><strong>{listItems(profile?.projects).length}</strong></div>
            <div><small>Experience</small><strong>{listItems(profile?.experience).length}</strong></div>
            <div><small>CGPA</small><strong>{profile?.cgpa ?? "—"}</strong></div>
          </div>
          <div className="jr-data-box">
            <div>
              <span>Technical skills found in resume text</span>
              {scores.detectedSkills.length ? <div className="jr-skill-chips">{scores.detectedSkills.map((skill) => <span key={skill}>{skill}</span>)}</div> : <strong>No skills verified yet. Analyze a readable PDF; CampusLink will not copy skills from an older profile.</strong>}
            </div>
            <div><span>Education / branch / year</span><strong>{[profile?.degree, profile?.department, profile?.graduation_year].filter((item) => item !== null && item !== undefined && String(item).trim()).join(" · ") || "Not detected from the current source."}</strong></div>
            <div><span>Projects and practical evidence</span><strong>{listItems(profile?.projects).join(" · ") || "No project details detected. Review the extracted text or add projects to your profile."}</strong></div>
            <div><span>Certifications</span><strong>{listItems(profile?.certifications).join(" · ") || "No certifications detected."}</strong></div>
            <div><span>Missing target skills</span><strong>{jobDescription ? (scores.missingSkills.length ? scores.missingSkills.join(" · ") : "No missing terms from the supported skills catalogue.") : "Add a job description to calculate target-job gaps."}</strong></div>
          </div>
          {analysis && <details className="jr-extracted-text"><summary>Review the text extracted from the uploaded PDF</summary><pre>{resumeText || "No extracted text is available."}</pre></details>}
        </section>
      </div>

      <section className="jr-card">
        <div className="jr-section-head"><div><span className="jr-kicker">TOOLKIT</span><h3>All job-readiness tools</h3><p>Every tool is surfaced here so the student knows what is available.</p></div></div>
        <div className="jr-tool-grid">
          {toolCards.map(([title, desc, status, kind]) => <button key={title} className="jr-tool" onClick={() => toolAction(kind)}><div className="jr-tool-icon">✦</div><div><strong>{title}</strong><span>{desc}</span></div><em>{status}</em></button>)}
        </div>
        {openTool && <div className="jr-tool-detail">
          {openTool === "ats" && <><h4>ATS scanner</h4><p><b>{scores.ats}/100.</b> Section coverage: {scores.section}/100. Contact/link signal and readable structure are included.</p></>}
          {openTool === "match" && <><h4>Job match</h4><p><b>{scores.skillMatch}/100.</b> {jobDescription ? `Matched ${scores.matchedSkills.length} of ${findSkills(jobDescription).length || 0} detected role skills.` : "Paste a job description above to calculate exact target-skill overlap."}</p></>}
          {openTool === "gap" && <><h4>Skill gap</h4><p>{scores.missingSkills.length ? `Priority gaps: ${scores.missingSkills.join(", ")}.` : "No target-job skill gaps detected yet. Add a job description first."}</p></>}
          {openTool === "eligibility" && <><h4>Eligibility</h4><p>{scores.education >= 100 ? "Education information is present." : "Add degree, department and graduation year to complete eligibility checks."} CGPA: <b>{profile?.cgpa || "not set"}</b>.</p></>}
          {openTool === "projects" && <><h4>Project evidence</h4><p>Evidence score is <b>{scores.evidence}/100</b>. Stronger project descriptions include technology, action, scale and measurable outcome.</p></>}
          {openTool === "experience" && <><h4>Experience signals</h4><p>Impact language, internships and work evidence are weighted. Current evidence score: <b>{scores.evidence}/100</b>.</p></>}
          {openTool === "profile" && <><h4>Profile completeness</h4><p><b>{scores.profileCompleteness}%</b> of the tracked readiness fields currently contain data.</p></>}
          {openTool === "parse" && <><h4>Resume parser</h4><p>Fast local mode extracts PDF text without waiting for an LLM. Detected skills: <b>{scores.detectedSkills.join(", ") || "none yet"}</b>.</p></>}
        </div>}
      </section>

      <section className="jr-card jr-formula">
        <div><span className="jr-kicker">TRANSPARENT SCORING</span><h3>Exactly how the score is defined</h3><p>No mysterious AI number. Each component has a visible weight.</p></div>
        <code>Readiness = 0.30×SkillMatch + 0.20×ProjectExperience + 0.15×Resume + 0.10×Education + 0.10×Profile + 0.10×RoleAlignment + 0.05×Evidence</code>
        <small>Each component is normalized to 0–100, then rounded. Resume quality is a weighted blend of section coverage, ATS parseability, evidence, skill specificity, projects, experience and role alignment.</small>
      </section>

      <div className="jr-footer-actions"><button className="jr-btn secondary" onClick={() => navigate("/student/profile")}>Open full profile →</button><button className="jr-btn secondary" onClick={() => navigate("/student/recommendations")}>Open AI recommendations →</button><button className="jr-btn primary" onClick={() => navigate("/student/resume")}>Build final resume →</button></div>
    </DashboardShell>
  );
}

const JOB_READY_CSS = `
.jr-top-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:16px;margin-bottom:16px}.jr-card{background:#fff;border:1px solid #e5eaf1;border-radius:18px;padding:20px;box-shadow:0 10px 28px rgba(15,23,42,.045);margin-bottom:16px}.jr-hero-score{display:flex;align-items:center;gap:24px;min-height:240px}.jr-score-ring{--score:180deg;width:180px;height:180px;border-radius:50%;background:conic-gradient(#2563eb var(--score),#e2e8f0 0);display:grid;place-items:center;flex:none}.jr-score-ring>div{width:138px;height:138px;border-radius:50%;background:#fff;display:grid;place-items:center;text-align:center}.jr-score-ring strong{font-size:46px;line-height:.9;display:block}.jr-score-ring span{font-size:11px;color:#64748b}.jr-score-ring small{display:block;font-size:10px;color:#2563eb;font-weight:900;margin-top:5px}.jr-kicker{font-size:9px;letter-spacing:.14em;color:#2563eb;font-weight:900;text-transform:uppercase}.jr-score-copy h3{font-size:22px;margin:6px 0}.jr-score-copy p{font-size:11px;line-height:1.6;color:#64748b;margin:0 0 14px}.jr-score-pills{display:flex;gap:7px;flex-wrap:wrap}.jr-score-pills span,.jr-status{font-size:9px;border:1px solid #dbeafe;background:#eff6ff;color:#1d4ed8;border-radius:999px;padding:5px 8px;font-weight:800}.jr-target h3{margin:3px 0}.jr-input{width:100%;box-sizing:border-box;border:1px solid #dbe3ee;border-radius:10px;padding:11px 12px;margin-top:8px;font:inherit;font-size:11px;outline:none;background:#fbfdff}.jr-input:focus{border-color:#60a5fa;box-shadow:0 0 0 3px #dbeafe}.jr-jd{min-height:116px;resize:vertical}.jr-hint{font-size:9px;color:#94a3b8;margin-top:8px}.jr-section-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:15px}.jr-section-head h3{margin:4px 0;font-size:17px}.jr-section-head p{margin:3px 0 0;font-size:10px;color:#64748b}.jr-btn{border-radius:10px;padding:10px 13px;font-size:10px;font-weight:900;cursor:pointer;border:1px solid #dbe3ee}.jr-btn.primary{background:#2563eb;border-color:#2563eb;color:#fff}.jr-btn.secondary{background:#fff;color:#334155}.jr-btn:disabled{opacity:.55;cursor:not-allowed}.jr-breakdown-grid{display:grid;gap:9px}.jr-break-row{display:grid;grid-template-columns:210px 1fr 42px 45px;gap:10px;align-items:center}.jr-break-row strong{display:block;font-size:10px}.jr-break-row small{display:block;color:#94a3b8;font-size:8px;margin-top:2px}.jr-break-row b{font-size:11px;text-align:right}.jr-break-row>span{font-size:8px;color:#64748b;text-align:right}.jr-bar{height:7px;background:#eef2f7;border-radius:999px;overflow:hidden}.jr-bar i{height:100%;display:block;background:linear-gradient(90deg,#2563eb,#7c3aed);border-radius:999px}.jr-two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px}.jr-upload{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:7px;min-height:155px;border:1.5px dashed #b8c5d8;background:linear-gradient(180deg,#fafdff,#f4f8fc);border-radius:14px;cursor:pointer;text-align:center}.jr-upload:hover{border-color:#60a5fa;background:#f8fbff}.jr-upload input{display:none}.jr-upload-icon{width:42px;height:42px;border-radius:12px;background:#eaf2ff;color:#2563eb;display:grid;place-items:center;font-size:23px;font-weight:800}.jr-upload strong{font-size:12px}.jr-upload span{font-size:9px;color:#64748b}.jr-actions,.jr-footer-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:13px}.jr-message{margin-top:10px;font-size:10px;padding:10px 11px;border-radius:9px}.jr-message.success{background:#ecfdf5;color:#047857;border:1px solid #a7f3d0}.jr-message.error{background:#fef2f2;color:#b91c1c;border:1px solid #fecaca}.jr-message.info{background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe}.jr-analysis-note{margin-top:10px;font-size:9px;color:#475569;background:#f8fafc;border:1px solid #e2e8f0;padding:9px;border-radius:8px}.jr-status.active{background:#ecfdf5;color:#047857;border-color:#a7f3d0}.jr-mini-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.jr-mini-grid>div{background:#f8fafc;border:1px solid #e7edf4;border-radius:10px;padding:11px}.jr-mini-grid small{font-size:8px;color:#64748b;display:block}.jr-mini-grid strong{font-size:17px;display:block;margin-top:3px}.jr-data-box{display:grid;gap:8px;margin-top:10px}.jr-data-box>div{background:#fbfdff;border:1px solid #e7edf4;padding:10px;border-radius:9px}.jr-data-box span{display:block;font-size:8px;color:#64748b;text-transform:uppercase;letter-spacing:.08em}.jr-data-box strong{display:block;font-size:9px;line-height:1.5;margin-top:3px}.jr-tool-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.jr-tool{display:flex;align-items:center;gap:10px;text-align:left;border:1px solid #e5eaf1;background:#fbfdff;border-radius:12px;padding:12px;cursor:pointer;transition:.15s}.jr-tool:hover{transform:translateY(-1px);box-shadow:0 8px 20px rgba(15,23,42,.06);border-color:#cbd5e1}.jr-tool-icon{width:32px;height:32px;border-radius:9px;background:#eff6ff;color:#2563eb;display:grid;place-items:center;font-weight:900;flex:none}.jr-tool>div:nth-child(2){flex:1}.jr-tool strong{font-size:10px;display:block}.jr-tool span{font-size:8px;line-height:1.4;color:#64748b;display:block;margin-top:3px}.jr-tool em{font-style:normal;font-size:7px;color:#047857;background:#ecfdf5;border:1px solid #bbf7d0;border-radius:999px;padding:4px 5px;flex:none}.jr-tool-detail{margin-top:12px;background:#0f172a;color:#e2e8f0;border-radius:12px;padding:14px}.jr-tool-detail h4{margin:0 0 5px;font-size:12px}.jr-tool-detail p{margin:0;font-size:10px;line-height:1.6;color:#cbd5e1}.jr-formula{background:linear-gradient(135deg,#0f172a,#172554);color:#fff}.jr-formula h3{margin:5px 0;font-size:17px}.jr-formula p{color:#94a3b8;font-size:10px}.jr-formula code{display:block;background:#020617;border:1px solid #334155;border-radius:10px;padding:13px;margin-top:12px;color:#bfdbfe;font-size:10px;white-space:normal;line-height:1.6}.jr-formula small{display:block;color:#94a3b8;font-size:8px;line-height:1.6;margin-top:8px}.jr-footer-actions{justify-content:flex-end;margin-bottom:20px}
@media(max-width:1050px){.jr-top-grid,.jr-two-col{grid-template-columns:1fr}.jr-hero-score{min-height:auto}.jr-tool-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:700px){.jr-hero-score{flex-direction:column;align-items:flex-start}.jr-break-row{grid-template-columns:1fr 1fr 42px 45px}.jr-break-row small{display:none}.jr-mini-grid{grid-template-columns:repeat(2,1fr)}.jr-tool-grid{grid-template-columns:1fr}}
`;

const JOB_READY_CSS_POLISHED = `
.jr-top-grid{grid-template-columns:minmax(0,1.05fr) minmax(340px,.95fr);gap:20px;margin-bottom:20px;align-items:stretch}
.jr-card{padding:24px;border-radius:20px;box-shadow:0 12px 30px rgba(15,23,42,.055);margin-bottom:20px}
.jr-hero-score{gap:26px;min-height:250px}
.jr-score-ring{width:168px;height:168px}
.jr-score-ring>div{width:130px;height:130px}
.jr-score-ring strong{font-size:48px}
.jr-score-ring span{font-size:13px}
.jr-score-ring small{font-size:12px}
.jr-kicker{font-size:11px;letter-spacing:.12em}
.jr-score-copy h3{font-size:25px;line-height:1.25;margin:8px 0}
.jr-score-copy p{font-size:14px;line-height:1.65;margin:0 0 16px}
.jr-score-pills{gap:8px}
.jr-score-pills span,.jr-status{font-size:11px;padding:6px 10px}
.jr-input{font-size:14px;padding:13px 14px;margin-top:10px;border-radius:12px}
.jr-jd{min-height:145px;line-height:1.5}
.jr-hint{font-size:12px;line-height:1.55;margin-top:10px}
.jr-section-head{gap:16px;margin-bottom:18px}
.jr-section-head h3{font-size:21px;line-height:1.3;margin:5px 0}
.jr-section-head p{font-size:13px;line-height:1.55}
.jr-btn{font-size:13px;padding:12px 16px;border-radius:11px}
.jr-breakdown-grid{gap:14px}
.jr-break-row{grid-template-columns:minmax(190px,250px) minmax(100px,1fr) 42px 45px;gap:12px}
.jr-break-row strong{font-size:13px;line-height:1.35}
.jr-break-row small{font-size:11px;line-height:1.4;margin-top:4px}
.jr-break-row b{font-size:13px}
.jr-break-row>span{font-size:11px}
.jr-bar{height:9px}
.jr-two-col{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:20px;align-items:stretch}
.jr-upload{min-height:176px;border-radius:16px;gap:10px;padding:18px;box-sizing:border-box}
.jr-upload-icon{width:48px;height:48px;border-radius:14px;font-size:26px}
.jr-upload strong{font-size:15px;line-height:1.35;overflow-wrap:anywhere}
.jr-upload span{font-size:12px;line-height:1.5}
.jr-actions,.jr-footer-actions{gap:10px;margin-top:15px}
.jr-message{font-size:13px;line-height:1.5;padding:12px 14px;border-radius:11px}
.jr-analysis-note{margin-top:12px;font-size:12px;line-height:1.6;padding:12px;border-radius:10px;overflow-wrap:anywhere}
.jr-mini-grid{gap:10px}
.jr-mini-grid>div{border-radius:12px;padding:14px}
.jr-mini-grid small{font-size:11px}
.jr-mini-grid strong{font-size:21px;margin-top:5px;overflow-wrap:anywhere}
.jr-data-box{gap:10px;margin-top:14px}
.jr-data-box>div{padding:13px;border-radius:11px;min-width:0}
.jr-data-box span{font-size:10px;letter-spacing:.07em;line-height:1.45}
.jr-data-box strong{font-size:13px;line-height:1.65;margin-top:6px;overflow-wrap:anywhere;word-break:normal}
.jr-skill-chips{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}
.jr-skill-chips span{display:inline-flex;max-width:100%;background:#eef4ff;border:1px solid #d8e5ff;color:#1d4ed8;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:750;letter-spacing:0;text-transform:none;overflow-wrap:anywhere}
.jr-extracted-text{margin-top:14px;border:1px solid #dfe7f1;background:#f8fafc;border-radius:12px;padding:12px}
.jr-extracted-text summary{cursor:pointer;font-size:13px;font-weight:800;color:#1d4ed8}
.jr-extracted-text pre{max-height:300px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.65 ui-monospace,SFMono-Regular,Consolas,monospace;color:#334155;margin:12px 0 0}
.jr-tool-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.jr-tool{gap:12px;border-radius:14px;padding:15px;min-width:0}
.jr-tool-icon{width:38px;height:38px;border-radius:11px;font-size:17px}
.jr-tool strong{font-size:13px;line-height:1.4}
.jr-tool span{font-size:11px;line-height:1.5;margin-top:5px}
.jr-tool em{font-size:9px;padding:5px 7px}
.jr-tool-detail{margin-top:14px;border-radius:14px;padding:18px}
.jr-tool-detail h4{font-size:15px;margin-bottom:8px}
.jr-tool-detail p{font-size:13px;line-height:1.7}
.jr-formula h3{font-size:21px}
.jr-formula p{font-size:13px;line-height:1.6}
.jr-formula code{font-size:12px;line-height:1.7;padding:16px;overflow-wrap:anywhere}
.jr-formula small{font-size:11px;line-height:1.7}
.jr-profile-facts{height:fit-content}
@media(max-width:1100px){.jr-top-grid,.jr-two-col{grid-template-columns:1fr}.jr-hero-score{min-height:auto}.jr-tool-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:700px){.jr-card{padding:17px}.jr-hero-score{flex-direction:column;align-items:flex-start;gap:18px}.jr-break-row{grid-template-columns:minmax(0,1fr) 38px 38px;gap:8px}.jr-break-row .jr-bar{grid-column:1/-1;grid-row:2}.jr-break-row>span{grid-column:3;grid-row:1}.jr-mini-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.jr-tool-grid{grid-template-columns:1fr}.jr-tool{align-items:flex-start}.jr-tool em{margin-left:auto}.jr-actions .jr-btn{flex:1}.jr-score-ring{width:145px;height:145px}.jr-score-ring>div{width:111px;height:111px}.jr-score-ring strong{font-size:40px}}
`;
// ============================================================
// CAMPUSLINK PUBLIC EXPERIENCE, THEME, AND REGISTRATION
// ============================================================

const CAMPUSLINK_PUBLIC_UI_CSS = `
:root{--cl-bg:#f5f8ff;--cl-bg-deep:#eef3ff;--cl-panel:rgba(255,255,255,.82);--cl-panel-solid:#fff;--cl-text:#10172a;--cl-muted:#63708a;--cl-line:rgba(85,105,145,.18);--cl-blue:#365cf5;--cl-cyan:#20c4d9;--cl-violet:#875af5;--cl-green:#12b886;--cl-shadow:0 24px 70px rgba(36,54,104,.13);--cl-mx:50%;--cl-my:30%}
html[data-cl-theme="dark"]{--cl-bg:#080d1a;--cl-bg-deep:#0b1427;--cl-panel:rgba(16,25,47,.82);--cl-panel-solid:#10192e;--cl-text:#edf3ff;--cl-muted:#a2afca;--cl-line:rgba(151,173,219,.18);--cl-blue:#7190ff;--cl-cyan:#49e1e8;--cl-violet:#b99cff;--cl-green:#52deb0;--cl-shadow:0 26px 80px rgba(0,0,0,.34)}
html{scroll-behavior:smooth;scroll-padding-top:92px}body{margin:0}body,button,input{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}button,a{-webkit-tap-highlight-color:transparent}button{font:inherit}a{color:inherit}
.cl-theme-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px solid var(--cl-line);border-radius:999px;background:var(--cl-panel);color:var(--cl-text);font-size:12px;font-weight:800;padding:10px 14px;cursor:pointer;backdrop-filter:blur(14px);transition:transform .2s,border-color .2s,background .2s}.cl-theme-btn:hover{transform:translateY(-2px);border-color:var(--cl-blue)}.cl-theme-btn.compact{width:40px;height:40px;padding:0;font-size:17px}
.cl-public{isolation:isolate;position:relative;overflow:hidden;background:var(--cl-bg);color:var(--cl-text);min-height:100vh;transition:background .25s,color .25s}.cl-public:before{content:"";position:absolute;inset:0;pointer-events:none;z-index:-2;background:radial-gradient(650px circle at var(--cl-mx) var(--cl-my),color-mix(in srgb,var(--cl-blue) 11%,transparent),transparent 65%),radial-gradient(700px circle at 90% 6%,color-mix(in srgb,var(--cl-cyan) 14%,transparent),transparent 65%),linear-gradient(180deg,var(--cl-bg),var(--cl-bg-deep))}.cl-public:after{content:"";position:absolute;inset:0;pointer-events:none;z-index:-1;opacity:.25;background-image:linear-gradient(var(--cl-line) 1px,transparent 1px),linear-gradient(90deg,var(--cl-line) 1px,transparent 1px);background-size:48px 48px;mask-image:linear-gradient(to bottom,black,transparent 72%)}.cl-container{width:min(1180px,calc(100% - 48px));margin:0 auto}.cl-section{padding:100px 0;position:relative}.cl-section-sm{padding:54px 0}.cl-kicker{display:inline-flex;gap:8px;align-items:center;color:var(--cl-blue);font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.16em}.cl-kicker:before{content:"";width:22px;height:2px;border-radius:4px;background:linear-gradient(90deg,var(--cl-blue),var(--cl-cyan))}.cl-heading{font-size:clamp(31px,4.2vw,52px);line-height:1.08;letter-spacing:-.045em;margin:14px 0 17px;max-width:790px}.cl-gradient-text{background:linear-gradient(100deg,var(--cl-blue),var(--cl-violet) 50%,var(--cl-cyan));background-clip:text;-webkit-background-clip:text;color:transparent}.cl-lede{color:var(--cl-muted);font-size:16px;line-height:1.8;max-width:680px}.cl-topnav{z-index:20;position:sticky;top:0;border-bottom:1px solid var(--cl-line);background:color-mix(in srgb,var(--cl-bg) 82%,transparent);backdrop-filter:blur(20px)}.cl-nav-inner{height:78px;display:flex;align-items:center;justify-content:space-between;gap:18px}.cl-brand{display:flex;align-items:center;gap:11px;text-decoration:none;flex:none}.cl-brand-mark{display:grid;place-items:center;width:42px;height:42px;color:#fff;border-radius:14px;font-size:21px;font-weight:950;background:linear-gradient(145deg,#365cf5,#20c4d9 70%,#875af5);box-shadow:0 9px 26px rgba(54,92,245,.28)}.cl-brand strong{display:block;font-size:17px;letter-spacing:-.03em}.cl-brand small{display:block;font-size:10px;letter-spacing:.12em;color:var(--cl-muted);margin-top:3px}.cl-nav-links{display:flex;align-items:center;gap:25px}.cl-nav-links a{font-size:12px;font-weight:750;color:var(--cl-muted);text-decoration:none;transition:color .2s}.cl-nav-links a:hover{color:var(--cl-blue)}.cl-nav-actions{display:flex;align-items:center;gap:9px}.cl-btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;border:1px solid transparent;border-radius:13px;padding:13px 18px;text-decoration:none;font-size:13px;font-weight:850;cursor:pointer;transition:transform .2s,box-shadow .2s,border-color .2s,background .2s}.cl-btn:hover{transform:translateY(-2px)}.cl-btn-primary{color:#fff;background:linear-gradient(105deg,#365cf5,#7657f5 58%,#20bfcf);box-shadow:0 12px 26px rgba(54,92,245,.25)}.cl-btn-primary:hover{box-shadow:0 18px 36px rgba(54,92,245,.33)}.cl-btn-secondary{border-color:var(--cl-line);background:var(--cl-panel);color:var(--cl-text)}.cl-btn-secondary:hover{border-color:var(--cl-blue)}.cl-btn-small{padding:10px 14px;border-radius:11px;font-size:12px}.cl-mobile-link{display:none}
.cl-hero{padding:72px 0 58px;min-height:560px;display:flex;align-items:center}.cl-hero-grid{display:grid;grid-template-columns:1.03fr .97fr;align-items:center;gap:52px}.cl-hero h1{font-size:clamp(43px,5.7vw,72px);line-height:.99;letter-spacing:-.065em;margin:20px 0 23px;max-width:760px}.cl-hero .cl-lede{max-width:565px;font-size:16px}.cl-hero-actions{display:flex;gap:12px;flex-wrap:wrap;margin:28px 0 24px}.cl-trust-row{display:flex;align-items:center;flex-wrap:wrap;gap:13px;color:var(--cl-muted);font-size:11px;font-weight:750}.cl-trust-dot{display:flex;align-items:center;gap:6px}.cl-trust-dot i{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--cl-green);box-shadow:0 0 0 4px color-mix(in srgb,var(--cl-green) 13%,transparent)}.cl-hero-visual{position:relative;min-width:0;perspective:1100px}.cl-visual-orb{position:absolute;border-radius:50%;filter:blur(1px);pointer-events:none}.cl-orb-one{width:200px;height:200px;right:-10px;top:-38px;background:radial-gradient(circle,color-mix(in srgb,var(--cl-cyan) 25%,transparent),transparent 70%);animation:cl-float 7s ease-in-out infinite}.cl-orb-two{width:180px;height:180px;left:-45px;bottom:-60px;background:radial-gradient(circle,color-mix(in srgb,var(--cl-violet) 20%,transparent),transparent 72%);animation:cl-float 8s ease-in-out infinite reverse}.cl-product-window{position:relative;border:1px solid var(--cl-line);background:var(--cl-panel);border-radius:25px;padding:18px;box-shadow:var(--cl-shadow);backdrop-filter:blur(25px);transform:rotateY(-5deg) rotateX(2deg);animation:cl-window-in .8s both}.cl-window-bar{display:flex;align-items:center;justify-content:space-between;padding:0 2px 15px;border-bottom:1px solid var(--cl-line)}.cl-window-dots{display:flex;gap:5px}.cl-window-dots i{width:7px;height:7px;border-radius:50%;background:var(--cl-muted);opacity:.5}.cl-window-label{font-size:10px;color:var(--cl-muted);font-weight:850;letter-spacing:.1em}.cl-live-tag{display:inline-flex;align-items:center;gap:6px;color:var(--cl-green);font-size:10px;font-weight:900}.cl-live-tag:before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor;box-shadow:0 0 10px currentColor}.cl-window-title{display:flex;justify-content:space-between;align-items:flex-start;gap:15px;padding:19px 3px 14px}.cl-window-title h3{font-size:17px;margin:0 0 5px;letter-spacing:-.03em}.cl-window-title p{font-size:10px;color:var(--cl-muted);margin:0}.cl-pill{white-space:nowrap;border:1px solid color-mix(in srgb,var(--cl-green) 30%,var(--cl-line));color:var(--cl-green);background:color-mix(in srgb,var(--cl-green) 9%,transparent);font-weight:900;padding:6px 9px;border-radius:999px;font-size:9px}.cl-score-card{border-radius:17px;background:linear-gradient(135deg,color-mix(in srgb,var(--cl-blue) 11%,var(--cl-panel-solid)),color-mix(in srgb,var(--cl-violet) 7%,var(--cl-panel-solid)));border:1px solid var(--cl-line);padding:17px}.cl-score-top{display:flex;align-items:center;justify-content:space-between;gap:10px}.cl-score-top span{font-size:10px;color:var(--cl-muted);font-weight:800}.cl-score-number{display:flex;align-items:baseline;gap:3px;margin-top:8px}.cl-score-number strong{font-size:43px;letter-spacing:-.06em;line-height:1}.cl-score-number small{font-size:12px;color:var(--cl-muted)}.cl-progress{height:7px;border-radius:99px;background:var(--cl-line);overflow:hidden;margin:12px 0 8px}.cl-progress span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--cl-blue),var(--cl-violet),var(--cl-cyan));transition:width .6s ease}.cl-score-foot{display:flex;justify-content:space-between;gap:10px;color:var(--cl-muted);font-size:9px}.cl-signal-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:11px}.cl-signal{border:1px solid var(--cl-line);background:var(--cl-panel);border-radius:12px;padding:12px}.cl-signal span{display:block;font-size:9px;color:var(--cl-muted);margin-bottom:6px}.cl-signal strong{font-size:15px;letter-spacing:-.03em}.cl-signal em{font-style:normal;color:var(--cl-green);font-size:9px;margin-left:3px}.cl-pipeline{display:flex;align-items:center;gap:5px;margin-top:13px;flex-wrap:wrap}.cl-pipeline span{font-size:8px;color:var(--cl-muted);border:1px solid var(--cl-line);border-radius:7px;padding:7px 8px;background:var(--cl-panel)}.cl-pipeline b{font-size:10px;color:var(--cl-blue)}.cl-float-badge{position:absolute;display:flex;align-items:center;gap:10px;border:1px solid var(--cl-line);border-radius:16px;background:var(--cl-panel-solid);color:var(--cl-text);box-shadow:0 13px 35px rgba(20,36,80,.12);padding:12px 14px;animation:cl-float 5s ease-in-out infinite}.cl-float-badge.one{right:-24px;top:20%;animation-delay:-1s}.cl-float-badge.two{left:-25px;bottom:10%;animation-delay:-2.4s}.cl-float-icon{display:grid;place-items:center;border-radius:10px;background:linear-gradient(140deg,#365cf5,#20c4d9);color:white;width:34px;height:34px;font-weight:950}.cl-float-badge strong{display:block;font-size:11px}.cl-float-badge small{display:block;color:var(--cl-muted);font-size:9px;margin-top:3px}.cl-scroll-cue{display:flex;align-items:center;justify-content:center;gap:9px;color:var(--cl-muted);font-size:10px;font-weight:800;margin:17px 0 0}.cl-scroll-cue span{height:25px;width:15px;border:1px solid var(--cl-line);border-radius:99px;position:relative}.cl-scroll-cue span:after{content:"";position:absolute;width:3px;height:5px;top:5px;left:5px;border-radius:5px;background:var(--cl-blue);animation:cl-scroll 1.5s infinite}
.cl-proof-strip{border-top:1px solid var(--cl-line);border-bottom:1px solid var(--cl-line);background:color-mix(in srgb,var(--cl-panel) 75%,transparent)}.cl-proof-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;padding:26px 0}.cl-proof{display:flex;align-items:center;gap:12px;border-right:1px solid var(--cl-line);padding:4px 15px}.cl-proof:last-child{border:0}.cl-proof-icon{color:var(--cl-blue);font-size:22px}.cl-proof strong{display:block;font-size:12px}.cl-proof small{display:block;color:var(--cl-muted);font-size:10px;margin-top:4px}.cl-section-head{display:flex;justify-content:space-between;align-items:flex-end;gap:26px;margin-bottom:36px}.cl-section-head .cl-lede{font-size:14px;max-width:410px;margin-bottom:0}.cl-feature-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:15px}.cl-feature{position:relative;overflow:hidden;border:1px solid var(--cl-line);border-radius:20px;padding:24px;background:var(--cl-panel);box-shadow:0 12px 35px rgba(30,50,95,.035);transition:transform .25s,border-color .25s,box-shadow .25s}.cl-feature:hover{transform:translateY(-5px);border-color:color-mix(in srgb,var(--cl-blue) 45%,var(--cl-line));box-shadow:var(--cl-shadow)}.cl-feature:after{content:"";position:absolute;right:-35px;top:-45px;width:130px;height:130px;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--cl-cyan) 12%,transparent),transparent 72%);pointer-events:none}.cl-feature-icon{display:grid;place-items:center;width:48px;height:48px;border-radius:15px;color:var(--cl-blue);background:color-mix(in srgb,var(--cl-blue) 10%,transparent);font-size:22px;margin-bottom:22px;border:1px solid color-mix(in srgb,var(--cl-blue) 15%,transparent)}.cl-feature h3{font-size:17px;letter-spacing:-.025em;margin:0 0 10px}.cl-feature p{color:var(--cl-muted);font-size:12px;line-height:1.75;margin:0}.cl-feature-link{display:inline-flex;gap:7px;align-items:center;text-decoration:none;color:var(--cl-blue);font-weight:900;font-size:11px;margin-top:19px}.cl-roadmap-section{background:linear-gradient(180deg,transparent,color-mix(in srgb,var(--cl-blue) 5%,transparent),transparent)}.cl-roadmap-board{position:relative;border:1px solid var(--cl-line);border-radius:26px;padding:30px;background:var(--cl-panel);box-shadow:var(--cl-shadow);overflow:hidden}.cl-roadmap-board:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 12% 20%,color-mix(in srgb,var(--cl-blue) 10%,transparent),transparent 30%),radial-gradient(circle at 90% 80%,color-mix(in srgb,var(--cl-cyan) 10%,transparent),transparent 26%);pointer-events:none}.cl-roadmap-meta{position:relative;display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:30px}.cl-roadmap-meta strong{font-size:14px}.cl-roadmap-meta span{font-size:10px;color:var(--cl-muted)}.cl-roadmap-path{position:relative;display:grid;grid-template-columns:repeat(8,1fr);gap:9px;align-items:start}.cl-roadmap-path:before{content:"";position:absolute;left:5%;right:5%;top:29px;height:2px;background:linear-gradient(90deg,var(--cl-blue),var(--cl-violet),var(--cl-cyan));opacity:.7}.cl-roadmap-step{position:relative;text-align:center;z-index:1}.cl-roadmap-node{width:58px;height:58px;margin:0 auto 13px;border-radius:18px;display:grid;place-items:center;color:white;font-size:20px;font-weight:900;background:linear-gradient(145deg,#365cf5,#8061f7 65%,#20c4d9);border:5px solid var(--cl-panel-solid);box-shadow:0 6px 19px rgba(54,92,245,.2);transition:transform .25s}.cl-roadmap-step:hover .cl-roadmap-node{transform:translateY(-5px) rotate(-3deg)}.cl-roadmap-step strong{display:block;font-size:10px;line-height:1.4}.cl-roadmap-step small{display:block;font-size:9px;color:var(--cl-muted);line-height:1.5;margin-top:5px}.cl-stage-interactive{display:grid;grid-template-columns:.8fr 1.2fr;gap:20px;margin-top:26px;position:relative}.cl-stage-list{display:grid;gap:7px}.cl-stage-btn{display:flex;align-items:center;gap:11px;text-align:left;border:1px solid var(--cl-line);border-radius:12px;padding:11px 12px;background:var(--cl-panel);color:var(--cl-text);cursor:pointer;transition:.2s}.cl-stage-btn.active{border-color:var(--cl-blue);background:color-mix(in srgb,var(--cl-blue) 9%,var(--cl-panel));box-shadow:0 7px 18px color-mix(in srgb,var(--cl-blue) 10%,transparent)}.cl-stage-btn b{display:grid;place-items:center;background:var(--cl-panel-solid);border:1px solid var(--cl-line);width:28px;height:28px;border-radius:9px;color:var(--cl-blue);font-size:11px;flex:none}.cl-stage-btn span{font-size:11px;font-weight:850}.cl-stage-detail{min-height:200px;border-radius:18px;border:1px solid var(--cl-line);padding:22px;background:linear-gradient(145deg,color-mix(in srgb,var(--cl-blue) 6%,var(--cl-panel)),var(--cl-panel));display:flex;flex-direction:column;justify-content:space-between}.cl-stage-detail h3{font-size:22px;letter-spacing:-.035em;margin:8px 0}.cl-stage-detail p{font-size:12px;color:var(--cl-muted);line-height:1.8;max-width:600px}.cl-stage-detail .cl-btn{align-self:flex-start}.cl-roles-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.cl-role-card{border:1px solid var(--cl-line);border-radius:18px;padding:20px;background:var(--cl-panel);transition:transform .2s}.cl-role-card:hover{transform:translateY(-4px)}.cl-role-card .cl-role-number{font-size:10px;color:var(--cl-blue);font-weight:950;letter-spacing:.12em}.cl-role-card h3{margin:15px 0 8px;font-size:16px}.cl-role-card p{margin:0;color:var(--cl-muted);font-size:11px;line-height:1.7}.cl-role-card ul{padding:0;margin:16px 0 0;list-style:none;display:grid;gap:9px}.cl-role-card li{font-size:10px;color:var(--cl-muted);display:flex;gap:8px;align-items:flex-start}.cl-role-card li:before{content:"✓";color:var(--cl-green);font-weight:950}.cl-analytics{display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:center}.cl-analytics-visual{border:1px solid var(--cl-line);border-radius:24px;padding:25px;background:var(--cl-panel);box-shadow:var(--cl-shadow)}.cl-analytic-line{display:flex;gap:12px;align-items:center;margin:17px 0}.cl-analytic-label{width:110px;font-size:10px;color:var(--cl-muted);font-weight:800}.cl-analytic-track{flex:1;height:9px;background:var(--cl-line);border-radius:99px;overflow:hidden}.cl-analytic-track span{display:block;height:100%;width:var(--w);background:linear-gradient(90deg,var(--cl-blue),var(--cl-cyan));border-radius:99px;animation:cl-grow 1.3s both}.cl-analytic-value{font-size:10px;font-weight:900;width:32px;text-align:right}.cl-quote{font-size:clamp(23px,3.2vw,38px);letter-spacing:-.04em;line-height:1.25;margin:18px 0}.cl-check-list{list-style:none;padding:0;margin:22px 0;display:grid;gap:13px}.cl-check-list li{display:flex;align-items:flex-start;gap:11px;color:var(--cl-muted);font-size:12px;line-height:1.65}.cl-check-list li:before{content:"✓";flex:none;display:grid;place-items:center;width:22px;height:22px;border-radius:8px;background:color-mix(in srgb,var(--cl-green) 12%,transparent);color:var(--cl-green);font-size:12px;font-weight:950}.cl-faq-grid{display:grid;grid-template-columns:.75fr 1.25fr;gap:34px}.cl-faq-list{display:grid;gap:9px}.cl-faq-item{border:1px solid var(--cl-line);background:var(--cl-panel);border-radius:14px;overflow:hidden}.cl-faq-question{width:100%;text-align:left;display:flex;justify-content:space-between;gap:15px;align-items:center;border:0;background:transparent;color:var(--cl-text);padding:17px;font-size:12px;font-weight:850;cursor:pointer}.cl-faq-question span:last-child{font-size:18px;color:var(--cl-blue)}.cl-faq-answer{padding:0 17px 17px;color:var(--cl-muted);font-size:11px;line-height:1.8}.cl-final-cta{position:relative;overflow:hidden;border-radius:28px;padding:54px;background:linear-gradient(120deg,#253fbc,#6047dc 58%,#158cba);color:#fff;box-shadow:0 22px 60px rgba(54,70,180,.25)}.cl-final-cta:before,.cl-final-cta:after{content:"";position:absolute;border:1px solid rgba(255,255,255,.16);border-radius:50%;width:340px;height:340px;right:-80px;top:-200px}.cl-final-cta:after{width:240px;height:240px;right:90px;top:70px}.cl-final-cta h2{position:relative;z-index:1;font-size:clamp(30px,4vw,46px);line-height:1.08;letter-spacing:-.05em;max-width:670px;margin:12px 0}.cl-final-cta p{position:relative;z-index:1;color:rgba(255,255,255,.8);font-size:13px;line-height:1.8;max-width:600px}.cl-final-cta .cl-btn{position:relative;z-index:1;margin-top:15px;background:white;color:#283cba}.cl-footer{border-top:1px solid var(--cl-line);padding:28px 0 34px;margin-top:74px}.cl-footer-inner{display:flex;align-items:center;justify-content:space-between;gap:20px}.cl-footer p,.cl-footer a{font-size:10px;color:var(--cl-muted);text-decoration:none}.cl-footer-links{display:flex;gap:17px;flex-wrap:wrap}.cl-animate-in{animation:cl-fade-up .7s both}.cl-delay-1{animation-delay:.08s}.cl-delay-2{animation-delay:.16s}.cl-delay-3{animation-delay:.24s}
.cl-auth-page{position:relative;isolation:isolate;min-height:100vh;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:20px 24px 55px;background:var(--cl-bg);color:var(--cl-text);overflow:hidden}.cl-auth-page:before{content:"";position:absolute;z-index:-1;inset:0;background:radial-gradient(600px circle at 12% 20%,color-mix(in srgb,var(--cl-blue) 15%,transparent),transparent 70%),radial-gradient(520px circle at 95% 85%,color-mix(in srgb,var(--cl-cyan) 12%,transparent),transparent 70%),linear-gradient(145deg,var(--cl-bg),var(--cl-bg-deep))}.cl-auth-nav{width:min(1120px,100%);display:flex;align-items:center;justify-content:space-between;gap:16px;margin:0 auto 22px;position:relative;z-index:2}.cl-auth-nav-right{display:flex;align-items:center;gap:9px}.cl-auth-nav a{text-decoration:none}.cl-auth-home{font-size:12px;font-weight:850;color:var(--cl-muted);padding:11px 14px;border:1px solid var(--cl-line);border-radius:999px;background:var(--cl-panel)}.cl-auth-page .login-card{position:relative;z-index:1;width:min(440px,100%);box-sizing:border-box;margin:18px auto 0;background:var(--cl-panel-solid);border:1px solid var(--cl-line);border-radius:25px;padding:30px;box-shadow:var(--cl-shadow);color:var(--cl-text);backdrop-filter:blur(18px)}.cl-auth-page .login-brand-mark{background:linear-gradient(145deg,#365cf5,#20c4d9 70%,#875af5);box-shadow:0 8px 20px rgba(54,92,245,.24)}.cl-auth-page .login-heading h1{color:var(--cl-text);letter-spacing:-.04em}.cl-auth-page .login-heading p,.cl-auth-page .login-footer{color:var(--cl-muted)}.cl-auth-page .form-field label{display:block;color:var(--cl-muted);font-size:11px;font-weight:850;margin-bottom:7px}.cl-auth-page .form-field input,.cl-auth-input{box-sizing:border-box;width:100%;border:1px solid var(--cl-line);border-radius:12px;background:var(--cl-bg);color:var(--cl-text);padding:13px 14px;outline:none;font-size:13px;transition:border-color .2s,box-shadow .2s}.cl-auth-page .form-field input:focus,.cl-auth-input:focus{border-color:var(--cl-blue);box-shadow:0 0 0 4px color-mix(in srgb,var(--cl-blue) 12%,transparent)}.cl-auth-page .login-form{display:grid;gap:15px}.cl-auth-page .login-btn{width:100%;border-radius:12px;background:linear-gradient(100deg,#365cf5,#7957f5 60%,#20bfcf);box-shadow:0 10px 25px rgba(54,92,245,.2)}.cl-auth-page .login-footer{border-top:1px solid var(--cl-line);padding-top:15px;margin-top:18px;display:flex;gap:10px;flex-wrap:wrap;justify-content:space-between;font-size:9px}.cl-auth-page .status-message{font-size:12px;line-height:1.5;border-radius:12px;padding:12px;margin-top:14px}.cl-auth-create{display:flex;gap:6px;align-items:center;justify-content:center;flex-wrap:wrap;margin-top:19px;font-size:11px;color:var(--cl-muted)}.cl-auth-create a{color:var(--cl-blue);font-weight:900;text-decoration:none}.cl-register-card{width:min(480px,100%);box-sizing:border-box;position:relative;z-index:1;margin:12px auto 0;padding:30px;border:1px solid var(--cl-line);border-radius:25px;background:var(--cl-panel-solid);box-shadow:var(--cl-shadow)}.cl-register-card h1{font-size:29px;letter-spacing:-.045em;margin:11px 0 8px}.cl-register-card>p{color:var(--cl-muted);font-size:12px;line-height:1.65;margin:0 0 23px}.cl-register-form{display:grid;gap:14px}.cl-register-field{display:grid;gap:7px}.cl-register-field label{font-size:11px;color:var(--cl-muted);font-weight:850}.cl-register-form .cl-btn{width:100%;margin-top:4px}.cl-register-note{font-size:10px;color:var(--cl-muted);line-height:1.6;margin-top:15px}.cl-register-alert{font-size:12px;border:1px solid var(--cl-line);border-radius:12px;padding:12px;line-height:1.55;margin:13px 0}.cl-register-alert.error{color:#c73954;background:rgba(238,66,102,.08);border-color:rgba(238,66,102,.22)}.cl-register-alert.success{color:var(--cl-green);background:color-mix(in srgb,var(--cl-green) 8%,transparent);border-color:color-mix(in srgb,var(--cl-green) 22%,var(--cl-line))}
html[data-cl-theme="dark"] .dashboard-page{background:#080d1a;color:#edf3ff}html[data-cl-theme="dark"] .dashboard-header,html[data-cl-theme="dark"] .sidebar{background:#0e172b;border-color:rgba(151,173,219,.17);color:#edf3ff}html[data-cl-theme="dark"] .brand-block h1,html[data-cl-theme="dark"] .page-content h1,html[data-cl-theme="dark"] .page-content h2,html[data-cl-theme="dark"] .page-content h3,html[data-cl-theme="dark"] .page-content strong{color:#edf3ff}html[data-cl-theme="dark"] .page-content{background:#080d1a;color:#edf3ff}html[data-cl-theme="dark"] .dashboard-card,html[data-cl-theme="dark"] .jr-card,html[data-cl-theme="dark"] .jr-tool,html[data-cl-theme="dark"] .jr-upload,html[data-cl-theme="dark"] .jr-data-box>div,html[data-cl-theme="dark"] .jr-mini-grid>div{background:#10192e!important;border-color:rgba(151,173,219,.18)!important;color:#edf3ff}html[data-cl-theme="dark"] .jr-input,html[data-cl-theme="dark"] textarea,html[data-cl-theme="dark"] input,html[data-cl-theme="dark"] select{background:#0b1427;color:#edf3ff;border-color:rgba(151,173,219,.22)}html[data-cl-theme="dark"] .sidebar-link{color:#a2afca}html[data-cl-theme="dark"] .sidebar-link-active{background:rgba(113,144,255,.15);color:#fff}html[data-cl-theme="light"] .dashboard-page{background:#f6f8fc;color:#172033}html[data-cl-theme="light"] .dashboard-header,html[data-cl-theme="light"] .sidebar{background:rgba(255,255,255,.94);border-color:#e1e7f0}html[data-cl-theme="light"] .header-right .cl-theme-btn{margin-right:2px}
@keyframes cl-fade-up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}@keyframes cl-window-in{from{opacity:0;transform:translateY(20px) rotateY(-5deg)}to{opacity:1;transform:translateY(0) rotateY(-5deg)}}@keyframes cl-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}@keyframes cl-scroll{0%{opacity:0;transform:translateY(0)}30%{opacity:1}100%{opacity:0;transform:translateY(9px)}}@keyframes cl-grow{from{width:0}to{width:var(--w)}}
@media(max-width:1050px){.cl-nav-links{gap:14px}.cl-hero-grid{gap:27px}.cl-float-badge.one{right:-10px}.cl-float-badge.two{left:-8px}.cl-roadmap-path{grid-template-columns:repeat(4,1fr);row-gap:25px}.cl-roadmap-path:before{display:none}.cl-roadmap-step{padding:6px}.cl-roles-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:760px){.cl-container{width:min(100% - 32px,1180px)}.cl-section{padding:70px 0}.cl-nav-inner{height:68px}.cl-nav-links{display:none}.cl-nav-actions .cl-btn-secondary{display:none}.cl-hero{padding:48px 0 32px}.cl-hero-grid{grid-template-columns:1fr;gap:35px}.cl-hero h1{font-size:clamp(43px,11vw,62px)}.cl-hero .cl-lede{font-size:14px}.cl-hero-visual{max-width:600px;width:100%;margin:auto}.cl-product-window{transform:none}.cl-float-badge{display:none}.cl-proof-grid{grid-template-columns:repeat(2,1fr);gap:0}.cl-proof{border-right:0;padding:13px 7px}.cl-section-head{display:block}.cl-section-head .cl-lede{margin-top:17px}.cl-feature-grid{grid-template-columns:1fr}.cl-stage-interactive{grid-template-columns:1fr}.cl-stage-detail{min-height:170px}.cl-roadmap-board{padding:18px}.cl-roadmap-path{grid-template-columns:repeat(2,1fr)}.cl-roles-grid{grid-template-columns:1fr 1fr}.cl-analytics{grid-template-columns:1fr}.cl-faq-grid{grid-template-columns:1fr;gap:10px}.cl-final-cta{padding:32px 23px}.cl-footer-inner{align-items:flex-start;flex-direction:column}.cl-nav-actions{gap:6px}.cl-brand-mark{width:38px;height:38px}.cl-brand strong{font-size:15px}.cl-theme-btn{padding:9px 11px}.cl-auth-page{padding:14px 14px 35px}.cl-auth-nav{margin-bottom:12px}.cl-auth-page .login-card,.cl-register-card{padding:23px 20px;border-radius:20px}.cl-auth-page .login-card{margin-top:12px}.cl-auth-page .login-footer{justify-content:flex-start}}
@media(max-width:430px){.cl-hero-actions .cl-btn{width:100%}.cl-signal-grid{grid-template-columns:1fr 1fr}.cl-signal:last-child{display:none}.cl-window-title{align-items:flex-start;flex-direction:column}.cl-roadmap-meta{align-items:flex-start;flex-direction:column}.cl-proof-grid{grid-template-columns:1fr 1fr}.cl-proof{gap:7px}.cl-proof strong{font-size:10px}.cl-roles-grid{grid-template-columns:1fr}.cl-brand small{font-size:8px}.cl-nav-actions .cl-theme-btn{width:36px;height:36px}.cl-nav-actions .cl-btn-primary{padding:10px 12px;font-size:11px}}
`;


const CAMPUSLINK_JOURNEY_CSS = `
.cl-journey-stage{position:relative;isolation:isolate;overflow:hidden;min-height:550px;padding:22px 20px 18px;border:1px solid var(--cl-line);border-radius:30px;background:radial-gradient(ellipse at 24% 8%,color-mix(in srgb,var(--cl-blue) 12%,transparent),transparent 48%),radial-gradient(ellipse at 100% 70%,color-mix(in srgb,var(--cl-cyan) 12%,transparent),transparent 40%),var(--cl-panel);box-shadow:0 26px 85px rgba(39,58,135,.13),inset 0 1px 0 rgba(255,255,255,.25);}
.cl-journey-stage:before{content:"";position:absolute;inset:0;background-image:linear-gradient(var(--cl-line) 1px,transparent 1px),linear-gradient(90deg,var(--cl-line) 1px,transparent 1px);background-size:38px 38px;opacity:.24;mask-image:linear-gradient(180deg,#000,transparent 95%);pointer-events:none;z-index:-1}
.cl-journey-glow{position:absolute;width:240px;height:240px;filter:blur(55px);opacity:.22;border-radius:50%;pointer-events:none;z-index:-1}.cl-journey-glow-a{background:#675ff4;top:30px;right:0;animation:cl-journey-float 8s ease-in-out infinite alternate}.cl-journey-glow-b{background:#27ccd7;bottom:20px;left:0;animation:cl-journey-float 7s ease-in-out infinite alternate-reverse}
.cl-journey-topline{position:relative;display:flex;justify-content:space-between;gap:12px;align-items:center;z-index:2}.cl-journey-topline>div{display:grid;gap:7px}.cl-journey-topline strong{font-size:14px;letter-spacing:-.025em}.cl-journey-topline .cl-kicker{font-size:9px}.cl-live-tag{display:inline-flex;gap:7px;align-items:center;border:1px solid color-mix(in srgb,var(--cl-green) 30%,var(--cl-line));border-radius:99px;padding:6px 9px;background:color-mix(in srgb,var(--cl-green) 8%,var(--cl-panel));font-size:8px;letter-spacing:.1em;font-weight:900;color:var(--cl-green);white-space:nowrap}.cl-live-tag i{width:6px;height:6px;border-radius:99px;background:var(--cl-green);box-shadow:0 0 0 4px color-mix(in srgb,var(--cl-green) 13%,transparent);animation:cl-pulse 1.7s infinite}
.cl-journey-canvas{height:330px;position:relative;margin:8px -10px 0}.cl-journey-svg{display:block;width:100%;height:100%;overflow:visible;position:relative;z-index:1}.cl-journey-route-shadow{fill:none;stroke:color-mix(in srgb,var(--cl-blue) 9%,transparent);stroke-width:16;stroke-linecap:round}.cl-journey-route{fill:none;stroke:url(#clJourneyStroke);stroke-width:3.4;stroke-linecap:round;stroke-dasharray:8 9;animation:cl-route-flow 12s linear infinite;opacity:.9}.cl-journey-route-dash{fill:none;stroke:color-mix(in srgb,var(--cl-cyan) 45%,white);stroke-width:1.1;stroke-linecap:round;stroke-dasharray:2 15;animation:cl-route-flow 4s linear infinite}.cl-journey-node{transform-box:fill-box;transform-origin:center}.cl-journey-node-pulse{fill:color-mix(in srgb,var(--cl-blue) 10%,transparent);stroke:color-mix(in srgb,var(--cl-blue) 15%,transparent);stroke-width:1;opacity:.5}.cl-journey-node-halo{fill:var(--cl-panel-solid);stroke:color-mix(in srgb,var(--cl-blue) 35%,var(--cl-line));stroke-width:1.2}.cl-journey-node-disc{fill:linear-gradient(145deg,#365cf5,#8061f7);fill:#4d68ee;stroke:var(--cl-panel-solid);stroke-width:3}.cl-journey-node-glyph{font-family:Inter,ui-sans-serif,system-ui,sans-serif;font-size:14px;font-weight:950;fill:#fff}.cl-journey-node-number{font-family:Inter,ui-sans-serif,system-ui,sans-serif;font-size:8px;font-weight:850;fill:var(--cl-muted);letter-spacing:.08em}.cl-journey-node-label{font-family:Inter,ui-sans-serif,system-ui,sans-serif;font-size:11px;font-weight:900;fill:var(--cl-text);paint-order:stroke;stroke:var(--cl-panel);stroke-width:4px;stroke-linejoin:round}.cl-journey-node.is-live .cl-journey-node-pulse{opacity:1;animation:cl-node-pulse 1.6s ease-out infinite}.cl-journey-node.is-live .cl-journey-node-halo{stroke:var(--cl-cyan);stroke-width:2.5}.cl-journey-node.is-live .cl-journey-node-disc{fill:#684ff1}.cl-journey-traveller-halo{fill:color-mix(in srgb,var(--cl-cyan) 28%,transparent);stroke:color-mix(in srgb,var(--cl-cyan) 75%,white);stroke-width:1}.cl-journey-traveller-core{fill:#fff;stroke:#20b9d3;stroke-width:2}.cl-journey-orbit-tag{position:absolute;z-index:2;display:flex;align-items:center;gap:7px;padding:8px 11px;border-radius:12px;background:var(--cl-panel-solid);border:1px solid var(--cl-line);box-shadow:0 8px 24px rgba(25,38,90,.11);font-size:9px;font-weight:850;color:var(--cl-text);animation:cl-float-chip 5s ease-in-out infinite}.cl-journey-orbit-tag span{color:var(--cl-blue);font-size:13px}.cl-orbit-tag-top{top:24px;right:18px}.cl-orbit-tag-left{left:0;top:46% ;animation-delay:-1.7s}.cl-orbit-tag-right{right:0;bottom:30px;animation-delay:-3.2s}.cl-journey-spark{position:absolute;width:4px;height:4px;border-radius:50%;background:var(--cl-cyan);box-shadow:0 0 13px 3px color-mix(in srgb,var(--cl-cyan) 40%,transparent);animation:cl-pulse 2.2s infinite}.cl-spark-1{top:22%;left:32%}.cl-spark-2{top:57%;right:17%;animation-delay:-.7s}.cl-spark-3{bottom:14%;left:52%;animation-delay:-1.4s}
.cl-journey-now{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:14px 14px;border-radius:17px;border:1px solid var(--cl-line);background:color-mix(in srgb,var(--cl-panel-solid) 80%,transparent);backdrop-filter:blur(12px)}.cl-journey-now-copy{min-width:0;display:flex;align-items:flex-start;gap:10px}.cl-journey-now-dot{margin-top:6px;width:8px;height:8px;flex:none;border-radius:50%;background:var(--cl-cyan);box-shadow:0 0 0 5px color-mix(in srgb,var(--cl-cyan) 12%,transparent)}.cl-journey-now-copy small{display:block;font-size:8px;font-weight:900;letter-spacing:.13em;color:var(--cl-blue)}.cl-journey-now-copy strong{display:block;margin:4px 0;font-size:15px;letter-spacing:-.03em}.cl-journey-now-copy p{margin:0;max-width:280px;color:var(--cl-muted);font-size:9px;line-height:1.55}.cl-journey-progress-wrap{width:90px;flex:none;text-align:right}.cl-journey-progress-wrap>strong{font-size:20px;letter-spacing:-.04em}.cl-journey-progress-wrap>strong small{font-size:10px;color:var(--cl-muted)}.cl-journey-progress{margin:7px 0 4px;height:4px;width:100%;overflow:hidden;border-radius:999px;background:var(--cl-line)}.cl-journey-progress span{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,var(--cl-blue),var(--cl-violet),var(--cl-cyan));transition:width .55s ease}.cl-journey-progress-wrap>small{font-size:8px;color:var(--cl-muted)}
.cl-feature-group{margin-top:36px}.cl-feature-group-head{display:grid;grid-template-columns:1fr auto;column-gap:24px;align-items:end;margin:0 0 16px;padding-bottom:14px;border-bottom:1px solid var(--cl-line)}.cl-feature-group-head>span{grid-column:1/-1;color:var(--cl-blue);font-size:9px;font-weight:950;letter-spacing:.14em;margin-bottom:7px}.cl-feature-group-head h3{font-size:clamp(20px,2.3vw,28px);letter-spacing:-.04em;line-height:1.15;margin:0}.cl-feature-group-head p{max-width:380px;color:var(--cl-muted);font-size:11px;line-height:1.7;margin:0}.cl-feature-group .cl-feature-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.cl-feature-group .cl-feature{min-height:194px;display:flex;flex-direction:column}.cl-feature-group .cl-feature-link{margin-top:auto;padding-top:16px}.cl-roadmap-step.is-live .cl-roadmap-node{transform:translateY(-5px) scale(1.06);box-shadow:0 0 0 7px color-mix(in srgb,var(--cl-cyan) 10%,transparent),0 12px 27px rgba(54,92,245,.28);animation:cl-node-pop 1.5s ease-in-out infinite alternate}.cl-roadmap-step.is-live strong{color:var(--cl-blue)}
@keyframes cl-route-flow{to{stroke-dashoffset:-220}}@keyframes cl-node-pulse{0%{transform:scale(.82);opacity:.8}75%,100%{transform:scale(1.3);opacity:.1}}@keyframes cl-node-pop{from{filter:saturate(1)}to{filter:saturate(1.4)}}@keyframes cl-journey-float{from{transform:translate3d(-8px,0,0) scale(.94)}to{transform:translate3d(18px,-14px,0) scale(1.08)}}@keyframes cl-float-chip{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
@media(max-width:1050px){.cl-journey-stage{min-height:530px;padding:20px 15px 15px}.cl-journey-canvas{height:310px}.cl-feature-group .cl-feature-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.cl-feature-group-head{grid-template-columns:1fr}.cl-feature-group-head p{margin-top:8px}}
@media(max-width:760px){.cl-journey-stage{min-height:0;padding:18px 13px 13px;border-radius:22px}.cl-journey-topline{align-items:flex-start}.cl-journey-topline strong{font-size:13px}.cl-journey-topline .cl-live-tag{font-size:7px;padding:6px 7px}.cl-journey-canvas{height:275px;margin:8px -8px 0}.cl-journey-node-label{font-size:13px;stroke-width:5px}.cl-journey-node-number{font-size:10px}.cl-journey-node-glyph{font-size:16px}.cl-journey-orbit-tag{font-size:8px;padding:6px 8px}.cl-orbit-tag-top{right:4px;top:14px}.cl-orbit-tag-left{left:-2px;top:49%}.cl-orbit-tag-right{right:-2px;bottom:10px}.cl-journey-now{align-items:flex-start;padding:12px 10px}.cl-journey-now-copy strong{font-size:13px}.cl-journey-now-copy p{font-size:9px}.cl-journey-progress-wrap{width:67px}.cl-journey-progress-wrap>strong{font-size:17px}.cl-feature-group .cl-feature-grid{grid-template-columns:1fr}.cl-feature-group .cl-feature{min-height:0}.cl-feature-group-head h3{font-size:23px}}
@media(max-width:430px){.cl-journey-canvas{height:230px}.cl-journey-node-label{font-size:15px}.cl-journey-orbit-tag{font-size:7px;gap:4px;padding:5px 6px}.cl-orbit-tag-left{top:48%}.cl-journey-now{gap:8px}.cl-journey-now-copy{gap:7px}.cl-journey-progress-wrap{width:55px}.cl-journey-progress-wrap>strong{font-size:15px}.cl-feature-group-head h3{font-size:21px}}
@media(prefers-reduced-motion:reduce){.cl-journey-route,.cl-journey-route-dash,.cl-journey-traveller,.cl-journey-glow,.cl-journey-node.is-live .cl-journey-node-pulse,.cl-journey-orbit-tag,.cl-journey-spark{animation:none!important}.cl-journey-progress span{transition:none}}
`;

function ThemeBootstrap() {
  useEffect(() => {
    const saved = localStorage.getItem("campuslink_theme");
    const theme = saved === "dark" || saved === "light" ? saved : "light";
    document.documentElement.setAttribute("data-cl-theme", theme);
    window.dispatchEvent(new Event("campuslink-theme-change"));
  }, []);
  return null;
}

function ThemeToggle({ compact = false }) {
  const [theme, setTheme] = useState(() => {
    if (typeof document === "undefined") return "light";
    return document.documentElement.getAttribute("data-cl-theme") || "light";
  });

  useEffect(() => {
    const syncTheme = () => setTheme(document.documentElement.getAttribute("data-cl-theme") || "light");
    window.addEventListener("campuslink-theme-change", syncTheme);
    return () => window.removeEventListener("campuslink-theme-change", syncTheme);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-cl-theme", next);
    localStorage.setItem("campuslink_theme", next);
    setTheme(next);
    window.dispatchEvent(new Event("campuslink-theme-change"));
  };

  return (
    <button type="button" className={`cl-theme-btn ${compact ? "compact" : ""}`} onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>
      {compact ? (theme === "dark" ? "☀" : "☾") : <><span>{theme === "dark" ? "☀" : "☾"}</span><span>{theme === "dark" ? "Light mode" : "Dark mode"}</span></>}
    </button>
  );
}

function CampusAtmosphere() {
  return <div className="cl-visual-orb cl-orb-one" aria-hidden="true" />;
}

function CampusLinkHome() {
  const [activeStage, setActiveStage] = useState(2);
  const [openFaq, setOpenFaq] = useState(0);
  const [liveStage, setLiveStage] = useState(0);

  const stages = [
    { title: "Build a clear student profile", short: "Profile", icon: "◎", desc: "Bring education, skills, projects, internships and achievements into one student record so the team can see real evidence—not an empty profile." },
    { title: "Upload and improve the resume", short: "Resume", icon: "▤", desc: "Extract resume facts, review section coverage, identify skill gaps and improve evidence before applying to a role." },
    { title: "Calculate job readiness", short: "Readiness", icon: "↗", desc: "Compare the student’s skills and evidence to a target role. Use the readiness view and visible score breakdown to decide what to strengthen next." },
    { title: "Match and apply to jobs", short: "Job match", icon: "⌕", desc: "Connect students to job drives, applications and relevant recommendations while keeping every step in the same placement workflow." },
    { title: "Review candidates and projects", short: "Recruiter", icon: "⌘", desc: "Recruiters can review ranked candidates, inspect applications and use project-analysis workflows tied to a Git repository where configured." },
    { title: "Coordinate interviews and offers", short: "Offer", icon: "✦", desc: "Track interview stages, scheduling, outcomes, documents and offers across recruiter and placement-officer workspaces." },
  ];
  const roadmap = [
    ["01", "College", "Education & profile"], ["02", "Skills", "Evidence & gaps"], ["03", "Projects", "Work you can show"], ["04", "Internship", "Hands-on practice"],
    ["05", "Readiness", "Role-fit score"], ["06", "Job match", "Jobs & applications"], ["07", "Interview", "Rounds & feedback"], ["08", "Offer", "Career launch"],
  ];
  const faqItems = [
    ["What is CampusLink?", "CampusLink is a connected campus placement workspace for students, recruiters, placement teams and administrators. It brings profiles, resume intelligence, jobs, applications, interviews, offers and placement operations into one system."],
    ["Does the readiness score guarantee a job?", "No. A readiness score is a decision-support signal based on the information and scoring rules available in the app. It is not a hiring guarantee and should be reviewed alongside project quality, interview performance and recruiter judgment."],
    ["Can recruiters analyse a Git repository?", "The recruiter workflow is designed to surface project analysis and candidate evidence. The Git analysis action depends on the matching project-analysis backend endpoint and repository-access configuration being present."],
    ["How do new users join?", "Use Create account to register a student account, then sign in with the same email and password. Additional recruiter and placement access should be provisioned according to your backend's role and access policy."],
  ];

  useEffect(() => {
    const timer = window.setInterval(() => setLiveStage((previous) => (previous + 1) % 8), 2150);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <main className="cl-public" onMouseMove={(event) => {
      const rect = event.currentTarget.getBoundingClientRect();
      event.currentTarget.style.setProperty("--cl-mx", `${event.clientX - rect.left}px`);
      event.currentTarget.style.setProperty("--cl-my", `${event.clientY - rect.top}px`);
    }}>
      <header className="cl-topnav">
        <div className="cl-container cl-nav-inner">
          <a className="cl-brand" href="#top" aria-label="CampusLink home">
            <span className="cl-brand-mark">C</span><span><strong>CampusLink</strong><small>CAMPUS → CAREER</small></span>
          </a>
          <nav className="cl-nav-links" aria-label="Main navigation">
            <a href="#platform">Platform</a><a href="#roadmap">Career roadmap</a><a href="#workspaces">Workspaces</a><a href="#intelligence">Intelligence</a><a href="#faq">FAQ</a>
          </nav>
          <div className="cl-nav-actions">
            <ThemeToggle compact />
            {getRole() ? <Link className="cl-btn cl-btn-secondary cl-btn-small" to={getDashboardPath(getRole())}>Open workspace ↗</Link> : <Link className="cl-btn cl-btn-secondary cl-btn-small" to="/login">Sign in</Link>}
            {!getRole() && <Link className="cl-btn cl-btn-primary cl-btn-small" to="/register">Create account <span>↗</span></Link>}
          </div>
        </div>
      </header>

      <section className="cl-hero" id="top">
        <div className="cl-container cl-hero-grid">
          <div className="cl-animate-in">
            <span className="cl-kicker">One connected placement ecosystem</span>
            <h1>Turn campus potential into <span className="cl-gradient-text">career momentum.</span></h1>
            <p className="cl-lede">A connected placement platform for student growth, recruiter decisions and college-wide coordination—from the first skill signal to the final offer.</p>
            <div className="cl-hero-actions"><Link className="cl-btn cl-btn-primary" to="/register">Get started <span>→</span></Link><a className="cl-btn cl-btn-secondary" href="#roadmap">Explore the journey <span>↓</span></a></div>
            <div className="cl-trust-row"><span className="cl-trust-dot"><i /> Student-first workflow</span><span>·</span><span className="cl-trust-dot"><i /> Recruiter-ready evidence</span><span>·</span><span className="cl-trust-dot"><i /> Placement-team visibility</span></div>
            <div className="cl-scroll-cue"><span /> Scroll to explore the platform</div>
          </div>

          <div className="cl-journey-stage cl-animate-in cl-delay-2" aria-label="Animated student journey from college to first job offer">
            <div className="cl-journey-glow cl-journey-glow-a" aria-hidden="true" />
            <div className="cl-journey-glow cl-journey-glow-b" aria-hidden="true" />
            <div className="cl-journey-topline">
              <div><span className="cl-kicker">THE STUDENT JOURNEY</span><strong>From campus to career</strong></div>
              <span className="cl-live-tag"><i /> JOURNEY IN MOTION</span>
            </div>
            <div className="cl-journey-canvas">
              <div className="cl-journey-spark cl-spark-1" aria-hidden="true" />
              <div className="cl-journey-spark cl-spark-2" aria-hidden="true" />
              <div className="cl-journey-spark cl-spark-3" aria-hidden="true" />
              <svg className="cl-journey-svg" viewBox="0 0 660 390" role="img" aria-labelledby="clJourneyTitle clJourneyDescription">
                <title id="clJourneyTitle">A student's journey from college to career</title>
                <desc id="clJourneyDescription">An animated route connects college, skills, projects, resume, job matching, interview, and offer.</desc>
                <defs>
                  <linearGradient id="clJourneyStroke" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#4c6fff" />
                    <stop offset="52%" stopColor="#9865f7" />
                    <stop offset="100%" stopColor="#25d4df" />
                  </linearGradient>
                  <filter id="clJourneyGlow" x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                <path className="cl-journey-route-shadow" d="M 38 310 C 75 320 90 250 120 222 S 166 239 198 275 S 229 326 265 315 S 301 277 317 236 S 340 175 360 180 S 396 120 425 145 S 459 184 482 208 S 511 247 527 222 S 554 150 580 145 S 612 173 626 197" />
                <path id="clStudentRoute" className="cl-journey-route" d="M 38 310 C 75 320 90 250 120 222 S 166 239 198 275 S 229 326 265 315 S 301 277 317 236 S 340 175 360 180 S 396 120 425 145 S 459 184 482 208 S 511 247 527 222 S 554 150 580 145 S 612 173 626 197" />
                <path className="cl-journey-route-dash" d="M 38 310 C 75 320 90 250 120 222 S 166 239 198 275 S 229 326 265 315 S 301 277 317 236 S 340 175 360 180 S 396 120 425 145 S 459 184 482 208 S 511 247 527 222 S 554 150 580 145 S 612 173 626 197" />
                {[
                  { number: '01', name: 'College', x: 42, y: 310, labelX: 18, labelY: 354, anchor: 'start', glyph: 'C' },
                  { number: '02', name: 'Skills', x: 120, y: 222, labelX: 91, labelY: 177, anchor: 'start', glyph: 'S' },
                  { number: '03', name: 'Projects', x: 198, y: 275, labelX: 165, labelY: 244, anchor: 'start', glyph: 'P' },
                  { number: '04', name: 'Internship', x: 265, y: 315, labelX: 231, labelY: 359, anchor: 'start', glyph: '↗' },
                  { number: '05', name: 'Readiness', x: 360, y: 180, labelX: 321, labelY: 137, anchor: 'start', glyph: 'R' },
                  { number: '06', name: 'Job match', x: 425, y: 145, labelX: 393, labelY: 101, anchor: 'start', glyph: '⌕' },
                  { number: '07', name: 'Interview', x: 527, y: 222, labelX: 492, labelY: 271, anchor: 'start', glyph: 'I' },
                  { number: '08', name: 'Offer', x: 580, y: 145, labelX: 562, labelY: 100, anchor: 'start', glyph: '✓' },
                ].map((node, index) => (
                  <g key={node.number} className={`cl-journey-node ${liveStage % 8 === index ? 'is-live' : ''}`} transform={`translate(${node.x} ${node.y})`}>
                    <circle className="cl-journey-node-pulse" r="28" />
                    <circle className="cl-journey-node-halo" r="23" />
                    <circle className="cl-journey-node-disc" r="18" />
                    <text className="cl-journey-node-glyph" textAnchor="middle" dominantBaseline="central" y="1">{node.glyph}</text>
                    <text className="cl-journey-node-number" x="0" y="35" textAnchor="middle">{node.number}</text>
                    <text className="cl-journey-node-label" x={node.labelX - node.x} y={node.labelY - node.y} textAnchor={node.anchor}>{node.name}</text>
                  </g>
                ))}
                <g className="cl-journey-traveller" filter="url(#clJourneyGlow)">
                  <circle r="11" className="cl-journey-traveller-halo" />
                  <circle r="5" className="cl-journey-traveller-core" />
                  <animateMotion dur="13s" repeatCount="indefinite" rotate="auto"><mpath href="#clStudentRoute" /></animateMotion>
                </g>
              </svg>
              <div className="cl-journey-orbit-tag cl-orbit-tag-top"><span>✦</span> Skill growth</div>
              <div className="cl-journey-orbit-tag cl-orbit-tag-left"><span>↗</span> Readiness score</div>
              <div className="cl-journey-orbit-tag cl-orbit-tag-right"><span>✓</span> Offer tracked</div>
            </div>
            <div className="cl-journey-now">
              <div className="cl-journey-now-copy"><span className="cl-journey-now-dot" /><div><small>NOW EXPLORING · STEP {(liveStage + 1).toString().padStart(2, '0')} / 08</small><strong>{roadmap[liveStage][1]}</strong><p>{[
                'A student builds a profile with education, skills and goals.',
                'Skills become visible and gaps turn into a practical learning plan.',
                'Projects make hands-on work and evidence easier to demonstrate.',
                'Resume facts are organised so strengths and missing details stand out.',
                'Role requirements are compared with the student’s available evidence.',
                'Applications progress into interview rounds and scheduled conversations.',
                'Recruiters and placement teams coordinate outcomes and next steps.',
                'Offer status, documents and career milestones stay connected.',
              ][liveStage]}</p></div></div>
              <div className="cl-journey-progress-wrap"><strong>{String(Math.round(((liveStage + 1) / 8) * 100)).padStart(2, '0')}<small>%</small></strong><div className="cl-journey-progress"><span style={{ width: `${((liveStage + 1) / 8) * 100}%` }} /></div><small>journey map</small></div>
            </div>
          </div>
        </div>
      </section>

      <section className="cl-proof-strip" aria-label="Platform coverage"><div className="cl-container cl-proof-grid"><div className="cl-proof"><span className="cl-proof-icon">◎</span><span><strong>Student growth</strong><small>Profiles, resumes, readiness</small></span></div><div className="cl-proof"><span className="cl-proof-icon">⌕</span><span><strong>Recruiter workflows</strong><small>Jobs, candidates, projects</small></span></div><div className="cl-proof"><span className="cl-proof-icon">◷</span><span><strong>Placement operations</strong><small>Drives, rounds, schedules</small></span></div><div className="cl-proof"><span className="cl-proof-icon">▦</span><span><strong>Shared visibility</strong><small>Documents, offers, updates</small></span></div></div></section>

      <section className="cl-section" id="platform"><div className="cl-container">
        <div className="cl-section-head"><div><span className="cl-kicker">THE COMPLETE FEATURE MAP</span><h2 className="cl-heading">The full journey, with <span className="cl-gradient-text">every team in view.</span></h2></div><p className="cl-lede">This is the public overview of what CampusLink brings together—not a screenshot of a dashboard. Explore student growth, recruiter decisions, placement operations and platform administration before entering the workspace.</p></div>
        <div className="cl-feature-group"><div className="cl-feature-group-head"><span>01 / STUDENT JOURNEY</span><h3>Build evidence. Find the next step.</h3><p>Tools that help a student move from a profile to a more confident application.</p></div>
          <div className="cl-feature-grid">
            <article className="cl-feature"><div className="cl-feature-icon">◎</div><h3>Student profile</h3><p>Organise education, branch, graduation year, skills, achievements and career goals in one student profile.</p><Link className="cl-feature-link" to="/register">Create a student account <span>→</span></Link></article>
            <article className="cl-feature"><div className="cl-feature-icon">▤</div><h3>Resume upload & extraction</h3><p>Upload a resume, extract available facts and review the profile information the system can identify.</p><Link className="cl-feature-link" to="/login">Open resume workspace <span>→</span></Link></article>
            <article className="cl-feature"><div className="cl-feature-icon">◉</div><h3>Job-readiness score</h3><p>Review a weighted readiness signal with visible factors such as skill match, resume quality, projects, education and evidence.</p><Link className="cl-feature-link" to="/login">Review readiness tools <span>→</span></Link></article>
            <article className="cl-feature"><div className="cl-feature-icon">⌕</div><h3>Jobs & AI recommendations</h3><p>Explore available jobs and role recommendations, and connect a target role to the skills a student should strengthen.</p><Link className="cl-feature-link" to="/login">Explore opportunities <span>→</span></Link></article>
            <article className="cl-feature"><div className="cl-feature-icon">↗</div><h3>Applications & notifications</h3><p>Track application progress and bring relevant updates into a single student-facing flow.</p><Link className="cl-feature-link" to="/login">Track applications <span>→</span></Link></article>
            <article className="cl-feature"><div className="cl-feature-icon">✦</div><h3>Interviews, offers & documents</h3><p>Keep interview activity, offer details, student documents and follow-up tasks in the same career journey.</p><Link className="cl-feature-link" to="/login">Continue the journey <span>→</span></Link></article>
          </div>
        </div>
        <div className="cl-feature-group"><div className="cl-feature-group-head"><span>02 / RECRUITER EXPERIENCE</span><h3>Find talent with more context.</h3><p>Move from job requirements to candidate evidence, review and hiring outcomes.</p></div>
          <div className="cl-feature-grid">
            <article className="cl-feature"><div className="cl-feature-icon">▣</div><h3>Company & job management</h3><p>Maintain recruiter company information, publish opportunities and manage job requirements and drives.</p><Link className="cl-feature-link" to="/login">Recruiter sign in <span>→</span></Link></article>
            <article className="cl-feature"><div className="cl-feature-icon">↗</div><h3>Candidate readiness ranking</h3><p>Surface a job-readiness rank and review candidates using relevant profile, resume, skill and project evidence.</p><Link className="cl-feature-link" to="/login">Review candidate tools <span>→</span></Link></article>
            <article className="cl-feature"><div className="cl-feature-icon">⌘</div><h3>Git repository project analysis</h3><p>Start a project-analysis workflow from a Git repository when the relevant backend endpoint and repository access are configured.</p><Link className="cl-feature-link" to="/login">Open recruiter workspace <span>→</span></Link></article>
            <article className="cl-feature"><div className="cl-feature-icon">◷</div><h3>Applications, interviews & offers</h3><p>Review applications, coordinate interview rounds, record outcomes and follow offer progress through the hiring pipeline.</p><Link className="cl-feature-link" to="/login">Manage hiring activity <span>→</span></Link></article>
          </div>
        </div>
        <div className="cl-feature-group"><div className="cl-feature-group-head"><span>03 / PLACEMENT OPERATIONS</span><h3>Coordinate the whole campus pipeline.</h3><p>Bring student outcomes, companies, drives and logistics into a connected operating view.</p></div>
          <div className="cl-feature-grid">
            <article className="cl-feature"><div className="cl-feature-icon">♙</div><h3>Students & companies</h3><p>Review student records, company information and the people involved in campus placement activity.</p><Link className="cl-feature-link" to="/login">Open placement workspace <span>→</span></Link></article>
            <article className="cl-feature"><div className="cl-feature-icon">▦</div><h3>Job drives & applications</h3><p>Coordinate drives, review application pools and keep the movement of candidates visible to placement teams.</p><Link className="cl-feature-link" to="/login">Manage placement drives <span>→</span></Link></article>
            <article className="cl-feature"><div className="cl-feature-icon">◷</div><h3>Selection rounds & scheduling</h3><p>Coordinate selection stages, interview schedules and the hand-offs needed to run a placement process.</p><Link className="cl-feature-link" to="/login">Coordinate rounds <span>→</span></Link></article>
            <article className="cl-feature"><div className="cl-feature-icon">◆</div><h3>Offers, documents & alerts</h3><p>Follow offer records, placement documents and notifications so the right team can see important next steps.</p><Link className="cl-feature-link" to="/login">Follow outcomes <span>→</span></Link></article>
            <article className="cl-feature"><div className="cl-feature-icon">▥</div><h3>Placement analytics</h3><p>Use placement-wide views to review activity and outcomes across the student and recruitment pipeline.</p><Link className="cl-feature-link" to="/login">Review analytics <span>→</span></Link></article>
          </div>
        </div>
        <div className="cl-feature-group"><div className="cl-feature-group-head"><span>04 / ADMIN & PLATFORM</span><h3>Keep access and operations organised.</h3><p>Shared role-based entry points for the wider placement ecosystem.</p></div>
          <div className="cl-feature-grid">
            <article className="cl-feature"><div className="cl-feature-icon">⌘</div><h3>Role-based workspaces</h3><p>Separate student, recruiter, placement-officer and administrator entry points based on backend permissions.</p><Link className="cl-feature-link" to="/login">Sign in to CampusLink <span>→</span></Link></article>
            <article className="cl-feature"><div className="cl-feature-icon">◈</div><h3>Connected operational records</h3><p>Keep the main placement objects—people, companies, jobs, applications, selection stages and outcomes—within one platform.</p><Link className="cl-feature-link" to="/login">Enter the platform <span>→</span></Link></article>
            <article className="cl-feature"><div className="cl-feature-icon">✧</div><h3>Explainable intelligence</h3><p>Present scores as decision support with visible evidence and gaps—not as a guarantee of selection or employment.</p><a className="cl-feature-link" href="#intelligence">See the scoring approach <span>↓</span></a></article>
          </div>
        </div>
      </div></section>

      <section className="cl-section cl-roadmap-section" id="roadmap"><div className="cl-container">
        <div className="cl-section-head"><div><span className="cl-kicker">From college to career</span><h2 className="cl-heading">A roadmap that makes the <span className="cl-gradient-text">next step visible.</span></h2></div><p className="cl-lede">Every stage creates evidence for the next one. Select a stage to see how CampusLink connects it to real placement work.</p></div>
        <div className="cl-roadmap-board"><div className="cl-roadmap-meta"><strong>THE STUDENT → CAREER PATH</strong><span>8 stages · one connected journey</span></div><div className="cl-roadmap-path">{roadmap.map((item, index) => <div className={`cl-roadmap-step ${liveStage === index ? "is-live" : ""}`} key={item[0]}><div className="cl-roadmap-node">{item[0]}</div><strong>{item[1]}</strong><small>{item[2]}</small></div>)}</div>
          <div className="cl-stage-interactive"><div className="cl-stage-list">{stages.map((stage, index) => <button type="button" key={stage.short} className={`cl-stage-btn ${activeStage === index ? "active" : ""}`} onClick={() => setActiveStage(index)} aria-pressed={activeStage === index}><b>{stage.icon}</b><span>{stage.short}</span></button>)}</div><div className="cl-stage-detail"><div><span className="cl-kicker">Stage {(activeStage + 1).toString().padStart(2, "0")} / 06</span><h3>{stages[activeStage].title}</h3><p>{stages[activeStage].desc}</p></div><Link className="cl-btn cl-btn-secondary cl-btn-small" to={activeStage < 2 ? "/register" : "/login"}>{activeStage < 2 ? "Start as a student" : "Continue to workspace"} <span>→</span></Link></div></div>
        </div>
      </div></section>

      <section className="cl-section" id="workspaces"><div className="cl-container"><div className="cl-section-head"><div><span className="cl-kicker">One platform, clear roles</span><h2 className="cl-heading">Built for the people who <span className="cl-gradient-text">make placements happen.</span></h2></div><p className="cl-lede">Each workspace has its own responsibilities, while the candidate journey stays connected end-to-end.</p></div>
        <div className="cl-roles-grid"><article className="cl-role-card"><span className="cl-role-number">WORKSPACE 01</span><h3>Students</h3><p>Know what to improve and what to do next.</p><ul><li>Profile and resume workspace</li><li>Job readiness & target-role fit</li><li>Jobs, applications and interviews</li><li>Recommendations, offers and documents</li></ul></article><article className="cl-role-card"><span className="cl-role-number">WORKSPACE 02</span><h3>Recruiters</h3><p>Review candidates with more relevant evidence.</p><ul><li>Company and job-drive management</li><li>Ranked candidate review</li><li>Project / repository analysis flow</li><li>Applications, interviews and offers</li></ul></article><article className="cl-role-card"><span className="cl-role-number">WORKSPACE 03</span><h3>Placement teams</h3><p>Coordinate drives and student outcomes.</p><ul><li>Student and company oversight</li><li>Applications and selection rounds</li><li>Scheduling and offer tracking</li><li>Notifications, documents and analytics</li></ul></article><article className="cl-role-card"><span className="cl-role-number">WORKSPACE 04</span><h3>Administrators</h3><p>Keep platform operations under control.</p><ul><li>Role-based workspace access</li><li>Operational modules and records</li><li>Placement-wide visibility</li><li>Administrative follow-through</li></ul></article></div>
      </div></section>

      <section className="cl-section" id="intelligence"><div className="cl-container cl-analytics"><div><span className="cl-kicker">Explainable intelligence</span><h2 className="cl-heading">A score is useful when you can see <span className="cl-gradient-text">what drives it.</span></h2><p className="cl-lede">Turn raw student information into a clearer action plan. Keep the score transparent, job-specific and grounded in evidence the platform can actually see.</p><ul className="cl-check-list"><li>Compare resume skills with the skills named in a target job description.</li><li>Look at education, project work, internship evidence and profile completeness alongside skill overlap.</li><li>Use missing skills as a focused practice plan—not as a promise or guarantee of employment.</li><li>Let recruiters make the final decision using the full application and interview context.</li></ul><Link className="cl-btn cl-btn-primary" to="/register">Build a student profile <span>→</span></Link></div>
        <div className="cl-analytics-visual"><div className="cl-window-bar"><strong style={{fontSize:13}}>Readiness signal map</strong><span className="cl-live-tag">Illustrative</span></div><p style={{fontSize:11,color:"var(--cl-muted)",lineHeight:1.7}}>A visual example of how evidence categories can be reviewed together. This is demonstration data, not a real candidate score.</p>{[["Skill match",84],["Project evidence",76],["Resume coverage",88],["Education fit",92],["Experience signals",61],["Profile completeness",79]].map(([label,value],index)=><div className="cl-analytic-line" key={label}><span className="cl-analytic-label">{label}</span><div className="cl-analytic-track"><span style={{"--w":`${value}%`,animationDelay:`${index*100}ms`}} /></div><span className="cl-analytic-value">{value}</span></div>)}<div className="cl-pipeline"><span>Evidence</span><b>→</b><span>Role-fit</span><b>→</b><span>Action plan</span></div></div>
      </div></section>

      <section className="cl-section" id="faq"><div className="cl-container cl-faq-grid"><div><span className="cl-kicker">Good to know</span><h2 className="cl-heading">Clear answers. <span className="cl-gradient-text">No black box.</span></h2><p className="cl-lede">CampusLink supports the workflow; backend availability and permissions determine which connected actions can run in your deployment.</p></div><div className="cl-faq-list">{faqItems.map(([question,answer],index)=><div className="cl-faq-item" key={question}><button className="cl-faq-question" type="button" onClick={()=>setOpenFaq(openFaq===index?-1:index)} aria-expanded={openFaq===index}><span>{question}</span><span>{openFaq===index?"−":"+"}</span></button>{openFaq===index&&<div className="cl-faq-answer">{answer}</div>}</div>)}</div></div></section>

      <section className="cl-section-sm"><div className="cl-container"><div className="cl-final-cta"><span className="cl-kicker" style={{color:"#dbe5ff"}}>Your campus-to-career system</span><h2>Give every student a clearer route from potential to offer.</h2><p>Start with a profile, strengthen evidence, connect to opportunities and keep every step visible to the people who move placements forward.</p><Link className="cl-btn" to="/register">Create your CampusLink account <span>→</span></Link></div></div></section>

      <footer className="cl-footer"><div className="cl-container cl-footer-inner"><a className="cl-brand" href="#top"><span className="cl-brand-mark">C</span><span><strong>CampusLink</strong><small>CAMPUS → CAREER</small></span></a><p>Connected student growth and placement operations.</p><div className="cl-footer-links"><a href="#platform">Platform</a><a href="#roadmap">Roadmap</a><Link to="/login">Sign in</Link><Link to="/register">Create account</Link></div></div></footer>
    </main>
  );
}

async function extractResumeToProfile(file, accessToken) {
  const extractEndpoints = ["/ai/member4/resume/extract", "/resume/extract-profile", "/resume/analyze"];
  let lastError = null;
  let data = null;
  for (const path of extractEndpoints) {
    try {
      const fd = new FormData();
      fd.append("file", file);
      const response = await fetch(`${API_BASE_URL}${path}`, {
        method: "POST",
        headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
        body: fd,
        signal: AbortSignal.timeout ? AbortSignal.timeout(28000) : undefined,
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = Array.isArray(body?.detail) ? body.detail.map((item) => item?.msg || String(item)).join(" · ") : body?.detail;
        throw new Error(detail || `Resume extraction failed (${response.status})`);
      }
      data = body;
      break;
    } catch (error) { lastError = error; }
  }
  if (!data) throw new Error(lastError?.message || "Unable to read this PDF resume.");

  const text = String(data?.resume_text || data?.extracted_text || data?.text || "");
  const educationRows = Array.isArray(data?.education) ? data.education : [];
  const education = educationRows.length ? educationRows[educationRows.length - 1] : {};
  const section = (aliases) => {
    const lines = text.replace(/\r/g, "").split("\n");
    const normalize = (value) => value.toLowerCase().replace(/[\s:|–—-]+/g, " ").trim();
    const start = lines.findIndex((line) => aliases.includes(normalize(line)));
    if (start < 0) return "";
    const heads = ["education", "academic background", "academic qualifications", "qualifications", "skills", "technical skills", "core skills", "technologies", "technical expertise", "projects", "academic projects", "personal projects", "key projects", "experience", "work experience", "professional experience", "internship", "internships", "certifications", "certificates", "licenses & certifications", "summary", "profile", "career objective", "objective", "professional summary", "achievements", "awards"];
    let end = lines.length;
    for (let i = start + 1; i < lines.length; i += 1) if (heads.includes(normalize(lines[i]))) { end = i; break; }
    return lines.slice(start + 1, end).join("\n").trim();
  };
  const asText = (value) => Array.isArray(value) ? value.map((item) => typeof item === "string" ? item : [item?.title, item?.name, item?.description, item?.details].filter(Boolean).join(" — ")).filter(Boolean).join("\n\n") : (value == null ? "" : String(value));
  const skills = (Array.isArray(data?.skills) ? data.skills.join(", ") : asText(data?.skills)) || section(["skills", "technical skills", "core skills", "technologies", "technical expertise"]);
  const projects = asText(data?.projects) || section(["projects", "academic projects", "personal projects", "key projects"]);
  const experience = asText(data?.experience) || section(["experience", "work experience", "professional experience", "internship", "internships"]);
  const certifications = asText(data?.certifications) || section(["certifications", "certificates", "licenses & certifications"]);
  const careerObjective = asText(data?.career_objective || data?.summary || data?.objective) || section(["summary", "profile", "career objective", "objective", "professional summary"]);
  const profile = {
    phone: data?.phone || null,
    degree: data?.degree || education?.degree || null,
    department: data?.department || data?.branch || education?.branch || null,
    graduation_year: data?.graduation_year ?? education?.graduation_year ?? null,
    cgpa: data?.cgpa ?? education?.cgpa ?? null,
    skills: skills || null,
    projects: projects || null,
    experience: experience || null,
    certifications: certifications || null,
    linkedin: data?.linkedin || null,
    github: data?.github || data?.github_url || null,
    preferred_roles: data?.preferred_roles || null,
    preferred_locations: data?.preferred_locations || null,
    career_objective: careerObjective || null,
    resume_text: text || null,
    profile_photo_url: null,
  };
  const saved = await fetch(`${API_BASE_URL}/student-profile/me`, {
    method: "PUT",
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(profile),
  });
  const savedBody = await saved.json().catch(() => ({}));
  if (!saved.ok) {
    const detail = Array.isArray(savedBody?.detail) ? savedBody.detail.map((item) => item?.msg || String(item)).join(" · ") : savedBody?.detail;
    throw new Error(detail || `Profile save failed (${saved.status})`);
  }
  return savedBody;
}

function Register() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);

  const register = async (event) => {
    event.preventDefault();
    setMessage("");
    setSuccess(false);
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      setMessage("Complete every field to create your account.");
      return;
    }
    if (password.length < 8) {
      setMessage("Use a password with at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("The passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email: email.trim(), password, full_name: fullName.trim(), role: "STUDENT" }),
      });
      let data = {};
      try { data = await response.json(); } catch { data = {}; }
      if (!response.ok) throw new Error(data?.detail || data?.message || "Registration failed. Check the details or try another email.");
      if (resumeFile) {
        setMessage("Account created. Signing you in and filling your profile from the resume…");
        const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ email: email.trim(), password }),
        });
        const loginData = await loginResponse.json().catch(() => ({}));
        if (!loginResponse.ok || !loginData?.access_token) {
          setSuccess(true);
          setMessage("Your account was created. Sign in, then open My Profile and use ‘Auto-fill from PDF’ to import your resume.");
          window.setTimeout(() => navigate("/login", { replace: true }), 1800);
          return;
        }
        localStorage.setItem("campuslink_token", loginData.access_token);
        try {
          await extractResumeToProfile(resumeFile, loginData.access_token);
          setSuccess(true);
          setMessage("Account created. Your resume details have been imported and saved. Opening your profile…");
          window.setTimeout(() => navigate("/student/profile", { replace: true }), 900);
        } catch (resumeError) {
          setSuccess(true);
          setMessage(`Account created, but resume auto-fill needs another try: ${resumeError.message || "PDF extraction failed."} You can retry it from My Profile.`);
          window.setTimeout(() => navigate("/student/profile", { replace: true }), 1600);
        }
      } else {
        setSuccess(true);
        setMessage("Your student account has been created. Taking you to sign in…");
        window.setTimeout(() => navigate("/login", { replace: true }), 1100);
      }
    } catch (error) {
      setMessage(error?.message || "Unable to reach the registration service. Make sure the CampusLink backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="cl-auth-page">
      <div className="cl-auth-nav"><Link className="cl-brand" to="/"><span className="cl-brand-mark">C</span><span><strong>CampusLink</strong><small>CAMPUS → CAREER</small></span></Link><div className="cl-auth-nav-right"><ThemeToggle compact /><Link className="cl-auth-home" to="/">← Home</Link><Link className="cl-auth-home" to="/login">Sign in</Link></div></div>
      <section className="cl-register-card">
        <span className="cl-kicker">Start your career journey</span>
        <h1>Create your student account.</h1>
        <p>Save your student profile, work on resume readiness and follow job opportunities through CampusLink.</p>
        <form className="cl-register-form" onSubmit={register}>
          <div className="cl-register-field"><label htmlFor="cl-register-name">Full name</label><input className="cl-auth-input" id="cl-register-name" autoComplete="name" value={fullName} onChange={(event)=>setFullName(event.target.value)} placeholder="Enter your full name" /></div>
          <div className="cl-register-field"><label htmlFor="cl-register-email">Email address</label><input className="cl-auth-input" id="cl-register-email" type="email" autoComplete="email" value={email} onChange={(event)=>setEmail(event.target.value)} placeholder="you@example.com" /></div>
          <div className="cl-register-field"><label htmlFor="cl-register-password">Password</label><input className="cl-auth-input" id="cl-register-password" type="password" autoComplete="new-password" value={password} onChange={(event)=>setPassword(event.target.value)} placeholder="At least 8 characters" /></div>
          <div className="cl-register-field"><label htmlFor="cl-register-confirm">Confirm password</label><input className="cl-auth-input" id="cl-register-confirm" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event)=>setConfirmPassword(event.target.value)} placeholder="Re-enter your password" /></div>
          <div className="cl-register-field"><label htmlFor="cl-register-resume">Upload your resume <span style={{fontWeight:500,color:"var(--cl-muted)"}}>(optional, PDF)</span></label><input className="cl-auth-input" id="cl-register-resume" type="file" accept="application/pdf,.pdf" onChange={(event)=>setResumeFile(event.target.files?.[0] || null)} style={{padding:"9px 10px"}} /><small style={{color:"var(--cl-muted)",fontSize:10,lineHeight:1.5}}>{resumeFile ? `Selected: ${resumeFile.name} · profile will be auto-filled after account creation.` : "Skip manual data entry: CampusLink can import your skills, education, projects and experience after your account is created."}</small></div>
          {message && <div className={`cl-register-alert ${success ? "success" : "error"}`} role="status">{message}</div>}
          <button className="cl-btn cl-btn-primary" type="submit" disabled={loading || success}>{loading ? "Creating account…" : success ? "Account created ✓" : "Create student account →"}</button>
        </form>
        <div className="cl-register-note">By creating an account, you will be registered with the Student role. Recruiter and placement permissions must be granted by your platform administrator.</div>
        <div className="cl-auth-create"><span>Already have an account?</span><Link to="/login">Sign in here →</Link></div>
      </section>
    </main>
  );
}

// ============================================================
// LOGIN
// ============================================================

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    const token = getToken();
    const role = getRole();

    if (token && role) {
      navigate(
        getDashboardPath(role),
        {
          replace: true,
        }
      );
    }
  }, [navigate]);

  const login = async () => {
    if (
      !email.trim() ||
      !password
    ) {
      setMessage(
        "Enter your email and password."
      );

      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response =
        await fetch(
          `${API_BASE_URL}/auth/login`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Accept:
                "application/json",
            },
            body: JSON.stringify({
              email:
                email.trim(),
              password,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            "Login failed."
        );
      }

      if (!data.access_token) {
        throw new Error(
          "No access token returned."
        );
      }

      localStorage.setItem(
        "campuslink_token",
        data.access_token
      );

      const payload =
        decodeToken(
          data.access_token
        );

      if (!payload?.role) {
        throw new Error(
          "Login token does not contain a role."
        );
      }

      navigate(
        getDashboardPath(
          payload.role
        ),
        {
          replace: true,
        }
      );
    } catch (error) {
      setMessage(
        error.message ||
          "Unable to login."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page cl-auth-page">
      <div className="cl-auth-nav">
        <Link className="cl-brand" to="/"><span className="cl-brand-mark">C</span><span><strong>CampusLink</strong><small>CAMPUS → CAREER</small></span></Link>
        <div className="cl-auth-nav-right"><ThemeToggle compact /><Link className="cl-auth-home" to="/">← Home</Link><Link className="cl-auth-home" to="/register">Create account</Link></div>
      </div>
      <div className="login-glow login-glow-one" />
      <div className="login-glow login-glow-two" />

      <div className="login-card">
        <div className="login-brand">
          <div className="login-brand-mark">
            C
          </div>

          <div>
            <span>
              CAMPUSLINK
            </span>

            <small>
              Placement Platform
            </small>
          </div>
        </div>

        <div className="login-heading">
          <span className="section-kicker">
            WELCOME BACK
          </span>

          <h1>
            Sign in to your workspace
          </h1>

          <p>
            Manage placements, recruitment
            and AI-powered career workflows.
          </p>
        </div>

        <div className="login-form">
          <div className="form-field">
            <label>
              Email
            </label>

            <input
              type="email"
              value={email}
              placeholder="student2@test.com"
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key === "Enter"
                ) {
                  login();
                }
              }}
            />
          </div>

          <div className="form-field">
            <label>
              Password
            </label>

            <input
              type="password"
              value={password}
              placeholder="Enter password"
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key === "Enter"
                ) {
                  login();
                }
              }}
            />
          </div>

          <button
            type="button"
            className="primary-btn login-btn"
            onClick={login}
            disabled={loading}
          >
            {loading && (
              <span className="spinner" />
            )}

            {loading
              ? "Signing in..."
              : "Sign in to CampusLink →"}
          </button>
        </div>

        {message && (
          <div className="status-message error">
            <span>!</span>
            {message}
          </div>
        )}

        <div className="login-footer">
          <span>Secure workspace</span>
          <span>JWT authentication</span>
          <span>Role-based access</span>
        </div>
        <div className="cl-auth-create"><span>New to CampusLink?</span><Link to="/register">Create a student account →</Link></div>
      </div>
    </div>
  );
}

// ============================================================
// RECRUITER DASHBOARD
// ============================================================

function RecruiterDashboard() {
  const cards = [
    {
      to: "/recruiter/ai-candidates",
      icon: "✦",
      title: "AI Candidates",
      description:
        "Review ranked candidates and matching insights.",
    },
    {
      to: "/recruiter/company",
      icon: "▦",
      title: "Company",
      description:
        "Manage recruiter company information.",
    },
    {
      to: "/recruiter/jobs",
      icon: "▣",
      title: "Job Drives",
      description:
        "Create and manage placement opportunities.",
    },
    {
      to: "/recruiter/applications",
      icon: "≡",
      title: "Applications",
      description:
        "Review student applications and progress.",
    },
    {
      to: "/recruiter/interviews",
      icon: "◷",
      title: "Interviews",
      description:
        "Manage interview schedules and interviewers.",
    },
    {
      to: "/recruiter/offers",
      icon: "◆",
      title: "Offers",
      description:
        "Issue and track placement offers.",
    },
    {
      to: "/recruiter/notifications",
      icon: "◌",
      title: "Notifications",
      description:
        "Review recruiter placement updates.",
    },
  ];

  return (
    <DashboardShell
      role="RECRUITER"
      title="Recruiter Dashboard"
    >
      <PageHero
        eyebrow="Recruitment workspace"
        title="Hiring command center"
        description="Manage job drives, candidates, applications, interviews and offers from one professional workspace."
      />

      <div className="dashboard-grid">
        {cards.map((card, index) => (
          <DashboardCard
            key={card.to}
            {...card}
            index={index}
          />
        ))}
      </div>
    </DashboardShell>
  );
}

// ============================================================
// PLACEMENT DASHBOARD
// ============================================================

function PlacementDashboard() {
  const cards = [
    {
      to: "/placement/students",
      icon: "◎",
      title: "Students",
      description:
        "View and manage placement students.",
    },
    {
      to: "/placement/companies",
      icon: "▦",
      title: "Companies",
      description:
        "Track participating companies.",
    },
    {
      to: "/placement/jobs",
      icon: "▣",
      title: "Job Drives",
      description:
        "Manage campus hiring drives.",
    },
    {
      to: "/placement/applications",
      icon: "≡",
      title: "Applications",
      description:
        "Monitor the application pipeline.",
    },
    {
      to: "/placement/selection-rounds",
      icon: "◈",
      title: "Selection Rounds",
      description:
        "Track selection-round progress.",
    },
    {
      to: "/placement/scheduling",
      icon: "◷",
      title: "Scheduling",
      description:
        "Manage interview scheduling.",
    },
    {
      to: "/placement/offers",
      icon: "◆",
      title: "Offers",
      description:
        "Monitor issued and accepted offers.",
    },
    {
      to: "/placement/documents",
      icon: "▤",
      title: "Documents",
      description:
        "Manage placement documentation.",
    },
    {
      to: "/placement/notifications",
      icon: "◌",
      title: "Notifications",
      description:
        "Review placement workflow notifications.",
    },
  ];

  return (
    <DashboardShell
      role="PLACEMENT_OFFICER"
      title="Placement Officer Dashboard"
    >
      <PageHero
        eyebrow="Placement operations"
        title="Placement command center"
        description="Coordinate students, recruiters, job drives, interviews, offers and the complete placement workflow."
      />

      <div className="dashboard-grid">
        {cards.map((card, index) => (
          <DashboardCard
            key={card.to}
            {...card}
            index={index}
          />
        ))}
      </div>
    </DashboardShell>
  );
}

// ============================================================
// ADMIN DASHBOARD
// ============================================================

function AdminDashboard() {
  const cards = [
    {
      to: "/admin/users",
      icon: "◎",
      title: "Users",
      description:
        "Manage CampusLink user accounts.",
    },
    {
      to: "/admin/students",
      icon: "◈",
      title: "Students",
      description:
        "Review student records.",
    },
    {
      to: "/admin/recruiters",
      icon: "◍",
      title: "Recruiters",
      description:
        "Manage recruiter accounts.",
    },
    {
      to: "/admin/placement-officers",
      icon: "▥",
      title: "Placement Officers",
      description:
        "Manage placement team access.",
    },
    {
      to: "/admin/companies",
      icon: "▦",
      title: "Companies",
      description:
        "Review participating companies.",
    },
    {
      to: "/admin/jobs",
      icon: "▣",
      title: "Job Drives",
      description:
        "Monitor campus hiring activities.",
    },
    {
      to: "/admin/applications",
      icon: "≡",
      title: "Applications",
      description:
        "Monitor the application lifecycle.",
    },
    {
      to: "/admin/scheduling",
      icon: "◷",
      title: "Scheduling",
      description:
        "Review placement scheduling.",
    },
    {
      to: "/admin/offers",
      icon: "◆",
      title: "Offers",
      description:
        "Review offer workflows.",
    },
    {
      to: "/admin/documents",
      icon: "▤",
      title: "Documents",
      description:
        "Review platform documents.",
    },
    {
      to: "/admin/notifications",
      icon: "◌",
      title: "Notifications",
      description:
        "Monitor platform notifications.",
    },
    {
      to: "/admin/audit",
      icon: "⌁",
      title: "Audit Logs",
      description:
        "Review system activity.",
    },
  ];

  return (
    <DashboardShell
      role="ADMIN"
      title="Admin Dashboard"
    >
      <PageHero
        eyebrow="Platform administration"
        title="System control center"
        description="Manage users, placement operations and platform-level configuration."
      />

      <div className="dashboard-grid">
        {cards.map((card, index) => (
          <DashboardCard
            key={card.to}
            {...card}
            index={index}
          />
        ))}
      </div>
    </DashboardShell>
  );
}

// ============================================================
// APP
// ============================================================

function App() {
  return (
    <BrowserRouter>
      <ThemeBootstrap />
      <style>{CAMPUSLINK_PUBLIC_UI_CSS}</style>
      <style>{CAMPUSLINK_JOURNEY_CSS}</style>
      <Routes>




        {/* PUBLIC HOME, LOGIN, AND REGISTRATION */}
        <Route path="/" element={<CampusLinkHome />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />

        {/* ==================================================
            STUDENT
        ================================================== */}

        <Route
          path="/student"
          element={
            <ProtectedRoute
              allowedRoles={["STUDENT"]}
            >
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        

        <Route
          path="/student/profile"
          element={
            <ProtectedRoute
              allowedRoles={["STUDENT"]}
            >
              <StudentProfile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/resume-ai"
          element={
            <ProtectedRoute
              allowedRoles={["STUDENT"]}
            >
              <StudentResumeAI />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/resume"
          element={
            <ProtectedRoute
              allowedRoles={["STUDENT"]}
            >
              <StudentResume />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/jobs"
          element={
            <ProtectedRoute
              allowedRoles={["STUDENT"]}
            >
              <StudentJobs />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/applications"
          element={
            <ProtectedRoute
              allowedRoles={["STUDENT"]}
            >
              <StudentApplications />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/interviews"
          element={
            <ProtectedRoute
              allowedRoles={["STUDENT"]}
            >
              <StudentInterviews />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/offers"
          element={
            <ProtectedRoute
              allowedRoles={["STUDENT"]}
            >
              <StudentOffers />
            </ProtectedRoute>
          }
        />

        <Route
  path="/student/documents"
  element={
    <ProtectedRoute allowedRoles={["STUDENT"]}>
      <DashboardShell role="STUDENT" title="Documents">
        <StudentDocuments />
      </DashboardShell>
    </ProtectedRoute>
  }
/>

        <Route
          path="/student/notifications"
          element={
            <ProtectedRoute
              allowedRoles={["STUDENT"]}
            >
              <StudentNotifications />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/recommendations"
          element={
            <ProtectedRoute
              allowedRoles={["STUDENT"]}
            >
              <StudentAIRecommendations />
            </ProtectedRoute>
          }
        />

        {/* ==================================================
            RECRUITER
        ================================================== */}

        <Route
          path="/recruiter"
          element={
            <ProtectedRoute
              allowedRoles={["RECRUITER"]}
            >
              <RecruiterDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/recruiter/company"
          element={
            <ProtectedRoute
              allowedRoles={["RECRUITER"]}
            >
              <RecruiterCompany />
            </ProtectedRoute>
          }
        />

        <Route
          path="/recruiter/jobs"
          element={
            <ProtectedRoute
              allowedRoles={["RECRUITER"]}
            >
              <RecruiterJobs />
            </ProtectedRoute>
          }
        />

        <Route
          path="/recruiter/applications"
          element={
            <ProtectedRoute
              allowedRoles={["RECRUITER"]}
            >
              <RecruiterApplications />
            </ProtectedRoute>
          }
        />

        <Route
          path="/recruiter/ai-candidates"
          element={
            <ProtectedRoute
              allowedRoles={["RECRUITER"]}
            >
              <RecruiterAICandidates />
            </ProtectedRoute>
          }
        />

        <Route
          path="/recruiter/interviews"
          element={
            <ProtectedRoute
              allowedRoles={["RECRUITER"]}
            >
              <RecruiterInterviews />
            </ProtectedRoute>
          }
        />

        <Route
          path="/recruiter/offers"
          element={
            <ProtectedRoute
              allowedRoles={["RECRUITER"]}
            >
              <RecruiterOffers />
            </ProtectedRoute>
          }
        />

        <Route
          path="/recruiter/notifications"
          element={
            <ProtectedRoute
              allowedRoles={["RECRUITER"]}
            >
              <RecruiterNotifications />
            </ProtectedRoute>
          }
        />

        <Route
          path="/recruiter/*"
          element={
            <ProtectedRoute
              allowedRoles={["RECRUITER"]}
            >
              <FeaturePage
                role="RECRUITER"
                title="Recruiter Module"
              />
            </ProtectedRoute>
          }
        />

        {/* ==================================================
            PLACEMENT OFFICER
        ================================================== */}

        <Route
          path="/placement"
          element={
            <ProtectedRoute
              allowedRoles={[
                "PLACEMENT_OFFICER",
              ]}
            >
              <PlacementDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/placement/students"
          element={
            <ProtectedRoute
              allowedRoles={[
                "PLACEMENT_OFFICER",
              ]}
            >
              <PlacementStudents />
            </ProtectedRoute>
          }
        />

        <Route
          path="/placement/companies"
          element={
            <ProtectedRoute
              allowedRoles={[
                "PLACEMENT_OFFICER",
              ]}
            >
              <PlacementCompanies />
            </ProtectedRoute>
          }
        />

        <Route
          path="/placement/jobs"
          element={
            <ProtectedRoute
              allowedRoles={[
                "PLACEMENT_OFFICER",
              ]}
            >
              <PlacementJobDrives />
            </ProtectedRoute>
          }
        />

        <Route
          path="/placement/applications"
          element={
            <ProtectedRoute
              allowedRoles={[
                "PLACEMENT_OFFICER",
              ]}
            >
              <PlacementApplications />
            </ProtectedRoute>
          }
        />

        <Route
          path="/placement/selection-rounds"
          element={
            <ProtectedRoute
              allowedRoles={[
                "PLACEMENT_OFFICER",
              ]}
            >
              <PlacementSelectionRounds />
            </ProtectedRoute>
          }
        />

        <Route
          path="/placement/scheduling"
          element={
            <ProtectedRoute
              allowedRoles={[
                "PLACEMENT_OFFICER",
              ]}
            >
              <PlacementScheduling />
            </ProtectedRoute>
          }
        />

        <Route
          path="/placement/offers"
          element={
            <ProtectedRoute
              allowedRoles={[
                "PLACEMENT_OFFICER",
              ]}
            >
              <PlacementOffers />
            </ProtectedRoute>
          }
        />

        <Route
          path="/placement/documents"
          element={
            <ProtectedRoute
              allowedRoles={[
                "PLACEMENT_OFFICER",
              ]}
            >
              <PlacementDocuments />
            </ProtectedRoute>
          }
        />

        <Route
          path="/placement/notifications"
          element={
            <ProtectedRoute
              allowedRoles={[
                "PLACEMENT_OFFICER",
              ]}
            >
              <PlacementNotifications />
            </ProtectedRoute>
          }
        />



<Route
  path="/placement/students/:studentId"
  element={
    <ProtectedRoute
      allowedRoles={[
        "PLACEMENT_OFFICER",
      ]}
    >
      <PlacementStudentDetail />
    </ProtectedRoute>
  }
/>
        <Route
          path="/placement/*"
          element={
            <ProtectedRoute
              allowedRoles={[
                "PLACEMENT_OFFICER",
              ]}
            >
              <FeaturePage
                role="PLACEMENT_OFFICER"
                title="Placement Module"
              />
            </ProtectedRoute>
          }
        />

        {/* ==================================================
            ADMIN
        ================================================== */}

        <Route
          path="/admin"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN"]}
            >
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/*"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN"]}
            >
              <FeaturePage
                role="ADMIN"
                title="Admin Module"
              />
            </ProtectedRoute>
          }
        />

        {/* ==================================================
            FALLBACK
        ================================================== */}

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />

      </Routes>

      <WorkspaceTools />
      {/* Global Quantum AI assistant: one instance outside <Routes> so it works on every page. */}
      <QuantumAI />
</BrowserRouter>
  );
}

export default App;
