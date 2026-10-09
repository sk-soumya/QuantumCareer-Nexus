import { useEffect, useState } from "react";

const API_BASE_URL = "http://127.0.0.1:8000";

function RecruiterCompany() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  const token =
    localStorage.getItem("campuslink_token") || "";

  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };

  const loadCompanies = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/companies/`,
        { headers }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Unable to load companies."
        );
      }

      setCompanies(
        Array.isArray(data) ? data : []
      );
    } catch (error) {
      setMessage(
        error.message ||
          "Unable to load companies."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const createCompany = async () => {
    if (!name.trim()) {
      setMessage(
        "Company name is required."
      );
      return;
    }

    try {
      setMessage("");

      const response = await fetch(
        `${API_BASE_URL}/companies/`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Accept:
              "application/json",
            Authorization:
              `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: name.trim(),
            industry:
              industry.trim() || null,
            website:
              website.trim() || null,
            location:
              location.trim() || null,
            description:
              description.trim() || null,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Unable to create company."
        );
      }

      setCompanies((current) => [
        ...current,
        data,
      ]);

      setName("");
      setIndustry("");
      setWebsite("");
      setLocation("");
      setDescription("");

      setMessage(
        "Company created successfully."
      );
    } catch (error) {
      setMessage(
        error.message ||
          "Unable to create company."
      );
    }
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <DashboardHeader />
        <main className="page-content">
          <div className="page-card">
            Loading companies...
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <main className="page-content">

        <div className="page-card">
          <h2>Company</h2>

          <p>
            Manage recruiter company information.
          </p>

          {message && (
            <p>{message}</p>
          )}
        </div>

        <div className="page-card">
          <h3>Create Company</h3>

          <input
            placeholder="Company name"
            value={name}
            onChange={(e) =>
              setName(e.target.value)
            }
          />

          <input
            placeholder="Industry"
            value={industry}
            onChange={(e) =>
              setIndustry(e.target.value)
            }
          />

          <input
            placeholder="Website"
            value={website}
            onChange={(e) =>
              setWebsite(e.target.value)
            }
          />

          <input
            placeholder="Location"
            value={location}
            onChange={(e) =>
              setLocation(e.target.value)
            }
          />

          <textarea
            rows="4"
            placeholder="Description"
            value={description}
            onChange={(e) =>
              setDescription(e.target.value)
            }
          />

          <button
            type="button"
            className="primary-btn"
            onClick={createCompany}
          >
            Create Company
          </button>
        </div>

        <div className="dashboard-grid">
          {companies.map((company) => (
            <div
              key={company.id}
              className="dashboard-card"
            >
              <h3>{company.name}</h3>

              <p>
                <strong>ID:</strong>{" "}
                {company.id}
              </p>

              {company.industry && (
                <p>
                  <strong>
                    Industry:
                  </strong>{" "}
                  {company.industry}
                </p>
              )}

              {company.location && (
                <p>
                  <strong>
                    Location:
                  </strong>{" "}
                  {company.location}
                </p>
              )}

              {company.website && (
                <p>
                  <strong>
                    Website:
                  </strong>{" "}
                  {company.website}
                </p>
              )}

              {company.description && (
                <p>
                  {company.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default RecruiterCompany;