import { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';

export const useOptimisticLike = (initialLiked, initialCount, postId) => {
  const [isLiked, setIsLiked] = useState(initialLiked || false);
  const [likeCount, setLikeCount] = useState(initialCount || 0);
  const [isLoading, setIsLoading] = useState(false);

  // CRITICAL FIX: Sync the hook's state when the real post data finishes loading from the API
  useEffect(() => {
    setIsLiked(initialLiked || false);
    setLikeCount(initialCount || 0);
  }, [initialLiked, initialCount]);

  const toggleLike = async () => {
    if (isLoading) return;
    setIsLoading(true);

    const previousLiked = isLiked;
    const previousCount = likeCount;
    
    // Optimistic update
    setIsLiked(!isLiked);
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);

    try {
      const response = await axiosClient.post(`/posts/${postId}/like`);
      
      // Sync with exact server response
      setIsLiked(response.data.liked);
      setLikeCount(response.data.likes_count);
    } catch (error) {
      console.error("Failed to toggle like:", error);
      setIsLiked(previousLiked);
      setLikeCount(previousCount);
    } finally {
      setIsLoading(false);
    }
  };

  return { isLiked, likeCount, toggleLike, isLoading };
};