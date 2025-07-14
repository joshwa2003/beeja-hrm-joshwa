import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userAPI, teamAPI } from '../utils/api';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user, logout, hasRole, hasAnyRole, getRoleLevel } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    departments: 0,
  });
  const [recentUsers, setRecentUsers] = useState([]);
  const [teamData, setTeamData] = useState(null);
  const [managedTeams, setManagedTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch data for Admin and VP
      if (hasAnyRole(['Admin', 'Vice President'])) {
        const response = await userAPI.getAllUsers({ limit: 5 });
        setRecentUsers(response.data.users || []);
        setStats({
          totalUsers: response.data.total || 0,
          activeUsers: response.data.users?.filter(u => u.isActive).length || 0,
          departments: [...new Set(response.data.users?.map(u => u.department).filter(Boolean))].length || 0,
        });
      }

      // Fetch team data for Team Leaders
      if (hasRole('Team Leader')) {
        try {
          const teamResponse = await teamAPI.getMyTeam();
          if (teamResponse.data.success) {
            setTeamData(teamResponse.data.team);
          }
        } catch (err) {
          console.log('No team assigned to this Team Leader');
        }
      }

      // Fetch managed teams for Team Managers
      if (hasRole('Team Manager')) {
        try {
          const teamsResponse = await teamAPI.getMyManagedTeams();
          if (teamsResponse.data.success) {
            setManagedTeams(teamsResponse.data.teams);
          }
        } catch (err) {
          console.log('No teams assigned to this Team Manager');
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const getRoleColor = (role) => {
    const colors = {
      'Admin': 'danger',
      'Vice President': 'primary',
      'HR BP': 'info',
      'HR Manager': 'success',
      'HR Executive': 'warning',
      'Team Manager': 'secondary',
      'Team Leader': 'dark'
    };
    return colors[role] || 'secondary';
  };

  const getRoleIcon = (role) => {
    const icons = {
      'Admin': 'bi-shield-check',
      'Vice President': 'bi-star',
      'HR BP': 'bi-briefcase',
      'HR Manager': 'bi-people',
      'HR Executive': 'bi-person-badge',
      'Team Manager': 'bi-diagram-3',
      'Team Leader': 'bi-person-check'
    };
    return icons[role] || 'bi-person';
  };

  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    let greeting = 'Good morning';
    if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
    else if (hour >= 17) greeting = 'Good evening';
    
    return `${greeting}, ${user?.firstName}!`;
  };

  const getAccessibleFeatures = () => {
    const features = [];
    const roleLevel = getRoleLevel();

    if (hasRole('Admin')) {
      features.push(
        { name: 'User Management', icon: 'bi-people', description: 'Manage all users and roles' },
        { name: 'System Settings', icon: 'bi-gear', description: 'Configure system settings' },
        { name: 'Reports & Analytics', icon: 'bi-graph-up', description: 'View detailed reports' },
        { name: 'Audit Logs', icon: 'bi-journal-text', description: 'View system audit logs' }
      );
    } else if (hasRole('Vice President')) {
      features.push(
        { name: 'Executive Dashboard', icon: 'bi-speedometer2', description: 'High-level overview' },
        { name: 'Department Reports', icon: 'bi-bar-chart', description: 'Department performance' },
        { name: 'Strategic Planning', icon: 'bi-diagram-3', description: 'Strategic initiatives' }
      );
    } else if (hasAnyRole(['HR BP', 'HR Manager'])) {
      features.push(
        { name: 'Employee Records', icon: 'bi-person-lines-fill', description: 'Manage employee data' },
        { name: 'Recruitment', icon: 'bi-person-plus', description: 'Hiring and onboarding' },
        { name: 'Performance Reviews', icon: 'bi-clipboard-check', description: 'Employee evaluations' }
      );
    } else if (hasRole('HR Executive')) {
      features.push(
        { name: 'Employee Support', icon: 'bi-headset', description: 'Employee assistance' },
        { name: 'Documentation', icon: 'bi-file-text', description: 'HR documentation' },
        { name: 'Training Records', icon: 'bi-book', description: 'Training management' }
      );
    } else if (hasRole('Team Manager')) {
      features.push(
        { name: 'My Teams Dashboard', icon: 'bi-diagram-3', description: 'Manage your teams', action: () => navigate('/my-teams') },
        { name: 'Team Performance', icon: 'bi-graph-up', description: 'Team performance metrics' },
        { name: 'Member Management', icon: 'bi-people', description: 'Manage team members' },
        { name: 'Team Reports', icon: 'bi-bar-chart', description: 'Generate team reports' }
      );
    } else if (hasRole('Team Leader')) {
      features.push(
        { name: 'My Team Dashboard', icon: 'bi-people', description: 'Manage your team', action: () => navigate('/my-team') },
        { name: 'Team Performance', icon: 'bi-graph-up', description: 'Monitor team performance' },
        { name: 'Member Support', icon: 'bi-person-check', description: 'Support team members' },
        { name: 'Team Activities', icon: 'bi-list-check', description: 'Track team activities' }
      );
    }

    return features;
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-light">
      {/* Navigation Header */}
      {/* Main Content */}
      <div className="container-fluid py-4">
        {/* Welcome Section */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card bg-gradient bg-primary text-white">
              <div className="card-body">
                <div className="row align-items-center">
                  <div className="col-md-8">
                    <h2 className="card-title mb-1">{getWelcomeMessage()}</h2>
                    <p className="card-text mb-0">
                      Welcome to your HRM dashboard. You're logged in as{' '}
                      <span className={`badge bg-${getRoleColor(user?.role)} ms-1`}>
                        {user?.role}
                      </span>
                    </p>
                    {user?.department && (
                      <small className="opacity-75">Department: {user.department}</small>
                    )}
                  </div>
                  <div className="col-md-4 text-end">
                    <i className={`bi ${getRoleIcon(user?.role)}`} style={{ fontSize: '3rem', opacity: 0.7 }}></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards (Admin and VP only) */}
        {hasAnyRole(['Admin', 'Vice President']) && (
          <div className="row mb-4">
            <div className="col-md-4">
              <div className="card text-center">
                <div className="card-body">
                  <i className="bi bi-people text-primary" style={{ fontSize: '2rem' }}></i>
                  <h3 className="card-title mt-2">{stats.totalUsers}</h3>
                  <p className="card-text text-muted">Total Users</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card text-center">
                <div className="card-body">
                  <i className="bi bi-person-check text-success" style={{ fontSize: '2rem' }}></i>
                  <h3 className="card-title mt-2">{stats.activeUsers}</h3>
                  <p className="card-text text-muted">Active Users</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card text-center">
                <div className="card-body">
                  <i className="bi bi-building text-info" style={{ fontSize: '2rem' }}></i>
                  <h3 className="card-title mt-2">{stats.departments}</h3>
                  <p className="card-text text-muted">Departments</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="row">
          {/* Available Features */}
          <div className="col-md-8">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0">
                  <i className="bi bi-grid me-2"></i>
                  Available Features
                </h5>
              </div>
              <div className="card-body">
                <div className="row">
                  {getAccessibleFeatures().map((feature, index) => (
                    <div key={index} className="col-md-6 mb-3">
                      <div 
                        className={`d-flex align-items-start ${feature.action ? 'cursor-pointer' : ''}`}
                        onClick={feature.action}
                        style={{ cursor: feature.action ? 'pointer' : 'default' }}
                      >
                        <div className="flex-shrink-0">
                          <i className={`bi ${feature.icon} text-primary`} style={{ fontSize: '1.5rem' }}></i>
                        </div>
                        <div className="flex-grow-1 ms-3">
                          <h6 className="mb-1">{feature.name}</h6>
                          <small className="text-muted">{feature.description}</small>
                          {feature.action && (
                            <div className="mt-1">
                              <small className="text-primary">Click to access →</small>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Users (Admin and VP only) */}
          {hasAnyRole(['Admin', 'Vice President']) && (
            <div className="col-md-4">
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title mb-0">
                    <i className="bi bi-clock me-2"></i>
                    Recent Users
                  </h5>
                </div>
                <div className="card-body">
                  {recentUsers.length > 0 ? (
                    <div className="list-group list-group-flush">
                      {recentUsers.map((recentUser) => (
                        <div key={recentUser._id} className="list-group-item px-0">
                          <div className="d-flex align-items-center">
                            <div className="flex-shrink-0">
                              <i className={`bi ${getRoleIcon(recentUser.role)} text-${getRoleColor(recentUser.role)}`}></i>
                            </div>
                            <div className="flex-grow-1 ms-3">
                              <h6 className="mb-0">{recentUser.firstName} {recentUser.lastName}</h6>
                              <small className="text-muted">{recentUser.role}</small>
                            </div>
                            <div className="flex-shrink-0">
                              <span className={`badge bg-${recentUser.isActive ? 'success' : 'secondary'}`}>
                                {recentUser.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted text-center">No users found</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Team Leader Dashboard Widget */}
          {hasRole('Team Leader') && teamData && (
            <div className="col-md-4">
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title mb-0">
                    <i className="bi bi-people me-2"></i>
                    My Team
                  </h5>
                </div>
                <div className="card-body">
                  <h6 className="card-title">{teamData.name}</h6>
                  <p className="card-text">
                    <small className="text-muted">Code: {teamData.code}</small>
                  </p>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <small className="text-muted">Team Size:</small>
                    <span className="badge bg-primary">
                      {teamData.members?.length || 0} / {teamData.maxSize}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <small className="text-muted">Department:</small>
                    <small>{teamData.department || 'Not assigned'}</small>
                  </div>
                  <div className="d-grid">
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => navigate('/my-team')}
                    >
                      <i className="bi bi-arrow-right me-1"></i>
                      Manage Team
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Team Manager Dashboard Widget */}
          {hasRole('Team Manager') && managedTeams.length > 0 && (
            <div className="col-md-4">
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title mb-0">
                    <i className="bi bi-diagram-3 me-2"></i>
                    My Teams
                  </h5>
                </div>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <small className="text-muted">Total Teams:</small>
                    <span className="badge bg-primary">{managedTeams.length}</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <small className="text-muted">Total Members:</small>
                    <span className="badge bg-success">
                      {managedTeams.reduce((sum, team) => sum + (team.members?.length || 0), 0)}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <small className="text-muted">Active Teams:</small>
                    <span className="badge bg-info">
                      {managedTeams.filter(team => team.isActive).length}
                    </span>
                  </div>
                  <div className="mb-3">
                    <small className="text-muted d-block mb-1">Recent Teams:</small>
                    {managedTeams.slice(0, 2).map(team => (
                      <div key={team._id} className="d-flex justify-content-between align-items-center">
                        <small>{team.name}</small>
                        <small className="text-muted">{team.members?.length || 0} members</small>
                      </div>
                    ))}
                  </div>
                  <div className="d-grid">
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => navigate('/my-teams')}
                    >
                      <i className="bi bi-arrow-right me-1"></i>
                      Manage Teams
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* User Profile Card (for other users) */}
          {!hasAnyRole(['Admin', 'Vice President']) && !hasRole('Team Leader') && !hasRole('Team Manager') && (
            <div className="col-md-4">
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title mb-0">
                    <i className="bi bi-person me-2"></i>
                    Your Profile
                  </h5>
                </div>
                <div className="card-body">
                  <div className="text-center">
                    <i className={`bi ${getRoleIcon(user?.role)} text-${getRoleColor(user?.role)}`} style={{ fontSize: '3rem' }}></i>
                    <h5 className="mt-3">{user?.firstName} {user?.lastName}</h5>
                    <p className="text-muted">{user?.email}</p>
                    <span className={`badge bg-${getRoleColor(user?.role)}`}>
                      {user?.role}
                    </span>
                    {user?.department && (
                      <p className="mt-2 mb-0">
                        <small className="text-muted">Department: {user.department}</small>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Empty Team State for Team Leaders/Managers */}
          {((hasRole('Team Leader') && !teamData) || (hasRole('Team Manager') && managedTeams.length === 0)) && (
            <div className="col-md-4">
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title mb-0">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    No Teams Assigned
                  </h5>
                </div>
                <div className="card-body text-center">
                  <i className="bi bi-people text-muted" style={{ fontSize: '3rem' }}></i>
                  <p className="text-muted mt-2 mb-0">
                    {hasRole('Team Leader') 
                      ? 'You are not assigned as a Team Leader for any team.'
                      : 'You are not assigned as a Team Manager for any teams.'
                    }
                  </p>
                  <small className="text-muted">
                    Please contact your administrator.
                  </small>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
