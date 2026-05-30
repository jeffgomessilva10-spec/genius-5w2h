// src/services/api.js – Instância axios configurada
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'https://genius-5w2h-production.up.railway.app/api';

const api = axios.create({
  baseURL: API_BASE,
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

export const raciAPI = {
  list:   (activityId)         => api.get(`/activities/${activityId}/raci`),
  upsert: (activityId, data)   => api.post(`/activities/${activityId}/raci`, data),
  remove: (activityId, userId) => api.delete(`/activities/${activityId}/raci/${userId}`),
};

export const timeEntryAPI = {
  list:   (activityId)       => api.get(`/activities/${activityId}/time-entries`),
  create: (activityId, data) => api.post(`/activities/${activityId}/time-entries`, data),
  delete: (activityId, id)   => api.delete(`/activities/${activityId}/time-entries/${id}`),
};

export const attachmentAPI = {
  list:   (activityId)       => api.get(`/activities/${activityId}/attachments`),
  create: (activityId, data) => api.post(`/activities/${activityId}/attachments`, data),
  delete: (activityId, id)   => api.delete(`/activities/${activityId}/attachments/${id}`),
};

export const documentAPI = {
  list:   (params)     => api.get('/documents', { params }),
  create: (data)       => api.post('/documents', data),
  update: (id, data)   => api.put(`/documents/${id}`, data),
  delete: (id)         => api.delete(`/documents/${id}`),
};

export const okrAPI = {
  list:           (params)            => api.get('/okr', { params }),
  create:         (data)              => api.post('/okr', data),
  delete:         (id)                => api.delete(`/okr/${id}`),
  createKR:       (objectiveId, data) => api.post(`/okr/${objectiveId}/key-results`, data),
  updateKR:       (id, data)          => api.patch(`/okr/key-results/${id}`, data),
  linkActivity:   (krId, activityId)  => api.post(`/okr/key-results/${krId}/link-activity`, { activityId }),
};

export const pdcaAPI = {
  list:          (params) => api.get('/pdca', { params }),
  createReview:  (data)   => api.post('/pdca/reviews', data),
  deleteReview:  (id)     => api.delete(`/pdca/reviews/${id}`),
  createLesson:  (data)   => api.post('/pdca/lessons', data),
  deleteLesson:  (id)     => api.delete(`/pdca/lessons/${id}`),
};

export const aiAPI = {
  validate: (activity)             => api.post('/ai/validate', activity),
  suggest:  (field, value, ctx)    => api.post('/ai/suggest', { field, value, context: ctx }),
};

export const dashboardAPI = {
  operational: (params) => api.get('/dashboard/operational', { params }),
  executive:   (params) => api.get('/dashboard/executive',   { params }),
  getPrefs:    ()       => api.get('/dashboard/preferences'),
  savePrefs:   (prefs)  => api.put('/dashboard/preferences', { preferences: prefs }),
};

export const ganttAPI = {
  list: (params) => api.get('/gantt', { params }),
};

export const analyticsAPI = {
  summary:     ()       => api.get('/analytics/summary'),
  dau:         (p)      => api.get('/analytics/dau',       { params: p }),
  active:      ()       => api.get('/analytics/active'),
  sessions:    (p)      => api.get('/analytics/sessions',  { params: p }),
  retention:   (p)      => api.get('/analytics/retention', { params: p }),
  features:    (p)      => api.get('/analytics/features',  { params: p }),
  heatmap:     (p)      => api.get('/analytics/heatmap',   { params: p }),
  churn:       (p)      => api.get('/analytics/churn',     { params: p }),
  deleteMyData:()       => api.delete('/analytics/my-data'),
};

export default api;
