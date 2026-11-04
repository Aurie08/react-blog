import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Navbar from '../Navbar';
import { AuthProvider } from '../../../context/AuthContext';
import { describe, it, expect, vi } from 'vitest';
import * as AuthContext from '../../../context/AuthContext';

// Mock the useAuth hook
vi.mock('../../../context/AuthContext', () => ({
  ...vi.importActual('../../../context/AuthContext'),
  useAuth: vi.fn(),
}));

describe('Navbar Component', () => {
  it('shows Login and Register buttons when user is logged out', () => {
    // Mock the context to return no user
    AuthContext.useAuth.mockReturnValue({ user: null, logout: vi.fn() });

    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );

    expect(screen.getByText(/mubas blog/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /register/i })).toBeInTheDocument();
  });

  it('shows Dashboard, Write, and Logout when user is an author', () => {
    // Mock the context to return an author
    AuthContext.useAuth.mockReturnValue({ 
      user: { name: 'Test Author', role: 'author' }, 
      logout: vi.fn() 
    });

    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );

    expect(screen.getByText(/test author/i)).toBeInTheDocument();
    expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/write/i)).toBeInTheDocument();
    expect(screen.getByText(/logout/i)).toBeInTheDocument();
  });
});