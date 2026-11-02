import { Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';

// Temporary placeholder
const Home = () => <div className="p-8 max-w-6xl mx-auto"><h1 className="text-3xl font-bold">Public Feed Coming Soon</h1></div>;

function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      {/* The Navbar sits at the top of every page */}
      <Navbar />
      
      {/* The main content area */}
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<div className="p-8 text-center text-2xl font-bold text-red-500">404 - Page Not Found</div>} />
        </Routes>
      </main>
    </div>
  );
}

export default App;