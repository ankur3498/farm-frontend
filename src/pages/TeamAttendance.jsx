import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const IST = "Asia/Kolkata";

const fmtTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: IST }) : "—";

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", weekday: "short", timeZone: IST });

const fmtDateInput = (d) => {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const isSameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
const roleLabel = (role) => (role || "").split("_").map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ");
const initials = (name) => name?.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

const dayCell = (record, dayStr, todayStr) => {
  if (record?.editRequest?.requested && record.editRequest.status === "pending") return { letter: "?", style: "bg-yellow-100 text-yellow-700", title: "Edit pending" };
  if (record?.leaveRequest?.requested && record.leaveRequest.status === "pending") return { letter: "?", style: "bg-blue-100 text-blue-700", title: "Leave pending" };
  if (record?.advanceSalaryRequest?.requested && record.advanceSalaryRequest.status === "pending") return { letter: "$", style: "bg-amber-100 text-amber-800", title: "Advance requested" };
  if (record?.status === "leave") return { letter: "L", style: "bg-purple-100 text-purple-700", title: "On leave" };
  if (record?.status === "half-day") return { letter: "H", style: "bg-orange-100 text-orange-700", title: "Half day" };
  if (record) return { letter: "P", style: "bg-green-100 text-green-700", title: "Present" };
  if (dayStr > todayStr) return { letter: "", style: "bg-gray-50 text-gray-300", title: "Upcoming" };
  return { letter: "A", style: "bg-red-100 text-red-700", title: "Absent" };
};

const dayStatus = (record, dayStr, todayStr) => {
  if (record?.editRequest?.requested && record.editRequest.status === "pending") return { label: "Edit Pending", style: "bg-yellow-100 text-yellow-700" };
  if (record?.leaveRequest?.requested && record.leaveRequest.status === "pending") return { label: "Leave Pending", style: "bg-blue-100 text-blue-700" };
  if (record) return { label: record.status === "leave" ? "On Leave" : record.status === "half-day" ? "Half Day" : "Present", style: record.status === "leave" ? "bg-purple-100 text-purple-700" : "bg-green-100 text-green-700" };
  if (dayStr > todayStr) return { label: "Upcoming", style: "bg-gray-50 text-gray-400" };
  return { label: "Absent", style: "bg-red-100 text-red-700" };
};

const TeamAttendance = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const now = new Date();
  const isPrivileged = ["admin", "manager_operations"].includes(user?.role);

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [staffList, setStaffList] = useState([]);
  const [monthRecords, setMonthRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewLoadingId, setReviewLoadingId] = useState(null);

  useEffect(() => {
    if (!isPrivileged) return;
    api.get("/users").then((res) => setStaffList(res.data.users || [])).catch(() => {});
  }, [isPrivileged]);

  const fetchMonth = useCallback(async () => {
    if (!isPrivileged) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/attendance?month=${month}&year=${year}`);
      setMonthRecords(res.data.records || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load attendance");
    } finally {
      setLoading(false);
    }
  }, [isPrivileged, month, year]);

  useEffect(() => {
    fetchMonth();
  }, [fetchMonth]);

  if (!isPrivileged) {
    return (
      <div className="px-4 md:px-8 py-6 md:py-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          <p className="text-3xl mb-2">🔒</p>
          <p className="font-medium text-gray-700">Not authorized</p>
          <p className="text-sm text-gray-500 mt-1">Only admin and managers can view team attendance.</p>
        </div>
      </div>
    );
  }

  const reviewRequest = async (record, action) => {
    setReviewLoadingId(record._id);
    try {
      await api.put(`/attendance/${record._id}/edit-request/review`, { action });
      fetchMonth();
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${action} edit request`);
    } finally {
      setReviewLoadingId(null);
    }
  };

  const reviewLeave = async (record, action) => {
    setReviewLoadingId(record._id);
    try {
      await api.put(`/attendance/${record._id}/leave-request/review`, { action });
      fetchMonth();
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${action} leave request`);
    } finally {
      setReviewLoadingId(null);
    }
  };

  const reviewAdvanceSalary = async (record, action) => {
    setReviewLoadingId(record._id);
    try {
      await api.put(`/attendance/${record._id}/advance-salary/review`, { action });
      fetchMonth();
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${action} advance salary request`);
    } finally {
      setReviewLoadingId(null);
    }
  };

  const todayStr = fmtDateInput(now);
  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();
  const todayObj = now;

  const pendingRequests = monthRecords.filter((r) => r.editRequest?.requested && r.editRequest.status === "pending");
  const pendingLeaves = monthRecords.filter((r) => r.leaveRequest?.requested && r.leaveRequest.status === "pending");
  const pendingAdvance = monthRecords.filter((r) => r.advanceSalaryRequest?.requested && r.advanceSalaryRequest.status === "pending");

  const todayRows = staffList.map((s) => {
    const record = monthRecords.find((r) => String(r.user?._id) === String(s._id) && isSameDay(r.date, todayObj));
    return { staff: s, status: dayStatus(record, todayStr, todayStr) };
  });
  const presentToday = todayRows.filter((r) => r.status.label === "Present" || r.status.label === "Half Day").length;
  const absentToday = todayRows.filter((r) => r.status.label === "Absent").length;
  const leaveToday = todayRows.filter((r) => r.status.label === "On Leave").length;

  const daysInMonth = new Date(year, month, 0).getDate();
  const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const changeMonth = (delta) => {
    let m = month + delta, y = year;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setMonth(m);
    setYear(y);
  };

  const goToDetail = (staff) => {
    navigate(`/team-attendance/${staff._id}?date=${isCurrentMonth ? todayStr : fmtDateInput(new Date(year, month - 1, 1))}`);
  };

  return (
    <div className="px-4 md:px-8 py-6 md:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Team Attendance</h1>
          <p className="text-sm text-gray-500 mt-0.5">Monthly overview — click a staff member to open their full record</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => changeMonth(-1)} className="w-8 h-8 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 transition">‹</button>
          <span className="text-sm font-medium text-gray-700 w-32 text-center">{MONTH_NAMES[month - 1]} {year}</span>
          <button onClick={() => changeMonth(1)} className="w-8 h-8 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 transition">›</button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>
      )}

      {isCurrentMonth && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: "Total Staff", value: staffList.length, color: "text-gray-800" },
            { label: "Present Today", value: presentToday, color: "text-green-600" },
            { label: "Absent Today", value: absentToday, color: "text-red-600" },
            { label: "On Leave Today", value: leaveToday, color: "text-purple-600" },
            { label: "Pending Reviews", value: pendingRequests.length + pendingLeaves.length + pendingAdvance.length, color: "text-yellow-600" },
          ].map((c) => (
            <div key={c.label} className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3">
              <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
            </div>
          ))}
        </div>
      )}

      {pendingAdvance.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-4">
          <h2 className="text-sm font-semibold text-amber-800 mb-3">💵 Pending Advance Salary Requests — {MONTH_NAMES[month - 1]}</h2>
          <div className="space-y-3">
            {pendingAdvance.map((r) => (
              <div key={r._id} className="bg-white rounded-lg border border-amber-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-sm">
                  <p className="font-semibold text-gray-800">{r.user?.name} — Requested ₹{r.advanceSalaryRequest.amount?.toLocaleString("en-IN")}</p>
                  <p className="text-gray-500 text-xs mt-0.5">Date: {fmtDate(r.date)}</p>
                  <p className="text-gray-600 text-xs mt-0.5 italic">Reason: "{r.advanceSalaryRequest.reason}"</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => reviewAdvanceSalary(r, "approve")} disabled={reviewLoadingId === r._id} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-farm-600 text-white hover:bg-farm-700 disabled:opacity-50 transition">
                    Approve ₹{r.advanceSalaryRequest.amount}
                  </button>
                  <button onClick={() => reviewAdvanceSalary(r, "reject")} disabled={reviewLoadingId === r._id} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition">
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingRequests.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 mb-4">
          <h2 className="text-sm font-semibold text-yellow-800 mb-3">⏳ Pending Edit Requests — {MONTH_NAMES[month - 1]}</h2>
          <div className="space-y-3">
            {pendingRequests.map((r) => (
              <div key={r._id} className="bg-white rounded-lg border border-yellow-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-sm">
                  <p className="font-medium text-gray-800">{r.user?.name} — {fmtDate(r.date)}</p>
                  <p className="text-gray-500 mt-0.5">Proposed: In {fmtTime(r.editRequest.proposedTimeIn)} · Out {fmtTime(r.editRequest.proposedTimeOut)}</p>
                  <p className="text-gray-400 text-xs mt-0.5 italic">"{r.editRequest.reason}"</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => reviewRequest(r, "approve")} disabled={reviewLoadingId === r._id} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-farm-50 text-farm-700 hover:bg-farm-100 disabled:opacity-50 transition">Approve</button>
                  <button onClick={() => reviewRequest(r, "reject")} disabled={reviewLoadingId === r._id} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition">Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingLeaves.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-blue-800 mb-3">🗓️ Pending Leave Requests — {MONTH_NAMES[month - 1]}</h2>
          <div className="space-y-3">
            {pendingLeaves.map((r) => (
              <div key={r._id} className="bg-white rounded-lg border border-blue-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-sm">
                  <p className="font-medium text-gray-800">{r.user?.name} — {fmtDate(r.date)}</p>
                  <p className="text-gray-400 text-xs mt-0.5 italic">"{r.leaveRequest.reason}"</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => reviewLeave(r, "approve")} disabled={reviewLoadingId === r._id} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-farm-50 text-farm-700 hover:bg-farm-100 disabled:opacity-50 transition">Approve</button>
                  <button onClick={() => reviewLeave(r, "reject")} disabled={reviewLoadingId === r._id} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition">Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-700">{MONTH_NAMES[month - 1]} {year} — click a name for full record</h2>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 inline-block" /> Present</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 inline-block" /> Absent</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-100 inline-block" /> Leave</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100 inline-block" /> Advance</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-100 inline-block" /> Pending</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-gray-50 border-b border-r border-gray-200 px-4 py-2.5 text-left font-medium text-gray-500 min-w-[180px]">
                  Staff
                </th>
                {dayNumbers.map((d) => (
                  <th key={d} className="bg-gray-50 border-b border-gray-200 px-1 py-2.5 font-medium text-gray-500 w-8 text-center">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={dayNumbers.length + 1} className="px-4 py-8 text-center text-gray-400">Loading...</td>
                </tr>
              ) : staffList.length === 0 ? (
                <tr>
                  <td colSpan={dayNumbers.length + 1} className="px-4 py-8 text-center text-gray-400">No staff found</td>
                </tr>
              ) : (
                staffList.map((staff) => {
                  return (
                    <tr key={staff._id} className="border-b border-gray-100 hover:bg-gray-50/60">
                      <td
                        onClick={() => goToDetail(staff)}
                        className="sticky left-0 z-10 bg-white border-r border-gray-200 px-4 py-2.5 cursor-pointer hover:bg-farm-50 transition"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-farm-100 text-farm-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {initials(staff.name)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800 leading-tight">{staff.name}</p>
                            <p className="text-[10px] text-gray-400">{roleLabel(staff.role)}</p>
                          </div>
                        </div>
                      </td>
                      {dayNumbers.map((d) => {
                        const dayDate = new Date(year, month - 1, d);
                        const dayStr = fmtDateInput(dayDate);
                        const record = monthRecords.find(
                          (r) => String(r.user?._id) === String(staff._id) && isSameDay(r.date, dayDate)
                        );
                        const cell = dayCell(record, dayStr, todayStr);
                        return (
                          <td key={d} className="p-0.5 text-center">
                            <span
                              title={cell.title}
                              className={`w-6 h-6 rounded inline-flex items-center justify-center font-semibold text-[10px] ${cell.style}`}
                            >
                              {cell.letter}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TeamAttendance;