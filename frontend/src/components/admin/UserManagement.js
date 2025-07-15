import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { userAPI, departmentAPI, teamAPI } from '../../utils/api';

const UserManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [addFormData, setAddFormData] = useState({
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
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'Employee',
    department: '',
    employeeId: '',
    phoneNumber: '',
    designation: '',
    joiningDate: '',
    isActive: true
  });

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchDepartments();
  }, [currentPage, searchTerm, roleFilter, departmentFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 10,
        search: searchTerm,
        role: roleFilter,
        department: departmentFilter
      };

      const response = await userAPI.getAllUsers(params);
      if (response.data.success) {
        setUsers(response.data.users);
        setTotalPages(response.data.totalPages);
        setTotalUsers(response.data.total);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

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

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleRoleFilter = (e) => {
    setRoleFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleDepartmentFilter = (e) => {
    setDepartmentFilter(e.target.value);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setRoleFilter('');
    setDepartmentFilter('');
    setCurrentPage(1);
  };

  const handleOpenAddModal = async () => {
    // Reset form data
    setAddFormData({
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
    
    // Reset team form data
    setTeamFormData({
      selectedTeam: ''
    });
    
    // Generate initial employee ID for default role (Employee)
    try {
      const response = await userAPI.getNextEmployeeId('Employee');
      if (response.data.success) {
        setAddFormData(prev => ({
          ...prev,
          employeeId: response.data.employeeId
        }));
      }
    } catch (err) {
      console.error('Failed to generate initial employee ID:', err);
    }
    
    // Fetch available teams for assignment
    await fetchAvailableTeams();
    
    setValidationErrors({});
    setShowAddModal(true);
  };

  const formatDate = (date) => {
    if (!date) return 'Not provided';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      'Admin': 'bg-danger',
      'Vice President': 'bg-primary',
      'HR BP': 'bg-info',
      'HR Manager': 'bg-info',
      'HR Executive': 'bg-info',
      'Team Manager': 'bg-warning',
      'Team Leader': 'bg-warning',
      'Employee': 'bg-secondary'
    };
    return colors[role] || 'bg-secondary';
  };

  const handleAddInputChange = async (e) => {
    const { name, value, type, checked } = e.target;
    setAddFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Auto-generate employee ID when role changes
    if (name === 'role' && value) {
      try {
        const response = await userAPI.getNextEmployeeId(value);
        if (response.data.success) {
          setAddFormData(prev => ({
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

  const handleEditInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleEditUser = (userData) => {
    setEditingUser(userData);
    setEditFormData({
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      email: userData.email || '',
      role: userData.role || 'Employee',
      department: userData.department?._id || '',
      employeeId: userData.employeeId || '',
      phoneNumber: userData.phoneNumber || '',
      designation: userData.designation || '',
      joiningDate: userData.joiningDate ? userData.joiningDate.split('T')[0] : '',
      isActive: userData.isActive !== undefined ? userData.isActive : true
    });
    setValidationErrors({});
    setShowEditModal(true);
  };

  const handleToggleUserStatus = async (userData) => {
    try {
      setError('');
      setSuccess('');

      const newStatus = !userData.isActive;
      const response = await userAPI.updateUser(userData._id, {
        isActive: newStatus
      });
      
      if (response.data.success) {
        setSuccess(`User ${newStatus ? 'activated' : 'deactivated'} successfully!`);
        fetchUsers();
      }
    } catch (err) {
      console.error('Toggle user status error:', err);
      setError(getErrorMessage(err));
    }
  };

  const validateUserForm = () => {
    const errors = {};
    
    if (!addFormData.firstName.trim()) {
      errors.firstName = 'First name is required';
    } else if (addFormData.firstName.length > 50) {
      errors.firstName = 'First name must be less than 50 characters';
    }
    
    if (!addFormData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    } else if (addFormData.lastName.length > 50) {
      errors.lastName = 'Last name must be less than 50 characters';
    }
    
    if (!addFormData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addFormData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!addFormData.password) {
      errors.password = 'Password is required';
    } else if (addFormData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long';
    }
    
    if (!addFormData.role) {
      errors.role = 'Role is required';
    }
    
    if (addFormData.phoneNumber && !/^\+?[\d\s-()]+$/.test(addFormData.phoneNumber)) {
      errors.phoneNumber = 'Please enter a valid phone number';
    }
    
    if (addFormData.department && addFormData.department.length > 100) {
      errors.department = 'Department name must be less than 100 characters';
    }
    
    if (addFormData.designation && addFormData.designation.length > 100) {
      errors.designation = 'Designation must be less than 100 characters';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateEditForm = () => {
    const errors = {};
    
    if (!editFormData.firstName.trim()) {
      errors.firstName = 'First name is required';
    } else if (editFormData.firstName.length > 50) {
      errors.firstName = 'First name must be less than 50 characters';
    }
    
    if (!editFormData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    } else if (editFormData.lastName.length > 50) {
      errors.lastName = 'Last name must be less than 50 characters';
    }
    
    if (!editFormData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editFormData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!editFormData.role) {
      errors.role = 'Role is required';
    }
    
    if (editFormData.phoneNumber && !/^\+?[\d\s-()]+$/.test(editFormData.phoneNumber)) {
      errors.phoneNumber = 'Please enter a valid phone number';
    }
    
    if (editFormData.department && editFormData.department.length > 100) {
      errors.department = 'Department name must be less than 100 characters';
    }
    
    if (editFormData.designation && editFormData.designation.length > 100) {
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

  const handleAddUser = async (e) => {
    e.preventDefault();
    
    if (!validateUserForm()) {
      return;
    }
    
    try {
      setError('');
      setSuccess('');

      const userData = {
        firstName: addFormData.firstName.trim(),
        lastName: addFormData.lastName.trim(),
        email: addFormData.email.trim().toLowerCase(),
        password: addFormData.password,
        role: addFormData.role,
        department: addFormData.department.trim(),
        phoneNumber: addFormData.phoneNumber.trim(),
        designation: addFormData.designation.trim(),
        joiningDate: addFormData.joiningDate || new Date().toISOString().split('T')[0],
        isActive: addFormData.isActive
      };

      // Only include employeeId if user is Admin and has provided one
      if (user?.role === 'Admin' && addFormData.employeeId.trim()) {
        userData.employeeId = addFormData.employeeId.trim();
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

        setShowAddModal(false);
        setShowTeamCreation(false);
        setAddFormData({
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
        setTeamFormData({
          selectedTeam: ''
        });
        setValidationErrors({});
        setSuccess(successMessage);
        fetchUsers();
      }
    } catch (err) {
      console.error('Create user error:', err);
      setError(getErrorMessage(err));
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    
    if (!validateEditForm()) {
      return;
    }
    
    try {
      setError('');
      setSuccess('');

      const userData = {
        firstName: editFormData.firstName.trim(),
        lastName: editFormData.lastName.trim(),
        email: editFormData.email.trim().toLowerCase(),
        role: editFormData.role,
        department: editFormData.department.trim(),
        phoneNumber: editFormData.phoneNumber.trim(),
        designation: editFormData.designation.trim(),
        joiningDate: editFormData.joiningDate,
        isActive: editFormData.isActive
      };

      // Note: Employee ID is never updated after creation

      const response = await userAPI.updateUser(editingUser._id, userData);
      
      if (response.data.success) {
        setShowEditModal(false);
        setEditingUser(null);
        setEditFormData({
          firstName: '',
          lastName: '',
          email: '',
          role: 'Employee',
          department: '',
          employeeId: '',
          phoneNumber: '',
          designation: '',
          joiningDate: '',
          isActive: true
        });
        setValidationErrors({});
        setSuccess('User updated successfully!');
        fetchUsers();
      }
    } catch (err) {
      console.error('Update user error:', err);
      setError(getErrorMessage(err));
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">User Management</h2>
          <p className="text-muted">Manage all users and their information</p>
        </div>
        <div className="d-flex gap-2">
          <span className="badge bg-primary fs-6">{totalUsers} Total Users</span>
          {(user?.role === 'Admin' || user?.role === 'Vice President' || user?.role === 'HR Manager') && (
            <>
              <button 
                className="btn btn-outline-primary" 
                onClick={() => navigate('/admin/users/add')}
              >
                <i className="bi bi-plus-circle me-1"></i> Add User
              </button>
              <button className="btn btn-primary" onClick={handleOpenAddModal}>
                <i className="bi bi-plus-circle me-1"></i> Quick Add
              </button>
            </>
          )}
        </div>
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

      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Search Users</label>
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by name, email, or employee ID..."
                  value={searchTerm}
                  onChange={handleSearch}
                />
              </div>
            </div>
            <div className="col-md-3">
              <label className="form-label">Filter by Role</label>
              <select
                className="form-select"
                value={roleFilter}
                onChange={handleRoleFilter}
              >
                <option value="">All Roles</option>
                {roles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Filter by Department</label>
              <select
                className="form-select"
                value={departmentFilter}
                onChange={handleDepartmentFilter}
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept._id} value={dept._id}>{dept.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">&nbsp;</label>
              <button 
                className="btn btn-outline-secondary w-100"
                onClick={resetFilters}
              >
                <i className="bi bi-arrow-clockwise me-1"></i>
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-people text-muted" style={{ fontSize: '3rem' }}></i>
              <h5 className="mt-3 text-muted">No users found</h5>
              <p className="text-muted">Try adjusting your search criteria</p>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead className="table-light">
                    <tr>
                      <th>Employee</th>
                      <th>Role</th>
                      <th>Department</th>
                      <th>Team</th>
                      <th>Employee ID</th>
                      <th>Contact</th>
                      <th>Joining Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((userData) => (
                      <tr key={userData._id}>
                        <td>
                          <div className="d-flex align-items-center">
                            <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center me-3"
                                 style={{ width: '40px', height: '40px' }}>
                              <i className="bi bi-person text-white"></i>
                            </div>
                            <div>
                              <div className="fw-semibold">{userData.firstName} {userData.lastName}</div>
                              <small className="text-muted">{userData.email}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${getRoleBadgeColor(userData.role)}`}>
                            {userData.role}
                          </span>
                        </td>
                        <td>
                          {userData.department?.name || 'Not assigned'}
                        </td>
                        <td>
                          {userData.team?.name || 'Not assigned'}
                        </td>
                        <td>
                          <code>{userData.employeeId || 'Not assigned'}</code>
                        </td>
                        <td>
                          <div>
                            <small className="d-block">{userData.phoneNumber || 'Not provided'}</small>
                          </div>
                        </td>
                        <td>
                          {formatDate(userData.joiningDate)}
                        </td>
                        <td>
                          <span className={`badge ${userData.isActive ? 'bg-success' : 'bg-danger'}`}>
                            {userData.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className="btn-group" role="group">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              title={userData.isActive ? "Deactivate User" : "Activate User"}
                              onClick={() => handleToggleUserStatus(userData)}
                              disabled={user?.role === 'Employee'}
                            >
                              <i className={`bi ${userData.isActive ? 'bi-eye-slash text-warning' : 'bi-eye text-success'}`}></i>
                            </button>
                            {(user?.role === 'Admin' || user?.role === 'Vice President' || user?.role === 'HR BP' || user?.role === 'HR Manager' || user?.role === 'HR Executive') && (
                              <>
                                <button
                                  className="btn btn-sm btn-outline-secondary"
                                  title="Edit User"
                                  onClick={() => handleEditUser(userData)}
                                >
                                  <i className="bi bi-pencil"></i>
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-danger ms-1"
                                  title="Delete User"
                                  onClick={async () => {
                                    if (window.confirm(`Are you sure you want to delete user ${userData.firstName} ${userData.lastName}?`)) {
                                      try {
                                        const response = await userAPI.deleteUser(userData._id);
                                        if (response.data.success) {
                                          setSuccess('User deleted successfully!');
                                          fetchUsers();
                                        }
                                      } catch (err) {
                                        setError(getErrorMessage(err));
                                      }
                                    }
                                  }}
                                >
                                  <i className="bi bi-trash"></i>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <nav className="mt-4">
                  <ul className="pagination justify-content-center">
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button 
                        className="page-link"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </button>
                    </li>
                    {[...Array(totalPages)].map((_, index) => (
                      <li key={index} className={`page-item ${currentPage === index + 1 ? 'active' : ''}`}>
                        <button 
                          className="page-link"
                          onClick={() => setCurrentPage(index + 1)}
                        >
                          {index + 1}
                        </button>
                      </li>
                    ))}
                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                      <button 
                        className="page-link"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </button>
                    </li>
                  </ul>
                </nav>
              )}
            </>
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <form onSubmit={handleAddUser} noValidate>
                <div className="modal-header">
                  <h5 className="modal-title">Add New User</h5>
                  <button 
                    type="button" 
                    className="btn-close"
                    onClick={() => {
                      setShowAddModal(false);
                      setValidationErrors({});
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">First Name *</label>
                      <input
                        type="text"
                        className={`form-control ${validationErrors.firstName ? 'is-invalid' : ''}`}
                        name="firstName"
                        value={addFormData.firstName}
                        onChange={handleAddInputChange}
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
                        value={addFormData.lastName}
                        onChange={handleAddInputChange}
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
                        value={addFormData.email}
                        onChange={handleAddInputChange}
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
                        value={addFormData.password}
                        onChange={handleAddInputChange}
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
                        value={addFormData.role}
                        onChange={handleAddInputChange}
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
                        value={addFormData.department}
                        onChange={handleAddInputChange}
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
                        value={addFormData.employeeId}
                        onChange={handleAddInputChange}
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
                        value={addFormData.phoneNumber}
                        onChange={handleAddInputChange}
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
                        value={addFormData.designation}
                        onChange={handleAddInputChange}
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
                        value={addFormData.joiningDate}
                        onChange={handleAddInputChange}
                      />
                    </div>
                    <div className="col-md-12">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          name="isActive"
                          id="isActive"
                          checked={addFormData.isActive}
                          onChange={handleAddInputChange}
                        />
                        <label className="form-check-label" htmlFor="isActive">
                          Active User (can login to the system)
                        </label>
                      </div>
                    </div>

                    {/* Team Assignment Section - Only for Employee role */}
                    {(user?.role === 'Admin' || user?.role === 'HR Manager') && addFormData.role === 'Employee' && (
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
                              onChange={(e) => setShowTeamCreation(e.target.checked)}
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
                    {(user?.role === 'Admin' || user?.role === 'HR Manager') && addFormData.role !== 'Employee' && ['Team Manager', 'Team Leader'].includes(addFormData.role) && (
                      <div className="col-md-12">
                        <hr className="my-4" />
                        <div className="alert alert-info">
                          <i className="bi bi-info-circle me-2"></i>
                          <strong>Team Assignment:</strong> {addFormData.role} roles are assigned to teams through the Team Management interface, not during user creation.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowAddModal(false);
                      setValidationErrors({});
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Create User
                  </button>                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingUser && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <form onSubmit={handleUpdateUser} noValidate>
                <div className="modal-header">
                  <h5 className="modal-title">Edit User</h5>
                  <button 
                    type="button" 
                    className="btn-close"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingUser(null);
                      setValidationErrors({});
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">First Name *</label>
                      <input
                        type="text"
                        className={`form-control ${validationErrors.firstName ? 'is-invalid' : ''}`}
                        name="firstName"
                        value={editFormData.firstName}
                        onChange={handleEditInputChange}
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
                        value={editFormData.lastName}
                        onChange={handleEditInputChange}
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
                        value={editFormData.email}
                        onChange={handleEditInputChange}
                        required
                      />
                      {validationErrors.email && (
                        <div className="invalid-feedback">
                          {validationErrors.email}
                        </div>
                      )}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Role *</label>
                      <select
                        className={`form-select ${validationErrors.role ? 'is-invalid' : ''}`}
                        name="role"
                        value={editFormData.role}
                        onChange={handleEditInputChange}
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
                        value={editFormData.department}
                        onChange={handleEditInputChange}
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
                        <small className="text-muted ms-1">(Read-only)</small>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        name="employeeId"
                        value={editFormData.employeeId}
                        placeholder="e.g., EMP001"
                        readOnly
                        style={{ backgroundColor: '#f8f9fa' }}
                      />
                      <small className="form-text text-muted">
                        Employee ID cannot be changed after creation
                      </small>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Phone Number</label>
                      <input
                        type="tel"
                        className={`form-control ${validationErrors.phoneNumber ? 'is-invalid' : ''}`}
                        name="phoneNumber"
                        value={editFormData.phoneNumber}
                        onChange={handleEditInputChange}
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
                        value={editFormData.designation}
                        onChange={handleEditInputChange}
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
                        value={editFormData.joiningDate}
                        onChange={handleEditInputChange}
                      />
                    </div>
                    <div className="col-md-12">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          name="isActive"
                          id="editIsActive"
                          checked={editFormData.isActive}
                          onChange={handleEditInputChange}
                        />
                        <label className="form-check-label" htmlFor="editIsActive">
                          Active User (can login to the system)
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingUser(null);
                      setValidationErrors({});
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Update User
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
