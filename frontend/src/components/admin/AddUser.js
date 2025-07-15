import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { userAPI, departmentAPI, teamAPI } from '../../utils/api';

const AddUser = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'Employee',
    department: '',
    employeeId: '',
    phoneNumber: '',
    designation: '',
    joiningDate: '',
    isActive: true
  });

  // Team assignment states
  const [showTeamCreation, setShowTeamCreation] = useState(false);
  const [teamFormData, setTeamFormData] = useState({
    selectedTeam: ''
  });
  const [availableUsers, setAvailableUsers] = useState({
    teams: []
  });

  useEffect(() => {
    fetchRoles();
    fetchDepartments();
    generateInitialEmployeeId();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await userAPI.getRoles();
      if (response.data.success) {
        setRoles(response.data.roles);
      }
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await departmentAPI.getAllDepartments({ limit: 100, isActive: true });
      if (response.data.departments) {
        setDepartments(response.data.departments);
      }
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
  };

  const fetchAvailableTeams = async () => {
    try {
      const response = await teamAPI.getAllTeams({ limit: 1000 });
      if (response.data.success) {
        setAvailableUsers({
          teams: response.data.teams || []
        });
      }
    } catch (err) {
      console.error('Failed to fetch available teams:', err);
    }
  };

  const generateInitialEmployeeId = async () => {
    try {
      const response = await userAPI.getNextEmployeeId('Employee');
      if (response.data.success) {
        setFormData(prev => ({
          ...prev,
          employeeId: response.data.employeeId
        }));
      }
    } catch (err) {
      console.error('Failed to generate initial employee ID:', err);
    }
  };

  const handleInputChange = async (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Auto-generate employee ID when role changes
    if (name === 'role' && value) {
      try {
        const response = await userAPI.getNextEmployeeId(value);
        if (response.data.success) {
          setFormData(prev => ({
            ...prev,
            employeeId: response.data.employeeId
          }));
        }
      } catch (err) {
        console.error('Failed to generate employee ID:', err);
      }
    }
    
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    } else if (formData.firstName.length > 50) {
      errors.firstName = 'First name must be less than 50 characters';
    }
    
    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    } else if (formData.lastName.length > 50) {
      errors.lastName = 'Last name must be less than 50 characters';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long';
    }
    
    if (!formData.role) {
      errors.role = 'Role is required';
    }
    
    if (formData.phoneNumber && !/^\+?[\d\s-()]+$/.test(formData.phoneNumber)) {
      errors.phoneNumber = 'Please enter a valid phone number';
    }
    
    if (formData.department && formData.department.length > 100) {
      errors.department = 'Department name must be less than 100 characters';
    }
    
    if (formData.designation && formData.designation.length > 100) {
      errors.designation = 'Designation must be less than 100 characters';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const getErrorMessage = (error) => {
    if (typeof error === 'string') {
      return error;
    }
    
    if (error?.response?.data) {
      const data = error.response.data;
      
      if (data.errors && Array.isArray(data.errors)) {
        return data.errors.map(err => err.msg || err.message).join(', ');
      }
      
      if (data.message) {
        const message = data.message.toLowerCase();
        if (message.includes('email already exists')) {
          return 'A user with this email address already exists. Please use a different email.';
        }
        if (message.includes('employee id already exists')) {
          return 'This Employee ID is already in use. Please choose a different one.';
        }
        if (message.includes('validation failed')) {
          return 'Please check your input and try again. All required fields must be filled correctly.';
        }
        return data.message;
      }
    }
    
    if (error?.message) {
      if (error.message.includes('Network Error')) {
        return 'Unable to connect to the server. Please check your internet connection and try again.';
      }
      return error.message;
    }
    
    return 'An unexpected error occurred. Please try again.';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const userData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role,
        department: formData.department.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        designation: formData.designation.trim(),
        joiningDate: formData.joiningDate || new Date().toISOString().split('T')[0],
        isActive: formData.isActive
      };

      // Only include employeeId if user is Admin and has provided one
      if (user?.role === 'Admin' && formData.employeeId.trim()) {
        userData.employeeId = formData.employeeId.trim();
      }

      // Include team assignment if enabled
      if (showTeamCreation && teamFormData.selectedTeam) {
        userData.teamId = teamFormData.selectedTeam;
      }

      const response = await userAPI.createUser(userData);
      
      if (response.data.success) {
        let successMessage = 'User created successfully!';
        
        // Team assignment is now handled in the backend during user creation
        if (showTeamCreation && teamFormData.selectedTeam) {
          successMessage = 'User created and assigned to team successfully!';
        }

        setSuccess(successMessage);
        
        // Show success message briefly, then redirect to User Management
        setTimeout(() => {
          navigate('/admin/users');
        }, 2000); // Redirect after 2 seconds to allow user to see the success message
      }
    } catch (err) {
      console.error('Create user error:', err);
      setError(getErrorMessage(err));
      window.scrollTo(0, 0);
    } finally {
      setLoading(false);
    }
  };

  const handleTeamAssignmentToggle = async (checked) => {
    setShowTeamCreation(checked);
    if (checked) {
      await fetchAvailableTeams();
    }
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Add New User</h2>
          <p className="text-muted">Create a new user account in the system</p>
        </div>
        <button 
          className="btn btn-outline-secondary"
          onClick={() => navigate('/admin/users')}
        >
          <i className="bi bi-arrow-left me-1"></i> Back to User Management
        </button>
      </div>

      {success && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <i className="bi bi-check-circle-fill me-2"></i>
          {success}
          <button 
            type="button" 
            className="btn-close" 
            onClick={() => setSuccess('')}
          ></button>
        </div>
      )}

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
          <button 
            type="button" 
            className="btn-close" 
            onClick={() => setError('')}
          ></button>
        </div>
      )}

      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit} noValidate>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">First Name *</label>
                <input
                  type="text"
                  className={`form-control ${validationErrors.firstName ? 'is-invalid' : ''}`}
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                />
                {validationErrors.firstName && (
                  <div className="invalid-feedback">
                    {validationErrors.firstName}
                  </div>
                )}
              </div>
              <div className="col-md-6">
                <label className="form-label">Last Name *</label>
                <input
                  type="text"
                  className={`form-control ${validationErrors.lastName ? 'is-invalid' : ''}`}
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                />
                {validationErrors.lastName && (
                  <div className="invalid-feedback">
                    {validationErrors.lastName}
                  </div>
                )}
              </div>
              <div className="col-md-6">
                <label className="form-label">Email Address *</label>
                <input
                  type="email"
                  className={`form-control ${validationErrors.email ? 'is-invalid' : ''}`}
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
                {validationErrors.email && (
                  <div className="invalid-feedback">
                    {validationErrors.email}
                  </div>
                )}
              </div>
              <div className="col-md-6">
                <label className="form-label">Password *</label>
                <input
                  type="password"
                  className={`form-control ${validationErrors.password ? 'is-invalid' : ''}`}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  minLength="6"
                  required
                />
                {validationErrors.password && (
                  <div className="invalid-feedback">
                    {validationErrors.password}
                  </div>
                )}
              </div>
              <div className="col-md-6">
                <label className="form-label">Role *</label>
                <select
                  className={`form-select ${validationErrors.role ? 'is-invalid' : ''}`}
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  required
                >
                  {roles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
                {validationErrors.role && (
                  <div className="invalid-feedback">
                    {validationErrors.role}
                  </div>
                )}
              </div>
              <div className="col-md-6">
                <label className="form-label">Department</label>
                <select
                  className={`form-select ${validationErrors.department ? 'is-invalid' : ''}`}
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept._id} value={dept._id}>{dept.name}</option>
                  ))}
                </select>
                {validationErrors.department && (
                  <div className="invalid-feedback">
                    {validationErrors.department}
                  </div>
                )}
              </div>
              <div className="col-md-6">
                <label className="form-label">
                  Employee ID
                  {user?.role !== 'Admin' && (
                    <small className="text-muted ms-1">(Auto-generated)</small>
                  )}
                </label>
                <input
                  type="text"
                  className={`form-control ${validationErrors.employeeId ? 'is-invalid' : ''}`}
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={handleInputChange}
                  placeholder="e.g., EMP001"
                  readOnly={user?.role !== 'Admin'}
                  style={user?.role !== 'Admin' ? { backgroundColor: '#f8f9fa' } : {}}
                />
                {validationErrors.employeeId && (
                  <div className="invalid-feedback">
                    {validationErrors.employeeId}
                  </div>
                )}
                {user?.role !== 'Admin' && (
                  <small className="form-text text-muted">
                    Employee ID is automatically generated based on role
                  </small>
                )}
              </div>
              <div className="col-md-6">
                <label className="form-label">Phone Number</label>
                <input
                  type="tel"
                  className={`form-control ${validationErrors.phoneNumber ? 'is-invalid' : ''}`}
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  placeholder="e.g., +1234567890"
                />
                {validationErrors.phoneNumber && (
                  <div className="invalid-feedback">
                    {validationErrors.phoneNumber}
                  </div>
                )}
              </div>
              <div className="col-md-6">
                <label className="form-label">Designation</label>
                <input
                  type="text"
                  className={`form-control ${validationErrors.designation ? 'is-invalid' : ''}`}
                  name="designation"
                  value={formData.designation}
                  onChange={handleInputChange}
                  placeholder="e.g., Software Engineer"
                />
                {validationErrors.designation && (
                  <div className="invalid-feedback">
                    {validationErrors.designation}
                  </div>
                )}
              </div>
              <div className="col-md-6">
                <label className="form-label">Joining Date</label>
                <input
                  type="date"
                  className="form-control"
                  name="joiningDate"
                  value={formData.joiningDate}
                  onChange={handleInputChange}
                />
              </div>
              <div className="col-md-12">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    name="isActive"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                  />
                  <label className="form-check-label" htmlFor="isActive">
                    Active User (can login to the system)
                  </label>
                </div>
              </div>

              {/* Team Assignment Section - Only for Employee role */}
              {(user?.role === 'Admin' || user?.role === 'HR Manager') && formData.role === 'Employee' && (
                <div className="col-md-12">
                  <hr className="my-4" />
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="mb-0">
                      <i className="bi bi-people me-2"></i>
                      Team Assignment
                    </h6>
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="enableTeamAssignment"
                        checked={showTeamCreation}
                        onChange={(e) => handleTeamAssignmentToggle(e.target.checked)}
                      />
                      <label className="form-check-label" htmlFor="enableTeamAssignment">
                        Assign to Team
                      </label>
                    </div>
                  </div>
                  
                  {showTeamCreation && (
                    <div className="border rounded p-3 bg-light">
                      <div className="row g-3">
                        <div className="col-md-12">
                          <label className="form-label">Select Team *</label>
                          <select
                            className="form-select"
                            value={teamFormData.selectedTeam || ''}
                            onChange={(e) => setTeamFormData(prev => ({...prev, selectedTeam: e.target.value}))}
                          >
                            <option value="">Choose a team...</option>
                            {availableUsers.teams && availableUsers.teams.map(team => (
                              <option key={team._id} value={team._id}>
                                {team.name} ({team.code}) - {team.department?.name || 'No Department'}
                              </option>
                            ))}
                          </select>
                          <small className="form-text text-muted">
                            Select an existing team to assign this user to. Teams are created in Team Management.
                            <br />
                            <strong>Note:</strong> Team assignment is only available for Employee role. Team Managers and Team Leaders are assigned through Team Management.
                          </small>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Info message for non-Employee roles */}
              {(user?.role === 'Admin' || user?.role === 'HR Manager') && formData.role !== 'Employee' && ['Team Manager', 'Team Leader'].includes(formData.role) && (
                <div className="col-md-12">
                  <hr className="my-4" />
                  <div className="alert alert-info">
                    <i className="bi bi-info-circle me-2"></i>
                    <strong>Team Assignment:</strong> {formData.role} roles are assigned to teams through the Team Management interface, not during user creation.
                  </div>
                </div>
              )}
            </div>

            <div className="d-flex justify-content-end gap-2 mt-4">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => navigate('/admin/users')}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Creating User...
                  </>
                ) : (
                  <>
                    <i className="bi bi-plus-circle me-1"></i>
                    Create User
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddUser;
