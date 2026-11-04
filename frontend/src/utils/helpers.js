// The base URL for the backend (without the /api/v1 part, for static files)
const API_ORIGIN = 'https://blog-api-lkzn.onrender.com';

export const getImageUrl = (url) => {
  if (!url) {
    // Return a default placeholder image if there's no cover image
    return 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=800';
  }
  // If the URL is already a full URL, return it
  if (url.startsWith('http')) {
    return url;
  }
  // Otherwise, prepend the API origin (which is now just the root domain)
  return `${API_ORIGIN}${url}`;
};

// Format dates nicely (e.g., "Oct 24, 2026")
export const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
};