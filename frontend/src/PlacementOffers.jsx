import { useEffect, useState } from "react";

const API_BASE_URL = "http://127.0.0.1:8000";

const OFFER_STATUSES = [
  "DRAFT",
  "ISSUED",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
];

function PlacementOffers() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [message, setMessage] = useState("");

  const token =
    localStorage.getItem("campuslink_token") || "";

  const loadOffers = async () => {
    if (!token) {
      setMessage("Please login first.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/offers/`,
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
            "Unable to load offers."
        );
      }

      setOffers(
        Array.isArray(data) ? data : []
      );
    } catch (error) {
      console.error(error);

      setMessage(
        error.message ||
          "Unable to load offers."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOffers();
  }, []);

  const updateOfferStatus = async (
    offerId,
    nextStatus
  ) => {
    setUpdatingId(offerId);
    setMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/offers/${offerId}/status`,
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
            status: nextStatus,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Unable to update offer status."
        );
      }

      setOffers((current) =>
        current.map((offer) =>
          offer.id === offerId
            ? data
            : offer
        )
      );

      setMessage(
        `Offer #${offerId} updated to ${nextStatus}.`
      );
    } catch (error) {
      console.error(error);

      setMessage(
        error.message ||
          "Unable to update offer."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <main className="page-content">
          <div className="page-card">
            <h2>Placement Offers</h2>
            <p>Loading offers...</p>
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
              justifyContent:
                "space-between",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2>
                Placement Offers
              </h2>

              <p>
                Monitor offers issued to
                selected students.
              </p>
            </div>

            <button
              type="button"
              className="primary-btn"
              onClick={loadOffers}
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
          offers.length === 0 && (
            <div className="page-card">
              <h3>No Offers Found</h3>
              <p>
                There are currently no
                placement offers.
              </p>
            </div>
          )}

        <div className="dashboard-grid">
          {offers.map((offer) => (
            <div
              key={offer.id}
              className="dashboard-card"
            >
              <h3>
                Offer #{offer.id}
              </h3>

              <p>
                <strong>
                  Application ID:
                </strong>{" "}
                {offer.application_id}
              </p>

              <p>
                <strong>
                  Salary Package:
                </strong>{" "}
                {offer.salary_package}
              </p>

              <p>
                <strong>
                  Joining Date:
                </strong>{" "}
                {offer.joining_date
                  ? new Date(
                      offer.joining_date
                    ).toLocaleDateString()
                  : "Not specified"}
              </p>

              <p>
                <strong>
                  Status:
                </strong>{" "}
                {offer.status}
              </p>

              {offer.offer_letter_url && (
                <p>
                  <strong>
                    Offer Letter:
                  </strong>{" "}
                  <a
                    href={
                      offer.offer_letter_url
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    View
                  </a>
                </p>
              )}

              <p>
                <strong>
                  Created:
                </strong>{" "}
                {offer.created_at
                  ? new Date(
                      offer.created_at
                    ).toLocaleString()
                  : "—"}
              </p>

              <p>
                <strong>
                  Updated:
                </strong>{" "}
                {offer.updated_at
                  ? new Date(
                      offer.updated_at
                    ).toLocaleString()
                  : "—"}
              </p>

              <div className="ai-result">
                <h4>
                  Update Status
                </h4>

                <select
                  value={
                    offer.status || ""
                  }
                  disabled={
                    updatingId ===
                    offer.id
                  }
                  onChange={(event) =>
                    updateOfferStatus(
                      offer.id,
                      event.target.value
                    )
                  }
                >
                  {OFFER_STATUSES.map(
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
            </div>
          ))}
        </div>

      </main>
    </div>
  );
}

export default PlacementOffers;