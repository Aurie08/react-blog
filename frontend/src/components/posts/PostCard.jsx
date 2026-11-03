import { Link } from 'react-router-dom';
import { Clock, Eye, Heart, MessageCircle } from 'lucide-react';
import { getImageUrl, formatDate } from '../../utils/helpers';

const PostCard = ({ post }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full">
      {/* Cover Image */}
      <Link to={`/posts/${post.slug}`} className="block relative h-48 overflow-hidden bg-gray-100">
        <img 
          src={getImageUrl(post.cover_image_url)} 
          alt={post.title}
          loading="lazy" // Lazy loading for mobile data saving
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
        />
      </Link>

      <div className="p-5 flex flex-col flex-grow">
        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-3">
          {post.tags.map(tag => (
            <span key={tag.id} className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-md uppercase tracking-wide">
              {tag.name}
            </span>
          ))}
        </div>

        {/* Title */}
        <Link to={`/posts/${post.slug}`}>
          <h2 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 hover:text-blue-600 transition-colors">
            {post.title}
          </h2>
        </Link>

        {/* Excerpt (stripped of markdown) */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-3 flex-grow">
          {post.body_markdown.replace(/[#*`]/g, '').substring(0, 150)}...
        </p>

        {/* Footer / Meta Info */}
        <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <div className="flex flex-col">
            <span className="font-semibold text-gray-800">{post.author_name}</span>
            <span>{formatDate(post.created_at)}</span>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1" title="Views"><Eye size={14} /> {post.views_count}</span>
            <span className="flex items-center gap-1" title="Likes"><Heart size={14} /> {post.likes_count}</span>
            <span className="flex items-center gap-1" title="Comments"><MessageCircle size={14} /> {post.comments_count}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostCard;