import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Check if this is a login attempt failure vs token expiration
      const isLoginRequest = error.config?.url?.includes('/auth/login');
      
      if (!isLoginRequest) {
        // This is a token expiration during an authenticated session
        // Clear storage and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      // For login requests, let the error bubble up to be handled by the login component
      // Don't redirect or clear storage as the user is not authenticated yet
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/profile'),
  verifyToken: () => api.get('/auth/verify'),
  logout: () => api.post('/auth/logout'),
  changePassword: (passwordData) => api.put('/auth/change-password', passwordData),
};

// User API calls
export const userAPI = {
  getAllUsers: (params) => api.get('/users', { params }),
  getUserById: (id) => api.get(`/users/${id}`),
  createUser: (userData) => api.post('/users', userData),
  updateUser: (id, userData) => api.put(`/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/users/${id}`),
  getRoles: () => api.get('/users/roles'),
  getNextEmployeeId: (role) => api.get(`/users/next-employee-id/${role}`),
};

// Department API calls
export const departmentAPI = {
  getAllDepartments: (params) => api.get('/departments', { params }),
  getDepartmentById: (id) => api.get(`/departments/${id}`),
  createDepartment: (departmentData) => api.post('/departments', departmentData),
  updateDepartment: (id, departmentData) => api.put(`/departments/${id}`, departmentData),
  deleteDepartment: (id) => api.delete(`/departments/${id}`),
  toggleDepartmentStatus: (id, isActive) => api.put(`/departments/${id}`, { isActive }),
  getDepartmentStats: () => api.get('/departments/stats'),
};

// Leave API calls
export const leaveAPI = {
  // Employee endpoints
  submitLeaveRequest: (data) => api.post('/leaves/submit', data),
  getMyLeaveRequests: (params) => api.get('/leaves/my-requests', { params }),
  getMyLeaveBalance: (params) => api.get('/leaves/my-balance', { params }),
  cancelLeaveRequest: (id) => api.patch(`/leaves/cancel/${id}`),
  updateLeaveRequest: (id, data) => api.patch(`/leaves/${id}`, data),
  
  // Team Leader endpoints
  getTeamLeaveRequests: (params) => api.get('/leaves/team-requests', { params }),
  approveRejectLeaveByTL: (id, action, comments) => 
    api.patch(`/leaves/team-approve/${id}`, { action, comments }),
  
  // HR endpoints
  getHRLeaveRequests: (params) => api.get('/leaves/hr-requests', { params }),
  finalApproveRejectLeave: (id, action, comments) => 
    api.patch(`/leaves/hr-approve/${id}`, { action, comments }),
  
  // Common endpoints
  getAllLeaveRequests: (params) => api.get('/leaves/all-requests', { params }),
  getLeaveRequestById: (id) => api.get(`/leaves/${id}`),
  getLeaveTypes: () => api.get('/leaves/types'),
  getLeaveStats: (params) => api.get('/leaves/stats', { params }),
  getDepartmentStats: () => api.get('/departments/stats'),
};

// Team API calls
export const teamAPI = {
  getAllTeams: (params) => api.get('/teams', { params }),
  getTeamById: (id) => api.get(`/teams/${id}`),
  createTeam: (teamData) => api.post('/teams', teamData),
  updateTeam: (id, teamData) => api.put(`/teams/${id}`, teamData),
  deleteTeam: (id) => api.delete(`/teams/${id}`),
  addTeamMember: (teamId, memberData) => api.post(`/teams/${teamId}/members`, memberData),
  removeTeamMember: (teamId, userId) => api.delete(`/teams/${teamId}/members/${userId}`),
  getMyManagedTeams: () => api.get('/teams/my-teams'),
  getMyTeam: () => api.get('/teams/my-team'),
};

// Health check
export const healthAPI = {
  check: () => api.get('/health'),
};

export default api;
