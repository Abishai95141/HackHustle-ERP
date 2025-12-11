import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Auth from "./pages/Auth";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminTeams from "./pages/admin/AdminTeams";
import AdminMeals from "./pages/admin/AdminMeals";
import AdminQueries from "./pages/admin/AdminQueries";
import Scanner from "./pages/Scanner";
import JudgePanel from "./pages/JudgePanel";
import ParticipantDashboard from "./pages/ParticipantDashboard";
import Leaderboard from "./pages/Leaderboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-primary">Loading...</p></div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

function RoleBasedRedirect() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-primary">Loading...</p></div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  switch (role) {
    case 'super_admin':
      return <Navigate to="/admin" replace />;
    case 'volunteer':
      return <Navigate to="/scanner" replace />;
    case 'judge':
      return <Navigate to="/judge" replace />;
    default:
      return <Navigate to="/participant" replace />;
  }
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />
      <Route path="/" element={<RoleBasedRedirect />} />
      
      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['super_admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['super_admin']}><AdminUsers /></ProtectedRoute>} />
      <Route path="/admin/teams" element={<ProtectedRoute allowedRoles={['super_admin']}><AdminTeams /></ProtectedRoute>} />
      <Route path="/admin/meals" element={<ProtectedRoute allowedRoles={['super_admin']}><AdminMeals /></ProtectedRoute>} />
      <Route path="/admin/queries" element={<ProtectedRoute allowedRoles={['super_admin']}><AdminQueries /></ProtectedRoute>} />
      
      {/* Scanner Route */}
      <Route path="/scanner" element={<ProtectedRoute allowedRoles={['super_admin', 'volunteer']}><Scanner /></ProtectedRoute>} />
      
      {/* Judge Route */}
      <Route path="/judge" element={<ProtectedRoute allowedRoles={['super_admin', 'judge']}><JudgePanel /></ProtectedRoute>} />
      
      {/* Participant Routes */}
      <Route path="/participant" element={<ProtectedRoute><ParticipantDashboard /></ProtectedRoute>} />
      <Route path="/leaderboard" element={<Leaderboard />} />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;