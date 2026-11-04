
import { Link } from 'react-router-dom';
import { Eye, Heart, MessageCircle } from 'lucide-react';
import { getImageUrl, formatDate } from '../../utils/helpers';

const PostCard = ({ post }) => {
  const excerpt = (post.body_markdown || '')
    .replace(/[#*`]/g, '')
    .substring(0, 150);

  return (
    <article className="group bg-white rounded-2xl border border-gray-200/80 overflow-hidden flex flex-col h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-gray-200/60">

      {/* Cover Image */}
      <Link
        to={`/posts/${post.slug}`}
        className="block relative aspect-[16/9] overflow-hidden bg-gray-100"
      >
        <img
          src={getImageUrl(post.cover_image_url)}
          alt={post.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </Link>

      <div className="p-5 sm:p-6 flex flex-col flex-grow">

        {/* Tags */}
        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map(tag => (
              <span
                key={tag.id}
                className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full uppercase tracking-wider"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <Link to={`/posts/${post.slug}`}>
          <h2 className="text-xl font-bold leading-snug text-gray-900 mb-3 transition-colors duration-200 group-hover:text-emerald-800 line-clamp-2">
            {post.title}
          </h2>
        </Link>

        {/* Excerpt */}
        <p className="text-sm leading-6 text-gray-600 mb-5 line-clamp-3 flex-grow">
          {excerpt}
          {post.body_markdown?.length > 150 ? '...' : ''}
        </p>

        {/* Footer / Meta Info */}
        <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between gap-3">

          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-gray-800 truncate">
              {post.author_name}
            </span>
            <span className="text-xs text-gray-500 mt-1">
              {formatDate(post.created_at)}
            </span>
          </div>

          <div className="flex items-center gap-3 text-gray-500 shrink-0">

            <span
              className="flex items-center gap-1 text-xs"
              title="Views"
            >
              <Eye size={15} strokeWidth={1.8} />
              {post.views_count}
            </span>

            <span
              className="flex items-center gap-1 text-xs"
              title="Likes"
            >
              <Heart size={15} strokeWidth={1.8} />
              {post.likes_count}
            </span>

            <span
              className="flex items-center gap-1 text-xs"
              title="Comments"
            >
              <MessageCircle size={15} strokeWidth={1.8} />
              {post.comments_count}
            </span>

          </div>
        </div>
      </div>
    </article>
  );
};

export default PostCard;
