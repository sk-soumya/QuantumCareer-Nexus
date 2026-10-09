import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { calculateJobFit } from "./jobFit";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

function getToken() {
  return localStorage.getItem("campuslink_token") || "";
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

  const body = await response.text();
  let data = null;
  try { data = body ? JSON.parse(body) : null; } catch { data = body; }
  if (!response.ok) {
    throw new Error(data?.detail || data?.message || `Request failed (${response.status})`);
  }
  return data;
}

function dateOnly(value) {
  if (!value) return "—";
  const raw = String(value).slice(0, 10);
  const d = new Date(`${raw}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? raw
    : d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function statusTone(status) {
  if (status === "OPEN") return "good";
  if (status === "PAUSED") return "warn";
  if (status === "CLOSED") return "bad";
  return "muted";
}

function initials(value = "Company") {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join("").toUpperCase() || "C";
}

export default function StudentJobs() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [applications, setApplications] = useState([]);
  const [profile, setProfile] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("OPEN");
  const [type, setType] = useState("ALL");
  const [location, setLocation] = useState("ALL");
  const [sort, setSort] = useState("MATCH");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setMessage("");
    const [jobResult, companyResult, applicationResult, profileResult] = await Promise.allSettled([
      api("/job-drives/"),
      api("/companies/"),
      api("/applications/my"),
      api("/student-profile/me"),
    ]);
    if (jobResult.status === "fulfilled") setJobs(Array.isArray(jobResult.value) ? jobResult.value : []);
    if (companyResult.status === "fulfilled") setCompanies(Array.isArray(companyResult.value) ? companyResult.value : []);
    if (applicationResult.status === "fulfilled") setApplications(Array.isArray(applicationResult.value) ? applicationResult.value : []);
    if (profileResult.status === "fulfilled") setProfile(profileResult.value);

    const failed = [jobResult, companyResult, applicationResult].filter((x) => x.status === "rejected");
    if (failed.length) setMessage("Some placement data could not be loaded. Refresh and try again.");
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const companyMap = useMemo(
    () => new Map(companies.map((company) => [String(company.id), company])),
    [companies]
  );
  const applicationsByJob = useMemo(
    () => new Map(applications.map((application) => [String(application.job_drive_id), application])),
    [applications]
  );

  const typeOptions = useMemo(
    () => [...new Set(jobs.map((job) => job.job_type).filter(Boolean))],
    [jobs]
  );
  const locationOptions = useMemo(
    () => [...new Set(jobs.map((job) => job.location).filter(Boolean))],
    [jobs]
  );

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const enriched = jobs.map((job) => ({
      job,
      company: companyMap.get(String(job.company_id)),
      fit: calculateJobFit(job, profile || {}),
    }));

    return enriched
      .filter(({ job, company }) => {
        const text = [job.title, job.description, job.required_skills, job.location, job.job_type, company?.name].filter(Boolean).join(" ").toLowerCase();
        return (!query || text.includes(query))
          && (status === "ALL" || job.drive_status === status)
          && (type === "ALL" || job.job_type === type)
          && (location === "ALL" || job.location === location);
      })
      .sort((a, b) => {
        if (sort === "MATCH") return b.fit.overallScore - a.fit.overallScore;
        if (sort === "CGPA") return Number(b.job.minimum_cgpa || 0) - Number(a.job.minimum_cgpa || 0);
        if (sort === "LATEST") return String(b.job.created_at || "").localeCompare(String(a.job.created_at || ""));
        return String(a.job.title || "").localeCompare(String(b.job.title || ""));
      });
  }, [jobs, companyMap, profile, search, status, type, location, sort]);

  async function apply(job) {
    const existing = applicationsByJob.get(String(job.id));
    if (existing) {
      setMessage(`Application #${existing.id} already exists for this drive.`);
      return;
    }
    if (job.drive_status !== "OPEN") {
      setMessage("This drive is not open for applications.");
      return;
    }
    setBusyId(job.id);
    try {
      const created = await api("/applications/", {
        method: "POST",
        body: JSON.stringify({ job_drive_id: job.id }),
      });
      setApplications((current) => [created, ...current]);
      setMessage(`Application submitted for ${job.title}.`);
    } catch (error) {
      setMessage(error.message || "Unable to submit application.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="sj-page">
      <style>{CSS}</style>
      <header className="sj-header">
        <button className="sj-icon-btn" onClick={() => navigate("/student")}>←</button>
        <div className="sj-brand"><div className="sj-brand-mark">C</div><div><strong>CampusLink</strong><span>Job matching</span></div></div>
        <div className="sj-header-actions">
          <Link to="/student/applications" className="sj-btn secondary">My applications</Link>
          <Link to="/student/notifications" className="sj-icon-btn">◌</Link>
        </div>
      </header>

      <main className="sj-main">
        <section className="sj-hero">
          <div><span className="sj-eyebrow">STUDENT OPPORTUNITIES</span><h1>Job Drives</h1><p>Every drive below comes directly from the same backend record used by recruiters.</p></div>
          <div className="sj-hero-stats"><div><span>OPEN</span><strong>{jobs.filter((j) => j.drive_status === "OPEN").length}</strong></div><div><span>MY APPLICATIONS</span><strong>{applications.length}</strong></div></div>
        </section>

        {message && <div className="sj-message">{message}</div>}

        <section className="sj-filter-card">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search role, company, skill..." />
          <select value={status} onChange={(e) => setStatus(e.target.value)}><option value="OPEN">Open</option><option value="ALL">All statuses</option><option value="PAUSED">Paused</option><option value="CLOSED">Closed</option></select>
          <select value={type} onChange={(e) => setType(e.target.value)}><option value="ALL">All job types</option>{typeOptions.map((item) => <option key={item}>{item}</option>)}</select>
          <select value={location} onChange={(e) => setLocation(e.target.value)}><option value="ALL">All locations</option>{locationOptions.map((item) => <option key={item}>{item}</option>)}</select>
          <select value={sort} onChange={(e) => setSort(e.target.value)}><option value="MATCH">Best fit</option><option value="LATEST">Latest</option><option value="CGPA">Highest CGPA requirement</option><option value="TITLE">Role name</option></select>
        </section>

        {loading ? <div className="sj-empty"><strong>Loading job drives…</strong></div> : rows.length === 0 ? <div className="sj-empty"><strong>No job drives match your filters.</strong><span>Try another status, location, or search term.</span></div> : (
          <section className="sj-list">
            {rows.map(({ job, company, fit }) => {
              const application = applicationsByJob.get(String(job.id));
              return (
                <article className="sj-card" key={job.id}>
                  <div className="sj-company-logo">{initials(company?.name)}</div>
                  <div className="sj-card-main">
                    <div className="sj-card-top"><div><span className="sj-company">{company?.name || `Company #${job.company_id}`}</span><h2>{job.title}</h2></div><span className={`sj-status ${statusTone(job.drive_status)}`}>{job.drive_status}</span></div>
                    <div className="sj-meta"><span>{job.job_type || "Placement"}</span><span>{job.location || "Location not specified"}</span><span>CGPA ≥ {job.minimum_cgpa ?? "—"}</span><span>Deadline {dateOnly(job.application_deadline)}</span></div>
                    <p className="sj-description">{job.description || "No description provided."}</p>
                    <div className="sj-skill-row">{fit.requiredSkills.slice(0, 8).map((skill) => <span key={skill} className={fit.matchedSkills.includes(skill) ? "matched" : ""}>{skill}</span>)}</div>
                  </div>
                  <div className="sj-fit">
                    <div className="sj-score">{fit.overallScore}%</div><span>JOB FIT</span>
                    <small>{fit.matchedSkills.length}/{fit.requiredSkills.length || 0} skills · {fit.cgpaEligible ? "CGPA eligible" : "CGPA not met"}</small>
                    <button className="sj-btn secondary" onClick={() => setSelectedJob({ job, company, fit })}>Details</button>
                    {application ? <Link className="sj-btn primary" to="/student/applications">Applied</Link> : <button className="sj-btn primary" disabled={busyId === job.id} onClick={() => apply(job)}>{busyId === job.id ? "Applying…" : "Apply"}</button>}
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>

      {selectedJob && <div className="sj-overlay" onClick={() => setSelectedJob(null)}><aside className="sj-drawer" onClick={(e) => e.stopPropagation()}>
        <button className="sj-close" onClick={() => setSelectedJob(null)}>×</button>
        <span className="sj-eyebrow">JOB DRIVE #{selectedJob.job.id}</span>
        <div className="sj-drawer-title"><div><span className="sj-company">{selectedJob.company?.name || `Company #${selectedJob.job.company_id}`}</span><h2>{selectedJob.job.title}</h2></div><div className="sj-big-score"><strong>{selectedJob.fit.overallScore}%</strong><span>JOB FIT</span></div></div>
        <div className="sj-detail-grid"><div><span>Location</span><strong>{selectedJob.job.location || "—"}</strong></div><div><span>Package</span><strong>{selectedJob.job.salary_package || "—"}</strong></div><div><span>Minimum CGPA</span><strong>{selectedJob.job.minimum_cgpa ?? "—"}</strong></div><div><span>Deadline</span><strong>{dateOnly(selectedJob.job.application_deadline)}</strong></div><div><span>Job type</span><strong>{selectedJob.job.job_type || "—"}</strong></div><div><span>Status</span><strong>{selectedJob.job.drive_status || "—"}</strong></div></div>
        <section className="sj-section"><h3>Why this score?</h3><div className="sj-formula"><div><span>Skill fit</span><strong>{selectedJob.fit.skillScore}%</strong></div><div><span>CGPA signal</span><strong>{selectedJob.fit.cgpaScore}%</strong></div><div><span>Weights</span><strong>75% + 25%</strong></div></div><p><strong>Formula:</strong> 75% × Skill Fit + 25% × CGPA Fit. No generative AI model is used for this score.</p></section>
        <section className="sj-section"><h3>Matched skills</h3><div className="sj-skill-row">{(selectedJob.fit.matchedSkills.length ? selectedJob.fit.matchedSkills : ["None detected"]).map((skill) => <span key={skill} className="matched">{skill}</span>)}</div></section>
        <section className="sj-section"><h3>Skill gaps</h3><div className="sj-skill-row">{(selectedJob.fit.missingSkills.length ? selectedJob.fit.missingSkills : ["No gaps detected"]).map((skill) => <span key={skill}>{skill}</span>)}</div></section>
        <section className="sj-section"><h3>Description</h3><p>{selectedJob.job.description || "No description provided."}</p></section>
        <div className="sj-drawer-actions"><button className="sj-btn secondary" onClick={() => setSelectedJob(null)}>Close</button><button className="sj-btn primary" disabled={Boolean(applicationsByJob.get(String(selectedJob.job.id)))} onClick={() => apply(selectedJob.job)}>{applicationsByJob.get(String(selectedJob.job.id)) ? "Already applied" : "Apply for this drive"}</button></div>
      </aside></div>}
    </div>
  );
}

const CSS = `
.sj-page{min-height:100vh;background:#f5f7fb;color:#10213f}.sj-header{height:72px;background:#fff;border-bottom:1px solid #e5eaf1;display:flex;align-items:center;padding:0 24px;gap:14px;position:sticky;top:0;z-index:20}.sj-brand{display:flex;align-items:center;gap:10px;flex:1}.sj-brand-mark{width:38px;height:38px;border-radius:10px;background:#111c32;color:#fff;display:grid;place-items:center;font-weight:900}.sj-brand strong{display:block;font-size:15px}.sj-brand span{display:block;font-size:10px;color:#7a889e;margin-top:2px}.sj-icon-btn{width:38px;height:38px;border:1px solid #dce3ec;border-radius:10px;background:#fff;color:#29405f;display:grid;place-items:center;text-decoration:none;cursor:pointer}.sj-header-actions{display:flex;gap:8px}.sj-main{max-width:1480px;margin:auto;padding:28px 30px 50px}.sj-hero{display:flex;justify-content:space-between;gap:22px;align-items:flex-start;margin-bottom:18px}.sj-eyebrow{font-size:10px;letter-spacing:.14em;color:#2563eb;font-weight:900}.sj-hero h1{margin:6px 0 4px;font-size:32px;letter-spacing:-.03em}.sj-hero p{margin:0;color:#6b7b91;font-size:12px}.sj-hero-stats{display:flex;gap:10px}.sj-hero-stats div{background:#fff;border:1px solid #e1e7ef;border-radius:12px;padding:13px 16px;min-width:110px}.sj-hero-stats span{display:block;font-size:9px;color:#8794a8;font-weight:800}.sj-hero-stats strong{display:block;font-size:22px;margin-top:5px}.sj-filter-card{display:grid;grid-template-columns:2fr repeat(4,1fr);gap:8px;background:#fff;border:1px solid #e1e7ef;border-radius:12px;padding:12px;margin-bottom:14px}.sj-filter-card input,.sj-filter-card select{height:40px;border:1px solid #dbe2ea;border-radius:9px;padding:0 10px;background:#fff;color:#10213f;outline:none;font-size:11px}.sj-message{background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;padding:10px 12px;border-radius:9px;font-size:11px;margin-bottom:12px}.sj-list{display:grid;gap:10px}.sj-card{display:grid;grid-template-columns:48px minmax(0,1fr) 155px;gap:14px;background:#fff;border:1px solid #e1e7ef;border-radius:14px;padding:16px;box-shadow:0 6px 20px rgba(15,23,42,.035)}.sj-company-logo{width:46px;height:46px;border-radius:12px;background:#eef4ff;color:#2563eb;display:grid;place-items:center;font-size:12px;font-weight:900}.sj-card-top{display:flex;justify-content:space-between;gap:10px}.sj-company{font-size:10px;color:#64748b;font-weight:800;text-transform:uppercase;letter-spacing:.06em}.sj-card h2{font-size:16px;margin:4px 0 0}.sj-status{padding:5px 8px;border-radius:999px;font-size:9px;font-weight:900;height:max-content}.sj-status.good{background:#ecfdf5;color:#047857}.sj-status.warn{background:#fff7ed;color:#b45309}.sj-status.bad{background:#fef2f2;color:#b91c1c}.sj-status.muted{background:#f1f5f9;color:#475569}.sj-meta{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}.sj-meta span{border:1px solid #e5eaf1;background:#f8fafc;border-radius:999px;padding:5px 7px;color:#617086;font-size:9px}.sj-description{font-size:10px;line-height:1.55;color:#66758a;margin:10px 0}.sj-skill-row{display:flex;gap:6px;flex-wrap:wrap}.sj-skill-row span{padding:5px 7px;border-radius:7px;border:1px solid #dfe6ef;background:#f8fafc;color:#607087;font-size:9px}.sj-skill-row span.matched{background:#ecfdf5;border-color:#bbf7d0;color:#047857}.sj-fit{border-left:1px solid #edf1f6;padding-left:14px;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:7px}.sj-score{font-size:29px;font-weight:900;color:#2563eb;letter-spacing:-.04em}.sj-fit>span{font-size:9px;letter-spacing:.1em;color:#7b8799;font-weight:900}.sj-fit small{color:#8491a3;font-size:9px;line-height:1.35}.sj-btn{min-height:34px;border-radius:8px;border:1px solid #dbe2ea;padding:0 10px;font-size:10px;font-weight:900;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}.sj-btn.primary{background:#2563eb;color:#fff;border-color:#2563eb}.sj-btn.primary:hover{background:#1d4ed8}.sj-btn.secondary{background:#fff;color:#21324d}.sj-btn:disabled{opacity:.55;cursor:not-allowed}.sj-fit .sj-btn{width:100%}.sj-empty{background:#fff;border:1px solid #e1e7ef;border-radius:14px;padding:50px;text-align:center;color:#748298}.sj-empty strong{display:block;color:#172a46;font-size:14px;margin-bottom:5px}.sj-overlay{position:fixed;inset:0;background:rgba(8,18,35,.48);backdrop-filter:blur(4px);z-index:100;display:flex;justify-content:flex-end}.sj-drawer{background:#fff;width:min(650px,100%);height:100%;overflow:auto;padding:28px;box-shadow:-25px 0 60px rgba(15,23,42,.18);position:relative}.sj-close{position:absolute;right:18px;top:18px;width:36px;height:36px;border:1px solid #dbe2ea;border-radius:10px;background:#fff;font-size:20px;cursor:pointer}.sj-drawer-title{display:flex;justify-content:space-between;gap:15px;align-items:flex-start;margin-top:8px}.sj-drawer-title h2{font-size:27px;margin:5px 0 0}.sj-big-score{width:100px;height:100px;border-radius:50%;background:#eff6ff;border:10px solid #dbeafe;display:grid;place-items:center;align-content:center;flex:0 0 auto}.sj-big-score strong{font-size:24px}.sj-big-score span{font-size:8px;color:#617086;font-weight:900;letter-spacing:.08em}.sj-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:22px 0}.sj-detail-grid div{border:1px solid #e5eaf1;background:#f8fafc;border-radius:10px;padding:10px}.sj-detail-grid span{display:block;color:#8290a5;text-transform:uppercase;font-size:8px;font-weight:900;letter-spacing:.09em}.sj-detail-grid strong{display:block;margin-top:5px;font-size:11px}.sj-section{border-top:1px solid #edf1f6;padding-top:17px;margin-top:17px}.sj-section h3{margin:0 0 9px;font-size:13px}.sj-section p{font-size:10px;line-height:1.6;color:#64748b}.sj-formula{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}.sj-formula div{background:#f8fafc;border:1px solid #e4e9ef;border-radius:9px;padding:10px}.sj-formula span{display:block;font-size:8px;color:#8491a3;text-transform:uppercase;font-weight:900}.sj-formula strong{display:block;margin-top:5px;font-size:14px}.sj-drawer-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:24px;position:sticky;bottom:0;background:#fff;padding-top:12px}.sj-drawer-actions .sj-btn{min-width:150px}@media(max-width:900px){.sj-filter-card{grid-template-columns:1fr 1fr}.sj-card{grid-template-columns:42px minmax(0,1fr)}.sj-fit{grid-column:1/-1;border-left:0;border-top:1px solid #edf1f6;padding:12px 0 0;display:grid;grid-template-columns:1fr 1fr;align-items:center}.sj-fit .sj-btn{width:auto}.sj-hero{display:block}.sj-hero-stats{margin-top:12px}.sj-hero-stats div{display:inline-block;margin-right:7px}.sj-drawer{padding:22px}.sj-detail-grid{grid-template-columns:1fr 1fr}}@media(max-width:600px){.sj-main{padding:20px 14px}.sj-filter-card{grid-template-columns:1fr}.sj-header{padding:0 12px}.sj-hero h1{font-size:27px}.sj-card{grid-template-columns:1fr}.sj-company-logo{display:none}.sj-fit{grid-template-columns:1fr 1fr}.sj-formula{grid-template-columns:1fr}.sj-drawer-title{display:block}.sj-big-score{margin-top:12px}}
`;
