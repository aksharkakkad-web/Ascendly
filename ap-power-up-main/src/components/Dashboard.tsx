import { useAuth } from "@/contexts/AuthContext";
import { StudentDashboard } from "./StudentDashboard";
import { TeacherDashboard } from "./TeacherDashboard";
import { Navigate } from "react-router-dom";
import { PremiumLoaderFullScreen } from "@/components/ui/premium-loader";

export function Dashboard() {
  const { user, loading } = useAuth();

  if (loading) {
    return <PremiumLoaderFullScreen />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (user.role === 'teacher') {
    return <TeacherDashboard />;
  }

  return <StudentDashboard />;
}
