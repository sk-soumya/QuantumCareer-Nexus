import { useCallback, useEffect, useMemo, useState } from "react";

const API_BASE_URL = "http://127.0.0.1:8000";

function getToken() {
  return localStorage.getItem("campuslink_token") || "";
}

function errorText(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(errorText).filter(Boolean).join(" · ");
  if (value && typeof value === "object") {
    if (typeof value.message === "string") return value.message;
    if (typeof value.detail === "string") return value.detail;
    if (Array.isArray(value.detail)) {
      return value.detail
        .map((item) => {
          if (typeof item === "string") return item;
          const location = Array.isArray(item?.loc) ? item.loc.filter((part) => part !== "body").join(" → ") : "";
          return [location, item?.msg].filter(Boolean).join(": ") || JSON.stringify(item);
        })
        .join(" · ");
    }
    try { return JSON.stringify(value); } catch { return "An unexpected error occurred."; }
  }
  return "An unexpected error occurred.";
}

async function api(path, options = {}) {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const raw = await response.text();
  let data = null;
  if (raw) {
    try { data = JSON.parse(raw); } catch { data = raw; }
  }
  if (!response.ok) {
    throw new Error(errorText(data?.detail ?? data?.message ?? data) || `Request failed (${response.status})`);
  }
  return data;
}

function normaliseLetterUrl(rawUrl) {
  const raw = String(rawUrl || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw, API_BASE_URL);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.href;
  } catch {
    return "";
  }
}

function dateLabel(value) {
  if (!value) return "Not specified";
  const parsed = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short", year: "numeric" }).format(parsed);
}

function moneyLabel(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value ? String(value) : "Not specified";
  return `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(amount)} LPA`;
}

function statusLabel(status) {
  return String(status || "UNKNOWN").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function StatusPill({ status }) {
  const key = String(status || "UNKNOWN").toUpperCase();
  return <span className={`so-status so-status-${key.toLowerCase()}`}>{statusLabel(key)}</span>;
}

export default function StudentOffers() {
  const [offers, setOffers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadOffers = useCallback(async ({ quiet = false } = {}) => {
    if (!getToken()) {
      setOffers([]);
      setLoading(false);
      setError("Your session is missing. Sign in again to view your offers.");
      return;
    }
    if (quiet) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      const data = await api("/offers/my");
      const rows = Array.isArray(data) ? data : Array.isArray(data?.offers) ? data.offers : [];
      setOffers(rows);
      setSelectedId((current) => rows.some((offer) => String(offer.id) === String(current)) ? current : (rows[0]?.id ?? null));
    } catch (err) {
      setError(errorText(err?.message) || "Unable to load your offers. Please refresh and try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadOffers(); }, [loadOffers]);

  const counts = useMemo(() => ({
    total: offers.length,
    action: offers.filter((offer) => String(offer.status).toUpperCase() === "ISSUED").length,
    accepted: offers.filter((offer) => String(offer.status).toUpperCase() === "ACCEPTED").length,
    closed: offers.filter((offer) => ["REJECTED", "EXPIRED"].includes(String(offer.status).toUpperCase())).length,
  }), [offers]);

  const filteredOffers = useMemo(() => {
    const search = query.trim().toLowerCase();
    return offers.filter((offer) => {
      const status = String(offer.status || "UNKNOWN").toUpperCase();
      const matchFilter = filter === "ALL" || (filter === "ACTION" ? status === "ISSUED" : status === filter);
      const text = [offer.id, offer.application_id, offer.salary_package, offer.status, offer.joining_date].join(" ").toLowerCase();
      return matchFilter && (!search || text.includes(search));
    });
  }, [offers, query, filter]);

  const selectedOffer = offers.find((offer) => String(offer.id) === String(selectedId)) || filteredOffers[0] || null;
  const selectedStatus = String(selectedOffer?.status || "").toUpperCase();
  const letterUrl = normaliseLetterUrl(selectedOffer?.offer_letter_url);

  async function respondToOffer(status) {
    if (!selectedOffer || savingId !== null) return;
    const action = status === "ACCEPTED" ? "accept" : "decline";
    const confirmed = window.confirm(`Are you sure you want to ${action} offer #${selectedOffer.id}?`);
    if (!confirmed) return;

    setSavingId(selectedOffer.id);
    setMessage("");
    setError("");
    try {
      await api(`/offers/${selectedOffer.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setMessage(status === "ACCEPTED" ? "Offer accepted successfully." : "Offer declined successfully.");
      await loadOffers({ quiet: true });
    } catch (err) {
      setError(errorText(err?.message) || "Your response could not be saved. Please try again.");
    } finally {
      setSavingId(null);
    }
  }

  async function downloadLetter(offer) {
    const url = normaliseLetterUrl(offer?.offer_letter_url);
    if (!url) {
      setError("This offer does not have a valid offer-letter link yet. Contact the recruiter or placement office.");
      return;
    }

    // Open a tab synchronously so browser popup blockers do not suppress the fallback.
    const fallbackTab = window.open("about:blank", "_blank");
    if (fallbackTab) {
      try { fallbackTab.opener = null; } catch { /* no-op */ }
    }

    try {
      const parsedUrl = new URL(url);
      const isCampusLinkApi = parsedUrl.origin === new URL(API_BASE_URL).origin;
      const response = await fetch(url, {
        headers: isCampusLinkApi && getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
      });
      if (!response.ok) throw new Error(`The file server returned ${response.status}.`);
      const blob = await response.blob();
      const type = String(response.headers.get("content-type") || blob.type || "").toLowerCase();
      if (type.includes("text/html") || type.includes("application/json")) {
        if (fallbackTab) fallbackTab.location.href = url;
        setError("This link opens a webpage, not a downloadable offer document. Ask the recruiter to provide a direct PDF or document link.");
        return;
      }
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const extension = type.includes("pdf") || /\.pdf([?#]|$)/i.test(url) ? "pdf" : type.includes("word") ? "docx" : "file";
      anchor.href = objectUrl;
      anchor.download = `CampusLink_Offer_${offer.id}.${extension}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
      if (fallbackTab) fallbackTab.close();
      setMessage("Offer letter download started.");
      setError("");
    } catch (err) {
      // Cross-origin file hosts often block fetch via CORS. Keep the URL usable in a normal tab.
      if (fallbackTab) fallbackTab.location.href = url;
      setError("The file host blocked direct download. The link has been opened in a new tab; use its download control if available. For reliable downloading, the recruiter must provide a direct PDF/document URL.");
    }
  }

  return (
    <div className="student-offers-page">
      <style>{STUDENT_OFFERS_CSS}</style>
      <div className="so-page-header">
        <div>
          <div className="so-eyebrow">STUDENT WORKSPACE / PLACEMENT</div>
          <h1>My Offers</h1>
          <p>Review your placement offer details, open the offer letter, and submit your response.</p>
        </div>
        <button className="so-refresh" type="button" onClick={() => loadOffers({ quiet: true })} disabled={loading || refreshing}>
          <span aria-hidden="true">↻</span> {refreshing ? "Refreshing…" : "Refresh offers"}
        </button>
      </div>

      {error && <div className="so-alert so-alert-error" role="alert"><span className="so-alert-mark">!</span><span>{error}</span><button type="button" onClick={() => setError("")} aria-label="Dismiss error">×</button></div>}
      {message && <div className="so-alert so-alert-success" role="status"><span className="so-alert-mark">✓</span><span>{message}</span><button type="button" onClick={() => setMessage("")} aria-label="Dismiss message">×</button></div>}

      <div className="so-metrics">
        <Metric label="Total offers" value={counts.total} detail="All placement offers" />
        <Metric label="Awaiting response" value={counts.action} detail="Issued offers" />
        <Metric label="Accepted" value={counts.accepted} detail="Confirmed offers" />
        <Metric label="Closed" value={counts.closed} detail="Declined or expired" />
      </div>

      <div className="so-workspace">
        <section className="so-list-panel" aria-label="Offer list">
          <div className="so-list-toolbar">
            <div>
              <h2>Offer history</h2>
              <p>{filteredOffers.length} {filteredOffers.length === 1 ? "record" : "records"}</p>
            </div>
            <label className="so-search">
              <span aria-hidden="true">⌕</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search offers" aria-label="Search offers" />
            </label>
          </div>
          <div className="so-filters" role="group" aria-label="Filter offers">
            {[{ value: "ALL", label: "All offers" }, { value: "ACTION", label: "Needs response" }, { value: "ACCEPTED", label: "Accepted" }, { value: "REJECTED", label: "Declined" }, { value: "EXPIRED", label: "Expired" }].map((item) => (
              <button key={item.value} type="button" className={filter === item.value ? "so-filter is-active" : "so-filter"} onClick={() => setFilter(item.value)}>{item.label}</button>
            ))}
          </div>

          {loading ? (
            <div className="so-empty-state"><span className="so-spinner" /><strong>Loading your offers</strong><p>Getting the latest offer records from CampusLink.</p></div>
          ) : filteredOffers.length === 0 ? (
            <div className="so-empty-state"><div className="so-empty-icon">▤</div><strong>{offers.length ? "No offers match this view" : "No offers available yet"}</strong><p>{offers.length ? "Try another filter or search term." : "When a recruiter issues an offer for one of your applications, it will appear here."}</p>{offers.length > 0 && <button type="button" className="so-text-button" onClick={() => { setFilter("ALL"); setQuery(""); }}>Clear filters</button>}</div>
          ) : (
            <div className="so-offer-list">
              {filteredOffers.map((offer) => {
                const active = String(selectedOffer?.id) === String(offer.id);
                return (
                  <button type="button" className={active ? "so-offer-row is-selected" : "so-offer-row"} key={offer.id} onClick={() => setSelectedId(offer.id)}>
                    <div className="so-row-top"><span className="so-offer-number">OFFER #{offer.id}</span><StatusPill status={offer.status} /></div>
                    <div className="so-row-main"><strong>{moneyLabel(offer.salary_package)}</strong><span>Application #{offer.application_id}</span></div>
                    <div className="so-row-bottom"><span>Joining date</span><span>{dateLabel(offer.joining_date)}</span></div>
                    <span className="so-row-arrow" aria-hidden="true">↗</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="so-detail-panel" aria-label="Selected offer details">
          {!selectedOffer ? (
            <div className="so-detail-empty"><div className="so-detail-empty-mark">CL</div><h2>Select an offer</h2><p>Choose an offer from the list to view its details and letter actions.</p></div>
          ) : (
            <>
              <div className="so-detail-heading">
                <div><div className="so-eyebrow">OFFER DETAILS</div><h2>Offer #{selectedOffer.id}</h2><p>Application reference #{selectedOffer.application_id}</p></div>
                <StatusPill status={selectedOffer.status} />
              </div>
              <div className="so-salary-block"><span>Annual salary package</span><strong>{moneyLabel(selectedOffer.salary_package)}</strong><small>As recorded in your placement offer</small></div>
              <div className="so-detail-grid">
                <Detail label="Offer reference" value={`#${selectedOffer.id}`} />
                <Detail label="Application reference" value={`#${selectedOffer.application_id}`} />
                <Detail label="Joining date" value={dateLabel(selectedOffer.joining_date)} />
                <Detail label="Current status" value={statusLabel(selectedOffer.status)} />
              </div>

              <div className="so-letter-section">
                <div className="so-section-title"><div><h3>Offer letter</h3><p>Open or download the document supplied by the recruiter.</p></div><div className="so-file-icon">PDF</div></div>
                {letterUrl ? (
                  <div className="so-letter-card">
                    <div className="so-letter-file"><div className="so-file-symbol">▤</div><div className="so-file-copy"><strong>Offer letter · #{selectedOffer.id}</strong><span className="so-truncate-url" title={letterUrl}>{letterUrl}</span></div></div>
                    <div className="so-letter-actions">
                      <a className="so-button so-button-secondary" href={letterUrl} target="_blank" rel="noopener noreferrer">Open letter <span aria-hidden="true">↗</span></a>
                      <button className="so-button so-button-primary" type="button" onClick={() => downloadLetter(selectedOffer)}>Download letter <span aria-hidden="true">↓</span></button>
                    </div>
                    <p className="so-file-note">Downloads work when the URL points to an actual document file. Webpage links open in a tab instead.</p>
                  </div>
                ) : (
                  <div className="so-letter-missing"><strong>No offer letter attached</strong><p>The recruiter has not supplied an offer-letter URL for this record. Contact the recruiter or placement office.</p></div>
                )}
              </div>

              {selectedStatus === "ISSUED" ? (
                <div className="so-response-box"><div><h3>Your response</h3><p>Review the offer details before confirming your decision.</p></div><div className="so-response-actions"><button className="so-button so-button-danger" type="button" disabled={savingId !== null} onClick={() => respondToOffer("REJECTED")}>{savingId === selectedOffer.id ? "Saving…" : "Decline offer"}</button><button className="so-button so-button-primary" type="button" disabled={savingId !== null} onClick={() => respondToOffer("ACCEPTED")}>{savingId === selectedOffer.id ? "Saving…" : "Accept offer"}</button></div></div>
              ) : selectedStatus === "ACCEPTED" ? (
                <div className="so-outcome so-outcome-success"><strong>Offer accepted</strong><span>Your acceptance has been recorded.</span></div>
              ) : selectedStatus === "REJECTED" ? (
                <div className="so-outcome"><strong>Offer declined</strong><span>Your decision has been recorded.</span></div>
              ) : selectedStatus === "EXPIRED" ? (
                <div className="so-outcome"><strong>Offer expired</strong><span>This offer is no longer available for a response.</span></div>
              ) : (
                <div className="so-outcome"><strong>Awaiting issuance</strong><span>You can respond once the recruiter changes this offer to Issued.</span></div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value, detail }) {
  return <div className="so-metric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

function Detail({ label, value }) {
  return <div className="so-detail-item"><span>{label}</span><strong>{value || "Not specified"}</strong></div>;
}

const STUDENT_OFFERS_CSS = `
.student-offers-page{--so-ink:#111827;--so-muted:#64748b;--so-line:#e2e8f0;--so-soft:#f8fafc;--so-blue:#1d4ed8;--so-blue-soft:#eff6ff;min-height:100%;padding:28px clamp(16px,2.5vw,34px) 40px;color:var(--so-ink);background:#f5f7fb;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.student-offers-page *{box-sizing:border-box}.so-page-header{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;margin-bottom:22px}.so-eyebrow{font-size:11px;font-weight:800;letter-spacing:1.1px;color:#2563eb;text-transform:uppercase}.so-page-header h1{font-size:clamp(28px,3vw,36px);letter-spacing:-1.2px;line-height:1.1;margin:7px 0 8px;font-weight:800;color:#111827}.so-page-header p{margin:0;color:#64748b;font-size:14px;line-height:1.6;max-width:760px}.so-refresh{white-space:nowrap;border:1px solid #d7e0ec;border-radius:10px;background:#fff;color:#1e293b;font-weight:700;font-size:13px;padding:11px 15px;cursor:pointer;box-shadow:0 1px 2px rgba(15,23,42,.03)}.so-refresh:hover:not(:disabled){border-color:#93b4ec;background:#f9fbff}.so-refresh:disabled{opacity:.6;cursor:wait}.so-refresh span{font-size:17px;margin-right:5px;color:#2563eb}
.so-alert{display:flex;gap:10px;align-items:flex-start;border:1px solid;border-radius:10px;padding:12px 14px;margin:0 0 14px;font-size:13px;line-height:1.55}.so-alert-error{color:#991b1b;background:#fff7f7;border-color:#fecaca}.so-alert-success{color:#166534;background:#f0fdf4;border-color:#bbf7d0}.so-alert-mark{flex:none;display:grid;place-items:center;width:20px;height:20px;border-radius:50%;font-size:12px;font-weight:900;background:rgba(255,255,255,.75)}.so-alert button{margin-left:auto;border:0;background:transparent;color:inherit;font-size:19px;cursor:pointer;line-height:1}
.so-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px;margin-bottom:18px}.so-metric{background:#fff;border:1px solid #e5eaf2;border-radius:13px;padding:17px 18px;min-width:0;box-shadow:0 4px 14px rgba(15,23,42,.025)}.so-metric span{display:block;color:#64748b;font-size:12px;font-weight:650}.so-metric strong{display:block;margin:8px 0 4px;font-size:29px;letter-spacing:-.8px;line-height:1;color:#0f172a;font-weight:800}.so-metric small{font-size:11px;color:#94a3b8}
.so-workspace{display:grid;grid-template-columns:minmax(310px,.86fr) minmax(0,1.4fr);gap:16px;align-items:start}.so-list-panel,.so-detail-panel{background:#fff;border:1px solid #e2e8f0;border-radius:15px;min-width:0;box-shadow:0 8px 28px rgba(15,23,42,.035);overflow:hidden}.so-list-toolbar{padding:20px 20px 15px;display:flex;justify-content:space-between;align-items:flex-start;gap:14px;border-bottom:1px solid #edf1f6}.so-list-toolbar h2{font-size:15px;margin:0 0 5px;font-weight:800;letter-spacing:-.2px}.so-list-toolbar p{margin:0;color:#94a3b8;font-size:12px}.so-search{display:flex;align-items:center;gap:7px;border:1px solid #e2e8f0;border-radius:9px;background:#fff;padding:8px 10px;min-width:130px;width:44%;color:#94a3b8}.so-search span{font-size:18px}.so-search input{border:0;outline:none;background:transparent;min-width:0;width:100%;font:inherit;font-size:12px;color:#0f172a}.so-filters{display:flex;gap:6px;overflow-x:auto;padding:13px 18px;border-bottom:1px solid #edf1f6}.so-filter{border:1px solid transparent;border-radius:7px;padding:7px 9px;background:transparent;color:#64748b;white-space:nowrap;font-size:11px;font-weight:700;cursor:pointer}.so-filter:hover{background:#f8fafc}.so-filter.is-active{background:#eff6ff;border-color:#dbeafe;color:#1d4ed8}
.so-offer-list{display:grid;gap:0}.so-offer-row{position:relative;text-align:left;width:100%;border:0;border-bottom:1px solid #edf1f6;background:#fff;padding:16px 18px;cursor:pointer;color:inherit;transition:background .15s,border-color .15s}.so-offer-row:last-child{border-bottom:0}.so-offer-row:hover{background:#f8fbff}.so-offer-row.is-selected{background:#f3f7ff;box-shadow:inset 3px 0 #2563eb}.so-row-top,.so-row-main,.so-row-bottom{display:flex;align-items:center;justify-content:space-between;gap:12px}.so-offer-number{font-size:10px;letter-spacing:.8px;font-weight:800;color:#64748b}.so-row-main{justify-content:flex-start;align-items:baseline;gap:10px;margin:12px 0 14px;padding-right:18px}.so-row-main strong{font-size:18px;letter-spacing:-.5px;color:#0f172a}.so-row-main>span{font-size:11px;color:#64748b}.so-row-bottom{font-size:11px;color:#94a3b8}.so-row-bottom span:last-child{color:#475569;font-weight:650}.so-row-arrow{position:absolute;right:17px;top:50%;margin-top:10px;transform:translateY(-50%);font-size:16px;color:#94a3b8}.so-status{display:inline-flex;align-items:center;white-space:nowrap;border-radius:6px;padding:5px 8px;font-size:10px;font-weight:800;letter-spacing:.15px;border:1px solid transparent}.so-status-issued{color:#1d4ed8;background:#eff6ff;border-color:#dbeafe}.so-status-accepted{color:#166534;background:#f0fdf4;border-color:#bbf7d0}.so-status-rejected{color:#991b1b;background:#fef2f2;border-color:#fecaca}.so-status-expired{color:#475569;background:#f1f5f9;border-color:#e2e8f0}.so-status-draft{color:#92400e;background:#fffbeb;border-color:#fde68a}.so-status-unknown{color:#475569;background:#f1f5f9;border-color:#e2e8f0}
.so-empty-state{min-height:260px;padding:34px 24px;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center}.so-spinner{width:26px;height:26px;border:2px solid #dbeafe;border-top-color:#2563eb;border-radius:50%;animation:so-spin .8s linear infinite;margin-bottom:14px}.so-empty-icon{width:42px;height:42px;border:1px solid #dbeafe;background:#f8fbff;border-radius:10px;display:grid;place-items:center;color:#2563eb;font-size:20px;margin-bottom:13px}.so-empty-state strong{font-size:14px;color:#1e293b}.so-empty-state p{font-size:12px;line-height:1.6;color:#94a3b8;max-width:275px;margin:8px 0 0}.so-text-button{margin-top:15px;border:0;background:transparent;color:#1d4ed8;font-size:12px;font-weight:800;cursor:pointer}
.so-detail-panel{padding:0 22px 22px}.so-detail-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:22px 0 18px;border-bottom:1px solid #edf1f6}.so-detail-heading h2{font-size:21px;letter-spacing:-.6px;margin:6px 0 5px}.so-detail-heading p{font-size:12px;color:#64748b;margin:0}.so-salary-block{margin:18px 0;padding:17px 18px;border:1px solid #dbeafe;border-radius:11px;background:linear-gradient(105deg,#f8fbff,#f1f6ff);display:flex;flex-direction:column;align-items:flex-start}.so-salary-block span{font-size:11px;color:#64748b;font-weight:700}.so-salary-block strong{margin:6px 0 3px;font-size:29px;letter-spacing:-1px;color:#1e40af;font-weight:850}.so-salary-block small{font-size:11px;color:#94a3b8}.so-detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 18px;border-bottom:1px solid #edf1f6;padding-bottom:18px}.so-detail-item{min-width:0;display:flex;flex-direction:column;gap:7px;padding:12px 0}.so-detail-item span{font-size:11px;color:#94a3b8}.so-detail-item strong{font-size:12px;color:#334155;overflow-wrap:anywhere}.so-letter-section{padding:19px 0 20px;border-bottom:1px solid #edf1f6}.so-section-title{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:13px}.so-section-title h3,.so-response-box h3{font-size:14px;font-weight:800;margin:0 0 5px}.so-section-title p,.so-response-box p{margin:0;color:#94a3b8;font-size:11px;line-height:1.55}.so-file-icon{display:grid;place-items:center;width:35px;height:39px;border:1px solid #dbeafe;border-radius:7px;color:#1d4ed8;background:#f8fbff;font-size:9px;font-weight:900}.so-letter-card{padding:14px;border:1px solid #e2e8f0;border-radius:11px;background:#fbfcfe}.so-letter-file{display:flex;align-items:center;gap:11px;min-width:0}.so-file-symbol{width:40px;height:44px;flex:none;border:1px solid #dbeafe;border-radius:8px;background:#eff6ff;display:grid;place-items:center;color:#1d4ed8;font-size:20px}.so-file-copy{display:flex;min-width:0;flex:1;flex-direction:column;gap:5px}.so-file-copy strong{font-size:12px;color:#1e293b}.so-truncate-url{display:block;font-size:10px;color:#94a3b8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}.so-letter-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.so-button{display:inline-flex;gap:8px;align-items:center;justify-content:center;border:1px solid #dbe3ed;border-radius:8px;padding:10px 12px;min-height:38px;font-size:11px;font-weight:800;text-decoration:none;cursor:pointer;transition:background .15s,transform .15s}.so-button:hover:not(:disabled){transform:translateY(-1px)}.so-button-primary{background:#1d4ed8;border-color:#1d4ed8;color:white;box-shadow:0 3px 8px rgba(29,78,216,.12)}.so-button-primary:hover:not(:disabled){background:#1e40af}.so-button-secondary{background:white;color:#1e293b}.so-button-secondary:hover{background:#f8fafc}.so-button-danger{background:white;color:#b91c1c;border-color:#fecaca}.so-button-danger:hover{background:#fff7f7}.so-button:disabled{opacity:.55;cursor:not-allowed}.so-file-note{font-size:10px;line-height:1.5;color:#94a3b8;margin:11px 0 0}.so-letter-missing{border:1px dashed #cbd5e1;border-radius:10px;background:#fafbfc;padding:15px}.so-letter-missing strong{font-size:12px}.so-letter-missing p{font-size:11px;line-height:1.55;color:#64748b;margin:6px 0 0}.so-response-box{padding-top:18px;display:flex;flex-direction:column;gap:13px}.so-response-actions{display:flex;gap:9px;flex-wrap:wrap}.so-outcome{margin-top:18px;border:1px solid #e2e8f0;background:#f8fafc;border-radius:10px;padding:14px;display:flex;flex-direction:column;gap:5px}.so-outcome strong{font-size:12px;color:#334155}.so-outcome span{font-size:11px;color:#64748b}.so-outcome-success{background:#f0fdf4;border-color:#bbf7d0}.so-outcome-success strong{color:#166534}.so-detail-empty{min-height:420px;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;padding:28px}.so-detail-empty-mark{width:48px;height:48px;display:grid;place-items:center;background:#eff6ff;border-radius:12px;color:#1d4ed8;font-size:13px;font-weight:900;margin-bottom:15px}.so-detail-empty h2{font-size:17px;margin:0 0 7px}.so-detail-empty p{max-width:260px;color:#94a3b8;font-size:12px;line-height:1.6;margin:0}
@keyframes so-spin{to{transform:rotate(360deg)}}
@media(max-width:1050px){.so-workspace{grid-template-columns:minmax(280px,.9fr) minmax(0,1.1fr)}.so-list-toolbar{flex-wrap:wrap}.so-search{width:100%}}
@media(max-width:760px){.student-offers-page{padding:18px 12px 28px}.so-page-header{flex-direction:column;gap:14px}.so-metrics{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.so-metric{padding:13px}.so-metric strong{font-size:25px}.so-workspace{grid-template-columns:1fr}.so-list-toolbar{align-items:center}.so-detail-panel{padding:0 16px 18px}.so-detail-heading{padding-top:18px}.so-detail-grid{gap:0 12px}.so-letter-actions .so-button{flex:1}.so-filters{padding:10px 12px}.so-offer-row{padding:15px 14px}}
@media(prefers-reduced-motion:reduce){.student-offers-page *{animation-duration:.01ms!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}
`;
