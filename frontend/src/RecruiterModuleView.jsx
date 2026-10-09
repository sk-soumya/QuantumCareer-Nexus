import { useLocation } from "react-router-dom";

import {
  RecruiterCompany,
  RecruiterJobs,
  RecruiterApplications,
  RecruiterInterviews,
  RecruiterOffers,
  RecruiterNotifications,
} from "./RecruiterModules";

import RecruiterAICandidates from "./RecruiterAICandidates";

export default function RecruiterModuleView() {
  const location = useLocation();

  const path = location.pathname;

  if (path === "/recruiter/company") {
    return <RecruiterCompany />;
  }

  if (path === "/recruiter/jobs") {
    return <RecruiterJobs />;
  }

  if (path === "/recruiter/applications") {
    return <RecruiterApplications />;
  }

  if (path === "/recruiter/ai-candidates") {
    return <RecruiterAICandidates />;
  }

  if (path === "/recruiter/interviews") {
    return <RecruiterInterviews />;
  }

  if (path === "/recruiter/offers") {
    return <RecruiterOffers />;
  }

  if (path === "/recruiter/notifications") {
    return <RecruiterNotifications />;
  }

  return null;
}