import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { formatDate } from '../utils/helpers';
import { Eye, Heart, MessageCircle, FileText, Edit, Trash2, Plus } from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axiosClient.get('/author/stats');
        setStats(response.data);
      } catch (err) {
        setError('Failed to load dashboard data.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const handleDelete = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    
    try {
      await axiosClient.delete(`/posts/${postId}`);
      // Remove the post from the local state to update UI without refetching
      setStats({
        ...stats,
        posts: stats.posts.filter(p => p.id !== postId)
      });
    } catch (err) {
      alert("Failed to delete post.");
    }
  };

  if (loading) return <div className="text-center py-20 text-xl font-bold text-gray-500">Loading dashboard...</div>;
  if (error) return <div className="text-center py-20 text-xl font-bold text-red-500">{error}</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Author Dashboard</h1>
          <p className="text-gray-500 mt-1">Manage your posts and track your performance</p>
        </div>
        <Link to="/posts/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
          <Plus size={20} /> New Post
        </Link>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><FileText size={24} /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Posts</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total_posts}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg"><Eye size={24} /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Views</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total_views}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-lg"><Heart size={24} /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Likes</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total_likes}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><MessageCircle size={24} /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Comments</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total_comments}</p>
          </div>
        </div>
      </div>

      {/* Posts Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800">Your Posts</h2>
        </div>
        
        {stats.posts.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            You haven't written any posts yet. Click "New Post" to get started!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white text-gray-500 text-sm border-b border-gray-100">
                  <th className="px-6 py-3 font-medium">Title</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-center">Views</th>
                  <th className="px-6 py-3 font-medium text-center">Likes</th>
                  <th className="px-6 py-3 font-medium text-center">Comments</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.posts.map(post => (
                  <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link to={`/posts/${post.slug}`} className="font-bold text-gray-800 hover:text-blue-600">
                        {post.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                        post.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {post.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600 font-medium">{post.views_count}</td>
                    <td className="px-6 py-4 text-center text-gray-600 font-medium">{post.likes_count}</td>
                    <td className="px-6 py-4 text-center text-gray-600 font-medium">{post.comments_count}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link to={`/posts/${post.id}/edit?slug=${post.slug}`} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                          <Edit size={18} />
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
        )}
      </div>
    </div>
  );
};

export default Dashboard;