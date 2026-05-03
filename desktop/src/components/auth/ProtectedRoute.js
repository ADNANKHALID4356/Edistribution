import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const normalizeRole = (role) => {
    const normalized = String(role || '').trim().toLowerCase();
    if (normalized === 'manager') return 'Manager';
    if (normalized === 'warehouse') return 'Stock Manager';
    if (normalized === 'viewer') return 'Accountant';
    if (normalized === 'admin') return 'Admin';
    if (normalized === 'senior manager') return 'Senior Manager';
    if (normalized === 'stock manager') return 'Stock Manager';
    if (normalized === 'accountant') return 'Accountant';
    if (normalized === 'salesman') return 'Salesman';
    return role;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has required role
  if (allowedRoles.length > 0 && user) {
    const userRole = normalizeRole(user.role_name || user.role);
    const normalizedAllowedRoles = allowedRoles.map(normalizeRole);
    if (!normalizedAllowedRoles.includes(userRole)) {
      // User doesn't have permission, redirect to dashboard
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
            <p className="text-gray-600 mb-4">
              You don't have permission to access this page.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Required role: {allowedRoles.join(' or ')}
            </p>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }
  }

  return children;
};

export default ProtectedRoute;
