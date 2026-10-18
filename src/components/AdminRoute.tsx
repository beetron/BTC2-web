/**
 * Admin Route Component
 * Shows its children only to the admin account. This is a convenience for
 * the UI; the API rejects every /admin call from anyone else regardless.
 */

import { Center, Loader } from "@mantine/core";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { userService } from "../services/userService";

interface AdminRouteProps {
  children: React.ReactNode;
}

// Asks /users/me directly instead of reading AuthContext's isAdmin, which
// is still false for a moment after page load and would bounce a real
// admin away before it resolves.
const AdminGate: React.FC<AdminRouteProps> = ({ children }) => {
  const [status, setStatus] = useState<"checking" | "admin" | "denied">("checking");

  useEffect(() => {
    let cancelled = false;
    userService
      .getCurrentUser()
      .then((user) => !cancelled && setStatus(user.isAdmin ? "admin" : "denied"))
      .catch(() => !cancelled && setStatus("denied"));
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "checking") {
    return (
      <Center py={80}>
        <Loader />
      </Center>
    );
  }

  return status === "admin" ? <>{children}</> : <Navigate to="/friends" replace />;
};

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => (
  <ProtectedRoute>
    <AdminGate>{children}</AdminGate>
  </ProtectedRoute>
);

export default AdminRoute;
