import React, { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
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

const toDatetimeLocal = (iso) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");
const isSameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
const roleLabel = (role) => (role || "").split("_").map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ");
const initials = (name) => name?.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

const dayStatus = (record, dayStr, todayStr) => {
  if (record?.editRequest?.requested && record.editRequest.status === "pending") return { label: "Edit Pending", style: "bg-yellow-100 text-yellow-700" };
  if (record?.leaveRequest?.requested && record.leaveRequest.status === "pending") return { label: "Leave Pending", style: "bg-blue-100 text-blue-700" };
  if (record) return { label: record.status === "leave" ? "On Leave" : record.status === "half-day" ? "Half Day" : "Present", style: record.status === "leave" ? "bg-purple-100 text-purple-700" : "bg-green-100 text-green-700" };
  if (dayStr > todayStr) return { label: "Upcoming", style: "bg-gray-50 text-gray-400" };
  return { label: "Absent", style: "bg-red-100 text-red-700" };
};

const StaffAttendanceDetail = () => {
  const { user } = useAuth();
  const { staffId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const now = new Date();
  const isPrivileged = ["admin", "manager_operations"].includes(user?.role);

  const initialDate = searchParams.get("date") || fmtDateInput(now);
  const initialMonth = new Date(initialDate + "T00:00:00").getMonth() + 1;
  const initialYear = new Date(initialDate + "T00:00:00").getFullYear();

  const [staff, setStaff] = useState(null);
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [records, setRecords] = useState([]);
  const [salary, setSalary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({ timeIn: "", timeOut: "", status: "present" });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");

  const fetchAll = useCallback(async () => {
    if (!isPrivileged) return;
    setLoading(true);
    setError("");
    try {
      const [staffRes, recRes, salRes] = await Promise.all([
        api.get(`/users/${staffId}`),
        api.get(`/attendance?month=${month}&year=${year}&userId=${staffId}`),
        api.get(`/attendance/salary/${staffId}?month=${month}&year=${year}`),
      ]);
      setStaff(staffRes.data);
      setRecords(recRes.data.records || []);
      setSalary(salRes.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load staff detail");
    } finally {
      setLoading(false);
    }
  }, [isPrivileged, staffId, month, year]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (!isPrivileged) {
    return (
      <div className="px-4 md:px-8 py-6 md:py-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          <p className="text-3xl mb-2">🔒</p>
          <p className="font-medium text-gray-700">Not authorized</p>
        </div>
      </div>
    );
  }

  const openEditModal = (dayDate, record) => {
    setEditModal({ dayDate, record: record || null });
    setEditForm({
      timeIn: toDatetimeLocal(record?.timeIn?.time),
      timeOut: toDatetimeLocal(record?.timeOut?.time),
      status: record?.status || "present",
    });
    setEditError("");
  };

  const submitAdminEdit = async (e) => {
    e.preventDefault();
    setEditError("");
    setEditSubmitting(true);
    try {
      const timeIn = editForm.timeIn ? { time: new Date(editForm.timeIn).toISOString() } : undefined;
      const timeOut = editForm.timeOut ? { time: new Date(editForm.timeOut).toISOString() } : undefined;

      if (editModal.record?._id) {
        await api.put(`/attendance/${editModal.record._id}`, { timeIn, timeOut, status: editForm.status });
      } else {
        await api.post("/attendance/mark", {
          userId: staffId,
          date: fmtDateInput(editModal.dayDate),
          timeIn, timeOut, status: editForm.status,
        });
      }
      setEditModal(null);
      fetchAll();
    } catch (err) {
      setEditError(err.response?.data?.message || "Failed to save attendance");
    } finally {
      setEditSubmitting(false);
    }
  };

  const daysInMonth = new Date(year, month, 0).getDate();
  const todayStr = fmtDateInput(now);
  const calendarRows = Array.from({ length: daysInMonth }, (_, i) => {
    const dd = new Date(year, month - 1, i + 1);
    const ds = fmtDateInput(dd);
    const record = records.find((r) => isSameDay(r.date, dd));
    return { dayDate: dd, dayStr: ds, record };
  });

  const changeMonth = (delta) => {
    let m = month + delta, y = year;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setMonth(m);
    setYear(y);
  };

  return (
    <div className="px-4 md:px-8 py-6 md:py-8">
      <button
        onClick={() => navigate("/team-attendance")}
        className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1"
      >
        ← Back to Team Attendance
      </button>

      {loading && !staff ? (
        <div className="text-center text-gray-400 py-16">Loading...</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
            <div className="px-6 py-5 bg-gradient-to-r from-farm-600 to-farm-700 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center font-semibold text-lg">
                  {initials(staff?.name)}
                </div>
                <div>
                  <h1 className="text-white font-semibold text-lg">{staff?.name}</h1>
                  <p className="text-farm-100 text-xs mt-0.5">{roleLabel(staff?.role)} · {staff?.mobile} · {staff?.email}</p>
                </div>
              </div>
              {salary && (
                <div className="text-right">
                  <p className="text-farm-100 text-xs">Net Payable ({MONTH_NAMES[month - 1]} {year})</p>
                  <p className="text-white text-2xl font-bold">₹{salary.netSalary.toLocaleString("en-IN")}</p>
                </div>
              )}
            </div>

            <div className="p-6">
              {salary ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div><p className="text-xs text-gray-400">Present</p><p className="text-lg font-semibold text-gray-800">{salary.attendance.presentDays}</p></div>
                    <div><p className="text-xs text-gray-400">Leave</p><p className="text-lg font-semibold text-gray-800">{salary.attendance.leaveDays}</p></div>
                    <div><p className="text-xs text-gray-400">Absent</p><p className="text-lg font-semibold text-gray-800">{salary.attendance.absentDays}</p></div>
                    <div><p className="text-xs text-gray-400">Free leaves/month</p><p className="text-lg font-semibold text-gray-800">{salary.freeLeavesPerMonth}</p></div>
                  </div>
                  <div className="border-t border-gray-100 pt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                    {salary.isDailyWorker ? (
                      <>
                        <span className="text-gray-500">Daily Salary Rate: <span className="font-medium text-gray-700">₹{salary.perDayRate?.toLocaleString("en-IN")}/day</span></span>
                        <span className="text-gray-500">Gross Earned ({salary.attendance.presentDays} days): <span className="font-medium text-green-700">₹{salary.grossSalary?.toLocaleString("en-IN")}</span></span>
                        {salary.advanceSalaryTotal > 0 && (
                          <span className="text-gray-500">Advance Deducted: <span className="font-medium text-amber-600">−₹{salary.advanceSalaryTotal.toLocaleString("en-IN")}</span></span>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="text-gray-500">Monthly Salary: <span className="font-medium text-gray-700">₹{salary.user.monthlySalary.toLocaleString("en-IN")}</span></span>
                        <span className="text-gray-500">Deduction ({salary.deductibleAbsentDays} day{salary.deductibleAbsentDays !== 1 ? "s" : ""}): <span className="font-medium text-red-600">−₹{salary.deduction.toLocaleString("en-IN")}</span></span>
                        {salary.advanceSalaryTotal > 0 && (
                          <span className="text-gray-500">Advance Deducted: <span className="font-medium text-amber-600">−₹{salary.advanceSalaryTotal.toLocaleString("en-IN")}</span></span>
                        )}
                      </>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-red-500">Could not load salary.</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Attendance History</h3>
            <div className="flex items-center gap-2">
              <button onClick={() => changeMonth(-1)} className="w-8 h-8 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 transition">‹</button>
              <span className="text-sm font-medium text-gray-700 w-32 text-center">{MONTH_NAMES[month - 1]} {year}</span>
              <button onClick={() => changeMonth(1)} className="w-8 h-8 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 transition">›</button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
            <table className="w-full text-sm min-w-[750px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Time In</th>
                  <th className="px-4 py-3 font-medium">Time Out</th>
                  <th className="px-4 py-3 font-medium">Hours</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
                ) : (
                  calendarRows.map(({ dayDate, dayStr, record }) => {
                    const st = dayStatus(record, dayStr, todayStr);
                    return (
                      <tr key={dayStr} className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 ${dayStr === todayStr ? "bg-farm-50/40" : ""}`}>
                        <td className="px-4 py-3 text-gray-700">{fmtDate(dayDate)}</td>
                        <td className="px-4 py-3 text-gray-600">
                          <div>{fmtTime(record?.timeIn?.time)}</div>
                          {record?.timeIn?.address && <div className="text-xs text-gray-400 max-w-[160px] truncate" title={record.timeIn.address}>📍 {record.timeIn.address}</div>}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          <div>{fmtTime(record?.timeOut?.time)}</div>
                          {record?.timeOut?.address && <div className="text-xs text-gray-400 max-w-[160px] truncate" title={record.timeOut.address}>📍 {record.timeOut.address}</div>}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{record?.workedHours != null ? `${record.workedHours}h` : "—"}</td>
                        <td className="px-4 py-3"><span className={`text-xs font-medium px-2 py-1 rounded-full ${st.style}`}>{st.label}</span></td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => openEditModal(dayDate, record)}
                            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                          >
                            {record ? "Edit" : "Mark"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">{editModal.record ? "Edit Attendance" : "Mark Attendance"}</h2>
              <button onClick={() => setEditModal(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <p className="text-xs text-gray-500 mb-4">{staff?.name} — {fmtDate(editModal.dayDate)}</p>

            {editError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{editError}</div>
            )}

            <form onSubmit={submitAdminEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Time In</label>
                <input type="datetime-local" value={editForm.timeIn} onChange={(e) => setEditForm({ ...editForm, timeIn: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Time Out</label>
                <input type="datetime-local" value={editForm.timeOut} onChange={(e) => setEditForm({ ...editForm, timeOut: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-500">
                  <option value="present">Present</option>
                  <option value="half-day">Half Day</option>
                  <option value="leave">Leave</option>
                </select>
              </div>
              <button type="submit" disabled={editSubmitting}
                className="w-full bg-farm-600 hover:bg-farm-700 disabled:opacity-60 text-white font-medium rounded-lg py-2.5 text-sm mt-2 transition">
                {editSubmitting ? "Saving..." : "Save"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffAttendanceDetail;