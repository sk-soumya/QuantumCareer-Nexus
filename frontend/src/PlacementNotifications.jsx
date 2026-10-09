import { useEffect, useState } from "react";

const API_BASE_URL = "http://127.0.0.1:8000";

function PlacementNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const token =
    localStorage.getItem("campuslink_token") || "";

  const loadNotifications = async () => {
    if (!token) {
      setMessage("Please login first.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/notifications/`,
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
            "Unable to load notifications."
        );
      }

      setNotifications(
        Array.isArray(data) ? data : []
      );
    } catch (error) {
      console.error(error);

      setMessage(
        error.message ||
          "Unable to load notifications."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-page">
        <main className="page-content">
          <div className="page-card">
            <h2>Placement Notifications</h2>
            <p>Loading notifications...</p>
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
              <h2>Placement Notifications</h2>

              <p>
                View important CampusLink
                placement updates.
              </p>
            </div>

            <button
              type="button"
              className="primary-btn"
              onClick={loadNotifications}
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
          notifications.length === 0 && (
            <div className="page-card">
              <h3>No Notifications</h3>
              <p>
                There are currently no
                placement notifications.
              </p>
            </div>
          )}

        <div className="dashboard-grid">
          {notifications.map(
            (notification) => (
              <div
                key={notification.id}
                className="dashboard-card"
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    gap: "12px",
                  }}
                >
                  <h3>
                    {notification.title}
                  </h3>

                  <strong>
                    {notification.is_read
                      ? "Read"
                      : "Unread"}
                  </strong>
                </div>

                <p>
                  {notification.message}
                </p>

                <p>
                  <strong>
                    Type:
                  </strong>{" "}
                  {notification.notification_type}
                </p>

                <p>
                  <strong>
                    Created:
                  </strong>{" "}
                  {notification.created_at
                    ? new Date(
                        notification.created_at
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

export default PlacementNotifications;