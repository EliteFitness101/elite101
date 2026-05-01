import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

type AppRole = "model" | "brand" | "admin";

export const ProtectedRoute = ({
  children,
  requireRole,
}: {
  children: ReactNode;
  requireRole?: AppRole;
}) => {
  const { user, roles, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-12 w-12 rounded-full border-2 border-gold border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (requireRole && !roles.includes(requireRole) && !roles.includes("admin")) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};
