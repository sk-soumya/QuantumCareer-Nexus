import { useEffect, useState } from "react";

const API_BASE_URL = "http://127.0.0.1:8000";

function PlacementScheduling() {
  const [rounds, setRounds] = useState([]);
  const [interviewers, setInterviewers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);

  const [selectedRoundId, setSelectedRoundId] =
    useState("");
  const [selectedInterviewerId, setSelectedInterviewerId] =
    useState("");
  const [selectedRoomId, setSelectedRoomId] =
    useState("");
  const [selectedTimeSlotId, setSelectedTimeSlotId] =
    useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [autoScheduling, setAutoScheduling] =
    useState(false);

  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);

  const token =
    localStorage.getItem(
      "campuslink_token"
    ) || "";

  useEffect(() => {
    loadData();
  }, []);

  const authHeaders = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };

  const normalizeArray = (data) => {
    if (Array.isArray(data)) {
      return data;
    }

    if (Array.isArray(data?.items)) {
      return data.items;
    }

    if (Array.isArray(data?.results)) {
      return data.results;
    }

    return [];
  };

  const loadData = async () => {
    if (!token) {
      setMessage(
        "Please login as a Placement Officer."
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const [
        roundsResponse,
        interviewersResponse,
        roomsResponse,
        slotsResponse,
      ] = await Promise.all([
        fetch(
          `${API_BASE_URL}/selection-rounds/`,
          {
            headers: authHeaders,
          }
        ),
        fetch(
          `${API_BASE_URL}/interviewers/`,
          {
            headers: authHeaders,
          }
        ),
        fetch(
          `${API_BASE_URL}/rooms/`,
          {
            headers: authHeaders,
          }
        ),
        fetch(
          `${API_BASE_URL}/time-slots/`,
          {
            headers: authHeaders,
          }
        ),
      ]);

      const [
        roundsData,
        interviewersData,
        roomsData,
        slotsData,
      ] = await Promise.all([
        roundsResponse.json(),
        interviewersResponse.json(),
        roomsResponse.json(),
        slotsResponse.json(),
      ]);

      if (!roundsResponse.ok) {
        throw new Error(
          roundsData.detail ||
            "Unable to load selection rounds."
        );
      }

      if (!interviewersResponse.ok) {
        throw new Error(
          interviewersData.detail ||
            "Unable to load interviewers."
        );
      }

      if (!roomsResponse.ok) {
        throw new Error(
          roomsData.detail ||
            "Unable to load rooms."
        );
      }

      if (!slotsResponse.ok) {
        throw new Error(
          slotsData.detail ||
            "Unable to load time slots."
        );
      }

      const roundList =
        normalizeArray(roundsData);

      setRounds(roundList);
      setInterviewers(
        normalizeArray(interviewersData)
      );
      setRooms(
        normalizeArray(roomsData)
      );
      setTimeSlots(
        normalizeArray(slotsData)
      );

      const pendingRound =
        roundList.find(
          (round) =>
            round.status === "PENDING"
        );

      if (pendingRound) {
        setSelectedRoundId(
          String(pendingRound.id)
        );
      }
    } catch (error) {
      console.error(error);

      setMessage(
        error.message ||
          "Unable to load scheduling data."
      );
    } finally {
      setLoading(false);
    }
  };

  const scheduleInterview = async () => {
    if (
      !selectedRoundId ||
      !selectedInterviewerId ||
      !selectedRoomId ||
      !selectedTimeSlotId
    ) {
      setMessage(
        "Please select a round, interviewer, room and time slot."
      );
      return;
    }

    setSubmitting(true);
    setMessage("");
    setResult(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/schedules/`,
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
            selection_round_id:
              Number(selectedRoundId),

            interviewer_id:
              Number(
                selectedInterviewerId
              ),

            room_id:
              Number(selectedRoomId),

            time_slot_id:
              Number(
                selectedTimeSlotId
              ),

            notes:
              notes.trim() || null,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Unable to create schedule."
        );
      }

      setResult(data);

      setMessage(
        "Interview scheduled successfully."
      );

      setNotes("");

      await loadData();
    } catch (error) {
      console.error(error);

      setMessage(
        error.message ||
          "Unable to create schedule."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const automaticSchedule = async () => {
    if (!selectedRoundId) {
      setMessage(
        "Please select a selection round first."
      );
      return;
    }

    setAutoScheduling(true);
    setMessage("");
    setResult(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/scheduler/generate/${selectedRoundId}`,
        {
          method: "POST",
          headers: {
            Accept:
              "application/json",
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Automatic scheduling failed."
        );
      }

      setResult(data);

      setMessage(
        "Automatic interview scheduling completed."
      );

      await loadData();
    } catch (error) {
      console.error(error);

      setMessage(
        error.message ||
          "Automatic scheduling failed."
      );
    } finally {
      setAutoScheduling(false);
    }
  };

  const getRoundLabel = (round) => {
    return (
      `#${round.id} — ` +
      `${round.title || "Selection Round"}` +
      ` (${round.status || "UNKNOWN"})`
    );
  };

  const getInterviewerLabel = (
    interviewer
  ) => {
    return (
      interviewer.name ||
      interviewer.full_name ||
      interviewer.email ||
      `Interviewer #${interviewer.id}`
    );
  };

  const getRoomLabel = (room) => {
    return (
      room.name ||
      room.room_number ||
      room.code ||
      `Room #${room.id}`
    );
  };

  const getTimeSlotLabel = (
    slot
  ) => {
    const date =
      slot.slot_date ||
      slot.date ||
      slot.slotDate ||
      "";

    const start =
      slot.start_time ||
      slot.startTime ||
      "";

    const end =
      slot.end_time ||
      slot.endTime ||
      "";

    const parts = [
      date,
      start && end
        ? `${start} - ${end}`
        : start,
    ].filter(Boolean);

    if (parts.length) {
      return parts.join(" | ");
    }

    return `Time Slot #${slot.id}`;
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <main className="page-content">
          <div className="page-card">
            <h2>
              Interview Scheduling
            </h2>

            <p>
              Loading scheduling resources...
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <main className="page-content">

        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="page-card">
          <h2>
            Interview Scheduling
          </h2>

          <p>
            Manually schedule an interview or
            let CAMPUSLINK automatically find
            a conflict-free assignment.
          </p>
        </div>

        {/* ==================================================
            MESSAGE
        ================================================== */}

        {message && (
          <div className="page-card">
            <p>{message}</p>
          </div>
        )}

        {/* ==================================================
            SCHEDULING FORM
        ================================================== */}

        <div className="page-card">

          <h3>
            Manual Scheduling
          </h3>

          <label>
            Selection Round
          </label>

          <select
            value={selectedRoundId}
            onChange={(event) =>
              setSelectedRoundId(
                event.target.value
              )
            }
          >
            <option value="">
              -- Select Selection Round --
            </option>

            {rounds
              .filter(
                (round) =>
                  round.status ===
                  "PENDING"
              )
              .map((round) => (
                <option
                  key={round.id}
                  value={round.id}
                >
                  {getRoundLabel(round)}
                </option>
              ))}
          </select>

          <label>
            Interviewer
          </label>

          <select
            value={
              selectedInterviewerId
            }
            onChange={(event) =>
              setSelectedInterviewerId(
                event.target.value
              )
            }
          >
            <option value="">
              -- Select Interviewer --
            </option>

            {interviewers.map(
              (interviewer) => (
                <option
                  key={interviewer.id}
                  value={interviewer.id}
                >
                  {getInterviewerLabel(
                    interviewer
                  )}
                </option>
              )
            )}
          </select>

          <label>
            Room
          </label>

          <select
            value={selectedRoomId}
            onChange={(event) =>
              setSelectedRoomId(
                event.target.value
              )
            }
          >
            <option value="">
              -- Select Room --
            </option>

            {rooms.map((room) => (
              <option
                key={room.id}
                value={room.id}
              >
                {getRoomLabel(room)}
              </option>
            ))}
          </select>

          <label>
            Time Slot
          </label>

          <select
            value={
              selectedTimeSlotId
            }
            onChange={(event) =>
              setSelectedTimeSlotId(
                event.target.value
              )
            }
          >
            <option value="">
              -- Select Time Slot --
            </option>

            {timeSlots.map(
              (slot) => (
                <option
                  key={slot.id}
                  value={slot.id}
                >
                  {getTimeSlotLabel(
                    slot
                  )}
                </option>
              )
            )}
          </select>

          <label>
            Notes
          </label>

          <textarea
            rows="4"
            value={notes}
            onChange={(event) =>
              setNotes(
                event.target.value
              )
            }
            placeholder="Optional scheduling notes"
          />

          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              marginTop: "16px",
            }}
          >
            <button
              type="button"
              className="primary-btn"
              onClick={
                scheduleInterview
              }
              disabled={submitting}
            >
              {submitting
                ? "Scheduling..."
                : "Create Schedule"}
            </button>

            <button
              type="button"
              className="primary-btn"
              onClick={
                automaticSchedule
              }
              disabled={
                autoScheduling ||
                !selectedRoundId
              }
            >
              {autoScheduling
                ? "Finding Slot..."
                : "Auto Schedule"}
            </button>
          </div>
        </div>

        {/* ==================================================
            RESULT
        ================================================== */}

        {result && (
          <div className="page-card">

            <h3>
              Schedule Created
            </h3>

            <p>
              <strong>
                Schedule ID:
              </strong>{" "}
              {result.schedule_id ||
                result.id ||
                "—"}
            </p>

            <p>
              <strong>
                Selection Round:
              </strong>{" "}
              {result.selection_round_id ||
                selectedRoundId}
            </p>

            {result.student_id && (
              <p>
                <strong>
                  Student:
                </strong>{" "}
                {result.student_id}
              </p>
            )}

            {result.interviewer_id && (
              <p>
                <strong>
                  Interviewer:
                </strong>{" "}
                {result.interviewer_id}
              </p>
            )}

            {result.room_id && (
              <p>
                <strong>
                  Room:
                </strong>{" "}
                {result.room_id}
              </p>
            )}

            {result.time_slot_id && (
              <p>
                <strong>
                  Time Slot:
                </strong>{" "}
                {result.time_slot_id}
              </p>
            )}

            {result.status && (
              <p>
                <strong>
                  Status:
                </strong>{" "}
                {result.status}
              </p>
            )}
          </div>
        )}

        {/* ==================================================
            AVAILABLE ROUNDS
        ================================================== */}

        <div className="page-card">

          <h3>
            Selection Rounds
          </h3>

          {rounds.length === 0 ? (
            <p>
              No selection rounds found.
            </p>
          ) : (
            rounds.map((round) => (
              <div
                key={round.id}
                style={{
                  padding:
                    "12px 0",
                  borderBottom:
                    "1px solid #ddd",
                }}
              >
                <strong>
                  {getRoundLabel(round)}
                </strong>

                {round.scheduled_at && (
                  <p>
                    Scheduled:{" "}
                    {new Date(
                      round.scheduled_at
                    ).toLocaleString()}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

      </main>
    </div>
  );
}

export default PlacementScheduling;