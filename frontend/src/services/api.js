// src/services/api.js – Instância axios configurada
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Injeta o token JWT em todas as requisições
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('genius_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redireciona para login em caso de 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('genius_token');
      localStorage.removeItem('genius_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Endpoints ────────────────────────────────────────────────
export const authAPI = {
  login:    (data) => api.post('/auth/login', data),
  me:       ()     => api.get('/auth/me'),
  register: (data) => api.post('/auth/register', data),
};

export const projectsAPI = {
  list:         ()         => api.get('/projects'),
  get:          (id)       => api.get(`/projects/${id}`),
  create:       (data)     => api.post('/projects', data),
  update:       (id, data) => api.put(`/projects/${id}`, data),
  delete:       (id)       => api.delete(`/projects/${id}`),
  addClient:    (id, userId)     => api.post(`/projects/${id}/clients`, { userId }),
  removeClient: (id, userId)     => api.delete(`/projects/${id}/clients/${userId}`),
};

export const categoriesAPI = {
  list:   (projectId) => api.get('/categories', { params: { projectId } }),
  create: (data)      => api.post('/categories', data),
  update: (id, data)  => api.put(`/categories/${id}`, data),
  delete: (id)        => api.delete(`/categories/${id}`),
};

export const activitiesAPI = {
  list:    (params)    => api.get('/activities', { params }),
  get:     (id)        => api.get(`/activities/${id}`),
  create:  (data)      => api.post('/activities', data),
  update:  (id, data)  => api.put(`/activities/${id}`, data),
  delete:  (id)        => api.delete(`/activities/${id}`),
  stats:   (projectId) => api.get(`/activities/stats/${projectId}`),
};

export const notificationsAPI = {
  list:       (unreadOnly) => api.get('/notifications', { params: { unreadOnly } }),
  markRead:   (id)         => api.patch(`/notifications/${id}/read`),
  markAllRead: ()          => api.patch('/notifications/read-all'),
};

export const usersAPI = {
  list: (role) => api.get('/users', { params: { role } }),
};

export const commentsAPI = {
  list:   (activityId)          => api.get(`/activities/${activityId}/comments`),
  create: (activityId, content) => api.post(`/activities/${activityId}/comments`, { content }),
  delete: (activityId, id)      => api.delete(`/activities/${activityId}/comments/${id}`),
};

export const auditAPI = {
  list: (params) => api.get('/audit', { params }),
};

export default api;
