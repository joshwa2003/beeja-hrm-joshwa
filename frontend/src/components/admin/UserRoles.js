import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { userAPI } from '../../utils/api';

const UserRoles = () => {
  const { user } = useAuth();
  const [roleStats, setRoleStats] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [roleUsers, setRoleUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchRoleStats();
  }, []);

  useEffect(() => {
    if (selectedRole) {
      fetchUsersByRole();
    }
  }, [selectedRole, currentPage, statusFilter]);

  const fetchRoleStats = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getRoleStats();
      if (response.data.success) {
        setRoleStats(response.data.roleStats);
        setSummary(response.data.summary);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchUsersByRole = async () => {
    try {
      setLoadingUsers(true);
      const params = {
        page: currentPage,
        limit: 10,
        status: statusFilter
      };
      const response = await userAPI.getUsersByRole(selectedRole, params);
      if (response.data.success) {
        setRoleUsers(response.data.users);
        setTotalPages(response.data.totalPages);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingUsers(false);
    }
  };

  const getErrorMessage = (error) => {
    if (error?.response?.data?.message) {
      return error.response.data.message;
    }
    if (error?.message) {
      return error.message;
    }
    return 'An unexpected error occurred';
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

  const getRoleDescription = (role) => {
    const descriptions = {
      'Admin': 'Full system access and administrative privileges',
      'Vice President': 'Executive level access with strategic oversight',
      'HR BP': 'HR Business Partner with departmental HR responsibilities',
      'HR Manager': 'HR management with policy and process oversight',
      'HR Executive': 'HR operations and employee relations',
      'Team Manager': 'Manages multiple teams and strategic initiatives',
      'Team Leader': 'Leads individual teams and direct reports',
      'Employee': 'Standard employee access and self-service features'
    };
    return descriptions[role] || 'Standard user role';
  };

  const getRoleHierarchyLevel = (role) => {
    const levels = {
      'Admin': 1,
      'Vice President': 2,
      'HR BP': 3,
      'HR Manager': 4,
      'HR Executive': 5,
      'Team Manager': 6,
      'Team Leader': 7,
      'Employee': 8
    };
    return levels[role] || 999;
  };

  const formatDate = (date) => {
    if (!date) return 'Not provided';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setCurrentPage(1);
    setStatusFilter('all');
  };

  const handleStatusFilter = (status) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  if (loading) {
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
          <h2 className="mb-1">User Roles Management</h2>
          <p className="text-muted">Manage user roles, permissions, and role-based access control</p>
        </div>
        <div className="d-flex gap-2">
          <span className="badge bg-primary fs-6">{summary.totalUsers} Total Users</span>
          <span className="badge bg-success fs-6">{summary.activeUsers} Active</span>
          <span className="badge bg-danger fs-6">{summary.inactiveUsers} Inactive</span>
        </div>
      </div>

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

      {/* Role Statistics Overview */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">
                <i className="bi bi-people-fill me-2"></i>
                Role Distribution Overview
              </h5>
            </div>
            <div className="card-body">
              <div className="row g-3">
                {roleStats
                  .sort((a, b) => getRoleHierarchyLevel(a.role) - getRoleHierarchyLevel(b.role))
                  .map((roleStat) => (
                  <div key={roleStat.role} className="col-lg-3 col-md-4 col-sm-6">
                    <div 
                      className="card h-100 border-0 shadow-sm cursor-pointer"
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleRoleSelect(roleStat.role)}
                    >
                      <div className="card-body text-center">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <span className={`badge ${getRoleBadgeColor(roleStat.role)} fs-6`}>
                            {roleStat.role}
                          </span>
                          <small className="text-muted">Level {getRoleHierarchyLevel(roleStat.role)}</small>
                        </div>
                        <h3 className="text-primary mb-1">{roleStat.totalCount}</h3>
                        <p className="text-muted small mb-2">Total Users</p>
                        <div className="d-flex justify-content-between text-sm">
                          <span className="text-success">
                            <i className="bi bi-check-circle me-1"></i>
                            {roleStat.activeCount} Active
                          </span>
                          {roleStat.inactiveCount > 0 && (
                            <span className="text-danger">
                              <i className="bi bi-x-circle me-1"></i>
                              {roleStat.inactiveCount} Inactive
                            </span>
                          )}
                        </div>
                        <hr className="my-2" />
                        <p className="text-muted small mb-0">
                          {getRoleDescription(roleStat.role)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Role Hierarchy Information */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">
                <i className="bi bi-diagram-3 me-2"></i>
                Role Hierarchy & Permissions
              </h5>
            </div>
            <div className="card-body">
              <div className="alert alert-info">
                <h6><i className="bi bi-info-circle me-2"></i>Role Hierarchy Levels</h6>
                <p className="mb-2">Lower numbers indicate higher authority levels. Users can typically manage users with higher level numbers.</p>
                <div className="row">
                  <div className="col-md-6">
                    <ul className="list-unstyled">
                      <li><strong>Level 1:</strong> Admin - Full system control</li>
                      <li><strong>Level 2:</strong> Vice President - Executive oversight</li>
                      <li><strong>Level 3:</strong> HR BP - HR Business Partner</li>
                      <li><strong>Level 4:</strong> HR Manager - HR Management</li>
                    </ul>
                  </div>
                  <div className="col-md-6">
                    <ul className="list-unstyled">
                      <li><strong>Level 5:</strong> HR Executive - HR Operations</li>
                      <li><strong>Level 6:</strong> Team Manager - Multi-team management</li>
                      <li><strong>Level 7:</strong> Team Leader - Team leadership</li>
                      <li><strong>Level 8:</strong> Employee - Standard access</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Role Details */}
      {selectedRole && (
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="card-title mb-0">
                    <span className={`badge ${getRoleBadgeColor(selectedRole)} me-2`}>
                      {selectedRole}
                    </span>
                    Role Details
                  </h5>
                  <button 
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => setSelectedRole('')}
                  >
                    <i className="bi bi-x"></i> Close
                  </button>
                </div>
              </div>
              <div className="card-body">
                <div className="row mb-3">
                  <div className="col-md-8">
                    <p className="text-muted mb-2">{getRoleDescription(selectedRole)}</p>
                    <div className="d-flex gap-3">
                      <span className="badge bg-primary">Hierarchy Level: {getRoleHierarchyLevel(selectedRole)}</span>
                      <span className="badge bg-info">
                        Total Users: {roleStats.find(r => r.role === selectedRole)?.totalCount || 0}
                      </span>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="btn-group w-100" role="group">
                      <button
                        type="button"
                        className={`btn ${statusFilter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => handleStatusFilter('all')}
                      >
                        All Users
                      </button>
                      <button
                        type="button"
                        className={`btn ${statusFilter === 'active' ? 'btn-success' : 'btn-outline-success'}`}
                        onClick={() => handleStatusFilter('active')}
                      >
                        Active
                      </button>
                      <button
                        type="button"
                        className={`btn ${statusFilter === 'inactive' ? 'btn-danger' : 'btn-outline-danger'}`}
                        onClick={() => handleStatusFilter('inactive')}
                      >
                        Inactive
                      </button>
                    </div>
                  </div>
                </div>

                {loadingUsers ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading users...</span>
                    </div>
                  </div>
                ) : roleUsers.length === 0 ? (
                  <div className="text-center py-5">
                    <i className="bi bi-people text-muted" style={{ fontSize: '3rem' }}></i>
                    <h5 className="mt-3 text-muted">No users found</h5>
                    <p className="text-muted">No users with {selectedRole} role match the current filter</p>
                  </div>
                ) : (
                  <>
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead className="table-light">
                          <tr>
                            <th>Employee</th>
                            <th>Employee ID</th>
                            <th>Department</th>
                            <th>Team</th>
                            <th>Contact</th>
                            <th>Joining Date</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {roleUsers.map((userData) => (
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
                                <code>{userData.employeeId || 'Not assigned'}</code>
                              </td>
                              <td>
                                {userData.department?.name || 'Not assigned'}
                              </td>
                              <td>
                                {userData.team?.name || 'Not assigned'}
                              </td>
                              <td>
                                <div>
                                  <small className="d-block">{userData.phoneNumber || 'Not provided'}</small>
                                  <small className="text-muted">{userData.designation || 'Not specified'}</small>
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
          </div>
        </div>
      )}
    </div>
  );
};

export default UserRoles;
