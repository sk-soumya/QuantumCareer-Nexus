import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

function getToken() {
  return localStorage.getItem("campuslink_token") || "";
}

export default function PlacementStudentDetail() {
  const navigate = useNavigate();
  const { studentId } = useParams();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadStudent() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/placement-officer/students/${studentId}`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            `Unable to load student (${response.status})`
        );
      }

      setStudent(data.student || null);
    } catch (err) {
      setError(
        err.message ||
          "Unable to load student profile."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStudent();
  }, [studentId]);

  const skills = useMemo(
    () => student?.skill_list || [],
    [student]
  );

  const resumeText = String(
    student?.resume_text || ""
  );

  if (loading) {
    return (
      <div className="psd-loading">
        <div className="psd-spinner" />
        <strong>Loading student intelligence…</strong>
        <span>Fetching verified CampusLink profile data.</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="psd-page">
        <div className="psd-error-card">
          <div>!</div>
          <h2>Unable to load student</h2>
          <p>{error}</p>

          <button
            type="button"
            onClick={() =>
              navigate("/placement/students")
            }
          >
            ← Back to Students
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="psd-page">
      <style>{CSS}</style>

      <header className="psd-topbar">
        <div>
          <span>PLACEMENT INTELLIGENCE</span>
          <h1>Student Profile</h1>
          <p>
            Complete recruiter-facing view of the selected student.
          </p>
        </div>

        <button
          type="button"
          className="psd-back"
          onClick={() =>
            navigate("/placement/students")
          }
        >
          ← Student Directory
        </button>
      </header>

      <main className="psd-container">

        <section className="psd-hero">
          <div className="psd-avatar">
            {(student?.name || "S")
              .split(/\s+/)
              .slice(0, 2)
              .map((x) => x[0])
              .join("")
              .toUpperCase()}
          </div>

          <div>
            <span>STUDENT #{student?.id}</span>
            <h2>{student?.name}</h2>
            <p>{student?.email || "No email available"}</p>

            <div className="psd-status-row">
              <b className="green">
                {student?.is_active
                  ? "ACTIVE ACCOUNT"
                  : "INACTIVE ACCOUNT"}
              </b>

              <b className="blue">
                PLACEMENT PROFILE
              </b>
            </div>
          </div>
        </section>

        <section className="psd-kpis">
          <div>
            <span>CGPA</span>
            <strong>{student?.cgpa ?? "—"}</strong>
            <small>Academic signal</small>
          </div>

          <div>
            <span>SKILLS</span>
            <strong>{skills.length}</strong>
            <small>Detected / entered</small>
          </div>

          <div>
            <span>RESUME</span>
            <strong>
              {resumeText.trim() ? "READY" : "MISSING"}
            </strong>
            <small>
              {resumeText.length.toLocaleString()} characters
            </small>
          </div>

          <div>
            <span>PROFILE ID</span>
            <strong>#{student?.id}</strong>
            <small>CampusLink record</small>
          </div>
        </section>

        <section className="psd-grid">

          <article className="psd-card">
            <div className="psd-head">
              <span>ACADEMIC PROFILE</span>
              <b>01</b>
            </div>

            <div className="psd-detail-grid">
              <div>
                <label>CGPA</label>
                <strong>
                  {student?.cgpa ?? "Not available"}
                </strong>
              </div>

              <div>
                <label>Account</label>
                <strong>
                  {student?.is_active
                    ? "Active"
                    : "Inactive"}
                </strong>
              </div>

              <div>
                <label>Profile updated</label>
                <strong>
                  {student?.updated_at
                    ? new Date(
                        student.updated_at
                      ).toLocaleString()
                    : "Not available"}
                </strong>
              </div>
            </div>
          </article>

          <article className="psd-card">
            <div className="psd-head">
              <span>SKILL INTELLIGENCE</span>
              <b>02</b>
            </div>

            <div className="psd-skills">
              {skills.length ? (
                skills.map((skill) => (
                  <span key={skill}>{skill}</span>
                ))
              ) : (
                <p>No skills recorded.</p>
              )}
            </div>
          </article>

          <article className="psd-card wide">
            <div className="psd-head">
              <span>RESUME / AI PROFILE DATA</span>
              <b>03</b>
            </div>

            {resumeText.trim() ? (
              <div className="psd-resume">
                {resumeText}
              </div>
            ) : (
              <div className="psd-empty">
                <strong>No resume data available</strong>
                <p>
                  Ask the student to upload and analyze
                  a resume.
                </p>
              </div>
            )}
          </article>

          <article className="psd-card">
            <div className="psd-head">
              <span>PLACEMENT SIGNAL</span>
              <b>04</b>
            </div>

            <div className="psd-signal">
              <div className="psd-signal-ring">
                <strong>
                  {student?.cgpa
                    ? Math.round(
                        Number(student.cgpa) * 10
                      )
                    : 0}
                </strong>
              </div>

              <div>
                <strong>Academic readiness</strong>
                <p>
                  Combine this with skill coverage,
                  projects, applications and interview
                  performance before making placement
                  decisions.
                </p>
              </div>
            </div>
          </article>

        </section>

      </main>
    </div>
  );
}

const CSS = `
.psd-page{
  min-height:100vh;
  background:
    radial-gradient(
      circle at 10% 0%,
      rgba(37,99,235,.10),
      transparent 30%
    ),
    #f4f7fb;
  color:#14213d;
  padding-bottom:50px;
}

.psd-topbar{
  padding:30px 5vw 22px;
  display:flex;
  justify-content:space-between;
  align-items:flex-end;
  gap:18px;
}

.psd-topbar>div>span,
.psd-hero>div:nth-child(2)>span,
.psd-head span{
  font-size:9px;
  font-weight:900;
  letter-spacing:.15em;
  color:#3767d9;
}

.psd-topbar h1{
  margin:7px 0;
  font-size:32px;
  letter-spacing:-.045em;
}

.psd-topbar p{
  margin:0;
  color:#6f7f99;
  font-size:11px;
}

.psd-back{
  border:1px solid #d8e1ec;
  background:#fff;
  color:#243652;
  padding:10px 13px;
  border-radius:10px;
  font-size:10px;
  font-weight:900;
  cursor:pointer;
}

.psd-container{
  width:min(1400px,90vw);
  margin:auto;
}

.psd-hero{
  display:flex;
  gap:18px;
  align-items:center;
  background:
    linear-gradient(
      135deg,
      #101d38,
      #243c72
    );
  color:#fff;
  border-radius:22px;
  padding:26px;
  box-shadow:0 22px 50px rgba(16,29,56,.20);
}

.psd-avatar{
  width:78px;
  height:78px;
  border-radius:22px;
  background:
    linear-gradient(135deg,#60a5fa,#8b5cf6);
  display:grid;
  place-items:center;
  font-size:24px;
  font-weight:900;
}

.psd-hero h2{
  margin:7px 0 4px;
  font-size:27px;
}

.psd-hero p{
  margin:0;
  color:#c5d0e3;
  font-size:11px;
}

.psd-status-row{
  display:flex;
  gap:7px;
  flex-wrap:wrap;
  margin-top:11px;
}

.psd-status-row b{
  font-size:8px;
  border-radius:999px;
  padding:6px 8px;
}

.psd-status-row b.green{
  background:#dcfce7;
  color:#166534;
}

.psd-status-row b.blue{
  background:#dbeafe;
  color:#1d4ed8;
}

.psd-kpis{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:12px;
  margin:15px 0;
}

.psd-kpis>div{
  background:#fff;
  border:1px solid #e0e7ef;
  border-radius:16px;
  padding:15px;
  box-shadow:0 8px 25px rgba(20,33,61,.05);
}

.psd-kpis span{
  display:block;
  font-size:8px;
  font-weight:900;
  letter-spacing:.12em;
  color:#8290a5;
}

.psd-kpis strong{
  display:block;
  margin-top:8px;
  font-size:24px;
}

.psd-kpis small{
  display:block;
  margin-top:4px;
  color:#96a2b2;
  font-size:8px;
}

.psd-grid{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:14px;
}

.psd-card{
  background:#fff;
  border:1px solid #e0e7ef;
  border-radius:18px;
  padding:19px;
  box-shadow:0 10px 30px rgba(20,33,61,.05);
}

.psd-card.wide{
  grid-column:1/-1;
}

.psd-head{
  display:flex;
  justify-content:space-between;
  align-items:center;
  padding-bottom:11px;
  border-bottom:1px solid #edf1f5;
  margin-bottom:14px;
}

.psd-head b{
  font-size:8px;
  color:#9aa7b8;
}

.psd-detail-grid{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:12px;
}

.psd-detail-grid label{
  display:block;
  color:#8795a9;
  font-size:8px;
  font-weight:900;
  letter-spacing:.08em;
  margin-bottom:5px;
}

.psd-detail-grid strong{
  font-size:11px;
}

.psd-skills{
  display:flex;
  flex-wrap:wrap;
  gap:7px;
}

.psd-skills span{
  padding:7px 9px;
  border-radius:999px;
  background:#eef2ff;
  color:#4338ca;
  border:1px solid #c7d2fe;
  font-size:8px;
  font-weight:900;
}

.psd-resume{
  max-height:380px;
  overflow:auto;
  white-space:pre-wrap;
  background:#f8fafc;
  border:1px solid #e5eaf1;
  border-radius:12px;
  padding:15px;
  color:#43536b;
  font-size:10px;
  line-height:1.7;
}

.psd-empty{
  padding:30px;
  text-align:center;
  background:#f8fafc;
  border-radius:12px;
}

.psd-empty strong{
  font-size:11px;
}

.psd-empty p{
  color:#8a98ab;
  font-size:9px;
}

.psd-signal{
  display:flex;
  gap:15px;
  align-items:center;
}

.psd-signal-ring{
  width:86px;
  height:86px;
  border-radius:50%;
  display:grid;
  place-items:center;
  flex:none;
  background:conic-gradient(
    #2563eb 0deg,
    #60a5fa 180deg,
    #e5ebf4 180deg
  );
}

.psd-signal-ring strong{
  width:64px;
  height:64px;
  display:grid;
  place-items:center;
  border-radius:50%;
  background:#fff;
  font-size:20px;
}

.psd-signal>div:last-child strong{
  font-size:12px;
}

.psd-signal p{
  margin:5px 0 0;
  color:#77879d;
  font-size:9px;
  line-height:1.55;
}

.psd-loading{
  min-height:100vh;
  background:#f4f7fb;
  display:grid;
  place-content:center;
  text-align:center;
  gap:8px;
  color:#34445d;
}

.psd-spinner{
  width:28px;
  height:28px;
  border:3px solid #dbe7f7;
  border-top-color:#2563eb;
  border-radius:50%;
  margin:auto;
  animation:psdspin .8s linear infinite;
}

@keyframes psdspin{
  to{transform:rotate(360deg)}
}

.psd-error-card{
  width:min(500px,90vw);
  margin:120px auto;
  padding:30px;
  text-align:center;
  background:#fff;
  border:1px solid #fecaca;
  border-radius:18px;
}

.psd-error-card>div{
  width:45px;
  height:45px;
  display:grid;
  place-items:center;
  margin:auto;
  border-radius:50%;
  background:#fef2f2;
  color:#dc2626;
  font-weight:900;
}

.psd-error-card h2{
  font-size:20px;
}

.psd-error-card p{
  color:#7b8799;
  font-size:10px;
}

.psd-error-card button{
  border:0;
  background:#2563eb;
  color:#fff;
  padding:10px 13px;
  border-radius:9px;
  font-size:10px;
  font-weight:900;
  cursor:pointer;
}

@media(max-width:900px){
  .psd-kpis{
    grid-template-columns:1fr 1fr;
  }

  .psd-detail-grid{
    grid-template-columns:1fr 1fr;
  }

  .psd-grid{
    grid-template-columns:1fr;
  }

  .psd-card.wide{
    grid-column:auto;
  }
}

@media(max-width:600px){
  .psd-topbar{
    display:block;
  }

  .psd-back{
    margin-top:12px;
  }

  .psd-kpis{
    grid-template-columns:1fr;
  }

  .psd-detail-grid{
    grid-template-columns:1fr;
  }

  .psd-hero{
    align-items:flex-start;
  }
}
`;