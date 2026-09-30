import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Staff from "./pages/Staff.jsx";
import Attendance from "./pages/Attendance.jsx";
import TeamAttendance from "./pages/TeamAttendance.jsx";
import StaffAttendanceDetail from "./pages/StaffAttendanceDetail.jsx";
import WorkTasks from "./pages/WorkTasks.jsx";
import WorkManage from "./pages/WorkManage.jsx";
import ScheduleBuilder from "./pages/ScheduleBuilder.jsx";
import Assets from "./pages/Assets.jsx";
import PoultryModule from "./pages/PoultryModule.jsx";
import Animals from "./pages/Animals.jsx";
import Expenses from "./pages/Expenses.jsx";
import FieldPatches from "./pages/FieldPatches.jsx";
import Financials from "./pages/Financials.jsx";
import Layout from "./layout/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/field-patches" element={<FieldPatches />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/financials" element={<Financials />} />
        <Route path="/staff" element={<Staff />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/team-attendance" element={<TeamAttendance />} />
        <Route path="/team-attendance/:staffId" element={<StaffAttendanceDetail />} />
        <Route path="/my-tasks" element={<WorkTasks />} />
        <Route path="/work-management" element={<WorkManage />} />
        <Route path="/schedule" element={<ScheduleBuilder />} />
        <Route path="/assets" element={<Assets />} />
        <Route path="/poultry/*" element={<PoultryModule />} />
        <Route path="/poultry" element={<PoultryModule />} />
        <Route path="/animals" element={<Animals />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;