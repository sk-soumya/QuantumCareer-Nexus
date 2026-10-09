import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const TUTORIAL_KEY = "campuslink_recommendations_tutorial_v2";

function token() {
  return localStorage.getItem("campuslink_token") || "";
}

async function api(path) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token()}`,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.detail || `Request failed: ${response.status}`);
  }
  return data;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

function splitSkills(value) {
  return String(value || "")
    .toLowerCase()
    .split(/[;,|\n]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function textTokens(value) {
  return new Set(
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9+#.\s-]/g, " ")
      .split(/\s+/)
      .map((x) => x.trim())
      .filter((x) => x.length >= 3)
  );
}

function overlapScore(a, b) {
  const A = textTokens(a);
  const B = textTokens(b);
  if (!A.size || !B.size) return 0;
  let hit = 0;
  A.forEach((word) => {
    if (B.has(word)) hit += 1;
  });
  return Math.min(100, (hit / Math.max(1, Math.min(A.size, 18))) * 100);
}

function companyName(companies, id) {
  const found = companies.find((item) => String(item.id) === String(id));
  return found?.name || found?.company_name || `Company ${id}`;
}

function scoreJob(job, profile) {
  const studentSkills = splitSkills(profile?.skills);
  const requiredSkills = splitSkills(job?.required_skills);
  const matchedSkills = requiredSkills.filter((required) =>
    studentSkills.some(
      (student) =>
        student === required ||
        student.includes(required) ||
        required.includes(student)
    )
  );
  const missingSkills = requiredSkills.filter(
    (skill) => !matchedSkills.includes(skill)
  );

  const skillMatch = requiredSkills.length
    ? Math.round((matchedSkills.length / requiredSkills.length) * 100)
    : 70;

  const profileSemanticText = [
    profile?.career_objective,
    profile?.preferred_roles,
    profile?.preferred_locations,
    profile?.projects,
    profile?.experience,
    profile?.certifications,
    profile?.resume_text,
    profile?.skills,
    profile?.degree,
    profile?.department,
  ]
    .filter(Boolean)
    .join(" ");

  const jobSemanticText = [
    job?.title,
    job?.description,
    job?.required_skills,
    job?.location,
    job?.job_type,
  ]
    .filter(Boolean)
    .join(" ");

  const semanticMatch = Math.round(
    Math.min(100, 0.6 * overlapScore(profileSemanticText, jobSemanticText) + 0.4 * skillMatch)
  );

  const profileCgpa =
    profile?.cgpa === null || profile?.cgpa === undefined || profile?.cgpa === ""
      ? null
      : Number(profile.cgpa);
  const minCgpa =
    job?.minimum_cgpa === null || job?.minimum_cgpa === undefined || job?.minimum_cgpa === ""
      ? null
      : Number(job.minimum_cgpa);

  let cgpaMatch = null;
  let eligible = true;
  if (minCgpa !== null && Number.isFinite(profileCgpa)) {
    eligible = profileCgpa >= minCgpa;
    cgpaMatch = Math.round(Math.min(100, (profileCgpa / Math.max(minCgpa, 1)) * 100));
  } else if (minCgpa !== null && !Number.isFinite(profileCgpa)) {
    eligible = false;
    cgpaMatch = null;
  } else if (Number.isFinite(profileCgpa)) {
    cgpaMatch = 100;
  }

  let overall;
  if (cgpaMatch === null) {
    overall = Math.round(skillMatch * 0.58 + semanticMatch * 0.42);
  } else {
    overall = Math.round(skillMatch * 0.45 + semanticMatch * 0.35 + cgpaMatch * 0.2);
  }

  // An ineligible drive should never pretend to be a top match.
  if (!eligible) overall = Math.min(overall, 29);

  return {
    ...job,
    overall,
    skillMatch,
    semanticMatch,
    cgpaMatch,
    eligible,
    matchedSkills,
    missingSkills,
  };
}

function scoreLabel(score, eligible) {
  if (!eligible) return "Review eligibility";
  if (score >= 80) return "Strong match";
  if (score >= 65) return "Good match";
  if (score >= 50) return "Possible match";
  return "Explore & improve";
}

function Ring({ value, label, size = 96, muted = false }) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div
      className={`match-ring ${muted ? "muted" : ""}`}
      style={{
        width: size,
        height: size,
        background: `conic-gradient(#635bff ${safe * 3.6}deg, #e8ebf5 0deg)`,
      }}
    >
      <div className="match-ring-inner">
        <strong>{muted ? "—" : `${Math.round(safe)}%`}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function Bar({ label, value, tone = "primary", note }) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="signal-row">
      <div className="signal-head">
        <span>{label}</span>
        <b>{note || `${Math.round(safe)}%`}</b>
      </div>
      <div className="signal-track">
        <div className={`signal-fill ${tone}`} style={{ width: `${safe}%` }} />
      </div>
    </div>
  );
}

export default function StudentAIRecommendations() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [expanded, setExpanded] = useState({});
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [eligibleOnly, setEligibleOnly] = useState(false);
  const [sortMode, setSortMode] = useState("match");
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [showScoring, setShowScoring] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!localStorage.getItem(TUTORIAL_KEY)) {
      setTutorialOpen(true);
    }
    load();
  }, []);

  async function load(showRefresh = false) {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");

      const [profileData, jobsData, companiesData, applicationsData] = await Promise.all([
        api("/student-profile/me"),
        api("/job-drives/"),
        api("/companies/"),
        api("/applications/my"),
      ]);

      setProfile(profileData || {});
      setJobs(asArray(jobsData));
      setCompanies(asArray(companiesData));
      setApplications(asArray(applicationsData));
      setToast(showRefresh ? "Recommendations refreshed from your latest profile." : "Match engine ready.");
      window.setTimeout(() => setToast(""), 2600);
    } catch (err) {
      setError(err?.message || "Unable to load job recommendations.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const recommendations = useMemo(() => {
    const applied = new Set(applications.map((item) => String(item.job_drive_id ?? item.job_id)));
    const base = jobs
      .filter((job) => String(job.drive_status || job.status || "OPEN").toUpperCase() === "OPEN")
      .map((job) => scoreJob(job, profile))
      .map((job) => ({ ...job, applied: applied.has(String(job.id)) }));

    const searched = query.trim()
      ? base.filter((job) =>
          [job.title, job.description, job.location, job.required_skills]
            .join(" ")
            .toLowerCase()
            .includes(query.trim().toLowerCase())
        )
      : base;

    const filtered = eligibleOnly ? searched.filter((job) => job.eligible) : searched;
    filtered.sort((a, b) => {
      if (sortMode === "semantic") return b.semanticMatch - a.semanticMatch;
      if (sortMode === "skills") return b.skillMatch - a.skillMatch;
      return b.overall - a.overall;
    });
    return filtered;
  }, [applications, eligibleOnly, jobs, profile, query, sortMode]);

  const profileCompleteness = useMemo(() => {
    const checks = [
      profile?.skills,
      profile?.cgpa,
      profile?.resume_text,
      profile?.degree,
      profile?.projects,
      profile?.experience,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [profile]);

  function openDetails(id) {
    setExpanded((current) => ({ ...current, [id]: !current[id] }));
  }

  function finishTutorial() {
    localStorage.setItem(TUTORIAL_KEY, "1");
    setTutorialOpen(false);
    setTutorialStep(0);
  }

  function back() {
    if (window.history.length > 1) navigate(-1);
    else navigate("/student");
  }

  return (
    <div className="air-page">
      <style>{CSS}</style>

      <header className="air-topbar">
        <div className="air-brand">
          <button className="air-icon-btn" onClick={back} title="Back">←</button>
          <div className="air-logo">C</div>
          <div>
            <strong>CampusLink</strong>
            <span>AI Career Match</span>
          </div>
        </div>

        <div className="air-top-actions">
          <button className="air-ghost" onClick={() => setShowScoring(true)}>How scoring works</button>
          <button className="air-ghost" onClick={() => { setTutorialStep(0); setTutorialOpen(true); }}>Tutorial</button>
          <button className="air-primary" onClick={() => load(true)} disabled={refreshing}>
            {refreshing ? "Refreshing…" : "↻ Refresh matches"}
          </button>
        </div>
      </header>

      <main className="air-main">
        <section className="air-hero">
          <div>
            <span className="air-eyebrow">PERSONALIZED PLACEMENT INTELLIGENCE</span>
            <h1>Jobs that fit <em>your profile</em></h1>
            <p>See the strongest roles first, understand why they match, and spot the skills that could improve your placement chances.</p>
          </div>
          <div className="air-hero-side">
            <Ring value={profileCompleteness} label="profile ready" />
            <div>
              <b>{recommendations.length}</b>
              <span>open matches</span>
              <small>{eligibleOnly ? "Eligible roles only" : "All open roles"}</small>
            </div>
          </div>
        </section>

        <section className="air-filterbar">
          <div className="air-filter-left">
            <button className="air-collapse" onClick={() => setFiltersOpen((v) => !v)}>
              {filtersOpen ? "⌃ Hide controls" : "⌄ Show controls"}
            </button>
            {filtersOpen && (
              <>
                <label className="air-search">
                  <span>⌕</span>
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search role, skill or location" />
                </label>
                <label className="air-select-wrap">
                  <span>Sort</span>
                  <select value={sortMode} onChange={(e) => setSortMode(e.target.value)}>
                    <option value="match">Best match</option>
                    <option value="semantic">Semantic relevance</option>
                    <option value="skills">Skill coverage</option>
                  </select>
                </label>
                <label className="air-switch">
                  <input type="checkbox" checked={eligibleOnly} onChange={(e) => setEligibleOnly(e.target.checked)} />
                  <span className="air-toggle" />
                  <span>Eligible only</span>
                </label>
              </>
            )}
          </div>
          <span className="air-live"><i /> Live profile ranking</span>
        </section>

        {error && (
          <div className="air-alert">
            <strong>Unable to load recommendations.</strong>
            <span>{error}</span>
            <button onClick={() => load(true)}>Try again</button>
          </div>
        )}

        {loading ? (
          <div className="air-loading-grid">
            {[1, 2, 3].map((n) => <div className="air-skeleton" key={n} />)}
          </div>
        ) : recommendations.length === 0 ? (
          <section className="air-empty">
            <div className="air-empty-icon">✦</div>
            <h2>No matching open drives right now</h2>
            <p>Try showing all roles or complete more of your profile so CampusLink has more signals to compare.</p>
            <div>
              <button className="air-primary" onClick={() => setEligibleOnly(false)}>Show all roles</button>
              <button className="air-ghost" onClick={() => navigate("/student/profile")}>Complete profile</button>
            </div>
          </section>
        ) : (
          <div className="air-list">
            {recommendations.map((job, index) => (
              <article className={`air-card ${index === 0 ? "featured" : ""}`} key={job.id}>
                <div className="air-rank">#{index + 1}</div>
                <div className="air-company-mark">{companyName(companies, job.company_id).slice(0, 1).toUpperCase()}</div>

                <div className="air-card-main">
                  <div className="air-card-head">
                    <div>
                      <span className="air-company">{companyName(companies, job.company_id)}</span>
                      <h2>{job.title || "Untitled role"}</h2>
                      <p>{job.description || "Campus recruitment opportunity for entry-level talent."}</p>
                    </div>
                    <div className="air-score-box">
                      <Ring value={job.overall} label="match" size={84} muted={!Number.isFinite(job.overall)} />
                      <b>{scoreLabel(job.overall, job.eligible)}</b>
                    </div>
                  </div>

                  <div className="air-meta">
                    <span>⌖ {job.location || "Campus"}</span>
                    <span>◷ {job.job_type || "FULL_TIME"}</span>
                    <span>₹ {job.salary || "Salary disclosed in drive"}</span>
                    <span>{job.applied ? "✓ Already applied" : "● Accepting applications"}</span>
                  </div>

                  <div className="air-signal-summary">
                    <div><span>Skills</span><b>{job.skillMatch}%</b></div>
                    <div><span>Semantic</span><b>{job.semanticMatch}%</b></div>
                    <div><span>CGPA</span><b>{job.cgpaMatch === null ? "—" : `${job.cgpaMatch}%`}</b></div>
                    <div><span>Eligibility</span><b className={job.eligible ? "good" : "warn"}>{job.eligible ? "Eligible" : job.cgpaMatch === null && job.minimum_cgpa ? "CGPA needed" : "Not eligible"}</b></div>
                  </div>

                  <div className="air-skill-row">
                    <div>
                      <span className="air-chip-label">Matched skills</span>
                      <div className="air-chips">
                        {job.matchedSkills.length ? job.matchedSkills.map((skill) => <span className="chip good" key={skill}>{skill}</span>) : <span className="air-muted">No exact skill match yet</span>}
                      </div>
                    </div>
                    <div>
                      <span className="air-chip-label">Skill gaps</span>
                      <div className="air-chips">
                        {job.missingSkills.length ? job.missingSkills.map((skill) => <span className="chip gap" key={skill}>{skill}</span>) : <span className="air-muted">No required skill gaps</span>}
                      </div>
                    </div>
                  </div>

                  <div className="air-actions">
                    <button className="air-expand" onClick={() => openDetails(job.id)}>
                      {expanded[job.id] ? "Hide match details ↑" : "Show match details ↓"}
                    </button>
                    <button className="air-primary" onClick={() => navigate(`/student/jobs?job=${job.id}`)}>
                      {job.applied ? "View application" : "View role →"}
                    </button>
                  </div>

                  {expanded[job.id] && (
                    <div className="air-details">
                      <div className="air-detail-copy">
                        <span className="air-eyebrow">WHY THIS RANK</span>
                        <h3>Transparent match signals</h3>
                        <p>CampusLink combines the signals below so you can understand the recommendation instead of seeing a mystery score.</p>
                      </div>
                      <div className="air-bars">
                        <Bar label="Skill coverage" value={job.skillMatch} />
                        <Bar label="Semantic relevance" value={job.semanticMatch} tone="violet" />
                        <Bar label="CGPA alignment" value={job.cgpaMatch ?? 0} note={job.cgpaMatch === null ? "Not available" : `${job.cgpaMatch}%`} tone={job.eligible ? "green" : "orange"} />
                      </div>
                      <div className="air-eligibility">
                        <strong>{job.eligible ? "✓ Eligible for this drive" : "! Eligibility needs attention"}</strong>
                        <span>{job.minimum_cgpa ? `Minimum CGPA: ${job.minimum_cgpa}` : "No minimum CGPA set"}{profile?.cgpa != null ? ` · Your CGPA: ${profile.cgpa}` : " · Add your CGPA to improve ranking accuracy"}</span>
                      </div>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {toast && <div className="air-toast">✓ {toast}</div>}

      {showScoring && (
        <div className="air-modal-backdrop" onClick={() => setShowScoring(false)}>
          <div className="air-modal" onClick={(e) => e.stopPropagation()}>
            <button className="air-modal-close" onClick={() => setShowScoring(false)}>×</button>
            <span className="air-eyebrow">SCORING GUIDE</span>
            <h2>How CampusLink ranks a role</h2>
            <div className="air-guide-grid">
              <div><b>45%</b><span>Skill coverage</span><small>Required skills matched against your saved skills.</small></div>
              <div><b>35%</b><span>Semantic relevance</span><small>Profile and resume wording compared with the role context.</small></div>
              <div><b>20%</b><span>CGPA alignment</span><small>Academic fit against the drive requirement when available.</small></div>
            </div>
            <p className="air-modal-note">Scores are a transparent decision aid. Always check the official job drive requirements before applying.</p>
          </div>
        </div>
      )}

      {tutorialOpen && (
        <div className="air-modal-backdrop">
          <div className="air-tutorial">
            <div className="tutorial-art"><div className="orbit one" /><div className="orbit two" /><span>✦</span></div>
            <div className="tutorial-copy">
              <span className="air-eyebrow">QUICK TOUR · {tutorialStep + 1}/4</span>
              {tutorialStep === 0 && <><h2>Welcome to AI Match</h2><p>CampusLink turns your profile into a visual ranking of open placement roles.</p></>}
              {tutorialStep === 1 && <><h2>Every score is explainable</h2><p>Open any match to see skill coverage, semantic relevance, CGPA alignment and eligibility.</p></>}
              {tutorialStep === 2 && <><h2>You control the view</h2><p>Hide the controls, filter eligible jobs, search by role or location, and change the ranking strategy.</p></>}
              {tutorialStep === 3 && <><h2>Use the gaps to improve</h2><p>Missing skills are shown as actionable gaps so you know exactly what to strengthen before your next application.</p></>}
              <div className="tutorial-dots">{[0,1,2,3].map((step) => <i className={tutorialStep === step ? "active" : ""} key={step} />)}</div>
              <div className="tutorial-actions">
                {tutorialStep > 0 && <button className="air-ghost" onClick={() => setTutorialStep((s) => s - 1)}>← Back</button>}
                {tutorialStep < 3 ? <button className="air-primary" onClick={() => setTutorialStep((s) => s + 1)}>Next →</button> : <button className="air-primary" onClick={finishTutorial}>Get started</button>}
                <button className="air-text-btn" onClick={finishTutorial}>Skip tour</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const CSS = `
:root{--air-ink:#12172a;--air-muted:#68708a;--air-line:#e8ebf3;--air-bg:#f6f7fb;--air-card:#ffffff;--air-primary:#635bff;--air-violet:#8a63ff;--air-green:#14a67a;--air-orange:#e58a33}
.air-page{min-height:100vh;background:radial-gradient(circle at 0% 0%,rgba(99,91,255,.13),transparent 24%),radial-gradient(circle at 100% 0%,rgba(20,166,122,.08),transparent 22%),var(--air-bg);color:var(--air-ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.air-topbar{height:78px;background:rgba(255,255,255,.88);backdrop-filter:blur(18px);border-bottom:1px solid var(--air-line);display:flex;align-items:center;justify-content:space-between;padding:0 34px;position:sticky;top:0;z-index:20}.air-brand{display:flex;align-items:center;gap:12px}.air-brand>div:last-child{display:grid;gap:2px}.air-brand strong{font-size:15px}.air-brand span{font-size:11px;color:var(--air-muted)}.air-logo{width:36px;height:36px;border-radius:11px;background:linear-gradient(135deg,#635bff,#8f83ff);color:white;display:grid;place-items:center;font-weight:900}.air-icon-btn{border:1px solid var(--air-line);background:white;border-radius:10px;width:36px;height:36px;cursor:pointer;font-size:19px}.air-top-actions{display:flex;align-items:center;gap:10px}
.air-main{max-width:1320px;margin:0 auto;padding:34px}.air-hero{display:flex;justify-content:space-between;align-items:flex-end;gap:30px;padding:18px 0 26px}.air-eyebrow{font-size:10px;font-weight:900;letter-spacing:1.5px;color:#7168de}.air-hero h1{font-size:clamp(36px,5vw,60px);line-height:1.03;letter-spacing:-2.6px;margin:10px 0 14px}.air-hero h1 em{font-style:normal;color:var(--air-primary)}.air-hero p{max-width:680px;color:var(--air-muted);font-size:16px;line-height:1.7;margin:0}.air-hero-side{display:flex;align-items:center;gap:18px;background:rgba(255,255,255,.74);border:1px solid var(--air-line);padding:14px 18px;border-radius:20px;box-shadow:0 18px 44px rgba(27,33,61,.06)}.air-hero-side>div:last-child{display:grid;gap:2px}.air-hero-side b{font-size:26px}.air-hero-side span{font-size:13px}.air-hero-side small{color:var(--air-muted);font-size:11px}
.match-ring{border-radius:999px;display:grid;place-items:center;flex-shrink:0}.match-ring-inner{width:calc(100% - 9px);height:calc(100% - 9px);border-radius:999px;background:white;display:grid;place-items:center;align-content:center;gap:1px}.match-ring-inner strong{font-size:18px;line-height:1}.match-ring-inner span{font-size:9px;color:var(--air-muted);text-transform:uppercase;letter-spacing:.8px}.match-ring.muted{background:conic-gradient(#d9dce6 0 360deg)!important}
.air-filterbar{display:flex;justify-content:space-between;align-items:center;gap:18px;background:rgba(255,255,255,.82);border:1px solid var(--air-line);border-radius:18px;padding:10px 12px;margin-bottom:18px;box-shadow:0 10px 30px rgba(30,34,63,.04)}.air-filter-left{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.air-collapse,.air-ghost,.air-expand,.air-text-btn{border:0;background:transparent;color:var(--air-muted);cursor:pointer;font-weight:750}.air-search{height:42px;border:1px solid var(--air-line);background:white;border-radius:12px;padding:0 12px;display:flex;align-items:center;gap:8px;min-width:min(370px,60vw)}.air-search span{font-size:18px;color:#8b91a6}.air-search input{border:0;outline:0;width:100%;font:inherit;color:var(--air-ink)}.air-select-wrap{display:flex;align-items:center;gap:7px;color:var(--air-muted);font-size:12px}.air-select-wrap select{height:42px;border:1px solid var(--air-line);background:white;border-radius:12px;padding:0 10px;font:inherit}.air-switch{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--air-muted);cursor:pointer}.air-switch input{display:none}.air-toggle{width:36px;height:20px;border-radius:99px;background:#d9dce6;position:relative;transition:.2s}.air-toggle:after{content:"";position:absolute;width:16px;height:16px;border-radius:50%;background:white;top:2px;left:2px;box-shadow:0 2px 5px rgba(0,0,0,.12);transition:.2s}.air-switch input:checked + .air-toggle{background:var(--air-primary)}.air-switch input:checked + .air-toggle:after{left:18px}.air-live{font-size:11px;color:var(--air-muted);white-space:nowrap}.air-live i{display:inline-block;width:7px;height:7px;border-radius:50%;background:#14a67a;margin-right:6px;box-shadow:0 0 0 4px rgba(20,166,122,.1)}
.air-primary{border:0;background:var(--air-primary);color:white;border-radius:11px;padding:11px 15px;font-weight:850;cursor:pointer;box-shadow:0 10px 20px rgba(99,91,255,.18)}.air-primary:disabled{opacity:.55;cursor:wait}.air-ghost{border:1px solid var(--air-line);background:white;border-radius:11px;padding:10px 13px;color:var(--air-ink)}
.air-alert{background:#fff6ef;border:1px solid #f0d4be;color:#814c27;padding:14px 16px;border-radius:15px;display:flex;align-items:center;gap:10px;margin-bottom:18px}.air-alert span{color:#8e6d53}.air-alert button{margin-left:auto;border:0;background:transparent;color:#73401a;font-weight:800;cursor:pointer}.air-list{display:grid;gap:15px}.air-card{display:grid;grid-template-columns:34px 48px 1fr;gap:14px;background:var(--air-card);border:1px solid var(--air-line);border-radius:22px;padding:18px;box-shadow:0 12px 34px rgba(31,34,60,.05)}.air-card.featured{border-color:#d7d4ff;box-shadow:0 18px 42px rgba(99,91,255,.09)}.air-rank{font-size:11px;font-weight:900;color:#8b91a6;padding-top:8px}.air-company-mark{width:48px;height:48px;border-radius:15px;background:linear-gradient(145deg,#171b32,#393e60);color:white;display:grid;place-items:center;font-weight:900;font-size:17px}.air-card-main{min-width:0}.air-card-head{display:flex;justify-content:space-between;gap:20px}.air-company{font-size:11px;color:#7168de;font-weight:900;letter-spacing:1px;text-transform:uppercase}.air-card-head h2{font-size:24px;letter-spacing:-.7px;margin:5px 0 5px}.air-card-head p{margin:0;color:var(--air-muted);font-size:13px;line-height:1.6;max-width:800px}.air-score-box{display:grid;place-items:center;gap:5px;min-width:102px}.air-score-box>b{font-size:11px;color:var(--air-muted);text-transform:uppercase;letter-spacing:.7px;text-align:center}.air-meta{display:flex;gap:8px;flex-wrap:wrap;margin:13px 0}.air-meta span{background:#f8f9fc;border:1px solid var(--air-line);border-radius:999px;padding:6px 9px;font-size:11px;color:#586077}.air-signal-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:9px 0}.air-signal-summary>div{background:#fafbfe;border:1px solid var(--air-line);border-radius:13px;padding:11px 12px}.air-signal-summary span{display:block;color:#8a90a4;font-size:10px;text-transform:uppercase;letter-spacing:.8px}.air-signal-summary b{display:block;margin-top:5px;font-size:15px}.air-signal-summary .good{color:var(--air-green)}.air-signal-summary .warn{color:var(--air-orange)}
.air-skill-row{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:12px}.air-chip-label{display:block;color:#8a90a4;font-size:10px;letter-spacing:.8px;text-transform:uppercase;font-weight:850;margin-bottom:7px}.air-chips{display:flex;flex-wrap:wrap;gap:6px}.chip{font-size:11px;border-radius:999px;padding:6px 9px;border:1px solid}.chip.good{background:#edfaf5;border-color:#c7ecdd;color:#087354}.chip.gap{background:#fff4ec;border-color:#f2d6c0;color:#a45c21}.air-muted{font-size:11px;color:#9197aa}.air-actions{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:15px;padding-top:14px;border-top:1px solid #eff1f6}.air-expand{padding:7px 0}.air-details{margin-top:15px;padding:16px;background:#f8f8ff;border:1px solid #e7e4ff;border-radius:16px;display:grid;grid-template-columns:1fr 1.2fr;gap:18px}.air-detail-copy h3{margin:6px 0;font-size:16px}.air-detail-copy p{font-size:12px;color:var(--air-muted);line-height:1.6;margin:0}.air-bars{display:grid;gap:10px}.signal-row{display:grid;gap:5px}.signal-head{display:flex;justify-content:space-between;font-size:11px}.signal-head span{color:#68708a}.signal-head b{font-size:10px}.signal-track{height:8px;background:#e8ebf5;border-radius:99px;overflow:hidden}.signal-fill{height:100%;border-radius:99px;background:linear-gradient(90deg,#635bff,#8a63ff)}.signal-fill.violet{background:linear-gradient(90deg,#8a63ff,#b06cff)}.signal-fill.green{background:linear-gradient(90deg,#13a77a,#41c7a1)}.signal-fill.orange{background:linear-gradient(90deg,#e58a33,#f4b268)}.air-eligibility{grid-column:1/-1;background:white;border:1px solid var(--air-line);border-radius:13px;padding:10px 12px;display:grid;gap:3px}.air-eligibility strong{font-size:12px}.air-eligibility span{font-size:11px;color:var(--air-muted)}
.air-empty{padding:70px 20px;text-align:center;background:white;border:1px solid var(--air-line);border-radius:22px}.air-empty-icon{width:60px;height:60px;display:grid;place-items:center;margin:0 auto 12px;border-radius:18px;background:#f0efff;color:var(--air-primary);font-size:28px}.air-empty h2{margin:0 0 8px}.air-empty p{color:var(--air-muted);max-width:560px;margin:0 auto 18px;line-height:1.6}.air-empty>div{display:flex;gap:9px;justify-content:center}.air-loading-grid{display:grid;gap:15px}.air-skeleton{height:250px;background:linear-gradient(90deg,#f1f2f6,#fbfbfd,#f1f2f6);background-size:200% 100%;animation:sh 1.25s infinite;border-radius:22px;border:1px solid #eceef4}@keyframes sh{to{background-position:-200% 0}}
.air-toast{position:fixed;right:24px;bottom:24px;background:#10152b;color:white;border-radius:12px;padding:12px 16px;font-size:12px;box-shadow:0 20px 42px rgba(0,0,0,.2);z-index:60}.air-modal-backdrop{position:fixed;inset:0;background:rgba(10,15,31,.54);display:grid;place-items:center;padding:22px;z-index:50}.air-modal{position:relative;background:white;border-radius:24px;width:min(720px,96vw);padding:28px;box-shadow:0 30px 80px rgba(0,0,0,.25)}.air-modal-close{position:absolute;right:17px;top:15px;border:0;background:#f3f4f8;width:34px;height:34px;border-radius:50%;font-size:22px;cursor:pointer}.air-modal h2{font-size:29px;letter-spacing:-1px;margin:9px 0 20px}.air-guide-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.air-guide-grid>div{border:1px solid var(--air-line);border-radius:16px;padding:16px;display:grid;gap:5px}.air-guide-grid b{font-size:24px;color:var(--air-primary)}.air-guide-grid span{font-size:12px;font-weight:850}.air-guide-grid small{font-size:11px;color:var(--air-muted);line-height:1.5}.air-modal-note{font-size:12px;color:var(--air-muted);line-height:1.5;margin-top:16px}.air-tutorial{width:min(880px,96vw);background:white;border-radius:28px;overflow:hidden;display:grid;grid-template-columns:1fr 1.2fr;box-shadow:0 34px 90px rgba(0,0,0,.28)}.tutorial-art{min-height:360px;background:radial-gradient(circle at 50% 40%,rgba(125,112,255,.5),transparent 35%),linear-gradient(145deg,#13182f,#262b4a);display:grid;place-items:center;position:relative;color:white;font-size:66px}.tutorial-art span{position:relative;z-index:2}.orbit{position:absolute;border:1px solid rgba(255,255,255,.2);border-radius:50%}.orbit.one{width:190px;height:190px}.orbit.two{width:280px;height:280px}.tutorial-copy{padding:34px;display:flex;flex-direction:column;justify-content:center}.tutorial-copy h2{font-size:30px;letter-spacing:-1px;margin:10px 0}.tutorial-copy p{color:var(--air-muted);line-height:1.7;font-size:14px;margin:0}.tutorial-dots{display:flex;gap:6px;margin:24px 0 18px}.tutorial-dots i{width:7px;height:7px;border-radius:50%;background:#d8dbe7}.tutorial-dots i.active{background:var(--air-primary);width:22px;border-radius:99px}.tutorial-actions{display:flex;align-items:center;gap:8px}.air-text-btn{font-size:11px;margin-left:auto}
@media (max-width:900px){.air-topbar{padding:0 16px}.air-top-actions .air-ghost:first-child{display:none}.air-main{padding:20px}.air-hero{align-items:flex-start;flex-direction:column}.air-signal-summary{grid-template-columns:repeat(2,1fr)}.air-skill-row,.air-details{grid-template-columns:1fr}.air-card{grid-template-columns:28px 44px 1fr;padding:14px}.air-company-mark{width:44px;height:44px}.air-guide-grid{grid-template-columns:1fr}.air-tutorial{grid-template-columns:1fr}.tutorial-art{min-height:180px}.air-search{min-width:220px}.air-live{display:none}}
@media (max-width:620px){.air-topbar{height:auto;padding:12px;gap:10px;align-items:flex-start}.air-top-actions{flex-wrap:wrap;justify-content:flex-end}.air-top-actions .air-primary{padding:9px 11px}.air-hero h1{font-size:39px}.air-score-box{min-width:84px}.air-meta span{font-size:10px}.air-signal-summary{gap:7px}.air-signal-summary>div{padding:9px}.air-card-head{flex-direction:column}.air-score-box{justify-items:start;grid-template-columns:auto 1fr;gap:10px}.air-empty>div{flex-direction:column;align-items:center}.air-filterbar{align-items:flex-start}.air-select-wrap{display:block}.air-topbar .air-brand strong{font-size:13px}}
`;
