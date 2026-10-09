import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { calculateCandidateJobFit } from "./jobFit";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

function token() { return localStorage.getItem("campuslink_token") || ""; }

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
  const body = await response.text();
  let data = null;
  try { data = body ? JSON.parse(body) : null; } catch { data = body; }
  if (!response.ok) throw new Error(data?.detail || data?.message || `Request failed (${response.status})`);
  return data;
}

function pct(value) { return `${Number(value || 0).toFixed(0)}%`; }
function initials(value = "Student") { return value.split(/\s+/).filter(Boolean).slice(0,2).map((x) => x[0]).join("").toUpperCase() || "ST"; }
function pretty(value) { return String(value || "").replaceAll("_", " "); }

export default function RecruiterAICandidates() {
  const navigate = useNavigate();
  const [drives, setDrives] = useState([]);
  const [selectedDriveId, setSelectedDriveId] = useState("");
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState(null);

  async function loadDrives() {
    try {
      const data = await api("/job-drives/");
      const list = Array.isArray(data) ? data : [];
      setDrives(list);
      if (!selectedDriveId && list.length) {
        const open = list.find((item) => item.drive_status === "OPEN") || list[0];
        setSelectedDriveId(String(open.id));
      }
    } catch (error) {
      setMessage(error.message || "Unable to load job drives.");
    } finally {
      setLoading(false);
    }
  }

  async function loadCandidates(id) {
    if (!id) return;
    setLoadingRows(true);
    setMessage("");
    try {
      const data = await api(`/ai/recommendations/${id}`);
      setRows(Array.isArray(data?.recommendations) ? data.recommendations : []);
    } catch (error) {
      setRows([]);
      setMessage(error.message || "Unable to load candidate ranking.");
    } finally {
      setLoadingRows(false);
    }
  }

  useEffect(() => { loadDrives(); }, []);
  useEffect(() => { if (selectedDriveId) loadCandidates(selectedDriveId); }, [selectedDriveId]);

  const drive = drives.find((item) => String(item.id) === String(selectedDriveId)) || null;

  const scored = useMemo(() => {
    if (!drive) return [];
    return rows.map((candidate) => ({ ...candidate, fit: calculateCandidateJobFit(drive, candidate) }));
  }, [rows, drive]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...scored]
      .filter((candidate) => {
        const statusValue = String(candidate.application_status || "").toUpperCase();
        const text = [candidate.student_name, candidate.student_email, candidate.application_id, candidate.student_id, ...(candidate.matched_skills || []), ...(candidate.missing_skills || [])].join(" ").toLowerCase();
        return (status === "ALL" || statusValue === status) && (!q || text.includes(q));
      })
      .sort((a, b) => b.fit.overallScore - a.fit.overallScore);
  }, [scored, query, status]);

  const average = visible.length ? visible.reduce((sum, item) => sum + item.fit.overallScore, 0) / visible.length : 0;
  const eligible = visible.filter((item) => item.fit.cgpaEligible).length;

  async function updateStatus(applicationId, nextStatus) {
    if (!applicationId) return;
    setBusyId(applicationId);
    try {
      await api(`/applications/${applicationId}/status`, { method: "PATCH", body: JSON.stringify({ status: nextStatus }) });
      await loadCandidates(selectedDriveId);
      setMessage(`Application #${applicationId} moved to ${pretty(nextStatus)}.`);
    } catch (error) {
      setMessage(error.message || "Unable to update application.");
    } finally {
      setBusyId(null);
    }
  }

  const selectedScored = selected ? scored.find((item) => item.application_id === selected.application_id) || selected : null;

  return (
    <div className="rc-page">
      <style>{CSS}</style>
      <main className="rc-main">
        <header className="rc-header">
          <div><button className="rc-back" onClick={() => navigate("/recruiter")}>←</button><div><span className="rc-eyebrow">RECRUITER INTELLIGENCE</span><h1>Candidate Fit Center</h1><p>One transparent job-fit formula for both recruiter and student views.</p></div></div>
          <div className="rc-actions"><select value={selectedDriveId} onChange={(e) => setSelectedDriveId(e.target.value)}>{drives.map((item) => <option key={item.id} value={item.id}>#{item.id} · {item.title}</option>)}</select><button onClick={() => loadCandidates(selectedDriveId)}>↻ Refresh</button></div>
        </header>

        {message && <div className="rc-message">{message}</div>}

        {drive && <section className="rc-drive"><div><span className="rc-eyebrow">JOB DRIVE #{drive.id}</span><h2>{drive.title}</h2><p>{drive.location || "Location not specified"} · Minimum CGPA {drive.minimum_cgpa ?? "—"}</p></div><div className="rc-chips"><span>{drive.drive_status}</span><span>Canonical score: 75% skills + 25% CGPA</span></div></section>}

        <section className="rc-stats"><div><span>CANDIDATES</span><strong>{visible.length}</strong><small>Applications in this view</small></div><div><span>AVERAGE JOB FIT</span><strong>{pct(average)}</strong><small>Same formula shown to students</small></div><div><span>ELIGIBLE</span><strong>{eligible}</strong><small>CGPA requirement satisfied</small></div><div><span>TOP FIT</span><strong>{pct(visible[0]?.fit.overallScore)}</strong><small>Highest deterministic fit</small></div></section>

        <section className="rc-card rc-transparency"><div><h3>Scoring transparency</h3><p>There is no hidden AI-generated percentage in this score. It is deterministic and reproducible from job requirements and the candidate profile.</p></div><div className="rc-formula"><span><b>75%</b> Skill fit</span><span><b>25%</b> CGPA signal</span><strong>Overall = 0.75 × SkillFit + 0.25 × CGPAFit</strong></div></section>

        <section className="rc-card rc-table-card"><div className="rc-table-head"><div><h3>Candidate ranking</h3><p>{visible.length} candidates visible</p></div><div className="rc-filters"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search candidate..."/><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="ALL">All statuses</option><option>APPLIED</option><option>SHORTLISTED</option><option>INTERVIEW</option><option>SELECTED</option><option>OFFERED</option><option>ACCEPTED</option><option>REJECTED</option></select></div></div>
          {loadingRows ? <div className="rc-empty">Loading candidates…</div> : visible.length === 0 ? <div className="rc-empty">No candidates match the current filters.</div> : <div className="rc-scroll"><table><thead><tr><th>Candidate</th><th>Job fit</th><th>Skill fit</th><th>CGPA</th><th>Gaps</th><th>Status</th><th></th></tr></thead><tbody>{visible.map((candidate) => <tr key={candidate.application_id || candidate.student_id}><td><div className="rc-person"><div>{initials(candidate.student_name)}</div><section><strong>{candidate.student_name || `Student ${candidate.student_id}`}</strong><small>{candidate.student_email || `Application #${candidate.application_id}`}</small></section></div></td><td><strong className="rc-score">{pct(candidate.fit.overallScore)}</strong><div className="rc-bar"><span style={{ width: `${candidate.fit.overallScore}%` }} /></div></td><td>{pct(candidate.fit.skillScore)}</td><td>{candidate.fit.cgpaEligible ? <span className="rc-good">Eligible</span> : <span className="rc-bad">Not eligible</span>}</td><td>{candidate.fit.missingSkills.length}</td><td><span className="rc-status">{pretty(candidate.application_status)}</span></td><td><button className="rc-view" onClick={() => setSelected(candidate)}>Review</button></td></tr>)}</tbody></table></div>}
        </section>
      </main>

      {selectedScored && <div className="rc-overlay" onClick={() => setSelected(null)}><aside className="rc-drawer" onClick={(e) => e.stopPropagation()}><button className="rc-close" onClick={() => setSelected(null)}>×</button><span className="rc-eyebrow">APPLICATION #{selectedScored.application_id}</span><h2>{selectedScored.student_name || `Student ${selectedScored.student_id}`}</h2><p className="rc-muted">Current stage: {pretty(selectedScored.application_status)}</p><div className="rc-big-score"><strong>{pct(selectedScored.fit.overallScore)}</strong><span>JOB FIT</span></div><div className="rc-detail-grid"><div><span>Skill fit</span><strong>{pct(selectedScored.fit.skillScore)}</strong></div><div><span>CGPA signal</span><strong>{pct(selectedScored.fit.cgpaScore)}</strong></div><div><span>Matched skills</span><strong>{selectedScored.fit.matchedSkills.length}</strong></div><div><span>Skill gaps</span><strong>{selectedScored.fit.missingSkills.length}</strong></div></div><section className="rc-section"><h3>Matched skills</h3><div className="rc-tags">{(selectedScored.fit.matchedSkills.length ? selectedScored.fit.matchedSkills : ["None detected"]).map((item) => <span className="good" key={item}>{item}</span>)}</div></section><section className="rc-section"><h3>Skill gaps</h3><div className="rc-tags">{(selectedScored.fit.missingSkills.length ? selectedScored.fit.missingSkills : ["None detected"]).map((item) => <span key={item}>{item}</span>)}</div></section><section className="rc-section"><h3>Formula</h3><p>Overall Job Fit = 75% × Skill Fit + 25% × CGPA Fit.</p><p className="rc-muted">No LLM, embedding model, or opaque AI multiplier is used for this percentage. The recommendation API is used only to retrieve candidate/application data.</p></section><div className="rc-actions-row"><button className="rc-btn good-btn" disabled={busyId === selectedScored.application_id} onClick={() => updateStatus(selectedScored.application_id, "SHORTLISTED")}>Shortlist</button><button className="rc-btn neutral-btn" onClick={() => setSelected(null)}>Close</button><button className="rc-btn bad-btn" disabled={busyId === selectedScored.application_id} onClick={() => updateStatus(selectedScored.application_id, "REJECTED")}>Reject</button></div></aside></div>}
    </div>
  );
}

const CSS = `
.rc-page{min-height:100vh;background:#f5f7fb;color:#10213f}.rc-main{max-width:1500px;margin:auto;padding:28px 30px 50px}.rc-header{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;margin-bottom:18px}.rc-header>div:first-child{display:flex;gap:12px}.rc-back{width:40px;height:40px;border:1px solid #dce3ec;background:#fff;border-radius:10px;cursor:pointer;font-size:18px}.rc-eyebrow{font-size:10px;letter-spacing:.14em;color:#2563eb;font-weight:900}.rc-header h1{font-size:31px;margin:5px 0 4px;letter-spacing:-.03em}.rc-header p,.rc-drive p,.rc-card p{margin:0;color:#6d7c91;font-size:11px}.rc-actions{display:flex;gap:8px}.rc-actions select,.rc-actions button,.rc-filters input,.rc-filters select{height:40px;border:1px solid #dbe2ea;background:#fff;border-radius:9px;padding:0 10px;font-size:11px;color:#10213f}.rc-actions select{min-width:260px}.rc-actions button{font-weight:900;cursor:pointer}.rc-message{background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;padding:10px 12px;border-radius:9px;font-size:11px;margin-bottom:12px}.rc-drive{display:flex;justify-content:space-between;gap:18px;align-items:center;background:#fff;border:1px solid #e1e7ef;border-radius:13px;padding:18px;margin-bottom:12px}.rc-drive h2{margin:5px 0;font-size:19px}.rc-chips{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}.rc-chips span{padding:7px 9px;border:1px solid #e2e8f0;background:#f8fafc;border-radius:999px;color:#617086;font-size:9px;font-weight:900}.rc-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:12px}.rc-stats>div{background:#fff;border:1px solid #e1e7ef;border-radius:12px;padding:14px}.rc-stats span{display:block;color:#8a97a8;font-size:9px;font-weight:900;letter-spacing:.1em}.rc-stats strong{display:block;font-size:26px;margin-top:7px;color:#2563eb}.rc-stats small{display:block;color:#96a2b1;font-size:9px;margin-top:4px}.rc-card{background:#fff;border:1px solid #e1e7ef;border-radius:13px}.rc-transparency{padding:17px;display:flex;justify-content:space-between;gap:16px;align-items:center;margin-bottom:12px}.rc-transparency h3{margin:0 0 4px;font-size:14px}.rc-formula{display:grid;grid-template-columns:1fr 1fr;gap:7px;min-width:360px}.rc-formula span,.rc-formula strong{padding:8px 10px;border:1px solid #e3e8ef;border-radius:8px;background:#f8fafc;font-size:9px}.rc-formula strong{grid-column:1/-1;color:#1d4ed8}.rc-table-card{overflow:hidden}.rc-table-head{padding:16px 18px;display:flex;justify-content:space-between;gap:12px;align-items:center;border-bottom:1px solid #edf1f5}.rc-table-head h3{margin:0;font-size:14px}.rc-table-head p{margin-top:4px}.rc-filters{display:flex;gap:7px}.rc-filters input{width:210px}.rc-scroll{overflow:auto}.rc-scroll table{width:100%;border-collapse:collapse;min-width:840px}.rc-scroll th{padding:10px 13px;background:#f8fafc;color:#758399;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.08em}.rc-scroll td{padding:12px 13px;border-top:1px solid #eef2f6;font-size:10px}.rc-person{display:flex;gap:9px;align-items:center}.rc-person>div{width:34px;height:34px;border-radius:9px;background:#eff6ff;color:#2563eb;display:grid;place-items:center;font-weight:900;font-size:10px}.rc-person strong{display:block;font-size:10px}.rc-person small{display:block;margin-top:3px;color:#97a2b0}.rc-score{color:#2563eb}.rc-bar{width:85px;height:6px;background:#e8edf4;border-radius:99px;overflow:hidden;margin-top:5px}.rc-bar span{display:block;height:100%;background:#2563eb;border-radius:99px}.rc-good{color:#047857;font-weight:900}.rc-bad{color:#b91c1c;font-weight:900}.rc-status{padding:5px 7px;border-radius:999px;background:#f1f5f9;font-size:8px;font-weight:900}.rc-view{border:0;background:#eef2ff;color:#4338ca;border-radius:7px;padding:7px 9px;font-size:9px;font-weight:900;cursor:pointer}.rc-empty{text-align:center;padding:50px;color:#718096;font-size:11px}.rc-overlay{position:fixed;inset:0;background:rgba(10,20,40,.47);backdrop-filter:blur(4px);z-index:100;display:flex;justify-content:flex-end}.rc-drawer{width:min(610px,100%);background:#fff;height:100%;overflow:auto;padding:28px;position:relative;box-shadow:-24px 0 60px rgba(15,23,42,.18)}.rc-close{position:absolute;right:18px;top:18px;width:36px;height:36px;border:1px solid #dbe2ea;background:#fff;border-radius:10px;font-size:20px;cursor:pointer}.rc-drawer h2{font-size:25px;margin:6px 0 3px}.rc-muted{color:#7a889b;font-size:10px;line-height:1.55}.rc-big-score{margin:18px 0;background:linear-gradient(135deg,#eff6ff,#fff);border:1px solid #dbeafe;border-radius:13px;padding:18px}.rc-big-score strong{font-size:43px;color:#2563eb;letter-spacing:-.05em}.rc-big-score span{display:block;margin-top:3px;font-size:9px;font-weight:900;letter-spacing:.12em;color:#617086}.rc-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.rc-detail-grid div{border:1px solid #e3e8ef;background:#f8fafc;border-radius:9px;padding:10px}.rc-detail-grid span{display:block;font-size:8px;color:#8794a5;text-transform:uppercase;font-weight:900}.rc-detail-grid strong{display:block;margin-top:5px;font-size:12px}.rc-section{border-top:1px solid #eef2f6;padding-top:16px;margin-top:16px}.rc-section h3{margin:0 0 8px;font-size:12px}.rc-section p{font-size:10px;line-height:1.6;color:#617086}.rc-tags{display:flex;flex-wrap:wrap;gap:6px}.rc-tags span{padding:6px 8px;border-radius:7px;background:#f8fafc;border:1px solid #e1e7ef;color:#64748b;font-size:9px}.rc-tags span.good{background:#ecfdf5;border-color:#bbf7d0;color:#047857}.rc-actions-row{display:flex;gap:8px;justify-content:flex-end;border-top:1px solid #eef2f6;padding-top:16px;margin-top:18px}.rc-btn{height:38px;border-radius:8px;padding:0 13px;font-size:10px;font-weight:900;cursor:pointer}.good-btn{background:#059669;color:#fff;border:1px solid #059669}.bad-btn{background:#fff;color:#b91c1c;border:1px solid #fecaca}.neutral-btn{background:#fff;color:#233650;border:1px solid #dbe2ea}@media(max-width:980px){.rc-stats{grid-template-columns:repeat(2,1fr)}.rc-transparency{display:block}.rc-formula{margin-top:12px;min-width:0}.rc-header,.rc-drive{display:block}.rc-actions,.rc-chips{margin-top:12px;justify-content:flex-start}}@media(max-width:650px){.rc-main{padding:18px 12px}.rc-stats{grid-template-columns:1fr 1fr}.rc-filters{display:grid;grid-template-columns:1fr 1fr;width:100%}.rc-filters input{width:auto}.rc-table-head{display:block}.rc-formula{grid-template-columns:1fr}.rc-formula strong{grid-column:auto}}
`;
