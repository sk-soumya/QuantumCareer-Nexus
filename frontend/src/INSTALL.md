# CampusLink Enterprise UI Fix Pack

## Files
Copy these into `frontend/src/`:

- `components/EnterpriseShell.jsx`
- `components/Charts.jsx`
- `styles/enterprise.css`
- `RecruiterAICandidates.jsx` (rename from `RecruiterAICandidates.enterprise.jsx`)
- `PlacementSelectionRounds.jsx` (rename from `PlacementSelectionRounds.enterprise.jsx`)
- `PlacementAnalytics.jsx`

## 1. Import the enterprise CSS
At the top of `frontend/src/App.jsx` add:

```jsx
import "./styles/enterprise.css";
```

## 2. Import the three new pages
Add:

```jsx
import RecruiterAICandidates from "./RecruiterAICandidates";
import PlacementSelectionRounds from "./PlacementSelectionRounds";
import PlacementAnalytics from "./PlacementAnalytics";
```

## 3. Routes
Use these routes:

```jsx
<Route path="/recruiter/ai-candidates" element={<ProtectedRoute allowedRoles={["RECRUITER"]}><RecruiterAICandidates /></ProtectedRoute>} />
<Route path="/placement/selection-rounds" element={<ProtectedRoute allowedRoles={["PLACEMENT_OFFICER"]}><PlacementSelectionRounds /></ProtectedRoute>} />
<Route path="/placement/analytics" element={<ProtectedRoute allowedRoles={["PLACEMENT_OFFICER"]}><PlacementAnalytics /></ProtectedRoute>} />
```

Make sure these appear BEFORE any `/recruiter/*`, `/placement/*`, or generic catch-all route.

## 4. API base URL
Optional `frontend/.env`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## 5. Backend endpoints used

- `GET /job-drives/`
- `GET /ai/recommendations/{job_drive_id}`
- `PATCH /applications/{application_id}/status`
- `GET /selection-rounds/`
- `GET /selection-rounds/{round_id}`
- `PATCH /selection-rounds/{round_id}/status`
- `POST /scheduler/generate/{round_id}`
- `GET /placement/students`
- `GET /companies/`
- `GET /applications/`
- `GET /offers/`

## 6. Offer permission check
Your current backend should allow RECRUITER, PLACEMENT_OFFICER and ADMIN to create offers. In `backend/app/routers/offer.py`, the create endpoint should use `get_current_user` and enforce:

```python
if current_user.role not in {
    "RECRUITER",
    "PLACEMENT_OFFICER",
    "ADMIN",
}:
    raise HTTPException(
        status_code=403,
        detail="You do not have permission to create offers",
    )
```

## 7. Start

Backend:

```bat
cd C:\Users\soumy\Downloads\CAMPUSLINK\backend
python -m uvicorn app.main:app --reload
```

Frontend:

```bat
cd C:\Users\soumy\Downloads\CAMPUSLINK\frontend
npm run dev
```

No extra npm package is required by this pack; the charts are SVG/CSS based.

## 8. Optional dashboard replacements (recommended)
Use these drop-ins for the judge-facing dashboards:

- `RecruiterDashboard.jsx`
- `PlacementDashboard.jsx`
- `StudentDashboard.jsx`

Routes:

```jsx
<Route path="/recruiter" element={<ProtectedRoute allowedRoles={["RECRUITER"]}><RecruiterDashboard /></ProtectedRoute>} />
<Route path="/placement" element={<ProtectedRoute allowedRoles={["PLACEMENT_OFFICER"]}><PlacementDashboard /></ProtectedRoute>} />
<Route path="/student" element={<ProtectedRoute allowedRoles={["STUDENT"]}><StudentDashboard /></ProtectedRoute>} />
```
