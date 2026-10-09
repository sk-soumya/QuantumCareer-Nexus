import { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate, Link } from "react-router-dom";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const NAV = [
  ["Dashboard", "/recruiter", "⌂"],
  ["Company", "/recruiter/company", "▦"],
  ["Job Drives", "/recruiter/jobs", "◫"],
  ["Applications", "/recruiter/applications", "≡"],
  ["AI Candidates", "/recruiter/ai-candidates", "✦"],
  ["Interviews", "/recruiter/interviews", "◷"],
  ["Offers", "/recruiter/offers", "◆"],
  ["Notifications", "/recruiter/notifications", "◌"],
];

const chartPalette = ["#2563eb", "#7c3aed", "#0f766e", "#ea580c", "#475569", "#16a34a", "#dc2626"];

function getToken() {
  return localStorage.getItem("campuslink_token") || "";
}

function getCurrentUserId() {
  try {
    const payload = getToken().split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    return Number(JSON.parse(atob(normalized)).sub);
  } catch {
    return null;
  }
}

function readableApiDetail(detail, fallback) {
  if (typeof detail === "string" && detail.trim()) return detail;

  if (Array.isArray(detail)) {
    const messages = detail.map((item) => {
      if (typeof item === "string") return item;
      if (!item || typeof item !== "object") return String(item ?? "");
      const location = Array.isArray(item.loc)
        ? item.loc.filter((part) => part !== "body").join(".")
        : "";
      const message = typeof item.msg === "string"
        ? item.msg
        : typeof item.message === "string"
          ? item.message
          : "";
      const value = message || (typeof item.detail === "string" ? item.detail : "");
      if (location && value) return `${location}: ${value}`;
      if (value) return value;
      try { return JSON.stringify(item); } catch { return "The server returned an unreadable error."; }
    }).filter(Boolean);
    if (messages.length) return messages.join("; ");
  }

  if (detail && typeof detail === "object") {
    for (const key of ["message", "msg", "error", "detail"]) {
      if (typeof detail[key] === "string" && detail[key].trim()) return detail[key];
    }
    try {
      const serialized = JSON.stringify(detail);
      if (serialized && serialized !== "{}") return serialized;
    } catch { /* fall through to the safe fallback */ }
  }

  return fallback;
}

async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${getToken()}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    throw new Error(error?.message || "Could not reach the CampusLink API. Check that the backend is running.");
  }

  const body = await response.text();
  let data = null;
  try {
    data = body ? JSON.parse(body) : null;
  } catch {
    data = body;
  }

  if (!response.ok) {
    const fallback = typeof data === "string" && data.trim()
      ? data
      : `Request failed (${response.status})`;
    throw new Error(readableApiDetail(data?.detail ?? data?.message, fallback));
  }
  return data;
}

function parseSalaryPackage(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return NaN;

  // Accept common forms such as "10", "10 LPA", "8.5 lakh", or "₹10 LPA".
  const normalized = raw.replace(/[₹,\s]/g, "");
  const lpaMatch = normalized.match(/^(\d+(?:\.\d+)?)(?:lpa|lakhs?|lacs?)?$/i);
  if (lpaMatch) return Number(lpaMatch[1]);

  // For a plain numeric amount, remove currency text but preserve the number.
  const numeric = normalized.match(/^(\d+(?:\.\d+)?)$/);
  return numeric ? Number(numeric[1]) : NaN;
}

function prettyStatus(value) {
  return String(value || "").replaceAll("_", " ");
}

function dateLabel(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function timeLabel(value) {
  if (!value) return "";
  const raw = String(value);
  return raw.length >= 5 ? raw.slice(0, 5) : raw;
}

function Shell({ eyebrow, title, description, children, right }) {
  const navigate = useNavigate();
  return (
    <div className="rpx-shell">
      <style>{CSS}</style>
      <aside className="rpx-sidebar">
        <div className="rpx-brand" onClick={() => navigate("/recruiter")} role="button" tabIndex={0}>
          <div className="rpx-brand-mark">C</div>
          <div>
            <div className="rpx-brand-name">CampusLink</div>
            <div className="rpx-brand-sub">Recruiter Workspace</div>
          </div>
        </div>

        <div className="rpx-nav-label">WORKSPACE</div>
        <nav className="rpx-nav">
          {NAV.map(([label, path, icon]) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/recruiter"}
              className={({ isActive }) => `rpx-nav-item ${isActive ? "is-active" : ""}`}
            >
              <span className="rpx-nav-icon">{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="rpx-sidebar-foot">
          <div className="rpx-mini-card">
            <div className="rpx-mini-title">Hiring console</div>
            <div className="rpx-mini-text">Connected to CampusLink APIs</div>
          </div>
          <button
            type="button"
            className="rpx-logout"
            onClick={() => {
              localStorage.removeItem("campuslink_token");
              navigate("/login", { replace: true });
            }}
          >
            <span>↪</span> Sign out
          </button>
        </div>
      </aside>

      <main className="rpx-main">
        <header className="rpx-topbar">
          <div>
            <div className="rpx-eyebrow">{eyebrow}</div>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          <div className="rpx-top-actions">{right}</div>
        </header>
        <div className="rpx-content">{children}</div>
      </main>
    </div>
  );
}

function PageMessage({ message, type = "info" }) {
  if (!message) return null;
  return <div className={`rpx-alert ${type === "error" ? "is-error" : ""}`}>{message}</div>;
}

function KPI({ label, value, helper, icon }) {
  return (
    <div className="rpx-kpi">
      <div className="rpx-kpi-icon">{icon}</div>
      <div className="rpx-kpi-body">
        <div className="rpx-kpi-label">{label}</div>
        <div className="rpx-kpi-value">{value}</div>
        <div className="rpx-kpi-help">{helper}</div>
      </div>
    </div>
  );
}

function Section({ title, subtitle, action, children }) {
  return (
    <section className="rpx-section">
      <div className="rpx-section-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Empty({ title, text, action }) {
  return (
    <div className="rpx-empty">
      <div className="rpx-empty-icon">◇</div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

function StatusPill({ value }) {
  const s = String(value || "").toLowerCase();
  const cls = s.includes("open") || s.includes("accepted") || s.includes("selected") || s.includes("issued")
    ? "positive"
    : s.includes("reject") || s.includes("close") || s.includes("expired")
      ? "negative"
      : s.includes("pause") || s.includes("draft") || s.includes("short")
        ? "warning"
        : "neutral";
  return <span className={`rpx-pill ${cls}`}>{prettyStatus(value)}</span>;
}

export function RecruiterCompany() {
  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState({ name: "", industry: "", website: "", location: "", description: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");

  async function load() {
    try {
      setLoading(true);
      setMessage("");
      setCompanies((await api("/companies/")) || []);
    } catch (error) {
      setMessage(error.message || "Unable to load companies.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return companies.filter((company) => !q || `${company.name} ${company.industry} ${company.location}`.toLowerCase().includes(q));
  }, [companies, query]);

  async function create() {
    if (!form.name.trim()) {
      setMessage("Company name is required.");
      return;
    }
    try {
      setSaving(true);
      setMessage("");
      await api("/companies/", { method: "POST", body: JSON.stringify(form) });
      setForm({ name: "", industry: "", website: "", location: "", description: "" });
      setMessage("Company created successfully.");
      await load();
    } catch (error) {
      setMessage(error.message || "Unable to create company.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Shell
      eyebrow="Recruiter / Company"
      title="Company Command Center"
      description="Create and maintain the employer profiles used across your placement drives."
      right={<button className="rpx-button secondary" onClick={load}>↻ Refresh</button>}
    >
      <PageMessage message={message} type={message.startsWith("Company created") ? "info" : "error"} />

      <div className="rpx-split">
        <Section title="Add company" subtitle="Create an employer profile once, then reuse it for every drive.">
          <div className="rpx-form-grid">
            <label className="rpx-field"><span>Company name</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Acme Technologies" /></label>
            <label className="rpx-field"><span>Industry</span><input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="Software & Services" /></label>
            <label className="rpx-field"><span>Website</span><input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://example.com" /></label>
            <label className="rpx-field"><span>Location</span><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Bengaluru" /></label>
            <label className="rpx-field full"><span>Description</span><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short employer overview" /></label>
          </div>
          <div className="rpx-form-footer">
            <button className="rpx-button primary" onClick={create} disabled={saving}>{saving ? "Creating…" : "Create company"}</button>
          </div>
        </Section>

        <Section title="Company pulse" subtitle="Live counts from the backend.">
          <div className="rpx-mini-grid">
            <KPI label="Total companies" value={companies.length} helper="Available to your workspace" icon="▦" />
            <KPI label="Industries" value={new Set(companies.map((c) => c.industry).filter(Boolean)).size} helper="Distinct sectors" icon="◌" />
            <KPI label="Locations" value={new Set(companies.map((c) => c.location).filter(Boolean)).size} helper="Distinct hiring markets" icon="⌖" />
          </div>
        </Section>
      </div>

      <Section
        title="Employer directory"
        subtitle={`${filtered.length} companies visible`}
        action={<input className="rpx-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search company, industry, location…" />}
      >
        {loading ? <div className="rpx-loading">Loading company directory…</div> : filtered.length === 0 ? <Empty title="No companies found" text="Create a company above or adjust your search." /> : (
          <div className="rpx-company-grid">
            {filtered.map((company) => (
              <article className="rpx-company-card" key={company.id}>
                <div className="rpx-company-head">
                  <div className="rpx-company-avatar">{String(company.name || "C").slice(0, 1).toUpperCase()}</div>
                  <div><h3>{company.name}</h3><span>{company.industry || "Industry not set"}</span></div>
                </div>
                <div className="rpx-company-meta"><span>⌖ {company.location || "Location not set"}</span><span>◫ ID {company.id}</span></div>
                <p>{company.description || "No employer description provided."}</p>
                {company.website ? <a className="rpx-link" href={company.website} target="_blank" rel="noreferrer">Visit website ↗</a> : <span className="rpx-muted">No website added</span>}
              </article>
            ))}
          </div>
        )}
      </Section>
    </Shell>
  );
}

export function RecruiterJobs() {
  const currentUserId = getCurrentUserId();
  const [companies, setCompanies] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [form, setForm] = useState({ company_id: "", title: "", description: "", job_type: "FULL_TIME", location: "", salary_package: "", minimum_cgpa: "", required_skills: "", application_deadline: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [query, setQuery] = useState("");

  async function load() {
    try {
      setLoading(true);
      setMessage("");
      const [companyData, jobData] = await Promise.all([api("/companies/"), api("/job-drives/")]);
      setCompanies(Array.isArray(companyData) ? companyData : []);
      setJobs(Array.isArray(jobData) ? jobData : []);
    } catch (error) {
      setMessage(error.message || "Unable to load job drives.");
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const companyMap = useMemo(() => new Map(companies.map((c) => [String(c.id), c])), [companies]);
  const visibleJobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((job) => {
      const company = companyMap.get(String(job.company_id));
      const text = `${job.id} ${job.title || ""} ${job.description || ""} ${job.location || ""} ${job.job_type || ""} ${job.required_skills || ""} ${company?.name || ""}`.toLowerCase();
      return (!q || text.includes(q)) && (statusFilter === "ALL" || job.drive_status === statusFilter);
    });
  }, [jobs, companyMap, query, statusFilter]);

  async function createJob() {
    if (!form.company_id || !form.title.trim()) { setMessage("Company and job title are required."); return; }
    try {
      setSaving(true);
      await api("/job-drives/", { method: "POST", body: JSON.stringify({ ...form, company_id: Number(form.company_id), minimum_cgpa: form.minimum_cgpa === "" ? null : Number(form.minimum_cgpa), application_deadline: form.application_deadline || null }) });
      setForm({ company_id: "", title: "", description: "", job_type: "FULL_TIME", location: "", salary_package: "", minimum_cgpa: "", required_skills: "", application_deadline: "" });
      setMessage("Job drive created successfully.");
      await load();
    } catch (error) { setMessage(error.message || "Unable to create job drive."); }
    finally { setSaving(false); }
  }

  async function updateStatus(id, drive_status) {
    try {
      await api(`/job-drives/${id}/status`, { method: "PATCH", body: JSON.stringify({ drive_status }) });
      await load();
    } catch (error) { setMessage(error.message || "Unable to update job status."); }
  }

  return (
    <Shell eyebrow="Recruiter / Job Drives" title="Hiring Pipeline" description="The values shown in every drive card are the canonical job-drive fields returned by CampusLink." right={<div className="rpx-action-row"><button className="rpx-button secondary" onClick={load}>↻ Refresh</button></div>}>
      <PageMessage message={message} type={message.startsWith("Job drive created") ? "info" : "error"} />
      <div className="rpx-kpi-grid">
        <KPI label="All drives" value={jobs.length} helper="Exactly as returned by /job-drives/" icon="◫" />
        <KPI label="Open" value={jobs.filter((j) => j.drive_status === "OPEN").length} helper="Accepting applicants" icon="●" />
        <KPI label="Paused" value={jobs.filter((j) => j.drive_status === "PAUSED").length} helper="Temporarily frozen" icon="Ⅱ" />
        <KPI label="Closed" value={jobs.filter((j) => j.drive_status === "CLOSED").length} helper="No longer active" icon="■" />
      </div>

      <Section title="Create a hiring drive" subtitle="These are the same fields students will see. No display-side renaming or substitutions are applied.">
        <div className="rpx-form-grid">
          <label className="rpx-field"><span>Company</span><select value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}><option value="">Select company</option>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label className="rpx-field"><span>Job title</span><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Software Engineer" /></label>
          <label className="rpx-field"><span>Job type</span><select value={form.job_type} onChange={(e) => setForm({ ...form, job_type: e.target.value })}><option>FULL_TIME</option><option>PART_TIME</option><option>INTERNSHIP</option><option>CONTRACT</option></select></label>
          <label className="rpx-field"><span>Location</span><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Bhubaneswar" /></label>
          <label className="rpx-field"><span>Salary package</span><input value={form.salary_package} onChange={(e) => setForm({ ...form, salary_package: e.target.value })} placeholder="Not disclosed" /></label>
          <label className="rpx-field"><span>Minimum CGPA</span><input type="number" step="0.1" value={form.minimum_cgpa} onChange={(e) => setForm({ ...form, minimum_cgpa: e.target.value })} placeholder="7" /></label>
          <label className="rpx-field"><span>Required skills</span><input value={form.required_skills} onChange={(e) => setForm({ ...form, required_skills: e.target.value })} placeholder="HTML, CSS, React" /></label>
          <label className="rpx-field"><span>Application deadline</span><input type="date" value={form.application_deadline} onChange={(e) => setForm({ ...form, application_deadline: e.target.value })} /></label>
          <label className="rpx-field full"><span>Description</span><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Exact role description shown to students" /></label>
        </div>
        <div className="rpx-form-footer"><button className="rpx-button primary" onClick={createJob} disabled={saving}>{saving ? "Publishing…" : "Publish drive"}</button></div>
      </Section>

      <Section title="Drive portfolio" subtitle={`${visibleJobs.length} of ${jobs.length} drives visible`} action={<div className="rpx-filter-row"><input className="rpx-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search drive ID, title, company, skill…" /><select className="rpx-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="ALL">All statuses</option><option value="OPEN">Open</option><option value="PAUSED">Paused</option><option value="CLOSED">Closed</option></select></div>}>
        {loading ? <div className="rpx-loading">Loading hiring drives…</div> : visibleJobs.length === 0 ? <Empty title="No drives match" text="Create a drive or adjust the filters." /> : (
          <div className="rpx-job-grid">
            {visibleJobs.map((job) => {
              const company = companyMap.get(String(job.company_id));
              const ownsJobDrive = Number(job.created_by) === currentUserId;
              return <article className="rpx-job-card" key={job.id}>
                <div className="rpx-job-top"><div><div className="rpx-kicker">DRIVE #{job.id}</div><h3>{job.title || "Untitled role"}</h3><span className="rpx-muted">{company?.name || `Company #${job.company_id}`}</span></div><StatusPill value={job.drive_status} /></div>
                <div className="rpx-job-tags"><span>{job.job_type || "Not specified"}</span><span>⌖ {job.location || "Not specified"}</span><span>{job.salary_package || "Package not disclosed"}</span></div>
                <p>{job.description || "No description provided."}</p>
                <div className="rpx-job-meta"><span>CGPA ≥ {job.minimum_cgpa ?? "Not specified"}</span><span>Deadline {dateLabel(job.application_deadline)}</span></div>
                <div className="rpx-skill-line">{(job.required_skills || "").split(",").map((s) => s.trim()).filter(Boolean).map((s) => <span key={s}>{s}</span>)}</div>
                <div className="rpx-card-actions">
                  {ownsJobDrive && job.drive_status !== "OPEN" && <button className="rpx-button small success" onClick={() => updateStatus(job.id, "OPEN")}>Open</button>}
                  {ownsJobDrive && job.drive_status !== "PAUSED" && <button className="rpx-button small warning" onClick={() => updateStatus(job.id, "PAUSED")}>Pause</button>}
                  {ownsJobDrive && job.drive_status !== "CLOSED" && <button className="rpx-button small danger" onClick={() => updateStatus(job.id, "CLOSED")}>Close</button>}
                  {ownsJobDrive && (
                    <Link className="rpx-button small secondary" to={`/recruiter/applications?job_drive_id=${encodeURIComponent(job.id)}`}>View applications</Link>
                  )}
                </div>
              </article>;
            })}
          </div>
        )}
      </Section>
    </Shell>
  );
}

export function RecruiterApplications() {
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [students, setStudents] = useState([]);
  const [studentProfiles, setStudentProfiles] = useState({});
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [githubScan, setGithubScan] = useState(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [selectedStudentProfile, setSelectedStudentProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [qnaOpen, setQnaOpen] = useState(false);
  const [qnaQuestion, setQnaQuestion] = useState("");
  const [qnaAnswer, setQnaAnswer] = useState(null);
  const [qnaLoading, setQnaLoading] = useState(false);
  const [qnaError, setQnaError] = useState("");

  const statuses = ["APPLIED", "SHORTLISTED", "REJECTED", "INTERVIEW", "SELECTED", "OFFERED", "ACCEPTED", "WITHDRAWN"];

  async function load() {
    setLoading(true);
    setMessage("");
    const results = await Promise.allSettled([
      api("/applications/"),
      api("/job-drives/"),
      api("/companies/"),
      // Optional directory lookup for application table display names.
      api("/students/"),
    ]);

    const [appsResult, jobsResult, companiesResult, studentsResult] = results;
    if (appsResult.status === "rejected") {
      setMessage(appsResult.reason?.message || "Unable to load applications.");
      setLoading(false);
      return;
    }

    setApplications(Array.isArray(appsResult.value) ? appsResult.value : []);
    setJobs(jobsResult.status === "fulfilled" && Array.isArray(jobsResult.value) ? jobsResult.value : []);
    setCompanies(companiesResult.status === "fulfilled" && Array.isArray(companiesResult.value) ? companiesResult.value : []);
    setStudents(studentsResult.status === "fulfilled" && Array.isArray(studentsResult.value) ? studentsResult.value : []);

    if (jobsResult.status === "rejected" || companiesResult.status === "rejected") {
      setMessage("Applications loaded, but some job or company details could not be loaded.");
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const jobMap = useMemo(() => new Map(jobs.map((j) => [String(j.id), j])), [jobs]);
  const companyMap = useMemo(() => new Map(companies.map((c) => [String(c.id), c])), [companies]);
  const studentMap = useMemo(() => {
    const map = new Map();
    for (const student of students) {
      const profile = student?.profile || student?.student_profile || student?.studentProfile || student;
      const id = student?.id ?? student?.student_id ?? student?.user_id ?? profile?.user_id;
      if (id != null) map.set(String(id), { ...student, __profile: profile });
    }
    return map;
  }, [students]);

  function studentFor(application) {
    return studentMap.get(String(application?.student_id ?? "")) || null;
  }

  function studentNameFor(application) {
    const student = studentFor(application);
    const profile = studentProfiles[String(application?.student_id ?? "")] || student?.__profile || student?.profile || student?.student_profile || student;
    return student?.full_name || student?.name || student?.student?.full_name || profile?.full_name || profile?.name || `Student #${application?.student_id ?? "—"}`;
  }

  function githubValueFrom(profile) {
    const candidates = [
      profile?.github, profile?.github_url, profile?.github_link, profile?.githubUrl,
      profile?.github_profile, profile?.github_profile_url, profile?.portfolio_github,
    ];
    const value = candidates.find((item) => typeof item === "string" && item.trim());
    return value ? value.trim() : "";
  }

  function githubUrlFor(application) {
    const student = studentFor(application);
    const apiProfile = studentProfiles[String(application?.student_id ?? "")];
    const embedded = student?.__profile || student?.profile || student?.student_profile || student;
    return githubValueFrom(apiProfile) || githubValueFrom(embedded) || githubValueFrom(student) || "";
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return applications.filter((a) => {
      const job = jobMap.get(String(a.job_drive_id));
      const company = companyMap.get(String(job?.company_id));
      const name = studentNameFor(a);
      const github = githubUrlFor(a);
      const matchesQ = !q || `${a.id} ${a.student_id} ${name} ${github} ${job?.title || ""} ${company?.name || ""}`.toLowerCase().includes(q);
      return matchesQ && (statusFilter === "ALL" || a.status === statusFilter);
    });
  }, [applications, jobMap, companyMap, studentMap, studentProfiles, query, statusFilter]);

  const pipeline = statuses.map((s) => ({ name: s.replace("_", " "), value: applications.filter((a) => a.status === s).length })).filter((x) => x.value > 0);
  const total = applications.length;
  const selectedCount = applications.filter((a) => a.status === "SELECTED").length;
  const interviewCount = applications.filter((a) => a.status === "INTERVIEW").length;

  async function openApplication(application) {
    setSelected(application);
    setGithubScan(null);
    setScanLoading(true);
    setSelectedStudentProfile(null);
    setProfileLoading(true);
    setProfileError("");
    setQnaOpen(false);
    setQnaAnswer(null);
    setQnaError("");
    const [scanResult, profileResult] = await Promise.allSettled([
      api(`/ai/member4/recruiter/applications/${application.id}/github-analysis`),
      api(`/ai/member4/recruiter/applications/${application.id}/student-profile`),
    ]);
    setGithubScan(scanResult.status === "fulfilled" ? scanResult.value : { status: "UNAVAILABLE", error: scanResult.reason?.message });
    if (profileResult.status === "fulfilled") setSelectedStudentProfile(profileResult.value);
    else setProfileError(profileResult.reason?.message || "Unable to load this student's profile.");
    setScanLoading(false);
    setProfileLoading(false);
  }

  useEffect(() => {
    if (!selected || !["QUEUED", "RUNNING"].includes(githubScan?.status)) return undefined;
    const timer = window.setInterval(async () => {
      try {
        const scan = await api(`/ai/member4/recruiter/applications/${selected.id}/github-analysis`);
        setGithubScan(scan);
      } catch { /* preserve the last known scan state */ }
    }, 4000);
    return () => window.clearInterval(timer);
  }, [selected?.id, githubScan?.status]);

  async function submitProjectQuestion(event) {
    event.preventDefault();
    if (!selected || !qnaQuestion.trim()) return;
    setQnaLoading(true);
    setQnaError("");
    setQnaAnswer(null);
    try {
      setQnaAnswer(await api(`/ai/member4/recruiter/applications/${selected.id}/project-qna`, {
        method: "POST", body: JSON.stringify({ question: qnaQuestion.trim() }),
      }));
    } catch (error) {
      setQnaError(error.message || "Could not answer that project question.");
    } finally {
      setQnaLoading(false);
    }
  }

  async function updateStatus(id, status) {
    try {
      await api(`/applications/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      setMessage(`Application #${id} updated to ${prettyStatus(status)}.`);
      await load();
      setSelected((current) => current ? { ...current, status } : current);
    } catch (error) {
      setMessage(error.message || "Unable to update application.");
    }
  }

  return (
    <Shell eyebrow="Recruiter / Applications" title="Applicant Operations" description="Review application flow, move candidates through stages, and inspect each application, including evidence from a student's public GitHub project."
      right={<div className="rpx-action-row"><Link className="rpx-button secondary" to="/recruiter/ai-candidates">✦ Open AI ranking</Link><button className="rpx-button secondary" onClick={load}>↻ Refresh</button></div>}>
      <style>{`
        .rpx-profile-window-backdrop{position:fixed;inset:0;z-index:60;background:rgba(15,23,42,.66);display:flex;align-items:center;justify-content:center;padding:24px;backdrop-filter:blur(4px)}
        .rpx-profile-window{position:relative;width:min(1160px,calc(100vw - 48px));max-height:calc(100vh - 48px);overflow:auto;box-sizing:border-box;background:#fff;padding:32px;border-radius:20px;box-shadow:0 28px 90px rgba(15,23,42,.3)}
        .rpx-profile-window .rpx-drawer-head{align-items:center;margin-bottom:22px}
        .rpx-profile-window .rpx-drawer-head h2{font-size:27px}
        .rpx-profile-window .rpx-detail-stack{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
        .rpx-profile-window .rpx-detail-card{padding:15px;align-items:flex-start}
        .rpx-profile-window .rpx-detail-card span{font-size:14px}
        .rpx-profile-window .rpx-detail-card strong{font-size:15px;text-align:right}
        .rpx-profile-window .rpx-git-form{padding:20px;gap:16px}
        .rpx-profile-window .rpx-git-form-head strong{font-size:18px}
        .rpx-profile-window .rpx-git-form p,.rpx-profile-window .rpx-public-repo-main>p{font-size:14px;line-height:1.6}
        .rpx-profile-window .rpx-field{font-size:14px}
        .rpx-profile-window .rpx-analysis-summary{font-size:14px}
        .rpx-profile-window .rpx-button{font-size:13px;padding:11px 16px}
        @media(max-width:680px){.rpx-profile-window-backdrop{padding:10px}.rpx-profile-window{width:calc(100vw - 20px);max-height:calc(100vh - 20px);padding:18px}.rpx-profile-window .rpx-detail-stack{grid-template-columns:1fr}.rpx-profile-window .rpx-detail-card{gap:8px}}
      `}</style>
      <PageMessage message={message} />
      <div className="rpx-kpi-grid">
        <KPI label="Total applicants" value={total} helper="Applications across all drives" icon="≡" />
        <KPI label="In interviews" value={interviewCount} helper="Current interview stage" icon="◷" />
        <KPI label="Selected" value={selectedCount} helper="Moved to selection" icon="✓" />
        <KPI label="Shortlisted" value={applications.filter((a) => a.status === "SHORTLISTED").length} helper="Ready for next step" icon="↗" />
      </div>

      <div className="rpx-chart-grid two">
        <Section title="Application pipeline" subtitle="Current stage distribution.">
          {pipeline.length ? <div className="rpx-chart"><ResponsiveContainer width="100%" height={250}><BarChart data={pipeline}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip /><Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#2563eb" /></BarChart></ResponsiveContainer></div> : <Empty title="No application data" text="Applications will appear here once students apply." />}
        </Section>
        <Section title="Funnel health" subtitle="Simple conversion indicators.">
          <div className="rpx-health-list">
            <div><span>Applied → Shortlisted</span><strong>{total ? Math.round((applications.filter((a) => ["SHORTLISTED", "INTERVIEW", "SELECTED", "OFFERED", "ACCEPTED"].includes(a.status)).length / total) * 100) : 0}%</strong></div>
            <div><span>Shortlisted → Interview</span><strong>{applications.filter((a) => a.status === "SHORTLISTED").length ? Math.round((applications.filter((a) => ["INTERVIEW", "SELECTED", "OFFERED", "ACCEPTED"].includes(a.status)).length / applications.filter((a) => a.status === "SHORTLISTED" || ["INTERVIEW", "SELECTED", "OFFERED", "ACCEPTED"].includes(a.status)).length) * 100) : 0}%</strong></div>
            <div><span>Interview → Selected</span><strong>{interviewCount ? Math.round((applications.filter((a) => ["SELECTED", "OFFERED", "ACCEPTED"].includes(a.status)).length / Math.max(interviewCount, 1)) * 100) : 0}%</strong></div>
            <div><span>Selected → Offer</span><strong>{selectedCount ? Math.round((applications.filter((a) => ["OFFERED", "ACCEPTED"].includes(a.status)).length / Math.max(selectedCount, 1)) * 100) : 0}%</strong></div>
          </div>
        </Section>
      </div>

      <Section title="Applications" subtitle={`${filtered.length} visible`} action={<div className="rpx-filter-row"><input className="rpx-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search student, job, company or GitHub…" /><select className="rpx-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="ALL">All statuses</option>{statuses.map((s) => <option key={s} value={s}>{prettyStatus(s)}</option>)}</select></div>}>
        {loading ? <div className="rpx-loading">Loading applications…</div> : filtered.length === 0 ? <Empty title="No matching applications" text="Try a different status or search term." /> : (
          <div className="rpx-table-wrap"><table className="rpx-table rpx-applications-table"><thead><tr><th>Application</th><th>Student</th><th>Drive</th><th>Company</th><th>Applied</th><th>Status</th><th>GitHub project</th><th>Stage</th></tr></thead><tbody>{filtered.map((a) => {
            const job = jobMap.get(String(a.job_drive_id));
            const company = companyMap.get(String(job?.company_id));
            const github = githubUrlFor(a);
            return <tr key={a.id}>
              <td><button className="rpx-table-link" onClick={() => openApplication(a)}>#{a.id}</button></td>
              <td><div className="rpx-app-student"><button type="button" className="rpx-table-link" onClick={() => openApplication(a)}>{studentNameFor(a)}</button><span>Student ID {a.student_id ?? "—"}</span></div></td>
              <td>{job?.title || `Drive ${a.job_drive_id}`}</td>
              <td>{company?.name || `Company ${job?.company_id || "—"}`}</td>
              <td>{dateLabel(a.applied_at)}</td>
              <td><StatusPill value={a.status} /></td>
              <td><div className="rpx-git-cell">{github ? <a className="rpx-link" href={github} target="_blank" rel="noreferrer">GitHub profile ↗</a> : <span className="rpx-git-missing">No profile URL</span>}</div></td>
              <td><select aria-label={`Change application ${a.id} status`} className="rpx-inline-select" value={a.status} onChange={(e) => updateStatus(a.id, e.target.value)}>{statuses.map((s) => <option key={s}>{s}</option>)}</select></td>
            </tr>;
          })}</tbody></table></div>
        )}
      </Section>

      {selected && <div className="rpx-profile-window-backdrop" onClick={() => setSelected(null)}><section className="rpx-profile-window" role="dialog" aria-modal="true" aria-label="Student application profile" onClick={(e) => e.stopPropagation()}>
        <div className="rpx-drawer-head"><div><div className="rpx-kicker">APPLICATION #{selected.id}</div><h2>Applicant profile</h2></div><button className="rpx-icon-button" onClick={() => setSelected(null)}>X</button></div>
        <div className="rpx-detail-stack">
          <div className="rpx-detail-card"><span>Student</span><strong>{studentNameFor(selected)}</strong></div>
          <div className="rpx-detail-card"><span>Student ID</span><strong>{selected.student_id ?? "-"}</strong></div>
          <div className="rpx-detail-card"><span>Drive</span><strong>{jobMap.get(String(selected.job_drive_id))?.title || `Drive ${selected.job_drive_id}`}</strong></div>
          <div className="rpx-detail-card"><span>Company</span><strong>{companyMap.get(String(jobMap.get(String(selected.job_drive_id))?.company_id))?.name || "-"}</strong></div>
          <div className="rpx-detail-card"><span>Current status</span><StatusPill value={selected.status} /></div>
          <div className="rpx-detail-card"><span>Applied</span><strong>{dateLabel(selected.applied_at)}</strong></div>
        </div>
        <section className="rpx-git-form">
          <div className="rpx-git-form-head"><strong>Student profile</strong><span>{profileLoading ? "Loading" : "Profile"}</span></div>
          {profileLoading && <div className="rpx-loading">Loading student details...</div>}
          {profileError && <div className="rpx-alert is-error" role="alert">{profileError}</div>}
          {!profileLoading && selectedStudentProfile && <>
            <div className="rpx-detail-stack">
              <div className="rpx-detail-card"><span>Full name</span><strong>{selectedStudentProfile.full_name || studentNameFor(selected)}</strong></div>
              <div className="rpx-detail-card"><span>Email</span><strong>{selectedStudentProfile.email || "Not provided"}</strong></div>
              <div className="rpx-detail-card"><span>Phone</span><strong>{selectedStudentProfile.phone || "Not provided"}</strong></div>
              <div className="rpx-detail-card"><span>Degree</span><strong>{selectedStudentProfile.degree || "Not provided"}</strong></div>
              <div className="rpx-detail-card"><span>Department</span><strong>{selectedStudentProfile.department || "Not provided"}</strong></div>
              <div className="rpx-detail-card"><span>Graduation year</span><strong>{selectedStudentProfile.graduation_year || "Not provided"}</strong></div>
              <div className="rpx-detail-card"><span>CGPA</span><strong>{selectedStudentProfile.cgpa ?? "Not provided"}</strong></div>
              <div className="rpx-detail-card"><span>Preferred roles</span><strong>{selectedStudentProfile.preferred_roles || "Not provided"}</strong></div>
              <div className="rpx-detail-card"><span>Preferred locations</span><strong>{selectedStudentProfile.preferred_locations || "Not provided"}</strong></div>
              {selectedStudentProfile.linkedin && <div className="rpx-detail-card"><span>LinkedIn</span><a className="rpx-link" href={selectedStudentProfile.linkedin} target="_blank" rel="noreferrer">Open profile</a></div>}
              {selectedStudentProfile.github && <div className="rpx-detail-card"><span>GitHub</span><a className="rpx-link" href={selectedStudentProfile.github} target="_blank" rel="noreferrer">Open profile</a></div>}
              {selectedStudentProfile.profile_photo_url && <div className="rpx-detail-card"><span>Profile photo</span><a className="rpx-link" href={selectedStudentProfile.profile_photo_url} target="_blank" rel="noreferrer">Open photo</a></div>}
              {selectedStudentProfile.updated_at && <div className="rpx-detail-card"><span>Profile updated</span><strong>{dateLabel(selectedStudentProfile.updated_at)}</strong></div>}
            </div>
            {[ ["Career objective", selectedStudentProfile.career_objective], ["Skills", selectedStudentProfile.skills], ["Projects", selectedStudentProfile.projects], ["Experience", selectedStudentProfile.experience], ["Certifications", selectedStudentProfile.certifications] ].map(([label, value]) => value && <article className="rpx-detail-card" key={label} style={{ display: "block" }}><span>{label}</span><p className="rpx-analysis-summary" style={{ marginTop: 7 }}>{value}</p></article>)}
            {selectedStudentProfile.resume_text && <details className="rpx-detail-card" style={{ display: "block" }}><summary>Resume text</summary><p className="rpx-analysis-summary" style={{ marginTop: 8 }}>{selectedStudentProfile.resume_text}</p></details>}
          </>}
        </section>
        <label className="rpx-field"><span>Move candidate</span><select value={selected.status} onChange={(e) => updateStatus(selected.id, e.target.value)}>{statuses.map((s) => <option key={s}>{s}</option>)}</select></label>
        <section className="rpx-git-form">
          <div className="rpx-git-form-head"><strong>GitHub project analysis</strong><span>{githubScan?.status || "Loading"}</span></div>
          <p>Projects are scanned automatically after application, ranked against this job, and refreshed at most once per student each month.</p>
          {scanLoading && <div className="rpx-loading">Loading scan status...</div>}
          {!scanLoading && githubScan?.status && <p>Scan status: <strong>{githubScan.status}</strong>{githubScan.month_key ? ` · ${githubScan.month_key}` : ""}{githubScan.error_code ? ` · ${githubScan.error_code}` : ""}</p>}
          {githubScan?.status === "COMPLETED" && (githubScan.repositories || []).length > 0 && <div className="rpx-public-repo-list">
            {githubScan.repositories.map((repo) => <article className="rpx-public-repo" key={repo.repository}><div className="rpx-public-repo-main"><a href={repo.url} target="_blank" rel="noreferrer">{repo.repository} (open)</a><p>{repo.analysis?.architecture_summary || repo.analysis?.job_relevance || repo.description || "Analysis completed."}</p><div className="rpx-public-repo-meta"><span>{repo.language || "Language not detected"}</span><span>Job relevance {Math.round((repo.relevance_score || 0) * 100)}%</span><span>{repo.files_indexed || 0} files indexed</span></div></div></article>)}
          </div>}
          {!scanLoading && githubScan?.status === "COMPLETED" && !(githubScan.repositories || []).length && <p>The scan completed but no readable repositories matched this role.</p>}
          {githubScan?.status === "NO_GITHUB_URL" && <p>The student has not saved a GitHub profile URL.</p>}
          <button className="rpx-button primary" type="button" disabled={githubScan?.status !== "COMPLETED" || !(githubScan?.repositories || []).length} onClick={() => { setQnaOpen(true); setQnaAnswer(null); setQnaError(""); }}>Project Q&amp;A</button>
        </section>
        <Link className="rpx-button secondary full-btn" style={{ marginTop: 12 }} to="/recruiter/ai-candidates">Open AI candidate intelligence</Link>
      </section></div>}
      {qnaOpen && selected && <div className="rpx-analysis-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setQnaOpen(false); }}>
        <section className="rpx-analysis-modal" role="dialog" aria-modal="true" aria-label="Project Q&A">
          <div className="rpx-analysis-head"><div><span className="rpx-kicker">STUDENT-SCOPED PROJECT Q&amp;A</span><h2>{studentNameFor(selected)} · application #{selected.id}</h2><p>Answers use retrieved chunks from this student's indexed repositories.</p></div><button className="rpx-icon-button" onClick={() => setQnaOpen(false)}>X</button></div>
          <form className="rpx-analysis-evidence" onSubmit={submitProjectQuestion}>
            <label className="rpx-field"><span>Ask about the analyzed projects</span><textarea rows={4} value={qnaQuestion} onChange={(e) => setQnaQuestion(e.target.value)} placeholder="How does this project authenticate users?" required minLength={3} maxLength={2000} /></label>
            {qnaError && <div className="rpx-alert is-error" role="alert">{qnaError}</div>}
            <button className="rpx-button primary" type="submit" disabled={qnaLoading || !qnaQuestion.trim()}>{qnaLoading ? "Retrieving project evidence..." : "Ask project question"}</button>
            {qnaAnswer && <section className="rpx-analysis-section"><h3>Answer</h3><p className="rpx-analysis-summary">{qnaAnswer.answer}</p>{qnaAnswer.evidence?.length > 0 && <><h3>Retrieved evidence</h3><div className="rpx-list-stack">{qnaAnswer.evidence.map((item, index) => <article className="rpx-list-item" key={index}><div><strong>{item.repository}</strong><span>{item.file_path}</span><span>{item.reason}</span></div></article>)}</div></>}</section>}
          </form>
          <div className="rpx-analysis-footer"><span>Evidence is restricted to student #{selected.student_id}.</span><button className="rpx-button secondary" onClick={() => setQnaOpen(false)}>Close</button></div>
        </section>
      </div>}
    </Shell>
  );
}

export function RecruiterInterviews() {
  const [schedules, setSchedules] = useState([]);
  const [interviewers, setInterviewers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [slots, setSlots] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [form, setForm] = useState({ company_id: "", name: "", email: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const result = await Promise.allSettled([
        api("/schedules/"),
        api("/interviewers/"),
        api("/companies/"),
        api("/rooms/"),
        api("/time-slots/"),
        api("/selection-rounds/"),
      ]);
      const val = (index) => result[index].status === "fulfilled" ? result[index].value || [] : [];
      setSchedules(val(0)); setInterviewers(val(1)); setCompanies(val(2)); setRooms(val(3)); setSlots(val(4)); setRounds(val(5));
      setMessage("");
    } catch (error) {
      setMessage(error.message || "Unable to load interviews.");
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const interviewerMap = useMemo(() => new Map(interviewers.map((i) => [String(i.id), i])), [interviewers]);
  const roomMap = useMemo(() => new Map(rooms.map((r) => [String(r.id), r])), [rooms]);
  const slotMap = useMemo(() => new Map(slots.map((s) => [String(s.id), s])), [slots]);
  const roundMap = useMemo(() => new Map(rounds.map((r) => [String(r.id), r])), [rounds]);

  async function createInterviewer() {
    if (!form.company_id || !form.name.trim() || !form.email.trim()) { setMessage("Company, name and email are required."); return; }
    try {
      setSaving(true);
      await api("/interviewers/", { method: "POST", body: JSON.stringify({ company_id: Number(form.company_id), name: form.name, email: form.email }) });
      setForm({ company_id: "", name: "", email: "" });
      setMessage("Interviewer created successfully.");
      await load();
    } catch (error) { setMessage(error.message || "Unable to create interviewer."); } finally { setSaving(false); }
  }

  const scheduled = schedules.filter((s) => s.status === "SCHEDULED").length;
  const completed = schedules.filter((s) => String(s.status || "").includes("COMPLETED") || String(s.status || "").includes("DONE")).length;

  return (
    <Shell eyebrow="Recruiter / Interviews" title="Interview Control Room" description="Monitor interviewer capacity, scheduled rounds, rooms and time slots from a single view." right={<button className="rpx-button secondary" onClick={load}>↻ Refresh</button>}>
      <PageMessage message={message} />
      <div className="rpx-kpi-grid">
        <KPI label="Scheduled" value={scheduled} helper="Active interview slots" icon="◷" />
        <KPI label="Completed" value={completed} helper="Completed or done" icon="✓" />
        <KPI label="Interviewers" value={interviewers.length} helper="Available in backend" icon="◎" />
        <KPI label="Rooms" value={rooms.length} helper="Configured rooms" icon="▤" />
      </div>

      <div className="rpx-split">
        <Section title="Add interviewer" subtitle="Create a company-linked interviewer profile.">
          <div className="rpx-form-grid">
            <label className="rpx-field"><span>Company</span><select value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}><option value="">Select company</option>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label className="rpx-field"><span>Full name</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Priya Sharma" /></label>
            <label className="rpx-field full"><span>Email</span><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="priya@example.com" /></label>
          </div>
          <div className="rpx-form-footer"><button className="rpx-button primary" onClick={createInterviewer} disabled={saving}>{saving ? "Creating…" : "Create interviewer"}</button></div>
        </Section>
        <Section title="Interviewer directory" subtitle={`${interviewers.length} profiles`}>
          <div className="rpx-list-stack">{interviewers.slice(0, 6).map((i) => <div className="rpx-list-item" key={i.id}><div className="rpx-avatar">{String(i.name || "I").slice(0,1).toUpperCase()}</div><div><strong>{i.name}</strong><span>{i.email}</span></div><StatusPill value={i.is_active ? "ACTIVE" : "INACTIVE"} /></div>)}</div>
        </Section>
      </div>

      <Section title="Scheduled interviews" subtitle={`${schedules.length} schedules returned by the backend`}>
        {loading ? <div className="rpx-loading">Loading interview schedules…</div> : schedules.length === 0 ? <Empty title="No interviews scheduled" text="Scheduled interview records will appear here." action={<Link className="rpx-button secondary" to="/recruiter/applications">Review applications</Link>} /> : (
          <div className="rpx-timeline">
            {schedules.map((s, index) => {
              const interviewer = interviewerMap.get(String(s.interviewer_id));
              const room = roomMap.get(String(s.room_id));
              const slot = slotMap.get(String(s.time_slot_id));
              const round = roundMap.get(String(s.selection_round_id));
              const slotDate = slot?.slot_date || slot?.date;
              return <div className="rpx-timeline-item" key={s.id}><div className="rpx-timeline-dot">{index + 1}</div><div className="rpx-timeline-card"><div className="rpx-job-top"><div><div className="rpx-kicker">SCHEDULE #{s.id} · {round?.name || `Round ${s.selection_round_id}`}</div><h3>Student {s.student_id}</h3></div><StatusPill value={s.status} /></div><div className="rpx-job-tags"><span>◷ {dateLabel(slotDate)} {timeLabel(slot?.start_time)}{slot?.end_time ? `–${timeLabel(slot.end_time)}` : ""}</span><span>◎ {interviewer?.name || `Interviewer ${s.interviewer_id}`}</span><span>▤ {room?.name || `Room ${s.room_id}`}</span></div><div className="rpx-muted">Notes: {s.notes || "No notes recorded."}</div></div></div>;
            })}
          </div>
        )}
      </Section>
    </Shell>
  );
}

export function RecruiterOffers() {
  const [offers, setOffers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [form, setForm] = useState({ application_id: "", salary_package: "", joining_date: "", offer_letter_url: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");

  async function load() {
    try {
      setLoading(true);
      const [offerData, applicationData, jobData] = await Promise.all([api("/offers/"), api("/applications/"), api("/job-drives/")]);
      setOffers(offerData || []); setApplications(applicationData || []); setJobs(jobData || []); setMessage("");
    } catch (error) { setMessage(error.message || "Unable to load offers."); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const jobMap = useMemo(() => new Map(jobs.map((j) => [String(j.id), j])), [jobs]);
  const appMap = useMemo(() => new Map(applications.map((a) => [String(a.id), a])), [applications]);
  const visibleOffers = offers.filter((o) => statusFilter === "ALL" || o.status === statusFilter);
  // Do not offer an application again if an offer record already exists for it.
  const applicationsWithOffers = new Set(offers.map((offer) => String(offer.application_id)));
  const offerReadyApps = applications.filter(
    (application) =>
      ["SELECTED", "OFFERED"].includes(application.status) &&
      !applicationsWithOffers.has(String(application.id))
  );

  async function createOffer() {
    if (!form.application_id) {
      setMessage("Select a candidate application first.");
      return;
    }

    const salaryPackage = parseSalaryPackage(form.salary_package);
    if (!Number.isFinite(salaryPackage) || salaryPackage <= 0) {
      setMessage("Enter a valid positive salary package, for example 10 or 8.5 LPA.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");
      await api("/offers/", {
        method: "POST",
        body: JSON.stringify({
          application_id: Number(form.application_id),
          salary_package: salaryPackage,
          joining_date: form.joining_date || null,
          offer_letter_url: form.offer_letter_url.trim() || null,
        }),
      });
      setForm({ application_id: "", salary_package: "", joining_date: "", offer_letter_url: "" });
      setMessage("Offer created successfully.");
      await load();
    } catch (error) {
      setMessage(error?.message || "Unable to create offer.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id, status) {
    try { await api(`/offers/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }); await load(); }
    catch (error) { setMessage(error.message || "Unable to update offer."); }
  }

  const issued = offers.filter((o) => o.status === "ISSUED").length;
  const accepted = offers.filter((o) => o.status === "ACCEPTED").length;
  const rejected = offers.filter((o) => o.status === "REJECTED").length;

  return (
    <Shell eyebrow="Recruiter / Offers" title="Offer Management" description="Create, issue and monitor placement offers for selected candidates." right={<button className="rpx-button secondary" onClick={load}>↻ Refresh</button>}>
      <PageMessage message={message} type={message.includes("successfully") ? "info" : "error"} />
      <div className="rpx-kpi-grid"><KPI label="Total offers" value={offers.length} helper="Offer records" icon="◆" /><KPI label="Issued" value={issued} helper="Sent to candidates" icon="↗" /><KPI label="Accepted" value={accepted} helper="Closed successfully" icon="✓" /><KPI label="Rejected" value={rejected} helper="Declined offers" icon="×" /></div>

      <Section title="Create an offer" subtitle="Offers can be created for selected or already-offered applications.">
        <div className="rpx-form-grid">
          <label className="rpx-field"><span>Candidate application</span><select value={form.application_id} onChange={(e) => setForm({ ...form, application_id: e.target.value })}><option value="">Select application</option>{offerReadyApps.length === 0 ? <option value="__none" disabled>No eligible applications without an existing offer</option> : offerReadyApps.map((a) => <option key={a.id} value={a.id}>#{a.id} · Student {a.student_id} · {prettyStatus(a.status)}</option>)}</select></label>
          <label className="rpx-field"><span>Salary package (LPA)</span><input inputMode="decimal" value={form.salary_package} onChange={(e) => setForm({ ...form, salary_package: e.target.value })} placeholder="e.g. 10 or 8.5 LPA" /></label>
          <label className="rpx-field"><span>Joining date</span><input type="date" value={form.joining_date} onChange={(e) => setForm({ ...form, joining_date: e.target.value })} /></label>
          <label className="rpx-field"><span>Offer letter URL</span><input value={form.offer_letter_url} onChange={(e) => setForm({ ...form, offer_letter_url: e.target.value })} placeholder="https://…" /></label>
        </div>
        <div className="rpx-form-footer"><button className="rpx-button primary" onClick={createOffer} disabled={saving}>{saving ? "Creating…" : "Create offer"}</button></div>
      </Section>

      <Section title="Offer book" subtitle={`${visibleOffers.length} visible`} action={<div className="rpx-filter-row"><select className="rpx-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="ALL">All statuses</option><option value="DRAFT">Draft</option><option value="ISSUED">Issued</option><option value="ACCEPTED">Accepted</option><option value="REJECTED">Rejected</option><option value="EXPIRED">Expired</option></select></div>}>
        {loading ? <div className="rpx-loading">Loading offers…</div> : visibleOffers.length === 0 ? <Empty title="No offers yet" text="Create an offer for a selected candidate to start the offer flow." /> : <div className="rpx-table-wrap"><table className="rpx-table"><thead><tr><th>Offer</th><th>Candidate</th><th>Drive</th><th>Package</th><th>Joining</th><th>Status</th><th>Update</th></tr></thead><tbody>{visibleOffers.map((o) => { const app = appMap.get(String(o.application_id)); const job = jobMap.get(String(app?.job_drive_id)); return <tr key={o.id}><td>#{o.id}</td><td>Student {app?.student_id ?? "—"}</td><td>{job?.title || "—"}</td><td><strong>{o.salary_package}</strong></td><td>{dateLabel(o.joining_date)}</td><td><StatusPill value={o.status} /></td><td><select className="rpx-inline-select" value={o.status} onChange={(e) => updateStatus(o.id, e.target.value)}><option>DRAFT</option><option>ISSUED</option><option>ACCEPTED</option><option>REJECTED</option><option>EXPIRED</option></select></td></tr>; })}</tbody></table></div>}
      </Section>

      <div className="rpx-note">Only selected applications without an existing offer can receive a new offer. Issue the draft offer to notify the student.</div>
    </Shell>
  );
}

export function RecruiterNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function load() {
    try {
      setLoading(true);
      const [data, count] = await Promise.all([api("/notifications/"), api("/notifications/unread-count").catch(() => null)]);
      setNotifications(data || []); setUnread(Number(count?.count ?? count?.unread_count ?? 0)); setMessage("");
    } catch (error) { setMessage(error.message || "Unable to load notifications."); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notifications.filter((n) => {
      const matchesQ = !q || `${n.title} ${n.message} ${n.notification_type}`.toLowerCase().includes(q);
      const matchesFilter = filter === "ALL" || (filter === "UNREAD" ? !n.is_read : n.notification_type === filter);
      return matchesQ && matchesFilter;
    });
  }, [notifications, query, filter]);

  async function markRead(id) { try { await api(`/notifications/${id}/read`, { method: "PATCH" }); await load(); } catch (error) { setMessage(error.message || "Unable to mark notification as read."); } }
  async function markAll() { try { await api("/notifications/read-all", { method: "PATCH" }); await load(); } catch (error) { setMessage(error.message || "Unable to mark notifications as read."); } }

  const typeData = Object.entries(notifications.reduce((acc, n) => { const k = n.notification_type || "OTHER"; acc[k] = (acc[k] || 0) + 1; return acc; }, {})).map(([name, value]) => ({ name, value }));

  return (
    <Shell eyebrow="Recruiter / Notifications" title="Notification Center" description="Stay on top of hiring events, candidate activity and system updates." right={<div className="rpx-action-row"><button className="rpx-button secondary" onClick={markAll} disabled={!unread}>✓ Mark all read</button><button className="rpx-button secondary" onClick={load}>↻ Refresh</button></div>}>
      <PageMessage message={message} />
      <div className="rpx-kpi-grid"><KPI label="Unread" value={unread} helper="Needs attention" icon="●" /><KPI label="All notifications" value={notifications.length} helper="Stored in backend" icon="◌" /><KPI label="Types" value={typeData.length} helper="Notification categories" icon="◇" /><KPI label="Unread rate" value={`${notifications.length ? Math.round((unread / notifications.length) * 100) : 0}%`} helper="Current inbox signal" icon="↗" /></div>

      <div className="rpx-chart-grid two">
        <Section title="Notification mix" subtitle="Distribution by event type.">
          {typeData.length ? <div className="rpx-chart"><ResponsiveContainer width="100%" height={240}><PieChart><Pie data={typeData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={88} paddingAngle={3}>{typeData.map((entry, index) => <Cell key={entry.name} fill={chartPalette[index % chartPalette.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div> : <Empty title="No notification history" text="Notifications will appear when backend events are created." />}
        </Section>
        <Section title="Inbox controls" subtitle="Search and focus the events that matter.">
          <div className="rpx-control-stack"><input className="rpx-search full" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search notifications…" /><select className="rpx-filter full" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="ALL">All messages</option><option value="UNREAD">Unread only</option>{typeData.map((x) => <option key={x.name} value={x.name}>{x.name}</option>)}</select><div className="rpx-control-tip">Unread notifications remain highlighted until marked as read.</div></div>
        </Section>
      </div>

      <Section title="Inbox" subtitle={`${filtered.length} visible`}>
        {loading ? <div className="rpx-loading">Loading notifications…</div> : filtered.length === 0 ? <Empty title="Inbox is clear" text="No notifications match the current filter." /> : <div className="rpx-notification-list">{filtered.map((n) => <article className={`rpx-notification ${n.is_read ? "is-read" : ""}`} key={n.id}><div className="rpx-notif-icon">{n.is_read ? "✓" : "●"}</div><div className="rpx-notif-body"><div className="rpx-notif-top"><div><span className="rpx-kicker">{n.notification_type || "SYSTEM"}</span><h3>{n.title}</h3></div><span className="rpx-muted">{dateLabel(n.created_at)}</span></div><p>{n.message}</p>{!n.is_read && <button className="rpx-button small secondary" onClick={() => markRead(n.id)}>Mark as read</button>}</div></article>)}</div>}
      </Section>
    </Shell>
  );
}

const CSS = `
.rpx-shell{min-height:100vh;background:#f6f8fc;color:#0f172a;display:flex;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.rpx-sidebar{width:250px;background:#0b1220;color:#e2e8f0;padding:20px 14px;display:flex;flex-direction:column;position:sticky;top:0;height:100vh;box-sizing:border-box}.rpx-brand{display:flex;align-items:center;gap:11px;padding:8px 8px 24px;cursor:pointer}.rpx-brand-mark{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#2563eb,#7c3aed);display:grid;place-items:center;font-weight:800;color:#fff}.rpx-brand-name{font-size:15px;font-weight:800}.rpx-brand-sub{font-size:10px;color:#94a3b8;margin-top:2px}.rpx-nav-label{font-size:10px;letter-spacing:.14em;color:#64748b;padding:0 12px 8px}.rpx-nav{display:grid;gap:5px}.rpx-nav-item{color:#94a3b8;text-decoration:none;display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;font-size:12px;transition:.18s ease}.rpx-nav-item:hover{background:#172033;color:#fff;transform:translateX(2px)}.rpx-nav-item.is-active{background:linear-gradient(135deg,#1d4ed8,#4338ca);color:#fff;box-shadow:0 10px 25px #0003}.rpx-nav-icon{width:18px;text-align:center;font-size:15px}.rpx-sidebar-foot{margin-top:auto;display:grid;gap:10px}.rpx-mini-card{border:1px solid #1f2b3f;background:#121b2c;border-radius:12px;padding:12px}.rpx-mini-title{font-size:11px;font-weight:700;color:#fff}.rpx-mini-text{font-size:10px;color:#94a3b8;margin-top:4px;line-height:1.45}.rpx-logout{border:1px solid #263349;background:transparent;color:#cbd5e1;border-radius:10px;padding:10px 12px;text-align:left;cursor:pointer}.rpx-main{flex:1;min-width:0}.rpx-topbar{padding:30px 34px 20px;display:flex;justify-content:space-between;gap:20px;border-bottom:1px solid #e5eaf1;background:rgba(255,255,255,.88);backdrop-filter:blur(14px);position:sticky;top:0;z-index:10}.rpx-topbar h1{margin:3px 0 4px;font-size:28px;letter-spacing:-.025em}.rpx-topbar p{margin:0;color:#64748b;font-size:12px;max-width:760px}.rpx-eyebrow,.rpx-kicker{font-size:10px;letter-spacing:.13em;text-transform:uppercase;color:#2563eb;font-weight:800}.rpx-top-actions{display:flex;align-items:flex-start}.rpx-content{padding:26px 34px 40px;display:grid;gap:22px;max-width:1500px}.rpx-kpi-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.rpx-mini-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.rpx-kpi{background:#fff;border:1px solid #e8edf4;border-radius:14px;padding:17px;display:flex;gap:12px;box-shadow:0 8px 28px rgba(15,23,42,.045)}.rpx-kpi-icon{width:36px;height:36px;border-radius:10px;background:#eff6ff;color:#1d4ed8;display:grid;place-items:center;font-weight:800}.rpx-kpi-label{font-size:10px;color:#64748b}.rpx-kpi-value{font-size:26px;font-weight:800;line-height:1.1;margin-top:2px}.rpx-kpi-help{font-size:10px;color:#94a3b8;margin-top:5px}.rpx-section{background:#fff;border:1px solid #e7edf5;border-radius:15px;padding:18px;box-shadow:0 8px 28px rgba(15,23,42,.04)}.rpx-section-head{display:flex;justify-content:space-between;align-items:flex-start;gap:15px;margin-bottom:15px}.rpx-section-head h2{margin:0;font-size:15px}.rpx-section-head p{margin:4px 0 0;color:#64748b;font-size:11px}.rpx-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.rpx-field{display:grid;gap:6px;font-size:10px;color:#475569;font-weight:700}.rpx-field.full{grid-column:1/-1}.rpx-field input,.rpx-field select,.rpx-field textarea,.rpx-search,.rpx-filter{width:100%;box-sizing:border-box;border:1px solid #dce4ef;background:#fbfdff;border-radius:10px;padding:10px 11px;font:inherit;color:#0f172a;outline:none;transition:.16s}.rpx-field textarea{min-height:94px;resize:vertical}.rpx-field input:focus,.rpx-field select:focus,.rpx-field textarea:focus,.rpx-search:focus,.rpx-filter:focus{border-color:#93c5fd;box-shadow:0 0 0 3px #dbeafe}.rpx-form-footer{display:flex;justify-content:flex-end;margin-top:14px}.rpx-button{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid transparent;border-radius:10px;padding:9px 13px;font-size:11px;font-weight:800;text-decoration:none;cursor:pointer;transition:.17s ease;white-space:nowrap}.rpx-button:hover{transform:translateY(-1px)}.rpx-button:disabled{opacity:.5;cursor:not-allowed;transform:none}.rpx-button.primary{background:#1d4ed8;color:#fff;box-shadow:0 8px 20px #1d4ed822}.rpx-button.secondary{background:#fff;color:#334155;border-color:#dbe3ee}.rpx-button.success{background:#ecfdf5;color:#047857;border-color:#a7f3d0}.rpx-button.warning{background:#fffbeb;color:#b45309;border-color:#fde68a}.rpx-button.danger{background:#fef2f2;color:#b91c1c;border-color:#fecaca}.rpx-button.small{padding:7px 10px;font-size:10px}.rpx-action-row,.rpx-filter-row{display:flex;gap:8px;align-items:center}.rpx-split{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(320px,.85fr);gap:18px}.rpx-chart-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.rpx-chart-grid.two{grid-template-columns:repeat(2,minmax(0,1fr))}.rpx-chart{height:250px}.rpx-health-list{display:grid;gap:14px;padding-top:7px}.rpx-health-list div{display:flex;justify-content:space-between;align-items:center;padding:12px;border-radius:10px;background:#f8fafc;border:1px solid #e8edf4;font-size:11px}.rpx-health-list strong{font-size:16px}.rpx-company-grid,.rpx-job-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.rpx-company-card,.rpx-job-card{border:1px solid #e7edf5;border-radius:13px;padding:15px;background:#fbfdff;transition:.18s ease}.rpx-company-card:hover,.rpx-job-card:hover{transform:translateY(-2px);box-shadow:0 15px 34px rgba(15,23,42,.08)}.rpx-company-head,.rpx-job-top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.rpx-company-head{justify-content:flex-start}.rpx-company-avatar,.rpx-avatar{width:38px;height:38px;border-radius:11px;background:linear-gradient(135deg,#dbeafe,#ede9fe);color:#1d4ed8;display:grid;place-items:center;font-weight:800}.rpx-company-card h3,.rpx-job-card h3{margin:4px 0 2px;font-size:14px}.rpx-company-head span,.rpx-company-meta,.rpx-job-card p,.rpx-muted{font-size:10px;color:#64748b}.rpx-company-card p,.rpx-job-card p{line-height:1.55;margin:13px 0}.rpx-company-meta{display:flex;gap:10px;margin-top:12px;flex-wrap:wrap}.rpx-link{font-size:11px;color:#2563eb;text-decoration:none;font-weight:700}.rpx-job-tags,.rpx-skill-line{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}.rpx-job-tags span,.rpx-skill-line span{padding:5px 7px;border:1px solid #e2e8f0;background:#fff;border-radius:999px;font-size:9px;color:#475569}.rpx-job-meta{display:flex;justify-content:space-between;gap:10px;font-size:9px;color:#64748b;margin-top:12px}.rpx-card-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:13px}.rpx-pill{display:inline-flex;align-items:center;padding:5px 8px;border-radius:999px;font-size:9px;font-weight:800;white-space:nowrap}.rpx-pill.positive{background:#ecfdf5;color:#047857}.rpx-pill.negative{background:#fef2f2;color:#b91c1c}.rpx-pill.warning{background:#fffbeb;color:#b45309}.rpx-pill.neutral{background:#eef2ff;color:#4338ca}.rpx-table-wrap{overflow:auto}.rpx-table{width:100%;border-collapse:collapse;min-width:900px}.rpx-table th{font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#64748b;text-align:left;padding:11px 10px;border-bottom:1px solid #e8edf4}.rpx-table td{font-size:11px;padding:13px 10px;border-bottom:1px solid #edf1f6;vertical-align:middle}.rpx-table tr:hover td{background:#fbfdff}.rpx-table-link{border:none;background:none;padding:0;color:#2563eb;font-weight:800;cursor:pointer}.rpx-inline-select{border:1px solid #dbe3ee;background:#fff;border-radius:8px;padding:6px 8px;font-size:10px}.rpx-search{min-width:260px}.rpx-filter{width:auto;min-width:140px}.rpx-loading{text-align:center;padding:34px;color:#64748b;font-size:12px}.rpx-empty{text-align:center;padding:45px 20px}.rpx-empty-icon{margin:auto;width:40px;height:40px;border-radius:50%;background:#eff6ff;color:#2563eb;display:grid;place-items:center;font-size:20px}.rpx-empty h3{margin:10px 0 4px;font-size:14px}.rpx-empty p{margin:0 auto 15px;color:#64748b;font-size:11px;max-width:440px}.rpx-alert{padding:11px 13px;border-radius:10px;background:#ecfdf5;border:1px solid #a7f3d0;color:#047857;font-size:11px}.rpx-alert.is-error{background:#fef2f2;border-color:#fecaca;color:#b91c1c}.rpx-drawer-backdrop{position:fixed;inset:0;background:#0f172a66;z-index:40}.rpx-drawer{position:absolute;right:0;top:0;height:100%;width:min(440px,100%);background:#fff;box-shadow:-20px 0 60px #0f172a22;padding:22px;box-sizing:border-box;overflow:auto}.rpx-drawer-head{display:flex;justify-content:space-between;gap:15px}.rpx-drawer-head h2{margin:3px 0 0}.rpx-icon-button{border:1px solid #e2e8f0;background:#fff;width:32px;height:32px;border-radius:9px;cursor:pointer;font-size:22px}.rpx-detail-stack{display:grid;gap:10px;margin:18px 0}.rpx-detail-card{padding:12px;border:1px solid #e8edf4;border-radius:10px;background:#f8fafc;display:flex;justify-content:space-between;gap:12px;align-items:center}.rpx-detail-card span{font-size:10px;color:#64748b}.rpx-detail-card strong{font-size:11px}.full-btn{width:100%;box-sizing:border-box}.rpx-list-stack{display:grid;gap:8px}.rpx-list-item{display:flex;align-items:center;gap:10px;padding:10px;border:1px solid #e7edf5;border-radius:10px}.rpx-list-item>div:nth-child(2){display:grid;gap:2px;flex:1}.rpx-list-item strong{font-size:11px}.rpx-list-item span{font-size:9px;color:#64748b}.rpx-timeline{display:grid;gap:12px}.rpx-timeline-item{display:grid;grid-template-columns:34px 1fr;gap:10px}.rpx-timeline-dot{width:28px;height:28px;border-radius:50%;background:#1d4ed8;color:#fff;display:grid;place-items:center;font-size:10px;font-weight:800;margin-top:8px}.rpx-timeline-card{padding:14px;border:1px solid #e7edf5;border-radius:12px;background:#fbfdff}.rpx-control-stack{display:grid;gap:10px}.rpx-search.full,.rpx-filter.full{width:100%;min-width:0}.rpx-control-tip{font-size:10px;color:#64748b;line-height:1.5;padding:10px;border-radius:10px;background:#f8fafc}.rpx-notification-list{display:grid;gap:10px}.rpx-notification{display:flex;gap:12px;padding:14px;border:1px solid #dbeafe;background:#f8fbff;border-radius:12px}.rpx-notification.is-read{border-color:#e8edf4;background:#fff}.rpx-notif-icon{width:28px;height:28px;border-radius:9px;background:#dbeafe;color:#2563eb;display:grid;place-items:center;font-size:11px;flex:0 0 auto}.rpx-notif-body{flex:1}.rpx-notif-top{display:flex;justify-content:space-between;gap:10px}.rpx-notif-top h3{font-size:13px;margin:4px 0 0}.rpx-notif-body p{font-size:11px;color:#475569;line-height:1.55;margin:7px 0 10px}.rpx-note{padding:11px 13px;border-radius:10px;background:#fffbeb;border:1px solid #fde68a;color:#92400e;font-size:10px;line-height:1.5}

.rpx-applications-table{min-width:1160px}.rpx-app-student{display:grid;gap:3px}.rpx-app-student strong{font-size:11px;color:#17243b}.rpx-app-student span{font-size:9px;color:#64748b}.rpx-git-cell{display:grid;justify-items:start;gap:6px}.rpx-git-missing{font-size:9px;color:#b45309;background:#fffbeb;border:1px solid #fde68a;padding:4px 7px;border-radius:999px}.rpx-git-form{margin-top:18px;padding:15px;border:1px solid #dbeafe;background:#f8fbff;border-radius:13px;display:grid;gap:12px}.rpx-git-form-head{display:flex;justify-content:space-between;align-items:center;gap:10px}.rpx-git-form-head strong{font-size:13px;color:#12213a}.rpx-git-form-head span{font-size:9px;letter-spacing:.07em;text-transform:uppercase;color:#1d4ed8;background:#eaf1ff;padding:5px 7px;border-radius:999px;font-weight:800}.rpx-git-form p{font-size:11px;color:#64748b;line-height:1.55;margin:0}.rpx-analysis-backdrop{position:fixed;inset:0;background:rgba(8,15,31,.68);z-index:80;display:flex;align-items:center;justify-content:center;padding:18px;backdrop-filter:blur(5px)}.rpx-analysis-modal{width:min(1000px,100%);max-height:calc(100vh - 36px);background:#f7f9fc;border:1px solid #e2e8f0;border-radius:20px;box-shadow:0 32px 100px rgba(0,0,0,.3);display:flex;flex-direction:column;overflow:hidden}.rpx-analysis-head{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;padding:25px 28px;background:linear-gradient(135deg,#0f1e36,#1e3a8a);color:#fff}.rpx-analysis-head .rpx-kicker{color:#93c5fd}.rpx-analysis-head h2{font-size:23px;margin:7px 0 5px;letter-spacing:-.02em}.rpx-analysis-head p{font-size:12px;color:#dbeafe;margin:0 0 8px}.rpx-analysis-head a{font-size:11px;color:#bfdbfe;text-decoration:none;overflow-wrap:anywhere}.rpx-analysis-head .rpx-icon-button{background:#ffffff18;border-color:#ffffff40;color:#fff;flex-shrink:0}.rpx-analysis-score-row{padding:17px 22px;display:grid;grid-template-columns:1.1fr repeat(3,minmax(0,1fr));gap:10px;background:#fff;border-bottom:1px solid #e5eaf1}.rpx-analysis-score,.rpx-analysis-score-detail{border:1px solid #e5eaf1;border-radius:13px;padding:13px;background:#fbfdff;min-width:0}.rpx-analysis-score{background:linear-gradient(135deg,#eef4ff,#f5f3ff);border-color:#c7d7ff}.rpx-analysis-score span,.rpx-analysis-score-detail span{display:block;color:#64748b;text-transform:uppercase;letter-spacing:.08em;font-size:9px;font-weight:800}.rpx-analysis-score strong{display:block;font-size:25px;color:#1d4ed8;margin:7px 0 4px}.rpx-analysis-score small{display:block;color:#64748b;font-size:9px;line-height:1.4}.rpx-analysis-score-detail strong{display:block;margin-top:8px;color:#17243b;font-size:13px;line-height:1.45;overflow-wrap:anywhere}.rpx-analysis-evidence{padding:20px 22px 23px;overflow:auto;display:grid;gap:15px}.rpx-analysis-section{background:#fff;border:1px solid #e7edf5;border-radius:14px;padding:16px}.rpx-analysis-section h3{font-size:13px;color:#12213a;margin:0 0 12px}.rpx-analysis-facts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.rpx-analysis-facts>div{padding:11px;border:1px solid #edf1f6;border-radius:10px;background:#fbfdff;min-width:0}.rpx-analysis-facts span{display:block;font-size:9px;color:#64748b}.rpx-analysis-facts strong{display:block;margin-top:5px;font-size:11px;line-height:1.4;color:#17243b;overflow-wrap:anywhere}.rpx-analysis-summary{margin:0;color:#334155;font-size:12px;line-height:1.7;white-space:pre-wrap;overflow-wrap:anywhere}.rpx-analysis-result-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.rpx-analysis-result-item{border:1px solid #edf1f6;border-radius:11px;padding:12px;background:#fbfdff;min-width:0}.rpx-analysis-result-item span{display:block;text-transform:capitalize;font-size:10px;font-weight:800;color:#475569;margin-bottom:7px}.rpx-analysis-result-item p{font-size:11px;line-height:1.6;color:#334155;white-space:pre-wrap;overflow-wrap:anywhere;margin:0}.rpx-analysis-footer{padding:13px 22px;display:flex;justify-content:space-between;align-items:center;gap:15px;border-top:1px solid #e5eaf1;background:#fff}.rpx-analysis-footer>span{font-size:10px;line-height:1.5;color:#64748b}
.rpx-public-repo-head{display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:11px;color:#17243b;margin:5px 0 0}.rpx-public-repo-head span{font-size:9px;color:#64748b;font-weight:500}.rpx-public-repo-list{display:grid;gap:8px;max-height:360px;overflow:auto}.rpx-public-repo{display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid #e2e8f0;border-radius:11px;background:#fff;padding:11px}.rpx-public-repo-main{min-width:0;flex:1}.rpx-public-repo-main>a{font-size:11px;font-weight:800;color:#1d4ed8;text-decoration:none;overflow-wrap:anywhere}.rpx-public-repo-main>p{font-size:10px;line-height:1.45;color:#64748b;margin:5px 0}.rpx-public-repo-meta{display:flex;gap:8px;flex-wrap:wrap;font-size:9px;color:#64748b}.rpx-public-repo-action{display:grid;justify-items:end;gap:6px;flex:0 0 auto}.rpx-batch-results{display:grid;gap:8px;margin-top:6px}.rpx-batch-result{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px;border:1px solid #e2e8f0;background:#fff;border-radius:11px}.rpx-batch-result>div{min-width:0;flex:1}.rpx-batch-result strong{display:block;font-size:11px;overflow-wrap:anywhere}.rpx-batch-result span{display:block;margin-top:4px;color:#1d4ed8;font-size:9px;font-weight:800}.rpx-batch-result p{font-size:10px;line-height:1.5;color:#475569;margin:6px 0 0;white-space:pre-wrap;overflow-wrap:anywhere}

@media(max-width:720px){.rpx-analysis-backdrop{padding:8px}.rpx-analysis-modal{max-height:calc(100vh - 16px);border-radius:14px}.rpx-analysis-head{padding:18px}.rpx-analysis-head h2{font-size:19px}.rpx-analysis-score-row{grid-template-columns:repeat(2,minmax(0,1fr));padding:12px}.rpx-analysis-score{grid-column:1/-1}.rpx-analysis-evidence{padding:12px}.rpx-analysis-facts{grid-template-columns:repeat(2,minmax(0,1fr))}.rpx-analysis-result-grid{grid-template-columns:1fr}.rpx-analysis-footer{align-items:flex-start;padding:12px}.rpx-analysis-footer>span{max-width:70%}}

@media(max-width:1150px){.rpx-kpi-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.rpx-company-grid,.rpx-job-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.rpx-split,.rpx-chart-grid.two{grid-template-columns:1fr}.rpx-sidebar{width:220px}}
@media(max-width:800px){.rpx-shell{display:block}.rpx-sidebar{position:static;width:auto;height:auto}.rpx-nav{grid-template-columns:repeat(4,minmax(0,1fr));overflow:auto}.rpx-nav-item{justify-content:center;padding:9px 7px}.rpx-nav-item span:last-child{display:none}.rpx-sidebar-foot{display:none}.rpx-topbar{position:static;padding:22px 18px;display:block}.rpx-top-actions{margin-top:13px}.rpx-content{padding:18px}.rpx-kpi-grid,.rpx-mini-grid,.rpx-form-grid,.rpx-company-grid,.rpx-job-grid{grid-template-columns:1fr}.rpx-section-head{display:block}.rpx-filter-row,.rpx-action-row{margin-top:10px;flex-wrap:wrap}.rpx-search{min-width:0;flex:1}.rpx-field.full{grid-column:auto}.rpx-table{min-width:900px}}
`;
