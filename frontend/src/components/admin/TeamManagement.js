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

  const [users, setUsers] = useState([]);
  const [teamManagers, setTeamManagers] = useState([]);
  const [teamLeaders, setTeamLeaders] = useState([]);
  const [unassignedEmployees, setUnassignedEmployees] = useState([]);

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
    fetchUsers();
    fetchUnassignedEmployees();
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


  const fetchUsers = async () => {
    try {
      const response = await userAPI.getAllUsers({ limit: 1000 });
      if (response.data.success) {
        setUsers(response.data.users);
        setTeamManagers(response.data.users.filter(u => u.role === 'Team Manager'));
        setTeamLeaders(response.data.users.filter(u => u.role === 'Team Leader'));
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const fetchUnassignedEmployees = async () => {
    try {
      const response = await teamAPI.getUnassignedEmployees();
      if (response.data.success) {
        setUnassignedEmployees(response.data.employees);
      }
    } catch (err) {
      console.error('Failed to fetch unassigned employees:', err);
    }
  };

  const handleOpenAddModal = () => {
    setAddFormData({
      name: '',
      code: '',
      description: '',
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
    const { value, checked } = e.target;
    setAddFormData(prev => ({
      ...prev,
      members: checked 
        ? [...prev.members, value]
        : prev.members.filter(id => id !== value)
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
    
    if (!addFormData.teamManager) {
      errors.teamManager = 'Team Manager is required';
    }
    
    if (!addFormData.teamLeader) {
      errors.teamLeader = 'Team Leader is required';
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
          teamManager: '',
          teamLeader: '',
          members: [],
          maxSize: 10
        });
        setValidationErrors({});
        setSuccess('Team created successfully!');
        fetchTeams();
        fetchUnassignedEmployees(); // Refresh unassigned employees list
      }
    } catch (err) {
      console.error('Create team error:', err);
      setError(getErrorMessage(err));
    }
  };

  // Edit Team Functions
  const handleOpenEditModal = (team) => {
    setEditingTeam(team);
    setEditFormData({
      name: team.name,
      description: team.description || '',
      teamManager: team.teamManager?._id || '',
      teamLeader: team.teamLeader?._id || '',
      maxSize: team.maxSize,
      isActive: team.isActive
    });
    setValidationErrors({});
    setShowEditModal(true);
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

  const validateEditForm = () => {
    const errors = {};
    
    if (!editFormData.name.trim()) {
      errors.name = 'Team name is required';
    }
    
    if (!editFormData.teamManager) {
      errors.teamManager = 'Team Manager is required';
    }
    
    if (!editFormData.teamLeader) {
      errors.teamLeader = 'Team Leader is required';
    }
    
    if (editFormData.maxSize < 1 || editFormData.maxSize > 50) {
      errors.maxSize = 'Max size must be between 1 and 50';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEditTeam = async (e) => {
    e.preventDefault();
    
    if (!validateEditForm()) {
      return;
    }
    
    try {
      setError('');
      setSuccess('');

      const teamData = {
        name: editFormData.name.trim(),
        description: editFormData.description.trim(),
        teamManager: editFormData.teamManager,
        teamLeader: editFormData.teamLeader,
        maxSize: parseInt(editFormData.maxSize),
        isActive: editFormData.isActive
      };

      const response = await teamAPI.updateTeam(editingTeam._id, teamData);
      
      if (response.data.success) {
        setShowEditModal(false);
        setEditingTeam(null);
        setEditFormData({
          name: '',
          description: '',
          teamManager: '',
          teamLeader: '',
          maxSize: 10,
          isActive: true
        });
        setValidationErrors({});
        setSuccess('Team updated successfully!');
        fetchTeams();
      }
    } catch (err) {
      console.error('Update team error:', err);
      setError(getErrorMessage(err));
    }
  };

  // Delete Team Functions
  const handleDeleteTeam = async (teamId, teamName) => {
    if (window.confirm(`Are you sure you want to delete the team "${teamName}"? This action cannot be undone.`)) {
      try {
        setError('');
        setSuccess('');

        const response = await teamAPI.deleteTeam(teamId);
        
        if (response.data.success) {
          setSuccess('Team deleted successfully!');
          fetchTeams();
          fetchUnassignedEmployees(); // Refresh unassigned employees list
        }
      } catch (err) {
        console.error('Delete team error:', err);
        setError(getErrorMessage(err));
      }
    }
  };

  // Manage Members Functions
  const handleOpenMembersModal = async (team) => {
    try {
      setSelectedTeam(team);
      setShowMembersModal(true);
      
      // Fetch detailed team information with members
      const response = await teamAPI.getTeamById(team._id);
      if (response.data.success) {
        setSelectedTeam(response.data.team);
      }
    } catch (err) {
      console.error('Error fetching team details:', err);
      setError(getErrorMessage(err));
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    
    if (!memberFormData.userId) {
      setError('Please select a user to add');
      return;
    }
    
    try {
      setError('');
      setSuccess('');

      const response = await teamAPI.addTeamMember(selectedTeam._id, {
        userId: memberFormData.userId,
        role: memberFormData.role
      });
      
      if (response.data.success) {
        setMemberFormData({ userId: '', role: 'Member' });
        setSuccess('Member added successfully!');
        
        // Refresh team details
        const teamResponse = await teamAPI.getTeamById(selectedTeam._id);
        if (teamResponse.data.success) {
          setSelectedTeam(teamResponse.data.team);
        }
        
        fetchTeams();
        fetchUnassignedEmployees();
      }
    } catch (err) {
      console.error('Add member error:', err);
      setError(getErrorMessage(err));
    }
  };

  const handleRemoveMember = async (userId, userName) => {
    if (window.confirm(`Are you sure you want to remove ${userName} from this team?`)) {
      try {
        setError('');
        setSuccess('');

        // Handle case where userId is null (broken reference)
        if (!userId) {
          // For broken references, we need to manually clean up the team data
          // This is a fallback - ideally the backend should handle this
          setError('Cannot remove member with broken user reference. Please contact administrator.');
          return;
        }

        const response = await teamAPI.removeTeamMember(selectedTeam._id, userId);
        
        if (response.data.success) {
          setSuccess('Member removed successfully!');
          
          // Refresh team details
          const teamResponse = await teamAPI.getTeamById(selectedTeam._id);
          if (teamResponse.data.success) {
            setSelectedTeam(teamResponse.data.team);
          }
          
          fetchTeams();
          fetchUnassignedEmployees();
        }
      } catch (err) {
        console.error('Remove member error:', err);
        setError(getErrorMessage(err));
      }
    }
  };

  const handleRemoveBrokenMember = async (memberIndex) => {
    if (window.confirm('Are you sure you want to remove this broken member reference from the team?')) {
      try {
        setError('');
        setSuccess('');

        // Call the cleanup API to remove broken member references
        const response = await teamAPI.cleanupTeamMembers(selectedTeam._id);
        
        if (response.data.success) {
          setSelectedTeam(response.data.team);
          setSuccess(response.data.message);
          fetchTeams();
          fetchUnassignedEmployees();
        }
      } catch (err) {
        console.error('Remove broken member error:', err);
        setError(getErrorMessage(err));
      }
    }
  };

  // Check if user can edit/delete specific team
  const canEditTeam = (team) => {
    return canManageAllTeams || 
           (isTeamManager && team.teamManager && team.teamManager._id === user._id);
  };

  const canDeleteTeam = (team) => {
    return canManageAllTeams;
  };

  const canManageMembers = (team) => {
    return canManageAllTeams || 
           (isTeamManager && team.teamManager && team.teamManager._id === user._id);
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
                            onClick={() => handleOpenMembersModal(team)}
                            disabled={!canManageMembers(team)}
                          >
                            <i className="bi bi-people"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            title="Edit Team"
                            onClick={() => handleOpenEditModal(team)}
                            disabled={!canEditTeam(team)}
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            title="Delete Team"
                            onClick={() => handleDeleteTeam(team._id, team.name)}
                            disabled={!canDeleteTeam(team)}
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
                    <div className="col-md-12">
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
                      <label className="form-label">Team Members</label>
                      <div className="border rounded p-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {unassignedEmployees.length === 0 ? (
                          <p className="text-muted mb-0">No unassigned employees available</p>
                        ) : (
                          unassignedEmployees.map(employee => (
                            <div key={employee._id} className="form-check mb-2">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                value={employee._id}
                                id={`employee-${employee._id}`}
                                checked={addFormData.members.includes(employee._id)}
                                onChange={handleMembersChange}
                              />
                              <label className="form-check-label" htmlFor={`employee-${employee._id}`}>
                                {employee.firstName} {employee.lastName} ({employee.email})
                              </label>
                            </div>
                          ))
                        )}
                      </div>
                      {validationErrors.members && (
                        <div className="invalid-feedback d-block">
                          {validationErrors.members}
                        </div>
                      )}
                      <small className="form-text text-muted">
                        Select employees to add to this team (only unassigned employees are shown)
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

      {/* Edit Team Modal */}
      {showEditModal && editingTeam && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <form onSubmit={handleEditTeam} noValidate>
                <div className="modal-header">
                  <h5 className="modal-title">Edit Team - {editingTeam.name}</h5>
                  <button 
                    type="button" 
                    className="btn-close"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingTeam(null);
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
                        value={editFormData.name}
                        onChange={handleEditInputChange}
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
                      <label className="form-label">Team Code</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editingTeam.code}
                        disabled
                        style={{ backgroundColor: '#f8f9fa' }}
                      />
                      <small className="form-text text-muted">Team code cannot be changed</small>
                    </div>
                    <div className="col-md-12">
                      <label className="form-label">Team Description</label>
                      <textarea
                        className="form-control"
                        name="description"
                        value={editFormData.description}
                        onChange={handleEditInputChange}
                        rows="2"
                        placeholder="Brief description of the team's purpose"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Max Team Size</label>
                      <input
                        type="number"
                        className={`form-control ${validationErrors.maxSize ? 'is-invalid' : ''}`}
                        name="maxSize"
                        value={editFormData.maxSize}
                        onChange={handleEditInputChange}
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
                      <div className="form-check mt-4">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          name="isActive"
                          id="isActive"
                          checked={editFormData.isActive}
                          onChange={handleEditInputChange}
                        />
                        <label className="form-check-label" htmlFor="isActive">
                          Team is Active
                        </label>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Team Manager *</label>
                      <select
                        className={`form-select ${validationErrors.teamManager ? 'is-invalid' : ''}`}
                        name="teamManager"
                        value={editFormData.teamManager}
                        onChange={handleEditInputChange}
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
                        value={editFormData.teamLeader}
                        onChange={handleEditInputChange}
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
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingTeam(null);
                      setValidationErrors({});
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Update Team
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Manage Members Modal */}
      {showMembersModal && selectedTeam && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Manage Team Members - {selectedTeam.name}</h5>
                <button 
                  type="button" 
                  className="btn-close"
                  onClick={() => {
                    setShowMembersModal(false);
                    setSelectedTeam(null);
                    setMemberFormData({ userId: '', role: 'Member' });
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  {/* Team Information */}
                  <div className="col-md-4">
                    <div className="card">
                      <div className="card-header">
                        <h6 className="mb-0">Team Information</h6>
                      </div>
                      <div className="card-body">
                        <p><strong>Team Code:</strong> <code>{selectedTeam.code}</code></p>
                        <p><strong>Description:</strong> {selectedTeam.description || 'No description'}</p>
                        <p><strong>Max Size:</strong> {selectedTeam.maxSize}</p>
                        <p><strong>Current Size:</strong> {selectedTeam.members?.length || 0}</p>
                        <p><strong>Status:</strong> {getStatusBadge(selectedTeam.isActive)}</p>
                        
                        <hr />
                        
                        <div className="mb-3">
                          <strong>Team Manager:</strong>
                          {selectedTeam.teamManager ? (
                            <div className="mt-1">
                              <div className="fw-semibold">
                                {selectedTeam.teamManager.firstName} {selectedTeam.teamManager.lastName}
                              </div>
                              <small className="text-muted">{selectedTeam.teamManager.email}</small>
                            </div>
                          ) : (
                            <span className="text-muted"> Not assigned</span>
                          )}
                        </div>
                        
                        <div>
                          <strong>Team Leader:</strong>
                          {selectedTeam.teamLeader ? (
                            <div className="mt-1">
                              <div className="fw-semibold">
                                {selectedTeam.teamLeader.firstName} {selectedTeam.teamLeader.lastName}
                              </div>
                              <small className="text-muted">{selectedTeam.teamLeader.email}</small>
                            </div>
                          ) : (
                            <span className="text-muted"> Not assigned</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Current Members */}
                  <div className="col-md-8">
                    <div className="card">
                      <div className="card-header d-flex justify-content-between align-items-center">
                        <h6 className="mb-0">Current Members ({selectedTeam.members?.length || 0})</h6>
                      </div>
                      <div className="card-body">
                        {selectedTeam.members && selectedTeam.members.length > 0 ? (
                          <div className="table-responsive">
                            <table className="table table-sm">
                              <thead>
                                <tr>
                                  <th>Employee</th>
                                  <th>Role</th>
                                  <th>Joined Date</th>
                                  <th>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedTeam.members.map((member, index) => {
                                  // Handle case where member.user is null (broken reference)
                                  if (!member.user) {
                                    return (
                                      <tr key={`broken-member-${index}`} className="table-warning">
                                        <td>
                                          <div>
                                            <div className="fw-semibold text-warning">
                                              <i className="bi bi-exclamation-triangle me-1"></i>
                                              Deleted User
                                            </div>
                                            <small className="text-muted">User data not found</small>
                                          </div>
                                        </td>
                                        <td>
                                          <span className="badge bg-secondary">{member.role}</span>
                                        </td>
                                        <td>
                                          <small>{new Date(member.joinedDate).toLocaleDateString()}</small>
                                        </td>
                                        <td>
                                          <button
                                            className="btn btn-sm btn-outline-danger"
                                            onClick={() => handleRemoveBrokenMember(index)}
                                            title="Remove Broken Reference"
                                          >
                                            <i className="bi bi-trash"></i>
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  }

                                  return (
                                    <tr key={member.user._id}>
                                      <td>
                                        <div>
                                          <div className="fw-semibold">
                                            {member.user.firstName} {member.user.lastName}
                                          </div>
                                          <small className="text-muted">{member.user.email}</small>
                                        </div>
                                      </td>
                                      <td>
                                        <span className="badge bg-secondary">{member.role}</span>
                                      </td>
                                      <td>
                                        <small>{new Date(member.joinedDate).toLocaleDateString()}</small>
                                      </td>
                                      <td>
                                        <button
                                          className="btn btn-sm btn-outline-danger"
                                          onClick={() => handleRemoveMember(
                                            member.user._id, 
                                            `${member.user.firstName} ${member.user.lastName}`
                                          )}
                                          title="Remove Member"
                                        >
                                          <i className="bi bi-trash"></i>
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <i className="bi bi-people text-muted" style={{ fontSize: '2rem' }}></i>
                            <p className="text-muted mt-2">No members in this team yet</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Add New Member */}
                    <div className="card mt-3">
                      <div className="card-header">
                        <h6 className="mb-0">Add New Member</h6>
                      </div>
                      <div className="card-body">
                        <form onSubmit={handleAddMember}>
                          <div className="row g-3">
                            <div className="col-md-8">
                              <label className="form-label">Select Employee</label>
                              <select
                                className="form-select"
                                value={memberFormData.userId}
                                onChange={(e) => setMemberFormData(prev => ({
                                  ...prev,
                                  userId: e.target.value
                                }))}
                                required
                              >
                                <option value="">Choose an employee...</option>
                                {unassignedEmployees.map(employee => (
                                  <option key={employee._id} value={employee._id}>
                                    {employee.firstName} {employee.lastName} ({employee.email})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="col-md-4">
                              <label className="form-label">Role</label>
                              <select
                                className="form-select"
                                value={memberFormData.role}
                                onChange={(e) => setMemberFormData(prev => ({
                                  ...prev,
                                  role: e.target.value
                                }))}
                              >
                                <option value="Member">Member</option>
                                <option value="Senior Member">Senior Member</option>
                                <option value="Lead">Lead</option>
                              </select>
                            </div>
                            <div className="col-12">
                              <button 
                                type="submit" 
                                className="btn btn-primary"
                                disabled={!memberFormData.userId}
                              >
                                <i className="bi bi-plus-circle me-1"></i>
                                Add Member
                              </button>
                            </div>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowMembersModal(false);
                    setSelectedTeam(null);
                    setMemberFormData({ userId: '', role: 'Member' });
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManagement;
