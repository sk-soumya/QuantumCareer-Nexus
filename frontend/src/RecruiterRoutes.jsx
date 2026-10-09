import {
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import {
  RecruiterCompany as CompanyModule,
  RecruiterJobs,
  RecruiterApplications,
  RecruiterInterviews,
  RecruiterOffers,
  RecruiterNotifications,
} from "./RecruiterModules";

import RecruiterAICandidates from "./RecruiterAICandidates";

function RecruiterRoutes() {
  return (
    <Routes>
      <Route
        path="company"
        element={
          <CompanyModule />
        }
      />

      <Route
        path="jobs"
        element={
          <RecruiterJobs />
        }
      />

      <Route
        path="applications"
        element={
          <RecruiterApplications />
        }
      />

      <Route
        path="ai-candidates"
        element={
          <RecruiterAICandidates />
        }
      />

      <Route
        path="interviews"
        element={
          <RecruiterInterviews />
        }
      />

      <Route
        path="offers"
        element={
          <RecruiterOffers />
        }
      />

      <Route
        path="notifications"
        element={
          <RecruiterNotifications />
        }
      />

      <Route
        path="*"
        element={
          <Navigate
            to="/recruiter"
            replace
          />
        }
      />
    </Routes>
  );
}

export default RecruiterRoutes;