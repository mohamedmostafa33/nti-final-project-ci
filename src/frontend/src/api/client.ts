import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post(`${API_BASE_URL}/users/token/refresh/`, {
          refresh: refreshToken,
        });

        const { access } = response.data;
        localStorage.setItem('access_token', access);

        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// Authentication APIs
export const authAPI = {
  register: (data: { email: string; username: string; password: string; password2: string }) =>
    api.post('/users/register/', data),
  
  login: (data: { email: string; password: string }) =>
    api.post('/users/login/', data),
  
  getProfile: () => api.get('/users/profile/'),
  
  refreshToken: (refresh: string) =>
    api.post('/users/token/refresh/', { refresh }),
  

};

// Communities APIs
export const communitiesAPI = {
  list: () => api.get('/communities/').then(res => res.data),
  
  create: (data: { id: string; privacyType: string }) =>
    api.post('/communities/', data).then(res => res.data),
  
  getById: (id: string) => api.get(`/communities/${id}/`).then(res => res.data),
  
  update: (id: string, data: { image_url?: string; image?: File }) => {
    const formData = new FormData();
    
    // Handle image: use File if provided, otherwise use image_url for base64
    if (data.image) {
      formData.append('image', data.image);
    } else if (data.image_url) {
      formData.append('image_url', data.image_url);
    }
    
    return api.patch(`/communities/${id}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(res => res.data);
  },
  
  getUserCommunities: () => api.get('/communities/user/snippets/').then(res => res.data),
  
  join: (id: string) => api.post(`/communities/${id}/join/`).then(res => res.data),
  
  leave: (id: string) => api.post(`/communities/${id}/leave/`).then(res => res.data),
};

// Posts APIs
export const postsAPI = {
  list: (communityId?: string, limit?: number) => {
    const params: any = {};
    if (communityId) params.community_id = communityId;
    if (limit) params.limit = limit;
    return api.get('/posts/', { params }).then(res => res.data);
  },
  
  getFeed: (limit: number = 10) => {
    return api.get('/posts/', { params: { limit } }).then(res => res.data);
  },
  
  create: (data: {
    community_id: string;
    title: string;
    body?: string;
    image_url?: string;
    image?: File;
  }) => {
    const formData = new FormData();
    formData.append('community_id', data.community_id);
    formData.append('title', data.title);
    if (data.body) formData.append('body', data.body);
    
    // Handle image: use File if provided, otherwise use image_url for base64
    if (data.image) {
      formData.append('image', data.image);
    } else if (data.image_url) {
      formData.append('image_url', data.image_url);
    }
    
    return api.post('/posts/create/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(res => res.data);
  },
  
  getById: (id: number) => api.get(`/posts/${id}/`).then(res => res.data),
  
  delete: (id: number) => api.delete(`/posts/${id}/`),  // 204 No Content - no .data needed
  
  vote: (postId: number, communityId: string, voteValue: number) =>
    api.post(`/posts/${postId}/vote/`, { 
      vote_value: voteValue 
    }).then(res => res.data),
  
  getUserVotes: (communityId: string) =>
    api.get('/posts/votes/', { params: { community_id: communityId } }).then(res => res.data),
};

// Comments APIs
export const commentsAPI = {
  list: (postId: number) =>
    api.get('/comments/', { params: { post_id: postId } }).then(res => res.data),
  
  create: (data: { post_id: number; community_id: string; text: string }) =>
    api.post('/comments/create/', data).then(res => res.data),
  
  delete: (id: number) => api.delete(`/comments/${id}/delete/`),  // 204 No Content - no .data needed
};

// Helper to save auth data
export const saveAuthData = (data: {
  user: any;
  access: string;
  refresh: string;
}) => {
  localStorage.setItem('access_token', data.access);
  localStorage.setItem('refresh_token', data.refresh);
  localStorage.setItem('user', JSON.stringify(data.user));
};

// Helper to clear auth data
export const clearAuthData = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
};

// Helper to get current user
export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};
