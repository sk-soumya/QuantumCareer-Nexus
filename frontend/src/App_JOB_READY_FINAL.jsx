import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  Link,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { useEffect, useRef, useState } from "react";
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
  const [jobFacts, setJobFacts] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [openTool, setOpenTool] = useState(null);

  const SKILLS = [
    "python","java","c","c++","c#","javascript","typescript","react","next.js","node.js",
    "express","sql","mysql","postgresql","mongodb","redis","git","github","docker","kubernetes",
    "aws","azure","gcp","html","css","tailwind","fastapi","django","flask","spring",
    "kotlin","flutter","tensorflow","pytorch","machine learning","deep learning","nlp","computer vision",
    "rest api","graphql","figma","power bi","tableau","excel","pandas","numpy","scikit-learn",
    "solidworks","autocad","fusion 360","ansys fluent","ansys mechanical","matlab",
    "thermodynamics","heat transfer","ic engines","hvac","casting","welding","sheet-metal",
    "cnc","cad","cfd","engineering calculations","renewable energy","electric vehicles","ev"
  ];

  const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, Number(n) || 0));
  const text = (...values) => values.filter(Boolean).join(" ").toLowerCase();
  const tokens = (value) => String(value || "").toLowerCase().split(/[^a-z0-9+#.]+/).filter(Boolean);
  const unique = (arr) => [...new Set(arr)];

  function normalizeList(value) {
    if (Array.isArray(value)) {
      return value
        .map((item) => {
          if (typeof item === "string") return item.trim();
          if (item && typeof item === "object") {
            return item.title || item.name || item.role || item.degree || JSON.stringify(item);
          }
          return String(item || "").trim();
        })
        .filter(Boolean);
    }

    if (typeof value === "string") {
      return value
        .split(/\n{2,}|[|•]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [];
  }

  function listCount(value) {
    return normalizeList(value).length;
  }

  function findSkills(value) {
    const hay = String(value || "").toLowerCase();
    return unique(
      SKILLS.filter((skill) => {
        const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(`(?:^|[^a-z0-9+#.])${escaped}(?:$|[^a-z0-9+#.])`, "i").test(hay);
      })
    );
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

  function countQuality(list) {
    const items = normalizeList(list).filter(Boolean);
    return items.length;
  }

  function scoreCount(count, thresholds) {
    if (!count) return 0;
    if (count >= thresholds[2]) return 100;
    if (count >= thresholds[1]) return 75;
    if (count >= thresholds[0]) return 50;
    return 25;
  }

  function extractJobFacts(value) {
    const raw = String(value || "").trim();
    const lower = raw.toLowerCase();
    if (!raw) {
      return { title: "", skills: [], requiredSkills: [], preferredSkills: [], experienceYears: null, degrees: [], sections: [] };
    }

    const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const titleLine = lines.find((line) => /(?:job\s*title|position|role|designation|hiring|looking\s+for)/i.test(line));
    let title = titleLine || "";
    title = title.replace(/^(?:job\s*title|position|role|designation)\s*[:\-]\s*/i, "").trim();
    if (!title && lines[0] && lines[0].length <= 90) title = lines[0];

    const skills = findSkills(raw);
    const requirementText = lines.filter((line) => /required|required skills|must have|qualifications|requirements|responsibilities/i.test(line)).join(" ");
    const preferredText = lines.filter((line) => /preferred|nice to have|good to have|plus|bonus/i.test(line)).join(" ");
    const requiredSkills = findSkills(requirementText || raw).filter((skill) => {
      const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`(?:^|[^a-z0-9+#.])${escaped}(?:$|[^a-z0-9+#.])`, "i");
      return re.test(requirementText || raw);
    });
    const preferredSkills = findSkills(preferredText || "");

    const expMatch = raw.match(/(?:minimum\s+)?(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:relevant\s+)?(?:experience|work)/i)
      || raw.match(/(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)/i);

    const degreeTerms = [
      "b.tech", "btech", "b.e", "be", "bachelor", "b.sc", "bsc", "bca",
      "m.tech", "mtech", "m.e", "me", "master", "m.sc", "msc", "mca", "mba"
    ];
    const degrees = degreeTerms.filter((term) => lower.includes(term));

    const sectionNames = unique(lines
      .map((line) => line.replace(/[:\-].*$/, "").trim())
      .filter((line) => /^(requirements?|qualifications?|responsibilities|preferred|skills?|education|experience|about the role)$/i.test(line)));

    return {
      title: title.slice(0, 120),
      skills,
      requiredSkills: unique(requiredSkills),
      preferredSkills: unique(preferredSkills),
      experienceYears: expMatch ? Number(expMatch[1]) : null,
      degrees,
      sections: sectionNames,
    };
  }

  function parseJobDescription() {
    if (!jobDescription.trim()) {
      setJobFacts(null);
      setMessage("Paste a job description first.");
      setMessageType("error");
      return;
    }
    const facts = extractJobFacts(jobDescription);
    setJobFacts(facts);
    if (!targetRole.trim() && facts.title) setTargetRole(facts.title);
    setMessage(`Job description parsed: ${facts.skills.length} detected skills, ${facts.requiredSkills.length} required-skill signals.`);
    setMessageType("success");
  }

  function computeScores(p, resumeText, jd) {
    const resume = String(resumeText || "");
    const structuredSkills = normalizeList(p?.skills);
    const resumeSkills = unique([
      ...structuredSkills,
      ...findSkills(text(resume, p?.skills, p?.projects, p?.experience)),
    ]);
    const jobSkills = findSkills(jd);

    // STEP 3: factual readiness rubric. This score uses only evidence that
    // exists in the uploaded resume/profile. It does not ask an LLM to invent data.
    const education = [
      p?.degree || p?.education?.length,
      p?.department,
      p?.graduation_year || p?.graduationYear,
      p?.cgpa,
    ].filter((v) => v !== null && v !== undefined && String(v).trim() !== "").length;
    const educationScore = Math.round((education / 4) * 100);

    const technicalSkillsScore = clamp(Math.round((resumeSkills.length / 8) * 100));

    const projectItems = normalizeList(p?.projects);
    const projectCount = projectItems.length;
    const projectScore = scoreCount(projectCount, [1, 2, 3]);

    const experienceItems = normalizeList(p?.experience);
    const experienceCount = experienceItems.length;
    const expText = experienceItems.join(" ").toLowerCase();
    let experienceScore = scoreCount(experienceCount, [1, 2, 3]);
    if (experienceCount && /(internship|intern|trainee|apprentice)/i.test(expText)) experienceScore = Math.max(experienceScore, 60);

    const certificationCount = countQuality(p?.certifications);
    const certificationScore = scoreCount(certificationCount, [1, 2, 3]);

    const achievementCount = countQuality(p?.achievements);
    const achievementScore = scoreCount(achievementCount, [1, 2, 3]);

    const measurable = (resume.match(/\b\d+(?:\.\d+)?\s*(?:%|x|\+|years?|months?|weeks?|days?)\b/gi) || []).length;
    const links = (resume.match(/https?:\/\/|www\.|linkedin|github|@/gi) || []).length;
    const actionEvidence = (resume.match(/\b(designed|developed|built|created|analyzed|implemented|tested|optimized|modeled|simulated|evaluated|managed|led|coordinated|improved|reduced|increased|deployed)\b/gi) || []).length;
    const evidenceScore = clamp(Math.round(
      (measurable >= 2 ? 40 : measurable === 1 ? 25 : 0) +
      (actionEvidence >= 5 ? 40 : actionEvidence >= 2 ? 25 : actionEvidence === 1 ? 10 : 0) +
      (links >= 2 ? 20 : links === 1 ? 10 : 0)
    ));

    // Keep this secondary metric for transparency, but do not let JD absence
    // reduce the general readiness score.
    const jobMatch = jobSkills.length
      ? clamp(Math.round((resumeSkills.filter((s) => jobSkills.includes(s)).length / jobSkills.length) * 100))
      : null;

    const profileCompleteness = fieldCoverage(p);
    const readiness = clamp(Math.round(
      educationScore * 0.15 +
      technicalSkillsScore * 0.25 +
      projectScore * 0.20 +
      experienceScore * 0.15 +
      certificationScore * 0.10 +
      achievementScore * 0.05 +
      evidenceScore * 0.10
    ));

    return {
      readiness,
      // Resume evidence is intentionally based on measurable/action/contact evidence,
      // not on an AI-generated quality guess.
      resumeScore: evidenceScore,
      skillMatch: jobMatch === null ? technicalSkillsScore : jobMatch,
      technicalSkills: technicalSkillsScore,
      projectScore,
      experienceScore,
      certificationScore,
      achievementScore,
      profileCompleteness: Math.round(profileCompleteness),
      evidence: evidenceScore,
      ats: Math.round(atsScore(resume)),
      section: Math.round(sectionScore(resume)),
      education: educationScore,
      role: targetRole.trim() ? roleAlignment(p, targetRole) : null,
      matchedSkills: jobSkills.length ? resumeSkills.filter((s) => jobSkills.includes(s)) : [],
      missingSkills: jobSkills.filter((s) => !resumeSkills.includes(s)),
      detectedSkills: resumeSkills,
      scoringSource: p?._source === "uploaded_resume" ? "uploaded_resume" : "saved_profile",
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
    setMessage("Fast extraction running…");
    setMessageType("info");
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`${API_BASE_URL}/ai/member4/resume/extract`, {
        method: "POST",
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        body: formData,
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.detail || `Resume extraction failed (${response.status})`);
      setAnalysis(data);

      const latestEducation = Array.isArray(data.education) && data.education.length
        ? data.education[data.education.length - 1]
        : null;

      // IMPORTANT: after a fresh upload, replace the profile state completely.
      // Do NOT merge the database profile here, otherwise old student's facts
      // can leak into the newly uploaded resume analysis.
      const freshProfile = {
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || null,
        github_url: data.github_url || null,
        degree: latestEducation?.degree || data.degree || "",
        department: latestEducation?.branch || data.department || "",
        graduation_year: latestEducation?.graduation_year ?? data.graduation_year ?? null,
        cgpa: latestEducation?.cgpa ?? data.cgpa ?? null,
        skills: Array.isArray(data.skills) ? data.skills : normalizeList(data.skills),
        projects: Array.isArray(data.projects) ? data.projects : normalizeList(data.projects),
        experience: Array.isArray(data.experience) ? data.experience : normalizeList(data.experience),
        certifications: Array.isArray(data.certifications) ? data.certifications : normalizeList(data.certifications),
        achievements: Array.isArray(data.achievements) ? data.achievements : normalizeList(data.achievements),
        linkedin: data.linkedin || null,
        preferred_roles: data.preferred_roles || null,
        preferred_locations: data.preferred_locations || null,
        career_objective: data.career_objective || null,
        resume_text: data.extracted_text || "",
        _source: "uploaded_resume",
      };

      setProfile(freshProfile);
      setMessage("Resume analyzed. The page is now showing facts from this uploaded resume only.");
      setMessageType("success");
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
  const parsedJob = jobFacts || extractJobFacts(jobDescription);
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
      <style>{JOB_READY_CSS}</style>
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
            <p>Upload a resume for factual readiness scoring. Add a target role and job description to calculate job-specific fit.</p>
            <div className="jr-score-pills"><span>Skills {scores.technicalSkills}</span><span>Projects {scores.projectScore}</span><span>Experience {scores.experienceScore}</span><span>Evidence {scores.evidence}</span></div>
          </div>
        </section>

        <section className="jr-card jr-target">
          <div className="jr-kicker">TARGET ROLE</div>
          <input className="jr-input" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="e.g. Backend Developer" />
          <textarea className="jr-input jr-jd" value={jobDescription} onChange={(e) => { setJobDescription(e.target.value); setJobFacts(null); }} placeholder="Paste the job description here for skill matching…" />
          <div className="jr-actions"><button className="jr-btn primary" onClick={parseJobDescription}>Parse job requirements</button></div>
          <div className="jr-hint">STEP 4 uses only the job description you paste. No Ollama call is required.</div>
        </section>
      </div>

      {jobDescription && <section className="jr-card jr-job-facts">
        <div className="jr-section-head"><div><span className="jr-kicker">JOB DESCRIPTION FACTS</span><h3>{parsedJob.title || targetRole || "Target job"}</h3><p>These are deterministic signals found directly in the pasted job description.</p></div><span className="jr-status active">PARSED</span></div>
        <div className="jr-mini-grid">
          <div><small>Detected skills</small><strong>{parsedJob.skills.length}</strong></div>
          <div><small>Required skills</small><strong>{parsedJob.requiredSkills.length}</strong></div>
          <div><small>Experience</small><strong>{parsedJob.experienceYears != null ? `${parsedJob.experienceYears}+ yrs` : "Not stated"}</strong></div>
          <div><small>Degree signal</small><strong>{parsedJob.degrees.length ? parsedJob.degrees.length : "Not stated"}</strong></div>
        </div>
        <div className="jr-data-box">
          <div><span>Required skills detected</span><strong>{parsedJob.requiredSkills.join(" · ") || "No explicit required-skill signals detected by the current dictionary."}</strong></div>
          <div><span>Preferred / bonus skills</span><strong>{parsedJob.preferredSkills.join(" · ") || "None detected."}</strong></div>
          <div><span>All detected skills</span><strong>{parsedJob.skills.join(" · ") || "None detected."}</strong></div>
          <div><span>Education signals</span><strong>{parsedJob.degrees.join(" · ") || "No standard degree term detected."}</strong></div>
        </div>
      </section>}

      <section className="jr-card jr-metrics">
        <div className="jr-section-head"><div><span className="jr-kicker">BREAKDOWN</span><h3>What is driving your score?</h3></div><button className="jr-btn secondary" onClick={() => loadProfile(true)}>↻ Reload saved profile</button></div>
        <div className="jr-breakdown-grid">
          {[
            ["Technical skills", scores.technicalSkills, "25%", "Real skills extracted from the uploaded resume"],
            ["Projects", scores.projectScore, "20%", "Number of project entries actually found"],
            ["Experience", scores.experienceScore, "15%", "Internships/work entries actually found"],
            ["Education", scores.education, "15%", "Degree, branch, graduation year and CGPA evidence"],
            ["Certifications", scores.certificationScore, "10%", "Certification entries actually found"],
            ["Achievements", scores.achievementScore, "5%", "Achievement/award entries actually found"],
            ["Resume evidence", scores.evidence, "10%", "Measured values, action evidence and contact links"],
          ].map(([label, value, weight, help]) => <div className="jr-break-row" key={label}><div><strong>{label}</strong><small>{help}</small></div><div className="jr-bar"><i style={{ width: `${clamp(value)}%` }} /></div><b>{value}</b><span>{weight}</span></div>)}
        </div>
      </section>

      <div className="jr-two-col">
        <section className="jr-card">
          <div className="jr-section-head"><div><span className="jr-kicker">RESUME INTELLIGENCE</span><h3>{file ? file.name : "Upload your resume"}</h3><p>Fast parser first. Deep AI can be added later without blocking the workflow.</p></div><span className="jr-status active">FAST</span></div>
          <label className="jr-upload"><input type="file" accept="application/pdf,.pdf" onChange={(e) => { const f=e.target.files?.[0]; if (f) { setFile(f); setMessage("Resume selected."); setMessageType("info"); } }} /><div className="jr-upload-icon">↑</div><strong>{file ? "PDF selected — ready to analyze" : "Drop PDF here or click to choose"}</strong><span>Text-based PDF recommended for instant extraction</span></label>
          <div className="jr-actions"><button className="jr-btn primary" onClick={analyzeResume} disabled={loading}>{loading ? "Analyzing…" : "Analyze Resume"}</button><button className="jr-btn secondary" onClick={saveProfile} disabled={saving || !profile}>{saving ? "Saving…" : "Save to CampusLink"}</button></div>
          {message && <div className={`jr-message ${messageType}`}>{message}</div>}
          {analysis && <div className="jr-analysis-note"><strong>Analysis mode:</strong> {analysis.analysis_mode || "fast_local"} · {analysis.warning || "Instant local extraction complete."}</div>}
        </section>

        <section className="jr-card">
          <div className="jr-section-head">
            <div><span className="jr-kicker">PROFILE DATA</span><h3>{profile?._source === "uploaded_resume" ? "Fresh facts from uploaded resume" : "What CampusLink currently knows"}</h3></div>
            <span className="jr-status">{profile?._source === "uploaded_resume" ? "RESUME" : `${scores.profileCompleteness}%`}</span>
          </div>
          <div className="jr-mini-grid">
            <div><small>Skills</small><strong>{listCount(profile?.skills)}</strong></div>
            <div><small>Projects</small><strong>{listCount(profile?.projects)}</strong></div>
            <div><small>Experience</small><strong>{listCount(profile?.experience)}</strong></div>
            <div><small>CGPA</small><strong>{profile?.cgpa ?? "—"}</strong></div>
          </div>
          <div className="jr-data-box">
            <div><span>Detected skills</span><strong>{normalizeList(profile?.skills).join(" · ") || "Upload a resume or add skills in your profile."}</strong></div>
            <div><span>Certifications</span><strong>{normalizeList(profile?.certifications).join(" · ") || "None detected from this resume."}</strong></div>
            <div><span>Achievements</span><strong>{normalizeList(profile?.achievements).join(" · ") || "None detected from this resume."}</strong></div>
            <div><span>Missing target skills</span><strong>{scores.missingSkills.length && jobDescription ? scores.missingSkills.join(" · ") : "Add a job description to calculate."}</strong></div>
          </div>
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
        <code>Readiness = 0.15×Education + 0.25×TechnicalSkills + 0.20×Projects + 0.15×Experience + 0.10×Certifications + 0.05×Achievements + 0.10×ResumeEvidence</code>
        <small>Each component is normalized to 0–100, then rounded. The general score uses extracted resume/profile facts only. Job-description parsing is shown separately and does not alter general readiness.</small>
      </section>

      <div className="jr-footer-actions"><button className="jr-btn secondary" onClick={() => navigate("/student/profile")}>Open full profile →</button><button className="jr-btn secondary" onClick={() => navigate("/student/recommendations")}>Open AI recommendations →</button><button className="jr-btn primary" onClick={() => navigate("/student/resume")}>Build final resume →</button></div>
    </DashboardShell>
  );
}

const JOB_READY_CSS = `
.jr-top-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:16px;margin-bottom:16px}.jr-card{background:#fff;border:1px solid #e5eaf1;border-radius:18px;padding:20px;box-shadow:0 10px 28px rgba(15,23,42,.045);margin-bottom:16px}.jr-hero-score{display:flex;align-items:center;gap:24px;min-height:240px}.jr-score-ring{--score:180deg;width:180px;height:180px;border-radius:50%;background:conic-gradient(#2563eb var(--score),#e2e8f0 0);display:grid;place-items:center;flex:none}.jr-score-ring>div{width:138px;height:138px;border-radius:50%;background:#fff;display:grid;place-items:center;text-align:center}.jr-score-ring strong{font-size:46px;line-height:.9;display:block}.jr-score-ring span{font-size:11px;color:#64748b}.jr-score-ring small{display:block;font-size:10px;color:#2563eb;font-weight:900;margin-top:5px}.jr-kicker{font-size:9px;letter-spacing:.14em;color:#2563eb;font-weight:900;text-transform:uppercase}.jr-score-copy h3{font-size:22px;margin:6px 0}.jr-score-copy p{font-size:11px;line-height:1.6;color:#64748b;margin:0 0 14px}.jr-score-pills{display:flex;gap:7px;flex-wrap:wrap}.jr-score-pills span,.jr-status{font-size:9px;border:1px solid #dbeafe;background:#eff6ff;color:#1d4ed8;border-radius:999px;padding:5px 8px;font-weight:800}.jr-target h3{margin:3px 0}.jr-input{width:100%;box-sizing:border-box;border:1px solid #dbe3ee;border-radius:10px;padding:11px 12px;margin-top:8px;font:inherit;font-size:11px;outline:none;background:#fbfdff}.jr-input:focus{border-color:#60a5fa;box-shadow:0 0 0 3px #dbeafe}.jr-jd{min-height:116px;resize:vertical}.jr-hint{font-size:9px;color:#94a3b8;margin-top:8px}.jr-section-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:15px}.jr-section-head h3{margin:4px 0;font-size:17px}.jr-section-head p{margin:3px 0 0;font-size:10px;color:#64748b}.jr-btn{border-radius:10px;padding:10px 13px;font-size:10px;font-weight:900;cursor:pointer;border:1px solid #dbe3ee}.jr-btn.primary{background:#2563eb;border-color:#2563eb;color:#fff}.jr-btn.secondary{background:#fff;color:#334155}.jr-btn:disabled{opacity:.55;cursor:not-allowed}.jr-breakdown-grid{display:grid;gap:9px}.jr-break-row{display:grid;grid-template-columns:210px 1fr 42px 45px;gap:10px;align-items:center}.jr-break-row strong{display:block;font-size:10px}.jr-break-row small{display:block;color:#94a3b8;font-size:8px;margin-top:2px}.jr-break-row b{font-size:11px;text-align:right}.jr-break-row>span{font-size:8px;color:#64748b;text-align:right}.jr-bar{height:7px;background:#eef2f7;border-radius:999px;overflow:hidden}.jr-bar i{height:100%;display:block;background:linear-gradient(90deg,#2563eb,#7c3aed);border-radius:999px}.jr-two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px}.jr-upload{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:7px;min-height:155px;border:1.5px dashed #b8c5d8;background:linear-gradient(180deg,#fafdff,#f4f8fc);border-radius:14px;cursor:pointer;text-align:center}.jr-upload:hover{border-color:#60a5fa;background:#f8fbff}.jr-upload input{display:none}.jr-upload-icon{width:42px;height:42px;border-radius:12px;background:#eaf2ff;color:#2563eb;display:grid;place-items:center;font-size:23px;font-weight:800}.jr-upload strong{font-size:12px}.jr-upload span{font-size:9px;color:#64748b}.jr-actions,.jr-footer-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:13px}.jr-message{margin-top:10px;font-size:10px;padding:10px 11px;border-radius:9px}.jr-message.success{background:#ecfdf5;color:#047857;border:1px solid #a7f3d0}.jr-message.error{background:#fef2f2;color:#b91c1c;border:1px solid #fecaca}.jr-message.info{background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe}.jr-analysis-note{margin-top:10px;font-size:9px;color:#475569;background:#f8fafc;border:1px solid #e2e8f0;padding:9px;border-radius:8px}.jr-status.active{background:#ecfdf5;color:#047857;border-color:#a7f3d0}.jr-mini-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.jr-mini-grid>div{background:#f8fafc;border:1px solid #e7edf4;border-radius:10px;padding:11px}.jr-mini-grid small{font-size:8px;color:#64748b;display:block}.jr-mini-grid strong{font-size:17px;display:block;margin-top:3px}.jr-data-box{display:grid;gap:8px;margin-top:10px}.jr-data-box>div{background:#fbfdff;border:1px solid #e7edf4;padding:10px;border-radius:9px}.jr-data-box span{display:block;font-size:8px;color:#64748b;text-transform:uppercase;letter-spacing:.08em}.jr-data-box strong{display:block;font-size:9px;line-height:1.5;margin-top:3px}.jr-tool-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.jr-tool{display:flex;align-items:center;gap:10px;text-align:left;border:1px solid #e5eaf1;background:#fbfdff;border-radius:12px;padding:12px;cursor:pointer;transition:.15s}.jr-tool:hover{transform:translateY(-1px);box-shadow:0 8px 20px rgba(15,23,42,.06);border-color:#cbd5e1}.jr-tool-icon{width:32px;height:32px;border-radius:9px;background:#eff6ff;color:#2563eb;display:grid;place-items:center;font-weight:900;flex:none}.jr-tool>div:nth-child(2){flex:1}.jr-tool strong{font-size:10px;display:block}.jr-tool span{font-size:8px;line-height:1.4;color:#64748b;display:block;margin-top:3px}.jr-tool em{font-style:normal;font-size:7px;color:#047857;background:#ecfdf5;border:1px solid #bbf7d0;border-radius:999px;padding:4px 5px;flex:none}.jr-tool-detail{margin-top:12px;background:#0f172a;color:#e2e8f0;border-radius:12px;padding:14px}.jr-tool-detail h4{margin:0 0 5px;font-size:12px}.jr-tool-detail p{margin:0;font-size:10px;line-height:1.6;color:#cbd5e1}.jr-formula{background:linear-gradient(135deg,#0f172a,#172554);color:#fff}.jr-formula h3{margin:5px 0;font-size:17px}.jr-formula p{color:#94a3b8;font-size:10px}.jr-formula code{display:block;background:#020617;border:1px solid #334155;border-radius:10px;padding:13px;margin-top:12px;color:#bfdbfe;font-size:10px;white-space:normal;line-height:1.6}.jr-formula small{display:block;color:#94a3b8;font-size:8px;line-height:1.6;margin-top:8px}.jr-job-facts{background:linear-gradient(180deg,#ffffff,#f8fbff)}.jr-footer-actions{justify-content:flex-end;margin-bottom:20px}
@media(max-width:1050px){.jr-top-grid,.jr-two-col{grid-template-columns:1fr}.jr-hero-score{min-height:auto}.jr-tool-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:700px){.jr-hero-score{flex-direction:column;align-items:flex-start}.jr-break-row{grid-template-columns:1fr 1fr 42px 45px}.jr-break-row small{display:none}.jr-mini-grid{grid-template-columns:repeat(2,1fr)}.jr-tool-grid{grid-template-columns:1fr}}
`;
// ============================================================
// PUBLIC EXPERIENCE — HOME / LOGIN / REGISTER / THEME
// ============================================================

function getInitialTheme() {
  const saved = localStorage.getItem("campuslink_theme");
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia?.("(prefers-color-scheme: light)")?.matches ? "light" : "dark";
}

function ThemeToggle({ compact = false }) {
  const [theme, setTheme] = useState(() => getInitialTheme());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("campuslink_theme", theme);
  }, [theme]);

  return (
    <button
      type="button"
      className={`cl-theme-toggle ${compact ? "compact" : ""}`}
      onClick={() => setTheme((value) => (value === "dark" ? "light" : "dark"))}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      <span className="cl-theme-icon">{theme === "dark" ? "☀" : "☾"}</span>
      <span>{compact ? "" : theme === "dark" ? "Dark" : "Light"}</span>
    </button>
  );
}

function ThemeController() {
  const location = useLocation();
  const publicRoute = ["/", "/login", "/register"].includes(location.pathname);
  if (publicRoute) return null;
  return (
    <div className="cl-global-theme-toggle">
      <ThemeToggle />
    </div>
  );
}

const CAMPUSLINK_PUBLIC_CSS = `
:root{
  --cl-bg:#06111d;
  --cl-bg-2:#0a1727;
  --cl-panel:rgba(11,27,46,.72);
  --cl-panel-solid:#0d1d31;
  --cl-text:#f5f9ff;
  --cl-muted:#9bb0c8;
  --cl-soft:#7087a3;
  --cl-line:rgba(148,163,184,.16);
  --cl-accent:#5ee7ff;
  --cl-accent-2:#7587ff;
  --cl-accent-3:#b56cff;
  --cl-success:#68e3aa;
  --cl-shadow:0 30px 90px rgba(0,0,0,.26);
}
html[data-theme="light"]{
  --cl-bg:#eef5fb;
  --cl-bg-2:#f8fbff;
  --cl-panel:rgba(255,255,255,.76);
  --cl-panel-solid:#ffffff;
  --cl-text:#0b1730;
  --cl-muted:#5f728b;
  --cl-soft:#7a8da5;
  --cl-line:rgba(45,67,94,.14);
  --cl-accent:#0b9ed0;
  --cl-accent-2:#4d60e8;
  --cl-accent-3:#8b4de8;
  --cl-success:#0b9f67;
  --cl-shadow:0 24px 70px rgba(40,67,96,.14);
}
html,body,#root{min-height:100%;}
body{margin:0;background:var(--cl-bg);color:var(--cl-text);transition:background .35s ease,color .35s ease;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}
button,input,textarea,select{font-family:inherit}
.cl-theme-toggle{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--cl-line);background:var(--cl-panel);color:var(--cl-text);padding:8px 11px;border-radius:999px;cursor:pointer;font-size:9px;font-weight:900;backdrop-filter:blur(16px);box-shadow:0 10px 30px rgba(0,0,0,.10);transition:transform .18s ease,background .25s ease,border-color .25s ease}
.cl-theme-toggle:hover{transform:translateY(-2px);border-color:rgba(94,231,255,.35)}
.cl-theme-toggle.compact{width:34px;height:34px;padding:0;justify-content:center}
.cl-theme-icon{font-size:13px;line-height:1}
.cl-global-theme-toggle{position:fixed;right:18px;top:78px;z-index:9998}

/* ========================= HOME ========================= */
.cl-home{position:relative;min-height:100vh;overflow-x:hidden;background:var(--cl-bg);color:var(--cl-text);isolation:isolate;transition:background .35s ease,color .35s ease}
.cl-home-bg{position:fixed;inset:0;z-index:-5;overflow:hidden;background:radial-gradient(circle at 50% 9%,rgba(39,116,175,.26),transparent 30%),radial-gradient(circle at 88% 25%,rgba(122,71,232,.20),transparent 26%),linear-gradient(160deg,var(--cl-bg),var(--cl-bg-2));}
html[data-theme="light"] .cl-home-bg{background:radial-gradient(circle at 50% 0%,rgba(44,182,230,.18),transparent 31%),radial-gradient(circle at 88% 20%,rgba(132,87,236,.16),transparent 26%),linear-gradient(160deg,#eaf3fb,#f8fbff)}
.cl-home-canvas{position:absolute;inset:0;width:100%;height:100%;opacity:.92}
.cl-home-grid{position:absolute;inset:-20%;background-image:linear-gradient(rgba(92,178,255,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(92,178,255,.07) 1px,transparent 1px);background-size:58px 58px;transform:perspective(900px) rotateX(64deg) translateY(18%);transform-origin:center top;mask-image:linear-gradient(to bottom,rgba(0,0,0,.72),transparent 82%);opacity:.6;animation:cl-grid-drift 18s linear infinite}
.cl-home-orb{position:absolute;border-radius:50%;filter:blur(50px);pointer-events:none;mix-blend-mode:screen}.cl-home-orb.one{width:460px;height:460px;left:-170px;top:-130px;background:rgba(0,174,255,.22);animation:cl-float-a 11s ease-in-out infinite}.cl-home-orb.two{width:420px;height:420px;right:-140px;top:22%;background:rgba(164,88,255,.22);animation:cl-float-b 13s ease-in-out infinite}.cl-home-orb.three{width:360px;height:360px;left:30%;bottom:-210px;background:rgba(33,227,191,.14);animation:cl-float-c 15s ease-in-out infinite}
.cl-cursor-glow{position:fixed;left:0;top:0;width:340px;height:340px;border-radius:50%;transform:translate(-50%,-50%);background:radial-gradient(circle,rgba(95,220,255,.17),rgba(67,86,255,.08) 35%,transparent 68%);filter:blur(4px);pointer-events:none;z-index:20;mix-blend-mode:screen}.cl-cursor-dot{position:fixed;left:0;top:0;width:7px;height:7px;border-radius:50%;transform:translate(-50%,-50%);background:var(--cl-accent);box-shadow:0 0 0 6px rgba(94,231,255,.08),0 0 28px rgba(94,231,255,.75);pointer-events:none;z-index:21}
.cl-home-shell{position:relative;z-index:2;width:min(1240px,calc(100% - 36px));margin:0 auto}.cl-home-nav{position:sticky;top:12px;z-index:80;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 14px;margin-top:12px;border:1px solid var(--cl-line);border-radius:18px;background:color-mix(in srgb,var(--cl-panel) 86%,transparent);backdrop-filter:blur(20px);box-shadow:var(--cl-shadow)}
.cl-home-brand{display:flex;align-items:center;gap:11px;min-width:max-content}.cl-home-brand-mark{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;font-weight:950;font-size:19px;background:linear-gradient(135deg,#00b4ff,#6c5cff 70%,#bd58ff);color:white;box-shadow:0 14px 32px rgba(52,104,255,.28)}.cl-home-brand strong{display:block;font-size:14px;letter-spacing:.12em}.cl-home-brand span{display:block;margin-top:2px;color:var(--cl-soft);font-size:8px}
.cl-home-nav-links{display:flex;align-items:center;gap:4px;margin-left:auto}.cl-home-nav-links a{color:var(--cl-muted);text-decoration:none;font-size:9px;font-weight:850;padding:9px 10px;border-radius:10px;transition:.2s ease}.cl-home-nav-links a:hover,.cl-home-nav-links a.active{color:var(--cl-text);background:rgba(75,130,255,.10)}.cl-home-nav-actions{display:flex;align-items:center;gap:8px}.cl-home-btn{display:inline-flex;align-items:center;justify-content:center;min-height:38px;padding:0 14px;border-radius:11px;border:1px solid var(--cl-line);color:var(--cl-text);text-decoration:none;font-size:9px;font-weight:900;transition:.2s ease}.cl-home-btn:hover{transform:translateY(-2px)}.cl-home-btn.ghost{background:rgba(255,255,255,.035)}.cl-home-btn.primary{color:white;background:linear-gradient(135deg,#058fe8,#5f64ef 58%,#a34cea);border-color:transparent;box-shadow:0 14px 30px rgba(42,93,235,.24)}
.cl-scroll-progress{position:fixed;top:0;left:0;height:3px;z-index:100;width:0;background:linear-gradient(90deg,#18c7ff,#6b65ff,#bf61ff);box-shadow:0 0 18px rgba(81,176,255,.65)}
.cl-home-section{min-height:100vh;display:grid;align-items:center;padding:96px 0;scroll-margin-top:84px}.cl-home-hero{grid-template-columns:1.05fr .95fr;gap:42px;padding-top:42px}.cl-home-copy{position:relative;z-index:2}.cl-home-eyebrow{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(104,226,255,.18);background:rgba(24,199,255,.075);color:#80e9ff;border-radius:999px;padding:8px 11px;font-size:8px;font-weight:900;letter-spacing:.13em;text-transform:uppercase}.cl-pulse-dot{width:6px;height:6px;border-radius:50%;background:var(--cl-accent);box-shadow:0 0 0 0 rgba(94,231,255,.6);animation:cl-pulse 1.8s infinite}
.cl-home-copy h1{margin:17px 0 15px;max-width:710px;font-size:clamp(46px,6.1vw,82px);line-height:.94;letter-spacing:-.055em}.cl-home-copy h1 span,.cl-gradient{background:linear-gradient(90deg,#41d8ff,#7186ff,#c56cff);-webkit-background-clip:text;background-clip:text;color:transparent}.cl-home-copy p{max-width:670px;margin:0;color:var(--cl-muted);font-size:14px;line-height:1.85}.cl-home-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:26px}.cl-home-action{display:inline-flex;align-items:center;justify-content:center;padding:14px 17px;border-radius:12px;text-decoration:none;font-size:10px;font-weight:950;transition:.2s ease}.cl-home-action:hover{transform:translateY(-3px)}.cl-home-action.primary{color:#fff;background:linear-gradient(135deg,#058fe8,#6464ef 60%,#ad4cf5);box-shadow:0 18px 38px rgba(35,87,240,.26)}.cl-home-action.secondary{color:var(--cl-text);border:1px solid var(--cl-line);background:rgba(255,255,255,.035)}.cl-home-note{margin-top:14px;color:var(--cl-soft);font-size:9px}.cl-hero-badges{display:flex;gap:7px;flex-wrap:wrap;margin-top:20px}.cl-hero-badge{padding:7px 9px;border-radius:999px;border:1px solid var(--cl-line);background:rgba(255,255,255,.03);color:var(--cl-muted);font-size:8px;font-weight:800}

/* Hero visual */
.cl-hero-visual{position:relative;min-height:650px;display:grid;place-items:center}.cl-hero-globe{position:absolute;width:min(610px,95%);aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 38% 38%,rgba(29,198,255,.12),transparent 35%),radial-gradient(circle at 62% 32%,rgba(154,79,255,.13),transparent 34%),radial-gradient(circle at 50% 56%,rgba(53,88,220,.10),transparent 62%);border:1px solid rgba(103,189,255,.14);box-shadow:inset 0 0 110px rgba(55,147,255,.06),0 0 100px rgba(57,137,255,.08);animation:cl-orbit 22s linear infinite}.cl-hero-globe::before,.cl-hero-globe::after{content:"";position:absolute;inset:7%;border:1px solid rgba(120,226,255,.10);border-radius:50%;transform:rotate(19deg) skewX(-7deg)}.cl-hero-globe::after{inset:19%;transform:rotate(-33deg) skewY(5deg);border-color:rgba(191,126,255,.09)}
.cl-path-ring{position:absolute;width:74%;aspect-ratio:1;border:1px dashed rgba(110,219,255,.24);border-radius:50%;animation:cl-spin-reverse 22s linear infinite}.cl-path-ring::after{content:"";position:absolute;left:11%;top:9%;width:13px;height:13px;border-radius:50%;background:#58e5ff;box-shadow:0 0 30px rgba(88,229,255,.8),0 0 80px rgba(88,229,255,.38)}
.cl-home-panel{position:relative;width:min(445px,92%);border:1px solid var(--cl-line);border-radius:23px;background:color-mix(in srgb,var(--cl-panel-solid) 88%,transparent);box-shadow:0 40px 100px rgba(0,0,0,.26),inset 0 1px rgba(255,255,255,.08);backdrop-filter:blur(20px);overflow:hidden;transform:translateY(var(--hero-shift,0px));transition:transform .15s ease-out}.cl-panel-head{display:flex;align-items:center;justify-content:space-between;padding:13px 15px;border-bottom:1px solid var(--cl-line)}.cl-panel-head small{color:var(--cl-soft);font-size:8px}.cl-window-dots{display:flex;gap:5px}.cl-window-dots i{width:7px;height:7px;border-radius:50%;background:#4e6078}.cl-home-panel-body{padding:18px}.cl-score-row{display:grid;grid-template-columns:92px 1fr;gap:15px;align-items:center}.cl-score-circle{width:86px;height:86px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(#3ed8ff 0 84%,rgba(62,216,255,.10) 84% 100%);position:relative}.cl-score-circle::after{content:"";position:absolute;inset:8px;background:var(--cl-panel-solid);border-radius:50%}.cl-score-circle strong{position:relative;z-index:1;font-size:25px}.cl-score-copy small{color:var(--cl-soft);font-size:8px}.cl-score-copy strong{display:block;margin-top:4px;font-size:15px}.cl-score-copy span{display:block;margin-top:4px;color:var(--cl-muted);font-size:9px;line-height:1.45}.cl-metric-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:17px}.cl-metric{padding:11px;border:1px solid var(--cl-line);background:rgba(255,255,255,.025);border-radius:10px}.cl-metric b{display:block;font-size:13px}.cl-metric span{display:block;margin-top:2px;color:var(--cl-soft);font-size:7px}.cl-signal-list{display:grid;gap:8px;margin-top:14px}.cl-signal{display:grid;grid-template-columns:92px 1fr 34px;gap:7px;align-items:center}.cl-signal span{font-size:7px;color:var(--cl-muted)}.cl-signal i{display:block;height:6px;border-radius:999px;background:rgba(120,141,168,.16);overflow:hidden}.cl-signal i::after{content:"";display:block;height:100%;width:var(--w);border-radius:999px;background:linear-gradient(90deg,#06b6d4,#6366f1,#a855f7);animation:cl-bar-rise 1.4s ease both}.cl-signal b{font-size:7px;text-align:right;color:#9de9ff}

/* sections */
.cl-section-head{max-width:820px;margin-bottom:36px}.cl-section-kicker{display:inline-block;color:var(--cl-accent);font-size:8px;font-weight:900;letter-spacing:.16em;text-transform:uppercase}.cl-section-head h2{font-size:clamp(34px,4.4vw,58px);line-height:1.02;letter-spacing:-.045em;margin:10px 0 13px}.cl-section-head p{margin:0;color:var(--cl-muted);font-size:12px;line-height:1.85}.cl-stat-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.cl-stat-card{padding:19px;border:1px solid var(--cl-line);background:rgba(255,255,255,.025);border-radius:15px;box-shadow:inset 0 1px rgba(255,255,255,.03);transition:.2s ease}.cl-stat-card:hover{transform:translateY(-5px);border-color:rgba(90,182,255,.3);background:rgba(37,99,235,.05)}.cl-stat-card strong{display:block;font-size:27px}.cl-stat-card span{display:block;margin-top:5px;color:var(--cl-muted);font-size:8px;line-height:1.55}
.cl-feature-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.cl-feature-card{position:relative;overflow:hidden;min-height:188px;padding:21px;border:1px solid var(--cl-line);border-radius:17px;background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.018));transition:.24s ease}.cl-feature-card::before{content:"";position:absolute;inset:auto -25% -65% -25%;height:150px;background:radial-gradient(circle,rgba(0,180,255,.17),transparent 68%);filter:blur(18px)}.cl-feature-card:hover{transform:translateY(-7px);border-color:rgba(90,182,255,.30);box-shadow:0 22px 55px rgba(0,0,0,.20)}.cl-feature-icon{width:41px;height:41px;display:grid;place-items:center;border-radius:12px;background:rgba(50,162,255,.11);border:1px solid rgba(91,203,255,.17);color:var(--cl-accent);font-size:18px}.cl-feature-card h3{margin:15px 0 7px;font-size:15px}.cl-feature-card p{margin:0;color:var(--cl-muted);font-size:9px;line-height:1.72}
.cl-glass-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.cl-glass{position:relative;padding:25px;border:1px solid var(--cl-line);border-radius:20px;background:var(--cl-panel);backdrop-filter:blur(18px);box-shadow:var(--cl-shadow)}.cl-glass h3{margin:9px 0 8px;font-size:27px;line-height:1.08;letter-spacing:-.035em}.cl-glass p{margin:0;color:var(--cl-muted);font-size:10px;line-height:1.75}.cl-check-list{display:grid;gap:9px;margin-top:19px}.cl-check{display:flex;gap:9px;align-items:flex-start}.cl-check-mark{width:24px;height:24px;flex:none;border-radius:8px;display:grid;place-items:center;background:rgba(62,216,255,.10);color:var(--cl-accent);font-size:10px;font-weight:900;border:1px solid rgba(62,216,255,.18)}.cl-check strong{display:block;font-size:9px}.cl-check span{display:block;color:var(--cl-soft);font-size:8px;line-height:1.5;margin-top:2px}

/* student roadmap */
.cl-roadmap-wrap{position:relative;padding:28px;border:1px solid var(--cl-line);border-radius:24px;background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.012));box-shadow:var(--cl-shadow);overflow:hidden}.cl-roadmap-wrap::before{content:"";position:absolute;inset:-20% auto auto -15%;width:60%;height:65%;background:radial-gradient(circle,rgba(14,194,255,.13),transparent 66%);filter:blur(26px)}.cl-roadmap-svg{width:100%;height:auto;display:block}.cl-road-path-base{fill:none;stroke:rgba(137,158,188,.18);stroke-width:10;stroke-linecap:round}.cl-road-path{fill:none;stroke:url(#roadGradient);stroke-width:7;stroke-linecap:round;stroke-dasharray:18 12;animation:cl-road-flow 4s linear infinite}.cl-road-node{fill:var(--cl-panel-solid);stroke:#67dff8;stroke-width:3;filter:drop-shadow(0 0 12px rgba(103,223,248,.45));animation:cl-node-pulse 2.6s ease-in-out infinite}.cl-road-node.n2{stroke:#7c84ff;animation-delay:.2s}.cl-road-node.n3{stroke:#a465ff;animation-delay:.4s}.cl-road-node.n4{stroke:#54d9a5;animation-delay:.6s}.cl-road-node.n5{stroke:#5cb6ff;animation-delay:.8s}.cl-road-node.n6{stroke:#ffb86b;animation-delay:1s}.cl-road-node.n7{stroke:#f778b7;animation-delay:1.2s}.cl-road-node.n8{stroke:#b9ff78;animation-delay:1.4s}.cl-road-label{fill:var(--cl-text);font-size:16px;font-weight:800}.cl-road-sub{fill:var(--cl-soft);font-size:11px}.cl-road-caption{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:14px}.cl-road-caption div{padding:12px;border:1px solid var(--cl-line);border-radius:12px;background:rgba(255,255,255,.025)}.cl-road-caption strong{display:block;font-size:9px}.cl-road-caption span{display:block;color:var(--cl-soft);font-size:8px;line-height:1.5;margin-top:3px}

/* live intelligence */
.cl-live-grid{display:grid;grid-template-columns:.9fr 1.1fr;gap:18px;align-items:stretch}.cl-live-panel{padding:22px;border:1px solid var(--cl-line);border-radius:20px;background:var(--cl-panel);box-shadow:var(--cl-shadow);backdrop-filter:blur(18px)}.cl-live-panel h3{margin:7px 0 8px;font-size:24px}.cl-live-panel p{margin:0;color:var(--cl-muted);font-size:10px;line-height:1.75}.cl-live-stack{display:grid;gap:10px;margin-top:17px}.cl-live-item{display:grid;grid-template-columns:32px 1fr auto;align-items:center;gap:9px;padding:11px;border:1px solid var(--cl-line);border-radius:12px;background:rgba(255,255,255,.024)}.cl-live-icon{width:32px;height:32px;border-radius:10px;display:grid;place-items:center;background:rgba(87,188,255,.10);color:var(--cl-accent);font-weight:900}.cl-live-item strong{display:block;font-size:9px}.cl-live-item span{display:block;color:var(--cl-soft);font-size:7px;margin-top:2px}.cl-live-chip{font-size:7px;padding:5px 7px;border-radius:999px;background:rgba(104,227,170,.09);border:1px solid rgba(104,227,170,.16);color:#78e5b7}.cl-visual-board{position:relative;overflow:hidden;min-height:430px;padding:16px;border:1px solid var(--cl-line);border-radius:22px;background:linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.015));box-shadow:var(--cl-shadow)}.cl-board-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(117,155,205,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(117,155,205,.06) 1px,transparent 1px);background-size:28px 28px;mask-image:linear-gradient(to bottom,transparent,black 18%,black 82%,transparent)}.cl-board-center{position:absolute;left:50%;top:50%;width:110px;height:110px;transform:translate(-50%,-50%);border-radius:50%;display:grid;place-items:center;text-align:center;background:radial-gradient(circle,rgba(62,216,255,.22),rgba(75,68,255,.10) 58%,transparent 70%);border:1px solid rgba(113,203,255,.28);box-shadow:0 0 80px rgba(50,150,255,.18)}.cl-board-center strong{font-size:14px}.cl-board-center span{display:block;font-size:6px;color:var(--cl-soft);margin-top:3px}.cl-board-node{position:absolute;padding:10px 12px;border-radius:12px;border:1px solid var(--cl-line);background:color-mix(in srgb,var(--cl-panel-solid) 88%,transparent);backdrop-filter:blur(10px);box-shadow:0 14px 30px rgba(0,0,0,.12);animation:cl-node-float 4s ease-in-out infinite}.cl-board-node b{display:block;font-size:8px}.cl-board-node small{display:block;color:var(--cl-soft);font-size:6px;margin-top:2px}.cl-board-line{position:absolute;height:1px;background:linear-gradient(90deg,transparent,rgba(94,231,255,.33),transparent);transform-origin:left center;animation:cl-line-pulse 2.6s ease-in-out infinite}
.cl-board-node.a{left:8%;top:12%}.cl-board-node.b{right:9%;top:13%;animation-delay:.5s}.cl-board-node.c{left:11%;bottom:12%;animation-delay:1s}.cl-board-node.d{right:10%;bottom:10%;animation-delay:1.4s}
.cl-board-line.l1{left:23%;top:25%;width:29%;transform:rotate(20deg)}.cl-board-line.l2{left:52%;top:27%;width:29%;transform:rotate(-18deg)}.cl-board-line.l3{left:22%;top:69%;width:31%;transform:rotate(-18deg)}.cl-board-line.l4{left:52%;top:69%;width:29%;transform:rotate(19deg)}

/* workflow */
.cl-workflow{display:grid;grid-template-columns:repeat(8,1fr);gap:8px;align-items:stretch}.cl-work-item{position:relative;padding:16px 12px;min-height:152px;border:1px solid var(--cl-line);border-radius:15px;background:rgba(255,255,255,.025);transition:.2s ease}.cl-work-item:hover{transform:translateY(-5px);border-color:rgba(93,186,255,.3)}.cl-work-item::after{content:"→";position:absolute;right:-9px;top:50%;transform:translateY(-50%);color:var(--cl-accent);font-size:12px;z-index:2}.cl-work-item:last-child::after{display:none}.cl-work-item b{display:block;width:26px;height:26px;border-radius:9px;display:grid;place-items:center;background:linear-gradient(135deg,#0ea5e9,#6366f1,#a855f7);color:white;font-size:8px}.cl-work-item h4{margin:11px 0 5px;font-size:10px}.cl-work-item p{margin:0;color:var(--cl-soft);font-size:7px;line-height:1.5}
.cl-cta{position:relative;overflow:hidden;padding:54px;border-radius:24px;border:1px solid rgba(90,184,255,.20);background:radial-gradient(circle at 16% 8%,rgba(0,185,255,.20),transparent 32%),radial-gradient(circle at 86% 72%,rgba(162,86,255,.18),transparent 34%),linear-gradient(135deg,rgba(15,41,67,.82),rgba(8,19,38,.92));box-shadow:var(--cl-shadow)}html[data-theme="light"] .cl-cta{background:radial-gradient(circle at 16% 8%,rgba(43,200,250,.16),transparent 32%),radial-gradient(circle at 86% 72%,rgba(139,92,246,.14),transparent 34%),linear-gradient(135deg,#ffffff,#edf5ff)}.cl-cta::after{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(117,155,205,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(117,155,205,.045) 1px,transparent 1px);background-size:32px 32px;mask-image:linear-gradient(to bottom,transparent,black,transparent)}.cl-cta-inner{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:22px}.cl-cta h2{margin:7px 0 9px;font-size:clamp(30px,4vw,50px);letter-spacing:-.04em}.cl-cta p{margin:0;max-width:610px;color:var(--cl-muted);font-size:10px;line-height:1.75}.cl-cta-actions{display:flex;gap:8px;flex-wrap:wrap}.cl-home-footer{color:var(--cl-soft);font-size:8px;padding:40px 0 28px;text-align:center}
.cl-reveal{opacity:0;transform:translateY(26px) scale(.985);transition:opacity .8s ease,transform .8s cubic-bezier(.2,.75,.2,1)}.cl-reveal.show{opacity:1;transform:none}
@keyframes cl-grid-drift{from{transform:perspective(900px) rotateX(64deg) translateY(18%)}to{transform:perspective(900px) rotateX(64deg) translateY(20%)}}@keyframes cl-orbit{to{transform:rotate(360deg)}}@keyframes cl-spin-reverse{to{transform:rotate(-360deg)}}@keyframes cl-road-flow{to{stroke-dashoffset:-60}}@keyframes cl-node-pulse{0%,100%{r:14}50%{r:17}}@keyframes cl-float-a{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(35px,26px,0)}}@keyframes cl-float-b{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(-25px,38px,0)}}@keyframes cl-float-c{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(18px,-30px,0)}}@keyframes cl-pulse{0%{box-shadow:0 0 0 0 rgba(94,231,255,.55)}70%{box-shadow:0 0 0 10px rgba(94,231,255,0)}100%{box-shadow:0 0 0 0 rgba(94,231,255,0)}}@keyframes cl-bar-rise{from{width:0}}@keyframes cl-node-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}@keyframes cl-line-pulse{0%,100%{opacity:.30}50%{opacity:.9}}

/* ========================= AUTH ========================= */
.cl-auth{min-height:100vh;position:relative;overflow:hidden;background:var(--cl-bg);color:var(--cl-text);display:grid;place-items:center;padding:26px;transition:background .35s ease,color .35s ease}.cl-auth-bg{position:absolute;inset:0;background:radial-gradient(circle at 14% 12%,rgba(22,193,255,.17),transparent 28%),radial-gradient(circle at 84% 18%,rgba(143,82,255,.17),transparent 28%),linear-gradient(155deg,var(--cl-bg),var(--cl-bg-2))}.cl-auth-canvas{position:absolute;inset:0;width:100%;height:100%;opacity:.76}.cl-auth-grid{position:absolute;inset:-15%;background-image:linear-gradient(rgba(90,175,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(90,175,255,.06) 1px,transparent 1px);background-size:44px 44px;transform:perspective(780px) rotateX(62deg) translateY(25%);opacity:.55}.cl-auth-top{position:absolute;left:24px;right:24px;top:18px;display:flex;justify-content:space-between;align-items:center;z-index:4}.cl-auth-back{display:inline-flex;align-items:center;gap:8px;color:var(--cl-muted);text-decoration:none;font-size:9px;font-weight:800}.cl-auth-brand{display:flex;align-items:center;gap:10px}.cl-auth-brand-mark{width:36px;height:36px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(135deg,#09a9ef,#6865f1,#ad55ef);color:white;font-weight:950}.cl-auth-brand strong{font-size:12px;letter-spacing:.12em}.cl-auth-brand span{display:block;color:var(--cl-soft);font-size:7px;margin-top:2px}.cl-auth-card{position:relative;z-index:3;width:min(1040px,100%);display:grid;grid-template-columns:1.02fr .98fr;gap:0;border:1px solid var(--cl-line);border-radius:28px;overflow:hidden;background:color-mix(in srgb,var(--cl-panel-solid) 78%,transparent);backdrop-filter:blur(22px);box-shadow:0 40px 120px rgba(0,0,0,.26)}.cl-auth-side{position:relative;min-height:620px;padding:46px;background:linear-gradient(145deg,rgba(7,24,45,.95),rgba(9,17,37,.84));overflow:hidden}.cl-auth-side::before{content:"";position:absolute;inset:auto -20% -18% -20%;height:65%;background:radial-gradient(circle,rgba(15,196,255,.17),transparent 64%);filter:blur(10px)}html[data-theme="light"] .cl-auth-side{background:linear-gradient(145deg,#eaf5ff,#eef1ff)}.cl-auth-side h1{position:relative;z-index:1;margin:12px 0 9px;font-size:42px;line-height:1;letter-spacing:-.045em}.cl-auth-side p{position:relative;z-index:1;max-width:420px;color:var(--cl-muted);font-size:11px;line-height:1.75}.cl-auth-pills{position:relative;z-index:1;display:flex;flex-wrap:wrap;gap:7px;margin-top:17px}.cl-auth-pill{padding:7px 9px;border-radius:999px;border:1px solid var(--cl-line);background:rgba(255,255,255,.04);color:var(--cl-muted);font-size:7px;font-weight:850}.cl-auth-road{position:absolute;left:42px;right:42px;bottom:54px;height:210px}.cl-auth-road svg{width:100%;height:100%}.cl-auth-road .path{fill:none;stroke:rgba(117,158,197,.18);stroke-width:8;stroke-linecap:round}.cl-auth-road .path2{fill:none;stroke:url(#authGradient);stroke-width:4;stroke-dasharray:14 11;animation:cl-road-flow 3.6s linear infinite}.cl-auth-road circle{fill:var(--cl-panel-solid);stroke:#66def9;stroke-width:2}.cl-auth-road text{fill:var(--cl-muted);font-size:8px;font-weight:800}.cl-auth-form{padding:46px;background:color-mix(in srgb,var(--cl-panel-solid) 92%,transparent)}.cl-auth-form-head .kicker{display:inline-block;color:var(--cl-accent);font-size:8px;font-weight:900;letter-spacing:.16em;text-transform:uppercase}.cl-auth-form-head h2{font-size:34px;line-height:1;margin:9px 0 8px;letter-spacing:-.04em}.cl-auth-form-head p{margin:0;color:var(--cl-muted);font-size:10px;line-height:1.7}.cl-auth-form-body{display:grid;gap:11px;margin-top:24px}.cl-auth-field{display:grid;gap:5px}.cl-auth-field label{font-size:8px;text-transform:uppercase;letter-spacing:.08em;color:var(--cl-muted);font-weight:900}.cl-auth-field input{width:100%;box-sizing:border-box;padding:12px 13px;border:1px solid var(--cl-line);border-radius:11px;background:rgba(255,255,255,.03);color:var(--cl-text);outline:none;transition:.2s ease;font-size:11px}.cl-auth-field input:focus{border-color:rgba(80,199,255,.52);box-shadow:0 0 0 3px rgba(80,199,255,.08)}.cl-auth-submit{width:100%;border:0;padding:13px 14px;border-radius:11px;background:linear-gradient(135deg,#069ee9,#6266ef 58%,#a954ee);color:white;font-size:10px;font-weight:950;cursor:pointer;box-shadow:0 18px 30px rgba(60,89,235,.22);transition:.2s ease}.cl-auth-submit:hover{transform:translateY(-2px)}.cl-auth-submit:disabled{opacity:.55;cursor:not-allowed;transform:none}.cl-auth-message{padding:10px 11px;border-radius:10px;font-size:9px;line-height:1.5}.cl-auth-message.error{background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.18);color:#ffadad}.cl-auth-message.success{background:rgba(104,227,170,.08);border:1px solid rgba(104,227,170,.17);color:#8df0be}.cl-auth-switch{margin-top:15px;text-align:center;color:var(--cl-muted);font-size:9px}.cl-auth-switch a{color:var(--cl-accent);font-weight:900;text-decoration:none}.cl-role-badge{display:inline-flex;align-items:center;gap:6px;margin-top:17px;padding:7px 9px;border-radius:999px;background:rgba(91,188,255,.07);border:1px solid rgba(91,188,255,.14);color:var(--cl-accent);font-size:7px;font-weight:900;letter-spacing:.06em;text-transform:uppercase}

/* dashboard compatibility/theme */
html[data-theme="light"] .dashboard-page{background:#eef5fb !important;color:#102039 !important}html[data-theme="light"] .dashboard-header{background:rgba(255,255,255,.88) !important;border-bottom-color:rgba(37,62,91,.12) !important}html[data-theme="light"] .sidebar{background:#f7fbff !important;border-right-color:rgba(37,62,91,.10) !important}html[data-theme="light"] .page-content,html[data-theme="light"] .page-content *{--local-muted:#6a7c92}html[data-theme="light"] .dashboard-card,html[data-theme="light"] .page-hero,html[data-theme="light"] .empty-state-card{background:#fff !important;border-color:#dce7f1 !important;color:#15253d !important;box-shadow:0 16px 35px rgba(40,73,107,.08)!important}html[data-theme="dark"] .dashboard-page{background:#07111d !important;color:#edf5ff !important}html[data-theme="dark"] .dashboard-header{background:rgba(6,17,29,.92) !important;border-bottom-color:rgba(148,163,184,.12) !important}html[data-theme="dark"] .sidebar{background:#091727 !important;border-right-color:rgba(148,163,184,.10) !important}html[data-theme="dark"] .dashboard-card,html[data-theme="dark"] .page-hero,html[data-theme="dark"] .empty-state-card{background:#0c1b2e !important;border-color:rgba(148,163,184,.13) !important;color:#eef6ff !important;box-shadow:0 18px 45px rgba(0,0,0,.18)!important}

@media(max-width:1050px){.cl-home-nav-links{display:none}.cl-home-hero,.cl-glass-grid,.cl-live-grid{grid-template-columns:1fr}.cl-hero-visual{min-height:540px}.cl-stat-strip{grid-template-columns:repeat(2,1fr)}.cl-feature-grid{grid-template-columns:1fr 1fr}.cl-workflow{grid-template-columns:repeat(4,1fr)}.cl-work-item:nth-child(4)::after,.cl-work-item:nth-child(8)::after{display:none}.cl-cta-inner{flex-direction:column;align-items:flex-start}.cl-auth-card{grid-template-columns:1fr}.cl-auth-side{min-height:460px}.cl-auth-road{bottom:34px}}
@media(max-width:700px){.cl-home-shell{width:min(100% - 22px,1240px)}.cl-home-nav{top:7px;margin-top:7px}.cl-home-brand span{display:none}.cl-home-nav .cl-theme-toggle{display:none}.cl-home-nav-actions .ghost{display:none}.cl-home-section{padding:76px 0}.cl-home-copy h1{font-size:45px}.cl-home-copy p{font-size:12px}.cl-hero-visual{min-height:430px}.cl-home-panel{width:95%}.cl-feature-grid,.cl-stat-strip,.cl-workflow{grid-template-columns:1fr}.cl-work-item::after{display:none}.cl-roadmap-wrap{padding:14px}.cl-roadmap-svg{min-width:900px}.cl-roadmap-wrap{overflow:auto}.cl-road-caption{grid-template-columns:1fr 1fr}.cl-cursor-glow,.cl-cursor-dot{display:none}.cl-auth{padding:14px}.cl-auth-top{left:14px;right:14px;top:12px}.cl-auth-card{margin-top:48px;border-radius:21px}.cl-auth-side,.cl-auth-form{padding:28px}.cl-auth-side{min-height:390px}.cl-auth-side h1{font-size:32px}.cl-auth-road{left:18px;right:18px;bottom:24px}.cl-global-theme-toggle{right:12px;top:70px}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms !important;animation-iteration-count:1 !important;scroll-behavior:auto !important;transition:none !important}}
`;

function useInteractiveParticles(canvasRef, kind = "home") {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let pointer = { x: -1000, y: -1000 };
    let raf = 0;
    let nodes = [];

    const setup = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = kind === "auth" ? Math.min(70, Math.max(28, Math.floor((width * height) / 33000))) : Math.min(96, Math.max(36, Math.floor((width * height) / 24000)));
      nodes = Array.from({ length: count }, (_, index) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - .5) * (kind === "auth" ? .20 : .28),
        vy: (Math.random() - .5) * (kind === "auth" ? .20 : .28),
        r: index % 9 === 0 ? 2.1 : 1 + Math.random() * 1.1,
      }));
    };

    const move = (event) => { pointer = { x: event.clientX, y: event.clientY }; };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const light = document.documentElement.dataset.theme === "light";
      const pointColor = light ? "rgba(30,144,255,.55)" : "rgba(125,211,252,.64)";
      const lineColor = light ? "rgba(50,123,206,.10)" : "rgba(96,165,250,.15)";
      const cursorColor = light ? "rgba(25,171,220,.16)" : "rgba(56,189,248,.24)";
      const linkDistance = width < 700 ? 100 : kind === "auth" ? 118 : 145;

      for (const node of nodes) {
        const dx = node.x - pointer.x;
        const dy = node.y - pointer.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 140 && dist > 0) {
          const force = (1 - dist / 140) * .032;
          node.vx += (dx / dist) * force;
          node.vy += (dy / dist) * force;
        }
        node.x += node.vx;
        node.y += node.vy;
        node.vx *= .995;
        node.vy *= .995;
        if (node.x < -12 || node.x > width + 12) node.vx *= -1;
        if (node.y < -12 || node.y > height + 12) node.vy *= -1;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        ctx.fillStyle = pointColor;
        ctx.fill();
      }

      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const a = nodes[i]; const b = nodes[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < linkDistance) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(${light ? "50,123,206" : "96,165,250"},${(1 - dist / linkDistance) * .14})`;
            ctx.lineWidth = .75; ctx.stroke();
          }
        }
      }

      const radius = kind === "auth" ? 165 : 205;
      for (const node of nodes) {
        const dist = Math.hypot(node.x - pointer.x, node.y - pointer.y);
        if (dist < radius) {
          ctx.beginPath(); ctx.moveTo(pointer.x, pointer.y); ctx.lineTo(node.x, node.y);
          ctx.strokeStyle = `rgba(${light ? "25,171,220" : "56,189,248"},${(1 - dist / radius) * .20})`;
          ctx.lineWidth = 1; ctx.stroke();
        }
      }
      void lineColor; void cursorColor;
      raf = requestAnimationFrame(draw);
    };

    setup();
    window.addEventListener("resize", setup);
    window.addEventListener("mousemove", move, { passive: true });
    raf = requestAnimationFrame(draw);
    return () => {
      window.removeEventListener("resize", setup);
      window.removeEventListener("mousemove", move);
      cancelAnimationFrame(raf);
    };
  }, [canvasRef, kind]);
}

function usePublicReveal(sectionSelector = "[data-home-section]") {
  useEffect(() => {
    const targets = Array.from(document.querySelectorAll(sectionSelector));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("show");
      });
    }, { threshold: .14, rootMargin: "0px 0px -7% 0px" });
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [sectionSelector]);
}

function Home() {
  const canvasRef = useRef(null);
  const cursorGlowRef = useRef(null);
  const cursorDotRef = useRef(null);
  const [activeSection, setActiveSection] = useState("home");
  const [progress, setProgress] = useState(0);
  const role = getRole();
  useInteractiveParticles(canvasRef, "home");
  usePublicReveal("[data-home-section]");

  useEffect(() => {
    if (role) return undefined;
    const onScroll = () => {
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      setProgress(Math.min(100, Math.max(0, (window.scrollY / max) * 100)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [role]);

  useEffect(() => {
    if (role) return undefined;
    let raf = 0;
    let mx = window.innerWidth * .5; let my = window.innerHeight * .4;
    let tx = mx; let ty = my;
    const move = (event) => { tx = event.clientX; ty = event.clientY; };
    const animate = () => {
      mx += (tx - mx) * .16; my += (ty - my) * .16;
      if (cursorGlowRef.current) { cursorGlowRef.current.style.left = `${mx}px`; cursorGlowRef.current.style.top = `${my}px`; }
      if (cursorDotRef.current) { cursorDotRef.current.style.left = `${tx}px`; cursorDotRef.current.style.top = `${ty}px`; }
      raf = requestAnimationFrame(animate);
    };
    window.addEventListener("mousemove", move, { passive: true });
    raf = requestAnimationFrame(animate);
    return () => { window.removeEventListener("mousemove", move); cancelAnimationFrame(raf); };
  }, [role]);

  useEffect(() => {
    if (role) return undefined;
    const sections = Array.from(document.querySelectorAll("[data-home-section]"));
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible?.target?.id) setActiveSection(visible.target.id);
    }, { rootMargin: "-28% 0px -52% 0px", threshold: [.15, .35, .6] });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [role]);

  if (role) return <Navigate to={getDashboardPath(role)} replace />;

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="cl-home">
      <style>{CAMPUSLINK_PUBLIC_CSS}</style>
      <div className="cl-scroll-progress" style={{ width: `${progress}%` }} />
      <div className="cl-home-bg" aria-hidden="true">
        <canvas ref={canvasRef} className="cl-home-canvas" />
        <div className="cl-home-grid" />
        <div className="cl-home-orb one" /><div className="cl-home-orb two" /><div className="cl-home-orb three" />
      </div>
      <div ref={cursorGlowRef} className="cl-cursor-glow" aria-hidden="true" />
      <div ref={cursorDotRef} className="cl-cursor-dot" aria-hidden="true" />

      <div className="cl-home-shell">
        <nav className="cl-home-nav">
          <div className="cl-home-brand"><div className="cl-home-brand-mark">C</div><div><strong>CAMPUSLINK</strong><span>Campus-to-Corporate Placement Intelligence</span></div></div>
          <div className="cl-home-nav-links">
            {[['home','Home'],['roadmap','Roadmap'],['platform','Platform'],['intelligence','Intelligence'],['journey','Journey'],['impact','Impact']].map(([id,label]) => <a key={id} href={`#${id}`} className={activeSection === id ? "active" : ""}>{label}</a>)}
          </div>
          <div className="cl-home-nav-actions"><ThemeToggle compact /><Link className="cl-home-btn ghost" to="/login">Login</Link><Link className="cl-home-btn primary" to="/register">Create User</Link></div>
        </nav>

        <main>
          <section className="cl-home-section cl-home-hero" id="home" data-home-section>
            <div className="cl-home-copy cl-reveal">
              <span className="cl-home-eyebrow"><span className="cl-pulse-dot" /> THE CAMPUS → CAREER OPERATING SYSTEM</span>
              <h1>From <span>college</span> to the career you want.</h1>
              <p>CampusLink connects the entire placement journey — your verified resume facts, job readiness, skill gaps, recruiter intelligence, selection workflow and final offer — into one living career graph.</p>
              <div className="cl-home-actions"><Link className="cl-home-action primary" to="/register">Create your CampusLink account →</Link><Link className="cl-home-action secondary" to="/login">Enter your workspace</Link></div>
              <div className="cl-home-note">Transparent analysis · Role-based workflows · Resume-first evidence · Recruiter-ready signals</div>
              <div className="cl-hero-badges"><span className="cl-hero-badge">Resume Intelligence</span><span className="cl-hero-badge">Job Fit</span><span className="cl-hero-badge">Readiness Rank</span><span className="cl-hero-badge">GitHub Evidence</span></div>
            </div>
            <div className="cl-hero-visual cl-reveal">
              <div className="cl-hero-globe" /><div className="cl-path-ring" />
              <div className="cl-home-panel">
                <div className="cl-panel-head"><div className="cl-window-dots"><i/><i/><i/></div><small>CampusLink career intelligence</small></div>
                <div className="cl-home-panel-body">
                  <div className="cl-score-row"><div className="cl-score-circle"><strong>84</strong></div><div className="cl-score-copy"><small>JOB READINESS</small><strong>Nearly job ready</strong><span>Evidence collected from your actual resume and target role requirements.</span></div></div>
                  <div className="cl-metric-grid"><div className="cl-metric"><b>92%</b><span>PROFILE EVIDENCE</span></div><div className="cl-metric"><b>78%</b><span>JOB FIT</span></div><div className="cl-metric"><b>03</b><span>PROJECTS</span></div></div>
                  <div className="cl-signal-list"><div className="cl-signal"><span>Skills</span><i style={{"--w":"90%"}}/><b>90</b></div><div className="cl-signal"><span>Projects</span><i style={{"--w":"84%"}}/><b>84</b></div><div className="cl-signal"><span>Experience</span><i style={{"--w":"70%"}}/><b>70</b></div><div className="cl-signal"><span>Evidence</span><i style={{"--w":"81%"}}/><b>81</b></div></div>
                </div>
              </div>
            </div>
          </section>

          <section className="cl-home-section" id="roadmap" data-home-section>
            <div style={{width:"100%"}}>
              <div className="cl-section-head cl-reveal"><span className="cl-section-kicker">THE STUDENT ROADMAP</span><h2>A living path from <span className="cl-gradient">college to success.</span></h2><p>Every stage has a purpose. CampusLink turns a student journey into a connected path where each step creates evidence for the next one.</p></div>
              <div className="cl-roadmap-wrap cl-reveal">
                <svg className="cl-roadmap-svg" viewBox="0 0 1000 350" role="img" aria-label="Student roadmap from college to career success">
                  <defs><linearGradient id="roadGradient" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#26c6ff"/><stop offset="35%" stopColor="#6575ff"/><stop offset="68%" stopColor="#b05dff"/><stop offset="100%" stopColor="#8fe66f"/></linearGradient></defs>
                  <path className="cl-road-path-base" d="M70 260 C150 100 220 100 305 215 S460 330 535 160 S680 50 750 170 S850 310 930 100"/>
                  <path className="cl-road-path" d="M70 260 C150 100 220 100 305 215 S460 330 535 160 S680 50 750 170 S850 310 930 100"/>
                  {[[70,260,'College','Explore'],[170,112,'Learn','Build skills'],[305,215,'Build','Projects'],[420,304,'Intern','Gain experience'],[535,160,'Match','Target roles'],[655,70,'Interview','Show evidence'],[750,170,'Offer','Get selected'],[930,100,'Launch','Grow in career']].map(([x,y,title,sub],i)=><g key={title}><circle className={`cl-road-node n${i+1}`} cx={x} cy={y} r="14"/><text className="cl-road-label" x={x} y={y-26} textAnchor="middle">{title}</text><text className="cl-road-sub" x={x} y={y+34} textAnchor="middle">{sub}</text></g>)}
                </svg>
                <div className="cl-road-caption"><div><strong>01 · Start</strong><span>Create a verified digital profile.</span></div><div><strong>02 · Prove</strong><span>Build projects and evidence that matter.</span></div><div><strong>03 · Match</strong><span>Find roles aligned to your actual profile.</span></div><div><strong>04 · Launch</strong><span>Move from shortlist to offer and beyond.</span></div></div>
              </div>
            </div>
          </section>

          <section className="cl-home-section" id="platform" data-home-section>
            <div style={{width:"100%"}}>
              <div className="cl-section-head cl-reveal"><span className="cl-section-kicker">ONE CONNECTED PLATFORM</span><h2>Your placement journey should not live in <span className="cl-gradient">ten different places.</span></h2><p>CampusLink brings students, recruiters and placement teams onto the same operational graph.</p></div>
              <div className="cl-stat-strip cl-reveal"><div className="cl-stat-card"><strong>01</strong><span>Verified resume facts before scoring</span></div><div className="cl-stat-card"><strong>02</strong><span>Job-specific fit and skill-gap signals</span></div><div className="cl-stat-card"><strong>03</strong><span>Recruiter ranking and project evidence</span></div><div className="cl-stat-card"><strong>04</strong><span>Applications, interviews and offers</span></div></div>
              <div className="cl-feature-grid" style={{marginTop:18}}>
                {[['◎','Student Workspace','Profile, resume, drives, applications, interviews, offers and recommendations.'],['✦','Resume Intelligence','Extract actual education, skills, projects, experience and certifications from the uploaded resume.'],['◈','Job Matching','Compare a real job description against a real student profile and show gaps.'],['▣','Recruiter Intelligence','Rank applicants by readiness and role fit, then inspect project evidence.'],['⌁','Placement Operations','Manage companies, drives, selection rounds, scheduling, offers and notifications.'],['↗','Career Momentum','Turn missing skills into a practical next-step plan before the next opportunity.']].map(([icon,title,desc])=><div className="cl-feature-card cl-reveal" key={title}><div className="cl-feature-icon">{icon}</div><h3>{title}</h3><p>{desc}</p></div>)}
              </div>
            </div>
          </section>

          <section className="cl-home-section" id="intelligence" data-home-section>
            <div style={{width:"100%"}}>
              <div className="cl-section-head cl-reveal"><span className="cl-section-kicker">INTELLIGENCE THAT EXPLAINS ITSELF</span><h2>Not just a score. A <span className="cl-gradient">reason behind the score.</span></h2><p>CampusLink is designed so readiness and job-fit results can be traced back to the information that produced them.</p></div>
              <div className="cl-live-grid">
                <div className="cl-live-panel cl-reveal"><span className="cl-section-kicker">STUDENT VIEW</span><h3>Know what to improve before the interview.</h3><p>Upload a resume, pick a target role, compare a job description, and turn gaps into a focused preparation loop.</p><div className="cl-live-stack"><div className="cl-live-item"><div className="cl-live-icon">01</div><div><strong>Resume facts</strong><span>Education, skills, projects, experience and evidence.</span></div><div className="cl-live-chip">VERIFIED</div></div><div className="cl-live-item"><div className="cl-live-icon">02</div><div><strong>Job requirements</strong><span>Required skills, preferred skills and eligibility signals.</span></div><div className="cl-live-chip">MATCH</div></div><div className="cl-live-item"><div className="cl-live-icon">03</div><div><strong>Preparation</strong><span>Skill gaps and role-focused action areas.</span></div><div className="cl-live-chip">ACT</div></div></div></div>
                <div className="cl-visual-board cl-reveal"><div className="cl-board-grid"/><div className="cl-board-center"><div><strong>CAREER<br/>GRAPH</strong><span>student → role → evidence</span></div></div><div className="cl-board-node a"><b>Resume</b><small>real facts</small></div><div className="cl-board-node b"><b>Job</b><small>requirements</small></div><div className="cl-board-node c"><b>Projects</b><small>GitHub evidence</small></div><div className="cl-board-node d"><b>Recruiter</b><small>rank + review</small></div><div className="cl-board-line l1"/><div className="cl-board-line l2"/><div className="cl-board-line l3"/><div className="cl-board-line l4"/></div>
              </div>
            </div>
          </section>

          <section className="cl-home-section" id="journey" data-home-section>
            <div style={{width:"100%"}}>
              <div className="cl-section-head cl-reveal"><span className="cl-section-kicker">THE COMPLETE JOURNEY</span><h2>Eight connected moments. <span className="cl-gradient">One destination.</span></h2><p>From the first profile to the first role, each stage feeds context into the next stage.</p></div>
              <div className="cl-workflow cl-reveal">
                {[['01','Create','Create your account and start the profile.'],['02','Verify','Upload a resume and extract real facts.'],['03','Build','Add projects, skills and evidence.'],['04','Match','Compare against target opportunities.'],['05','Prepare','Close critical skill and evidence gaps.'],['06','Shortlist','Recruiters rank and review candidates.'],['07','Interview','Move through selection rounds and scheduling.'],['08','Launch','Receive an offer and start the next chapter.']].map(([num,title,desc])=><div className="cl-work-item" key={num}><b>{num}</b><h4>{title}</h4><p>{desc}</p></div>)}
              </div>
            </div>
          </section>

          <section className="cl-home-section" id="impact" data-home-section>
            <div style={{width:"100%"}}>
              <div className="cl-section-head cl-reveal"><span className="cl-section-kicker">WHO CAMPUSLINK SERVES</span><h2>One experience, three perspectives, <span className="cl-gradient">one shared outcome.</span></h2><p>Students, recruiters and placement officers see the same placement story from different angles — without losing the evidence between them.</p></div>
              <div className="cl-glass-grid">
                <div className="cl-glass cl-reveal"><span className="cl-section-kicker">STUDENTS</span><h3>Turn your resume into momentum.</h3><p>See readiness, target-job fit, missing skills, project evidence and the next practical action — before you walk into the hiring process.</p><div className="cl-check-list"><div className="cl-check"><div className="cl-check-mark">✓</div><div><strong>Fact-based analysis</strong><span>Work from the resume you actually uploaded.</span></div></div><div className="cl-check"><div className="cl-check-mark">✓</div><div><strong>Job-specific fit</strong><span>Measure the gap between your evidence and the role.</span></div></div><div className="cl-check"><div className="cl-check-mark">✓</div><div><strong>Career roadmap</strong><span>Know what comes next instead of guessing.</span></div></div></div></div>
                <div className="cl-glass cl-reveal"><span className="cl-section-kicker">RECRUITERS</span><h3>See candidate evidence, not just rows in a sheet.</h3><p>Use job readiness and job-fit signals as a starting point, then inspect project and repository evidence before shortlisting.</p><div className="cl-check-list"><div className="cl-check"><div className="cl-check-mark">✓</div><div><strong>Job readiness ranking</strong><span>Compare candidates with a consistent framework.</span></div></div><div className="cl-check"><div className="cl-check-mark">✓</div><div><strong>GitHub project review</strong><span>Open deeper technical project evidence.</span></div></div><div className="cl-check"><div className="cl-check-mark">✓</div><div><strong>Faster screening</strong><span>Move from application to shortlist with more context.</span></div></div></div></div>
                <div className="cl-glass cl-reveal"><span className="cl-section-kicker">PLACEMENT OFFICERS</span><h3>Run the placement cycle as one system.</h3><p>Keep companies, job drives, applications, rounds, scheduling, offers and notifications connected instead of recreating the same information in different tools.</p><div className="cl-check-list"><div className="cl-check"><div className="cl-check-mark">✓</div><div><strong>Central operations</strong><span>Keep every placement workflow in one place.</span></div></div><div className="cl-check"><div className="cl-check-mark">✓</div><div><strong>Operational visibility</strong><span>Track the candidate journey across stages.</span></div></div><div className="cl-check"><div className="cl-check-mark">✓</div><div><strong>Shared context</strong><span>Reduce handoffs that lose important evidence.</span></div></div></div></div>
                <div className="cl-glass cl-reveal"><span className="cl-section-kicker">THE PRINCIPLE</span><h3>Real data first. Explanation second.</h3><p>CampusLink keeps deterministic extraction and transparent scoring at the center of the workflow so the interface explains where its outputs came from.</p><div className="cl-check-list"><div className="cl-check"><div className="cl-check-mark">✓</div><div><strong>No mystery number</strong><span>Show the components behind readiness.</span></div></div><div className="cl-check"><div className="cl-check-mark">✓</div><div><strong>No stale resume merge</strong><span>Fresh uploads can be treated as the active source.</span></div></div><div className="cl-check"><div className="cl-check-mark">✓</div><div><strong>Human review remains important</strong><span>Use intelligence to support decisions, not replace judgment.</span></div></div></div></div>
              </div>
            </div>
          </section>

          <section className="cl-home-section" data-home-section>
            <div style={{width:"100%"}}>
              <div className="cl-cta cl-reveal"><div className="cl-cta-inner"><div><span className="cl-section-kicker">START YOUR CAMPUSLINK JOURNEY</span><h2>The next step starts with one account.</h2><p>Build a verified placement profile, explore opportunities and let your career journey become a connected story instead of a collection of disconnected files.</p></div><div className="cl-cta-actions"><Link className="cl-home-action primary" to="/register">Create User →</Link><Link className="cl-home-action secondary" to="/login">Login</Link></div></div></div>
              <div className="cl-home-footer">CAMPUSLINK · AI-POWERED CAMPUS-TO-CORPORATE PLACEMENT MANAGEMENT · BUILD → MATCH → PREPARE → INTERVIEW → LAUNCH</div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function PublicAuthBackground({ kind }) {
  const canvasRef = useRef(null);
  useInteractiveParticles(canvasRef, "auth");
  return <div className="cl-auth-bg" aria-hidden="true"><canvas ref={canvasRef} className="cl-auth-canvas"/><div className="cl-auth-grid"/><div className="cl-home-orb one"/><div className="cl-home-orb two"/></div>;
}

function AuthRoadmap() {
  return (
    <div className="cl-auth-road">
      <svg viewBox="0 0 560 200" role="img" aria-label="Career progress">
        <defs><linearGradient id="authGradient" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#35d6ff"/><stop offset="50%" stopColor="#7770ff"/><stop offset="100%" stopColor="#ae63ff"/></linearGradient></defs>
        <path className="path" d="M22 155 C90 25 150 26 220 120 S345 190 395 92 S470 24 538 58"/>
        <path className="path2" d="M22 155 C90 25 150 26 220 120 S345 190 395 92 S470 24 538 58"/>
        <circle cx="22" cy="155" r="8"/><circle cx="150" cy="50" r="8"/><circle cx="220" cy="120" r="8"/><circle cx="395" cy="92" r="8"/><circle cx="538" cy="58" r="8"/>
        <text x="22" y="181" textAnchor="middle">College</text><text x="150" y="28" textAnchor="middle">Skills</text><text x="220" y="145" textAnchor="middle">Projects</text><text x="395" y="116" textAnchor="middle">Interview</text><text x="538" y="40" textAnchor="middle">Career</text>
      </svg>
    </div>
  );
}

function PublicAuthShell({ eyebrow, title, description, children, switchText, switchHref, switchLabel, formKind }) {
  return (
    <div className="cl-auth">
      <style>{CAMPUSLINK_PUBLIC_CSS}</style>
      <PublicAuthBackground kind={formKind} />
      <div className="cl-auth-top"><Link className="cl-auth-back" to="/">← Back to CampusLink home</Link><div className="cl-auth-brand"><div className="cl-auth-brand-mark">C</div><div><strong>CAMPUSLINK</strong><span>Campus-to-Corporate Placement Intelligence</span></div></div><ThemeToggle /></div>
      <div className="cl-auth-card">
        <section className="cl-auth-side">
          <span className="cl-section-kicker">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
          <div className="cl-auth-pills"><span className="cl-auth-pill">Resume intelligence</span><span className="cl-auth-pill">Job fit</span><span className="cl-auth-pill">Placement workflow</span><span className="cl-auth-pill">Career roadmap</span></div>
          <AuthRoadmap />
        </section>
        <section className="cl-auth-form">
          {children}
          <div className="cl-auth-switch">{switchText} <Link to={switchHref}>{switchLabel}</Link></div>
        </section>
      </div>
    </div>
  );
}

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = getToken(); const role = getRole();
    if (token && role) navigate(getDashboardPath(role), { replace: true });
  }, [navigate]);

  const login = async () => {
    if (!email.trim() || !password) { setMessage("Enter your email and password."); return; }
    setLoading(true); setMessage("");
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, { method:"POST", headers:{"Content-Type":"application/json",Accept:"application/json"}, body:JSON.stringify({email:email.trim().toLowerCase(),password}) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.detail || "Login failed.");
      if (!data.access_token) throw new Error("No access token returned.");
      localStorage.setItem("campuslink_token", data.access_token);
      const payload = decodeToken(data.access_token);
      if (!payload?.role) throw new Error("Login token does not contain a role.");
      navigate(getDashboardPath(payload.role), { replace:true });
    } catch (error) { setMessage(error.message || "Unable to login."); }
    finally { setLoading(false); }
  };

  return (
    <PublicAuthShell eyebrow="WELCOME BACK" title="Enter your career command center." description="Sign in to continue your student, recruiter or placement workspace. Your role controls the workflows you can access." switchText="New to CampusLink?" switchHref="/register" switchLabel="Create a user account" formKind="login">
      <div className="cl-auth-form-head"><span className="kicker">SECURE ACCESS</span><h2>Login</h2><p>Use the credentials already registered with CampusLink.</p></div>
      <div className="cl-auth-form-body">
        <div className="cl-auth-field"><label>Email address</label><input type="email" value={email} autoComplete="email" placeholder="you@example.com" onChange={(event)=>setEmail(event.target.value)} /></div>
        <div className="cl-auth-field"><label>Password</label><input type="password" value={password} autoComplete="current-password" placeholder="Enter your password" onChange={(event)=>setPassword(event.target.value)} onKeyDown={(event)=>{if(event.key === "Enter") login();}} /></div>
        {message && <div className="cl-auth-message error">{message}</div>}
        <button type="button" className="cl-auth-submit" onClick={login} disabled={loading}>{loading ? "Signing you in…" : "Login to CampusLink →"}</button>
      </div>
    </PublicAuthShell>
  );
}

function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({full_name:"",email:"",password:"",confirm_password:""});
  const [loading,setLoading] = useState(false);
  const [message,setMessage] = useState("");
  const [success,setSuccess] = useState(false);
  const setField = (name,value) => setForm((current)=>({...current,[name]:value}));

  const register = async () => {
    setMessage(""); setSuccess(false);
    if (form.full_name.trim().length < 2) { setMessage("Enter your full name."); return; }
    if (!form.email.trim()) { setMessage("Enter your email address."); return; }
    if (form.password.length < 8) { setMessage("Password must contain at least 8 characters."); return; }
    if (form.password !== form.confirm_password) { setMessage("Passwords do not match."); return; }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, { method:"POST", headers:{"Content-Type":"application/json",Accept:"application/json"}, body:JSON.stringify({full_name:form.full_name.trim(),email:form.email.trim().toLowerCase(),password:form.password,role:"STUDENT"}) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(Array.isArray(data?.detail) ? data.detail.map((item)=>item.msg).join(", ") : data?.detail || "Registration failed.");
      setSuccess(true); setMessage("Student account created successfully. Redirecting to login…");
      setTimeout(()=>navigate("/login",{replace:true}),900);
    } catch(error) { setMessage(error.message || "Registration failed."); }
    finally { setLoading(false); }
  };

  return (
    <PublicAuthShell eyebrow="START HERE" title="Create the account that starts your roadmap." description="Create a CampusLink student account first. After login, build your profile, upload your resume and start moving toward target opportunities." switchText="Already registered?" switchHref="/login" switchLabel="Login instead" formKind="register">
      <div className="cl-auth-form-head"><span className="kicker">CREATE USER</span><h2>Register</h2><p>Your public registration creates a student account. Recruiter, placement officer and admin access stays role-controlled.</p><div className="cl-role-badge">STUDENT ACCOUNT · PLACEMENT JOURNEY</div></div>
      <div className="cl-auth-form-body">
        <div className="cl-auth-field"><label>Full name</label><input value={form.full_name} autoComplete="name" placeholder="Your full name" onChange={(event)=>setField("full_name",event.target.value)} /></div>
        <div className="cl-auth-field"><label>Email address</label><input type="email" value={form.email} autoComplete="email" placeholder="you@example.com" onChange={(event)=>setField("email",event.target.value)} /></div>
        <div className="cl-auth-field"><label>Password</label><input type="password" value={form.password} autoComplete="new-password" placeholder="Minimum 8 characters" onChange={(event)=>setField("password",event.target.value)} /></div>
        <div className="cl-auth-field"><label>Confirm password</label><input type="password" value={form.confirm_password} autoComplete="new-password" placeholder="Repeat your password" onChange={(event)=>setField("confirm_password",event.target.value)} onKeyDown={(event)=>{if(event.key === "Enter") register();}} /></div>
        {message && <div className={`cl-auth-message ${success ? "success" : "error"}`}>{message}</div>}
        <button type="button" className="cl-auth-submit" onClick={register} disabled={loading}>{loading ? "Creating account…" : "Create CampusLink account →"}</button>
      </div>
    </PublicAuthShell>
  );
}

// ============================================================
// APP
// ============================================================

function App() {
  return (
    <BrowserRouter>
      <ThemeController />
      <style>{CAMPUSLINK_PUBLIC_CSS}</style>
      <Routes>




        {/* LOGIN */}

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

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
            ROOT
        ================================================== */}

        <Route
          path="/"
          element={<Home />}
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
