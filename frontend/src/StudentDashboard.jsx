import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from "recharts";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const COLORS = ["#2563eb", "#7c3aed", "#059669", "#ea580c", "#64748b", "#dc2626"];

async function api(path) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${localStorage.getItem("campuslink_token") || ""}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.detail || "Request failed");
  return data;
}

function initials(name = "Student") { return name.split(" ").filter(Boolean).slice(0,2).map((x) => x[0]).join("").toUpperCase() || "ST"; }
function statusColor(status) {
  const s = String(status || "").toUpperCase();
  if (["SHORTLISTED","SELECTED","OFFERED","ACCEPTED"].includes(s)) return "#059669";
  if (s === "REJECTED") return "#dc2626";
  return "#2563eb";
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [applications, setApplications] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [offers, setOffers] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true); setError("");
      const result = await Promise.allSettled([
        api("/auth/me"), api("/student-profile/me"), api("/job-drives/"), api("/companies/"), api("/applications/my"), api("/schedules/my"), api("/offers/my"), api("/notifications/unread-count"),
      ]);
      const val = (i) => result[i].status === "fulfilled" ? result[i].value : null;
      setUser(val(0)); setProfile(val(1)); setJobs(Array.isArray(val(2)) ? val(2) : []); setCompanies(Array.isArray(val(3)) ? val(3) : []); setApplications(Array.isArray(val(4)) ? val(4) : []); setSchedules(Array.isArray(val(5)) ? val(5) : []); setOffers(Array.isArray(val(6)) ? val(6) : []); setUnread(Number(val(7)?.count ?? val(7)?.unread_count ?? 0));
    } catch (err) { setError(err.message || "Unable to load dashboard."); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const companyMap = useMemo(() => new Map(companies.map((c) => [String(c.id), c])), [companies]);
  const openJobs = jobs.filter((j) => j.drive_status === "OPEN").slice(0, 4);
  const appliedSet = new Set(applications.map((a) => a.job_drive_id));
  const statusData = ["APPLIED","SHORTLISTED","INTERVIEW","SELECTED","OFFERED","ACCEPTED","REJECTED"].map((status) => ({ status, value: applications.filter((a) => a.status === status).length }));
  const applied = applications.length;
  const profilePct = Math.round(([user?.full_name, user?.email, profile?.cgpa, profile?.skills, profile?.resume_text].filter(Boolean).length / 5) * 100);
  const placementProgress = applications.length ? Math.max(...applications.map((a) => ({ APPLIED:25, SHORTLISTED:50, INTERVIEW:70, SELECTED:85, OFFERED:95, ACCEPTED:100, REJECTED:0 }[a.status] || 10))) : 0;
  const matchScore = (job) => {
    const studentSkills = String(profile?.skills || "").toLowerCase().split(/[;,\n]+/).map((x) => x.trim()).filter(Boolean);
    const required = String(job.required_skills || "").toLowerCase().split(/[;,\n]+/).map((x) => x.trim()).filter(Boolean);
    const matched = required.filter((r) => studentSkills.some((s) => s.includes(r) || r.includes(s))).length;
    const skill = required.length ? (matched / required.length) * 100 : 70;
    const cgpa = job.minimum_cgpa == null || profile?.cgpa == null || Number(profile.cgpa) >= Number(job.minimum_cgpa) ? 100 : 0;
    return Math.round(skill * .75 + cgpa * .25);
  };
  const recommended = [...openJobs].map((j) => ({ ...j, match: matchScore(j) })).sort((a,b) => b.match - a.match);

  return <div className="sdb-shell">
    <style>{CSS}</style>
    <aside className="sdb-side">
      <div className="sdb-brand"><div className="sdb-logo">C</div><div><strong>CampusLink</strong><small>Student Workspace</small></div></div>
      <div className="sdb-label">CAREER</div>
      {[["Dashboard","/student","⌂"],["Profile","/student/profile","◎"],["Resume AI","/student/resume-ai","✦"],["Job Matching","/student/jobs","◫"],["Applications","/student/applications","≡"],["Interviews","/student/interviews","◷"],["Offers","/student/offers","◆"],["Notifications","/student/notifications","◌"],["AI Recommendations","/student/recommendations","✧"]].map(([label,path,icon]) => <Link key={path} to={path} className={`sdb-link ${path==="/student"?"active":""}`}><span>{icon}</span>{label}</Link>)}
      <div className="sdb-side-bottom"><Link to="/student/jobs" className="sdb-cta">Find my next role →</Link><button onClick={() => { localStorage.removeItem("campuslink_token"); navigate("/login", { replace:true }); }}>↪ Sign out</button></div>
    </aside>
    <main className="sdb-main">
      <header className="sdb-header"><div><span>STUDENT COMMAND CENTER</span><h1>Welcome, {user?.full_name || "Student"}</h1><p>Track your placement journey and discover the next opportunity that fits your profile.</p></div><div className="sdb-header-actions"><button onClick={load}>↻ Refresh</button><Link to="/student/profile">Edit profile</Link></div></header>
      <div className="sdb-content">
        {error && <div className="sdb-alert">{error}</div>}
        <div className="sdb-kpis">
          <div><span>PROFILE READY</span><strong>{profilePct}%</strong><small>AI profile readiness</small></div>
          <div><span>APPLICATIONS</span><strong>{applied}</strong><small>Submitted applications</small></div>
          <div><span>INTERVIEWS</span><strong>{schedules.length}</strong><small>Scheduled rounds</small></div>
          <div><span>OFFERS</span><strong>{offers.length}</strong><small>{unread ? `${unread} unread update${unread===1?"":"s"}` : "Everything caught up"}</small></div>
        </div>

        <div className="sdb-grid">
          <section className="sdb-card"><div className="sdb-section-head"><div><span>PLACEMENT JOURNEY</span><h2>Your current stage</h2></div><Link to="/student/applications">View applications →</Link></div><div className="sdb-progress-wrap"><div className="sdb-progress-ring" style={{ background:`conic-gradient(#2563eb ${placementProgress*3.6}deg,#e2e8f0 0deg)` }}><div><strong>{placementProgress}%</strong><small>progress</small></div></div><div className="sdb-stage-list">{["APPLIED","SHORTLISTED","INTERVIEW","SELECTED","OFFERED"].map((stage,i) => <div key={stage}><i style={{ background: placementProgress >= [25,50,70,85,95][i] ? "#2563eb" : "#cbd5e1" }}></i><span>{stage}</span></div>)}</div></div></section>
          <section className="sdb-card"><div className="sdb-section-head"><div><span>APPLICATION ANALYTICS</span><h2>Pipeline</h2></div></div><div className="sdb-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={statusData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="status" fontSize={9} /><YAxis allowDecimals={false} fontSize={9} /><Tooltip /><Bar dataKey="value" fill="#7c3aed" radius={[5,5,0,0]} /></BarChart></ResponsiveContainer></div></section>
        </div>

        <section className="sdb-card"><div className="sdb-section-head"><div><span>RECOMMENDED JOBS</span><h2>Roles worth exploring</h2><p>Transparent matching using your saved skills and CGPA.</p></div><Link to="/student/jobs">Open job matching →</Link></div><div className="sdb-jobs">{loading ? <div className="sdb-empty">Loading opportunities…</div> : recommended.length ? recommended.map((job) => <article key={job.id}><div className="sdb-company-avatar">{String(companyMap.get(String(job.company_id))?.name || "C").slice(0,1).toUpperCase()}</div><div className="sdb-job-body"><strong>{job.title}</strong><span>{companyMap.get(String(job.company_id))?.name || `Company ${job.company_id}`} · {job.location || "Campus"}</span><div className="sdb-tags">{String(job.required_skills || "").split(",").map((x) => x.trim()).filter(Boolean).slice(0,4).map((x) => <b key={x}>{x}</b>)}</div></div><div className="sdb-job-score"><strong>{job.match}%</strong><small>match</small><Link to={`/student/jobs?job=${job.id}`}>{appliedSet.has(job.id) ? "Applied" : "View role"} →</Link></div></article>) : <div className="sdb-empty">No open job drives yet.</div>}</div></section>

        <div className="sdb-grid lower"><section className="sdb-card"><div className="sdb-section-head"><div><span>UPCOMING</span><h2>Interview schedule</h2></div><Link to="/student/interviews">View calendar →</Link></div>{schedules.length ? <div className="sdb-list">{schedules.slice(0,4).map((s) => <div key={s.id}><div className="sdb-list-icon">◷</div><div><strong>Interview #{s.id}</strong><span>Round {s.selection_round_id} · Interviewer {s.interviewer_id} · Room {s.room_id}</span></div><em>{s.status || "SCHEDULED"}</em></div>)}</div> : <div className="sdb-empty">No interviews scheduled yet.</div>}</section><section className="sdb-card sdb-dark"><span>AI CAREER COACH</span><h2>Strengthen your placement profile</h2><p>Use Resume AI to extract skills, then use Job Matching to understand where you fit and where the gaps are.</p><div><Link to="/student/resume-ai">Improve resume</Link><Link to="/student/recommendations">Explore AI matches</Link></div></section></div>
      </div>
    </main>
  </div>;
}

const CSS = `.sdb-shell{min-height:100vh;background:#f6f8fc;color:#0f172a;display:flex;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.sdb-side{width:248px;background:#0b1220;color:#cbd5e1;padding:20px 14px;display:flex;flex-direction:column;position:sticky;top:0;height:100vh;box-sizing:border-box}.sdb-brand{display:flex;gap:10px;align-items:center;padding:8px 7px 25px}.sdb-logo{width:35px;height:35px;border-radius:10px;background:linear-gradient(135deg,#2563eb,#7c3aed);display:grid;place-items:center;color:#fff;font-weight:900}.sdb-brand strong{display:block;color:#fff;font-size:15px}.sdb-brand small{display:block;color:#64748b;font-size:9px;margin-top:2px}.sdb-label{font-size:9px;letter-spacing:.15em;color:#64748b;padding:0 10px 8px}.sdb-link{display:flex;align-items:center;gap:10px;color:#94a3b8;text-decoration:none;padding:10px 11px;border-radius:9px;font-size:11px;margin-bottom:4px;transition:.16s}.sdb-link:hover{color:#fff;background:#172033;transform:translateX(2px)}.sdb-link.active{color:#fff;background:linear-gradient(135deg,#1d4ed8,#4338ca);box-shadow:0 10px 22px #0003}.sdb-link span{width:18px;text-align:center}.sdb-side-bottom{margin-top:auto;display:grid;gap:8px}.sdb-side-bottom button,.sdb-cta{border:1px solid #263349;background:#111a2b;border-radius:10px;color:#cbd5e1;padding:9px 11px;text-decoration:none;font-size:10px;text-align:left;cursor:pointer}.sdb-cta{background:linear-gradient(135deg,#2563eb,#4f46e5);color:#fff;border:0}.sdb-main{flex:1;min-width:0}.sdb-header{display:flex;justify-content:space-between;gap:18px;padding:29px 34px 20px;background:rgba(255,255,255,.88);backdrop-filter:blur(14px);border-bottom:1px solid #e5eaf1;position:sticky;top:0;z-index:10}.sdb-header>div:first-child>span{font-size:9px;letter-spacing:.14em;color:#2563eb;font-weight:900}.sdb-header h1{margin:5px 0 4px;font-size:28px;letter-spacing:-.03em}.sdb-header p{margin:0;color:#64748b;font-size:11px}.sdb-header-actions{display:flex;gap:8px;align-items:flex-start}.sdb-header-actions button,.sdb-header-actions a{border:1px solid #dbe3ee;background:#fff;color:#334155;border-radius:9px;padding:9px 12px;text-decoration:none;font-size:10px;font-weight:800;cursor:pointer}.sdb-header-actions a{background:#1d4ed8;color:#fff;border-color:#1d4ed8}.sdb-content{padding:24px 34px 40px;display:grid;gap:16px;max-width:1480px}.sdb-alert{padding:11px 13px;border-radius:10px;background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;font-size:10px}.sdb-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px}.sdb-kpis>div,.sdb-card{background:#fff;border:1px solid #e5ebf2;border-radius:14px;box-shadow:0 8px 28px rgba(15,23,42,.04)}.sdb-kpis>div{padding:16px}.sdb-kpis span{display:block;font-size:9px;color:#64748b;letter-spacing:.08em;font-weight:800}.sdb-kpis strong{display:block;font-size:25px;margin-top:5px}.sdb-kpis small{color:#94a3b8;font-size:9px}.sdb-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:16px}.sdb-card{padding:18px}.sdb-section-head{display:flex;justify-content:space-between;gap:15px;align-items:flex-start}.sdb-section-head>div>span{font-size:9px;letter-spacing:.12em;color:#2563eb;font-weight:900}.sdb-section-head h2{font-size:15px;margin:4px 0 0}.sdb-section-head p{margin:4px 0 0;font-size:10px;color:#64748b}.sdb-section-head>a{font-size:10px;font-weight:800;color:#2563eb;text-decoration:none}.sdb-progress-wrap{display:flex;align-items:center;gap:22px;margin-top:18px}.sdb-progress-ring{width:128px;height:128px;border-radius:50%;display:grid;place-items:center;flex:0 0 auto}.sdb-progress-ring>div{width:96px;height:96px;border-radius:50%;background:#fff;display:grid;place-items:center;text-align:center}.sdb-progress-ring strong{display:block;font-size:22px}.sdb-progress-ring small{font-size:9px;color:#94a3b8}.sdb-stage-list{display:grid;gap:9px;flex:1}.sdb-stage-list div{display:flex;align-items:center;gap:8px;font-size:9px;color:#475569;font-weight:800}.sdb-stage-list i{width:9px;height:9px;border-radius:50%}.sdb-chart{height:245px;margin-top:10px}.sdb-jobs{display:grid;gap:9px;margin-top:15px}.sdb-jobs article{display:grid;grid-template-columns:36px 1fr auto;gap:11px;align-items:center;border:1px solid #e8edf4;padding:12px;border-radius:11px;transition:.15s}.sdb-jobs article:hover{border-color:#bfdbfe;box-shadow:0 8px 20px #0f172a0a}.sdb-company-avatar{width:36px;height:36px;border-radius:9px;background:#eff6ff;color:#2563eb;display:grid;place-items:center;font-weight:900}.sdb-job-body strong{font-size:11px;display:block}.sdb-job-body>span{font-size:9px;color:#64748b;display:block;margin-top:3px}.sdb-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}.sdb-tags b{padding:4px 6px;border-radius:999px;background:#f8fafc;border:1px solid #e2e8f0;font-size:8px;color:#475569}.sdb-job-score{text-align:right}.sdb-job-score strong{display:block;font-size:18px;color:#2563eb}.sdb-job-score small{display:block;color:#94a3b8;font-size:8px}.sdb-job-score a{display:block;margin-top:6px;color:#2563eb;font-size:9px;font-weight:800;text-decoration:none}.sdb-list{display:grid;gap:8px;margin-top:14px}.sdb-list>div{display:grid;grid-template-columns:30px 1fr auto;gap:9px;align-items:center;padding:10px;border:1px solid #e8edf4;border-radius:10px}.sdb-list-icon{width:28px;height:28px;border-radius:8px;background:#eef2ff;color:#4338ca;display:grid;place-items:center}.sdb-list strong{font-size:10px;display:block}.sdb-list span{font-size:8px;color:#64748b}.sdb-list em{font-size:8px;color:#2563eb;font-style:normal;font-weight:800}.sdb-empty{padding:30px;text-align:center;color:#94a3b8;font-size:10px}.sdb-dark{background:linear-gradient(135deg,#0f172a,#172554);color:#fff;border-color:#172554}.sdb-dark>span{font-size:9px;letter-spacing:.12em;color:#93c5fd;font-weight:900}.sdb-dark h2{font-size:20px;margin:8px 0}.sdb-dark p{font-size:10px;line-height:1.6;color:#cbd5e1}.sdb-dark>div{display:flex;gap:8px;flex-wrap:wrap}.sdb-dark a{padding:8px 10px;border-radius:8px;background:#fff;color:#0f172a;text-decoration:none;font-size:9px;font-weight:800}.lower{grid-template-columns:1fr 1fr}.sdb-side-bottom button{cursor:pointer}@media(max-width:1050px){.sdb-kpis{grid-template-columns:repeat(2,1fr)}.sdb-grid,.lower{grid-template-columns:1fr}}@media(max-width:800px){.sdb-shell{display:block}.sdb-side{width:auto;height:auto;position:static}.sdb-link{display:inline-flex;margin:3px}.sdb-side{padding:15px}.sdb-side .sdb-label{display:none}.sdb-side-bottom{display:none}.sdb-header{position:static;padding:20px}.sdb-content{padding:16px}.sdb-kpis{grid-template-columns:1fr 1fr}.sdb-header-actions{margin-top:10px}.sdb-header{display:block}}@media(max-width:560px){.sdb-kpis{grid-template-columns:1fr}.sdb-progress-wrap{align-items:flex-start;flex-direction:column}.sdb-jobs article{grid-template-columns:30px 1fr}.sdb-job-score{grid-column:2;text-align:left}.sdb-nav{} }
`;
