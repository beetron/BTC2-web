/**
 * App Router Configuration
 */

import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { FriendListPage } from "../pages/FriendListPage";
import { LoginPage } from "../pages/LoginPage";
import { SignupPage } from "../pages/SignupPage";
import { ForgotUsernamePage } from "../pages/ForgotUsernamePage";
import { ForgotPasswordPage } from "../pages/ForgotPasswordPage";
import { SettingsPage } from "../pages/SettingsPage";
import { EditFriendsPage } from "../pages/EditFriendsPage";

export const AppRouter: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-username" element={<ForgotUsernamePage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Protected Routes */}
        <Route
          path="/friends"
          element={
            <ProtectedRoute>
              <FriendListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/edit-friends"
          element={
            <ProtectedRoute>
              <EditFriendsPage />
            </ProtectedRoute>
          }
        />

        {/* Redirect */}
        <Route path="/" element={<Navigate to="/friends" replace />} />
        <Route path="*" element={<Navigate to="/friends" replace />} />
      </Routes>
    </Router>
  );
};

export default AppRouter;
