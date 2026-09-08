import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { isAdminAuthenticated } from "./adminAuth";

export default function RequireAdmin({ children }: { children: ReactNode }) {
  if (!isAdminAuthenticated()) {
    return <Navigate to="/admin/login" replace />;
  }
  return <>{children}</>;
}
