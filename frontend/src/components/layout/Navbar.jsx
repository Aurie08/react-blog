import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PenSquare, LogOut, User, LayoutDashboard } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          {/* Logo / Brand */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl font-extrabold text-blue-600 tracking-tight">MUBAS Blog</span>
          </Link>

          {/* Right side actions */}
          <div className="flex items-center gap-4">
            {!user ? (
              // Show if NOT logged in
              <>
                <Link to="/login" className="text-gray-600 hover:text-blue-600 font-medium">Login</Link>
                <Link to="/register" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium transition-colors">Register</Link>
              </>
            ) : (
              // Show if logged in
              <>
                {/* Show Dashboard and Write buttons for Authors and Admins */}
                {(user.role === 'author' || user.role === 'admin') && (
                  <>
                    <Link to="/dashboard" className="text-gray-600 hover:text-blue-600 flex items-center gap-1 font-medium hidden sm:flex">
                      <LayoutDashboard size={18} /> Dashboard
                    </Link>
                    <Link to="/posts/new" className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-1 font-medium transition-colors">
                      <PenSquare size={18} /> Write
                    </Link>
                  </>
                )}
                
                {/* Admin link */}
                {user.role === 'admin' && (
                  <Link to="/admin" className="text-red-600 hover:text-red-700 font-medium hidden sm:flex">Admin</Link>
                )}

                {/* User Profile & Logout */}
                <div className="flex items-center gap-3 ml-2 border-l border-gray-300 pl-4">
                  <div className="flex flex-col items-end hidden sm:flex">
                    <span className="text-sm font-bold text-gray-800">{user.name}</span>
                    <span className="text-xs text-gray-500 capitalize">{user.role}</span>
                  </div>
                  <button 
                    onClick={handleLogout} 
                    className="group flex items-center gap-1 text-gray-500 hover:text-red-600 transition-colors p-2 font-medium" 
                    title="Logout"
                  >
                    <LogOut size={20} className="group-hover:text-red-600 transition-colors" /> 
                    <span>Logout</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;