import { useEffect } from 'react';

// This custom hook saves the draft to localStorage every 5 seconds
export const useAutosaveDraft = (key, data) => {
  useEffect(() => {
    const timer = setInterval(() => {
      // Only save if there is actual data to save
      if (data.title || data.body_markdown) {
        localStorage.setItem(key, JSON.stringify(data));
        console.log(`Draft autosaved to ${key} at ${new Date().toLocaleTimeString()}`);
      }
    }, 5000); // 5000ms = 5 seconds

    // Cleanup function: clears the timer if the component unmounts
    return () => clearInterval(timer);
  }, [key, data]); // Re-runs if the data changes
};