import { useEffect, useMemo, useState } from "react";

const API_BASE_URL =
  "http://127.0.0.1:8000";

function getToken() {
  return (
    localStorage.getItem("campuslink_token") ||
    ""
  );
}

const STATUS_OPTIONS = [
  "PENDING",
  "SCHEDULED",
  "COMPLETED",
  "CANCELLED",
];

const RESULT_OPTIONS = [
  "",
  "PASS",
  "FAIL",
  "SELECTED",
  "REJECTED",
];

function formatRoundType(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function statusClass(status) {
  return (
    String(status || "")
      .toLowerCase()
      .replaceAll("_", "-")
  );
}

export default function PlacementSelectionRounds() {
  const [rounds, setRounds] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [savingId, setSavingId] =
    useState(null);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [selectedRound, setSelectedRound] =
    useState(null);

  const [draftStatus, setDraftStatus] =
    useState("");

  const [draftResult, setDraftResult] =
    useState("");

  async function loadRounds() {
    const token = getToken();

    if (!token) {
      setError(
        "Your CampusLink session has expired."
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response =
        await fetch(
          `${API_BASE_URL}/selection-rounds/`,
          {
            headers: {
              Accept:
                "application/json",
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      const data =
        await response
          .json()
          .catch(() => []);

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            "Unable to load selection rounds."
        );
      }

      setRounds(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Unable to load selection rounds."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRounds();
  }, []);

  const filteredRounds =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return rounds.filter((round) => {
        const searchable = [
          round.id,
          round.application_id,
          round.round_number,
          round.title,
          round.round_type,
          round.status,
          round.result,
        ]
          .filter(
            (value) =>
              value !== null &&
              value !== undefined
          )
          .join(" ")
          .toLowerCase();

        const matchesSearch =
          !query ||
          searchable.includes(query);

        const matchesStatus =
          statusFilter === "ALL" ||
          round.status ===
            statusFilter;

        return (
          matchesSearch &&
          matchesStatus
        );
      });
    }, [
      rounds,
      search,
      statusFilter,
    ]);

  const metrics = useMemo(() => {
    return {
      total: rounds.length,

      pending: rounds.filter(
        (round) =>
          round.status ===
          "PENDING"
      ).length,

      scheduled: rounds.filter(
        (round) =>
          round.status ===
          "SCHEDULED"
      ).length,

      completed: rounds.filter(
        (round) =>
          round.status ===
          "COMPLETED"
      ).length,
    };
  }, [rounds]);

  function openRound(round) {
    setSelectedRound(round);
    setDraftStatus(
      round.status || "PENDING"
    );
    setDraftResult(
      round.result || ""
    );
  }

  async function updateRound() {
    if (!selectedRound) {
      return;
    }

    const token = getToken();

    setSavingId(selectedRound.id);

    try {
      const response =
        await fetch(
          `${API_BASE_URL}/selection-rounds/${selectedRound.id}/status`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body: JSON.stringify({
              status: draftStatus,
              result:
                draftResult || null,
            }),
          }
        );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            "Unable to update selection round."
        );
      }

      setRounds((current) =>
        current.map((round) =>
          round.id ===
          selectedRound.id
            ? data
            : round
        )
      );

      setSelectedRound(data);
    } catch (err) {
      setError(
        err?.message ||
          "Unable to update selection round."
      );
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="selection-page">

      {/* SIDEBAR */}

      <aside className="selection-sidebar">

        <div className="selection-brand">

          <div className="selection-logo">
            C
          </div>

          <div>
            <strong>
              CampusLink
            </strong>

            <span>
              Placement OS
            </span>
          </div>

        </div>

        <div className="selection-section-label">
          PLACEMENT
        </div>

        <nav>

          <a href="/placement">
            <span>⌂</span>
            Dashboard
          </a>

          <a href="/placement/students">
            <span>◉</span>
            Students
          </a>

          <a href="/placement/companies">
            <span>▦</span>
            Companies
          </a>

          <a href="/placement/jobs">
            <span>▣</span>
            Job Drives
          </a>

          <a href="/placement/applications">
            <span>≡</span>
            Applications
          </a>

          <a
            href="/placement/selection-rounds"
            className="active"
          >
            <span>◇</span>
            Selection Rounds
          </a>

          <a href="/placement/scheduling">
            <span>◷</span>
            Scheduling
          </a>

          <a href="/placement/offers">
            <span>◆</span>
            Offers
          </a>

          <a href="/placement/documents">
            <span>▤</span>
            Documents
          </a>

          <a href="/placement/notifications">
            <span>◌</span>
            Notifications
          </a>

        </nav>

        <div className="selection-sidebar-bottom">

          <div className="connected-status">
            <i />
            API Connected
          </div>

          <button
            type="button"
            onClick={() => {
              localStorage.removeItem(
                "campuslink_token"
              );

              window.location.href =
                "/login";
            }}
          >
            ↪ Sign out
          </button>

        </div>

      </aside>

      {/* MAIN */}

      <main className="selection-main">

        <header className="selection-topbar">

          <div>
            <span>
              Placement / Selection Rounds
            </span>

            <h1>
              Selection Rounds
            </h1>
          </div>

          <div className="selection-top-actions">

            <div className="selection-search">
              ⌕

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search rounds, titles or application..."
              />
            </div>

            <button
              type="button"
              className="selection-icon-button"
              onClick={() =>
                window.location.href =
                  "/placement/notifications"
              }
            >
              ◌
            </button>

            <div className="selection-avatar">
              PO
            </div>

          </div>

        </header>

        <section className="selection-content">

          {/* PAGE HEADING */}

          <div className="selection-heading">

            <div>
              <span>
                INTERVIEW PIPELINE
              </span>

              <h2>
                Manage selection stages
              </h2>

              <p>
                Track every screening and interview
                round across placement applications.
              </p>
            </div>

            <button
              type="button"
              className="selection-refresh"
              onClick={loadRounds}
              disabled={loading}
            >
              ↻ Refresh
            </button>

          </div>

          {/* METRICS */}

          <div className="selection-metrics">

            <div>
              <span>
                TOTAL ROUNDS
              </span>

              <strong>
                {metrics.total}
              </strong>

              <small>
                All application stages
              </small>
            </div>

            <div>
              <span>
                PENDING
              </span>

              <strong>
                {metrics.pending}
              </strong>

              <small>
                Awaiting action
              </small>
            </div>

            <div>
              <span>
                SCHEDULED
              </span>

              <strong>
                {metrics.scheduled}
              </strong>

              <small>
                Ready for interview
              </small>
            </div>

            <div className="highlight">
              <span>
                COMPLETED
              </span>

              <strong>
                {metrics.completed}
              </strong>

              <small>
                Finished rounds
              </small>
            </div>

          </div>

          {/* TABLE PANEL */}

          <section className="selection-panel">

            <div className="selection-panel-head">

              <div>
                <h3>
                  Selection Pipeline
                </h3>

                <span>
                  {filteredRounds.length}{" "}
                  records
                </span>
              </div>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
              >
                <option value="ALL">
                  All statuses
                </option>

                {STATUS_OPTIONS.map(
                  (status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {status}
                    </option>
                  )
                )}
              </select>

            </div>

            {loading ? (
              <div className="selection-loading">

                {Array.from({
                  length: 7,
                }).map((_, index) => (
                  <div
                    className="selection-skeleton"
                    key={index}
                  />
                ))}

              </div>
            ) : error ? (
              <div className="selection-empty">

                <div className="state-error">
                  !
                </div>

                <h3>
                  Something went wrong
                </h3>

                <p>
                  {error}
                </p>

                <button
                  type="button"
                  onClick={loadRounds}
                >
                  Retry
                </button>

              </div>
            ) : filteredRounds.length ===
              0 ? (
              <div className="selection-empty">

                <div className="state-neutral">
                  ⌕
                </div>

                <h3>
                  No selection rounds found
                </h3>

                <p>
                  Change your search or filter.
                </p>

              </div>
            ) : (
              <div className="selection-table">

                <div className="selection-row selection-head">

                  <div>
                    ROUND
                  </div>

                  <div>
                    STAGE
                  </div>

                  <div>
                    APPLICATION
                  </div>

                  <div>
                    STATUS
                  </div>

                  <div>
                    RESULT
                  </div>

                  <div>
                    ACTION
                  </div>

                </div>

                {filteredRounds.map(
                  (
                    round,
                    index
                  ) => (
                    <div
                      className="selection-row"
                      key={round.id}
                      style={{
                        "--selection-delay":
                          `${index * 35}ms`,
                      }}
                    >

                      <div>

                        <div className="round-number">
                          {String(
                            round.round_number
                          ).padStart(2, "0")}
                        </div>

                        <span className="round-id">
                          ID #{round.id}
                        </span>

                      </div>

                      <div>

                        <strong>
                          {round.title}
                        </strong>

                        <span className="round-type">
                          {formatRoundType(
                            round.round_type
                          )}
                        </span>

                      </div>

                      <div>

                        <span className="application-ref">
                          APP #
                          {
                            round.application_id
                          }
                        </span>

                      </div>

                      <div>

                        <span
                          className={`selection-status ${statusClass(
                            round.status
                          )}`}
                        >
                          <i />

                          {round.status}
                        </span>

                      </div>

                      <div>

                        <span
                          className={`selection-result ${
                            round.result
                              ? "has-result"
                              : ""
                          }`}
                        >
                          {round.result ||
                            "—"}
                        </span>

                      </div>

                      <div>

                        <button
                          type="button"
                          className="selection-view"
                          onClick={() =>
                            openRound(
                              round
                            )
                          }
                        >
                          Manage
                          <span>
                            →
                          </span>
                        </button>

                      </div>

                    </div>
                  )
                )}

              </div>
            )}

          </section>

        </section>

      </main>

      {/* DRAWER */}

      {selectedRound && (
        <div
          className="selection-overlay"
          onClick={() =>
            setSelectedRound(null)
          }
        >

          <aside
            className="selection-drawer"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <button
              type="button"
              className="selection-close"
              onClick={() =>
                setSelectedRound(null)
              }
            >
              ×
            </button>

            <span className="drawer-kicker">
              SELECTION ROUND
            </span>

            <h2>
              {selectedRound.title}
            </h2>

            <p className="drawer-subtitle">
              {formatRoundType(
                selectedRound.round_type
              )}
              {" · "}
              Application #
              {
                selectedRound.application_id
              }
            </p>

            <div className="drawer-info-grid">

              <div>
                <span>
                  ROUND
                </span>

                <strong>
                  #
                  {
                    selectedRound.round_number
                  }
                </strong>
              </div>

              <div>
                <span>
                  ROUND ID
                </span>

                <strong>
                  #{selectedRound.id}
                </strong>
              </div>

            </div>

            <div className="drawer-description">

              <span>
                DESCRIPTION
              </span>

              <p>
                {selectedRound.description ||
                  "No description provided for this round."}
              </p>

            </div>

            <div className="drawer-field">

              <label>
                Status
              </label>

              <select
                value={draftStatus}
                onChange={(event) =>
                  setDraftStatus(
                    event.target.value
                  )
                }
              >
                {STATUS_OPTIONS.map(
                  (status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {status}
                    </option>
                  )
                )}
              </select>

            </div>

            <div className="drawer-field">

              <label>
                Result
              </label>

              <select
                value={draftResult}
                onChange={(event) =>
                  setDraftResult(
                    event.target.value
                  )
                }
              >
                {RESULT_OPTIONS.map(
                  (result) => (
                    <option
                      key={result || "none"}
                      value={result}
                    >
                      {result ||
                        "No result"}
                    </option>
                  )
                )}
              </select>

            </div>

            <div className="drawer-actions">

              <button
                type="button"
                className="drawer-save"
                onClick={updateRound}
                disabled={
                  savingId ===
                  selectedRound.id
                }
              >
                {savingId ===
                selectedRound.id
                  ? "Saving..."
                  : "Save Changes"}
              </button>

              <button
                type="button"
                className="drawer-cancel"
                onClick={() =>
                  setSelectedRound(null)
                }
              >
                Close
              </button>

            </div>

          </aside>

        </div>
      )}

    </div>
  );
}