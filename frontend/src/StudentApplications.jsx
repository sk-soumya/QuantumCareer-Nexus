import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

function readToken() {
  return (
    localStorage.getItem("campuslink_token") ||
    localStorage.getItem("access_token") ||
    ""
  );
}

async function api(path, token, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const detail =
      typeof payload?.detail === "string"
        ? payload.detail
        : Array.isArray(payload?.detail)
          ? payload.detail.map((item) => item.msg).filter(Boolean).join(" · ")
          : `Request failed (${response.status})`;
    throw new Error(detail || `Request failed (${response.status})`);
  }
  return payload;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function idOf(value) {
  return value === null || value === undefined ? "" : String(value);
}

function dateTime(value) {
  if (!value) return "Not available";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function dateOnly(value) {
  if (!value) return "Not specified";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function words(value) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function applicationStatus(application) {
  return String(application?.status || "APPLIED").toUpperCase();
}

function statusLabel(status) {
  const labels = {
    APPLIED: "Application submitted",
    SHORTLISTED: "Shortlisted",
    INTERVIEW: "Interview stage",
    SELECTED: "Selected",
    OFFERED: "Offer issued",
    ACCEPTED: "Offer accepted",
    REJECTED: "Not selected",
    WITHDRAWN: "Withdrawn",
  };
  return labels[status] || words(status || "Pending");
}

function statusTone(status) {
  if (["ACCEPTED", "OFFERED", "SELECTED"].includes(status)) return "positive";
  if (status === "SHORTLISTED" || status === "INTERVIEW") return "progress";
  if (["REJECTED", "WITHDRAWN"].includes(status)) return "closed";
  return "submitted";
}

function statusGroup(status) {
  if (["REJECTED", "WITHDRAWN"].includes(status)) return "CLOSED";
  if (["SELECTED", "OFFERED", "ACCEPTED"].includes(status)) return "OFFERS";
  if (status === "SHORTLISTED") return "SHORTLISTED";
  if (["APPLIED", "INTERVIEW"].includes(status)) return "ACTIVE";
  return "ACTIVE";
}

function applicationDriveId(application) {
  return (
    application?.job_drive_id ??
    application?.jobDriveId ??
    application?.drive_id ??
    application?.job_id ??
    application?.job_drive?.id ??
    application?.job?.id ??
    ""
  );
}

function companyInitials(name) {
  const parts = String(name || "Company").trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("") || "CL";
}

function companyNameFor(job, companyMap) {
  const nested = job?.company?.name || job?.company_name;
  if (nested) return nested;
  const company = companyMap.get(idOf(job?.company_id));
  return company?.name || company?.company_name || "Company details pending";
}

function driveTitleFor(application, job) {
  return (
    job?.title ||
    job?.job_title ||
    application?.job_title ||
    application?.title ||
    application?.job_drive?.title ||
    application?.job?.title ||
    "Job title details pending"
  );
}

function stagesFor(status) {
  const stages = ["Submitted", "Shortlisted", "Interview", "Decision"];
  const current =
    status === "APPLIED" ? 0 :
    status === "SHORTLISTED" ? 1 :
    status === "INTERVIEW" ? 2 : 3;
  return { stages, current };
}

export default function StudentApplications() {
  const navigate = useNavigate();
  const token = readToken();

  const [applications, setApplications] = useState([]);
  const [jobDrives, setJobDrives] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedDriveId, setSelectedDriveId] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("NEWEST");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(null);

  const loadData = useCallback(async (silent = false) => {
    if (!token) {
      setError("Your session is missing. Please sign in again to view your applications.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");

    const [applicationResult, driveResult, companyResult] = await Promise.allSettled([
      api("/applications/my", token),
      api("/job-drives/", token),
      api("/companies/", token),
    ]);

    if (applicationResult.status === "fulfilled") {
      setApplications(asArray(applicationResult.value));
    } else {
      setApplications([]);
      setError(applicationResult.reason?.message || "Could not load your applications.");
    }

    if (driveResult.status === "fulfilled") {
      setJobDrives(asArray(driveResult.value));
    } else {
      setJobDrives([]);
      setError((current) => current || (driveResult.reason?.message || "Could not load job drives."));
    }

    if (companyResult.status === "fulfilled") {
      setCompanies(asArray(companyResult.value));
    } else {
      // Company names are supplemental; application history still works if this endpoint is unavailable.
      setCompanies([]);
    }

    setLoading(false);
    setRefreshing(false);
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const jobMap = useMemo(
    () => new Map(jobDrives.map((job) => [idOf(job.id), job])),
    [jobDrives]
  );

  const companyMap = useMemo(
    () => new Map(companies.map((company) => [idOf(company.id), company])),
    [companies]
  );

  const openDrives = useMemo(
    () => jobDrives.filter((drive) => String(drive.drive_status || "").toUpperCase() === "OPEN"),
    [jobDrives]
  );

  const applicationsByDrive = useMemo(() => {
    const map = new Map();
    applications.forEach((application) => {
      const driveId = idOf(applicationDriveId(application));
      if (driveId) map.set(driveId, application);
    });
    return map;
  }, [applications]);

  useEffect(() => {
    setSelectedDriveId((current) => {
      if (current && openDrives.some((drive) => idOf(drive.id) === current)) return current;
      return openDrives.length ? idOf(openDrives[0].id) : "";
    });
  }, [openDrives]);

  const selectedDrive = useMemo(
    () => openDrives.find((drive) => idOf(drive.id) === selectedDriveId) || null,
    [openDrives, selectedDriveId]
  );

  const stats = useMemo(() => ({
    total: applications.length,
    inReview: applications.filter((item) => ["APPLIED", "SHORTLISTED", "INTERVIEW"].includes(applicationStatus(item))).length,
    shortlisted: applications.filter((item) => applicationStatus(item) === "SHORTLISTED").length,
    offers: applications.filter((item) => ["SELECTED", "OFFERED", "ACCEPTED"].includes(applicationStatus(item))).length,
  }), [applications]);

  const visibleApplications = useMemo(() => {
    const search = query.trim().toLowerCase();
    const rows = applications.filter((application) => {
      const driveId = applicationDriveId(application);
      const drive = jobMap.get(idOf(driveId)) || application?.job_drive || application?.job || {};
      const companyName = companyNameFor(drive, companyMap);
      const title = driveTitleFor(application, drive);
      const status = applicationStatus(application);
      const searchText = [
        title,
        companyName,
        drive?.location,
        drive?.job_type,
        statusLabel(status),
        application?.id,
      ].filter(Boolean).join(" ").toLowerCase();
      const matchesQuery = !search || searchText.includes(search);
      const matchesFilter = filter === "ALL" || statusGroup(status) === filter;
      return matchesQuery && matchesFilter;
    });

    rows.sort((a, b) => {
      if (sortBy === "OLDEST") return new Date(a.applied_at || 0) - new Date(b.applied_at || 0);
      if (sortBy === "TITLE") {
        const titleA = driveTitleFor(a, jobMap.get(idOf(applicationDriveId(a))) || a?.job_drive || a?.job);
        const titleB = driveTitleFor(b, jobMap.get(idOf(applicationDriveId(b))) || b?.job_drive || b?.job);
        return titleA.localeCompare(titleB);
      }
      return new Date(b.applied_at || b.created_at || 0) - new Date(a.applied_at || a.created_at || 0);
    });
    return rows;
  }, [applications, companyMap, filter, jobMap, query, sortBy]);

  async function submitApplication(event) {
    event.preventDefault();
    if (!token) {
      setError("Please sign in again before submitting an application.");
      return;
    }
    if (!selectedDrive) {
      setNotice({ type: "error", text: "Choose an open job drive before submitting." });
      return;
    }
    if (applicationsByDrive.has(idOf(selectedDrive.id))) {
      setNotice({ type: "info", text: "You have already applied for this job drive." });
      return;
    }

    setSubmitting(true);
    setNotice(null);
    setError("");
    try {
      await api("/applications/", token, {
        method: "POST",
        body: JSON.stringify({ job_drive_id: Number(selectedDrive.id) }),
      });
      setNotice({
        type: "success",
        text: `Application submitted for ${selectedDrive.title || "the selected role"}.`,
      });
      await loadData(true);
    } catch (submitError) {
      setNotice({ type: "error", text: submitError.message || "Your application could not be submitted." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="sa-page">
      <style>{`
        .sa-page{--sa-ink:#172033;--sa-muted:#697386;--sa-line:#e4e9f1;--sa-panel:#fff;--sa-bg:#f4f7fb;--sa-blue:#315ce8;--sa-blue-dark:#2447c7;min-height:100vh;background:radial-gradient(circle at 85% 0%,rgba(90,125,255,.11),transparent 28%),var(--sa-bg);color:var(--sa-ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding-bottom:44px}
        .sa-page *{box-sizing:border-box}.sa-wrap{max-width:1220px;width:calc(100% - 44px);margin:0 auto}.sa-topbar{height:76px;background:rgba(255,255,255,.92);border-bottom:1px solid var(--sa-line);display:flex;align-items:center;backdrop-filter:blur(12px)}.sa-topbar-inner{display:flex;align-items:center;justify-content:space-between;gap:20px}.sa-brand{display:flex;align-items:center;gap:11px;color:inherit;text-decoration:none}.sa-brand-mark{height:40px;width:40px;border-radius:13px;background:linear-gradient(145deg,#4469f7,#2944ba);color:#fff;display:grid;place-items:center;font-size:20px;font-weight:850;box-shadow:0 8px 18px rgba(49,92,232,.23)}.sa-brand strong{display:block;font-size:16px;letter-spacing:-.3px}.sa-brand span{display:block;margin-top:2px;color:var(--sa-muted);font-size:11px;letter-spacing:1.5px;text-transform:uppercase}.sa-header-actions{display:flex;gap:9px;align-items:center}.sa-top-link,.sa-back{display:inline-flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;border:1px solid var(--sa-line);background:#fff;border-radius:11px;padding:10px 14px;color:#39445a;font-size:13px;font-weight:700;cursor:pointer;transition:.18s ease}.sa-top-link:hover,.sa-back:hover{border-color:#b9c7fd;color:var(--sa-blue);transform:translateY(-1px)}.sa-main{padding-top:31px}.sa-hero{display:flex;justify-content:space-between;align-items:flex-end;gap:25px;margin-bottom:24px}.sa-eyebrow{display:inline-flex;align-items:center;gap:7px;text-transform:uppercase;letter-spacing:1.8px;color:var(--sa-blue);font-size:10px;font-weight:850}.sa-eyebrow-dot{height:6px;width:6px;border-radius:50%;background:#4d6fff}.sa-hero h1{font-size:clamp(28px,3vw,38px);letter-spacing:-1.45px;line-height:1.12;margin:10px 0 9px;font-weight:830}.sa-hero p{margin:0;color:var(--sa-muted);font-size:14px;line-height:1.65;max-width:640px}.sa-hero-right{display:flex;gap:9px;flex-shrink:0}.sa-primary,.sa-secondary{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:0;text-decoration:none;border-radius:11px;padding:12px 16px;font-size:13px;font-weight:800;cursor:pointer;transition:.18s ease}.sa-primary{background:var(--sa-blue);color:#fff;box-shadow:0 8px 18px rgba(49,92,232,.18)}.sa-primary:hover{background:var(--sa-blue-dark);transform:translateY(-1px)}.sa-primary:disabled{opacity:.58;cursor:not-allowed;transform:none}.sa-secondary{background:#fff;color:#3d4960;border:1px solid var(--sa-line)}.sa-secondary:hover{border-color:#bdc9fa;color:var(--sa-blue)}.sa-stat-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px;margin-bottom:22px}.sa-stat{background:var(--sa-panel);border:1px solid var(--sa-line);border-radius:17px;padding:17px 18px;display:flex;align-items:center;gap:13px;box-shadow:0 3px 12px rgba(22,36,65,.025)}.sa-stat-icon{height:43px;width:43px;flex-shrink:0;border-radius:13px;display:grid;place-items:center;font-size:19px;font-weight:800}.sa-stat-icon.blue{background:#edf1ff;color:#345ce2}.sa-stat-icon.amber{background:#fff4dd;color:#b97908}.sa-stat-icon.violet{background:#f2edff;color:#7751d7}.sa-stat-icon.green{background:#e7f8ef;color:#168654}.sa-stat-label{font-size:11px;color:var(--sa-muted);font-weight:750;letter-spacing:.2px}.sa-stat-value{font-size:26px;font-weight:850;line-height:1.1;letter-spacing:-.8px;margin-top:5px}.sa-stat-note{font-size:10px;color:#8b94a5;margin-top:4px}.sa-panel{background:var(--sa-panel);border:1px solid var(--sa-line);border-radius:19px;box-shadow:0 4px 18px rgba(22,36,65,.035)}.sa-apply-panel{display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,.82fr);gap:26px;padding:24px;margin-bottom:24px;overflow:hidden;position:relative}.sa-apply-panel:after{content:"";position:absolute;width:230px;height:230px;border-radius:50%;background:radial-gradient(circle,rgba(87,120,255,.11),transparent 70%);right:-76px;top:-115px;pointer-events:none}.sa-panel-kicker{font-size:10px;color:#60708a;font-weight:850;letter-spacing:1.6px;text-transform:uppercase}.sa-panel h2{font-size:19px;letter-spacing:-.55px;margin:7px 0 7px}.sa-panel-intro{font-size:12px;line-height:1.7;color:var(--sa-muted);margin:0 0 18px;max-width:560px}.sa-field-label{display:block;font-size:11px;font-weight:800;color:#4d5870;margin-bottom:8px}.sa-select,.sa-input{font-family:inherit;width:100%;min-height:45px;border:1px solid #dce3ee;background:#fbfcff;border-radius:11px;padding:11px 13px;font-size:13px;color:var(--sa-ink);outline:none;transition:.15s}.sa-select:focus,.sa-input:focus{border-color:#8fa4ff;box-shadow:0 0 0 3px rgba(67,101,244,.1);background:#fff}.sa-apply-row{display:flex;align-items:center;gap:10px;margin-top:12px;flex-wrap:wrap}.sa-apply-row .sa-primary{min-height:43px}.sa-small-note{font-size:11px;color:#8791a2}.sa-drive-preview{align-self:stretch;background:linear-gradient(140deg,#f5f7ff,#edf2ff);border:1px solid #e1e7ff;border-radius:15px;padding:20px;position:relative;z-index:1;display:flex;flex-direction:column;justify-content:space-between;min-height:180px}.sa-drive-preview-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.sa-company-avatar{height:43px;width:43px;border-radius:13px;background:#fff;border:1px solid #e1e6fa;display:grid;place-items:center;color:#345ce2;font-weight:850;font-size:13px;box-shadow:0 3px 9px rgba(33,51,130,.06);flex-shrink:0}.sa-open-chip{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;padding:6px 9px;border-radius:999px;background:#e2f8eb;color:#17764c;font-size:10px;font-weight:850;letter-spacing:.4px}.sa-open-chip:before{content:"";height:5px;width:5px;border-radius:50%;background:#20a464}.sa-preview-company{font-size:11px;color:#7180a1;font-weight:750;margin-top:13px}.sa-preview-title{font-size:20px;font-weight:850;letter-spacing:-.65px;line-height:1.22;margin-top:4px;overflow-wrap:anywhere}.sa-preview-meta{display:flex;gap:7px;flex-wrap:wrap;margin-top:14px}.sa-preview-meta span{display:inline-flex;padding:6px 8px;border-radius:7px;background:rgba(255,255,255,.82);border:1px solid #e0e6fc;color:#63708a;font-size:10px;font-weight:750}.sa-notice{padding:13px 15px;border-radius:12px;margin:0 0 17px;display:flex;align-items:flex-start;gap:10px;font-size:12px;line-height:1.55;border:1px solid}.sa-notice-mark{font-size:14px;font-weight:900;line-height:1.2}.sa-notice.success{background:#effbf4;border-color:#c7eed6;color:#17663e}.sa-notice.error{background:#fff2f1;border-color:#f5d0cb;color:#9f332b}.sa-notice.info{background:#f0f4ff;border-color:#d6e0ff;color:#324fc2}.sa-error-block{padding:14px 16px;border:1px solid #f0d0cb;background:#fff7f6;color:#9e332c;border-radius:12px;font-size:12px;margin-bottom:17px;display:flex;justify-content:space-between;gap:12px;align-items:center}.sa-error-block button{border:0;background:transparent;color:inherit;font-weight:800;cursor:pointer;text-decoration:underline}.sa-section-head{display:flex;justify-content:space-between;align-items:flex-end;gap:18px;padding:22px 23px 18px;border-bottom:1px solid var(--sa-line)}.sa-section-head h2{font-size:19px;letter-spacing:-.5px;margin:6px 0 5px}.sa-section-head p{font-size:12px;color:var(--sa-muted);margin:0;line-height:1.55}.sa-section-count{background:#eef2ff;color:#3558dc;border-radius:10px;min-width:37px;height:37px;display:grid;place-items:center;font-size:14px;font-weight:850}.sa-toolbar{display:grid;grid-template-columns:minmax(210px,1fr) 180px 160px;gap:10px;padding:15px 22px;border-bottom:1px solid var(--sa-line)}.sa-search-wrap{position:relative}.sa-search-icon{position:absolute;left:13px;top:13px;color:#929bad;font-size:15px}.sa-search{padding-left:38px}.sa-filter{font-size:12px;min-height:43px}.sa-list{padding:17px;display:grid;grid-template-columns:1fr;gap:13px}.sa-app-card{border:1px solid #e5eaf2;border-radius:15px;padding:19px 20px;background:#fff;transition:border-color .18s,box-shadow .18s,transform .18s}.sa-app-card:hover{border-color:#d1daf8;box-shadow:0 9px 23px rgba(24,41,85,.055);transform:translateY(-1px)}.sa-app-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.sa-app-identity{display:flex;align-items:flex-start;gap:13px;min-width:0}.sa-app-identity .sa-company-avatar{height:47px;width:47px;background:#f4f6ff;flex-shrink:0}.sa-app-title-block{min-width:0}.sa-app-meta-id{font-size:9px;font-weight:850;letter-spacing:1.25px;color:#8a94a6;text-transform:uppercase}.sa-app-title{font-size:18px;line-height:1.3;letter-spacing:-.45px;font-weight:850;margin:5px 0 4px;overflow-wrap:anywhere}.sa-app-company{font-size:12px;color:var(--sa-muted);font-weight:650}.sa-status{display:inline-flex;align-items:center;gap:7px;padding:8px 10px;border-radius:999px;font-size:10px;line-height:1.1;font-weight:850;white-space:nowrap}.sa-status:before{content:"";height:6px;width:6px;border-radius:50%;background:currentColor}.sa-status.submitted{background:#eef2ff;color:#3f5bd4}.sa-status.progress{background:#fff4dd;color:#9f6805}.sa-status.positive{background:#e4f8ec;color:#157746}.sa-status.closed{background:#fff0ee;color:#b34438}.sa-stage-area{margin:20px 0 18px;display:flex;align-items:center;gap:0;max-width:640px}.sa-stage{display:flex;align-items:center;gap:7px;flex:1;min-width:0;color:#a0a8b7;font-size:10px;font-weight:750}.sa-stage:not(:last-child):after{content:"";height:2px;background:#e5e9f1;flex:1;margin:0 8px 0 4px}.sa-stage-dot{height:18px;width:18px;border:2px solid #d9dfea;background:#fff;border-radius:50%;display:grid;place-items:center;font-size:9px;flex-shrink:0}.sa-stage.done{color:#3659d8}.sa-stage.done .sa-stage-dot{background:#315ce8;border-color:#315ce8;color:#fff}.sa-stage.current{color:#263e9a}.sa-stage.current .sa-stage-dot{background:#fff;border:5px solid #5575f5;box-shadow:0 0 0 3px #e4eaff}.sa-stage:last-child{flex:0 0 auto}.sa-stage:last-child:after{display:none}.sa-facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px}.sa-fact{background:#f8faff;border:1px solid #edf0f6;border-radius:10px;padding:11px 12px;min-width:0}.sa-fact-label{display:block;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:#8b95a8;font-weight:850;margin-bottom:5px}.sa-fact-value{display:block;font-size:11px;font-weight:800;color:#3b465d;line-height:1.45;overflow-wrap:anywhere}.sa-card-bottom{margin-top:14px;padding-top:13px;border-top:1px solid #eff2f7;display:flex;justify-content:space-between;gap:12px;align-items:center}.sa-card-dates{display:flex;gap:18px;flex-wrap:wrap}.sa-date-pair{font-size:10px;color:#8b94a6}.sa-date-pair strong{display:block;color:#556075;font-size:11px;margin-top:4px;font-weight:750}.sa-drive-ref{font-size:10px;color:#9aa3b2;font-weight:750}.sa-empty{padding:48px 22px;text-align:center}.sa-empty-icon{margin:0 auto 13px;width:56px;height:56px;border:1px solid #e3e9f3;background:#f6f8ff;color:#7890e8;border-radius:17px;display:grid;place-items:center;font-size:24px}.sa-empty h3{font-size:16px;margin:0 0 7px}.sa-empty p{font-size:12px;color:var(--sa-muted);line-height:1.7;max-width:380px;margin:0 auto 16px}.sa-loading{padding:32px;display:flex;align-items:center;justify-content:center;gap:10px;color:#7a8497;font-size:12px}.sa-spinner{height:17px;width:17px;border:2px solid #dfe5f0;border-top-color:#315ce8;border-radius:50%;animation:sa-spin .75s linear infinite}@keyframes sa-spin{to{transform:rotate(360deg)}}.sa-footer-note{display:flex;align-items:center;gap:8px;color:#8b94a6;font-size:10px;padding:15px 4px 0;line-height:1.6}.sa-footer-note b{color:#64708a}.sa-footer-note span{font-size:14px;color:#6b7fca}.sa-apply-disabled{opacity:.55;cursor:not-allowed}.sa-pagination-note{font-size:11px;color:#8993a4;padding:0 22px 19px}.sa-page button:focus-visible,.sa-page a:focus-visible,.sa-page select:focus-visible,.sa-page input:focus-visible{outline:3px solid rgba(49,92,232,.25);outline-offset:2px}
        @media(max-width:900px){.sa-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.sa-apply-panel{grid-template-columns:1fr}.sa-drive-preview{min-height:150px}.sa-toolbar{grid-template-columns:1fr 1fr}.sa-search-wrap{grid-column:1/-1}}
        @media(max-width:620px){.sa-wrap{width:calc(100% - 28px)}.sa-topbar{height:67px}.sa-brand-mark{height:36px;width:36px}.sa-brand strong{font-size:14px}.sa-brand span{font-size:9px;letter-spacing:1px}.sa-top-link{padding:9px 10px;font-size:11px}.sa-main{padding-top:22px}.sa-hero{align-items:flex-start;flex-direction:column}.sa-hero h1{font-size:30px}.sa-hero p{font-size:12px}.sa-hero-right{width:100%}.sa-hero-right>*{flex:1}.sa-stat-grid{gap:9px}.sa-stat{padding:13px 12px;gap:10px;border-radius:14px}.sa-stat-icon{height:36px;width:36px;border-radius:11px;font-size:16px}.sa-stat-label{font-size:10px}.sa-stat-value{font-size:22px}.sa-stat-note{font-size:9px}.sa-apply-panel{padding:17px;gap:16px;border-radius:16px}.sa-panel h2{font-size:17px}.sa-section-head{padding:18px 16px 15px}.sa-section-head h2{font-size:17px}.sa-section-head p{font-size:11px}.sa-toolbar{padding:12px;grid-template-columns:1fr 1fr}.sa-filter{min-width:0;font-size:11px;padding-left:9px;padding-right:9px}.sa-list{padding:10px;gap:10px}.sa-app-card{padding:15px 13px;border-radius:13px}.sa-app-card-head{gap:10px;flex-direction:column}.sa-app-identity{gap:10px}.sa-app-identity .sa-company-avatar{height:40px;width:40px}.sa-app-title{font-size:16px}.sa-status{align-self:flex-start;padding:7px 9px}.sa-stage-area{margin:17px 0 15px}.sa-stage{font-size:9px;gap:4px}.sa-stage:not(:last-child):after{margin:0 4px}.sa-stage-dot{height:16px;width:16px}.sa-facts{grid-template-columns:1fr;gap:7px}.sa-fact{padding:9px 10px;display:flex;align-items:center;justify-content:space-between;gap:12px}.sa-fact-label{margin:0;flex:0 0 100px}.sa-fact-value{text-align:right}.sa-card-bottom{align-items:flex-start;flex-direction:column}.sa-card-dates{gap:14px}.sa-drive-preview{padding:16px}.sa-preview-title{font-size:18px}.sa-pagination-note{padding:0 13px 16px}}
        @media(prefers-reduced-motion:reduce){.sa-page *{animation-duration:.01ms!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}
      `}</style>

      <header className="sa-topbar">
        <div className="sa-wrap sa-topbar-inner">
          <Link to="/student" className="sa-brand" aria-label="CampusLink student dashboard">
            <div className="sa-brand-mark">C</div>
            <div><strong>CampusLink</strong><span>Student workspace</span></div>
          </Link>
          <div className="sa-header-actions">
            <Link to="/student/jobs" className="sa-top-link">Explore jobs <span aria-hidden="true">↗</span></Link>
            <button className="sa-back" type="button" onClick={() => navigate("/student")}>⌂ <span>Dashboard</span></button>
          </div>
        </div>
      </header>

      <main className="sa-wrap sa-main">
        <section className="sa-hero">
          <div>
            <div className="sa-eyebrow"><span className="sa-eyebrow-dot" /> Placement tracker</div>
            <h1>My Applications</h1>
            <p>Track each role you have applied for, see the latest decision status, and apply for another open job drive from one place.</p>
          </div>
          <div className="sa-hero-right">
            <button className="sa-secondary" type="button" onClick={() => loadData(true)} disabled={refreshing}>
              {refreshing ? <span className="sa-spinner" /> : <span aria-hidden="true">↻</span>} {refreshing ? "Refreshing…" : "Refresh status"}
            </button>
          </div>
        </section>

        {error && (
          <div className="sa-error-block" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => loadData(true)}>Try again</button>
          </div>
        )}
        {notice && (
          <div className={`sa-notice ${notice.type}`} role="status">
            <span className="sa-notice-mark">{notice.type === "success" ? "✓" : notice.type === "error" ? "!" : "i"}</span>
            <span>{notice.text}</span>
          </div>
        )}

        <section className="sa-stat-grid" aria-label="Application summary">
          <div className="sa-stat"><div className="sa-stat-icon blue">▤</div><div><div className="sa-stat-label">Applications submitted</div><div className="sa-stat-value">{loading ? "—" : stats.total}</div><div className="sa-stat-note">Your complete application history</div></div></div>
          <div className="sa-stat"><div className="sa-stat-icon amber">◷</div><div><div className="sa-stat-label">In progress</div><div className="sa-stat-value">{loading ? "—" : stats.inReview}</div><div className="sa-stat-note">Submitted, shortlisted or interview</div></div></div>
          <div className="sa-stat"><div className="sa-stat-icon violet">✦</div><div><div className="sa-stat-label">Shortlisted</div><div className="sa-stat-value">{loading ? "—" : stats.shortlisted}</div><div className="sa-stat-note">Moved forward by the recruiter</div></div></div>
          <div className="sa-stat"><div className="sa-stat-icon green">✓</div><div><div className="sa-stat-label">Offers & selections</div><div className="sa-stat-value">{loading ? "—" : stats.offers}</div><div className="sa-stat-note">Selected, offered or accepted</div></div></div>
        </section>

        <section className="sa-panel sa-apply-panel" aria-labelledby="sa-apply-title">
          <div>
            <div className="sa-panel-kicker">Next opportunity</div>
            <h2 id="sa-apply-title">Apply for a job drive</h2>
            <p className="sa-panel-intro">Choose a job drive that is currently open. Your application is saved to your student account and will appear in the tracker below.</p>
            {openDrives.length > 0 ? (
              <form onSubmit={submitApplication}>
                <label className="sa-field-label" htmlFor="sa-job-drive">Open job drive</label>
                <select id="sa-job-drive" className="sa-select" value={selectedDriveId} onChange={(event) => setSelectedDriveId(event.target.value)} disabled={submitting}>
                  {openDrives.map((drive) => {
                    const alreadyApplied = applicationsByDrive.has(idOf(drive.id));
                    return <option key={drive.id} value={idOf(drive.id)}>{drive.title || `Job drive ${drive.id}`}{alreadyApplied ? " — Already applied" : ""}</option>;
                  })}
                </select>
                <div className="sa-apply-row">
                  <button className="sa-primary" type="submit" disabled={!selectedDrive || submitting || applicationsByDrive.has(idOf(selectedDrive?.id))}>
                    {submitting ? <><span className="sa-spinner" /> Submitting…</> : applicationsByDrive.has(idOf(selectedDrive?.id)) ? "Already applied" : <>Submit application <span aria-hidden="true">→</span></>}
                  </button>
                  <span className="sa-small-note">One application per job drive.</span>
                </div>
              </form>
            ) : loading ? (
              <div className="sa-loading"><span className="sa-spinner" /> Loading open job drives…</div>
            ) : (
              <div className="sa-notice info" style={{ marginBottom: 0 }}><span className="sa-notice-mark">i</span><span>No open job drives are available right now. Check the Job Matching page for other opportunities.</span></div>
            )}
          </div>

          <aside className="sa-drive-preview" aria-live="polite">
            {selectedDrive ? (
              <>
                <div>
                  <div className="sa-drive-preview-top">
                    <div className="sa-company-avatar">{companyInitials(companyNameFor(selectedDrive, companyMap))}</div>
                    <span className="sa-open-chip">Open for applications</span>
                  </div>
                  <div className="sa-preview-company">{companyNameFor(selectedDrive, companyMap)}</div>
                  <div className="sa-preview-title">{selectedDrive.title || "Untitled role"}</div>
                </div>
                <div className="sa-preview-meta">
                  <span>{words(selectedDrive.job_type || "Placement role")}</span>
                  <span>⌖ {selectedDrive.location || "Location not specified"}</span>
                  <span>Deadline: {dateOnly(selectedDrive.application_deadline)}</span>
                </div>
              </>
            ) : (
              <div>
                <div className="sa-drive-preview-top"><div className="sa-company-avatar">CL</div><span className="sa-open-chip">Job drive preview</span></div>
                <div className="sa-preview-title" style={{ marginTop: 20 }}>Your next opportunity starts here.</div>
                <div className="sa-preview-company">When a drive opens, its role details will show here.</div>
              </div>
            )}
          </aside>
        </section>

        <section className="sa-panel" aria-labelledby="sa-applications-title">
          <div className="sa-section-head">
            <div>
              <div className="sa-panel-kicker">Your placement journey</div>
              <h2 id="sa-applications-title">Application history</h2>
              <p>See what you applied for, when it was submitted, and the latest status recorded by the recruiter.</p>
            </div>
            <div className="sa-section-count">{loading ? "—" : visibleApplications.length}</div>
          </div>

          <div className="sa-toolbar">
            <label className="sa-search-wrap">
              <span className="sa-search-icon" aria-hidden="true">⌕</span>
              <input className="sa-input sa-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search role, company or status…" aria-label="Search applications" />
            </label>
            <select className="sa-select sa-filter" value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter application status">
              <option value="ALL">All applications</option>
              <option value="ACTIVE">In progress</option>
              <option value="SHORTLISTED">Shortlisted</option>
              <option value="OFFERS">Offers & selection</option>
              <option value="CLOSED">Closed applications</option>
            </select>
            <select className="sa-select sa-filter" value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Sort applications">
              <option value="NEWEST">Newest first</option>
              <option value="OLDEST">Oldest first</option>
              <option value="TITLE">Role A–Z</option>
            </select>
          </div>

          {loading ? (
            <div className="sa-loading"><span className="sa-spinner" /> Loading your application history…</div>
          ) : visibleApplications.length === 0 ? (
            <div className="sa-empty">
              <div className="sa-empty-icon">▤</div>
              <h3>{applications.length === 0 ? "Your application journey starts here" : "No applications match these filters"}</h3>
              <p>{applications.length === 0 ? "Apply to an open job drive above or browse Job Matching. Your submitted applications will appear here automatically." : "Try a different search or status filter to find the application you are looking for."}</p>
              {applications.length === 0 ? <Link className="sa-primary" to="/student/jobs">Explore job drives <span aria-hidden="true">→</span></Link> : <button className="sa-secondary" type="button" onClick={() => { setQuery(""); setFilter("ALL"); }}>Clear filters</button>}
            </div>
          ) : (
            <div className="sa-list">
              {visibleApplications.map((application) => {
                const driveId = applicationDriveId(application);
                const drive = jobMap.get(idOf(driveId)) || application?.job_drive || application?.job || {};
                const title = driveTitleFor(application, drive);
                const companyName = companyNameFor(drive, companyMap);
                const status = applicationStatus(application);
                const tone = statusTone(status);
                const { stages, current } = stagesFor(status);
                const location = drive?.location || application?.location || "Location not specified";
                const type = drive?.job_type || application?.job_type || "Placement role";
                return (
                  <article className="sa-app-card" key={application.id ?? `${driveId}-${application.applied_at}`}>
                    <div className="sa-app-card-head">
                      <div className="sa-app-identity">
                        <div className="sa-company-avatar">{companyInitials(companyName)}</div>
                        <div className="sa-app-title-block">
                          <div className="sa-app-meta-id">Application #{application.id ?? "—"}</div>
                          <h3 className="sa-app-title">{title}</h3>
                          <div className="sa-app-company">{companyName}</div>
                        </div>
                      </div>
                      <span className={`sa-status ${tone}`}>{statusLabel(status)}</span>
                    </div>

                    <div className="sa-stage-area" aria-label={`Current stage: ${statusLabel(status)}`}>
                      {stages.map((stage, index) => {
                        const done = index < current;
                        const active = index === current;
                        return (
                          <div className={`sa-stage ${done ? "done" : ""} ${active ? "current" : ""}`} key={stage}>
                            <span className="sa-stage-dot">{done ? "✓" : index + 1}</span>
                            <span>{stage}</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="sa-facts">
                      <div className="sa-fact"><span className="sa-fact-label">Job type</span><span className="sa-fact-value">{words(type)}</span></div>
                      <div className="sa-fact"><span className="sa-fact-label">Location</span><span className="sa-fact-value">{location}</span></div>
                      <div className="sa-fact"><span className="sa-fact-label">Latest status</span><span className="sa-fact-value">{statusLabel(status)}</span></div>
                    </div>

                    <div className="sa-card-bottom">
                      <div className="sa-card-dates">
                        <div className="sa-date-pair">Applied<strong>{dateTime(application.applied_at || application.created_at)}</strong></div>
                        <div className="sa-date-pair">Last updated<strong>{dateTime(application.updated_at || application.updatedAt || application.applied_at || application.created_at)}</strong></div>
                      </div>
                      <div className="sa-drive-ref">{driveId ? `Job drive ${driveId}` : "Job drive details pending"}</div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          {!loading && visibleApplications.length > 0 && <div className="sa-pagination-note">Showing {visibleApplications.length} of {applications.length} application{applications.length === 1 ? "" : "s"}.</div>}
        </section>

        <div className="sa-footer-note"><span aria-hidden="true">ⓘ</span><div><b>About these statuses:</b> application statuses are displayed from your CampusLink records. The recruiter or placement team updates your progress; this page does not make hiring decisions.</div></div>
      </main>
    </div>
  );
}
