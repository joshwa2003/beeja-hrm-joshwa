import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { teamAPI, userAPI, departmentAPI } from '../../utils/api';

const TeamManagement = () => {
  const { user, hasAnyRole } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTeams, setTotalTeams] = useState(0);

  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [teamManagers, setTeamManagers] = useState([]);
  const [teamLeaders, setTeamLeaders] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  const [addFormData, setAddFormData] = useState({
    name: '',
    code: '',
    description: '',
    department: '',
    teamManager: '',
    teamLeader: '',
    members: [],
    maxSize: 10
  });

  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    teamManager: '',
    teamLeader: '',
    maxSize: 10,
    isActive: true
  });

  const [memberFormData, setMemberFormData] = useState({
    userId: '',
    role: 'Member'
  });

  // Check if user can create/edit teams
  const canCreateTeams = hasAnyRole(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive']);
  const canManageAllTeams = hasAnyRole(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive']);
  const isTeamManager = user?.role === 'Team Manager';
  const isTeamLeader = user?.role === 'Team Leader';

  useEffect(() => {
    fetchTeams();
    fetchDepartments();
    fetchUsers();
  }, [currentPage, searchTerm, departmentFilter, statusFilter]);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 10,
        search: searchTerm,
        department: departmentFilter
      };

      if (statusFilter !== '') {
        params.isActive = statusFilter;
      }

      const response = await teamAPI.getAllTeams(params);
      
      if (response.data.success) {
        setTeams(response.data.teams || []);
        setTotalPages(response.data.totalPages || 1);
        setTotalTeams(response.data.total || 0);
      }
    } catch (err) {
      console.error('Error fetching teams:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await departmentAPI.getAllDepartments({ limit: 100 });
      if (response.data.departments) {
        setDepartments(response.data.departments);
      }
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await userAPI.getAllUsers({ limit: 1000 });
      if (response.data.success) {
        setUsers(response.data.users);
        setTeamManagers(response.data.users.filter(u => u.role === 'Team Manager'));
        setTeamLeaders(response.data.users.filter(u => u.role === 'Team Leader'));
        setEmployees(response.data.users.filter(u => u.role === 'Employee'));
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const handleOpenAddModal = () => {
    setAddFormData({
      name: '',
      code: '',
      description: '',
      department: '',
      teamManager: '',
      teamLeader: '',
      members: [],
      maxSize: 10
    });
    setValidationErrors({});
    setShowAddModal(true);
  };

  const handleAddInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAddFormData(prev => ({
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

  const handleMembersChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setAddFormData(prev => ({
      ...prev,
      members: selectedOptions
    }));
  };

  const validateAddForm = () => {
    const errors = {};
    
    if (!addFormData.name.trim()) {
      errors.name = 'Team name is required';
    }
    
    if (!addFormData.code.trim()) {
      errors.code = 'Team code is required';
    } else if (!/^[A-Z0-9]+$/.test(addFormData.code)) {
      errors.code = 'Team code must contain only uppercase letters and numbers';
    }
    
    if (!addFormData.department) {
      errors.department = 'Department is required';
    }
    
    if (!addFormData.teamManager) {
      errors.teamManager = 'Team Manager is required';
    }
    
    if (!addFormData.teamLeader) {
      errors.teamLeader = 'Team Leader is required';
    }
    
    if (addFormData.members.length === 0) {
      errors.members = 'At least one team member is required';
    }
    
    if (addFormData.maxSize < 1 || addFormData.maxSize > 50) {
      errors.maxSize = 'Max size must be between 1 and 50';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddTeam = async (e) => {
    e.preventDefault();
    
    if (!validateAddForm()) {
      return;
    }
    
    try {
      setError('');
      setSuccess('');

      const teamData = {
        name: addFormData.name.trim(),
        code: addFormData.code.trim().toUpperCase(),
        description: addFormData.description.trim(),
        department: addFormData.department,
        teamManager: addFormData.teamManager,
        teamLeader: addFormData.teamLeader,
        maxSize: parseInt(addFormData.maxSize)
      };

      const response = await teamAPI.createTeam(teamData);
      
      if (response.data.success) {
        // Add members to the team
        if (addFormData.members.length > 0) {
          for (const memberId of addFormData.members) {
            try {
              await teamAPI.addTeamMember(response.data.team._id, {
                userId: memberId,
                role: 'Member'
              });
            } catch (memberErr) {
              console.error('Error adding team member:', memberErr);
            }
          }
        }

        setShowAddModal(false);
        setAddFormData({
          name: '',
          code: '',
          description: '',
          department: '',
          teamManager: '',
          teamLeader: '',
          members: [],
          maxSize: 10
        });
        setValidationErrors({});
        setSuccess('Team created successfully!');
        fetchTeams();
      }
    } catch (err) {
      console.error('Create team error:', err);
      setError(getErrorMessage(err));
    }
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
        return data.message;
      }
    }
    
    if (error?.message) {
      return error.message;
    }
    
    return 'An unexpected error occurred. Please try again.';
  };

  const getStatusBadge = (isActive) => {
    return (
      <span className={`badge ${isActive ? 'bg-success' : 'bg-danger'}`}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
  };

  if (loading && teams.length === 0) {
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
          <h2 className="mb-1">Team Management</h2>
          <p className="text-muted">
            {isTeamLeader ? 'View your team details' : 
             isTeamManager ? 'Manage your assigned teams' : 
             'Manage all teams and their members'}
          </p>
        </div>
        <div className="d-flex gap-2">
          <span className="badge bg-primary fs-6">{totalTeams} Total Teams</span>
          {canCreateTeams && (
            <button className="btn btn-primary" onClick={handleOpenAddModal}>
              <i className="bi bi-plus-circle me-1"></i> Add Team
            </button>
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

      {/* Teams Table */}
      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-people text-muted" style={{ fontSize: '3rem' }}></i>
              <h5 className="mt-3 text-muted">No teams found</h5>
              <p className="text-muted">
                {canCreateTeams ? 'Create your first team to get started' : 'No teams available'}
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead className="table-light">
                  <tr>
                    <th>Team</th>
                    <th>Department</th>
                    <th>Team Manager</th>
                    <th>Team Leader</th>
                    <th>Members</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((team) => (
                    <tr key={team._id}>
                      <td>
                        <div>
                          <div className="fw-semibold">{team.name}</div>
                          <small className="text-muted">
                            <code>{team.code}</code>
                            {team.description && ` • ${team.description}`}
                          </small>
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-secondary">
                          {team.department?.name || 'Not assigned'}
                        </span>
                      </td>
                      <td>
                        {team.teamManager ? (
                          <div>
                            <div className="fw-semibold">
                              {team.teamManager.firstName} {team.teamManager.lastName}
                            </div>
                            <small className="text-muted">{team.teamManager.email}</small>
                          </div>
                        ) : (
                          <span className="text-muted">Not assigned</span>
                        )}
                      </td>
                      <td>
                        {team.teamLeader ? (
                          <div>
                            <div className="fw-semibold">
                              {team.teamLeader.firstName} {team.teamLeader.lastName}
                            </div>
                            <small className="text-muted">{team.teamLeader.email}</small>
                          </div>
                        ) : (
                          <span className="text-muted">Not assigned</span>
                        )}
                      </td>
                      <td>
                        <span className="badge bg-info">
                          {team.currentSize || 0} / {team.maxSize}
                        </span>
                      </td>
                      <td>
                        {getStatusBadge(team.isActive)}
                      </td>
                      <td>
                        <div className="btn-group" role="group">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            title="Manage Members"
                            disabled
                          >
                            <i className="bi bi-people"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            title="Edit Team"
                            disabled
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            title="Delete Team"
                            disabled
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Team Modal */}
      {showAddModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <form onSubmit={handleAddTeam} noValidate>
                <div className="modal-header">
                  <h5 className="modal-title">Create New Team</h5>
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
                      <label className="form-label">Team Name *</label>
                      <input
                        type="text"
                        className={`form-control ${validationErrors.name ? 'is-invalid' : ''}`}
                        name="name"
                        value={addFormData.name}
                        onChange={handleAddInputChange}
                        placeholder="e.g., Development Team Alpha"
                        required
                      />
                      {validationErrors.name && (
                        <div className="invalid-feedback">
                          {validationErrors.name}
                        </div>
                      )}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Team Code *</label>
                      <input
                        type="text"
                        className={`form-control ${validationErrors.code ? 'is-invalid' : ''}`}
                        name="code"
                        value={addFormData.code}
                        onChange={handleAddInputChange}
                        placeholder="e.g., DEV001"
                        style={{ textTransform: 'uppercase' }}
                        required
                      />
                      {validationErrors.code && (
                        <div className="invalid-feedback">
                          {validationErrors.code}
                        </div>
                      )}
                    </div>
                    <div className="col-md-12">
                      <label className="form-label">Team Description</label>
                      <textarea
                        className="form-control"
                        name="description"
                        value={addFormData.description}
                        onChange={handleAddInputChange}
                        rows="2"
                        placeholder="Brief description of the team's purpose"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Department *</label>
                      <select
                        className={`form-select ${validationErrors.department ? 'is-invalid' : ''}`}
                        name="department"
                        value={addFormData.department}
                        onChange={handleAddInputChange}
                        required
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
                      <label className="form-label">Max Team Size</label>
                      <input
                        type="number"
                        className={`form-control ${validationErrors.maxSize ? 'is-invalid' : ''}`}
                        name="maxSize"
                        value={addFormData.maxSize}
                        onChange={handleAddInputChange}
                        min="1"
                        max="50"
                      />
                      {validationErrors.maxSize && (
                        <div className="invalid-feedback">
                          {validationErrors.maxSize}
                        </div>
                      )}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Team Manager *</label>
                      <select
                        className={`form-select ${validationErrors.teamManager ? 'is-invalid' : ''}`}
                        name="teamManager"
                        value={addFormData.teamManager}
                        onChange={handleAddInputChange}
                        required
                      >
                        <option value="">Select Team Manager</option>
                        {teamManagers.map(manager => (
                          <option key={manager._id} value={manager._id}>
                            {manager.firstName} {manager.lastName} ({manager.email})
                          </option>
                        ))}
                      </select>
                      {validationErrors.teamManager && (
                        <div className="invalid-feedback">
                          {validationErrors.teamManager}
                        </div>
                      )}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Team Leader *</label>
                      <select
                        className={`form-select ${validationErrors.teamLeader ? 'is-invalid' : ''}`}
                        name="teamLeader"
                        value={addFormData.teamLeader}
                        onChange={handleAddInputChange}
                        required
                      >
                        <option value="">Select Team Leader</option>
                        {teamLeaders.map(leader => (
                          <option key={leader._id} value={leader._id}>
                            {leader.firstName} {leader.lastName} ({leader.email})
                          </option>
                        ))}
                      </select>
                      {validationErrors.teamLeader && (
                        <div className="invalid-feedback">
                          {validationErrors.teamLeader}
                        </div>
                      )}
                    </div>
                    <div className="col-md-12">
                      <label className="form-label">Team Members *</label>
                      <select
                        className={`form-select ${validationErrors.members ? 'is-invalid' : ''}`}
                        multiple
                        size="6"
                        value={addFormData.members}
                        onChange={handleMembersChange}
                        required
                      >
                        {employees.map(employee => (
                          <option key={employee._id} value={employee._id}>
                            {employee.firstName} {employee.lastName} ({employee.email})
                          </option>
                        ))}
                      </select>
                      {validationErrors.members && (
                        <div className="invalid-feedback">
                          {validationErrors.members}
                        </div>
                      )}
                      <small className="form-text text-muted">
                        Hold Ctrl/Cmd to select multiple employees
                      </small>
                    </div>
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
                    Create Team
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

export default TeamManagement;
