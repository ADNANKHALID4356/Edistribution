import api from './api';

const userService = {
  getUsers: async (params = {}) => {
    const response = await api.get('/desktop/users', { params });
    return response.data;
  },

  getRoles: async () => {
    const response = await api.get('/desktop/users/roles');
    return response.data;
  },

  createUser: async (payload) => {
    const response = await api.post('/desktop/users', payload);
    return response.data;
  },

  updateUser: async (id, payload) => {
    const response = await api.put(`/desktop/users/${id}`, payload);
    return response.data;
  },

  updateUserStatus: async (id, is_active) => {
    const response = await api.patch(`/desktop/users/${id}/status`, { is_active });
    return response.data;
  },

  resetUserPassword: async (id, new_password) => {
    const response = await api.patch(`/desktop/users/${id}/password`, { new_password });
    return response.data;
  },

  deleteUser: async (id) => {
    const response = await api.delete(`/desktop/users/${id}`);
    return response.data;
  }
};

export default userService;
