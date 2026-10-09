import { useEffect, useMemo, useState } from "react";

const API_BASE_URL =
  "http://127.0.0.1:8000";

function getToken() {
  return (
    localStorage.getItem(
      "campuslink_token"
    ) || ""
  );
}

function getInitials(name = "") {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map(
        (part) =>
          part[0]?.toUpperCase() || ""
      )
      .join("") || "CO"
  );
}

export default function PlacementCompanies() {
  const [companies, setCompanies] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [selectedCompany, setSelectedCompany] =
    useState(null);

  async function loadCompanies(
    refresh = false
  ) {
    const token = getToken();

    if (!token) {
      setError(
        "Authentication token not found."
      );

      setLoading(false);
      return;
    }

    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response =
        await fetch(
          `${API_BASE_URL}/companies/`,
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
            "Unable to load companies."
        );
      }

      setCompanies(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Unable to load companies."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadCompanies();
  }, []);

  const filteredCompanies =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return companies;
      }

      return companies.filter(
        (company) =>
          company.name
            ?.toLowerCase()
            .includes(query) ||
          company.industry
            ?.toLowerCase()
            .includes(query) ||
          company.location
            ?.toLowerCase()
            .includes(query)
      );
    }, [companies, search]);

  const industries = useMemo(() => {
    return new Set(
      companies
        .map(
          (company) =>
            company.industry
        )
        .filter(Boolean)
    ).size;
  }, [companies]);

  const locations = useMemo(() => {
    return new Set(
      companies
        .map(
          (company) =>
            company.location
        )
        .filter(Boolean)
    ).size;
  }, [companies]);

  return (
    <div className="enterprise-page">

      {/* SIDEBAR */}

      <aside className="enterprise-sidebar">

        <div className="enterprise-logo">
          <div className="enterprise-logo-mark">
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

        <div className="enterprise-role">
          <span>
            PLACEMENT OFFICE
          </span>

          <strong>
            Operations
          </strong>
        </div>

        <nav className="enterprise-nav">

          <a href="/placement">
            <span>⌂</span>
            Dashboard
          </a>

          <a href="/placement/students">
            <span>◉</span>
            Students
          </a>

          <a
            href="/placement/companies"
            className="active"
          >
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

          <a href="/placement/selection-rounds">
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

        <div className="enterprise-user">

          <div className="enterprise-user-avatar">
            PO
          </div>

          <div>
            <strong>
              Placement Officer
            </strong>

            <span>
              CampusLink Admin
            </span>
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
            ↪
          </button>

        </div>

      </aside>

      {/* MAIN */}

      <main className="enterprise-main">

        {/* TOPBAR */}

        <header className="enterprise-topbar">

          <div>
            <span className="breadcrumb">
              Placement / Companies
            </span>

            <h1>
              Company Directory
            </h1>
          </div>

          <div className="topbar-actions">

            <div className="topbar-search">
              <span>
                ⌕
              </span>

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search companies..."
              />
            </div>

            <button
              type="button"
              className="topbar-icon"
              onClick={() =>
                window.location.href =
                  "/placement/notifications"
              }
            >
              ◌
            </button>

            <div className="topbar-avatar">
              PO
            </div>

          </div>

        </header>

        {/* CONTENT */}

        <section className="enterprise-content">

          {/* HERO */}

          <div className="enterprise-heading">

            <div>
              <span>
                ORGANIZATION MANAGEMENT
              </span>

              <h2>
                Participating Companies
              </h2>

              <p>
                Manage organizations participating
                in the CampusLink placement workflow.
              </p>
            </div>

            <button
              type="button"
              className="enterprise-refresh"
              onClick={() =>
                loadCompanies(true)
              }
              disabled={refreshing}
            >
              <span
                className={
                  refreshing
                    ? "refresh-spin"
                    : ""
                }
              >
                ↻
              </span>

              {refreshing
                ? "Refreshing"
                : "Refresh"}
            </button>

          </div>

          {/* KPI */}

          <div className="enterprise-kpis">

            <div className="enterprise-kpi">
              <span>
                TOTAL COMPANIES
              </span>

              <strong>
                {companies.length}
              </strong>

              <small>
                Registered organizations
              </small>
            </div>

            <div className="enterprise-kpi">
              <span>
                INDUSTRIES
              </span>

              <strong>
                {industries}
              </strong>

              <small>
                Across company records
              </small>
            </div>

            <div className="enterprise-kpi">
              <span>
                LOCATIONS
              </span>

              <strong>
                {locations}
              </strong>

              <small>
                Active placement locations
              </small>
            </div>

            <div className="enterprise-kpi accent">
              <span>
                DIRECTORY STATUS
              </span>

              <strong>
                LIVE
              </strong>

              <small>
                Connected to CampusLink API
              </small>
            </div>

          </div>

          {/* TABLE */}

          <div className="enterprise-panel">

            <div className="enterprise-panel-header">

              <div>
                <h3>
                  Company Records
                </h3>

                <span>
                  {filteredCompanies.length}{" "}
                  records
                </span>
              </div>

              <div className="enterprise-filter">
                Directory
              </div>

            </div>

            {loading ? (
              <div className="enterprise-loading">

                {Array.from({
                  length: 5,
                }).map(
                  (_, index) => (
                    <div
                      className="enterprise-skeleton"
                      key={index}
                    />
                  )
                )}

              </div>
            ) : error ? (
              <div className="enterprise-state">

                <div className="state-icon error">
                  !
                </div>

                <h3>
                  Unable to load company data
                </h3>

                <p>
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    loadCompanies()
                  }
                >
                  Try again
                </button>

              </div>
            ) : filteredCompanies.length ===
              0 ? (
              <div className="enterprise-state">

                <div className="state-icon">
                  ⌕
                </div>

                <h3>
                  No companies found
                </h3>

                <p>
                  Try a different search term.
                </p>

              </div>
            ) : (
              <div className="enterprise-table">

                <div className="enterprise-row enterprise-row-head">

                  <div>
                    COMPANY
                  </div>

                  <div>
                    INDUSTRY
                  </div>

                  <div>
                    LOCATION
                  </div>

                  <div>
                    WEBSITE
                  </div>

                  <div>
                    ACTION
                  </div>

                </div>

                {filteredCompanies.map(
                  (company, index) => (
                    <div
                      className="enterprise-row"
                      key={company.id}
                      style={{
                        "--row-delay":
                          `${index * 40}ms`,
                      }}
                    >

                      <div className="company-cell">

                        <div className="company-avatar">
                          {getInitials(
                            company.name
                          )}
                        </div>

                        <div>
                          <strong>
                            {company.name}
                          </strong>

                          <span>
                            Company ID #
                            {company.id}
                          </span>
                        </div>

                      </div>

                      <div>
                        <span className="industry-badge">
                          {company.industry ||
                            "Not specified"}
                        </span>
                      </div>

                      <div className="muted-cell">
                        {company.location ||
                          "Not specified"}
                      </div>

                      <div>
                        {company.website ? (
                          <a
                            className="company-link"
                            href={
                              company.website
                            }
                            target="_blank"
                            rel="noreferrer"
                          >
                            Visit website ↗
                          </a>
                        ) : (
                          <span className="muted-cell">
                            Not available
                          </span>
                        )}
                      </div>

                      <div>
                        <button
                          type="button"
                          className="row-action"
                          onClick={() =>
                            setSelectedCompany(
                              company
                            )
                          }
                        >
                          View
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

          </div>

        </section>

      </main>

      {/* COMPANY DRAWER */}

      {selectedCompany && (
        <div
          className="enterprise-overlay"
          onClick={() =>
            setSelectedCompany(null)
          }
        >

          <aside
            className="company-drawer"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <button
              type="button"
              className="drawer-close-btn"
              onClick={() =>
                setSelectedCompany(null)
              }
            >
              ×
            </button>

            <div className="drawer-company-avatar">
              {getInitials(
                selectedCompany.name
              )}
            </div>

            <span className="drawer-label">
              COMPANY PROFILE
            </span>

            <h2>
              {selectedCompany.name}
            </h2>

            <p className="drawer-id">
              Company ID #
              {selectedCompany.id}
            </p>

            <div className="drawer-details">

              <div>
                <span>
                  INDUSTRY
                </span>

                <strong>
                  {selectedCompany.industry ||
                    "Not specified"}
                </strong>
              </div>

              <div>
                <span>
                  LOCATION
                </span>

                <strong>
                  {selectedCompany.location ||
                    "Not specified"}
                </strong>
              </div>

            </div>

            <div className="drawer-section">

              <span>
                WEBSITE
              </span>

              {selectedCompany.website ? (
                <a
                  href={
                    selectedCompany.website
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  {selectedCompany.website}
                  ↗
                </a>
              ) : (
                <p>
                  No website provided.
                </p>
              )}

            </div>

            <div className="drawer-section">

              <span>
                DESCRIPTION
              </span>

              <p>
                {selectedCompany.description ||
                  "No company description has been provided."}
              </p>

            </div>

            <div className="drawer-footer">

              <button
                type="button"
                onClick={() =>
                  setSelectedCompany(null)
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