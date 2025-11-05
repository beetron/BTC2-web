/**
 * Root Redirect Component
 * Simple redirect based on isAuthenticated state
 * - If authenticated: redirect to /friends
 * - If not authenticated: redirect to /login
 */

import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export const RootRedirect: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return isAuthenticated ? (
    <Navigate to="/friends" replace />
  ) : (
    <Navigate to="/login" replace />
  );
};

export default RootRedirect;
