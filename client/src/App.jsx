import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./lib/auth.jsx";
import { BadgeProvider } from "./lib/badges.jsx";
import { ToastProvider } from "./components/toast.jsx";
import { ProtectedRoute } from "./components/ProtectedRoute.jsx";
import { Layout } from "./components/Layout.jsx";

import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Assets from "./pages/Assets.jsx";
import MyBookings from "./pages/MyBookings.jsx";
import Approvals from "./pages/Approvals.jsx";
import History from "./pages/History.jsx";
import AuditLogs from "./pages/AuditLogs.jsx";
import Notifications from "./pages/Notifications.jsx";
import Scan from "./pages/Scan.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route
              element={
                <ProtectedRoute>
                  <BadgeProvider>
                    <Layout />
                  </BadgeProvider>
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/assets" element={<Assets />} />
              <Route path="/my-bookings" element={<MyBookings />} />
              <Route path="/notifications" element={<Notifications />} />

              {/* Admin-only */}
              <Route
                path="/scan"
                element={
                  <ProtectedRoute adminOnly>
                    <Scan />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/approvals"
                element={
                  <ProtectedRoute adminOnly>
                    <Approvals />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/history"
                element={
                  <ProtectedRoute adminOnly>
                    <History />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/audit-logs"
                element={
                  <ProtectedRoute adminOnly>
                    <AuditLogs />
                  </ProtectedRoute>
                }
              />
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
