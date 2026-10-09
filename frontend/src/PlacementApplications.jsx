import { useEffect, useState } from "react";

const API_BASE_URL = "http://127.0.0.1:8000";

function PlacementApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const token =
    localStorage.getItem("campuslink_token") || "";

  const loadApplications = async () => {
    if (!token) {
      setMessage("Please login first.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/applications/`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Unable to load applications."
        );
      }

      setApplications(
        Array.isArray(data) ? data : []
      );
    } catch (error) {
      console.error(error);

      setMessage(
        error.message ||
          "Unable to load applications."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-page">
        <main className="page-content">
          <div className="page-card">
            <h2>Applications</h2>
            <p>Loading applications...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <main className="page-content">

        <div className="page-card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2>
                Placement Applications
              </h2>

              <p>
                View and monitor all student
                applications.
              </p>
            </div>

            <button
              type="button"
              className="primary-btn"
              onClick={loadApplications}
            >
              Refresh
            </button>
          </div>
        </div>

        {message && (
          <div className="page-card">
            <p>{message}</p>
          </div>
        )}

        {!message &&
          applications.length === 0 && (
            <div className="page-card">
              <h3>
                No Applications Found
              </h3>

              <p>
                No student applications are
                currently available.
              </p>
            </div>
          )}

        <div className="dashboard-grid">
          {applications.map(
            (application) => (
              <div
                key={application.id}
                className="dashboard-card"
              >
                <h3>
                  Application #
                  {application.id}
                </h3>

                <p>
                  <strong>
                    Student ID:
                  </strong>{" "}
                  {application.student_id}
                </p>

                <p>
                  <strong>
                    Job Drive ID:
                  </strong>{" "}
                  {application.job_drive_id}
                </p>

                <p>
                  <strong>
                    Status:
                  </strong>{" "}
                  {application.status}
                </p>

                <p>
                  <strong>
                    Applied:
                  </strong>{" "}
                  {application.applied_at
                    ? new Date(
                        application.applied_at
                      ).toLocaleString()
                    : "—"}
                </p>

                <p>
                  <strong>
                    Updated:
                  </strong>{" "}
                  {application.updated_at
                    ? new Date(
                        application.updated_at
                      ).toLocaleString()
                    : "—"}
                </p>
              </div>
            )
          )}
        </div>

      </main>
    </div>
  );
}

export default PlacementApplications;