import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

const API_BASE_URL = "http://127.0.0.1:8000";
const COLORS = ["#2563eb", "#7c3aed", "#0f766e", "#ea580c", "#475569", "#16a34a", "#dc2626"];
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

function token() { return localStorage.getItem("campuslink_token") || ""; }

async function api(path) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token()}` },
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) throw new Error(data?.detail || `Request failed (${response.status})`);
  return data;
}

function dateLabel(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

function KPI({ icon, label, value, helper }) {
  return <div className="rdb-kpi"><div className="rdb-kpi-icon">{icon}</div><div><div className="rdb-kpi-label">{label}</div><div className="rdb-kpi-value">{value}</div><div className="rdb-kpi-help">{helper}</div></div></div>;
}

function Section({ title, subtitle, action, children }) {
  return <section className="rdb-section"><div className="rdb-section-head"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>{children}</section>;
}

export default function RecruiterDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState({ companies: [], jobs: [], applications: [], schedules: [], offers: [], unread: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true); setError("");
      const results = await Promise.allSettled([
        api("/companies/"), api("/job-drives/"), api("/applications/"), api("/schedules/"), api("/offers/"), api("/notifications/unread-count"),
      ]);
      const val = (i) => results[i].status === "fulfilled" ? results[i].value : [];
      setData({
        companies: val(0) || [],
        jobs: val(1) || [],
        applications: val(2) || [],
        schedules: val(3) || [],
        offers: val(4) || [],
        unread: Number(val(5)?.count ?? val(5)?.unread_count ?? 0),
      });
      if (results.every((r) => r.status === "rejected")) setError("Unable to reach the CampusLink backend.");
    } catch (err) {
      setError(err.message || "Unable to load dashboard.");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const funnel = useMemo(() => {
    const stages = ["APPLIED", "SHORTLISTED", "INTERVIEW", "SELECTED", "OFFERED", "ACCEPTED"];
    return stages.map((status) => ({ name: status, value: data.applications.filter((a) => a.status === status).length }));
  }, [data.applications]);

  const driveMix = useMemo(() => {
    const map = new Map();
    data.jobs.forEach((job) => { const current = map.get(job.drive_status) || 0; map.set(job.drive_status, current + 1); });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [data.jobs]);

  const upcoming = useMemo(() => [...data.schedules].sort((a, b) => Number(a.id) - Number(b.id)).slice(0, 5), [data.schedules]);

  const offerRate = data.applications.length ? Math.round((data.offers.length / data.applications.length) * 100) : 0;
  const selectionRate = data.applications.length ? Math.round((data.applications.filter((a) => ["SELECTED", "OFFERED", "ACCEPTED"].includes(a.status)).length / data.applications.length) * 100) : 0;

  return (
    <div className="rdb-shell">
      <style>{CSS}</style>
      <aside className="rdb-sidebar">
        <div className="rdb-brand" onClick={() => navigate("/recruiter")} role="button" tabIndex={0}><div className="rdb-brand-mark">C</div><div><div className="rdb-brand-name">CampusLink</div><div className="rdb-brand-sub">Recruiter Workspace</div></div></div>
        <div className="rdb-nav-label">WORKSPACE</div>
        <nav className="rdb-nav">{NAV.map(([label, path, icon]) => <Link key={path} to={path} className={`rdb-nav-item ${path === "/recruiter" ? "is-active" : ""}`}><span>{icon}</span><span>{label}</span></Link>)}</nav>
        <div className="rdb-side-foot"><div className="rdb-console"><span>LIVE</span><div>CampusLink APIs connected</div></div><button onClick={() => { localStorage.removeItem("campuslink_token"); navigate("/login", { replace: true }); }}>↪ Sign out</button></div>
      </aside>

      <main className="rdb-main">
        <header className="rdb-topbar"><div><div className="rdb-eyebrow">Recruiter command center</div><h1>Hiring dashboard</h1><p>One live view of employers, hiring drives, applicant flow, interviews and offers.</p></div><div className="rdb-top-actions"><button className="rdb-btn secondary" onClick={load}>↻ Refresh</button><Link className="rdb-btn primary" to="/recruiter/ai-candidates">✦ AI Candidate Ranking</Link></div></header>
        <div className="rdb-content">
          {error && <div className="rdb-alert">{error}</div>}
          <div className="rdb-kpi-grid"><KPI icon="▦" label="Companies" value={data.companies.length} helper="Employer profiles" /><KPI icon="◫" label="Active drives" value={data.jobs.filter((j) => j.drive_status === "OPEN").length} helper={`${data.jobs.length} total drives`} /><KPI icon="≡" label="Applications" value={data.applications.length} helper={`${selectionRate}% at selection+`} /><KPI icon="◆" label="Offers" value={data.offers.length} helper={`${offerRate}% offers / applications`} /></div>

          <div className="rdb-grid-main">
            <Section title="Application funnel" subtitle="Current applicant progression across all job drives.">
              {funnel.some((x) => x.value) ? <div className="rdb-chart"><ResponsiveContainer width="100%" height={300}><AreaChart data={funnel}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={10} /><YAxis allowDecimals={false} fontSize={10} /><Tooltip /><Area type="monotone" dataKey="value" stroke="#2563eb" fill="#dbeafe" strokeWidth={3} /></AreaChart></ResponsiveContainer></div> : <div className="rdb-empty">No application movement yet.</div>}
            </Section>

            <Section title="Drive portfolio" subtitle="Live drive-state mix.">
              {driveMix.length ? <div className="rdb-chart"><ResponsiveContainer width="100%" height={300}><PieChart><Pie data={driveMix} dataKey="value" nameKey="name" innerRadius={70} outerRadius={105} paddingAngle={3}>{driveMix.map((x, i) => <Cell key={x.name} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div> : <div className="rdb-empty">No job drives yet.</div>}
            </Section>
          </div>

          <div className="rdb-grid-main lower">
            <Section title="Hiring activity" subtitle="Applications by current stage."><div className="rdb-chart"><ResponsiveContainer width="100%" height={285}><BarChart data={funnel}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={10} /><YAxis allowDecimals={false} fontSize={10} /><Tooltip /><Bar dataKey="value" radius={[7,7,0,0]} fill="#7c3aed" /></BarChart></ResponsiveContainer></div></Section>
            <Section title="Upcoming interview work" subtitle={`${data.schedules.length} schedule records available`} action={<Link className="rdb-link" to="/recruiter/interviews">Open interviews →</Link>}>
              <div className="rdb-list">{upcoming.length ? upcoming.map((s) => <div className="rdb-row" key={s.id}><div className="rdb-date-badge">#{s.id}</div><div><strong>Student {s.student_id}</strong><span>Interviewer {s.interviewer_id} · Room {s.room_id}</span></div><b>{String(s.status || "SCHEDULED").replaceAll("_", " ")}</b></div>) : <div className="rdb-empty">No schedules returned yet.</div>}</div>
            </Section>
          </div>

          <Section title="Quick actions" subtitle="Jump directly into the workflows you will use during a hiring cycle.">
            <div className="rdb-actions-grid">
              <Link to="/recruiter/company" className="rdb-action-card"><span>▦</span><div><strong>Manage company</strong><small>Create or review employer profiles</small></div><b>→</b></Link>
              <Link to="/recruiter/jobs" className="rdb-action-card"><span>◫</span><div><strong>Publish a drive</strong><small>Open, pause or close hiring campaigns</small></div><b>→</b></Link>
              <Link to="/recruiter/applications" className="rdb-action-card"><span>≡</span><div><strong>Review applications</strong><small>Move candidates through the pipeline</small></div><b>→</b></Link>
              <Link to="/recruiter/ai-candidates" className="rdb-action-card featured"><span>✦</span><div><strong>AI candidate ranking</strong><small>Inspect explainable match signals</small></div><b>→</b></Link>
              <Link to="/recruiter/interviews" className="rdb-action-card"><span>◷</span><div><strong>Interview room</strong><small>Monitor schedules and interviewers</small></div><b>→</b></Link>
              <Link to="/recruiter/offers" className="rdb-action-card"><span>◆</span><div><strong>Offer management</strong><small>Create and update placement offers</small></div><b>→</b></Link>
            </div>
          </Section>

          <div className="rdb-bottom-grid"><div className="rdb-insight"><span>Notification load</span><strong>{data.unread}</strong><small>unread notifications</small><Link to="/recruiter/notifications">Open inbox →</Link></div><div className="rdb-insight"><span>Selection signal</span><strong>{selectionRate}%</strong><small>applications at selected / offer stage</small><Link to="/recruiter/applications">Review funnel →</Link></div><div className="rdb-insight"><span>Offer coverage</span><strong>{offerRate}%</strong><small>offer records vs total applications</small><Link to="/recruiter/offers">Open offers →</Link></div></div>
        </div>
      </main>
    </div>
  );
}

const CSS = `
.rdb-shell{min-height:100vh;background:#f6f8fc;color:#0f172a;display:flex;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.rdb-sidebar{width:250px;background:#0b1220;color:#e2e8f0;padding:20px 14px;display:flex;flex-direction:column;position:sticky;top:0;height:100vh;box-sizing:border-box}.rdb-brand{display:flex;align-items:center;gap:11px;padding:8px 8px 24px;cursor:pointer}.rdb-brand-mark{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#2563eb,#7c3aed);display:grid;place-items:center;font-weight:800;color:#fff}.rdb-brand-name{font-size:15px;font-weight:800}.rdb-brand-sub{font-size:10px;color:#94a3b8;margin-top:2px}.rdb-nav-label{font-size:10px;letter-spacing:.14em;color:#64748b;padding:0 12px 8px}.rdb-nav{display:grid;gap:5px}.rdb-nav-item{color:#94a3b8;text-decoration:none;display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;font-size:12px;transition:.18s}.rdb-nav-item:hover{background:#172033;color:#fff;transform:translateX(2px)}.rdb-nav-item.is-active{background:linear-gradient(135deg,#1d4ed8,#4338ca);color:#fff;box-shadow:0 10px 25px #0003}.rdb-nav-item span:first-child{width:18px;text-align:center}.rdb-side-foot{margin-top:auto;display:grid;gap:10px}.rdb-console{border:1px solid #1f2b3f;background:#121b2c;border-radius:12px;padding:11px;font-size:10px;color:#94a3b8}.rdb-console span{display:inline-block;background:#dcfce7;color:#15803d;border-radius:999px;padding:3px 6px;font-weight:800;margin-bottom:6px}.rdb-side-foot button{border:1px solid #263349;background:transparent;color:#cbd5e1;border-radius:10px;padding:10px;text-align:left;cursor:pointer}.rdb-main{flex:1;min-width:0}.rdb-topbar{padding:30px 34px 20px;background:rgba(255,255,255,.88);backdrop-filter:blur(14px);border-bottom:1px solid #e5eaf1;display:flex;justify-content:space-between;gap:20px;position:sticky;top:0;z-index:10}.rdb-eyebrow{font-size:10px;letter-spacing:.13em;text-transform:uppercase;color:#2563eb;font-weight:800}.rdb-topbar h1{font-size:29px;letter-spacing:-.03em;margin:5px 0}.rdb-topbar p{margin:0;color:#64748b;font-size:12px}.rdb-top-actions{display:flex;gap:8px;align-items:flex-start}.rdb-btn{display:inline-flex;align-items:center;gap:7px;text-decoration:none;border:1px solid transparent;padding:9px 13px;border-radius:10px;font-size:11px;font-weight:800;cursor:pointer}.rdb-btn.primary{background:#1d4ed8;color:#fff;box-shadow:0 8px 20px #1d4ed822}.rdb-btn.secondary{background:#fff;border-color:#dbe3ee;color:#334155}.rdb-content{padding:26px 34px 40px;display:grid;gap:20px;max-width:1500px}.rdb-kpi-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.rdb-kpi{background:#fff;border:1px solid #e8edf4;border-radius:14px;padding:17px;display:flex;gap:12px;box-shadow:0 8px 28px rgba(15,23,42,.045)}.rdb-kpi-icon{width:36px;height:36px;border-radius:10px;background:#eff6ff;color:#2563eb;display:grid;place-items:center;font-weight:800}.rdb-kpi-label{font-size:10px;color:#64748b}.rdb-kpi-value{font-size:27px;font-weight:800;line-height:1.1;margin-top:2px}.rdb-kpi-help{font-size:10px;color:#94a3b8;margin-top:5px}.rdb-grid-main{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(360px,.75fr);gap:18px}.rdb-grid-main.lower{grid-template-columns:repeat(2,minmax(0,1fr))}.rdb-section{background:#fff;border:1px solid #e7edf5;border-radius:15px;padding:18px;box-shadow:0 8px 28px rgba(15,23,42,.04)}.rdb-section-head{display:flex;justify-content:space-between;gap:15px;align-items:flex-start;margin-bottom:12px}.rdb-section-head h2{font-size:15px;margin:0}.rdb-section-head p{font-size:11px;color:#64748b;margin:4px 0 0}.rdb-chart{height:300px}.rdb-empty{height:100%;display:grid;place-items:center;color:#94a3b8;font-size:12px}.rdb-list{display:grid;gap:9px}.rdb-row{display:grid;grid-template-columns:48px 1fr auto;gap:10px;align-items:center;padding:11px;border:1px solid #e8edf4;border-radius:10px}.rdb-date-badge{width:38px;height:38px;border-radius:10px;background:#eef2ff;color:#4338ca;display:grid;place-items:center;font-weight:800;font-size:10px}.rdb-row strong{font-size:11px;display:block}.rdb-row span{font-size:9px;color:#64748b;display:block;margin-top:3px}.rdb-row b{font-size:9px;color:#1d4ed8;text-transform:uppercase}.rdb-link{font-size:10px;color:#2563eb;text-decoration:none;font-weight:800}.rdb-actions-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.rdb-action-card{display:flex;align-items:center;gap:11px;border:1px solid #e7edf5;border-radius:12px;padding:12px;text-decoration:none;color:#0f172a;background:#fbfdff;transition:.17s}.rdb-action-card:hover{transform:translateY(-2px);box-shadow:0 12px 30px rgba(15,23,42,.07)}.rdb-action-card>span{width:32px;height:32px;border-radius:9px;background:#eff6ff;color:#2563eb;display:grid;place-items:center;font-weight:800}.rdb-action-card>div{flex:1}.rdb-action-card strong{font-size:11px;display:block}.rdb-action-card small{font-size:9px;color:#64748b;display:block;margin-top:3px}.rdb-action-card>b{font-size:14px;color:#94a3b8}.rdb-action-card.featured{background:linear-gradient(135deg,#eff6ff,#eef2ff);border-color:#c7d2fe}.rdb-bottom-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.rdb-insight{background:#0f172a;color:#fff;border-radius:14px;padding:16px;display:grid;gap:4px}.rdb-insight span{font-size:10px;color:#93c5fd;text-transform:uppercase;letter-spacing:.1em}.rdb-insight strong{font-size:25px}.rdb-insight small{font-size:9px;color:#94a3b8}.rdb-insight a{font-size:10px;color:#bfdbfe;text-decoration:none;margin-top:5px}.rdb-alert{padding:11px 13px;background:#fef2f2;color:#b91c1c;border:1px solid #fecaca;border-radius:10px;font-size:11px}
@media(max-width:1150px){.rdb-kpi-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.rdb-grid-main,.rdb-grid-main.lower{grid-template-columns:1fr}.rdb-actions-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:800px){.rdb-shell{display:block}.rdb-sidebar{position:static;width:auto;height:auto}.rdb-nav{grid-template-columns:repeat(4,minmax(0,1fr))}.rdb-nav-item{justify-content:center}.rdb-nav-item span:last-child{display:none}.rdb-side-foot{display:none}.rdb-topbar{position:static;padding:22px 18px;display:block}.rdb-top-actions{margin-top:12px;flex-wrap:wrap}.rdb-content{padding:18px}.rdb-kpi-grid,.rdb-actions-grid,.rdb-bottom-grid{grid-template-columns:1fr}.rdb-row{grid-template-columns:40px 1fr}}
`;
