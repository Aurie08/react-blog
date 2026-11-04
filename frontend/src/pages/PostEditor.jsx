import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import imageCompression from 'browser-image-compression';
import axiosClient from '../api/axiosClient';
import { useAutosaveDraft } from '../hooks/useAutosaveDraft';
import { Save, Image as ImageIcon } from 'lucide-react';

const PostEditor = () => {
  const navigate = useNavigate();
  
  // Form State
  const [title, setTitle] = useState('');
  const [bodyMarkdown, setBodyMarkdown] = useState('');
  const [tags, setTags] = useState('');
  const [coverImage, setCoverImage] = useState(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 1. Initialize Autosave Hook
  const draftKey = 'mubas_blog_draft';
  const draftData = { title, body_markdown: bodyMarkdown, tags };
  useAutosaveDraft(draftKey, draftData);

  // 2. Restore Draft on Page Load
  useEffect(() => {
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      const parsed = JSON.parse(savedDraft);
      setTitle(parsed.title || '');
      setBodyMarkdown(parsed.body_markdown || '');
      setTags(parsed.tags || '');
    }
  }, []);

  // 3. Handle Image Compression
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Optional: Log the original and compressed size to prove it works
    console.log(`Original image size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);

    try {
      // Compress image to max 1MB before uploading to save data
      const options = { maxSizeMB: 1, maxWidthOrHeight: 1200, useWebWorker: true };
      const compressedFile = await imageCompression(file, options);
      
      console.log(`Compressed image size: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
      
      setCoverImage(compressedFile);
    } catch (error) {
      console.error("Error compressing image", error);
      setError("Failed to compress image.");
    }
  };

  // 4. Submit to Backend
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

      await axiosClient.post('/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Success! Clear draft and go to dashboard
      localStorage.removeItem(draftKey);
      navigate('/dashboard'); 
    } catch (error) {
      setError(error.response?.data?.error || "Failed to save post.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      
      {/* Header & Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Create New Post</h1>
        
        <div className="flex gap-3 w-full sm:w-auto">
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
            <Save size={20} /> {isSubmitting ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">{error}</div>}

      {/* Top Settings Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <input 
          type="text" 
          id="title"
          name="title"
          placeholder="Post Title" 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-lg"
        />
        
        <div className="flex items-center gap-4">
          <input 
            type="text" 
            id="tags"
            name="tags"
            placeholder="Tags (e.g., Tech, Life)" 
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />

          {/* Image Upload Button */}
          <div className="relative flex-shrink-0">
            <input 
              type="file" 
              id="coverImage"
              name="coverImage"
              accept="image/*" 
              onChange={handleImageUpload} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
            />
            <button className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors">
              <ImageIcon size={18} /> {coverImage ? 'Change' : 'Add Cover'}
            </button>
          </div>
        </div>
      </div>

      {/* Split Screen Editor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[600px]">
        {/* Left: Markdown Input */}
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

        {/* Right: Live Preview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-100 px-4 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider flex justify-between items-center">
            Live Preview
            {coverImage && <span className="text-green-600 text-xs normal-case flex items-center gap-1"><ImageIcon size={12}/> Image attached</span>}
          </div>
          <div className="flex-grow p-6 overflow-y-auto prose prose-sm max-w-none">
            {coverImage && (
              <img src={URL.createObjectURL(coverImage)} alt="Cover" className="w-full h-40 object-cover rounded-lg mb-4" />
            )}
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