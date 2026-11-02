import axios from 'axios';

// 1. Create an Axios instance with the Base URL Olinda provided
const axiosClient = axios.create({
  baseURL: 'https://blog-api-lkzn.onrender.com/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. Add a Request Interceptor
// This runs BEFORE every request is sent. It checks if we have a token in localStorage.
// If we do, it attaches it to the Authorization header.
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 3. Add a Response Interceptor
// This runs AFTER a response comes back. If the server says 401 (Unauthorized),
// it means our token is invalid or expired, so we clear it and reload (log out).
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      // Only redirect if we aren't already on the login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
