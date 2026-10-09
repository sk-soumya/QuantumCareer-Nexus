import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

function getToken() {
  return (
    localStorage.getItem("campuslink_token") ||
    ""
  );
}

function decodeToken(token) {
  try {
    const payload =
      token.split(".")[1];

    if (!payload) return null;

    const normalized =
      payload
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    return JSON.parse(
      atob(normalized)
    );
  } catch {
    return null;
  }
}

function getRole() {
  const token = getToken();

  if (!token) return null;

  return (
    decodeToken(token)?.role ||
    null
  );
}

function roleLabel(role) {
  return String(role || "")
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

function pageName(pathname) {
  const path =
    String(pathname || "")
      .toLowerCase();

  if (
    path.includes(
      "/student/jobs"
    )
  ) {
    return "Job Drives";
  }

  if (
    path.includes(
      "/student/applications"
    )
  ) {
    return "Applications";
  }

  if (
    path.includes(
      "/student/interviews"
    )
  ) {
    return "Interviews";
  }

  if (
    path.includes(
      "/student/offers"
    )
  ) {
    return "Offers";
  }

  if (
    path.includes(
      "/student/resume"
    )
  ) {
    return "Resume AI / Resume Maker";
  }

  if (
    path.includes(
      "/student/profile"
    )
  ) {
    return "Student Profile";
  }

  if (
    path.includes(
      "/student/recommendations"
    )
  ) {
    return "AI Recommendations";
  }

  if (
    path.includes(
      "/student/documents"
    )
  ) {
    return "Documents";
  }

  if (
    path.includes(
      "/recruiter/jobs"
    )
  ) {
    return "Recruiter Job Drives";
  }

  if (
    path.includes(
      "/recruiter/applications"
    )
  ) {
    return "Recruiter Applications";
  }

  if (
    path.includes(
      "/recruiter/interviews"
    )
  ) {
    return "Recruiter Interviews";
  }

  if (
    path.includes(
      "/recruiter/offers"
    )
  ) {
    return "Recruiter Offers";
  }

  if (
    path.includes(
      "/placement/students"
    )
  ) {
    return "Placement Student Directory";
  }

  if (
    path.includes(
      "/placement/companies"
    )
  ) {
    return "Placement Companies";
  }

  if (
    path.includes(
      "/placement/jobs"
    )
  ) {
    return "Placement Job Drives";
  }

  if (
    path.includes(
      "/placement/applications"
    )
  ) {
    return "Placement Applications";
  }

  if (
    path.includes(
      "/placement/interviews"
    )
  ) {
    return "Placement Scheduling";
  }

  if (
    path.includes(
      "/placement/offers"
    )
  ) {
    return "Placement Offers";
  }

  if (
    path.includes(
      "/placement/analytics"
    )
  ) {
    return "Placement Analytics";
  }

  if (
    path === "/placement"
  ) {
    return "Placement Command Center";
  }

  if (
    path.includes("/recruiter")
  ) {
    return "Recruiter Workspace";
  }

  if (
    path.includes("/placement")
  ) {
    return "Placement Workspace";
  }

  return "CampusLink Dashboard";
}

function getQuickActions(
  page,
  role
) {
  const student = role === "STUDENT";

  if (
    page === "Job Drives" &&
    student
  ) {
    return [
      [
        "eligibility",
        "Check my eligibility",
      ],
      [
        "apply",
        "How do I apply?",
      ],
      [
        "hiring",
        "Explain hiring process",
      ],
      [
        "skillgap",
        "What skills am I missing?",
      ],
    ];
  }

  if (
    page === "Applications" &&
    student
  ) {
    return [
      [
        "status",
        "Explain my status",
      ],
      [
        "next",
        "What should I do next?",
      ],
      [
        "hiring",
        "Explain the next stage",
      ],
    ];
  }

  if (
    page === "Interviews" &&
    student
  ) {
    return [
      [
        "prepare",
        "How should I prepare?",
      ],
      [
        "hiring",
        "Explain the hiring stages",
      ],
    ];
  }

  if (
    page === "Offers" &&
    student
  ) {
    return [
      [
        "offer",
        "Summarize my offer",
      ],
      [
        "accept",
        "What should I check before accepting?",
      ],
    ];
  }

  if (
    page.startsWith("Resume")
  ) {
    return [
      [
        "resume",
        "Improve my resume",
      ],
      [
        "summary",
        "Write my summary",
      ],
      [
        "projects",
        "Improve project bullets",
      ],
    ];
  }

  if (
    page === "Placement Command Center"
  ) {
    return [
      [
        "attention",
        "What needs attention?",
      ],
      [
        "readiness",
        "Explain student readiness",
      ],
      [
        "funnel",
        "Explain the placement funnel",
      ],
    ];
  }

  if (
    page === "Placement Student Directory"
  ) {
    return [
      [
        "student",
        "What should I inspect?",
      ],
      [
        "readiness",
        "How is readiness calculated?",
      ],
    ];
  }

  if (
    page === "Recruiter Job Drives"
  ) {
    return [
      [
        "drive",
        "Explain this drive",
      ],
      [
        "candidates",
        "Find candidate guidance",
      ],
      [
        "applications",
        "Explain applications",
      ],
    ];
  }

  return [
    [
      "next",
      "What should I do next?",
    ],
    [
      "features",
      "Explain this page",
    ],
    [
      "hiring",
      "Explain hiring process",
    ],
  ];
}

function localAnswer(
  message,
  pathname
) {
  const q =
    String(message || "")
      .trim()
      .toLowerCase();

  const page =
    pageName(pathname);

  const role =
    getRole();

  const roleText =
    roleLabel(role);

  if (
    /^(hi|hello|hey|hii|yo|help|help me)$/i.test(
      q
    )
  ) {
    return `
Hi! I'm Quantum AI, your CampusLink career guide.

You are currently viewing ${page}
as ${roleText || "User"}.

I can explain this page, guide applications,
explain hiring stages, improve your resume,
summarize offers and tell you what to do next.
`.trim();
  }

  if (
    q.includes("what should i do next") ||
    q.includes("next step") ||
    q.includes("what do i do here")
  ) {
    if (
      page === "Job Drives"
    ) {
      return `
Next:
1. Open the job drive.
2. Check eligibility.
3. Check required skills.
4. Check deadline.
5. Review hiring stages.
6. Apply if you are eligible.
7. Track the application afterwards.
`.trim();
    }

    if (
      page === "Applications"
    ) {
      return `
Open your application and check its current stage.
If shortlisted, open Interviews and prepare for the
next round. If it is still pending, there is usually
nothing to submit unless the drive asks for another action.
`.trim();
    }

    if (
      page === "Offers"
    ) {
      return `
Review compensation, role, location, joining date,
conditions and acceptance deadline before accepting.
Quantum AI can summarize the offer into a simple checklist.
`.trim();
    }

    if (
      page.startsWith("Resume")
    ) {
      return `
Finish your strongest profile sections, use Quantum AI
to draft concise content, review every claim, then save
and export your final resume.
`.trim();
    }

    return `
Use the main action on this page first.
I can guide you through the next step based on
the current CampusLink workflow.
`.trim();
  }

  if (
    q.includes("apply") ||
    q.includes("application")
  ) {
    return `
To apply:
Job Drives → open drive → verify eligibility →
review skills, CGPA, deadline and documents →
submit application → confirm submission →
track status in Applications.
`.trim();
  }

  if (
    q.includes("eligible") ||
    q.includes("eligibility")
  ) {
    return `
Eligibility should be checked against the actual
job-drive rules: minimum CGPA, required skills,
academic criteria, graduation requirements and
any recruiter-specific conditions.

A strong match does not override an eligibility rule.
`.trim();
  }

  if (
    q.includes("skill gap") ||
    q.includes("missing skill") ||
    q.includes("skills am i missing")
  ) {
    return `
Quantum AI can compare your verified profile with
the selected job-drive requirements and explain:

• required skills you already have
• required skills not found in your profile
• which gaps matter most
• what you should learn or demonstrate next
`.trim();
  }

  if (
    q.includes("job drive") ||
    q.includes("job opening") ||
    q === "drive"
  ) {
    return `
A job drive is a recruiter-created campus hiring
opportunity.

Before applying, check:
eligibility → required skills → role → location →
salary → deadline → selection stages → required documents.
`.trim();
  }

  if (
    q.includes("hiring") ||
    q.includes("selection process") ||
    q.includes("recruitment process") ||
    q.includes("what happens after apply")
  ) {
    return `
Typical CampusLink hiring flow:

Job Drive
↓
Application
↓
Shortlist
↓
Assessment / Selection Round
↓
Interview
↓
Offer
↓
Acceptance

The exact stages come from the recruiter-created drive.
`.trim();
  }

  if (
    q.includes("resume") ||
    q.includes("cv")
  ) {
    return `
Use Resume AI to analyze your resume and identify
strengths and gaps.

Then use Resume Maker AI to create an editable,
A4-ready resume.

Quantum AI can help draft:
• summary
• skills wording
• project bullets
• experience bullets
• role-targeted versions

It should not invent achievements.
`.trim();
  }

  if (
    q.includes("offer") ||
    q.includes("ctc") ||
    q.includes("salary") ||
    q.includes("joining")
  ) {
    return `
For an offer, check:

• role
• compensation / CTC
• location
• joining date
• probation or conditions
• acceptance deadline
• special clauses

Paste the offer text here and Quantum AI can turn it
into a concise decision checklist.
`.trim();
  }

  if (
    q.includes("interview")
  ) {
    return `
For interviews, first identify the drive and round.
Then prepare around the job description, your projects,
your strongest technical skills and the criteria for
that specific selection stage.
`.trim();
  }

  if (
    q.includes("feature") ||
    q.includes("campuslink") ||
    q.includes("what can you do")
  ) {
    return `
CampusLink connects the complete placement journey:

Profile
→ Resume AI
→ Resume Maker AI
→ AI Recommendations
→ Job Drives
→ Applications
→ Interviews
→ Offers

Quantum AI is the guidance layer across that journey.
`.trim();
  }

  if (
    q.includes("placement officer") ||
    q.includes("placement dashboard")
  ) {
    return `
The Placement Officer workspace should answer:
“What placement outcome needs attention right now?”

Quantum AI can explain:
• placement rate
• application funnel
• student readiness
• company performance
• upcoming deadlines
• skill demand
• student-level interventions
`.trim();
  }

  if (
    q.includes("recruiter")
  ) {
    return `
For recruiters, CampusLink connects:
company → job drive → candidate pool →
applications → selection stages → interviews → offers.

Quantum AI explains the workflow and helps interpret
candidate and drive information.
`.trim();
  }

  return `
I’m Quantum AI.

You are on ${page}.

Try:
“How do I apply?”
“Am I eligible?”
“Explain this job drive.”
“Explain the hiring process.”
“Improve my resume.”
“Summarize my offer.”
“What should I do next?”
`.trim();
}

function extractReply(data) {
  return [
    data?.reply,
    data?.message,
    data?.answer,
    data?.content,
    data?.output,
    data?.result?.reply,
    data?.result?.message,
  ]
    .map((value) =>
      String(value || "")
        .trim()
    )
    .find(Boolean) || "";
}

async function postQuantum(
  path,
  payload,
  signal
) {
  const token =
    getToken();

  const response =
    await fetch(
      `${API_BASE_URL}${path}`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",

          Accept:
            "application/json",

          ...(token
            ? {
                Authorization:
                  `Bearer ${token}`,
              }
            : {}),
        },

        body:
          JSON.stringify(payload),

        signal,
      }
    );

  const data =
    await response
      .json()
      .catch(() => ({}));

  if (!response.ok) {
    const error =
      new Error(
        data?.detail ||
          `Quantum AI request failed (${response.status})`
      );

    error.status =
      response.status;

    throw error;
  }

  return data;
}

export default function QuantumAI() {
  const navigate =
    useNavigate();

  const location =
    useLocation();

  const endRef =
    useRef(null);

  const [open, setOpen] =
    useState(false);

  const [input, setInput] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [messages, setMessages] =
    useState([
      {
        role: "assistant",

        content:
          "Hi! I’m Quantum AI. I’m your CampusLink career guide. I can explain pages, guide applications, explain hiring stages, improve your resume and summarize offers.",
      },
    ]);

  const currentPage =
    useMemo(
      () =>
        pageName(
          location.pathname
        ),
      [location.pathname]
    );

  const currentRole =
    getRole();

  const quickActions =
    useMemo(
      () =>
        getQuickActions(
          currentPage,
          currentRole
        ),
      [
        currentPage,
        currentRole,
      ]
    );

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [
    messages,
    loading,
  ]);

  useEffect(() => {
    setMessages([
      {
        role: "assistant",

        content:
          `Quantum AI here. You're now on ${currentPage}. Ask me what this page means, what to do next, or use one of the quick actions below.`,
      },
    ]);
  }, [currentPage]);

  function navigateTo(
    path
  ) {
    navigate(path);
    setOpen(true);
  }

  function quickMessage(
    id
  ) {
    const map = {
      eligibility:
        "Check my eligibility for this job drive and explain what I should verify.",
      apply:
        "How do I apply for this job drive?",
      hiring:
        "Explain the complete hiring process for this job drive.",
      skillgap:
        "What skills am I missing for this job drive?",
      status:
        "Explain my application status and what it means.",
      next:
        "What should I do next on this page?",
      prepare:
        "How should I prepare for the next interview stage?",
      offer:
        "Summarize my offer and tell me what I should check before accepting.",
      accept:
        "What should I check before accepting my offer?",
      resume:
        "Improve my resume and tell me the most valuable changes.",
      summary:
        "Write a concise professional summary using my existing facts.",
      projects:
        "Improve my project bullets without inventing achievements.",
      attention:
        "What placement outcomes need attention right now?",
      readiness:
        "Explain student readiness and who may need intervention.",
      funnel:
        "Explain the placement application funnel and its bottlenecks.",
      student:
        "What should a placement officer inspect on a student profile?",
      drive:
        "Explain this job drive and its important decision points.",
      candidates:
        "How should a recruiter evaluate candidates for this drive?",
      applications:
        "Explain the application pipeline for this drive.",
      features:
        "Explain the important CampusLink features.",
    };

    send(
      map[id] ||
        "What should I do next?"
    );
  }

  async function send(
    messageOverride = null
  ) {
    const text =
      String(
        messageOverride ??
          input
      ).trim();

    if (!text || loading) {
      return;
    }

    const role =
      currentRole;

    setInput("");

    setMessages(
      (current) => [
        ...current,
        {
          role: "user",
          content: text,
        },
      ]
    );

    setLoading(true);

    const fallback =
      localAnswer(
        text,
        location.pathname
      );

    const controller =
      new AbortController();

    const timeoutId =
      window.setTimeout(
        () =>
          controller.abort(),
        4500
      );

    try {
      let reply = "";

      try {
        const data =
          await postQuantum(
            "/ai/member4/chat",
            {
              message: text,

              context: {
                application:
                  "CampusLink",

                assistant:
                  "Quantum AI",

                page:
                  currentPage,

                path:
                  location.pathname,

                role:
                  role || null,

                role_label:
                  roleLabel(role),

                user_goal:
                  text,

                workflow:
                  "student-to-placement career workflow",
              },

              conversation:
                messages
                  .slice(-8),
            },
            controller.signal
          );

        reply =
          extractReply(data);
      } catch (member4Error) {
        if (
          ![
            404,
            405,
            422,
          ].includes(
            member4Error?.status
          )
        ) {
          throw member4Error;
        }

        try {
          const data =
            await postQuantum(
              "/api/ai/chat",
              {
                message: `
You are Quantum AI, the career
and placement assistant for CampusLink.

Current page: ${currentPage}
Current role: ${roleLabel(role)}

User request:
${text}

Give an actionable, concise answer.
Explain what the user should do next.
Do not invent user data.
`.trim(),

                language: "en",
              },
              controller.signal
            );

          reply =
            extractReply(data);
        } catch {
          reply = "";
        }
      }

      setMessages(
        (current) => [
          ...current,
          {
            role: "assistant",
            content:
              reply || fallback,
          },
        ]
      );
    } catch {
      setMessages(
        (current) => [
          ...current,
          {
            role: "assistant",
            content: fallback,
          },
        ]
      );
    } finally {
      window.clearTimeout(
        timeoutId
      );

      setLoading(false);
    }
  }

  return (
    <>
      <style>{CSS}</style>

      {!open && (
        <button
          type="button"
          className="qai-fab"
          onClick={() =>
            setOpen(true)
          }
          aria-label="Open Quantum AI"
        >
          <span className="qai-orbit" />
          <strong>Q</strong>
          <small>
            Quantum AI
          </small>
        </button>
      )}

      {open && (
        <aside
          className="qai-panel"
          aria-label="Quantum AI assistant"
        >
          <header className="qai-header">
            <div>
              <span>
                CAMPUSLINK INTELLIGENCE
              </span>

              <h3>
                Quantum AI
              </h3>

              <p>
                Your contextual career
                and placement copilot
              </p>
            </div>

            <button
              type="button"
              className="qai-close"
              onClick={() =>
                setOpen(false)
              }
            >
              ×
            </button>
          </header>

          <div className="qai-context">
            <div>
              <span>
                YOU ARE VIEWING
              </span>

              <strong>
                {currentPage}
              </strong>
            </div>

            <small>
              {roleLabel(
                currentRole
              ) || "User"}
            </small>
          </div>

          <div className="qai-quick">
            {quickActions.map(
              ([id, label]) => (
                <button
                  type="button"
                  key={id}
                  onClick={() =>
                    quickMessage(id)
                  }
                >
                  {label}
                </button>
              )
            )}
          </div>

          <div className="qai-messages">
            {messages.map(
              (
                message,
                index
              ) => (
                <div
                  key={index}
                  className={
                    message.role ===
                    "user"
                      ? "qai-message user"
                      : "qai-message assistant"
                  }
                >
                  <div className="qai-message-label">
                    {message.role ===
                    "user"
                      ? "YOU"
                      : "Q"}
                  </div>

                  <p>
                    {message.content}
                  </p>
                </div>
              )
            )}

            {loading && (
              <div className="qai-message assistant">
                <div className="qai-message-label">
                  Q
                </div>

                <p className="qai-thinking">
                  Quantum AI is thinking
                  <span />
                  <span />
                  <span />
                </p>
              </div>
            )}

            <div ref={endRef} />
          </div>

          <form
            className="qai-input-row"
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
          >
            <input
              value={input}
              onChange={(event) =>
                setInput(
                  event.target.value
                )
              }
              placeholder={
                currentPage ===
                "Offers"
                  ? "Ask me to explain your offer…"
                  : currentPage ===
                    "Job Drives"
                    ? "Ask about eligibility, skills or applying…"
                    : "Ask Quantum AI anything…"
              }
            />

            <button
              type="submit"
              disabled={
                loading ||
                !input.trim()
              }
            >
              →
            </button>
          </form>

          <footer className="qai-footer">
            <span>
              Context-aware
            </span>

            <span>•</span>

            <span>
              Review before important actions
            </span>
          </footer>
        </aside>
      )}
    </>
  );
}

const CSS = `
.qai-fab{
  position:fixed;
  right:22px;
  bottom:22px;
  width:68px;
  height:68px;
  border:0;
  border-radius:22px;
  cursor:pointer;
  z-index:9998;
  background:
    linear-gradient(145deg,#111936,#4338ca);
  color:#fff;
  box-shadow:
    0 20px 50px rgba(37,42,105,.35);
  display:grid;
  place-items:center;
}

.qai-fab strong{
  font-size:25px;
  line-height:1;
  position:relative;
  z-index:2;
}

.qai-fab small{
  position:absolute;
  top:74px;
  white-space:nowrap;
  color:#34425a;
  font-size:9px;
  font-weight:900;
  letter-spacing:.08em;
}

.qai-orbit{
  position:absolute;
  width:44px;
  height:44px;
  border:1px solid rgba(125,211,252,.35);
  border-radius:50%;
  animation:qaiOrbit 3s linear infinite;
}

.qai-orbit::after{
  content:"";
  position:absolute;
  width:7px;
  height:7px;
  border-radius:50%;
  background:#67e8f9;
  top:-3px;
  left:18px;
  box-shadow:0 0 14px #67e8f9;
}

@keyframes qaiOrbit{
  to{transform:rotate(360deg)}
}

.qai-panel{
  position:fixed;
  right:20px;
  bottom:20px;
  width:min(410px,calc(100vw - 32px));
  height:min(720px,calc(100vh - 40px));
  z-index:9999;
  display:grid;
  grid-template-rows:auto auto auto minmax(0,1fr) auto auto;
  overflow:hidden;
  border:1px solid #d7e0ef;
  border-radius:22px;
  background:#f8fbff;
  color:#12213b;
  box-shadow:
    0 28px 80px rgba(15,23,42,.24);
}

.qai-header{
  padding:17px 17px 14px;
  display:flex;
  justify-content:space-between;
  gap:10px;
  background:
    radial-gradient(
      circle at 100% 0%,
      rgba(99,102,241,.34),
      transparent 38%
    ),
    linear-gradient(145deg,#0c1428,#202c5b);
  color:#fff;
}

.qai-header span{
  font-size:8px;
  letter-spacing:.15em;
  font-weight:900;
  color:#93c5fd;
}

.qai-header h3{
  margin:5px 0 2px;
  font-size:21px;
}

.qai-header p{
  margin:0;
  color:#c5d0e4;
  font-size:10px;
}

.qai-close{
  width:32px;
  height:32px;
  border:1px solid rgba(255,255,255,.17);
  border-radius:9px;
  background:rgba(255,255,255,.08);
  color:#fff;
  font-size:20px;
  cursor:pointer;
}

.qai-context{
  margin:10px 12px 6px;
  padding:10px 11px;
  border:1px solid #dae3ef;
  border-radius:11px;
  background:#fff;
  display:flex;
  justify-content:space-between;
  gap:8px;
  align-items:center;
}

.qai-context span{
  display:block;
  color:#7b8ba2;
  font-size:7px;
  letter-spacing:.13em;
  font-weight:900;
}

.qai-context strong{
  display:block;
  margin-top:3px;
  font-size:10px;
}

.qai-context small{
  border-radius:999px;
  background:#eef2ff;
  color:#4338ca;
  padding:6px 8px;
  font-size:8px;
  font-weight:900;
}

.qai-quick{
  display:flex;
  flex-wrap:wrap;
  gap:6px;
  padding:4px 12px 10px;
}

.qai-quick button{
  border:1px solid #d7e1ee;
  border-radius:999px;
  padding:7px 9px;
  background:#fff;
  color:#334155;
  font-size:8px;
  font-weight:900;
  cursor:pointer;
}

.qai-quick button:hover{
  border-color:#818cf8;
  background:#eef2ff;
  color:#4338ca;
}

.qai-messages{
  overflow-y:auto;
  padding:5px 12px 12px;
}

.qai-message{
  display:flex;
  gap:8px;
  margin-bottom:9px;
  align-items:flex-start;
}

.qai-message-label{
  flex:none;
  width:23px;
  height:23px;
  border-radius:8px;
  display:grid;
  place-items:center;
  font-size:8px;
  font-weight:900;
}

.qai-message.assistant
.qai-message-label{
  background:#e0e7ff;
  color:#4338ca;
}

.qai-message.user
.qai-message-label{
  background:#dbeafe;
  color:#1d4ed8;
}

.qai-message p{
  margin:0;
  max-width:305px;
  padding:10px 11px;
  border-radius:11px;
  font-size:10px;
  line-height:1.55;
  white-space:pre-line;
}

.qai-message.assistant p{
  background:#fff;
  border:1px solid #e0e7ef;
  color:#45566e;
}

.qai-message.user p{
  background:#e0e7ff;
  color:#29365f;
}

.qai-thinking{
  display:flex;
  align-items:center;
  gap:4px;
}

.qai-thinking span{
  width:5px;
  height:5px;
  border-radius:50%;
  background:#6366f1;
  animation:qaiDot 1s infinite;
}

.qai-thinking span:nth-child(2){
  animation-delay:.15s;
}

.qai-thinking span:nth-child(3){
  animation-delay:.3s;
}

@keyframes qaiDot{
  0%,100%{opacity:.25;transform:translateY(0)}
  50%{opacity:1;transform:translateY(-2px)}
}

.qai-input-row{
  margin:0 12px 8px;
  display:flex;
  gap:7px;
}

.qai-input-row input{
  min-width:0;
  flex:1;
  border:1px solid #cfd9e7;
  border-radius:11px;
  padding:11px 12px;
  outline:none;
  background:#fff;
  color:#17233b;
  font-size:10px;
}

.qai-input-row input:focus{
  border-color:#6366f1;
  box-shadow:0 0 0 3px rgba(99,102,241,.10);
}

.qai-input-row button{
  width:42px;
  border:0;
  border-radius:11px;
  background:#4f46e5;
  color:#fff;
  font-weight:900;
  cursor:pointer;
}

.qai-input-row button:disabled{
  opacity:.45;
  cursor:not-allowed;
}

.qai-footer{
  padding:8px 14px 11px;
  border-top:1px solid #e3e9f1;
  display:flex;
  gap:6px;
  align-items:center;
  color:#8a99ad;
  font-size:8px;
}

@media(max-width:600px){
  .qai-panel{
    right:8px;
    bottom:8px;
    width:calc(100vw - 16px);
    height:calc(100vh - 16px);
    border-radius:17px;
  }

  .qai-fab{
    right:14px;
    bottom:14px;
  }
}
`;