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
import { RootRedirect } from "../components/RootRedirect";
import { FriendListPage } from "../pages/FriendListPage";
import { MessagesPage } from "../pages/MessagesPage.tsx";
import { LoginPage } from "../pages/LoginPage";
import { SignupPage } from "../pages/SignupPage";
import { ForgotUsernamePage } from "../pages/ForgotUsernamePage";
import { ForgotPasswordPage } from "../pages/ForgotPasswordPage";
import { SettingsPage } from "../pages/SettingsPage";
import { EditFriendsPage } from "../pages/EditFriendsPage";
import { AdminRoute } from "../components/AdminRoute";
import { lazy, Suspense } from "react";
import { Center, Loader } from "@mantine/core";

// Admin pages are split into their own chunk, so regular users never
// download them
const AdminUsersPage = lazy(() => import("../pages/admin/AdminUsersPage"));
const AdminUserPage = lazy(() => import("../pages/admin/AdminUserPage"));

const PageLoader = () => (
  <Center py={80}>
    <Loader />
  </Center>
);

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
          path="/messages/:conversationId"
          element={
            <ProtectedRoute>
              <MessagesPage />
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

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Suspense fallback={<PageLoader />}>
                <AdminUsersPage />
              </Suspense>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/users/:userId"
          element={
            <AdminRoute>
              <Suspense fallback={<PageLoader />}>
                <AdminUserPage />
              </Suspense>
            </AdminRoute>
          }
        />

        {/* Root Route - Smart redirect based on authentication */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
};

export default AppRouter;
