import { createContext, useState, useEffect, useContext } from 'react';
import axiosClient from '../api/axiosClient';

// 1. Create the Context
const AuthContext = createContext(null);

// 2. Create the Provider Component (This wraps our whole app)
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 3. Check for an existing session when the app first loads
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Ask the backend who this token belongs to
        const response = await axiosClient.get('/auth/me');
        setUser(response.data.user);
      } catch (error) {
        console.error("Session expired or invalid", error);
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // 4. Login function
  const login = async (email, password) => {
    const response = await axiosClient.post('/auth/login', { email, password });
    const { user, token } = response.data;
    
    localStorage.setItem('token', token);
    setUser(user);
    return user; // Return user so the login page can redirect based on role
  };

  // 5. Logout function
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  // 6. Provide the state and functions to the rest of the app
  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// 7. Custom hook to use Auth easily in other components
export const useAuth = () => {
  return useContext(AuthContext);
};