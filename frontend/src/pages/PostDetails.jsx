import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import { useOptimisticLike } from '../hooks/useOptimisticLike';
import { getImageUrl, formatDate } from '../utils/helpers';
import { Heart, MessageCircle, ArrowLeft, Send, AlertCircle } from 'lucide-react';

const PostDetails = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null); 
  
  // 1. New state for the custom Toast notification
  const [toastMessage, setToastMessage] = useState('');

  const [likeData, setLikeData] = useState({ isLiked: false, count: 0 });
  
  // 2. useRef to prevent React StrictMode from fetching twice and breaking optimistic UI
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return; // Prevent double fetch in dev
    hasFetched.current = true;

    const fetchPostAndComments = async () => {
      try {
        const postRes = await axiosClient.get(`/posts/${slug}`);
        const fetchedPost = postRes.data.post;
        setPost(fetchedPost);
        
        setLikeData({
          isLiked: fetchedPost.liked_by_me || false,
          count: fetchedPost.likes_count
        });

        const commentsRes = await axiosClient.get(`/posts/${fetchedPost.id}/comments?tree=true`);
        setComments(commentsRes.data.data);
      } catch (error) {
        console.error("Error loading post", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPostAndComments();
  }, [slug]);

  const { isLiked, likeCount, toggleLike } = useOptimisticLike(
    likeData.isLiked, 
    likeData.count, 
    post?.id
  );

  // 3. Function to show the toast
  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000); // Disappears after 3 seconds
  };

  const handleLikeClick = () => {
    if (!user) {
      showToast("Please login to like posts.");
      return;
    }
    toggleLike();
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    if (!user) {
      showToast("Please login to comment.");
      return;
    }

    try {
      const payload = { content: newComment };
      if (replyTo) payload.parent_id = replyTo;

      const res = await axiosClient.post(`/posts/${post.id}/comments`, payload);
      
      if (!replyTo) {
        setComments([res.data.comment, ...comments]);
      } else {
        setComments(comments.map(c => 
          c.id === replyTo ? { ...c, replies: [...(c.replies || []), res.data.comment] } : c
        ));
      }
      
      setNewComment('');
      setReplyTo(null);
    } catch (error) {
      showToast("Failed to post comment.");
    }
  };

  if (loading) return <div className="text-center py-20 text-xl font-bold text-gray-500">Loading article...</div>;
  if (!post) return <div className="text-center py-20 text-xl font-bold text-red-500">Post not found</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 relative">
      
      {/* Custom Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 animate-bounce">
          <AlertCircle size={20} className="text-yellow-400" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-gray-500 hover:text-blue-600 mb-6 font-medium">
        <ArrowLeft size={18} /> Back to Feed
      </button>

        <img 
          src={getImageUrl(post.cover_image_url)} 
          alt={post.title} 
          className="w-full h-[400px] object-cover rounded-2xl mb-8 shadow-sm"
        />

      <div className="mb-8">
        <div className="flex gap-2 mb-4">
          {post.tags.map(tag => (
            <span key={tag.id} className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-md uppercase">
              {tag.name}
            </span>
          ))}
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4 leading-tight">{post.title}</h1>
        <div className="flex items-center justify-between border-y border-gray-200 py-4">
          <div>
            <p className="font-bold text-gray-800">{post.author_name}</p>
            <p className="text-sm text-gray-500">{formatDate(post.created_at)} • {post.views_count} views</p>
          </div>
          
          <button 
            onClick={handleLikeClick}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${
              isLiked ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
            <span className="font-bold">{likeCount}</span>
          </button>
        </div>
      </div>

      <div className="prose prose-lg max-w-none mb-12">
        <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
          {post.body_markdown}
        </ReactMarkdown>
      </div>

      <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
        <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <MessageCircle /> Comments ({post.comments_count})
        </h3>

        {user ? (
          <form onSubmit={handleCommentSubmit} className="mb-8">
            {replyTo && <div className="text-sm text-blue-600 mb-2">Replying to comment...</div>}
            <div className="flex gap-2">
              <input 
                type="text" 
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-grow px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                <Send size={20} />
              </button>
            </div>
          </form>
        ) : (
          <div className="mb-8 p-4 bg-blue-50 text-blue-700 rounded-lg text-center font-medium">
            Please log in to join the discussion.
          </div>
        )}

        <div className="space-y-6">
          {comments.map(comment => (
            <div key={comment.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="font-bold text-gray-800">{comment.user_name}</span>
                  <span className="text-xs text-gray-500 ml-2">{formatDate(comment.created_at)}</span>
                </div>
              </div>
              <p className="text-gray-700 mb-2">{comment.content}</p>
              
              {user && !comment.parent_id && (
                <button 
                  onClick={() => setReplyTo(comment.id)}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  Reply
                </button>
              )}

              {comment.replies && comment.replies.length > 0 && (
                <div className="mt-4 pl-4 border-l-2 border-gray-100 space-y-4">
                  {comment.replies.map(reply => (
                    <div key={reply.id} className="bg-gray-50 p-3 rounded-lg">
                      <div className="mb-1">
                        <span className="font-bold text-sm text-gray-800">{reply.user_name}</span>
                        <span className="text-xs text-gray-500 ml-2">{formatDate(reply.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-700">{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PostDetails;