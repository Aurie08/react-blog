import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PostCard from '../PostCard';
import { describe, it, expect } from 'vitest';

// Dummy post data
const mockPost = {
  id: 1,
  title: 'Test Post Title',
  slug: 'test-post',
  body_markdown: 'This is a test body.',
  cover_image_url: null,
  author_name: 'Olinda Banda',
  created_at: '2026-11-04T10:00:00.000Z',
  views_count: 10,
  likes_count: 5,
  comments_count: 2,
  tags: [{ id: 1, name: 'Tech', slug: 'tech' }]
};

describe('PostCard Component', () => {
  it('renders the post details correctly', () => {
    render(
      <BrowserRouter>
        <PostCard post={mockPost} />
      </BrowserRouter>
    );

    // Check title
    expect(screen.getByText(/test post title/i)).toBeInTheDocument();
    
    // Check author
    expect(screen.getByText(/olinda banda/i)).toBeInTheDocument();
    
    // Check tags
    expect(screen.getByText(/tech/i)).toBeInTheDocument();
    
    // Check stats
    expect(screen.getByText('10')).toBeInTheDocument(); // Views
    expect(screen.getByText('5')).toBeInTheDocument();  // Likes
    expect(screen.getByText('2')).toBeInTheDocument();  // Comments
  });
});