import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import imageCompression from 'browser-image-compression';
import axiosClient from '../api/axiosClient';
import { useAutosaveDraft } from '../hooks/useAutosaveDraft';
import { Save, Image as ImageIcon, X } from 'lucide-react';
import { getImageUrl } from '../utils/helpers';

const PostEditor = () => {
  const navigate = useNavigate();
  const { id } = useParams(); 
  const isEditing = Boolean(id); 

  // Form State
  const [title, setTitle] = useState('');
  const [bodyMarkdown, setBodyMarkdown] = useState('');
  const [tags, setTags] = useState('');
  const [coverImage, setCoverImage] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(isEditing);

  // Autosave 
  const draftKey = 'mubas_blog_draft';
  useAutosaveDraft(isEditing ? `edit_draft_${id}` : draftKey, { title, body_markdown: bodyMarkdown, tags });

  // 1. Fetch post data if editing
  useEffect(() => {
    if (isEditing) {
      const fetchPost = async () => {
        try {
          // Get the slug from the URL query parameters
          const queryParams = new URLSearchParams(window.location.search);
          const slug = queryParams.get('slug');

          if (!slug) {
            setError("Cannot edit post: Missing slug in URL.");
            setIsLoading(false);
            return;
          }

          // Fetch the specific post using the slug
          const res = await axiosClient.get(`/posts/${slug}`);
          const postToEdit = res.data.post;
          
          if (postToEdit) {
            setTitle(postToEdit.title);
            setBodyMarkdown(postToEdit.body_markdown);
            setTags(postToEdit.tags.map(t => t.name).join(', '));
            setExistingImageUrl(postToEdit.cover_image_url);
          } else {
            setError("Post not found.");
          }
        } catch (err) {
          console.error(err);
          setError("Failed to load post data. You might not have permission to edit this post.");
        } finally {
          setIsLoading(false);
        }
      };
      fetchPost();
    } else {
      // Restore draft only for NEW posts
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        setTitle(parsed.title || '');
        setBodyMarkdown(parsed.body_markdown || '');
        setTags(parsed.tags || '');
      }
    }
  }, [id, isEditing]);

  // Image Compression
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const options = { maxSizeMB: 1, maxWidthOrHeight: 1200, useWebWorker: true };
      const compressedFile = await imageCompression(file, options);
      setCoverImage(compressedFile);
    } catch (error) {
      setError("Failed to compress image.");
    }
  };

  // Submit
  const handleSubmit = async (submitStatus) => {
    if (!title || !bodyMarkdown) {
      setError("Title and body are required.");
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('body_markdown', bodyMarkdown);
      formData.append('status', submitStatus);
      
      const tagsArray = tags.split(',').map(t => t.trim()).filter(Boolean);
      formData.append('tags', JSON.stringify(tagsArray));
      
      if (coverImage) {
        formData.append('cover_image', coverImage);
      }

      if (isEditing) {
        await axiosClient.put(`/posts/${id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await axiosClient.post('/posts', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        localStorage.removeItem(draftKey);
      }

      navigate('/dashboard'); 
    } catch (error) {
      setError(error.response?.data?.error || "Failed to save post.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="text-center py-20 text-xl font-bold text-gray-500">Loading post data...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-900">{isEditing ? 'Edit Post' : 'Create New Post'}</h1>
        
        <div className="flex gap-3 w-full sm:w-auto">
          {/* ADDED CANCEL BUTTON */}
          <button 
            onClick={() => navigate('/dashboard')} 
            className="flex-1 sm:flex-none justify-center flex items-center gap-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Cancel
          </button>
          
          <button 
            onClick={() => handleSubmit('draft')} 
            disabled={isSubmitting}
            className="flex-1 sm:flex-none justify-center flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 font-medium"
          >
            Save Draft
          </button>
          <button 
            onClick={() => handleSubmit('published')} 
            disabled={isSubmitting}
            className="flex-1 sm:flex-none justify-center flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium shadow-sm"
          >
            <Save size={20} /> {isSubmitting ? 'Saving...' : (isEditing ? 'Update Post' : 'Publish')}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError('')}><X size={20} /></button>
        </div>
      )}

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <input 
          type="text" id="title" name="title" placeholder="Post Title" 
          value={title} onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-lg"
        />
        
        <div className="flex items-center gap-4">
          <input 
            type="text" id="tags" name="tags" placeholder="Tags (e.g., Tech, Life)" 
            value={tags} onChange={(e) => setTags(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />

          <div className="relative flex-shrink-0">
            <input 
              type="file" id="coverImage" name="coverImage" accept="image/*" 
              onChange={handleImageUpload} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
            />
            <button className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors">
              <ImageIcon size={18} /> {coverImage || existingImageUrl ? 'Change Cover' : 'Add Cover'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[600px]">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <div className="bg-gray-50 border-b border-gray-100 px-4 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider">
            Markdown
          </div>
          <textarea 
            value={bodyMarkdown}
            onChange={(e) => setBodyMarkdown(e.target.value)}
            placeholder="Write your story here using Markdown..."
            className="flex-grow w-full p-4 outline-none resize-none font-mono text-sm"
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-100 px-4 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider flex justify-between items-center">
            Live Preview
            {coverImage && <span className="text-green-600 text-xs normal-case flex items-center gap-1"><ImageIcon size={12}/> New Image Attached</span>}
          </div>
          <div className="flex-grow p-6 overflow-y-auto prose prose-sm max-w-none">
            {/* Use the helper function to handle nulls and relative paths */}
            <img 
              src={coverImage ? URL.createObjectURL(coverImage) : getImageUrl(existingImageUrl)} 
              alt="Cover Preview" 
              className="w-full h-40 object-cover rounded-lg mb-4" 
            />
            
            <h1 className="text-3xl font-extrabold mb-4">{title || 'Post Title'}</h1>
            <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
              {bodyMarkdown || '*Start typing to see the preview...*'}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostEditor;