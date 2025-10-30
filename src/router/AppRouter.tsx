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
import { ChatPage } from "../pages/ChatPage";
import { LoginPage } from "../pages/LoginPage";
import { SignupPage } from "../pages/SignupPage";
import { ForgotUsernamePage } from "../pages/ForgotUsernamePage";
import { ForgotPasswordPage } from "../pages/ForgotPasswordPage";
import { ProfilePage } from "../pages/ProfilePage";
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
          path="/chat"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
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
        <Route path="/" element={<Navigate to="/chat" replace />} />
        <Route path="*" element={<Navigate to="/chat" replace />} />
      </Routes>
    </Router>
  );
};

export default AppRouter;
