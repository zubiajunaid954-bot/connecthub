import client from './client';

export { errorMessage } from './client';

const data = (p) => p.then((res) => res.data);

export const authApi = {
  register: (body) => data(client.post('/auth/register', body)),
  login: (body) => data(client.post('/auth/login', body)),
  logout: () => data(client.post('/auth/logout')),
  me: () => data(client.get('/auth/me')),
};

export const postsApi = {
  list: (params) => data(client.get('/posts', { params })),
  get: (id) => data(client.get(`/posts/${id}`)),
  create: (body) => data(client.post('/posts', body)),
  update: (id, body) => data(client.patch(`/posts/${id}`, body)),
  remove: (id) => data(client.delete(`/posts/${id}`)),
  vote: (id, value) => data(client.post(`/posts/${id}/vote`, { value })),
};

export const commentsApi = {
  list: (postId, params) => data(client.get(`/posts/${postId}/comments`, { params })),
  create: (postId, body) => data(client.post(`/posts/${postId}/comments`, { body })),
  remove: (id) => data(client.delete(`/comments/${id}`)),
};

export const usersApi = {
  profile: (username) => data(client.get(`/users/${username}`)),
  posts: (username, params) => data(client.get(`/users/${username}/posts`, { params })),
  comments: (username, params) => data(client.get(`/users/${username}/comments`, { params })),
  activity: (username) => data(client.get(`/users/${username}/activity`)),
  updateBio: (bio) => data(client.patch('/users/me', { bio })),
};

export const notificationsApi = {
  list: () => data(client.get('/notifications')),
  markRead: (id) => data(client.patch(`/notifications/${id}/read`)),
  markAllRead: () => data(client.patch('/notifications/read-all')),
};

export const chatApi = {
  history: (category, params) => data(client.get(`/chat/${category}/messages`, { params })),
};

export const adminApi = {
  stats: () => data(client.get('/admin/stats')),
  users: (params) => data(client.get('/admin/users', { params })),
  setBanned: (id, banned) => data(client.patch(`/admin/users/${id}/ban`, { banned })),
};
