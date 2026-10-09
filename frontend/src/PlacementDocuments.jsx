import { useEffect, useState } from "react";

const API_BASE_URL = "http://127.0.0.1:8000";

function PlacementDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const token =
    localStorage.getItem("campuslink_token") || "";

  const loadDocuments = async () => {
    if (!token) {
      setMessage("Please login first.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/documents/my`,
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
            "Unable to load documents."
        );
      }

      setDocuments(
        Array.isArray(data) ? data : []
      );
    } catch (error) {
      console.error(error);

      setMessage(
        error.message ||
          "Unable to load documents."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const downloadDocument = async (
    documentId,
    filename
  ) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/documents/${documentId}/download`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const data =
          await response.json();

        throw new Error(
          data.detail ||
            "Unable to download document."
        );
      }

      const blob =
        await response.blob();

      const url =
        window.URL.createObjectURL(
          blob
        );

      const link =
        document.createElement("a");

      link.href = url;
      link.download =
        filename ||
        `document-${documentId}`;

      document.body.appendChild(
        link
      );

      link.click();

      link.remove();

      window.URL.revokeObjectURL(
        url
      );
    } catch (error) {
      console.error(error);

      setMessage(
        error.message ||
          "Unable to download document."
      );
    }
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <main className="page-content">
          <div className="page-card">
            <h2>
              Placement Documents
            </h2>

            <p>
              Loading documents...
            </p>
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
                Placement Documents
              </h2>

              <p>
                View and download placement
                documents uploaded to CampusLink.
              </p>
            </div>

            <button
              type="button"
              className="primary-btn"
              onClick={loadDocuments}
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
          documents.length === 0 && (
            <div className="page-card">
              <h3>
                No Documents Found
              </h3>

              <p>
                There are currently no
                placement documents.
              </p>
            </div>
          )}

        <div className="dashboard-grid">
          {documents.map(
            (document) => (
              <div
                key={document.id}
                className="dashboard-card"
              >
                <h3>
                  {document.original_filename}
                </h3>

                <p>
                  <strong>
                    Document ID:
                  </strong>{" "}
                  {document.id}
                </p>

                <p>
                  <strong>
                    Offer ID:
                  </strong>{" "}
                  {document.offer_id}
                </p>

                <p>
                  <strong>
                    Uploaded By:
                  </strong>{" "}
                  {document.uploaded_by}
                </p>

                <p>
                  <strong>
                    Type:
                  </strong>{" "}
                  {document.document_type}
                </p>

                <p>
                  <strong>
                    Content Type:
                  </strong>{" "}
                  {document.content_type}
                </p>

                <p>
                  <strong>
                    Status:
                  </strong>{" "}
                  {document.status}
                </p>

                <p>
                  <strong>
                    Created:
                  </strong>{" "}
                  {document.created_at
                    ? new Date(
                        document.created_at
                      ).toLocaleString()
                    : "—"}
                </p>

                <button
                  type="button"
                  className="primary-btn"
                  onClick={() =>
                    downloadDocument(
                      document.id,
                      document.original_filename
                    )
                  }
                >
                  Download
                </button>
              </div>
            )
          )}
        </div>

      </main>
    </div>
  );
}

export default PlacementDocuments;