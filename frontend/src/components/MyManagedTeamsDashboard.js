import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { teamAPI, userAPI, departmentAPI } from '../utils/api';
import { useNavigate } from 'react-router-dom';

const MyManagedTeamsDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [overallStats, setOverallStats] = useState({
    totalTeams: 0,
    totalMembers: 0,
    activeTeams: 0,
    avgTeamSize: 0
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [users, setUsers] = useState([]);
  const [teamLeaders, setTeamLeaders] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});
  
  const [editFormData, setEditFormData] = useState({
    description: '',
    teamLeader: '',
    maxSize: 10,
    isActive: true
  });

  const [memberFormData, setMemberFormData] = useState({
    userId: '',
    role: 'Member'
  });

  useEffect(() => {
    fetchMyManagedTeams();
    fetchUsers();
  }, []);

  const fetchMyManagedTeams = async () => {
    try {
      setLoading(true);
      const response = await teamAPI.getMyManagedTeams();
      
      if (response.data.success) {
        const teamsData = response.data.teams;
        setTeams(teamsData);
        
        // Calculate overall statistics
        const totalTeams = teamsData.length;
        const activeTeams = teamsData.filter(team => team.isActive).length;
        const totalMembers = teamsData.reduce((sum, team) => sum + (team.members?.length || 0), 0);
        const avgTeamSize = totalTeams > 0 ? Math.round(totalMembers / totalTeams) : 0;

        setOverallStats({
          totalTeams,
          totalMembers,
          activeTeams,
          avgTeamSize
        });
      }
    } catch (err) {
      console.error('Error fetching managed teams:', err);
      setError('Failed to fetch your managed teams');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (isActive) => {
    return (
      <span className={`badge ${isActive ? 'bg-success' : 'bg-danger'}`}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
  };

  const getTeamCapacityColor = (current, max) => {
    const percentage = (current / max) * 100;
    if (percentage >= 90) return 'bg-danger';
    if (percentage >= 75) return 'bg-warning';
    return 'bg-success';
  };

  const fetchUsers = async () => {
    try {
      const response = await userAPI.getAllUsers({ limit: 1000 });
      if (response.data.success) {
        setUsers(response.data.users);
        setTeamLeaders(response.data.users.filter(u => u.role === 'Team Leader'));
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const handleEditTeam = (team) => {
    setEditingTeam(team);
    setEditFormData({
      description: team.description || '',
      teamLeader: team.teamLeader?._id || '',
      maxSize: team.maxSize || 10,
      isActive: team.isActive !== undefined ? team.isActive : true
    });
    setValidationErrors({});
    setShowEditModal(true);
  };

  const handleManageMembers = (team) => {
    setSelectedTeam(team);
    setMemberFormData({
      userId: '',
      role: 'Member'
    });
    setShowMembersModal(true);
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

  const handleMemberInputChange = (e) => {
    const { name, value } = e.target;
    setMemberFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateEditForm = () => {
    const errors = {};
    
    if (editFormData.maxSize < 1 || editFormData.maxSize > 50) {
      errors.maxSize = 'Max size must be between 1 and 50';
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
        return data.message;
      }
    }
    
    if (error?.message) {
      return error.message;
    }
    
    return 'An unexpected error occurred. Please try again.';
  };

  const handleUpdateTeam = async (e) => {
    e.preventDefault();
    
    if (!validateEditForm()) {
      return;
    }
    
    try {
      setError('');
      setSuccess('');

      const teamData = {
        description: editFormData.description.trim(),
        teamLeader: editFormData.teamLeader || null,
        maxSize: parseInt(editFormData.maxSize),
        isActive: editFormData.isActive
      };

      const response = await teamAPI.updateTeam(editingTeam._id, teamData);
      
      if (response.data.success) {
        setShowEditModal(false);
        setEditingTeam(null);
        setValidationErrors({});
        setSuccess('Team updated successfully!');
        fetchMyManagedTeams();
      }
    } catch (err) {
      console.error('Update team error:', err);
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
        setSuccess('Member added successfully!');
        setMemberFormData({ userId: '', role: 'Member' });
        
        // Update the selected team with new member data
        setSelectedTeam(response.data.team);
        fetchMyManagedTeams();
      }
    } catch (err) {
      console.error('Add member error:', err);
      setError(getErrorMessage(err));
    }
  };

  const handleRemoveMember = async (userId) => {
    if (window.confirm('Are you sure you want to remove this member from the team?')) {
      try {
        setError('');
        setSuccess('');

        const response = await teamAPI.removeTeamMember(selectedTeam._id, userId);
        
        if (response.data.success) {
          setSuccess('Member removed successfully!');
          
          // Update the selected team with updated member data
          setSelectedTeam(response.data.team);
          fetchMyManagedTeams();
        }
      } catch (err) {
        console.error('Remove member error:', err);
        setError(getErrorMessage(err));
      }
    }
  };

  const handleManageTeam = (teamId) => {
    navigate(`/admin/teams?teamId=${teamId}`);
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
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">My Managed Teams</h2>
          <p className="text-muted">Overview and management of teams under your supervision</p>
        </div>
        <div className="d-flex gap-2">
          <button 
            className="btn btn-outline-primary"
            onClick={fetchMyManagedTeams}
          >
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/admin/teams')}
          >
            <i className="bi bi-gear me-1"></i>
            Manage All Teams
          </button>
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

      {teams.length === 0 ? (
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card">
              <div className="card-body text-center py-5">
                <i className="bi bi-diagram-3 text-muted" style={{ fontSize: '4rem' }}></i>
                <h4 className="mt-3 text-muted">No Teams Assigned</h4>
                <p className="text-muted">
                  You are not currently assigned as a Team Manager for any teams.
                  Please contact your administrator if you believe this is an error.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Overall Statistics */}
          <div className="row mb-4">
            <div className="col-md-3">
              <div className="card text-center">
                <div className="card-body">
                  <i className="bi bi-diagram-3 text-primary" style={{ fontSize: '2rem' }}></i>
                  <h3 className="card-title mt-2">{overallStats.totalTeams}</h3>
                  <p className="card-text text-muted">Total Teams</p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-center">
                <div className="card-body">
                  <i className="bi bi-people text-success" style={{ fontSize: '2rem' }}></i>
                  <h3 className="card-title mt-2">{overallStats.totalMembers}</h3>
                  <p className="card-text text-muted">Total Members</p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-center">
                <div className="card-body">
                  <i className="bi bi-check-circle text-info" style={{ fontSize: '2rem' }}></i>
                  <h3 className="card-title mt-2">{overallStats.activeTeams}</h3>
                  <p className="card-text text-muted">Active Teams</p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-center">
                <div className="card-body">
                  <i className="bi bi-bar-chart text-warning" style={{ fontSize: '2rem' }}></i>
                  <h3 className="card-title mt-2">{overallStats.avgTeamSize}</h3>
                  <p className="card-text text-muted">Avg Team Size</p>
                </div>
              </div>
            </div>
          </div>

          {/* Teams Grid */}
          <div className="row">
            {teams.map((team) => (
              <div key={team._id} className="col-lg-6 col-xl-4 mb-4">
                <div className="card h-100">
                  <div className="card-header d-flex justify-content-between align-items-center">
                    <h6 className="card-title mb-0">{team.name}</h6>
                    {getStatusBadge(team.isActive)}
                  </div>
                  <div className="card-body">
                    <div className="mb-3">
                      <small className="text-muted d-block">Code: <strong>{team.code}</strong></small>
                      <small className="text-muted d-block">
                        Department: <strong>{team.department || 'Not assigned'}</strong>
                      </small>
                      {team.description && (
                        <small className="text-muted d-block mt-2">{team.description}</small>
                      )}
                    </div>

                    {/* Team Leader */}
                    <div className="mb-3">
                      <small className="text-muted d-block">Team Leader:</small>
                      {team.teamLeader ? (
                        <div className="d-flex align-items-center">
                          <div className="bg-secondary rounded-circle d-flex align-items-center justify-content-center me-2"
                               style={{ width: '24px', height: '24px' }}>
                            <i className="bi bi-person text-white" style={{ fontSize: '0.8rem' }}></i>
                          </div>
                          <small>
                            <strong>{team.teamLeader.firstName} {team.teamLeader.lastName}</strong>
                          </small>
                        </div>
                      ) : (
                        <small className="text-muted">Not assigned</small>
                      )}
                    </div>

                    {/* Team Capacity */}
                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <small className="text-muted">Team Capacity</small>
                        <small className="text-muted">
                          {team.members?.length || 0} / {team.maxSize}
                        </small>
                      </div>
                      <div className="progress" style={{ height: '6px' }}>
                        <div 
                          className={`progress-bar ${getTeamCapacityColor(team.members?.length || 0, team.maxSize)}`}
                          style={{ 
                            width: `${Math.min(((team.members?.length || 0) / team.maxSize) * 100, 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Recent Members */}
                    {team.members && team.members.length > 0 && (
                      <div className="mb-3">
                        <small className="text-muted d-block mb-2">Recent Members:</small>
                        <div className="d-flex flex-wrap gap-1">
                          {team.members.slice(0, 3).map((member) => (
                            <span 
                              key={member.user._id} 
                              className="badge bg-light text-dark"
                              title={`${member.user.firstName} ${member.user.lastName}`}
                            >
                              {member.user.firstName} {member.user.lastName.charAt(0)}.
                            </span>
                          ))}
                          {team.members.length > 3 && (
                            <span className="badge bg-secondary">
                              +{team.members.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="card-footer">
                    <div className="d-grid gap-2">
                      <div className="btn-group" role="group">
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => handleEditTeam(team)}
                          title="Edit Team"
                        >
                          <i className="bi bi-pencil me-1"></i>
                          Edit
                        </button>
                        <button 
                          className="btn btn-success btn-sm"
                          onClick={() => handleManageMembers(team)}
                          title="Manage Members"
                        >
                          <i className="bi bi-people me-1"></i>
                          Members
                        </button>
                      </div>
                      <div className="btn-group" role="group">
                        <button className="btn btn-outline-secondary btn-sm">
                          <i className="bi bi-graph-up me-1"></i>
                          Reports
                        </button>
                        <button className="btn btn-outline-secondary btn-sm">
                          <i className="bi bi-calendar-check me-1"></i>
                          Leave
                        </button>
                        <button className="btn btn-outline-secondary btn-sm">
                          <i className="bi bi-clipboard-check me-1"></i>
                          Performance
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="row mt-4">
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title mb-0">
                    <i className="bi bi-lightning me-2"></i>
                    Quick Actions
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-3 mb-3">
                      <div className="d-grid">
                        <button className="btn btn-outline-primary">
                          <i className="bi bi-plus-circle me-2"></i>
                          Add Team Member
                        </button>
                      </div>
                    </div>
                    <div className="col-md-3 mb-3">
                      <div className="d-grid">
                        <button className="btn btn-outline-success">
                          <i className="bi bi-clipboard-check me-2"></i>
                          Bulk Performance Review
                        </button>
                      </div>
                    </div>
                    <div className="col-md-3 mb-3">
                      <div className="d-grid">
                        <button className="btn btn-outline-info">
                          <i className="bi bi-graph-up me-2"></i>
                          Generate Reports
                        </button>
                      </div>
                    </div>
                    <div className="col-md-3 mb-3">
                      <div className="d-grid">
                        <button className="btn btn-outline-warning">
                          <i className="bi bi-calendar-week me-2"></i>
                          Schedule Meeting
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Team Modal */}
      {showEditModal && editingTeam && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <form onSubmit={handleUpdateTeam} noValidate>
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
                      <label className="form-label">Team Leader</label>
                      <select
                        className="form-select"
                        name="teamLeader"
                        value={editFormData.teamLeader}
                        onChange={handleEditInputChange}
                      >
                        <option value="">Select Team Leader</option>
                        {teamLeaders.map(leader => (
                          <option key={leader._id} value={leader._id}>
                            {leader.firstName} {leader.lastName} ({leader.email})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-12">
                      <label className="form-label">Description</label>
                      <textarea
                        className="form-control"
                        name="description"
                        value={editFormData.description}
                        onChange={handleEditInputChange}
                        rows="3"
                        placeholder="Brief description of the team's purpose and responsibilities"
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
                          Active Team
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
          <div className="modal-dialog modal-lg">
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
                {/* Add Member Form */}
                <div className="card mb-4">
                  <div className="card-header">
                    <h6 className="mb-0">Add New Member</h6>
                  </div>
                  <div className="card-body">
                    <form onSubmit={handleAddMember}>
                      <div className="row g-3">
                        <div className="col-md-8">
                          <label className="form-label">Select User</label>
                          <select
                            className="form-select"
                            name="userId"
                            value={memberFormData.userId}
                            onChange={handleMemberInputChange}
                            required
                          >
                            <option value="">Choose a user...</option>
                            {users
                              .filter(u => 
                                u.role === 'Employee' && 
                                !selectedTeam.members?.some(m => m.user._id === u._id)
                              )
                              .map(user => (
                                <option key={user._id} value={user._id}>
                                  {user.firstName} {user.lastName} ({user.email}) - {user.role}
                                </option>
                              ))}
                          </select>
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">Member Role</label>
                          <select
                            className="form-select"
                            name="role"
                            value={memberFormData.role}
                            onChange={handleMemberInputChange}
                          >
                            <option value="Member">Member</option>
                            <option value="Senior Member">Senior Member</option>
                            <option value="Lead">Lead</option>
                          </select>
                        </div>
                        <div className="col-md-12">
                          <button type="submit" className="btn btn-primary">
                            <i className="bi bi-plus-circle me-1"></i>
                            Add Member
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>

                {/* Current Members */}
                <div className="card">
                  <div className="card-header">
                    <h6 className="mb-0">
                      Current Members ({selectedTeam.currentSize || 0} / {selectedTeam.maxSize})
                    </h6>
                  </div>
                  <div className="card-body">
                    {selectedTeam.members && selectedTeam.members.length > 0 ? (
                      <div className="table-responsive">
                        <table className="table table-sm">
                          <thead>
                            <tr>
                              <th>Member</th>
                              <th>Role in System</th>
                              <th>Team Role</th>
                              <th>Joined Date</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedTeam.members.map((member) => (
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
                                  <span className="badge bg-secondary">
                                    {member.user.role || 'Employee'}
                                  </span>
                                </td>
                                <td>
                                  <span className="badge bg-info">
                                    {member.role}
                                  </span>
                                </td>
                                <td>
                                  <small>
                                    {new Date(member.joinedDate).toLocaleDateString()}
                                  </small>
                                </td>
                                <td>
                                  <button
                                    className="btn btn-sm btn-outline-danger"
                                    title="Remove Member"
                                    onClick={() => handleRemoveMember(member.user._id)}
                                  >
                                    <i className="bi bi-trash"></i>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-3">
                        <i className="bi bi-people text-muted" style={{ fontSize: '2rem' }}></i>
                        <p className="text-muted mt-2">No members in this team yet</p>
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

export default MyManagedTeamsDashboard;
