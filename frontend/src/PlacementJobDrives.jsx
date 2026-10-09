import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

function getToken() {
  return (
    localStorage.getItem("campuslink_token") ||
    localStorage.getItem("access_token") ||
    ""
  );
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

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text || null;
  }

  if (!response.ok) {
    const detail =
      typeof data === "object" && data !== null
        ? data.detail || data.message
        : data;
    throw new Error(detail || `Request failed (${response.status})`);
  }

  return data;
}

function emptyForm() {
  return {
    company_id: "",
    title: "",
    description: "",
    job_type: "FULL_TIME",
    location: "",
    salary_package: "",
    minimum_cgpa: "",
    required_skills: "",
    application_deadline: "",
  };
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatStatus(value) {
  return String(value || "UNKNOWN")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/(^|\s)\S/g, (char) => char.toUpperCase());
}

function icon(type) {
  const paths = {
    grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
    users:
      "M8.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7-1a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2.5 20.5v-1.2c0-3 2.6-5 6-5s6 2 6 5v1.2h-12Zm12.5 0v-1c0-1.8-.7-3.4-2-4.5 3.5.1 6.5 1.9 6.5 4.7v.8H15Z",
    briefcase:
      "M8 7V5.5A2.5 2.5 0 0 1 10.5 3h3A2.5 2.5 0 0 1 16 5.5V7h3.5A2.5 2.5 0 0 1 22 9.5v8A2.5 2.5 0 0 1 19.5 20h-15A2.5 2.5 0 0 1 2 17.5v-8A2.5 2.5 0 0 1 4.5 7H8Zm2 0h4V5.5a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5V7ZM2 12h20v2H2v-2Z",
    bell:
      "M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Zm-7 12a2 2 0 0 0 4 0h-4Z",
    arrow: "M5 12h12m-5-5 5 5-5 5",
    plus: "M12 5v14M5 12h14",
    refresh: "M20 11a8 8 0 1 0 2 5.3M20 5v6h-6",
    search:
      "m20 20-3.8-3.8m1.3-5.2a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z",
    close: "m7 7 10 10M17 7 7 17",
    send: "m4 4 17 8-17 8 3-8-3-8Zm3 8h8",
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="rsd-icon">
      <path d={paths[type] || paths.grid} />
    </svg>
  );
}

function normalizeStudent(student, applicationCount) {
  const profile = student?.profile || student?.student_profile || student;
  const first = student?.first_name || profile?.first_name || "";
  const last = student?.last_name || profile?.last_name || "";
  const name =
    student?.full_name ||
    student?.name ||
    `${first} ${last}`.trim() ||
    `Student #${student?.id ?? "—"}`;

  const cgpa = profile?.cgpa ?? student?.cgpa ?? null;
  const skills = String(profile?.skills ?? student?.skills ?? "").trim();
  const resume = String(
    profile?.resume_text ?? student?.resume_text ?? student?.resume ?? ""
  ).trim();
  const course =
    profile?.course ||
    profile?.program ||
    student?.course ||
    student?.program ||
    student?.branch ||
    "—";
  const year =
    profile?.year ||
    profile?.graduation_year ||
    student?.year ||
    student?.graduation_year ||
    "—";

  const missing = [];
  if (cgpa == null || cgpa === "") missing.push("CGPA");
  if (!skills) missing.push("Skills");
  if (!resume) missing.push("Resume");

  const githubUrl =
    profile?.github_url ||
    profile?.github ||
    student?.github_url ||
    student?.github ||
    "";

  return {
    id: student?.id,
    name,
    email: student?.email || profile?.email || "",
    course,
    year,
    cgpa,
    skills,
    githubUrl,
    complete: missing.length === 0,
    missing,
    applications: applicationCount || 0,
    initial: name.charAt(0).toUpperCase(),
  };
}

function calculateJobScore(student) {
  const skillItems = String(student?.skills || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const skillScore = Math.min(skillItems.length * 12.5, 100);

  const cgpa = Number(student?.cgpa);
  const educationScore = Number.isFinite(cgpa)
    ? Math.min(Math.max(cgpa * 10, 0), 100)
    : 25;

  const profileScore = student?.complete ? 100 : Math.max(100 - ((student?.missing?.length || 0) * 20), 20);
  const projectEvidenceScore = student?.githubUrl ? 85 : 25;
  const applicationEvidence = Math.min((student?.applications || 0) * 20, 100);

  const score =
    skillScore * 0.30 +
    projectEvidenceScore * 0.20 +
    profileScore * 0.20 +
    educationScore * 0.15 +
    applicationEvidence * 0.05 +
    (student?.githubUrl ? 100 : 20) * 0.10;

  return Math.round(Math.min(Math.max(score, 0), 100));
}

const CSS = `
:root {
  --rsd-ink: #12213a;
  --rsd-muted: #6f7f97;
  --rsd-border: #e7ecf3;
  --rsd-soft: #f7f9fc;
  --rsd-brand: #315efb;
  --rsd-brand-soft: #eef3ff;
  --rsd-success: #159a67;
  --rsd-success-soft: #eaf9f2;
  --rsd-warning: #b8750b;
  --rsd-warning-soft: #fff6df;
  --rsd-danger: #c23b4d;
  --rsd-danger-soft: #fff0f2;
}

* { box-sizing: border-box; }
.rsd-page {
  min-height: 100vh;
  color: var(--rsd-ink);
  background: #f5f7fb;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.rsd-topbar {
  height: 74px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 0 30px;
  background: rgba(255,255,255,.96);
  border-bottom: 1px solid var(--rsd-border);
  position: sticky;
  top: 0;
  z-index: 20;
  backdrop-filter: blur(14px);
}
.rsd-brand { display:flex; align-items:center; gap:11px; min-width: 0; }
.rsd-mark {
  width: 38px; height:38px; border-radius: 12px; display:grid; place-items:center;
  color:#fff; background: linear-gradient(135deg,#233fba,#4d72ff); font-weight:900;
  box-shadow: 0 8px 18px rgba(49,94,251,.22);
}
.rsd-brand strong { display:block; font-size:15px; letter-spacing:-.02em; }
.rsd-brand small { display:block; margin-top:1px; color:var(--rsd-muted); font-size:10px; }
.rsd-header-actions { display:flex; align-items:center; gap:8px; }
.rsd-btn {
  border:1px solid var(--rsd-border); background:#fff; color:var(--rsd-ink); border-radius:10px;
  min-height:38px; padding:0 13px; display:inline-flex; align-items:center; justify-content:center;
  gap:7px; font-size:11px; font-weight:800; cursor:pointer; text-decoration:none;
  transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease;
}
.rsd-btn:hover { transform:translateY(-1px); box-shadow:0 6px 18px rgba(18,33,58,.07); border-color:#d5ddea; }
.rsd-btn:disabled { opacity:.55; cursor:not-allowed; transform:none; box-shadow:none; }
.rsd-btn.primary { background:var(--rsd-brand); border-color:var(--rsd-brand); color:#fff; box-shadow:0 8px 18px rgba(49,94,251,.18); }
.rsd-btn.ghost { background:transparent; }
.rsd-btn.danger { color:var(--rsd-danger); background:var(--rsd-danger-soft); border-color:#ffd4da; }
.rsd-btn.success { color:var(--rsd-success); background:var(--rsd-success-soft); border-color:#c8efd9; }
.rsd-btn.small { min-height:31px; padding:0 10px; font-size:10px; border-radius:8px; }
.rsd-icon { width:15px; height:15px; fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }

.rsd-layout { display:grid; grid-template-columns:218px minmax(0,1fr); min-height:calc(100vh - 74px); }
.rsd-sidebar { background:#fff; border-right:1px solid var(--rsd-border); padding:22px 14px; }
.rsd-sidebar-label { padding:0 10px 10px; font-size:9px; font-weight:900; letter-spacing:.16em; color:#9ba8bb; }
.rsd-nav { display:grid; gap:4px; }
.rsd-nav a { text-decoration:none; color:#63738b; padding:10px 11px; border-radius:10px; display:flex; align-items:center; gap:9px; font-size:11px; font-weight:800; }
.rsd-nav a:hover { background:#f8faff; color:var(--rsd-ink); }
.rsd-nav a.active { background:var(--rsd-brand-soft); color:var(--rsd-brand); }
.rsd-nav a .rsd-icon { width:14px; height:14px; }

.rsd-main { padding:28px 30px 40px; min-width:0; }
.rsd-breadcrumb { display:flex; align-items:center; gap:7px; color:#93a0b4; font-size:10px; font-weight:800; margin-bottom:12px; }
.rsd-breadcrumb strong { color:#5e6e84; }
.rsd-hero { display:flex; justify-content:space-between; gap:20px; align-items:flex-end; margin-bottom:22px; }
.rsd-hero-kicker { color:var(--rsd-brand); font-weight:900; font-size:9px; letter-spacing:.16em; }
.rsd-hero h1 { margin:6px 0 0; font-size:30px; line-height:1.05; letter-spacing:-.04em; }
.rsd-hero p { margin:8px 0 0; max-width:720px; color:var(--rsd-muted); font-size:12px; line-height:1.65; }
.rsd-hero-actions { display:flex; gap:8px; flex-wrap:wrap; }

.rsd-alert { margin-bottom:16px; padding:11px 13px; border-radius:11px; font-size:11px; line-height:1.5; display:flex; align-items:center; justify-content:space-between; gap:12px; }
.rsd-alert.error { color:#9d2f40; background:#fff4f5; border:1px solid #ffd8dd; }
.rsd-alert.success { color:#12794f; background:#f0fbf5; border:1px solid #caefda; }
.rsd-alert button { border:0; background:transparent; color:inherit; font-weight:900; cursor:pointer; }

.rsd-stats { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; margin-bottom:18px; }
.rsd-stat { padding:16px; background:#fff; border:1px solid var(--rsd-border); border-radius:14px; box-shadow:0 7px 20px rgba(18,33,58,.035); }
.rsd-stat-top { display:flex; justify-content:space-between; gap:10px; align-items:center; }
.rsd-stat-label { font-size:9px; font-weight:900; letter-spacing:.1em; color:#91a0b6; }
.rsd-stat-icon { width:30px; height:30px; display:grid; place-items:center; border-radius:9px; background:var(--rsd-soft); color:var(--rsd-brand); }
.rsd-stat strong { display:block; margin-top:11px; font-size:25px; line-height:1; letter-spacing:-.04em; }
.rsd-stat small { display:block; margin-top:6px; color:var(--rsd-muted); font-size:10px; }

.rsd-section-grid { display:grid; grid-template-columns:minmax(0,1.65fr) minmax(300px,.72fr); gap:16px; align-items:start; }
.rsd-card { background:#fff; border:1px solid var(--rsd-border); border-radius:16px; box-shadow:0 8px 24px rgba(18,33,58,.035); }
.rsd-card + .rsd-card { margin-top:16px; }
.rsd-card-head { padding:17px 18px 13px; display:flex; justify-content:space-between; align-items:flex-start; gap:14px; }
.rsd-card-title { margin:0; font-size:15px; letter-spacing:-.025em; }
.rsd-card-sub { margin:5px 0 0; color:var(--rsd-muted); font-size:10px; line-height:1.55; }
.rsd-count { border:1px solid var(--rsd-border); background:var(--rsd-soft); color:#63738b; padding:5px 8px; border-radius:999px; font-size:9px; font-weight:900; white-space:nowrap; }

.rsd-student-toolbar { margin:0 18px 13px; display:grid; grid-template-columns:minmax(0,1fr) 130px 142px; gap:8px; }
.rsd-input, .rsd-select {
  width:100%; min-height:37px; border:1px solid var(--rsd-border); border-radius:9px; background:#fff; color:var(--rsd-ink);
  outline:none; padding:0 11px; font:inherit; font-size:11px;
}
.rsd-input:focus, .rsd-select:focus { border-color:#9bb2ff; box-shadow:0 0 0 3px rgba(49,94,251,.08); }

.rsd-table-wrap { overflow:auto; border-top:1px solid #edf1f6; }
.rsd-table { width:100%; border-collapse:collapse; min-width:760px; }
.rsd-table th { text-align:left; padding:10px 18px; font-size:8px; letter-spacing:.12em; color:#99a5b7; font-weight:900; border-bottom:1px solid #edf1f6; white-space:nowrap; }
.rsd-table td { padding:12px 18px; border-bottom:1px solid #f0f3f7; font-size:10px; vertical-align:middle; }
.rsd-table tr:last-child td { border-bottom:0; }
.rsd-student { display:flex; align-items:center; gap:9px; min-width:190px; }
.rsd-avatar { width:34px; height:34px; border-radius:10px; display:grid; place-items:center; background:linear-gradient(135deg,#edf2ff,#dbe5ff); color:#3658ba; font-size:11px; font-weight:900; flex:0 0 auto; }
.rsd-student strong { display:block; font-size:11px; color:var(--rsd-ink); }
.rsd-student span { display:block; margin-top:2px; color:#94a0b1; font-size:9px; }
.rsd-course { color:#55667e; font-size:10px; }
.rsd-cgpa { font-weight:900; }
.rsd-cgpa.missing { color:#a3aebb; font-weight:700; }
.rsd-chip { display:inline-flex; align-items:center; gap:4px; padding:5px 7px; border-radius:999px; font-size:8px; font-weight:900; }
.rsd-chip.ready { color:var(--rsd-success); background:var(--rsd-success-soft); }
.rsd-chip.attention { color:var(--rsd-warning); background:var(--rsd-warning-soft); }
.rsd-mini-skills { max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#63738b; }
.rsd-empty { padding:48px 20px; text-align:center; }
.rsd-empty .rsd-empty-icon { width:44px; height:44px; margin:0 auto 12px; border-radius:13px; background:var(--rsd-soft); color:#8f9cb0; display:grid; place-items:center; }
.rsd-empty strong { display:block; font-size:12px; }
.rsd-empty p { margin:5px auto 0; max-width:430px; color:var(--rsd-muted); font-size:10px; line-height:1.6; }

.rsd-side-card { padding:16px; }
.rsd-side-head { display:flex; justify-content:space-between; align-items:flex-start; gap:10px; margin-bottom:13px; }
.rsd-side-title { margin:0; font-size:14px; letter-spacing:-.02em; }
.rsd-side-sub { margin:5px 0 0; color:var(--rsd-muted); font-size:10px; line-height:1.55; }
.rsd-progress { height:7px; background:#edf1f6; border-radius:999px; overflow:hidden; margin:12px 0 9px; }
.rsd-progress span { display:block; height:100%; border-radius:999px; background:linear-gradient(90deg,#315efb,#5e7cff); }
.rsd-progress-meta { display:flex; justify-content:space-between; gap:10px; color:#718197; font-size:9px; font-weight:800; }
.rsd-quick { display:grid; gap:8px; margin-top:12px; }
.rsd-quick a { text-decoration:none; color:#41536d; border:1px solid var(--rsd-border); padding:10px; border-radius:9px; display:flex; justify-content:space-between; align-items:center; gap:10px; font-size:10px; font-weight:800; }
.rsd-quick a:hover { border-color:#d5ddea; background:#fafbfe; }
.rsd-list { display:grid; gap:9px; }
.rsd-drive-mini { border:1px solid var(--rsd-border); border-radius:11px; padding:11px; }
.rsd-drive-mini-top { display:flex; justify-content:space-between; gap:8px; align-items:flex-start; }
.rsd-drive-mini strong { display:block; font-size:10px; }
.rsd-drive-mini small { display:block; margin-top:3px; color:var(--rsd-muted); font-size:8px; }
.rsd-status { padding:4px 7px; border-radius:999px; font-size:8px; font-weight:900; }
.rsd-status.open { color:var(--rsd-success); background:var(--rsd-success-soft); }
.rsd-status.paused { color:var(--rsd-warning); background:var(--rsd-warning-soft); }
.rsd-status.closed { color:var(--rsd-danger); background:var(--rsd-danger-soft); }
.rsd-status.other { color:#69788f; background:#f2f5f8; }
.rsd-drive-mini-meta { display:flex; flex-wrap:wrap; gap:5px; margin-top:9px; }
.rsd-drive-mini-meta span { padding:4px 6px; border-radius:6px; background:#f7f9fc; color:#67778c; font-size:8px; border:1px solid #edf1f6; }

.rsd-reminder-box { border:1px solid #dbe5ff; background:linear-gradient(180deg,#f7f9ff,#eef3ff); border-radius:12px; padding:13px; }
.rsd-reminder-status { display:flex; gap:6px; align-items:center; color:#2850c7; font-size:9px; font-weight:900; }
.rsd-status-dot { width:7px; height:7px; border-radius:50%; background:#28a566; box-shadow:0 0 0 4px rgba(40,165,102,.10); }
.rsd-reminder-box h3 { margin:10px 0 0; font-size:13px; }
.rsd-reminder-box p { margin:6px 0 12px; color:#64748b; font-size:9px; line-height:1.55; }
.rsd-reminder-result { margin-top:9px; padding:8px 9px; border-radius:8px; background:#fff; border:1px solid #dbe5ff; color:#38548e; font-size:9px; line-height:1.5; }
.rsd-application-list { display:grid; gap:9px; padding:0 18px 18px; }
.rsd-application-row { display:grid; grid-template-columns:minmax(0,1.4fr) minmax(140px,.85fr) minmax(110px,.65fr) auto; gap:12px; align-items:center; padding:12px; border:1px solid #e7edf4; border-radius:12px; background:#fbfdff; }
.rsd-application-row:hover { border-color:#c8d7ff; box-shadow:0 8px 20px rgba(49,94,251,.06); }
.rsd-application-candidate { display:flex; align-items:center; gap:9px; min-width:0; }
.rsd-application-candidate .rsd-avatar { width:32px; height:32px; border-radius:9px; }
.rsd-application-candidate strong { display:block; font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.rsd-application-candidate span { display:block; margin-top:2px; color:#8b98aa; font-size:9px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.rsd-application-drive strong { display:block; font-size:10px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.rsd-application-drive span { display:block; margin-top:2px; color:#8996a9; font-size:9px; }
.rsd-application-date { color:#6b7b91; font-size:9px; }
.rsd-review-btn { min-height:33px; padding:0 11px; border:1px solid #cfdcff; background:#eef3ff; color:#2f56d8; border-radius:9px; font-size:10px; font-weight:900; cursor:pointer; white-space:nowrap; }
.rsd-review-btn:hover { background:#e6edff; }
.rsd-review-drawer-backdrop { position:fixed; inset:0; z-index:95; background:rgba(15,23,42,.36); display:flex; justify-content:flex-end; }
.rsd-review-drawer { width:min(620px,100%); height:100%; overflow:auto; background:#fff; box-shadow:-20px 0 55px rgba(15,23,42,.18); padding:24px; }
.rsd-review-head { display:flex; justify-content:space-between; gap:12px; align-items:flex-start; padding-bottom:16px; border-bottom:1px solid #e8edf4; }
.rsd-review-kicker { color:#315efb; font-size:9px; font-weight:900; letter-spacing:.14em; }
.rsd-review-head h2 { margin:6px 0 3px; font-size:21px; letter-spacing:-.03em; }
.rsd-review-head p { margin:0; color:#74839a; font-size:10px; }
.rsd-review-close { width:34px; height:34px; border:0; border-radius:9px; background:#f4f6f9; color:#63738b; display:grid; place-items:center; cursor:pointer; font-size:18px; }
.rsd-review-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:9px; margin-top:16px; }
.rsd-review-card { border:1px solid #e7edf4; border-radius:11px; padding:11px; background:#fbfcfe; }
.rsd-review-card.full { grid-column:1/-1; }
.rsd-review-card span { display:block; color:#93a0b2; font-size:8px; text-transform:uppercase; letter-spacing:.08em; font-weight:900; }
.rsd-review-card strong { display:block; margin-top:4px; color:#17243d; font-size:11px; line-height:1.45; }
.rsd-review-section-title { margin:20px 0 9px; font-size:12px; }
.rsd-review-actions { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
.rsd-review-actions button { min-height:40px; border-radius:9px; border:1px solid #dde5ef; background:#fff; color:#334155; font-size:10px; font-weight:900; cursor:pointer; }
.rsd-review-actions button.primary { background:#315efb; color:#fff; border-color:#315efb; }
.rsd-review-actions button.danger { background:#fff4f5; color:#b33b4d; border-color:#ffd6dc; }
.rsd-review-actions button.success { background:#effaf4; color:#14815a; border-color:#cdeedc; }
.rsd-review-actions button:disabled { opacity:.55; cursor:not-allowed; }
.rsd-review-current { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:16px; padding:11px 12px; border-radius:10px; background:#f7f9fc; border:1px solid #e8edf4; }
.rsd-review-current span { color:#7b899d; font-size:9px; }
.rsd-review-current strong { font-size:10px; }

.rsd-modal-backdrop { position:fixed; inset:0; z-index:80; background:rgba(18,33,58,.34); display:grid; place-items:center; padding:20px; }
.rsd-modal { width:min(720px,100%); max-height:90vh; overflow:auto; background:#fff; border-radius:18px; box-shadow:0 24px 70px rgba(18,33,58,.24); }
.rsd-modal-head { padding:18px 20px 13px; display:flex; justify-content:space-between; gap:10px; border-bottom:1px solid var(--rsd-border); }
.rsd-modal-head h2 { margin:0; font-size:16px; }
.rsd-modal-head p { margin:5px 0 0; color:var(--rsd-muted); font-size:10px; }
.rsd-close { border:0; width:32px; height:32px; border-radius:9px; background:#f6f8fb; color:#6a788d; cursor:pointer; display:grid; place-items:center; }
.rsd-form { padding:17px 20px 20px; display:grid; gap:10px; }
.rsd-form-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
.rsd-field { display:grid; gap:5px; }
.rsd-field.full { grid-column:1/-1; }
.rsd-field label { font-size:8px; text-transform:uppercase; letter-spacing:.09em; font-weight:900; color:#60708a; }
.rsd-field input, .rsd-field textarea, .rsd-field select { width:100%; border:1px solid var(--rsd-border); border-radius:9px; padding:9px 10px; background:#fff; color:var(--rsd-ink); font:inherit; font-size:10px; outline:none; }
.rsd-field textarea { min-height:78px; resize:vertical; }
.rsd-modal-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:2px; }

.rsd-rank-badge {
  display:inline-flex;
  align-items:center;
  justify-content:center;
  min-width:38px;
  padding:5px 8px;
  border-radius:999px;
  background:var(--rsd-brand-soft);
  color:var(--rsd-brand);
  font-size:9px;
  font-weight:900;
}
.rsd-score {
  font-size:11px;
  font-weight:900;
}
.rsd-project-btn {
  border:1px solid #cfdcff;
  background:#eef3ff;
  color:#2f56d8;
  border-radius:8px;
  min-height:32px;
  padding:0 10px;
  font-size:9px;
  font-weight:900;
  cursor:pointer;
  white-space:nowrap;
}
.rsd-project-btn:hover { background:#e4ebff; }
.rsd-project-btn:disabled { opacity:.55; cursor:not-allowed; }
.rsd-project-modal {
  width:min(860px,100%);
  max-height:90vh;
  overflow:auto;
  background:#fff;
  border-radius:18px;
  box-shadow:0 24px 70px rgba(18,33,58,.24);
}
.rsd-project-head {
  padding:20px;
  display:flex;
  justify-content:space-between;
  gap:14px;
  border-bottom:1px solid var(--rsd-border);
}
.rsd-project-kicker {
  color:var(--rsd-brand);
  font-size:9px;
  font-weight:900;
  letter-spacing:.14em;
}
.rsd-project-head h2 { margin:6px 0 3px; font-size:19px; }
.rsd-project-head p { margin:0; color:var(--rsd-muted); font-size:10px; }
.rsd-project-score-box {
  padding:16px 20px;
  background:linear-gradient(180deg,#f7f9ff,#eef3ff);
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:16px;
}
.rsd-project-score-box span { display:block; color:#6b7b91; font-size:8px; font-weight:900; letter-spacing:.1em; }
.rsd-project-score-box strong { display:block; margin-top:3px; font-size:30px; }
.rsd-project-grid {
  padding:18px 20px 0;
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:10px;
}
.rsd-project-grid > div {
  border:1px solid var(--rsd-border);
  border-radius:11px;
  padding:11px;
  background:#fbfcfe;
}
.rsd-project-grid span { display:block; color:#93a0b2; font-size:8px; text-transform:uppercase; letter-spacing:.08em; font-weight:900; }
.rsd-project-grid strong { display:block; margin-top:4px; color:#17243d; font-size:10px; line-height:1.4; word-break:break-word; }
.rsd-project-analysis { padding:18px 20px 20px; }
.rsd-project-analysis h3 { margin:0 0 9px; font-size:12px; }
.rsd-project-analysis pre {
  margin:0;
  padding:14px;
  border-radius:11px;
  background:#0f172a;
  color:#dbe5f4;
  overflow:auto;
  white-space:pre-wrap;
  font-size:9px;
  line-height:1.5;
}
.rsd-project-url {
  display:inline-block;
  margin-top:7px;
  color:#315efb;
  font-size:9px;
  word-break:break-all;
}

@media (max-width:1100px) {
  .rsd-stats { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .rsd-section-grid { grid-template-columns:1fr; }
}
@media (max-width:820px) {
  .rsd-layout { grid-template-columns:1fr; }
  .rsd-sidebar { display:none; }
  .rsd-main { padding:20px 16px 32px; }
  .rsd-topbar { padding:0 16px; }
  .rsd-hero { align-items:flex-start; flex-direction:column; }
  .rsd-student-toolbar { grid-template-columns:1fr; }
}
@media (max-width:620px) {
  .rsd-stats { grid-template-columns:1fr; }
  .rsd-header-actions a { display:none; }
  .rsd-hero h1 { font-size:25px; }
  .rsd-form-grid { grid-template-columns:1fr; }
  .rsd-field.full { grid-column:auto; }
}
`;

export default function PlacementJobDrives() {
  const [jobs, setJobs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [applications, setApplications] = useState([]);
  const [students, setStudents] = useState([]);
  const [studentsAvailable, setStudentsAvailable] = useState(true);

  const [query, setQuery] = useState("");
  const [readinessFilter, setReadinessFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reminderResult, setReminderResult] = useState("");
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [applicationAction, setApplicationAction] = useState("");
  const [projectAnalysis, setProjectAnalysis] = useState(null);
  const [projectLoading, setProjectLoading] = useState(false);

  const companyMap = useMemo(
    () => new Map(companies.map((company) => [String(company.id), company])),
    [companies]
  );

  const applicationCounts = useMemo(() => {
    const counts = new Map();
    for (const application of applications) {
      const studentId =
        application?.student_id ??
        application?.student?.id ??
        application?.user_id ??
        application?.applicant_id;
      if (studentId == null) continue;
      const key = String(studentId);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
  }, [applications]);

  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((student) => {
      const haystack = [
        student.name,
        student.email,
        student.course,
        student.year,
        student.skills,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !q || haystack.includes(q);
      const matchesReadiness =
        readinessFilter === "ALL" ||
        (readinessFilter === "READY" && student.complete) ||
        (readinessFilter === "ATTENTION" && !student.complete);
      return matchesSearch && matchesReadiness;
    });
  }, [students, query, readinessFilter]);

  const rankedStudents = useMemo(() => {
    return [...filteredStudents]
      .map((student) => ({
        ...student,
        jobScore: calculateJobScore(student),
      }))
      .sort((a, b) => b.jobScore - a.jobScore)
      .map((student, index) => ({
        ...student,
        jobReadinessRank: index + 1,
      }));
  }, [filteredStudents]);

  async function openProjectAnalysis(student) {
    if (!student?.githubUrl) {
      setMessage("This student has no GitHub repository saved in the profile.");
      return;
    }

    try {
      setProjectLoading(true);
      setProjectAnalysis(null);
      setError("");

      const data = await api("/ai/member4/recruiter/project-analysis", {
        method: "POST",
        body: JSON.stringify({
          github_url: student.githubUrl,
          job_context: "",
        }),
      });

      setProjectAnalysis({
        student,
        ...data,
      });
    } catch (err) {
      setError(err.message || "GitHub project analysis failed.");
    } finally {
      setProjectLoading(false);
    }
  }

  const visibleJobs = useMemo(() => {
    const q = statusFilter === "ALL" ? "" : statusFilter.toLowerCase();
    return jobs
      .filter((job) => {
        if (!q) return true;
        return String(job.drive_status || "").toLowerCase() === q;
      })
      .slice(0, 5);
  }, [jobs, statusFilter]);

  const reviewApplications = useMemo(() => {
    const priority = { APPLIED: 0, SHORTLISTED: 1, INTERVIEW: 2, SELECTED: 3, OFFERED: 4, ACCEPTED: 5, REJECTED: 6, WITHDRAWN: 7 };
    return [...applications]
      .sort((a, b) => (priority[String(a.status || "APPLIED")] ?? 99) - (priority[String(b.status || "APPLIED")] ?? 99))
      .slice(0, 8);
  }, [applications]);

  const activeDrives = jobs.filter((job) => job.drive_status === "OPEN").length;
  const readyCount = students.filter((student) => student.complete).length;
  const incompleteCount = students.filter((student) => !student.complete).length;
  const readiness = students.length
    ? Math.round((readyCount / students.length) * 100)
    : 0;

  async function load() {
    setLoading(true);
    setError("");

    const [companiesResult, jobsResult, applicationsResult, studentsResult] =
      await Promise.allSettled([
        api("/companies/"),
        api("/job-drives/"),
        api("/applications/"),
        api("/students/"),
      ]);

    const softFailures = [];

    if (companiesResult.status === "fulfilled") {
      setCompanies(Array.isArray(companiesResult.value) ? companiesResult.value : []);
    } else {
      softFailures.push("company data");
      setCompanies([]);
    }

    if (jobsResult.status === "fulfilled") {
      setJobs(Array.isArray(jobsResult.value) ? jobsResult.value : []);
    } else {
      softFailures.push("job drive data");
      setJobs([]);
    }

    if (applicationsResult.status === "fulfilled") {
      setApplications(
        Array.isArray(applicationsResult.value) ? applicationsResult.value : []
      );
    } else {
      softFailures.push("application data");
      setApplications([]);
    }

    if (studentsResult.status === "fulfilled") {
      const raw = Array.isArray(studentsResult.value)
        ? studentsResult.value
        : [];
      const normalized = raw.map((student) => {
        const profileId = student?.id;
        return normalizeStudent(
          student,
          applicationCounts.get(String(profileId)) || 0
        );
      });
      setStudents(normalized);
      setStudentsAvailable(true);
    } else {
      setStudents([]);
      setStudentsAvailable(false);
    }

    // Keep the page usable even if one optional recruiter endpoint is unavailable.
    // The UI only surfaces a gentle state for missing student access.
    if (softFailures.length === 1 && softFailures[0] === "job drive data") {
      setMessage("Some drive information is temporarily unavailable.");
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
    // applicationCounts is intentionally not a dependency because the initial
    // student normalization is only a presentation enhancement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateForm(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function createJob(event) {
    event.preventDefault();
    if (!form.company_id || !form.title.trim()) {
      setError("Company and job title are required.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      await api("/job-drives/", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          company_id: Number(form.company_id),
          minimum_cgpa:
            form.minimum_cgpa === "" ? null : Number(form.minimum_cgpa),
          application_deadline: form.application_deadline || null,
        }),
      });
      setForm(emptyForm());
      setShowCreate(false);
      setMessage("Job drive published successfully.");
      await load();
    } catch (err) {
      setError(err.message || "Unable to create job drive.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id, driveStatus) {
    setAction(`status-${id}`);
    setError("");
    setMessage("");
    try {
      await api(`/job-drives/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ drive_status: driveStatus }),
      });
      setMessage(`Drive moved to ${formatStatus(driveStatus)}.`);
      await load();
    } catch (err) {
      setError(err.message || "Unable to update drive status.");
    } finally {
      setAction("");
    }
  }

  async function runManualReminder() {
    setAction("reminder");
    setError("");
    setReminderResult("");
    try {
      const result = await api("/placement-reminders/run", { method: "POST" });
      const created = Array.isArray(result) ? result : [];
      setReminderResult(
        created.length
          ? `${created.length} new reminder notification${created.length === 1 ? "" : "s"} created.`
          : "No new reminders were created. The 24-hour cooldown may still be active."
      );
    } catch (err) {
      setError(err.message || "Unable to run the reminder engine.");
    } finally {
      setAction("");
    }
  }

  async function updateApplicationStatus(applicationId, status) {
    try {
      setApplicationAction(`${applicationId}-${status}`);
      setError("");
      setMessage("");
      await api(`/applications/${applicationId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setApplications((current) =>
        current.map((application) =>
          application.id === applicationId
            ? { ...application, status }
            : application
        )
      );
      setSelectedApplication((current) =>
        current && current.id === applicationId
          ? { ...current, status }
          : current
      );
      setMessage(`Application #${applicationId} moved to ${formatStatus(status)}.`);
    } catch (err) {
      setError(err.message || "Unable to update the application status.");
    } finally {
      setApplicationAction("");
    }
  }

  function studentForApplication(application) {
    const id = application?.student_id ?? application?.student?.id ?? application?.user_id ?? application?.applicant_id;
    return students.find((student) => String(student.id) === String(id));
  }

  function jobForApplication(application) {
    return jobs.find((job) => String(job.id) === String(application?.job_drive_id));
  }

  return (
    <div className="rsd-page">
      <style>{CSS}</style>

      <header className="rsd-topbar">
        <div className="rsd-brand">
          <div className="rsd-mark">C</div>
          <div>
            <strong>CampusLink</strong>
            <small>Recruiter workspace</small>
          </div>
        </div>

        <div className="rsd-header-actions">
          <Link className="rsd-btn" to="/recruiter/applications">
            {icon("briefcase")} Applications
          </Link>
          <Link className="rsd-btn" to="/recruiter/notifications">
            {icon("bell")} Notifications
          </Link>
          <button className="rsd-btn primary" type="button" onClick={() => setShowCreate(true)}>
            {icon("plus")} Create drive
          </button>
        </div>
      </header>

      <div className="rsd-layout">
        <aside className="rsd-sidebar">
          <div className="rsd-sidebar-label">RECRUITER</div>
          <nav className="rsd-nav">
            <Link to="/recruiter">{icon("grid")} Dashboard</Link>
            <Link className="active" to="/recruiter/jobs">{icon("users")} Students</Link>
            <Link to="/recruiter/company">{icon("briefcase")} Company</Link>
            <Link to="/recruiter/jobs">{icon("briefcase")} Job drives</Link>
            <Link to="/recruiter/applications">{icon("users")} Applications</Link>
            <Link to="/recruiter/ai-candidates">{icon("grid")} AI candidates</Link>
            <Link to="/recruiter/interviews">{icon("grid")} Interviews</Link>
            <Link to="/recruiter/offers">{icon("grid")} Offers</Link>
          </nav>
        </aside>

        <main className="rsd-main">
          <div className="rsd-breadcrumb">
            <span>Recruiter</span>
            <span>/</span>
            <strong>Students</strong>
          </div>

          <section className="rsd-hero">
            <div>
              <div className="rsd-hero-kicker">STUDENT PIPELINE</div>
              <h1>Students & placement readiness</h1>
              <p>
                Get a clean view of candidate readiness, active drives and the next action your recruiting team should take.
              </p>
            </div>
            <div className="rsd-hero-actions">
              <button className="rsd-btn" type="button" onClick={load} disabled={loading}>
                {icon("refresh")} {loading ? "Refreshing…" : "Refresh"}
              </button>
              <button className="rsd-btn primary" type="button" onClick={runManualReminder} disabled={action === "reminder"}>
                {icon("send")} {action === "reminder" ? "Sending…" : "Send reminders"}
              </button>
            </div>
          </section>

          {error && (
            <div className="rsd-alert error">
              <span>{error}</span>
              <button type="button" onClick={() => setError("")}>Dismiss</button>
            </div>
          )}
          {message && (
            <div className="rsd-alert success">
              <span>{message}</span>
              <button type="button" onClick={() => setMessage("")}>Dismiss</button>
            </div>
          )}

          <section className="rsd-stats">
            <div className="rsd-stat">
              <div className="rsd-stat-top"><span className="rsd-stat-label">TOTAL STUDENTS</span><span className="rsd-stat-icon">{icon("users")}</span></div>
              <strong>{studentsAvailable ? students.length : "—"}</strong>
              <small>Students visible to this recruiter</small>
            </div>
            <div className="rsd-stat">
              <div className="rsd-stat-top"><span className="rsd-stat-label">PROFILE READY</span><span className="rsd-stat-icon">{icon("grid")}</span></div>
              <strong>{students.length ? `${readiness}%` : "—"}</strong>
              <small>{students.length ? `${readyCount} ready · ${incompleteCount} need attention` : "Readiness data unavailable"}</small>
            </div>
            <div className="rsd-stat">
              <div className="rsd-stat-top"><span className="rsd-stat-label">ACTIVE DRIVES</span><span className="rsd-stat-icon">{icon("briefcase")}</span></div>
              <strong>{activeDrives}</strong>
              <small>Open opportunities for applicants</small>
            </div>
            <div className="rsd-stat">
              <div className="rsd-stat-top"><span className="rsd-stat-label">APPLICATIONS</span><span className="rsd-stat-icon">{icon("users")}</span></div>
              <strong>{applications.length}</strong>
              <small>Total application records returned</small>
            </div>
          </section>

          <div className="rsd-section-grid">
            <div>
              <section className="rsd-card">
                <div className="rsd-card-head">
                  <div>
                    <h2 className="rsd-card-title">Student directory</h2>
                    <p className="rsd-card-sub">Prioritize students who are ready to apply or need one profile action.</p>
                  </div>
                  <span className="rsd-count">{filteredStudents.length} shown</span>
                </div>

                <div className="rsd-student-toolbar">
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 11, top: 10, color: "#94a0b1" }}>{icon("search")}</span>
                    <input
                      className="rsd-input"
                      style={{ paddingLeft: 33 }}
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search name, course, skill or email…"
                    />
                  </div>
                  <select className="rsd-select" value={readinessFilter} onChange={(event) => setReadinessFilter(event.target.value)}>
                    <option value="ALL">All students</option>
                    <option value="READY">Profile ready</option>
                    <option value="ATTENTION">Needs attention</option>
                  </select>
                  <select className="rsd-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                    <option value="ALL">All drives</option>
                    <option value="OPEN">Open drives</option>
                    <option value="PAUSED">Paused</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>

                {!studentsAvailable ? (
                  <div className="rsd-empty">
                    <div className="rsd-empty-icon">{icon("users")}</div>
                    <strong>Student details are not available</strong>
                    <p>
                      This recruiter account can still manage drives and reminders, but the current student endpoint did not return data.
                    </p>
                  </div>
                ) : loading ? (
                  <div className="rsd-empty">
                    <div className="rsd-empty-icon">{icon("refresh")}</div>
                    <strong>Loading student pipeline…</strong>
                    <p>Pulling the latest readiness and application data.</p>
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="rsd-empty">
                    <div className="rsd-empty-icon">{icon("search")}</div>
                    <strong>No students match these filters</strong>
                    <p>Try clearing the search or switching the readiness filter.</p>
                  </div>
                ) : (
                  <div className="rsd-table-wrap">
                    <table className="rsd-table">
                      <thead>
                        <tr>
                          <th>STUDENT</th>
                          <th>PROGRAM</th>
                          <th>CGPA</th>
                          <th>SKILLS</th>
                          <th>JOB SCORE</th>
                          <th>READINESS RANK</th>
                          <th>PROJECT ANALYSIS</th>
                          <th>APPLICATIONS</th>
                          <th>STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rankedStudents.map((student) => (
                          <tr key={student.id ?? student.name}>
                            <td>
                              <div className="rsd-student">
                                <div className="rsd-avatar">{student.initial}</div>
                                <div>
                                  <strong>{student.name}</strong>
                                  <span>{student.email || "No email on profile"}</span>
                                </div>
                              </div>
                            </td>
                            <td><div className="rsd-course">{student.course}<br />{student.year}</div></td>
                            <td><span className={`rsd-cgpa ${student.cgpa == null ? "missing" : ""}`}>{student.cgpa ?? "—"}</span></td>
                            <td><div className="rsd-mini-skills">{student.skills || "Skills not added"}</div></td>
                            <td><span className="rsd-score">{student.jobScore}/100</span></td>
                            <td><span className="rsd-rank-badge">#{student.jobReadinessRank}</span></td>
                            <td>
                              <button
                                className="rsd-project-btn"
                                type="button"
                                onClick={() => openProjectAnalysis(student)}
                                disabled={projectLoading && projectAnalysis?.student?.id === student.id}
                              >
                                {projectLoading && projectAnalysis?.student?.id === student.id ? "Analyzing…" : "Project Analysis"}
                              </button>
                            </td>
                            <td><strong>{student.applications}</strong></td>
                            <td>
                              {student.complete ? (
                                <span className="rsd-chip ready">Ready to apply</span>
                              ) : (
                                <span className="rsd-chip attention">Missing {student.missing.join(" · ")}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="rsd-card">
                <div className="rsd-card-head">
                  <div>
                    <h2 className="rsd-card-title">Candidate applications</h2>
                    <p className="rsd-card-sub">Review the actual job application before moving the candidate to the next hiring stage.</p>
                  </div>
                  <Link className="rsd-btn small" to="/recruiter/applications">Open full pipeline {icon("arrow")}</Link>
                </div>

                {applications.length === 0 ? (
                  <div className="rsd-empty">
                    <div className="rsd-empty-icon">{icon("briefcase")}</div>
                    <strong>No applications yet</strong>
                    <p>Once students apply, their applications will appear here with a Review action.</p>
                  </div>
                ) : (
                  <div className="rsd-application-list">
                    {reviewApplications.map((application) => {
                      const student = studentForApplication(application);
                      const job = jobForApplication(application);
                      const company = job ? companyMap.get(String(job.company_id)) : null;
                      return (
                        <div className="rsd-application-row" key={application.id}>
                          <div className="rsd-application-candidate">
                            <div className="rsd-avatar">{(student?.initial || "S")}</div>
                            <div>
                              <strong>{student?.name || `Student #${application.student_id ?? "—"}`}</strong>
                              <span>{student?.email || `Student ID ${application.student_id ?? "—"}`}</span>
                            </div>
                          </div>
                          <div className="rsd-application-drive">
                            <strong>{job?.title || `Drive #${application.job_drive_id ?? "—"}`}</strong>
                            <span>{company?.name || "Company not available"}</span>
                          </div>
                          <div>
                            <span className={`rsd-chip ${String(application.status || "APPLIED") === "REJECTED" ? "attention" : "ready"}`}>{formatStatus(application.status || "APPLIED")}</span>
                            <div className="rsd-application-date">{formatDate(application.applied_at || application.created_at)}</div>
                          </div>
                          <button className="rsd-review-btn" type="button" onClick={() => setSelectedApplication(application)}>Review application</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="rsd-card">
                <div className="rsd-card-head">
                  <div>
                    <h2 className="rsd-card-title">Job drives</h2>
                    <p className="rsd-card-sub">Keep opportunities tidy without taking over the student view.</p>
                  </div>
                  <button className="rsd-btn small" type="button" onClick={() => setShowCreate(true)}>{icon("plus")} New drive</button>
                </div>

                {visibleJobs.length === 0 ? (
                  <div className="rsd-empty" style={{ borderTop: "1px solid #edf1f6" }}>
                    <div className="rsd-empty-icon">{icon("briefcase")}</div>
                    <strong>No drives available</strong>
                    <p>Create your first placement drive to start building the recruiter pipeline.</p>
                  </div>
                ) : (
                  <div className="rsd-list" style={{ padding: "0 18px 18px" }}>
                    {visibleJobs.map((job) => {
                      const company = companyMap.get(String(job.company_id));
                      const status = String(job.drive_status || "UNKNOWN").toLowerCase();
                      const tone = ["open", "paused", "closed"].includes(status) ? status : "other";
                      return (
                        <div className="rsd-drive-mini" key={job.id}>
                          <div className="rsd-drive-mini-top">
                            <div>
                              <strong>{job.title || `Job Drive #${job.id}`}</strong>
                              <small>{company?.name || `Company #${job.company_id}`} · {job.location || "Location not set"}</small>
                            </div>
                            <span className={`rsd-status ${tone}`}>{formatStatus(job.drive_status)}</span>
                          </div>
                          <div className="rsd-drive-mini-meta">
                            <span>CGPA {job.minimum_cgpa ?? "—"}</span>
                            <span>Deadline {formatDate(job.application_deadline)}</span>
                            <span>₹ {job.salary_package || "Package —"}</span>
                          </div>
                          <div style={{ display: "flex", gap: 6, marginTop: 9, flexWrap: "wrap" }}>
                            {job.drive_status !== "OPEN" && <button className="rsd-btn small success" type="button" onClick={() => updateStatus(job.id, "OPEN")} disabled={Boolean(action)}>Open</button>}
                            {job.drive_status !== "PAUSED" && job.drive_status !== "CLOSED" && <button className="rsd-btn small" type="button" onClick={() => updateStatus(job.id, "PAUSED")} disabled={Boolean(action)}>Pause</button>}
                            {job.drive_status !== "CLOSED" && <button className="rsd-btn small danger" type="button" onClick={() => updateStatus(job.id, "CLOSED")} disabled={Boolean(action)}>Close</button>}
                            <Link className="rsd-btn small" to="/recruiter/applications">View applications {icon("arrow")}</Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            <aside>
              <section className="rsd-card">
                <div className="rsd-side-card">
                  <div className="rsd-side-head">
                    <div>
                      <h2 className="rsd-side-title">Profile readiness</h2>
                      <p className="rsd-side-sub">A quick signal for how much of the student pipeline is application-ready.</p>
                    </div>
                    <strong style={{ fontSize: 18 }}>{students.length ? `${readiness}%` : "—"}</strong>
                  </div>
                  <div className="rsd-progress"><span style={{ width: `${readiness}%` }} /></div>
                  <div className="rsd-progress-meta"><span>{readyCount} ready</span><span>{incompleteCount} need attention</span></div>
                </div>
              </section>

              <section className="rsd-card">
                <div className="rsd-side-card">
                  <div className="rsd-side-head">
                    <div>
                      <h2 className="rsd-side-title">Reminder center</h2>
                      <p className="rsd-side-sub">Keep incomplete profiles moving without repeatedly opening another screen.</p>
                    </div>
                    <span className="rsd-count">24h cooldown</span>
                  </div>
                  <div className="rsd-reminder-box">
                    <div className="rsd-reminder-status"><span className="rsd-status-dot" /> Automatic reminder engine enabled</div>
                    <h3>Send profile reminders</h3>
                    <p>Runs the same backend reminder engine used by the scheduler. Students receive the reminder in their CampusLink notifications.</p>
                    <button className="rsd-btn primary" style={{ width: "100%" }} type="button" onClick={runManualReminder} disabled={action === "reminder"}>
                      {icon("send")} {action === "reminder" ? "Running reminder engine…" : "Send reminders now"}
                    </button>
                    {reminderResult && <div className="rsd-reminder-result">{reminderResult}</div>}
                  </div>
                </div>
              </section>

              <section className="rsd-card">
                <div className="rsd-side-card">
                  <div className="rsd-side-head">
                    <div>
                      <h2 className="rsd-side-title">Quick access</h2>
                      <p className="rsd-side-sub">Jump straight into the next recruiting action.</p>
                    </div>
                  </div>
                  <div className="rsd-quick">
                    <Link to="/recruiter/applications"><span>Review applications</span>{icon("arrow")}</Link>
                    <Link to="/recruiter/ai-candidates"><span>Open AI candidate ranking</span>{icon("arrow")}</Link>
                    <Link to="/recruiter/notifications"><span>Check notifications</span>{icon("arrow")}</Link>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </main>
      </div>

      {selectedApplication && (() => {
        const reviewStudent = studentForApplication(selectedApplication);
        const reviewJob = jobForApplication(selectedApplication);
        const reviewCompany = reviewJob ? companyMap.get(String(reviewJob.company_id)) : null;
        const currentStatus = String(selectedApplication.status || "APPLIED");
        const nextActions = [
          { status: "SHORTLISTED", label: "Shortlist candidate", kind: "primary" },
          { status: "INTERVIEW", label: "Move to interview", kind: "success" },
          { status: "SELECTED", label: "Select candidate", kind: "success" },
          { status: "OFFERED", label: "Mark offer stage", kind: "primary" },
          { status: "REJECTED", label: "Reject application", kind: "danger" },
        ];
        return (
          <div className="rsd-review-drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedApplication(null); }}>
            <aside className="rsd-review-drawer" aria-label="Review candidate application">
              <div className="rsd-review-head">
                <div>
                  <div className="rsd-review-kicker">APPLICATION REVIEW · #{selectedApplication.id}</div>
                  <h2>{reviewStudent?.name || `Student #${selectedApplication.student_id ?? "—"}`}</h2>
                  <p>{reviewStudent?.email || "Candidate contact details are not available."}</p>
                </div>
                <button className="rsd-review-close" type="button" onClick={() => setSelectedApplication(null)}>×</button>
              </div>

              <div className="rsd-review-current">
                <span>Current application stage</span>
                <strong>{formatStatus(currentStatus)}</strong>
              </div>

              <div className="rsd-review-grid">
                <div className="rsd-review-card"><span>Job drive</span><strong>{reviewJob?.title || `Drive #${selectedApplication.job_drive_id ?? "—"}`}</strong></div>
                <div className="rsd-review-card"><span>Company</span><strong>{reviewCompany?.name || "—"}</strong></div>
                <div className="rsd-review-card"><span>Program</span><strong>{reviewStudent?.course || "—"}</strong></div>
                <div className="rsd-review-card"><span>CGPA</span><strong>{reviewStudent?.cgpa ?? "—"}</strong></div>
                <div className="rsd-review-card"><span>Graduation</span><strong>{reviewStudent?.year || "—"}</strong></div>
                <div className="rsd-review-card"><span>Applied</span><strong>{formatDate(selectedApplication.applied_at || selectedApplication.created_at)}</strong></div>
                <div className="rsd-review-card full"><span>Skills</span><strong>{reviewStudent?.skills || "No skills listed on the available profile."}</strong></div>
                <div className="rsd-review-card full"><span>Profile / resume</span><strong>{reviewStudent?.complete ? "Profile has CGPA, skills and resume information." : reviewStudent?.missing?.length ? `Profile gaps: ${reviewStudent.missing.join(", ")}` : "Profile information is partially unavailable."}</strong></div>
              </div>

              <h3 className="rsd-review-section-title">Take the next hiring action</h3>
              <div className="rsd-review-actions">
                {nextActions.map((item) => (
                  <button
                    key={item.status}
                    type="button"
                    className={item.kind}
                    disabled={applicationAction !== "" || currentStatus === item.status}
                    onClick={() => updateApplicationStatus(selectedApplication.id, item.status)}
                  >
                    {applicationAction === `${selectedApplication.id}-${item.status}` ? "Updating…" : item.label}
                  </button>
                ))}
              </div>

              <Link className="rsd-btn primary" style={{ width: "100%", marginTop: 12 }} to="/recruiter/ai-candidates">Open AI candidate intelligence {icon("arrow")}</Link>
            </aside>
          </div>
        );
      })()}

      {projectAnalysis && (
        <div
          className="rsd-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setProjectAnalysis(null);
            }
          }}
        >
          <div className="rsd-project-modal" role="dialog" aria-modal="true" aria-label="GitHub project analysis">
            <div className="rsd-project-head">
              <div>
                <div className="rsd-project-kicker">GITHUB PROJECT ANALYSIS</div>
                <h2>{projectAnalysis.student?.name || "Student"}</h2>
                <p>{projectAnalysis.repository?.repository || "Repository analysis"}</p>
                {projectAnalysis.github_url && (
                  <a className="rsd-project-url" href={projectAnalysis.github_url} target="_blank" rel="noreferrer">
                    {projectAnalysis.github_url}
                  </a>
                )}
              </div>
              <button className="rsd-close" type="button" onClick={() => setProjectAnalysis(null)}>
                {icon("close")}
              </button>
            </div>

            <div className="rsd-project-score-box">
              <div>
                <span>PROJECT SCORE</span>
                <strong>{projectAnalysis.project_score ?? 0}/100</strong>
              </div>
              <div>
                <span>JOB SCORE</span>
                <strong>{projectAnalysis.student?.jobScore ?? calculateJobScore(projectAnalysis.student)}/100</strong>
              </div>
            </div>

            <div className="rsd-project-grid">
              <div>
                <span>Languages</span>
                <strong>{projectAnalysis.repository?.languages?.join(", ") || "—"}</strong>
              </div>
              <div>
                <span>Commits</span>
                <strong>{projectAnalysis.repository?.commit_count ?? 0}</strong>
              </div>
              <div>
                <span>Stars</span>
                <strong>{projectAnalysis.repository?.stars ?? 0}</strong>
              </div>
              <div>
                <span>README</span>
                <strong>{projectAnalysis.repository?.has_readme ? "Detected" : "Not detected"}</strong>
              </div>
              <div>
                <span>Tests</span>
                <strong>{projectAnalysis.repository?.has_tests ? "Detected" : "Not detected"}</strong>
              </div>
              <div>
                <span>CI / DevOps</span>
                <strong>{projectAnalysis.repository?.has_ci ? "Detected" : "Not detected"}</strong>
              </div>
            </div>

            <div className="rsd-project-analysis">
              <h3>AI Project Analysis</h3>
              <pre>{JSON.stringify(projectAnalysis.analysis || {}, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="rsd-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCreate(false); }}>
          <div className="rsd-modal" role="dialog" aria-modal="true" aria-label="Create job drive">
            <div className="rsd-modal-head">
              <div>
                <h2>Create a placement drive</h2>
                <p>Publish an opportunity without leaving the student dashboard.</p>
              </div>
              <button className="rsd-close" type="button" onClick={() => setShowCreate(false)}>{icon("close")}</button>
            </div>

            <form className="rsd-form" onSubmit={createJob}>
              <div className="rsd-form-grid">
                <div className="rsd-field">
                  <label>Company</label>
                  <select value={form.company_id} onChange={(event) => updateForm("company_id", event.target.value)}>
                    <option value="">Select company</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>{company.name || `Company #${company.id}`}</option>
                    ))}
                  </select>
                </div>
                <div className="rsd-field">
                  <label>Job title</label>
                  <input value={form.title} onChange={(event) => updateForm("title", event.target.value)} placeholder="Frontend Engineer" />
                </div>
                <div className="rsd-field">
                  <label>Job type</label>
                  <select value={form.job_type} onChange={(event) => updateForm("job_type", event.target.value)}>
                    <option value="FULL_TIME">Full time</option>
                    <option value="PART_TIME">Part time</option>
                    <option value="INTERNSHIP">Internship</option>
                    <option value="CONTRACT">Contract</option>
                  </select>
                </div>
                <div className="rsd-field">
                  <label>Location</label>
                  <input value={form.location} onChange={(event) => updateForm("location", event.target.value)} placeholder="Bengaluru / Hybrid" />
                </div>
                <div className="rsd-field">
                  <label>Salary package</label>
                  <input value={form.salary_package} onChange={(event) => updateForm("salary_package", event.target.value)} placeholder="8 LPA" />
                </div>
                <div className="rsd-field">
                  <label>Minimum CGPA</label>
                  <input type="number" min="0" max="10" step="0.01" value={form.minimum_cgpa} onChange={(event) => updateForm("minimum_cgpa", event.target.value)} placeholder="7.0" />
                </div>
                <div className="rsd-field">
                  <label>Application deadline</label>
                  <input type="datetime-local" value={form.application_deadline} onChange={(event) => updateForm("application_deadline", event.target.value)} />
                </div>
                <div className="rsd-field">
                  <label>Required skills</label>
                  <input value={form.required_skills} onChange={(event) => updateForm("required_skills", event.target.value)} placeholder="React, JavaScript, SQL" />
                </div>
                <div className="rsd-field full">
                  <label>Description</label>
                  <textarea value={form.description} onChange={(event) => updateForm("description", event.target.value)} placeholder="Role summary, responsibilities and selection process…" />
                </div>
              </div>
              <div className="rsd-modal-actions">
                <button className="rsd-btn" type="button" onClick={() => setShowCreate(false)}>Cancel</button>
                <button className="rsd-btn primary" type="submit" disabled={saving}>{saving ? "Publishing…" : "Publish drive"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
