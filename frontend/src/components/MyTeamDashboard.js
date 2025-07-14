import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { teamAPI, userAPI } from '../utils/api';

const MyTeamDashboard = () => {
  const { user } = useAuth();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [teamStats, setTeamStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    recentJoins: 0
  });

  useEffect(() => {
    fetchMyTeam();
  }, []);

  const fetchMyTeam = async () => {
    try {
      setLoading(true);
      const response = await teamAPI.getMyTeam();
      
      if (response.data.success) {
        const teamData = response.data.team;
        setTeam(teamData);
        
        // Calculate team statistics
        const totalMembers = teamData.members?.length || 0;
        const activeMembers = teamData.members?.filter(member => 
          member.user && member.user.isActive !== false
        ).length || 0;
        
        // Recent joins (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentJoins = teamData.members?.filter(member => 
          new Date(member.joinedDate) > thirtyDaysAgo
        ).length || 0;

        setTeamStats({
          totalMembers,
          activeMembers,
          recentJoins
        });
      }
    } catch (err) {
      console.error('Error fetching my team:', err);
      if (err.response?.status === 404) {
        setError('No team assigned to you as Team Leader');
      } else {
        setError('Failed to fetch team data');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (isActive) => {
    return (
      <span className={`badge ${isActive ? 'bg-success' : 'bg-warning'}`}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
  };

  const getRoleBadge = (role) => {
    const roleColors = {
      'Lead': 'bg-primary',
      'Senior Member': 'bg-info',
      'Member': 'bg-secondary'
    };
    return (
      <span className={`badge ${roleColors[role] || 'bg-secondary'}`}>
        {role}
      </span>
    );
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

  if (error && !team) {
    return (
      <div className="container-fluid">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card">
              <div className="card-body text-center py-5">
                <i className="bi bi-people text-muted" style={{ fontSize: '4rem' }}></i>
                <h4 className="mt-3 text-muted">No Team Assigned</h4>
                <p className="text-muted">
                  You are not currently assigned as a Team Leader for any team.
                  Please contact your administrator if you believe this is an error.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">My Team Dashboard</h2>
          <p className="text-muted">Manage and monitor your team</p>
        </div>
        <div className="d-flex gap-2">
          <button 
            className="btn btn-outline-primary"
            onClick={fetchMyTeam}
          >
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
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

      {team && (
        <>
          {/* Team Overview */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="card bg-primary text-white">
                <div className="card-body">
                  <div className="row align-items-center">
                    <div className="col-md-8">
                      <h3 className="card-title mb-2">{team.name}</h3>
                      <p className="card-text mb-1">
                        <strong>Code:</strong> {team.code} | 
                        <strong> Department:</strong> {team.department || 'Not assigned'}
                      </p>
                      {team.description && (
                        <p className="card-text mb-0 opacity-75">{team.description}</p>
                      )}
                      {team.teamManager && (
                        <p className="card-text mb-0 mt-2">
                          <strong>Team Manager:</strong> {team.teamManager.firstName} {team.teamManager.lastName}
                        </p>
                      )}
                    </div>
                    <div className="col-md-4 text-end">
                      <i className="bi bi-people" style={{ fontSize: '3rem', opacity: 0.7 }}></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Team Statistics */}
          <div className="row mb-4">
            <div className="col-md-4">
              <div className="card text-center">
                <div className="card-body">
                  <i className="bi bi-people text-primary" style={{ fontSize: '2rem' }}></i>
                  <h3 className="card-title mt-2">{teamStats.totalMembers}</h3>
                  <p className="card-text text-muted">Total Members</p>
                  <small className="text-muted">
                    Capacity: {teamStats.totalMembers} / {team.maxSize}
                  </small>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card text-center">
                <div className="card-body">
                  <i className="bi bi-person-check text-success" style={{ fontSize: '2rem' }}></i>
                  <h3 className="card-title mt-2">{teamStats.activeMembers}</h3>
                  <p className="card-text text-muted">Active Members</p>
                  <small className="text-muted">
                    {teamStats.totalMembers > 0 ? 
                      Math.round((teamStats.activeMembers / teamStats.totalMembers) * 100) : 0}% active
                  </small>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card text-center">
                <div className="card-body">
                  <i className="bi bi-person-plus text-info" style={{ fontSize: '2rem' }}></i>
                  <h3 className="card-title mt-2">{teamStats.recentJoins}</h3>
                  <p className="card-text text-muted">Recent Joins</p>
                  <small className="text-muted">Last 30 days</small>
                </div>
              </div>
            </div>
          </div>

          {/* Team Members */}
          <div className="card">
            <div className="card-header">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">
                  <i className="bi bi-people me-2"></i>
                  Team Members
                </h5>
                <span className="badge bg-primary">
                  {teamStats.totalMembers} members
                </span>
              </div>
            </div>
            <div className="card-body">
              {team.members && team.members.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead className="table-light">
                      <tr>
                        <th>Member</th>
                        <th>System Role</th>
                        <th>Team Role</th>
                        <th>Joined Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {team.members.map((member) => (
                        <tr key={member.user._id}>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center me-3"
                                   style={{ width: '40px', height: '40px' }}>
                                <i className="bi bi-person text-white"></i>
                              </div>
                              <div>
                                <div className="fw-semibold">
                                  {member.user.firstName} {member.user.lastName}
                                </div>
                                <small className="text-muted">{member.user.email}</small>
                                {member.user.employeeId && (
                                  <div>
                                    <small className="text-muted">ID: {member.user.employeeId}</small>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="badge bg-secondary">
                              {member.user.role || 'Employee'}
                            </span>
                          </td>
                          <td>
                            {getRoleBadge(member.role)}
                          </td>
                          <td>
                            <small>
                              {new Date(member.joinedDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </small>
                          </td>
                          <td>
                            {getStatusBadge(member.user.isActive !== false)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-4">
                  <i className="bi bi-people text-muted" style={{ fontSize: '3rem' }}></i>
                  <h5 className="mt-3 text-muted">No team members</h5>
                  <p className="text-muted">Your team doesn't have any members yet.</p>
                </div>
              )}
            </div>
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
                          <i className="bi bi-clipboard-check me-2"></i>
                          Performance Reviews
                        </button>
                      </div>
                    </div>
                    <div className="col-md-3 mb-3">
                      <div className="d-grid">
                        <button className="btn btn-outline-success">
                          <i className="bi bi-calendar-check me-2"></i>
                          Leave Requests
                        </button>
                      </div>
                    </div>
                    <div className="col-md-3 mb-3">
                      <div className="d-grid">
                        <button className="btn btn-outline-info">
                          <i className="bi bi-graph-up me-2"></i>
                          Team Reports
                        </button>
                      </div>
                    </div>
                    <div className="col-md-3 mb-3">
                      <div className="d-grid">
                        <button className="btn btn-outline-warning">
                          <i className="bi bi-gear me-2"></i>
                          Team Settings
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
    </div>
  );
};

export default MyTeamDashboard;
