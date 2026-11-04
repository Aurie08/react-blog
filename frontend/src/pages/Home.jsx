import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import PostCard from '../components/posts/PostCard';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

const Home = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Pagination state
  const [searchTerm, setSearchTerm] = useState('');
  const [query, setQuery] = useState(''); // The actual query sent to API (prevents spamming API on every keystroke)
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch posts whenever the query or page changes
  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        // Build the URL with query parameters
        const response = await axiosClient.get('/posts', {
          params: {
            search: query,
            page: page,
            limit: 6 // We want 6 posts per page for a nice grid
          }
        });
        
        setPosts(response.data.data);
        setTotalPages(response.data.pagination.totalPages);
      } catch (error) {
        console.error("Failed to fetch posts", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [query, page]);

  // Handle search form submission
  const handleSearch = (e) => {
    e.preventDefault();
    setQuery(searchTerm);
    setPage(1); // Reset to page 1 on new search
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Latest Posts</h1>
          <p className="text-gray-500 mt-1">Insights from the MUBAS community</p>
        </div>
        
        <form onSubmit={handleSearch} className="relative w-full md:w-96 flex">
          <input 
            type="text" 
            placeholder="Search posts..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-r-lg hover:bg-blue-700 font-medium">
            Search
          </button>
        </form>
      </div>

      {/* Feed Content */}
      {loading ? (
        // Loading Skeleton (Important for slow Render backends)
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 h-96 animate-pulse">
              <div className="h-48 bg-gray-200 rounded-t-xl"></div>
              <div className="p-5 space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20">
          <h3 className="text-2xl font-bold text-gray-400">No posts found</h3>
          {query && <p className="text-gray-500 mt-2">Try a different search term.</p>}
        </div>
      ) : (
        <>
          {/* Post Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map(post => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>

          {/* Pagination Controls */}
          <div className="flex justify-center items-center gap-4 mt-10">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
            >
              <ChevronLeft size={18} /> Previous
            </button>
            <span className="text-gray-600 font-medium">
              Page {page} of {totalPages}
            </span>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
            >
              Next <ChevronRight size={18} />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Home;