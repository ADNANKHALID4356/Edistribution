import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import salesmanService from '../../services/salesmanService';
import './SalesmanListingPage.css';

function SalesmanListingPage() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [salesmen, setSalesmen] = useState([]);
  const [loading, setLoading] = useState(true);
      const [stats, setStats] = useState({ total: 0, active: 0, cities: 0 });
  
  // Filters and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [cities, setCities] = useState([]);
  
  // Delete confirmation modal state
  const [deleteModal, setDeleteModal] = useState({
    show: false,
    id: null,
    name: '',
    isPermanent: false
  });

  // Credential management modal states
  const [credentialModal, setCredentialModal] = useState({
    show: false,
    username: '',
    password: '',
    message: '',
    salesmanName: ''
  });

  const [resetPasswordModal, setResetPasswordModal] = useState({
    show: false,
    salesmanId: null,
    salesmanName: '',
    newPassword: '',
    showResult: false,
    resultUsername: '',
    resultPassword: ''
  });

  // Salary Ledger modal state
  const [ledgerModal, setLedgerModal] = useState({
    show: false,
    salesmanId: null,
    salesmanName: '',
    showForm: false,
    ledgerHistory: [],
    ledgerSummary: null,
    loading: false,
    amount: '',
    transactionType: 'salary',
    paymentMethod: 'cash',
    referenceNumber: '',
    description: '',
    notes: '',
    transactionDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchSalesmen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTerm, cityFilter, statusFilter]);

  const fetchSalesmen = async () => {
    setLoading(true);
    
    try {
      const filters = {
        page: currentPage,
        limit: 10,
        search: searchTerm,
        city: cityFilter,
        status: statusFilter
      };

      const response = await salesmanService.getAllSalesmen(filters);
      
      // Backend returns: { success, data: [...salesmen], pagination: {...} }
      const salesmenData = response.data || [];
      const paginationData = response.pagination || { total: 0, page: 1, totalPages: 1 };
      
      setSalesmen(salesmenData);
      
      // Extract unique cities for filter dropdown
      const uniqueCities = [...new Set(salesmenData.map(s => s.city).filter(Boolean))];
      setCities(uniqueCities);
      
      setStats({
        total: paginationData.total,
        active: salesmenData.filter(s => s.is_active === 1).length,
        inactive: salesmenData.filter(s => s.is_active === 0).length
      });
      setCurrentPage(paginationData.page || currentPage);
      setTotalPages(paginationData.totalPages || 1);
      
    } catch (err) {
      showToast('Failed to fetch salesmen: ' + (err.message || 'Unknown error'), 'error');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle delete - Two-step process
  const handleDelete = async (id, name, isActive) => {
    if (isActive === 1) {
      // First click: Soft delete (mark as inactive)
      try {
        await salesmanService.deleteSalesman(id);
        fetchSalesmen();
      } catch (err) {
        showToast('Failed to deactivate salesman', 'error');
        console.error('Delete error:', err);
      }
    } else {
      // Second click: Show permanent delete confirmation
      setDeleteModal({
        show: true,
        id,
        name,
        isPermanent: true
      });
    }
  };

  // Confirm permanent delete
  const confirmPermanentDelete = async () => {
    try {
      await salesmanService.permanentDeleteSalesman(deleteModal.id);
      showToast(`✓ "${deleteModal.name}" has been permanently deleted from the database.`, 'success');
      setTimeout(() => {}, 5000);
      setDeleteModal({ show: false, id: null, name: '', isPermanent: false });
      
      // Reset to page 1 if current page becomes empty
      if (salesmen.length === 1 && currentPage > 1) {
        setCurrentPage(1);
      } else {
        fetchSalesmen();
      }
    } catch (err) {
      showToast('Failed to permanently delete salesman', 'error');
      console.error('Permanent delete error:', err);
      setDeleteModal({ show: false, id: null, name: '', isPermanent: false });
    }
  };

  // Cancel delete
  const cancelDelete = () => {
    setDeleteModal({ show: false, id: null, name: '', isPermanent: false });
  };

  // Handle view credentials
  const handleViewCredentials = async (id, name) => {
    try {
      const response = await salesmanService.getCredentials(id);
      const data = response.data || response;
      setCredentialModal({
        show: true,
        username: data.username || '',
        password: data.password || '',
        message: data.message || '',
        salesmanName: name
      });
    } catch (err) {
      showToast('Failed to retrieve credentials: ' + (err.message || 'Unknown error'), 'error');
      setTimeout(() => {}, 5000);
      console.error('Get credentials error:', err);
    }
  };

  // Close credential modal
  const closeCredentialModal = () => {
    setCredentialModal({
      show: false,
      username: '',
      password: '',
      message: '',
      salesmanName: ''
    });
  };

  // Copy to clipboard with fallback
  const copyToClipboard = (text, label) => {
    // Check if text is valid
    if (!text || text.trim() === '') {
      showToast(`❌ No ${label} to copy`, 'error');
      setTimeout(() => {}, 3000);
      return;
    }

    // Modern clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => {
          showToast(`✓ ${label} copied to clipboard!`, 'success');
          setTimeout(() => {}, 3000);
        })
        .catch((err) => {
          console.error('Clipboard API failed:', err);
          fallbackCopyToClipboard(text, label);
        });
    } else {
      // Fallback for older browsers
      fallbackCopyToClipboard(text, label);
    }
  };

  // Fallback copy method using textarea
  const fallbackCopyToClipboard = (text, label) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        showToast(`✓ ${label} copied to clipboard!`, 'success');
        setTimeout(() => {}, 3000);
      } else {
        showToast(`❌ Failed to copy ${label}. Please copy manually.`, 'error');
        setTimeout(() => {}, 3000);
      }
    } catch (err) {
      console.error('Fallback copy failed:', err);
      showToast(`❌ Copy failed. Please select and copy manually: ${text}`, 'error');
      setTimeout(() => {}, 5000);
    }
    
    document.body.removeChild(textarea);
  };

  // Handle reset password
  const handleResetPassword = (id, name) => {
    setResetPasswordModal({
      show: true,
      salesmanId: id,
      salesmanName: name,
      newPassword: '',
      showResult: false,
      resultUsername: '',
      resultPassword: ''
    });
  };

  // Generate random password
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setResetPasswordModal(prev => ({ ...prev, newPassword: password }));
  };

  // Submit password reset
  const submitPasswordReset = async () => {
    if (!resetPasswordModal.newPassword || resetPasswordModal.newPassword.length < 6) {
      showToast('Password must be at least 6 characters long', 'error');
      setTimeout(() => {}, 5000);
      return;
    }

    try {
      const response = await salesmanService.resetPassword(
        resetPasswordModal.salesmanId,
        resetPasswordModal.newPassword
      );
      
      const data = response.data || response;
      setResetPasswordModal(prev => ({
        ...prev,
        showResult: true,
        resultUsername: data.username || '',
        resultPassword: data.new_password || data.password || ''
      }));
    } catch (err) {
      showToast('Failed to reset password: ' + (err.message || 'Unknown error'), 'error');
      setTimeout(() => {}, 5000);
      console.error('Reset password error:', err);
    }
  };

  // Close reset password modal
  const closeResetPasswordModal = () => {
    setResetPasswordModal({
      show: false,
      salesmanId: null,
      salesmanName: '',
      newPassword: '',
      showResult: false,
      resultUsername: '',
      resultPassword: ''
    });
  };

  // Navigation handlers
  const handleBack = () => {
    navigate('/dashboard');
  };

  const handleAddNew = () => {
    navigate('/salesmen/add');
  };

  const handleEdit = (id) => {
    navigate(`/salesmen/edit/${id}`);
  };

  const handleViewRoutes = (id) => {
    navigate(`/salesmen/${id}/routes`);
  };

  // Handle salary ledger
  const handleOpenLedger = async (id, name) => {
    setLedgerModal({
      show: true,
      salesmanId: id,
      salesmanName: name,
      showForm: false,
      ledgerHistory: [],
      ledgerSummary: null,
      loading: true,
      amount: '',
      transactionType: 'salary',
      paymentMethod: 'cash',
      referenceNumber: '',
      description: '',
      notes: '',
      transactionDate: new Date().toISOString().split('T')[0]
    });

    // Fetch ledger history
    try {
      const [historyResponse, summaryResponse] = await Promise.all([
        salesmanService.getSalesmanLedger(id),
        salesmanService.getSalarySummary(id)
      ]);

      setLedgerModal(prev => ({
        ...prev,
        ledgerHistory: historyResponse.data || [],
        ledgerSummary: summaryResponse.data || null,
        loading: false
      }));
    } catch (err) {
      console.error('Failed to fetch ledger:', err);
      setLedgerModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSaveSalary = async () => {
    try {
      const { salesmanId, amount, transactionType, paymentMethod, referenceNumber, description, notes, transactionDate } = ledgerModal;
      
      if (!amount || parseFloat(amount) <= 0) {
        showToast('Please enter a valid amount', 'error');
        setTimeout(() => {}, 5000);
        return;
      }

      const response = await salesmanService.createLedgerEntry({
        salesman_id: salesmanId,
        amount: parseFloat(amount),
        transaction_type: transactionType,
        payment_method: paymentMethod,
        reference_number: referenceNumber,
        description: description,
        notes: notes,
        transaction_date: transactionDate
      });

      if (response.success) {
        showToast('Salary record added successfully!', 'success');
        setTimeout(() => {}, 5000);
        // Refresh ledger history
        const [historyResponse, summaryResponse] = await Promise.all([
          salesmanService.getSalesmanLedger(salesmanId),
          salesmanService.getSalarySummary(salesmanId)
        ]);
        
        setLedgerModal(prev => ({
          ...prev,
          showForm: false,
          ledgerHistory: historyResponse.data || [],
          ledgerSummary: summaryResponse.data || null,
          amount: '',
          transactionType: 'salary',
          paymentMethod: 'cash',
          referenceNumber: '',
          description: '',
          notes: '',
          transactionDate: new Date().toISOString().split('T')[0]
        }));
      }
    } catch (err) {
      showToast('Failed to add salary record: ' + (err.message || 'Unknown error'), 'error');
      setTimeout(() => {}, 5000);
      console.error('Add salary error:', err);
    }
  };

  const handleDeleteLedgerEntry = async (entryId) => {
    try {
      await salesmanService.deleteLedgerEntry(entryId);
      showToast('Entry deleted successfully!', 'success');
      setTimeout(() => {}, 5000);
      
      // Refresh ledger history
      const [historyResponse, summaryResponse] = await Promise.all([
        salesmanService.getSalesmanLedger(ledgerModal.salesmanId),
        salesmanService.getSalarySummary(ledgerModal.salesmanId)
      ]);
      
      setLedgerModal(prev => ({
        ...prev,
        ledgerHistory: historyResponse.data || [],
        ledgerSummary: summaryResponse.data || null
      }));
    } catch (err) {
      showToast('Failed to delete entry: ' + (err.message || 'Unknown error'), 'error');
      setTimeout(() => {}, 5000);
      console.error('Delete error:', err);
    }
  };

  // Pagination handlers
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  // Filter handlers
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page on search
  };

  const handleCityFilterChange = (e) => {
    setCityFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="salesman-listing-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading salesmen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="salesman-listing-page">
      {/* Header with Back Button */}
      <div className="page-header">
        <div className="header-left">
          <button className="back-button" onClick={handleBack}>
            ← Back to Dashboard
          </button>
          <div className="header-title">
            <h1>Salesman Management</h1>
            <p>Manage your sales team and route assignments</p>
          </div>
        </div>
        <button className="add-button" onClick={handleAddNew}>
          + Add New Salesman
        </button>
      </div>

      

      

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-row">
          <div className="filter-group">
            <label>Search</label>
            <input 
              type="text" 
              placeholder="Search by name, code, city..." 
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
          <div className="filter-group">
            <label>City</label>
            <select value={cityFilter} onChange={handleCityFilterChange}>
              <option value="">All Cities</option>
              {cities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Status</label>
            <select value={statusFilter} onChange={handleStatusFilterChange}>
              <option value="">All Status</option>
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Salesmen</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.active}</div>
          <div className="stat-label">Active</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.inactive}</div>
          <div className="stat-label">Inactive</div>
        </div>
      </div>

      {/* Table Section */}
      <div className="table-section">
        {salesmen.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👤</div>
            <p>No salesmen found. Add your first salesman to get started.</p>
          </div>
        ) : (
          <>
            <table className="salesmen-table">
              <thead>
                <tr>
                  <th>CODE</th>
                  <th>SALESMAN NAME</th>
                  <th>PHONE</th>
                  <th>CITY</th>
                  <th>MONTHLY TARGET</th>
                  <th>COMMISSION</th>
                  <th>HIRE DATE</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {salesmen.map((salesman) => (
                  <tr key={salesman.id}>
                    <td>
                      <span className="code-badge">{salesman.salesman_code}</span>
                    </td>
                    <td>
                      <div className="name-cell">
                        <span className="salesman-name">{salesman.full_name}</span>
                        <span className="salesman-email">{salesman.email || 'N/A'}</span>
                      </div>
                    </td>
                    <td>{salesman.phone}</td>
                    <td>
                      <span className="city-badge">{salesman.city}</span>
                    </td>
                    <td>PKR {Number(salesman.monthly_target || 0).toLocaleString()}</td>
                    <td>{salesman.commission_percentage}%</td>
                    <td>{new Date(salesman.hire_date).toLocaleDateString()}</td>
                    <td>
                      <span className={`status-badge ${salesman.is_active === 1 ? 'status-active' : 'status-inactive'}`}>
                        {salesman.is_active === 1 ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="action-btn btn-edit" 
                          onClick={() => handleEdit(salesman.id)}
                          title="Edit"
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          className="action-btn btn-routes" 
                          onClick={() => handleViewRoutes(salesman.id)}
                          title="Routes"
                        >
                          🗺️ Routes
                        </button>
                        <button 
                          className="action-btn btn-ledger" 
                          onClick={() => handleOpenLedger(salesman.id, salesman.full_name)}
                          title="Salary Ledger"
                        >
                          📊 Ledger
                        </button>
                        <button 
                          className="action-btn btn-credentials" 
                          onClick={() => handleViewCredentials(salesman.id, salesman.full_name)}
                          title="View Credentials"
                        >
                          🔑 Credentials
                        </button>
                        <button 
                          className="action-btn btn-reset-password" 
                          onClick={() => handleResetPassword(salesman.id, salesman.full_name)}
                          title="Reset Password"
                        >
                          🔄 Reset Password
                        </button>
                        <button 
                          className="action-btn btn-delete" 
                          onClick={() => handleDelete(salesman.id, salesman.full_name, salesman.is_active)}
                          title={salesman.is_active === 1 ? "Deactivate" : "Permanently Delete"}
                        >
                          🗑️ {salesman.is_active === 1 ? 'Deactivate' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="pagination">
              <button 
                onClick={handlePreviousPage} 
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span className="pagination-info">
                Page {currentPage} of {totalPages}
              </span>
              <button 
                onClick={handleNextPage} 
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>

      {/* Permanent Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-icon">⚠️</span>
              <h2>Permanent Delete Confirmation</h2>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to <strong>permanently delete</strong> salesman:
              </p>
              <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#dc2626', margin: '16px 0' }}>
                {deleteModal.name}
              </p>
              <p>
                This action <strong>CANNOT be undone</strong>. The salesman data will be completely removed from the database.
              </p>
            </div>
            <div className="modal-actions">
              <button className="modal-btn btn-cancel" onClick={cancelDelete}>
                Cancel
              </button>
              <button className="modal-btn btn-confirm-delete" onClick={confirmPermanentDelete}>
                Yes, Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credential View Modal */}
      {credentialModal.show && (
        <div className="modal-overlay" onClick={closeCredentialModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-icon">🔑</span>
              <h2>Login Credentials</h2>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '16px', color: '#666' }}>
                Credentials for: <strong>{credentialModal.salesmanName}</strong>
              </p>
              
              {credentialModal.message ? (
                <div style={{ 
                  padding: '16px', 
                  backgroundColor: '#fef3c7', 
                  border: '1px solid #fbbf24',
                  borderRadius: '6px',
                  marginBottom: '16px'
                }}>
                  <p style={{ color: '#92400e', margin: 0 }}>
                    ⚠️ {credentialModal.message}
                  </p>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>
                      Username:
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        type="text" 
                        value={credentialModal.username} 
                        readOnly 
                        style={{ 
                          flex: 1, 
                          padding: '8px', 
                          border: '1px solid #ddd', 
                          borderRadius: '4px',
                          backgroundColor: '#f9f9f9'
                        }}
                      />
                      <button 
                        className="modal-btn btn-copy"
                        onClick={() => copyToClipboard(credentialModal.username, 'Username')}
                      >
                        📋 Copy
                      </button>
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>
                      Password:
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        type="text" 
                        value={credentialModal.password} 
                        readOnly 
                        style={{ 
                          flex: 1, 
                          padding: '8px', 
                          border: '1px solid #ddd', 
                          borderRadius: '4px',
                          backgroundColor: '#f9f9f9'
                        }}
                      />
                      <button 
                        className="modal-btn btn-copy"
                        onClick={() => copyToClipboard(credentialModal.password, 'Password')}
                      >
                        📋 Copy
                      </button>
                    </div>
                  </div>

                  <div style={{ 
                    padding: '12px', 
                    backgroundColor: '#fef2f2', 
                    border: '1px solid #fca5a5',
                    borderRadius: '6px'
                  }}>
                    <p style={{ color: '#991b1b', margin: 0, fontSize: '14px' }}>
                      🔒 <strong>Security Notice:</strong> Store these credentials securely. Do not share via unsecured channels.
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="modal-actions">
              <button className="modal-btn btn-cancel" onClick={closeCredentialModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordModal.show && (
        <div className="modal-overlay" onClick={closeResetPasswordModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-icon">🔄</span>
              <h2>Reset Password</h2>
            </div>
            <div className="modal-body">
              {!resetPasswordModal.showResult ? (
                <>
                  <p style={{ marginBottom: '16px', color: '#666' }}>
                    Reset password for: <strong>{resetPasswordModal.salesmanName}</strong>
                  </p>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>
                      New Password (minimum 6 characters):
                    </label>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <input 
                        type="text" 
                        value={resetPasswordModal.newPassword}
                        onChange={(e) => setResetPasswordModal(prev => ({ ...prev, newPassword: e.target.value }))}
                        placeholder="Enter new password..."
                        style={{ 
                          flex: 1, 
                          padding: '8px', 
                          border: '1px solid #ddd', 
                          borderRadius: '4px'
                        }}
                      />
                      <button 
                        className="modal-btn btn-generate"
                        onClick={generateRandomPassword}
                      >
                        🎲 Generate
                      </button>
                    </div>
                    <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>
                      Click "Generate" to create a strong random password
                    </p>
                  </div>

                  <div style={{ 
                    padding: '12px', 
                    backgroundColor: '#fef3c7', 
                    border: '1px solid #fbbf24',
                    borderRadius: '6px'
                  }}>
                    <p style={{ color: '#92400e', margin: 0, fontSize: '14px' }}>
                      ⚠️ <strong>Important:</strong> The new password will be displayed only once after reset. Make sure to save it securely.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ 
                    padding: '16px', 
                    backgroundColor: '#dcfce7', 
                    border: '1px solid #86efac',
                    borderRadius: '6px',
                    marginBottom: '16px'
                  }}>
                    <p style={{ color: '#166534', margin: 0, fontWeight: 'bold' }}>
                      ✓ Password reset successful!
                    </p>
                  </div>

                  <p style={{ marginBottom: '16px', color: '#666' }}>
                    New credentials for: <strong>{resetPasswordModal.salesmanName}</strong>
                  </p>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>
                      Username:
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        type="text" 
                        value={resetPasswordModal.resultUsername} 
                        readOnly 
                        style={{ 
                          flex: 1, 
                          padding: '8px', 
                          border: '1px solid #ddd', 
                          borderRadius: '4px',
                          backgroundColor: '#f9f9f9'
                        }}
                      />
                      <button 
                        className="modal-btn btn-copy"
                        onClick={() => copyToClipboard(resetPasswordModal.resultUsername, 'Username')}
                      >
                        📋 Copy
                      </button>
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>
                      New Password:
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        type="text" 
                        value={resetPasswordModal.resultPassword} 
                        readOnly 
                        style={{ 
                          flex: 1, 
                          padding: '8px', 
                          border: '1px solid #ddd', 
                          borderRadius: '4px',
                          backgroundColor: '#f9f9f9'
                        }}
                      />
                      <button 
                        className="modal-btn btn-copy"
                        onClick={() => copyToClipboard(resetPasswordModal.resultPassword, 'Password')}
                      >
                        📋 Copy
                      </button>
                    </div>
                  </div>

                  <div style={{ 
                    padding: '12px', 
                    backgroundColor: '#fef2f2', 
                    border: '1px solid #fca5a5',
                    borderRadius: '6px'
                  }}>
                    <p style={{ color: '#991b1b', margin: 0, fontSize: '14px' }}>
                      🔒 <strong>One-Time Display:</strong> This password will not be shown again. Save it now!
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="modal-actions">
              {!resetPasswordModal.showResult ? (
                <>
                  <button className="modal-btn btn-cancel" onClick={closeResetPasswordModal}>
                    Cancel
                  </button>
                  <button className="modal-btn btn-confirm" onClick={submitPasswordReset}>
                    Reset Password
                  </button>
                </>
              ) : (
                <button className="modal-btn btn-cancel" onClick={closeResetPasswordModal}>
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Salary Ledger Modal */}
      {ledgerModal.show && (
        <div className="modal-overlay" onClick={() => setLedgerModal({ ...ledgerModal, show: false })}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: ledgerModal.showForm ? '600px' : '900px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h2>💰 {ledgerModal.showForm ? 'Add New Entry' : 'Salary Ledger'}: {ledgerModal.salesmanName}</h2>
              <button className="modal-close" onClick={() => setLedgerModal({ ...ledgerModal, show: false })}>×</button>
            </div>
            
            {ledgerModal.loading ? (
              <div className="modal-body" style={{ textAlign: 'center', padding: '40px' }}>
                <p>Loading ledger...</p>
              </div>
            ) : ledgerModal.showForm ? (
              // Form View
              <>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Transaction Type *</label>
                    <select 
                      value={ledgerModal.transactionType}
                      onChange={(e) => setLedgerModal({ ...ledgerModal, transactionType: e.target.value })}
                      style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                    >
                      <option value="salary">Salary</option>
                      <option value="advance">Advance</option>
                      <option value="commission">Commission</option>
                      <option value="deduction">Deduction</option>
                      <option value="adjustment">Adjustment</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Amount (PKR) *</label>
                    <input 
                      type="number"
                      value={ledgerModal.amount}
                      onChange={(e) => setLedgerModal({ ...ledgerModal, amount: e.target.value })}
                      placeholder="Enter amount"
                      min="0"
                      step="0.01"
                      style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </div>

                  <div className="form-group">
                    <label>Transaction Date *</label>
                    <input 
                      type="date"
                      value={ledgerModal.transactionDate}
                      onChange={(e) => setLedgerModal({ ...ledgerModal, transactionDate: e.target.value })}
                      style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </div>

                  <div className="form-group">
                    <label>Payment Method</label>
                    <select 
                      value={ledgerModal.paymentMethod}
                      onChange={(e) => setLedgerModal({ ...ledgerModal, paymentMethod: e.target.value })}
                      style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                    >
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cheque">Cheque</option>
                      <option value="online">Online Payment</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Reference Number</label>
                    <input 
                      type="text"
                      value={ledgerModal.referenceNumber}
                      onChange={(e) => setLedgerModal({ ...ledgerModal, referenceNumber: e.target.value })}
                      placeholder="e.g., Cheque #, Transaction ID"
                      style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </div>

                  <div className="form-group">
                    <label>Description</label>
                    <input 
                      type="text"
                      value={ledgerModal.description}
                      onChange={(e) => setLedgerModal({ ...ledgerModal, description: e.target.value })}
                      placeholder="e.g., Monthly Salary - January 2026"
                      style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </div>

                  <div className="form-group">
                    <label>Notes</label>
                    <textarea 
                      value={ledgerModal.notes}
                      onChange={(e) => setLedgerModal({ ...ledgerModal, notes: e.target.value })}
                      placeholder="Additional notes (optional)"
                      rows="3"
                      style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', resize: 'vertical' }}
                    />
                  </div>
                </div>
                <div className="modal-actions">
                  <button className="modal-btn btn-cancel" onClick={() => setLedgerModal({ ...ledgerModal, showForm: false })}>
                    ← Back to History
                  </button>
                  <button className="modal-btn btn-confirm" onClick={handleSaveSalary}>
                    💾 Save Entry
                  </button>
                </div>
              </>
            ) : (
              // History View
              <>
                <div className="modal-body" style={{ padding: '20px' }}>
                  {/* Summary Cards */}
                  {ledgerModal.ledgerSummary && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                      <div style={{ background: '#e0f2fe', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: '#0369a1', marginBottom: '5px' }}>Total Salary</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0c4a6e' }}>Rs. {(ledgerModal.ledgerSummary.total_salary || 0).toLocaleString()}</div>
                      </div>
                      <div style={{ background: '#fef3c7', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: '#92400e', marginBottom: '5px' }}>Advances</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#78350f' }}>Rs. {(ledgerModal.ledgerSummary.total_advance || 0).toLocaleString()}</div>
                      </div>
                      <div style={{ background: '#d1fae5', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: '#065f46', marginBottom: '5px' }}>Commissions</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#064e3b' }}>Rs. {(ledgerModal.ledgerSummary.total_commission || 0).toLocaleString()}</div>
                      </div>
                      <div style={{ background: '#fecaca', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: '#991b1b', marginBottom: '5px' }}>Deductions</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#7f1d1d' }}>Rs. {(ledgerModal.ledgerSummary.total_deduction || 0).toLocaleString()}</div>
                      </div>
                    </div>
                  )}

                  {/* Add New Button */}
                  <div style={{ marginBottom: '20px', textAlign: 'right' }}>
                    <button 
                      className="modal-btn btn-confirm" 
                      onClick={() => setLedgerModal({ ...ledgerModal, showForm: true })}
                      style={{ padding: '10px 20px' }}
                    >
                      ➕ Add New Entry
                    </button>
                  </div>

                  {/* History Table */}
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                      <thead>
                        <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                          <th style={{ padding: '12px 8px', textAlign: 'left' }}>Date</th>
                          <th style={{ padding: '12px 8px', textAlign: 'left' }}>Type</th>
                          <th style={{ padding: '12px 8px', textAlign: 'right' }}>Amount</th>
                          <th style={{ padding: '12px 8px', textAlign: 'left' }}>Method</th>
                          <th style={{ padding: '12px 8px', textAlign: 'left' }}>Description</th>
                          <th style={{ padding: '12px 8px', textAlign: 'center' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledgerModal.ledgerHistory.length === 0 ? (
                          <tr>
                            <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#9ca3af' }}>
                              No entries yet. Click "Add New Entry" to create the first record.
                            </td>
                          </tr>
                        ) : (
                          ledgerModal.ledgerHistory.map((entry) => (
                            <tr key={entry.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                              <td style={{ padding: '12px 8px' }}>{new Date(entry.transaction_date).toLocaleDateString()}</td>
                              <td style={{ padding: '12px 8px' }}>
                                <span style={{ 
                                  padding: '4px 8px', 
                                  borderRadius: '4px', 
                                  fontSize: '12px',
                                  background: entry.transaction_type === 'salary' ? '#dbeafe' : 
                                            entry.transaction_type === 'advance' ? '#fef3c7' : 
                                            entry.transaction_type === 'commission' ? '#d1fae5' : 
                                            entry.transaction_type === 'deduction' ? '#fecaca' : '#f3f4f6',
                                  color: entry.transaction_type === 'salary' ? '#1e40af' : 
                                         entry.transaction_type === 'advance' ? '#92400e' : 
                                         entry.transaction_type === 'commission' ? '#065f46' : 
                                         entry.transaction_type === 'deduction' ? '#991b1b' : '#374151'
                                }}>
                                  {entry.transaction_type.charAt(0).toUpperCase() + entry.transaction_type.slice(1)}
                                </span>
                              </td>
                              <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600' }}>
                                Rs. {parseFloat(entry.amount).toLocaleString()}
                              </td>
                              <td style={{ padding: '12px 8px', textTransform: 'capitalize' }}>
                                {entry.payment_method?.replace('_', ' ') || '-'}
                              </td>
                              <td style={{ padding: '12px 8px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {entry.description || '-'}
                              </td>
                              <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                                <button 
                                  onClick={() => handleDeleteLedgerEntry(entry.id)}
                                  style={{ 
                                    padding: '4px 8px', 
                                    background: '#fee2e2', 
                                    color: '#991b1b', 
                                    border: 'none', 
                                    borderRadius: '4px', 
                                    cursor: 'pointer',
                                    fontSize: '12px'
                                  }}
                                  title="Delete entry"
                                >
                                  🗑️ Delete
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="modal-actions">
                  <button className="modal-btn btn-cancel" onClick={() => setLedgerModal({ ...ledgerModal, show: false })}>
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SalesmanListingPage;
