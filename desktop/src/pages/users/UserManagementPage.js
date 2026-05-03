import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import userService from '../../services/userService';

const defaultCreateForm = {
  username: '',
  full_name: '',
  email: '',
  phone: '',
  password: '',
  role_name: ''
};

const UserManagementPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [createForm, setCreateForm] = useState(defaultCreateForm);
  const [passwordDrafts, setPasswordDrafts] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState({ userId: null, expiresAt: 0 });
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [usersResponse, rolesResponse] = await Promise.all([
        userService.getUsers(),
        userService.getRoles()
      ]);
      setUsers(usersResponse.data || []);
      setRoles(rolesResponse.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!deleteConfirm.userId || !deleteConfirm.expiresAt) return undefined;
    const remainingMs = Math.max(deleteConfirm.expiresAt - Date.now(), 0);
    const timeoutId = setTimeout(() => {
      setDeleteConfirm({ userId: null, expiresAt: 0 });
    }, remainingMs);
    return () => clearTimeout(timeoutId);
  }, [deleteConfirm]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await userService.createUser(createForm);
      setCreateForm(defaultCreateForm);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user');
    }
  };

  const handleToggleStatus = async (targetUser) => {
    try {
      await userService.updateUserStatus(targetUser.id, !Boolean(targetUser.is_active));
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleRoleChange = async (targetUser, role_name) => {
    try {
      await userService.updateUser(targetUser.id, { role_name });
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update role');
    }
  };

  const handleResetPassword = async (targetUser) => {
    const nextPassword = (passwordDrafts[targetUser.id] || '').trim();
    if (nextPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    try {
      await userService.resetUserPassword(targetUser.id, nextPassword);
      setPasswordDrafts((prev) => ({ ...prev, [targetUser.id]: '' }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    }
  };

  const handleDeleteUser = async (targetUser) => {
    const now = Date.now();
    const isConfirmed =
      deleteConfirm.userId === targetUser.id && deleteConfirm.expiresAt > now;

    if (!isConfirmed) {
      setDeleteConfirm({ userId: targetUser.id, expiresAt: now + 5000 });
      showToast(
        `Click Delete again within 5 seconds to remove "${targetUser.full_name}".`,
        'warning'
      );
      return;
    }

    setDeleteConfirm({ userId: null, expiresAt: 0 });
    try {
      await userService.deleteUser(targetUser.id);
      showToast(`"${targetUser.full_name}" deleted successfully.`, 'success');
      await fetchData();
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to delete user';
      setError(message);
      showToast(message, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-sm text-gray-600">You can manage all user accounts and credentials.</p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-sm font-medium"
          >
            Back to Dashboard
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Create New User</h2>
          <form className="grid grid-cols-1 md:grid-cols-3 gap-4" onSubmit={handleCreateUser}>
            <input
              className="border rounded-md px-3 py-2 text-sm"
              placeholder="Username"
              value={createForm.username}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, username: e.target.value }))}
              required
            />
            <input
              className="border rounded-md px-3 py-2 text-sm"
              placeholder="Full Name"
              value={createForm.full_name}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, full_name: e.target.value }))}
              required
            />
            <input
              className="border rounded-md px-3 py-2 text-sm"
              placeholder="Email"
              value={createForm.email}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
            />
            <input
              className="border rounded-md px-3 py-2 text-sm"
              placeholder="Phone"
              value={createForm.phone}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, phone: e.target.value }))}
            />
            <input
              className="border rounded-md px-3 py-2 text-sm"
              type="password"
              placeholder="Password"
              value={createForm.password}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
              required
            />
            <select
              className="border rounded-md px-3 py-2 text-sm"
              value={createForm.role_name}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, role_name: e.target.value }))}
              required
            >
              <option value="">Select role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.role_name}>
                  {role.role_name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="md:col-span-3 w-full md:w-auto px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-medium"
            >
              Create User
            </button>
          </form>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Users</h2>
          </div>
          {loading ? (
            <div className="p-6 text-sm text-gray-600">Loading users...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">User</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Role</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Reset Password</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((row) => (
                    <tr key={row.id} className="border-t border-gray-100">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{row.full_name}</div>
                        <div className="text-gray-500">{row.username}</div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          className="border rounded-md px-2 py-1"
                          value={row.role_name}
                          onChange={(e) => handleRoleChange(row, e.target.value)}
                        >
                          {roles.map((role) => (
                            <option key={`${row.id}-${role.id}`} value={role.role_name}>
                              {role.role_name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleStatus(row)}
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            row.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {row.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <input
                            type="password"
                            placeholder="New password"
                            value={passwordDrafts[row.id] || ''}
                            onChange={(e) =>
                              setPasswordDrafts((prev) => ({ ...prev, [row.id]: e.target.value }))
                            }
                            className="border rounded-md px-2 py-1"
                          />
                          <button
                            onClick={() => handleResetPassword(row)}
                            className="px-3 py-1 bg-gray-800 text-white rounded-md hover:bg-gray-900"
                          >
                            Reset
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteUser(row)}
                          className={`px-3 py-1 text-white rounded-md text-xs ${
                            deleteConfirm.userId === row.id && deleteConfirm.expiresAt > Date.now()
                              ? 'bg-orange-500 hover:bg-orange-600'
                              : 'bg-red-600 hover:bg-red-700'
                          }`}
                        >
                          {deleteConfirm.userId === row.id && deleteConfirm.expiresAt > Date.now()
                            ? 'Confirm Delete'
                            : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserManagementPage;
