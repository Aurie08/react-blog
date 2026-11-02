import { Routes, Route } from 'react-router-dom';

// Temporary placeholder components (we will build these in separate files soon)
const Home = () => <div className="p-8 text-2xl font-bold">Public Feed</div>;
const Login = () => <div className="p-8 text-2xl font-bold">Login Page</div>;

function App() {
  return (
    // 'min-h-screen bg-gray-50' is Tailwind utility classes for a full-height app with a light gray background
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        
        {/* 404 Route (Catch-all) */}
        <Route path="*" element={<div className="p-8 text-center">404 - Page Not Found</div>} />
      </Routes>
    </div>
  );
}

export default App;