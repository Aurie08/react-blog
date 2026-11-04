import { Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import PostDetails from './pages/PostDetails';
import PostEditor from './pages/PostEditor';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin'; // <-- Add this import

function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/posts/:slug" element={<PostDetails />} />

          {/* Protected Routes (Authors and Admins) */}
          <Route element={<ProtectedRoute allowedRoles={['author', 'admin']} />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/posts/new" element={<PostEditor />} />
            <Route path="/posts/:id/edit" element={<PostEditor />} /> {/* <-- Reusing PostEditor! */}
          </Route>

          {/* Admin Only Route */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin" element={<Admin />} /> {/* <-- Add this route */}
          </Route>

          <Route path="*" element={<div className="p-8 text-center text-2xl font-bold text-red-500">404 - Page Not Found</div>} />
        </Routes>
      </main>
    </div>
  );
}

export default App;