import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { userAPI, departmentAPI, teamAPI } from '../../utils/api';

const OrganizationChart = () => {
  const { user } = useAuth();
  const svgRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedView, setSelectedView] = useState('flowchart');
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [selectedNode, setSelectedNode] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  
  // Data states
  const [organizationData, setOrganizationData] = useState({
    departments: [],
    teams: [],
    users: [],
    stats: {},
    hierarchyTree: null,
    networkNodes: [],
    networkLinks: []
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

      const stats = calculateStats(departments, teams, users);
      const hierarchyTree = buildHierarchyTree(users, departments, teams);
      const { networkNodes, networkLinks } = buildNetworkData(users, departments, teams);

      setOrganizationData({
        departments,
        teams,
        users,
        stats,
        hierarchyTree,
        networkNodes,
        networkLinks
      });

    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch organization data');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (departments, teams, users) => {
    return {
      totalEmployees: users.length,
      totalDepartments: departments.length,
      totalTeams: teams.length,
      activeEmployees: users.filter(u => u.isActive).length,
      managementRoles: users.filter(u => ['Admin', 'Vice President', 'HR BP', 'HR Manager', 'Team Manager', 'Team Leader'].includes(u.role)).length,
      avgTeamSize: teams.length > 0 ? Math.round(users.length / teams.length) : 0,
      departmentDistribution: calculateDepartmentDistribution(departments, users),
      roleDistribution: calculateRoleDistribution(users)
    };
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

  const buildHierarchyTree = (users, departments, teams) => {
    // Create a map of users by ID for quick lookup
    const userMap = new Map(users.map(user => [user._id, user]));
    const departmentMap = new Map(departments.map(dept => [dept._id, dept]));
    
    // Find root nodes (users without reporting managers or top-level roles)
    const rootUsers = users.filter(user => 
      !user.reportingManager || 
      ['Admin', 'Vice President'].includes(user.role)
    );

    // Build tree structure
    const buildNode = (user, level = 0) => {
      const department = user.department ? departmentMap.get(user.department._id || user.department) : null;
      const directReports = users.filter(u => u.reportingManager === user._id);
      
      return {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
        department: department?.name || 'Unassigned',
        departmentCode: department?.code || 'N/A',
        employeeId: user.employeeId,
        email: user.email,
        isActive: user.isActive,
        level: level,
        children: directReports.map(report => buildNode(report, level + 1)),
        x: 0,
        y: 0,
        expanded: expandedNodes.has(user._id)
      };
    };

    return rootUsers.map(user => buildNode(user));
  };

  const buildNetworkData = (users, departments, teams) => {
    const nodes = [];
    const links = [];
    
    // Role hierarchy and colors
    const roleHierarchy = {
      'Admin': { level: 1, color: '#dc3545', size: 60 },
      'Vice President': { level: 2, color: '#fd7e14', size: 55 },
      'HR BP': { level: 3, color: '#ffc107', size: 50 },
      'HR Manager': { level: 4, color: '#20c997', size: 45 },
      'HR Executive': { level: 5, color: '#0dcaf0', size: 40 },
      'Team Manager': { level: 6, color: '#6f42c1', size: 40 },
      'Team Leader': { level: 7, color: '#0d6efd', size: 35 },
      'Employee': { level: 8, color: '#6c757d', size: 30 }
    };

    // Create nodes for users
    users.forEach(user => {
      const roleInfo = roleHierarchy[user.role] || roleHierarchy['Employee'];
      nodes.push({
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
        department: user.department?.name || 'Unassigned',
        level: roleInfo.level,
        color: roleInfo.color,
        size: roleInfo.size,
        type: 'user',
        x: Math.random() * 800,
        y: Math.random() * 600
      });
    });

    // Create links for reporting relationships
    users.forEach(user => {
      if (user.reportingManager) {
        links.push({
          source: user.reportingManager,
          target: user._id,
          type: 'reports_to'
        });
      }
    });

    return { networkNodes: nodes, networkLinks: links };
  };

  const toggleNodeExpansion = (nodeId) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const renderHierarchicalFlowChart = () => {
    if (!organizationData.hierarchyTree || organizationData.hierarchyTree.length === 0) {
      return (
        <div className="text-center py-5">
          <i className="bi bi-diagram-2 text-muted" style={{ fontSize: '4rem', opacity: 0.3 }}></i>
          <h4 className="text-muted mt-3">No Hierarchy Data</h4>
          <p className="text-muted">No organizational hierarchy found.</p>
        </div>
      );
    }

    const renderNode = (node, index = 0) => {
      const hasChildren = node.children && node.children.length > 0;
      const isExpanded = expandedNodes.has(node.id);
      
      return (
        <div key={node.id} className="hierarchy-node" style={{ marginLeft: node.level * 40 }}>
          {/* Node Card */}
          <div className={`card mb-3 shadow-sm border-start border-4 ${getNodeBorderColor(node.role)}`}>
            <div className="card-body p-3">
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center">
                  {/* Role Icon */}
                  <div 
                    className={`rounded-circle text-white d-flex align-items-center justify-content-center me-3 ${getRoleBackgroundClass(node.role)}`}
                    style={{ width: '50px', height: '50px', fontSize: '18px' }}
                  >
                    {getRoleIcon(node.role)}
                  </div>
                  
                  {/* User Info */}
                  <div>
                    <h6 className="mb-1 fw-bold text-dark">{node.name}</h6>
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <span className={`badge ${getRoleBadgeClass(node.role)}`}>
                        {node.role}
                      </span>
                      <small className="text-muted">#{node.employeeId}</small>
                    </div>
                    <small className="text-muted">
                      <i className="bi bi-building me-1"></i>
                      {node.department}
                    </small>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="d-flex align-items-center gap-2">
                  <span className={`badge ${node.isActive ? 'bg-success' : 'bg-danger'}`}>
                    {node.isActive ? 'Active' : 'Inactive'}
                  </span>
                  
                  {hasChildren && (
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => toggleNodeExpansion(node.id)}
                    >
                      <i className={`bi bi-chevron-${isExpanded ? 'up' : 'down'}`}></i>
                      <span className="ms-1">{node.children.length}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Connection Line */}
          {hasChildren && isExpanded && (
            <div className="ms-4 mb-3">
              <div className="border-start border-2 border-secondary ps-3">
                {node.children.map((child, childIndex) => renderNode(child, childIndex))}
              </div>
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="hierarchy-container">
        <div className="row">
          <div className="col-12">
            {organizationData.hierarchyTree.map((rootNode, index) => renderNode(rootNode, index))}
          </div>
        </div>
      </div>
    );
  };

  const renderInteractiveNetwork = () => {
    const { networkNodes, networkLinks } = organizationData;
    
    if (!networkNodes || networkNodes.length === 0) {
      return (
        <div className="text-center py-5">
          <i className="bi bi-diagram-3 text-muted" style={{ fontSize: '4rem', opacity: 0.3 }}></i>
          <h4 className="text-muted mt-3">No Network Data</h4>
          <p className="text-muted">No network relationships found.</p>
        </div>
      );
    }

    // Group nodes by role for better visualization
    const nodesByRole = networkNodes.reduce((acc, node) => {
      if (!acc[node.role]) acc[node.role] = [];
      acc[node.role].push(node);
      return acc;
    }, {});

    return (
      <div className="network-container">
        <div className="card">
          <div className="card-header bg-primary text-white">
            <h5 className="mb-0">
              <i className="bi bi-diagram-3 me-2"></i>
              Interactive Network View
            </h5>
          </div>
          <div className="card-body p-0">
            {/* Network Controls */}
            <div className="p-3 border-bottom bg-light">
              <div className="row align-items-center">
                <div className="col-md-6">
                  <div className="btn-group btn-group-sm" role="group">
                    <button 
                      className="btn btn-outline-primary"
                      onClick={() => setZoomLevel(prev => Math.min(prev + 0.2, 3))}
                    >
                      <i className="bi bi-zoom-in"></i>
                    </button>
                    <button 
                      className="btn btn-outline-primary"
                      onClick={() => setZoomLevel(1)}
                    >
                      Reset
                    </button>
                    <button 
                      className="btn btn-outline-primary"
                      onClick={() => setZoomLevel(prev => Math.max(prev - 0.2, 0.5))}
                    >
                      <i className="bi bi-zoom-out"></i>
                    </button>
                  </div>
                </div>
                <div className="col-md-6 text-end">
                  <small className="text-muted">
                    {networkNodes.length} nodes, {networkLinks.length} connections
                  </small>
                </div>
              </div>
            </div>
            
            {/* Network Visualization */}
            <div className="position-relative" style={{ height: '600px', overflow: 'hidden' }}>
              <svg
                ref={svgRef}
                width="100%"
                height="100%"
                style={{ transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)` }}
              >
                {/* Links */}
                <g className="links">
                  {networkLinks.map((link, index) => {
                    const sourceNode = networkNodes.find(n => n.id === link.source);
                    const targetNode = networkNodes.find(n => n.id === link.target);
                    if (!sourceNode || !targetNode) return null;
                    
                    return (
                      <line
                        key={index}
                        x1={sourceNode.x}
                        y1={sourceNode.y}
                        x2={targetNode.x}
                        y2={targetNode.y}
                        stroke="#dee2e6"
                        strokeWidth="2"
                        markerEnd="url(#arrowhead)"
                      />
                    );
                  })}
                </g>
                
                {/* Nodes */}
                <g className="nodes">
                  {networkNodes.map((node) => (
                    <g key={node.id} className="node-group">
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={node.size / 2}
                        fill={node.color}
                        stroke="#fff"
                        strokeWidth="3"
                        className="node-circle"
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedNode(node)}
                      />
                      <text
                        x={node.x}
                        y={node.y + node.size / 2 + 15}
                        textAnchor="middle"
                        fontSize="12"
                        fill="#333"
                        className="node-label"
                      >
                        {node.name.split(' ')[0]}
                      </text>
                    </g>
                  ))}
                </g>
                
                {/* Arrow marker definition */}
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon
                      points="0 0, 10 3.5, 0 7"
                      fill="#dee2e6"
                    />
                  </marker>
                </defs>
              </svg>
              
              {/* Node Details Panel */}
              {selectedNode && (
                <div 
                  className="position-absolute bg-white border rounded shadow p-3"
                  style={{ 
                    top: '20px', 
                    right: '20px', 
                    width: '300px',
                    zIndex: 1000
                  }}
                >
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h6 className="mb-0">{selectedNode.name}</h6>
                    <button 
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => setSelectedNode(null)}
                    >
                      <i className="bi bi-x"></i>
                    </button>
                  </div>
                  <div className="mb-2">
                    <span className={`badge ${getRoleBadgeClass(selectedNode.role)}`}>
                      {selectedNode.role}
                    </span>
                  </div>
                  <p className="small text-muted mb-0">
                    <i className="bi bi-building me-1"></i>
                    {selectedNode.department}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Role Legend */}
        <div className="card mt-4">
          <div className="card-header">
            <h6 className="mb-0">Role Legend</h6>
          </div>
          <div className="card-body">
            <div className="row">
              {Object.entries(nodesByRole).map(([role, nodes]) => (
                <div key={role} className="col-md-3 col-sm-6 mb-2">
                  <div className="d-flex align-items-center">
                    <div 
                      className="rounded-circle me-2"
                      style={{ 
                        width: '20px', 
                        height: '20px', 
                        backgroundColor: nodes[0]?.color || '#6c757d' 
                      }}
                    ></div>
                    <div>
                      <small className="fw-bold d-block">{role}</small>
                      <small className="text-muted">{nodes.length} people</small>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAnalyticsView = () => {
    return (
      <div className="analytics-container">
        <div className="row">
          {/* Department Distribution Chart */}
          <div className="col-lg-6 mb-4">
            <div className="card h-100">
              <div className="card-header bg-success text-white">
                <h6 className="mb-0">
                  <i className="bi bi-pie-chart me-2"></i>
                  Department Distribution
                </h6>
              </div>
              <div className="card-body">
                {renderDepartmentChart()}
              </div>
            </div>
          </div>
          
          {/* Role Hierarchy */}
          <div className="col-lg-6 mb-4">
            <div className="card h-100">
              <div className="card-header bg-info text-white">
                <h6 className="mb-0">
                  <i className="bi bi-triangle me-2"></i>
                  Role Hierarchy
                </h6>
              </div>
              <div className="card-body">
                {renderRoleHierarchy()}
              </div>
            </div>
          </div>
          
          {/* Key Metrics */}
          <div className="col-12">
            <div className="card">
              <div className="card-header bg-warning text-white">
                <h6 className="mb-0">
                  <i className="bi bi-speedometer2 me-2"></i>
                  Key Performance Indicators
                </h6>
              </div>
              <div className="card-body">
                <div className="row text-center">
                  <div className="col-md-3 mb-3">
                    <h4 className="text-primary mb-1">
                      {organizationData.stats.totalEmployees > 0 ? 
                        Math.round((organizationData.stats.activeEmployees / organizationData.stats.totalEmployees) * 100) : 0}%
                    </h4>
                    <small className="text-muted">Employee Active Rate</small>
                  </div>
                  <div className="col-md-3 mb-3">
                    <h4 className="text-success mb-1">{organizationData.stats.avgTeamSize}</h4>
                    <small className="text-muted">Average Team Size</small>
                  </div>
                  <div className="col-md-3 mb-3">
                    <h4 className="text-info mb-1">
                      {organizationData.stats.totalDepartments > 0 ? 
                        Math.round(organizationData.stats.totalEmployees / organizationData.stats.totalDepartments) : 0}
                    </h4>
                    <small className="text-muted">Employees per Department</small>
                  </div>
                  <div className="col-md-3 mb-3">
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
        </div>
      </div>
    );
  };

  const renderDepartmentChart = () => {
    const distribution = organizationData.stats.departmentDistribution || {};
    const colors = ['#0d6efd', '#6f42c1', '#d63384', '#dc3545', '#fd7e14', '#ffc107', '#20c997', '#0dcaf0'];
    
    return (
      <div>
        {Object.entries(distribution).map(([dept, count], index) => {
          const percentage = organizationData.stats.totalEmployees > 0 ? 
            (count / organizationData.stats.totalEmployees) * 100 : 0;
          
          return (
            <div key={dept} className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <small className="fw-bold">{dept}</small>
                <small className="text-muted">{count} ({percentage.toFixed(1)}%)</small>
              </div>
              <div className="progress" style={{ height: '8px' }}>
                <div 
                  className="progress-bar" 
                  style={{ 
                    width: `${percentage}%`,
                    backgroundColor: colors[index % colors.length]
                  }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderRoleHierarchy = () => {
    const roleOrder = ['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader', 'Employee'];
    const colors = ['#dc3545', '#fd7e14', '#ffc107', '#20c997', '#0dcaf0', '#6f42c1', '#0d6efd', '#6c757d'];
    
    return (
      <div>
        {roleOrder.map((role, index) => {
          const count = organizationData.stats.roleDistribution[role] || 0;
          const maxCount = Math.max(...Object.values(organizationData.stats.roleDistribution || {}), 1);
          const width = (count / maxCount) * 100;
          
          return (
            <div key={role} className="mb-3">
              <div className="d-flex align-items-center mb-2">
                <div 
                  className="rounded me-2"
                  style={{ 
                    width: `${Math.max(width, 10)}%`,
                    height: '30px',
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
                <small className="text-muted ms-2">{role}</small>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Helper functions for styling
  const getRoleIcon = (role) => {
    const icons = {
      'Admin': <i className="bi bi-shield-check"></i>,
      'Vice President': <i className="bi bi-person-badge"></i>,
      'HR BP': <i className="bi bi-person-gear"></i>,
      'HR Manager': <i className="bi bi-people"></i>,
      'HR Executive': <i className="bi bi-person-check"></i>,
      'Team Manager': <i className="bi bi-diagram-3"></i>,
      'Team Leader': <i className="bi bi-person-lines-fill"></i>,
      'Employee': <i className="bi bi-person"></i>
    };
    return icons[role] || icons['Employee'];
  };

  const getRoleBackgroundClass = (role) => {
    const classes = {
      'Admin': 'bg-danger',
      'Vice President': 'bg-warning',
      'HR BP': 'bg-info',
      'HR Manager': 'bg-success',
      'HR Executive': 'bg-primary',
      'Team Manager': 'bg-secondary',
      'Team Leader': 'bg-dark',
      'Employee': 'bg-muted'
    };
    return classes[role] || classes['Employee'];
  };

  const getRoleBadgeClass = (role) => {
    const classes = {
      'Admin': 'bg-danger',
      'Vice President': 'bg-warning text-dark',
      'HR BP': 'bg-info text-dark',
      'HR Manager': 'bg-success',
      'HR Executive': 'bg-primary',
      'Team Manager': 'bg-secondary',
      'Team Leader': 'bg-dark',
      'Employee': 'bg-light text-dark'
    };
    return classes[role] || classes['Employee'];
  };

  const getNodeBorderColor = (role) => {
    const colors = {
      'Admin': 'border-danger',
      'Vice President': 'border-warning',
      'HR BP': 'border-info',
      'HR Manager': 'border-success',
      'HR Executive': 'border-primary',
      'Team Manager': 'border-secondary',
      'Team Leader': 'border-dark',
      'Employee': 'border-light'
    };
    return colors[role] || colors['Employee'];
  };

  // Filter data based on search term
  const filteredData = searchTerm ? {
    ...organizationData,
    hierarchyTree: organizationData.hierarchyTree?.filter(node => 
      node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.department.toLowerCase().includes(searchTerm.toLowerCase())
    )
  } : organizationData;

  if (loading) {
    return (
      <div className="container-fluid p-4">
        <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-muted">Loading organization chart...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Enhanced Page Header - Always visible at top */}
      <div className="container-fluid text-white mb-4" style={{ 
        backgroundColor: '#667eea',
        padding: '2rem 1rem'
      }}>
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h1 className="mb-2 fw-bold text-white">
              <i className="bi bi-diagram-2 me-2"></i>
              Organization Chart
            </h1>
            <p className="mb-0 opacity-75 fs-5">Interactive visualization of company structure and analytics</p>
          </div>
          <div className="d-flex gap-2">
            <button 
              className="btn btn-light btn-lg"
              onClick={fetchOrganizationData}
              disabled={loading}
            >
              <i className="bi bi-arrow-clockwise me-1"></i>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Statistics Cards - Always visible */}
      <div className="container-fluid px-4 mb-4">
        <div className="row g-3">
          <div className="col-lg-2 col-md-4 col-sm-6">
            <div className="card text-white h-100 shadow-lg" style={{ 
              backgroundColor: '#667eea',
              minHeight: '140px'
            }}>
              <div className="card-body text-center d-flex flex-column justify-content-center">
                <i className="bi bi-people mb-2" style={{ fontSize: '3rem' }}></i>
                <h3 className="mb-1 fw-bold">{organizationData.stats.totalEmployees}</h3>
                <small className="fw-semibold">Total Employees</small>
              </div>
            </div>
          </div>
          <div className="col-lg-2 col-md-4 col-sm-6">
            <div className="card text-white h-100 shadow-lg" style={{ 
              backgroundColor: '#f093fb',
              minHeight: '140px'
            }}>
              <div className="card-body text-center d-flex flex-column justify-content-center">
                <i className="bi bi-person-check mb-2" style={{ fontSize: '3rem' }}></i>
                <h3 className="mb-1 fw-bold">{organizationData.stats.activeEmployees}</h3>
                <small className="fw-semibold">Active Employees</small>
              </div>
            </div>
          </div>
          <div className="col-lg-2 col-md-4 col-sm-6">
            <div className="card text-white h-100 shadow-lg" style={{ 
              backgroundColor: '#4facfe',
              minHeight: '140px'
            }}>
              <div className="card-body text-center d-flex flex-column justify-content-center">
                <i className="bi bi-building mb-2" style={{ fontSize: '3rem' }}></i>
                <h3 className="mb-1 fw-bold">{organizationData.stats.totalDepartments}</h3>
                <small className="fw-semibold">Departments</small>
              </div>
            </div>
          </div>
          <div className="col-lg-2 col-md-4 col-sm-6">
            <div className="card text-white h-100 shadow-lg" style={{ 
              backgroundColor: '#43e97b',
              minHeight: '140px'
            }}>
              <div className="card-body text-center d-flex flex-column justify-content-center">
                <i className="bi bi-diagram-3 mb-2" style={{ fontSize: '3rem' }}></i>
                <h3 className="mb-1 fw-bold">{organizationData.stats.totalTeams}</h3>
                <small className="fw-semibold">Teams</small>
              </div>
            </div>
          </div>
          <div className="col-lg-2 col-md-4 col-sm-6">
            <div className="card text-white h-100 shadow-lg" style={{ 
              backgroundColor: '#fa709a',
              minHeight: '140px'
            }}>
              <div className="card-body text-center d-flex flex-column justify-content-center">
                <i className="bi bi-person-badge mb-2" style={{ fontSize: '3rem' }}></i>
                <h3 className="mb-1 fw-bold">{organizationData.stats.managementRoles}</h3>
                <small className="fw-semibold">Management</small>
              </div>
            </div>
          </div>
          <div className="col-lg-2 col-md-4 col-sm-6">
            <div className="card text-white h-100 shadow-lg" style={{ 
              backgroundColor: '#a8edea',
              minHeight: '140px'
            }}>
              <div className="card-body text-center d-flex flex-column justify-content-center">
                <i className="bi bi-graph-up mb-2" style={{ fontSize: '3rem' }}></i>
                <h3 className="mb-1 fw-bold">
                  {organizationData.stats.totalEmployees > 0 ? 
                    Math.round((organizationData.stats.activeEmployees / organizationData.stats.totalEmployees) * 100) : 0}%
                </h3>
                <small className="fw-semibold">Active Rate</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="container-fluid px-4">
        {/* Enhanced View Controls */}
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
            {selectedView === 'flowchart' && renderHierarchicalFlowChart()}
            {selectedView === 'network' && renderInteractiveNetwork()}
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
    </>
  );
};

export default OrganizationChart;
