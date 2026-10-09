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
import QuantumAI from "./components/QuantumAI";
import "./App.css";
import "./styles/enterprise.css";

// ============================================================
// STUDENT
// ============================================================

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

  const [file, setFile] =
    useState(null);

  const [analysis, setAnalysis] =
    useState(null);

  const [cgpa, setCgpa] =
    useState("");

  const [skills, setSkills] =
    useState("");

  const [resumeText, setResumeText] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [messageType, setMessageType] =
    useState("");

  const [verifiedAt, setVerifiedAt] =
    useState("");

  const [dragActive, setDragActive] =
    useState(false);

  useEffect(() => {
    loadProfile(false);
  }, []);

  const loadProfile = async (
    showMessage = true
  ) => {
    if (!token) {
      return;
    }

    try {
      const response =
        await fetch(
          `${API_BASE_URL}/student-profile/me`,
          {
            headers: {
              Accept:
                "application/json",
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      const data =
        await response.json();

      if (response.status === 404) {
        if (showMessage) {
          setMessage(
            "No student profile found yet."
          );

          setMessageType("info");
        }

        return;
      }

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            "Unable to load profile."
        );
      }

      setCgpa(
        data.cgpa !== null &&
          data.cgpa !== undefined
          ? String(data.cgpa)
          : ""
      );

      setSkills(
        data.skills || ""
      );

      setResumeText(
        data.resume_text || ""
      );

      setVerifiedAt(
        new Date().toLocaleString()
      );

      if (showMessage) {
        setMessage(
          "Profile verified from database successfully."
        );

        setMessageType("success");
      }
    } catch (error) {
      console.error(error);

      if (showMessage) {
        setMessage(
          error.message ||
            "Profile verification failed."
        );

        setMessageType("error");
      }
    }
  };

  const handleFile = (selectedFile) => {
    if (!selectedFile) {
      return;
    }

    if (
      selectedFile.type !==
        "application/pdf" &&
      !selectedFile.name
        .toLowerCase()
        .endsWith(".pdf")
    ) {
      setMessage(
        "Please choose a PDF resume."
      );

      setMessageType("error");

      return;
    }

    setFile(selectedFile);

    setMessage(
      "Resume selected and ready for analysis."
    );

    setMessageType("info");
  };

  const analyzeResume = async () => {
    if (!file) {
      setMessage(
        "Please choose a PDF resume first."
      );

      setMessageType("error");

      return;
    }

    setLoading(true);

    setMessage(
      "Analyzing your resume..."
    );

    setMessageType("info");

    try {
      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      const response =
        await fetch(
          `${API_BASE_URL}/ai/member4/resume/extract`,
          {
            method: "POST",
            headers: {
              Accept: "application/json",
              ...(token
                ? { Authorization: `Bearer ${token}` }
                : {}),
            },
            body: formData,
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            "Resume analysis failed."
        );
      }

      const education =
        Array.isArray(data.education)
          ? data.education
          : [];

      const latestEducation =
        education[education.length - 1] ||
        education[0] ||
        {};

      const extractedSkills =
        Array.isArray(data.skills)
          ? data.skills.join(", ")
          : data.skills || "";

      const educationText =
        education
          .map((item) => {
            const parts = [
              item?.degree,
              item?.branch,
              item?.institution,
              item?.graduation_year
                ? `Graduation: ${item.graduation_year}`
                : "",
              item?.cgpa !== null &&
              item?.cgpa !== undefined
                ? `CGPA: ${item.cgpa}`
                : "",
            ].filter(Boolean);

            return parts.length
              ? parts.join(" | ")
              : "";
          })
          .filter(Boolean)
          .join("\n");

      const projectsText =
        Array.isArray(data.projects)
          ? data.projects
              .map((project) => {
                const technologies = Array.isArray(
                  project?.technologies
                )
                  ? project.technologies.join(", ")
                  : project?.technologies || "";

                return [
                  project?.title
                    ? `Project: ${project.title}`
                    : "",
                  project?.description || "",
                  technologies
                    ? `Technologies: ${technologies}`
                    : "",
                ]
                  .filter(Boolean)
                  .join("\n");
              })
              .filter(Boolean)
              .join("\n\n")
          : "";

      const experienceText =
        Array.isArray(data.experience)
          ? data.experience
              .map((item) =>
                [
                  item?.company
                    ? `Company: ${item.company}`
                    : "",
                  item?.role
                    ? `Role: ${item.role}`
                    : "",
                  item?.description || "",
                ]
                  .filter(Boolean)
                  .join("\n")
              )
              .filter(Boolean)
              .join("\n\n")
          : "";

      const certificationsText =
        Array.isArray(data.certifications)
          ? data.certifications
              .filter(Boolean)
              .join(", ")
          : "";

      const achievementsText =
        Array.isArray(data.achievements)
          ? data.achievements
              .filter(Boolean)
              .join("\n")
          : "";

      const profileText = [
        data.name
          ? `Name: ${data.name}`
          : "",
        data.email
          ? `Email: ${data.email}`
          : "",
        data.phone
          ? `Phone: ${data.phone}`
          : "",
        data.github_url
          ? `GitHub: ${data.github_url}`
          : "",
        educationText
          ? `Education:\n${educationText}`
          : "",
        extractedSkills
          ? `Skills: ${extractedSkills}`
          : "",
        projectsText
          ? `Projects:\n${projectsText}`
          : "",
        experienceText
          ? `Experience:\n${experienceText}`
          : "",
        certificationsText
          ? `Certifications: ${certificationsText}`
          : "",
        achievementsText
          ? `Achievements:\n${achievementsText}`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n");

      setAnalysis({
        ...data,
        cgpa:
          latestEducation?.cgpa ?? null,
        extracted_text: profileText,
      });

      setSkills(extractedSkills);

      if (
        latestEducation?.cgpa !== null &&
        latestEducation?.cgpa !== undefined
      ) {
        setCgpa(
          String(latestEducation.cgpa)
        );
      }

      setResumeText(profileText);

      setMessage(
        "Resume analyzed successfully with Member 4 AI."
      );

      setMessageType("success");
    } catch (error) {
      setMessage(
        error.message ||
          "Resume analysis failed."
      );

      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);

    setMessage(
      "Saving profile..."
    );

    setMessageType("info");

    try {
      const cgpaValue =
        cgpa.trim() === ""
          ? null
          : Number(cgpa);

      if (
        cgpaValue !== null &&
        (
          Number.isNaN(cgpaValue) ||
          cgpaValue < 0 ||
          cgpaValue > 10
        )
      ) {
        throw new Error(
          "CGPA must be between 0 and 10."
        );
      }

      const response =
        await fetch(
          `${API_BASE_URL}/student-profile/me`,
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json",
              Accept:
                "application/json",
              Authorization:
                `Bearer ${token}`,
            },
            body: JSON.stringify({
              cgpa: cgpaValue,
              skills,
              resume_text:
                resumeText,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            "Profile save failed."
        );
      }

      setCgpa(
        data.cgpa !== null &&
          data.cgpa !== undefined
          ? String(data.cgpa)
          : ""
      );

      setSkills(
        data.skills || ""
      );

      setResumeText(
        data.resume_text || ""
      );

      setMessage(
        "Profile saved. Verifying database persistence..."
      );

      setMessageType("info");

      await loadProfile(true);
    } catch (error) {
      setMessage(
        error.message ||
          "Profile save failed."
      );

      setMessageType("error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell
      role="STUDENT"
      title="Resume AI"
    >
      <PageHero
        eyebrow="AI career tools"
        title="Resume Intelligence"
        description="Analyze your resume, extract useful profile data and verify what CampusLink stores in the database."
      />

      <div className="resume-layout">
        <section className="page-card">
          <div className="section-heading">
            <div>
              <span className="section-kicker">
                STEP 01
              </span>

              <h3>
                Upload your resume
              </h3>

              <p>
                PDF format recommended.
              </p>
            </div>

            <div className="status-dot">
              AI
            </div>
          </div>

          <label
            htmlFor="resume-upload"
            className={`upload-zone ${
              dragActive
                ? "upload-zone-active"
                : ""
            }`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() =>
              setDragActive(false)
            }
            onDrop={(event) => {
              event.preventDefault();
              setDragActive(false);

              handleFile(
                event.dataTransfer.files?.[0]
              );
            }}
          >
            <input
              id="resume-upload"
              type="file"
              accept=".pdf,application/pdf"
              className="hidden-file-input"
              onChange={(event) =>
                handleFile(
                  event.target.files?.[0]
                )
              }
            />

            <div className="upload-icon">
              ↑
            </div>

            <strong>
              {file
                ? file.name
                : "Drop your resume here"}
            </strong>

            <span>
              {file
                ? "PDF selected"
                : "or click to choose a PDF file"}
            </span>
          </label>

          <button
            type="button"
            className="primary-btn"
            onClick={analyzeResume}
            disabled={loading}
          >
            {loading && (
              <span className="spinner" />
            )}

            {loading
              ? "Analyzing Resume..."
              : "Analyze Resume"}
          </button>

          {message && (
            <div
              className={`status-message ${messageType}`}
            >
              <span>
                {messageType ===
                "success"
                  ? "✓"
                  : messageType ===
                    "error"
                  ? "!"
                  : "i"}
              </span>

              {message}
            </div>
          )}

          {analysis && (
            <div className="analysis-panel">
              <div className="analysis-header">
                <div>
                  <span className="section-kicker">
                    ANALYSIS COMPLETE
                  </span>

                  <h3>
                    Resume insights
                  </h3>
                </div>

                <div className="score-pill">
                  READY
                </div>
              </div>

              <div className="analysis-grid">
                <div className="metric-card">
                  <span>
                    Detected Skills
                  </span>

                  <strong>
                    {skills ||
                      "No skills detected"}
                  </strong>
                </div>

                <div className="metric-card">
                  <span>
                    Detected CGPA
                  </span>

                  <strong>
  {(analysis.cgpa ?? cgpa) || "Not detected"}
</strong>
                </div>
              </div>

              {analysis.suggestions
                ?.length > 0 && (
                <div className="suggestion-list">
                  <h4>
                    Suggestions
                  </h4>

                  {analysis.suggestions.map(
                    (
                      suggestion,
                      index
                    ) => (
                      <div
                        className="suggestion-item"
                        key={index}
                      >
                        <span>✓</span>
                        <p>
                          {suggestion}
                        </p>
                      </div>
                    )
                  )}
                </div>
              )}

              <div className="resume-maker-cta">
                <div>
                  <strong>Ready to build the final resume?</strong>
                  <p>Your extracted skills, academics and resume data will be carried into Resume Maker AI.</p>
                </div>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() =>
                    navigate("/student/resume", {
                      state: {
                        resumeDraft: {
                          analysis,
                          cgpa,
                          skills,
                          resumeText,
                        },
                      },
                    })
                  }
                >
                  Build Resume with AI →
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="page-card">
          <div className="section-heading">
            <div>
              <span className="section-kicker">
                STEP 02
              </span>

              <h3>
                Student profile
              </h3>

              <p>
                Edit the values before saving.
              </p>
            </div>

            <div className="status-dot">
              DB
            </div>
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label>
                CGPA
              </label>

              <input
                type="number"
                min="0"
                max="10"
                step="0.01"
                value={cgpa}
                onChange={(event) =>
                  setCgpa(
                    event.target.value
                  )
                }
                placeholder="8.2"
              />
            </div>

            <div className="form-field">
              <label>
                Skills
              </label>

              <input
                type="text"
                value={skills}
                onChange={(event) =>
                  setSkills(
                    event.target.value
                  )
                }
                placeholder="Python, SQL, React"
              />
            </div>
          </div>

          <div className="form-field">
            <label>
              Resume Text
            </label>

            <textarea
              rows="14"
              value={resumeText}
              onChange={(event) =>
                setResumeText(
                  event.target.value
                )
              }
              placeholder="Extracted resume text appears here..."
            />
          </div>

          <div className="button-row">
            <button
              type="button"
              className="primary-btn"
              onClick={saveProfile}
              disabled={saving}
            >
              {saving && (
                <span className="spinner" />
              )}

              {saving
                ? "Saving..."
                : "Save Profile"}
            </button>

            <button
              type="button"
              className="secondary-btn"
              onClick={() =>
                loadProfile(true)
              }
              disabled={saving}
            >
              ↻ Reload from Database
            </button>

            <button
              type="button"
              className="secondary-btn"
              onClick={() =>
                navigate("/student/resume")
              }
              disabled={saving}
            >
              Open Resume Maker AI →
            </button>
          </div>

          {verifiedAt && (
            <div className="verification-card">
              <div>
                <span className="verification-icon">
                  ✓
                </span>
              </div>

              <div>
                <strong>
                  Database verification
                </strong>

                <p>
                  Last verified:{" "}
                  {verifiedAt}
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
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
    <div className="login-page">
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
          <span>
            Secure workspace
          </span>

          <span>
            JWT authentication
          </span>

          <span>
            Role-based access
          </span>
        </div>
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
      <Routes>




        {/* LOGIN */}

        <Route
          path="/login"
          element={<Login />}
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
            <ProtectedRoute
              allowedRoles={["STUDENT"]}
            >
              <StudentDocuments />
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
          element={
            getRole() ? (
              <Navigate
                to={getDashboardPath(
                  getRole()
                )}
                replace
              />
            ) : (
              <Navigate
                to="/login"
                replace
              />
            )
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

      {/* Global Quantum AI assistant: one instance outside <Routes> so it works on every page. */}
      <QuantumAI />
    </BrowserRouter>
  );
}

export default App;