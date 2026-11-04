import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../Login';
import { AuthProvider } from '../../context/AuthContext';
import { describe, it, expect, vi } from 'vitest';
import axiosClient from '../../api/axiosClient';

// Mock the entire axiosClient module
vi.mock('../../api/axiosClient', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  }
}));

const renderLogin = () => {
  render(
    <BrowserRouter>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Login Component', () => {
  it('renders the login form correctly', () => {
    renderLogin();
    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/you@example.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('shows an error if the API call fails', async () => {
    // Force the mock axios to fail with a 401 error
    axiosClient.post.mockRejectedValueOnce({
      response: { data: { error: "Invalid email or password" } }
    });

    renderLogin();
    
    // Fill out the form
    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), { target: { value: 'wrong@test.com' } });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), { target: { value: 'wrongpass' } });
    
    // Click submit
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    // Wait for the error message to appear
    const errorMessage = await screen.findByText(/invalid email or password/i);
    expect(errorMessage).toBeInTheDocument();
  });
});