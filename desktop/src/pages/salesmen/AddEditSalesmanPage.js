/**
 * Add/Edit Salesman Page
 * Sprint 4: Salesman Management System
 * Company: Ummahtechinnovations.com
 */

import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { useNavigate, useParams } from 'react-router-dom';
import salesmanService from '../../services/salesmanService';
import './AddEditSalesmanPage.css';

const AddEditSalesmanPage = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    salesman_code: '',
    full_name: '',
    phone: '',
    email: '',
    cnic: '',
    address: '',
    city: '',
    hire_date: new Date().toISOString().split('T')[0],
    monthly_target: '0',
    commission_percentage: '2.00',
    is_active: 1,
    username: '',
    password: ''
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
    
  useEffect(() => {
    if (isEditMode) {
      fetchSalesmanData();
    } else {
      generateSalesmanCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const generateSalesmanCode = () => {
    const code = 'SM' + String(Date.now()).slice(-6);
    setFormData(prev => ({ ...prev, salesman_code: code }));
  };

  const fetchSalesmanData = async () => {
    try {
      setLoading(true);
      const response = await salesmanService.getSalesmanById(id);
      
      if (response.success) {
        const salesman = response.data;
        setFormData({
          salesman_code: salesman.salesman_code,
          full_name: salesman.full_name,
          phone: salesman.phone,
          email: salesman.email || '',
          cnic: salesman.cnic,
          address: salesman.address || '',
          city: salesman.city,
          hire_date: new Date(salesman.hire_date).toISOString().split('T')[0],
          monthly_target: salesman.monthly_target,
          commission_percentage: salesman.commission_percentage,
          is_active: salesman.is_active
        });
      }
    } catch (error) {
      console.error('Error fetching salesman:', error);
      showToast('Failed to fetch salesman data: ' + (error.response?.data?.message || error.message), 'error');
      setTimeout(() => {}, 5000);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.salesman_code.trim()) {
      newErrors.salesman_code = 'Salesman code is required';
    }

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    } else if (!/^[+0-9\-\s()]+$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone format';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.cnic.trim()) {
      newErrors.cnic = 'CNIC is required';
    } else if (!/^\d{5}-\d{7}-\d{1}$/.test(formData.cnic)) {
      newErrors.cnic = 'CNIC format should be XXXXX-XXXXXXX-X';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!formData.hire_date) {
      newErrors.hire_date = 'Hire date is required';
    }

    // Validate username and password only for new salesman
    if (!isEditMode) {
      if (!formData.username.trim()) {
        newErrors.username = 'Username is required for login credentials';
      } else if (formData.username.length < 4) {
        newErrors.username = 'Username must be at least 4 characters';
      } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
        newErrors.username = 'Username can only contain letters, numbers, and underscores';
      }

      if (!formData.password.trim()) {
        newErrors.password = 'Password is required for login credentials';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }
    }

    if (parseFloat(formData.monthly_target) < 0) {
      newErrors.monthly_target = 'Monthly target cannot be negative';
    }

    if (parseFloat(formData.commission_percentage) < 0 || parseFloat(formData.commission_percentage) > 100) {
      newErrors.commission_percentage = 'Commission must be between 0 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? 1 : 0) : value
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast('Please fix the errors in the form', 'error');
      setTimeout(() => {}, 5000);
      return;
    }

    try {
      setLoading(true);

      const submitData = {
        ...formData,
        monthly_target: parseFloat(formData.monthly_target),
        commission_percentage: parseFloat(formData.commission_percentage)
      };

      let response;
      if (isEditMode) {
        response = await salesmanService.updateSalesman(id, submitData);
      } else {
        response = await salesmanService.createSalesman(submitData);
      }

      if (response.success) {
        if (!isEditMode && response.data.login_credentials) {
          // Show credentials to admin
          showToast(
            `✅ Salesman created successfully! ` +
            `Login Credentials - Username: ${response.data.login_credentials.username}, ` +
            `Password: ${response.data.login_credentials.password} - ` +
            `⚠️ IMPORTANT: Copy and share these credentials. Password cannot be retrieved later!`
          , 'success');
          setTimeout(() => navigate('/salesmen'), 8000);
        } else {
          showToast(isEditMode ? 'Salesman updated successfully!' : 'Salesman created successfully!', 'success');
          setTimeout(() => navigate('/salesmen'), 2000);
        }
      }
    } catch (error) {
      console.error('Error saving salesman:', error);
      showToast('Failed to save salesman: ' + (error.response?.data?.message || error.message), 'error');
      setTimeout(() => {}, 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-edit-salesman-page">
      <div className="page-header">
        <h1>{isEditMode ? 'Edit Salesman' : 'Add New Salesman'}</h1>
        <button className="btn-back" onClick={() => navigate('/salesmen')}>
          ← Back to List
        </button>
      </div>

      

      

      <form className="salesman-form" onSubmit={handleSubmit}>
        <div className="form-section">
          <h2>Basic Information</h2>
          
          <div className="form-row">
            <div className="form-group">
              <label>
                Salesman Code <span className="required">*</span>
              </label>
              <input
                type="text"
                name="salesman_code"
                value={formData.salesman_code}
                onChange={handleChange}
                disabled={isEditMode}
                className={errors.salesman_code ? 'error' : ''}
              />
              {errors.salesman_code && <span className="error-msg">{errors.salesman_code}</span>}
            </div>

            <div className="form-group">
              <label>
                Full Name <span className="required">*</span>
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="Enter full name"
                className={errors.full_name ? 'error' : ''}
              />
              {errors.full_name && <span className="error-msg">{errors.full_name}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>
                Phone <span className="required">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+92-300-1234567"
                className={errors.phone ? 'error' : ''}
              />
              {errors.phone && <span className="error-msg">{errors.phone}</span>}
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="email@example.com"
                className={errors.email ? 'error' : ''}
              />
              {errors.email && <span className="error-msg">{errors.email}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>
                CNIC <span className="required">*</span>
              </label>
              <input
                type="text"
                name="cnic"
                value={formData.cnic}
                onChange={handleChange}
                placeholder="XXXXX-XXXXXXX-X"
                className={errors.cnic ? 'error' : ''}
              />
              {errors.cnic && <span className="error-msg">{errors.cnic}</span>}
            </div>

            <div className="form-group">
              <label>
                City <span className="required">*</span>
              </label>
              <select
                name="city"
                value={formData.city}
                onChange={handleChange}
                className={errors.city ? 'error' : ''}
              >
                <option value="">Select City</option>
                <option value="Karachi">Karachi</option>
                <option value="Lahore">Lahore</option>
                <option value="Islamabad">Islamabad</option>
                <option value="Rawalpindi">Rawalpindi</option>
                <option value="Faisalabad">Faisalabad</option>
                <option value="Multan">Multan</option>
                <option value="Peshawar">Peshawar</option>
                <option value="Quetta">Quetta</option>
                <option value="Sialkot">Sialkot</option>
                <option value="Gujranwala">Gujranwala</option>
              </select>
              {errors.city && <span className="error-msg">{errors.city}</span>}
            </div>
          </div>

          <div className="form-group full-width">
            <label>Address</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Enter complete address"
              rows="3"
            />
          </div>
        </div>

        {/* Login Credentials Section - Only for New Salesman */}
        {!isEditMode && (
          <div className="form-section credentials-section">
            <h2>🔐 Login Credentials</h2>
            <p className="section-note">
              Create login credentials for this salesman to access the mobile app.
              These credentials will be shown only once after creation.
            </p>
            
            <div className="form-row">
              <div className="form-group">
                <label>
                  Username <span className="required">*</span>
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="e.g., salesman_ahmed"
                  className={errors.username ? 'error' : ''}
                  autoComplete="off"
                />
                {errors.username && <span className="error-msg">{errors.username}</span>}
                <span className="field-hint">Letters, numbers, and underscores only. Min 4 characters.</span>
              </div>

              <div className="form-group">
                <label>
                  Password <span className="required">*</span>
                </label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter password"
                    className={errors.password ? 'error' : ''}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                {errors.password && <span className="error-msg">{errors.password}</span>}
                <span className="field-hint">Minimum 6 characters. Salesman will use this to login.</span>
              </div>
            </div>
          </div>
        )}

        <div className="form-section">
          <h2>Employment Details</h2>
          
          <div className="form-row">
            <div className="form-group">
              <label>
                Hire Date <span className="required">*</span>
              </label>
              <input
                type="date"
                name="hire_date"
                value={formData.hire_date}
                onChange={handleChange}
                className={errors.hire_date ? 'error' : ''}
              />
              {errors.hire_date && <span className="error-msg">{errors.hire_date}</span>}
            </div>

            <div className="form-group">
              <label>Monthly Target (PKR)</label>
              <input
                type="number"
                name="monthly_target"
                value={formData.monthly_target}
                onChange={handleChange}
                min="0"
                step="1000"
                placeholder="0"
                className={errors.monthly_target ? 'error' : ''}
              />
              {errors.monthly_target && <span className="error-msg">{errors.monthly_target}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Commission Percentage (%)</label>
              <input
                type="number"
                name="commission_percentage"
                value={formData.commission_percentage}
                onChange={handleChange}
                min="0"
                max="100"
                step="0.25"
                placeholder="2.00"
                className={errors.commission_percentage ? 'error' : ''}
              />
              {errors.commission_percentage && <span className="error-msg">{errors.commission_percentage}</span>}
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active === 1}
                  onChange={handleChange}
                />
                <span>Active</span>
              </label>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn-cancel"
            onClick={() => navigate('/salesmen')}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-submit"
            disabled={loading}
          >
            {loading ? 'Saving...' : (isEditMode ? 'Update Salesman' : 'Create Salesman & Credentials')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddEditSalesmanPage;
