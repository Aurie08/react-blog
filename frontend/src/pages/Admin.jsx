import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { formatDate } from '../utils/helpers';
import { ShieldAlert, Trash2, Eye } from 'lucide-react';
   import UserRoles from '../components/admin/UserRoles';

const Admin = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAllPosts = async () => {
      try {
        // Fetch all posts (Olinda's API allows admin to see all via /posts but usually we'd have an admin route. 
        // For this project, we will just fetch the feed but increase the limit).
        const response = await axiosClient.get('/posts?limit=50');
        setPosts(response.data.data);
      } catch (err) {
        setError('Failed to load posts.');
      } finally {
        setLoading(false);
      }
    };
    fetchAllPosts();
  }, []);

  const handleDelete = async (postId) => {
    if (!window.confirm("ADMIN ACTION: Are you sure you want to permanently delete this post?")) return;
    
    try {
      await axiosClient.delete(`/posts/${postId}`);
      setPosts(posts.filter(p => p.id !== postId));
    } catch (err) {
      alert("Failed to delete post.");
    }
  };

  if (loading) return <div className="text-center py-20 text-xl font-bold text-gray-500">Loading admin data...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-red-100 p-3 rounded-lg text-red-600">
          <ShieldAlert size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Admin Moderation</h1>
          <p className="text-gray-500">Manage all platform content</p>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">{error}</div>}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-100">
                <th className="px-6 py-4 font-medium">Post Title</th>
                <th className="px-6 py-4 font-medium">Author</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {posts.map(post => (
                <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-gray-800">{post.title}</p>
                    <p className="text-xs text-gray-500">{formatDate(post.created_at)}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{post.author_name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                      post.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {post.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-3">
                      <Link to={`/posts/${post.slug}`} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors" title="View">
                        <Eye size={18} />
                      </Link>
                      <button onClick={() => handleDelete(post.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <UserRoles />
    </div>
  );
};

export default Admin;
