import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { userAPI, departmentAPI, teamAPI } from '../../utils/api';

const OrganizationChart = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedView, setSelectedView] = useState('flowchart');
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  
  // Data states
  const [organizationData, setOrganizationData] = useState({
    departments: [],
    teams: [],
    users: [],
    stats: {},
    growthData: [],
    hierarchyLevels: {}
  });

  useEffect(() => {
    fetchOrganizationData();
  }, []);

  const fetchOrganizationData = async () => {
    try {
      setLoading(true);
      setError('');

      const [departmentsRes, teamsRes, usersRes] = await Promise.all([
        departmentAPI.getAllDepartments({ limit: 100 }),
        teamAPI.getAllTeams({ limit: 100 }),
        userAPI.getAllUsers({ limit: 1000 })
      ]);

      const departments = departmentsRes.data.departments || [];
      const teams = teamsRes.data.teams || [];
      const users = usersRes.data.users || [];

      const stats = {
        totalEmployees: users.length,
        totalDepartments: departments.length,
        totalTeams: teams.length,
        activeEmployees: users.filter(u => u.isActive).length,
        managementRoles: users.filter(u => ['Admin', 'Vice President', 'HR BP', 'HR Manager', 'Team Manager', 'Team Leader'].includes(u.role)).length,
        avgTeamSize: teams.length > 0 ? Math.round(users.length / teams.length) : 0,
        departmentDistribution: calculateDepartmentDistribution(departments, users),
        roleDistribution: calculateRoleDistribution(users)
      };

      const growthData = generateGrowthData(users);
      const hierarchyLevels = calculateHierarchyLevels(users);

      setOrganizationData({
        departments,
        teams,
        users,
        stats,
        growthData,
        hierarchyLevels
      });

    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch organization data');
    } finally {
      setLoading(false);
    }
  };

  const calculateDepartmentDistribution = (departments, users) => {
    const distribution = {};
    departments.forEach(dept => {
      const deptUsers = users.filter(u => u.department === dept._id || u.department?._id === dept._id);
      distribution[dept.name] = deptUsers.length;
    });
    return distribution;
  };

  const calculateRoleDistribution = (users) => {
    const distribution = {};
    users.forEach(user => {
      distribution[user.role] = (distribution[user.role] || 0) + 1;
    });
    return distribution;
  };

  const generateGrowthData = (users) => {
    const monthlyData = {};
    const currentDate = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthlyData[monthKey] = 0;
    }

    users.forEach(user => {
      if (user.joiningDate) {
        const joinDate = new Date(user.joiningDate);
        const monthKey = joinDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        if (monthlyData.hasOwnProperty(monthKey)) {
          monthlyData[monthKey]++;
        }
      }
    });

    return Object.entries(monthlyData).map(([month, count]) => ({ month, count }));
  };

  const calculateHierarchyLevels = (users) => {
    const levels = {
      'C-Level': users.filter(u => ['Admin', 'Vice President'].includes(u.role)).length,
      'Senior Management': users.filter(u => ['HR BP', 'HR Manager'].includes(u.role)).length,
      'Middle Management': users.filter(u => ['Team Manager', 'HR Executive'].includes(u.role)).length,
      'Team Leadership': users.filter(u => u.role === 'Team Leader').length,
      'Individual Contributors': users.filter(u => u.role === 'Employee').length
    };
    return levels;
  };

  const renderGrowthChart = () => {
    const maxCount = Math.max(...organizationData.growthData.map(d => d.count), 1);
    
    return (
      <div className="card h-100">
        <div className="card-header bg-primary text-white">
          <h6 className="mb-0">
            <i className="bi bi-graph-up me-2"></i>
            Employee Growth Timeline
          </h6>
        </div>
        <div className="card-body">
          <div className="d-flex align-items-end justify-content-between" style={{ height: '200px' }}>
            {organizationData.growthData.map((data, index) => (
              <div key={index} className="d-flex flex-column align-items-center" style={{ flex: 1 }}>
                <div 
                  className="bg-primary rounded-top"
                  style={{ 
                    width: '20px',
                    height: `${(data.count / maxCount) * 150}px`,
                    minHeight: '5px',
                    marginBottom: '10px'
                  }}
                  title={`${data.month}: ${data.count} new hires`}
                ></div>
                <small className="text-muted" style={{ fontSize: '10px', transform: 'rotate(-45deg)' }}>
                  {data.month}
                </small>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderHierarchyPyramid = () => {
    const levels = organizationData.hierarchyLevels;
    const maxCount = Math.max(...Object.values(levels), 1);
    const colors = ['#dc3545', '#fd7e14', '#ffc107', '#20c997', '#0d6efd'];
    
    return (
      <div className="card h-100">
        <div className="card-header bg-info text-white">
          <h6 className="mb-0">
            <i className="bi bi-triangle me-2"></i>
            Organizational Hierarchy
          </h6>
        </div>
        <div className="card-body">
          <div className="d-flex flex-column align-items-center" style={{ height: '200px' }}>
            {Object.entries(levels).map(([level, count], index) => (
              <div key={level} className="mb-2 text-center" style={{ width: '100%' }}>
                <div 
                  className="mx-auto rounded"
                  style={{ 
                    width: `${(count / maxCount) * 100}%`,
                    minWidth: '20px',
                    height: '25px',
                    backgroundColor: colors[index],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                >
                  {count}
                </div>
                <small className="text-muted d-block mt-1" style={{ fontSize: '10px' }}>
                  {level}
                </small>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderDepartmentDonut = () => {
    const distribution = organizationData.stats.departmentDistribution || {};
    const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
    const colors = ['#0d6efd', '#6f42c1', '#d63384', '#dc3545', '#fd7e14', '#ffc107', '#20c997', '#0dcaf0'];
    
    let cumulativePercentage = 0;
    
    return (
      <div className="card h-100">
        <div className="card-header bg-success text-white">
          <h6 className="mb-0">
            <i className="bi bi-pie-chart me-2"></i>
            Department Distribution
          </h6>
        </div>
        <div className="card-body">
          <div className="d-flex justify-content-center mb-3">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#e9ecef" strokeWidth="20"/>
              {Object.entries(distribution).map(([dept, count], index) => {
                const percentage = (count / total) * 100;
                const strokeDasharray = `${percentage * 3.14} 314`;
                const strokeDashoffset = -cumulativePercentage * 3.14;
                cumulativePercentage += percentage;
                
                return (
                  <circle
                    key={dept}
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke={colors[index % colors.length]}
                    strokeWidth="20"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    transform="rotate(-90 60 60)"
                  />
                );
              })}
            </svg>
          </div>
          <div className="row">
            {Object.entries(distribution).map(([dept, count], index) => (
              <div key={dept} className="col-12 mb-1">
                <div className="d-flex align-items-center">
                  <div 
                    className="rounded me-2"
                    style={{ 
                      width: '12px', 
                      height: '12px', 
                      backgroundColor: colors[index % colors.length] 
                    }}
                  ></div>
                  <small className="text-muted flex-grow-1">{dept}</small>
                  <small className="fw-bold">{count}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderFlowChart = () => {
    const { departments, teams, users } = organizationData;
    
    return (
      <div className="row">
        {departments.map((dept, deptIndex) => {
          const deptTeams = teams.filter(team => team.department === dept._id || team.department?._id === dept._id);
          const deptHead = users.find(u => u._id === dept.headOfDepartment);
          
          return (
            <div key={dept._id} className="col-12 mb-4">
              <div className="card border-primary">
                <div className="card-header bg-primary text-white">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                      <div 
                        className="rounded-circle bg-white text-primary d-flex align-items-center justify-content-center me-3"
                        style={{ width: '40px', height: '40px', fontWeight: 'bold' }}
                      >
                        {dept.code}
                      </div>
                      <div>
                        <h5 className="mb-0">{dept.name}</h5>
                        <small className="opacity-75">{dept.description}</small>
                      </div>
                    </div>
                    <div className="text-end">
                      <div className="badge bg-light text-dark fs-6">
                        {users.filter(u => u.department === dept._id || u.department?._id === dept._id).length} Members
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="card-body">
                  {/* Department Head */}
                  {deptHead && (
                    <div className="text-center mb-4">
                      <div className="d-inline-block">
                        <div className="card border-warning" style={{ width: '200px' }}>
                          <div className="card-body p-3 text-center">
                            <div className="rounded-circle bg-warning text-white d-flex align-items-center justify-content-center mx-auto mb-2"
                                 style={{ width: '50px', height: '50px' }}>
                              <i className="bi bi-person-badge"></i>
                            </div>
                            <h6 className="mb-1">{deptHead.firstName} {deptHead.lastName}</h6>
                            <small className="text-muted">Department Head</small>
                          </div>
                        </div>
                      </div>
                      
                      {/* Connection Line */}
                      {deptTeams.length > 0 && (
                        <div className="d-flex justify-content-center my-3">
                          <div style={{ width: '2px', height: '30px', backgroundColor: '#dee2e6' }}></div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Teams */}
                  {deptTeams.length > 0 && (
                    <div className="row">
                      {deptTeams.map((team, teamIndex) => {
                        const teamManager = users.find(u => u._id === team.teamManager);
                        const teamLeader = users.find(u => u._id === team.teamLeader);
                        const teamMembers = users.filter(u => u.team === team._id || u.team?._id === team._id);
                        
                        return (
                          <div key={team._id} className="col-md-6 col-lg-4 mb-3">
                            <div className="card border-info h-100">
                              <div className="card-header bg-info text-white">
                                <div className="d-flex align-items-center">
                                  <i className="bi bi-people me-2"></i>
                                  <div>
                                    <h6 className="mb-0">{team.name}</h6>
                                    <small className="opacity-75">{team.code}</small>
                                  </div>
                                </div>
                              </div>
                              <div className="card-body p-3">
                                {/* Team Leadership */}
                                {(teamManager || teamLeader) && (
                                  <div className="mb-3">
                                    {teamManager && (
                                      <div className="d-flex align-items-center mb-2">
                                        <div className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center me-2"
                                             style={{ width: '30px', height: '30px', fontSize: '12px' }}>
                                          <i className="bi bi-person-gear"></i>
                                        </div>
                                        <div>
                                          <small className="fw-bold d-block">{teamManager.firstName} {teamManager.lastName}</small>
                                          <small className="text-muted">Manager</small>
                                        </div>
                                      </div>
                                    )}
                                    {teamLeader && teamLeader._id !== teamManager?._id && (
                                      <div className="d-flex align-items-center mb-2">
                                        <div className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center me-2"
                                             style={{ width: '30px', height: '30px', fontSize: '12px' }}>
                                          <i className="bi bi-person-check"></i>
                                        </div>
                                        <div>
                                          <small className="fw-bold d-block">{teamLeader.firstName} {teamLeader.lastName}</small>
                                          <small className="text-muted">Leader</small>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {/* Team Stats */}
                                <div className="d-flex justify-content-between align-items-center">
                                  <span className="badge bg-primary">
                                    {teamMembers.length} Members
                                  </span>
                                  <span className={`badge ${team.isActive ? 'bg-success' : 'bg-danger'}`}>
                                    {team.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* No Teams Message */}
                  {deptTeams.length === 0 && (
                    <div className="text-center text-muted py-3">
                      <i className="bi bi-people" style={{ fontSize: '2rem', opacity: 0.3 }}></i>
                      <p className="mb-0 mt-2">No teams in this department</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderNetworkView = () => {
    const { users } = organizationData;
    const roles = ['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader', 'Employee'];
    const roleColors = {
      'Admin': '#dc3545',
      'Vice President': '#fd7e14', 
      'HR BP': '#ffc107',
      'HR Manager': '#20c997',
      'HR Executive': '#0dcaf0',
      'Team Manager': '#6f42c1',
      'Team Leader': '#0d6efd',
      'Employee': '#6c757d'
    };

    return (
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">
            <i className="bi bi-diagram-3 me-2"></i>
            Network View - Role Connections
          </h5>
        </div>
        <div className="card-body">
          <div className="row">
            {roles.map(role => {
              const roleUsers = users.filter(u => u.role === role);
              if (roleUsers.length === 0) return null;
              
              return (
                <div key={role} className="col-md-6 col-lg-4 mb-3">
                  <div className="card border-0 shadow-sm">
                    <div className="card-body text-center">
                      <div 
                        className="rounded-circle text-white d-flex align-items-center justify-content-center mx-auto mb-3"
                        style={{ 
                          width: '60px', 
                          height: '60px', 
                          backgroundColor: roleColors[role],
                          fontSize: '24px'
                        }}
                      >
                        <i className="bi bi-person"></i>
                      </div>
                      <h6 className="mb-1">{role}</h6>
                      <div className="badge bg-secondary mb-2">{roleUsers.length} People</div>
                      <div className="mt-2">
                        {roleUsers.slice(0, 3).map(user => (
                          <small key={user._id} className="d-block text-muted">
                            {user.firstName} {user.lastName}
                          </small>
                        ))}
                        {roleUsers.length > 3 && (
                          <small className="text-muted">+{roleUsers.length - 3} more</small>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderAnalyticsView = () => {
    return (
      <div className="row">
        <div className="col-lg-4 mb-4">
          {renderGrowthChart()}
        </div>
        <div className="col-lg-4 mb-4">
          {renderHierarchyPyramid()}
        </div>
        <div className="col-lg-4 mb-4">
          {renderDepartmentDonut()}
        </div>
        
        {/* Additional Analytics Cards */}
        <div className="col-lg-6 mb-4">
          <div className="card h-100">
            <div className="card-header bg-warning text-white">
              <h6 className="mb-0">
                <i className="bi bi-speedometer2 me-2"></i>
                Key Performance Indicators
              </h6>
            </div>
            <div className="card-body">
              <div className="row text-center">
                <div className="col-6 mb-3">
                  <div className="border-end">
                    <h4 className="text-primary mb-1">
                      {organizationData.stats.totalEmployees > 0 ? 
                        Math.round((organizationData.stats.activeEmployees / organizationData.stats.totalEmployees) * 100) : 0}%
                    </h4>
                    <small className="text-muted">Active Rate</small>
                  </div>
                </div>
                <div className="col-6 mb-3">
                  <h4 className="text-success mb-1">{organizationData.stats.avgTeamSize}</h4>
                  <small className="text-muted">Avg Team Size</small>
                </div>
                <div className="col-6">
                  <div className="border-end">
                    <h4 className="text-info mb-1">
                      {organizationData.stats.totalDepartments > 0 ? 
                        Math.round(organizationData.stats.totalEmployees / organizationData.stats.totalDepartments) : 0}
                    </h4>
                    <small className="text-muted">Employees/Dept</small>
                  </div>
                </div>
                <div className="col-6">
                  <h4 className="text-warning mb-1">
                    {organizationData.stats.totalEmployees > 0 ? 
                      Math.round((organizationData.stats.managementRoles / organizationData.stats.totalEmployees) * 100) : 0}%
                  </h4>
                  <small className="text-muted">Management Ratio</small>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-lg-6 mb-4">
          <div className="card h-100">
            <div className="card-header bg-dark text-white">
              <h6 className="mb-0">
                <i className="bi bi-graph-down me-2"></i>
                Role Distribution Analysis
              </h6>
            </div>
            <div className="card-body">
              {Object.entries(organizationData.stats.roleDistribution || {}).map(([role, count]) => {
                const percentage = organizationData.stats.totalEmployees > 0 ? 
                  (count / organizationData.stats.totalEmployees) * 100 : 0;
                
                return (
                  <div key={role} className="mb-2">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <small className="text-muted">{role}</small>
                      <small className="fw-bold">{count} ({percentage.toFixed(1)}%)</small>
                    </div>
                    <div className="progress" style={{ height: '6px' }}>
                      <div 
                        className="progress-bar bg-primary" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted">Loading organization chart...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">
            <i className="bi bi-diagram-2 me-2 text-primary"></i>
            Organization Chart
          </h2>
          <p className="text-muted">Interactive visualization of company structure and analytics</p>
        </div>
        <div className="d-flex gap-2">
          <button 
            className="btn btn-outline-primary"
            onClick={fetchOrganizationData}
            disabled={loading}
          >
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="row mb-4">
        <div className="col-lg-2 col-md-4 col-sm-6 mb-3">
          <div className="card bg-gradient text-white h-100" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <div className="card-body text-center">
              <i className="bi bi-people" style={{ fontSize: '2.5rem' }}></i>
              <h3 className="mt-2 mb-1">{organizationData.stats.totalEmployees}</h3>
              <small>Total Employees</small>
            </div>
          </div>
        </div>
        <div className="col-lg-2 col-md-4 col-sm-6 mb-3">
          <div className="card bg-gradient text-white h-100" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            <div className="card-body text-center">
              <i className="bi bi-person-check" style={{ fontSize: '2.5rem' }}></i>
              <h3 className="mt-2 mb-1">{organizationData.stats.activeEmployees}</h3>
              <small>Active Employees</small>
            </div>
          </div>
        </div>
        <div className="col-lg-2 col-md-4 col-sm-6 mb-3">
          <div className="card bg-gradient text-white h-100" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <div className="card-body text-center">
              <i className="bi bi-building" style={{ fontSize: '2.5rem' }}></i>
              <h3 className="mt-2 mb-1">{organizationData.stats.totalDepartments}</h3>
              <small>Departments</small>
            </div>
          </div>
        </div>
        <div className="col-lg-2 col-md-4 col-sm-6 mb-3">
          <div className="card bg-gradient text-white h-100" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
            <div className="card-body text-center">
              <i className="bi bi-diagram-3" style={{ fontSize: '2.5rem' }}></i>
              <h3 className="mt-2 mb-1">{organizationData.stats.totalTeams}</h3>
              <small>Teams</small>
            </div>
          </div>
        </div>
        <div className="col-lg-2 col-md-4 col-sm-6 mb-3">
          <div className="card bg-gradient text-white h-100" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
            <div className="card-body text-center">
              <i className="bi bi-person-badge" style={{ fontSize: '2.5rem' }}></i>
              <h3 className="mt-2 mb-1">{organizationData.stats.managementRoles}</h3>
              <small>Management</small>
            </div>
          </div>
        </div>
        <div className="col-lg-2 col-md-4 col-sm-6 mb-3">
          <div className="card bg-gradient text-white h-100" style={{ background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' }}>
            <div className="card-body text-center">
              <i className="bi bi-graph-up" style={{ fontSize: '2.5rem' }}></i>
              <h3 className="mt-2 mb-1">
                {organizationData.stats.totalEmployees > 0 ? 
                  Math.round((organizationData.stats.activeEmployees / organizationData.stats.totalEmployees) * 100) : 0}%
              </h3>
              <small>Active Rate</small>
            </div>
          </div>
        </div>
      </div>

      {/* View Controls */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-md-6">
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search employees, departments, or teams..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button 
                    className="btn btn-outline-secondary"
                    onClick={() => setSearchTerm('')}
                  >
                    <i className="bi bi-x"></i>
                  </button>
                )}
              </div>
            </div>
            <div className="col-md-6 text-end mt-2 mt-md-0">
              <div className="btn-group" role="group">
                <button
                  className={`btn ${selectedView === 'flowchart' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setSelectedView('flowchart')}
                >
                  <i className="bi bi-diagram-2 me-1"></i>
                  Flow Chart
                </button>
                <button
                  className={`btn ${selectedView === 'network' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setSelectedView('network')}
                >
                  <i className="bi bi-diagram-3 me-1"></i>
                  Network
                </button>
                <button
                  className={`btn ${selectedView === 'analytics' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setSelectedView('analytics')}
                >
                  <i className="bi bi-graph-up me-1"></i>
                  Analytics
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
          <button 
            type="button" 
            className="btn-close" 
            onClick={() => setError('')}
          ></button>
        </div>
      )}

      {/* Organization Chart Content */}
      <div className="row">
        <div className="col-12">
          {selectedView === 'flowchart' && renderFlowChart()}
          {selectedView === 'network' && renderNetworkView()}
          {selectedView === 'analytics' && renderAnalyticsView()}
        </div>
      </div>

      {/* Empty State */}
      {!loading && organizationData.departments.length === 0 && (
        <div className="text-center py-5">
          <i className="bi bi-building text-muted" style={{ fontSize: '4rem', opacity: 0.3 }}></i>
          <h4 className="text-muted mt-3">No Organization Data</h4>
          <p className="text-muted">
            No departments or employees found. Start by creating departments and adding employees.
          </p>
          <div className="mt-3">
            <button 
              className="btn btn-primary me-2"
              onClick={() => window.location.href = '/admin/departments'}
            >
              <i className="bi bi-building me-1"></i>
              Manage Departments
            </button>
            <button 
              className="btn btn-outline-primary"
              onClick={() => window.location.href = '/admin/users'}
            >
              <i className="bi bi-people me-1"></i>
              Manage Users
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationChart;
