import { useCallback, useEffect, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const DOC_TYPES = [
  ["RESUME", "Resume / CV"],
  ["MARKSHEET", "Marksheets / transcript"],
  ["CERTIFICATE", "Certificate"],
  ["ID_PROOF", "Identity proof"],
  ["OFFER_LETTER", "Offer letter"],
  ["OTHER", "Other document"],
];
function token() { return localStorage.getItem("campuslink_token") || ""; }
function errorText(data, fallback) {
  const detail = data?.detail ?? data?.message;
  if (Array.isArray(detail)) return detail.map((x) => { const loc = Array.isArray(x?.loc) ? x.loc.filter((part) => part !== "body" && part !== "query").join(".") : ""; return `${loc ? `${loc}: ` : ""}${x?.msg || String(x)}`; }).join(" · ");
  return typeof detail === "string" ? detail : fallback;
}
async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token()}`,
      ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json().catch(() => ({})) : null;
  if (!response.ok) throw new Error(errorText(data, `Request failed (${response.status})`));
  return { response, data };
}
function normaliseRows(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.documents)) return data.documents;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}
function docName(item) { return item?.title || item?.original_filename || item?.filename || item?.file_name || item?.name || `Document #${item?.id ?? ""}`; }
function getDocumentType(item) { return String(item?.document_type || item?.type || item?.category || "DOCUMENT").replaceAll("_", " "); }
function fmtDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function StudentDocuments({ embedded = false }) {
  const [docs, setDocs] = useState([]);
  const [docType, setDocType] = useState("RESUME");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError("");
    let last = null;
    for (const path of ["/student-documents/my", "/documents/my"]) {
      try {
        const { data } = await request(path);
        setDocs(normaliseRows(data));
        setLoading(false);
        return;
      } catch (err) { last = err; }
    }
    setDocs([]);
    setError(last?.message || "Documents could not be loaded. Check that the student documents router is enabled in the backend.");
    setLoading(false);
  }, []);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  async function uploadDocument(event) {
    event.preventDefault();
    if (!file) { setError("Choose a file to upload first."); return; }
    if (file.size > 15 * 1024 * 1024) { setError("The selected document must be smaller than 15 MB."); return; }
    const lower = file.name.toLowerCase();
    const allowed = [".pdf", ".png", ".jpg", ".jpeg", ".webp"];
    if (!allowed.some((ext) => lower.endsWith(ext))) { setError("Upload a PDF or an image (JPG, PNG, WEBP)."); return; }
    setUploading(true); setError(""); setMessage("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("document_type", docType);
      fd.append("doc_type", docType);
      fd.append("category", docType);
      fd.append("title", title.trim() || file.name);
      fd.append("name", title.trim() || file.name);
      // The backend derives document ownership from the authenticated token.
      // Never accept an owner/student ID from user-controlled form fields.
      await request("/student-documents/upload", { method: "POST", body: fd });
      setMessage("Document uploaded to your CampusLink document vault.");
      setFile(null); setTitle("");
      const fileInput = document.getElementById("sd-upload-file");
      if (fileInput) fileInput.value = "";
      await loadDocuments();
    } catch (err) {
      setError(`${err.message || "Document upload failed."} If the server says a field is missing, check the student-documents upload schema in the backend.`);
    } finally { setUploading(false); }
  }

  async function downloadDocument(item) {
    const id = item?.id ?? item?.document_id;
    const direct = item?.download_url || item?.file_url || item?.document_url || item?.url;
    if (direct && /^https?:\/\//i.test(direct)) { window.open(direct, "_blank", "noopener,noreferrer"); return; }
    if (id == null) { setError("This document does not include a download ID or URL."); return; }
    setDownloading(id); setError("");
    let last = null;
    for (const path of [`/student-documents/${id}/download`, `/documents/${id}/download`]) {
      try {
        const { response } = await request(path);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url; anchor.download = docName(item); document.body.appendChild(anchor); anchor.click(); anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1500);
        setDownloading(null);
        return;
      } catch (err) { last = err; }
    }
    setDownloading(null);
    setError(last?.message || "The document download endpoint is unavailable.");
  }

  return (
    <div className={`sd-page ${embedded ? "sd-embedded" : ""}`}>
      {!embedded && <header className="sd-heading"><div><span className="sd-eyebrow">STUDENT WORKSPACE / DOCUMENTS</span><h1>Document vault</h1><p>Upload, organise and retrieve your placement documents in one place.</p></div><button className="sd-btn sd-secondary" type="button" onClick={loadDocuments} disabled={loading}>{loading ? "Refreshing…" : "↻ Refresh"}</button></header>}
      <div className="sd-shell">
        <section className="sd-card sd-upload-card">
          <div className="sd-card-head"><div><span className="sd-eyebrow">UPLOAD DOCUMENT</span><h2>Add a file to your vault</h2><p>Use this for resumes, marksheets, certificates and other supporting documents.</p></div><div className="sd-upload-icon">↑</div></div>
          <form className="sd-form" onSubmit={uploadDocument}>
            <label className="sd-field"><span>Document category</span><select value={docType} onChange={(e) => setDocType(e.target.value)}>{DOC_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="sd-field"><span>Display name <small>(optional)</small></span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. B.Tech semester 6 marksheet" /></label>
            <label className="sd-file-drop" htmlFor="sd-upload-file"><input id="sd-upload-file" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} /><span className="sd-file-mark">PDF</span><span><strong>{file?.name || "Choose a PDF or image"}</strong><small>{file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB selected` : "Click to browse · Maximum 15 MB"}</small></span><b>Browse</b></label>
            <button className="sd-btn sd-primary" type="submit" disabled={uploading || !file}>{uploading ? "Uploading document…" : "Upload document →"}</button>
          </form>
          {error && <div className="sd-notice error" role="alert">{error}</div>}
          {message && <div className="sd-notice success" role="status">{message}</div>}
        </section>
        <section className="sd-card sd-list-card">
          <div className="sd-card-head"><div><span className="sd-eyebrow">SAVED FILES</span><h2>Document library <small>{docs.length}</small></h2><p>Files connected to your account.</p></div><button type="button" className="sd-btn sd-secondary" onClick={loadDocuments} disabled={loading}>{loading ? "Loading…" : "Refresh list"}</button></div>
          {loading ? <div className="sd-state">Loading your documents…</div> : docs.length === 0 ? <div className="sd-empty"><span>▤</span><strong>No uploaded documents yet</strong><p>Upload your first resume or supporting file above. Your saved files will appear here.</p></div> : <div className="sd-doc-list">{docs.map((item, index) => { const id = item?.id ?? item?.document_id ?? index; return <article className="sd-doc-row" key={id}><div className="sd-doc-icon">{String(docName(item)).toLowerCase().endsWith(".pdf") ? "PDF" : "FILE"}</div><div className="sd-doc-info"><strong>{docName(item)}</strong><span>{getDocumentType(item)} · {fmtDate(item?.created_at || item?.uploaded_at || item?.created)}</span></div><button type="button" className="sd-btn sd-secondary" onClick={() => downloadDocument(item)} disabled={downloading === id}>{downloading === id ? "Opening…" : "Download ↘"}</button></article>; })}</div>}
        </section>
      </div>
      <style>{DOCS_CSS}</style>
    </div>
  );
}

const DOCS_CSS = `
.sd-page{font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#14213a;background:#f4f7fc;min-height:100vh;padding:28px clamp(14px,3vw,36px) 42px;box-sizing:border-box}.sd-page *{box-sizing:border-box}.sd-heading{max-width:1250px;margin:0 auto 22px;display:flex;justify-content:space-between;align-items:flex-end;gap:16px}.sd-heading h1{font-size:34px;letter-spacing:-.05em;margin:7px 0}.sd-heading p,.sd-card-head p{font-size:12px;color:#687790;line-height:1.6;margin:0}.sd-eyebrow{display:block;font-size:9px;font-weight:900;letter-spacing:.14em;color:#526bea}.sd-shell{max-width:1250px;margin:0 auto;display:grid;grid-template-columns:minmax(290px,.8fr) minmax(0,1.2fr);gap:17px;align-items:start}.sd-card{min-width:0;background:#fff;border:1px solid #e0e7f1;border-radius:19px;padding:22px;box-shadow:0 8px 24px rgba(20,37,73,.035)}.sd-card-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:19px}.sd-card-head h2{font-size:19px;letter-spacing:-.035em;margin:6px 0}.sd-card-head h2 small{font-size:11px;color:#66758e;background:#eef2fa;padding:4px 7px;border-radius:999px}.sd-upload-icon{width:43px;height:43px;border-radius:13px;background:#edf2ff;color:#315cf4;display:grid;place-items:center;font-size:23px;font-weight:800}.sd-form{display:grid;gap:14px}.sd-field{display:grid;gap:7px;font-size:11px;font-weight:850;color:#33425c}.sd-field small{color:#8090a5;font-weight:500}.sd-field input,.sd-field select{width:100%;border:1px solid #d9e1ee;border-radius:11px;background:#fbfcff;color:#15213a;padding:12px;font:500 12px Inter,system-ui,sans-serif;outline:none}.sd-field input::placeholder{color:#76859a;opacity:1}.sd-field input:focus,.sd-field select:focus{border-color:#5376fa;box-shadow:0 0 0 4px rgba(83,118,250,.12)}.sd-file-drop{display:flex;align-items:center;gap:11px;padding:13px;border:1px dashed #c9d5eb;border-radius:13px;background:#f8faff;cursor:pointer;min-width:0}.sd-file-drop input{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}.sd-file-mark{width:42px;height:45px;border-radius:10px;background:#e6edff;color:#315cf4;display:grid;place-items:center;font-size:10px;font-weight:950}.sd-file-drop>span:nth-of-type(2){display:grid;gap:4px;min-width:0;flex:1}.sd-file-drop strong{font-size:11px;overflow-wrap:anywhere}.sd-file-drop small{font-size:9px;color:#7a889d}.sd-file-drop>b{font-size:10px;color:#315cf4}.sd-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px solid transparent;border-radius:10px;padding:10px 13px;font:800 11px Inter,system-ui,sans-serif;cursor:pointer;transition:transform .16s}.sd-btn:hover{transform:translateY(-1px)}.sd-btn:disabled{opacity:.6;cursor:wait;transform:none}.sd-primary{background:linear-gradient(100deg,#315cf4,#7354f0);color:#fff;box-shadow:0 8px 18px rgba(49,92,244,.16)}.sd-secondary{background:#fff;border-color:#dce4ef;color:#273650}.sd-notice{border-radius:10px;padding:11px 12px;margin-top:12px;font-size:11px;line-height:1.55}.sd-notice.error{color:#9f2440;background:#fff1f2;border:1px solid #fecdd3}.sd-notice.success{color:#047857;background:#ecfdf5;border:1px solid #a7f3d0}.sd-state,.sd-empty{padding:32px 15px;text-align:center;color:#75839a;font-size:11px}.sd-empty>span{display:grid;place-items:center;margin:0 auto 10px;width:42px;height:42px;border-radius:12px;background:#eff3fc;color:#7184b7;font-size:21px}.sd-empty strong{display:block;color:#273650;font-size:12px}.sd-empty p{max-width:300px;margin:7px auto 0;line-height:1.6}.sd-doc-list{display:grid;gap:9px}.sd-doc-row{display:flex;align-items:center;gap:11px;border:1px solid #e6ebf4;border-radius:13px;padding:11px;min-width:0}.sd-doc-icon{width:41px;height:44px;flex-shrink:0;border-radius:10px;background:#edf2ff;color:#315cf4;display:grid;place-items:center;font-size:8px;font-weight:950}.sd-doc-info{display:grid;gap:5px;min-width:0;flex:1}.sd-doc-info strong{font-size:11px;overflow-wrap:anywhere}.sd-doc-info span{font-size:9px;color:#7a879c}.sd-embedded{padding:0;background:transparent;min-height:0}.sd-embedded .sd-shell{grid-template-columns:minmax(260px,.82fr) minmax(0,1.18fr)}.sd-embedded .sd-card{box-shadow:none;padding:4px;border:0;border-radius:0}.sd-embedded .sd-card-head{margin-bottom:14px}.sd-embedded .sd-card-head h2{font-size:16px}.sd-embedded .sd-file-drop{padding:10px}.sd-embedded .sd-doc-row{padding:9px}.sd-embedded .sd-list-card .sd-card-head .sd-btn{font-size:10px}@media(max-width:850px){.sd-shell,.sd-embedded .sd-shell{grid-template-columns:1fr}.sd-heading{align-items:flex-start;flex-direction:column}}@media(max-width:560px){.sd-page{padding:16px 10px}.sd-card{padding:16px}.sd-doc-row{align-items:flex-start;flex-wrap:wrap}.sd-doc-info{min-width:calc(100% - 60px)}.sd-doc-row .sd-btn{margin-left:52px}}
`;
