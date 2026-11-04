import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
  const { user, loading } = useAuth();

  // Show nothing (or a spinner) while checking auth status
  if (loading) return <div className="text-center py-20">Loading...</div>;

  // If no user is logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If the user's role is not in the allowed list, redirect to home
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // If they pass the checks, render the child routes
  return <Outlet />;
};

export default ProtectedRoute;