import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { userAPI, departmentAPI, teamAPI } from '../../utils/api';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Grid,
  Alert,
  CircularProgress,
  TextField,
  InputAdornment,
  IconButton,
  Container,
  Chip,
  Avatar,
  Paper,
  LinearProgress,
  Divider,
  Collapse,
  ButtonGroup,
  Tooltip,
} from '@mui/material';
import {
  Search,
  Clear,
  Refresh,
  ExpandMore,
  ExpandLess,
  AccountTree,
  Hub,
  Analytics,
  People,
  Business,
  Groups,
  PersonAdd,
  TrendingUp,
  Close,
  ZoomIn,
  ZoomOut,
  RestartAlt,
} from '@mui/icons-material';

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

  // Auto-expand first level by default to show more content
  useEffect(() => {
    if (organizationData.hierarchyTree && organizationData.hierarchyTree.length > 0) {
      const firstLevelNodes = new Set();
      organizationData.hierarchyTree.forEach(rootNode => {
        firstLevelNodes.add(rootNode.id);
        // Also expand first level children
        if (rootNode.children && rootNode.children.length > 0) {
          rootNode.children.forEach(child => {
            firstLevelNodes.add(child.id);
          });
        }
      });
      setExpandedNodes(firstLevelNodes);
    }
  }, [organizationData.hierarchyTree]);

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
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <AccountTree sx={{ fontSize: '4rem', color: 'text.disabled', mb: 2, opacity: 0.3 }} />
          <Typography variant="h4" sx={{ color: 'text.secondary', mb: 1 }}>
            No Hierarchy Data
          </Typography>
          <Typography variant="body1" color="text.secondary">
            No organizational hierarchy found.
          </Typography>
        </Box>
      );
    }

    const renderNode = (node, index = 0) => {
      const hasChildren = node.children && node.children.length > 0;
      const isExpanded = expandedNodes.has(node.id);
      
      return (
        <Box key={node.id} sx={{ ml: node.level * 3, mb: 1.5 }}>
          {/* Compact Node Card */}
          <Card
            sx={{
              borderRadius: 1,
              boxShadow: 1,
              borderLeft: `3px solid ${getRoleColor(node.role)}`,
              '&:hover': {
                boxShadow: 2,
                transform: 'translateY(-1px)',
              },
              transition: 'all 0.2s ease-in-out',
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  {/* Compact Avatar */}
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      mr: 1.5,
                      bgcolor: getRoleColor(node.role),
                      fontSize: '0.9rem',
                    }}
                  >
                    {node.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </Avatar>
                  
                  {/* User Info - More Compact */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.25, lineHeight: 1.2 }}>
                      {node.name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                      <Chip
                        label={node.role}
                        size="small"
                        sx={{
                          bgcolor: getRoleColor(node.role),
                          color: 'white',
                          fontWeight: 500,
                          fontSize: '0.7rem',
                          height: 20,
                        }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                        #{node.employeeId}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', fontSize: '0.7rem' }}>
                      <Business sx={{ fontSize: '0.8rem', mr: 0.5 }} />
                      {node.department}
                    </Typography>
                  </Box>
                </Box>
                
                {/* Compact Actions */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 1 }}>
                  <Chip
                    label={node.isActive ? 'Active' : 'Inactive'}
                    size="small"
                    color={node.isActive ? 'success' : 'error'}
                    variant="outlined"
                    sx={{ fontSize: '0.65rem', height: 20 }}
                  />
                  
                  {hasChildren && (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => toggleNodeExpansion(node.id)}
                      startIcon={isExpanded ? <ExpandLess /> : <ExpandMore />}
                      sx={{
                        minWidth: 'auto',
                        borderColor: '#20C997',
                        color: '#20C997',
                        fontSize: '0.7rem',
                        height: 24,
                        px: 1,
                        '&:hover': {
                          borderColor: '#17A085',
                          backgroundColor: 'rgba(32, 201, 151, 0.04)',
                        },
                      }}
                    >
                      {node.children.length}
                    </Button>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
          
          {/* Connection Line and Children */}
          {hasChildren && isExpanded && (
            <Box sx={{ ml: 2, mt: 1 }}>
              <Box
                sx={{
                  borderLeft: '2px solid',
                  borderColor: 'divider',
                  pl: 2,
                }}
              >
                {node.children.map((child, childIndex) => renderNode(child, childIndex))}
              </Box>
            </Box>
          )}
        </Box>
      );
    };

    return (
      <Box>
        {organizationData.hierarchyTree.map((rootNode, index) => renderNode(rootNode, index))}
      </Box>
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

  const getRoleMUIIcon = (role) => {
    const iconMap = {
      'Admin': '🛡️',
      'Vice President': '👑',
      'HR BP': '⚙️',
      'HR Manager': '👥',
      'HR Executive': '✅',
      'Team Manager': '📊',
      'Team Leader': '👤',
      'Employee': '👨‍💼'
    };
    return iconMap[role] || iconMap['Employee'];
  };

  const getRoleColor = (role) => {
    const colors = {
      'Admin': '#dc3545',
      'Vice President': '#fd7e14',
      'HR BP': '#0dcaf0',
      'HR Manager': '#20c997',
      'HR Executive': '#0d6efd',
      'Team Manager': '#6f42c1',
      'Team Leader': '#495057',
      'Employee': '#6c757d'
    };
    return colors[role] || colors['Employee'];
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
      <Container maxWidth={false} sx={{ py: 4 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '400px',
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={60} sx={{ color: '#20C997', mb: 3 }} />
            <Typography variant="body1" color="text.secondary">
              Loading organization chart...
            </Typography>
          </Box>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth={false} sx={{ py: 3 }}>
      {/* Page Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 3,
          p: 4,
          mb: 4,
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center' }}>
              <AccountTree sx={{ mr: 2, fontSize: '2.5rem' }} />
              Organization Chart
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              Interactive visualization of company structure and analytics
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="large"
            onClick={fetchOrganizationData}
            disabled={loading}
            startIcon={<Refresh />}
            sx={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.3)',
              },
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.3)',
            }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Statistics Cards - Compact Design */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4} md={2}>
          <Card sx={{ bgcolor: '#1976d2', color: 'white', borderRadius: 1 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <People sx={{ fontSize: '1.5rem', mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {organizationData.stats.totalEmployees}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                Total Employees
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card sx={{ bgcolor: '#388e3c', color: 'white', borderRadius: 1 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PersonAdd sx={{ fontSize: '1.5rem', mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {organizationData.stats.activeEmployees}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                Active
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card sx={{ bgcolor: '#f57c00', color: 'white', borderRadius: 1 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Business sx={{ fontSize: '1.5rem', mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {organizationData.stats.totalDepartments}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                Departments
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card sx={{ bgcolor: '#7b1fa2', color: 'white', borderRadius: 1 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Groups sx={{ fontSize: '1.5rem', mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {organizationData.stats.totalTeams}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                Teams
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card sx={{ bgcolor: '#d32f2f', color: 'white', borderRadius: 1 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <People sx={{ fontSize: '1.5rem', mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {organizationData.stats.managementRoles}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                Management
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card sx={{ bgcolor: '#00796b', color: 'white', borderRadius: 1 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUp sx={{ fontSize: '1.5rem', mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {organizationData.stats.totalEmployees > 0 ? 
                    Math.round((organizationData.stats.activeEmployees / organizationData.stats.totalEmployees) * 100) : 0}%
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                Active Rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* View Controls */}
      <Card sx={{ mb: 4, borderRadius: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Search employees, departments, or teams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm && (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setSearchTerm('')} size="small">
                        <Clear />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ borderRadius: 2 }}
              />
            </Grid>
            <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: { xs: 'center', md: 'flex-end' } }}>
              <ButtonGroup variant="outlined" size="large">
                <Button
                  variant={selectedView === 'flowchart' ? 'contained' : 'outlined'}
                  onClick={() => setSelectedView('flowchart')}
                  startIcon={<AccountTree />}
                  sx={{
                    backgroundColor: selectedView === 'flowchart' ? '#20C997' : 'transparent',
                    borderColor: '#20C997',
                    color: selectedView === 'flowchart' ? 'white' : '#20C997',
                    '&:hover': {
                      backgroundColor: selectedView === 'flowchart' ? '#17A085' : 'rgba(32, 201, 151, 0.04)',
                      borderColor: '#20C997',
                    },
                  }}
                >
                  Flow Chart
                </Button>
                <Button
                  variant={selectedView === 'network' ? 'contained' : 'outlined'}
                  onClick={() => setSelectedView('network')}
                  startIcon={<Hub />}
                  sx={{
                    backgroundColor: selectedView === 'network' ? '#20C997' : 'transparent',
                    borderColor: '#20C997',
                    color: selectedView === 'network' ? 'white' : '#20C997',
                    '&:hover': {
                      backgroundColor: selectedView === 'network' ? '#17A085' : 'rgba(32, 201, 151, 0.04)',
                      borderColor: '#20C997',
                    },
                  }}
                >
                  Network
                </Button>
                <Button
                  variant={selectedView === 'analytics' ? 'contained' : 'outlined'}
                  onClick={() => setSelectedView('analytics')}
                  startIcon={<Analytics />}
                  sx={{
                    backgroundColor: selectedView === 'analytics' ? '#20C997' : 'transparent',
                    borderColor: '#20C997',
                    color: selectedView === 'analytics' ? 'white' : '#20C997',
                    '&:hover': {
                      backgroundColor: selectedView === 'analytics' ? '#17A085' : 'rgba(32, 201, 151, 0.04)',
                      borderColor: '#20C997',
                    },
                  }}
                >
                  Analytics
                </Button>
              </ButtonGroup>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert
          severity="error"
          onClose={() => setError('')}
          sx={{ mb: 3, borderRadius: 2 }}
        >
          {error}
        </Alert>
      )}

      {/* Organization Chart Content */}
      <Box>
        {selectedView === 'flowchart' && renderHierarchicalFlowChart()}
        {selectedView === 'network' && renderInteractiveNetwork()}
        {selectedView === 'analytics' && renderAnalyticsView()}
      </Box>

      {/* Empty State */}
      {!loading && organizationData.departments.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Business sx={{ fontSize: '4rem', color: 'text.disabled', mb: 2, opacity: 0.3 }} />
          <Typography variant="h4" sx={{ color: 'text.secondary', mb: 1 }}>
            No Organization Data
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            No departments or employees found. Start by creating departments and adding employees.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              startIcon={<Business />}
              onClick={() => window.location.href = '/admin/departments'}
              sx={{
                backgroundColor: '#20C997',
                '&:hover': {
                  backgroundColor: '#17A085',
                },
              }}
            >
              Manage Departments
            </Button>
            <Button
              variant="outlined"
              startIcon={<People />}
              onClick={() => window.location.href = '/admin/users'}
              sx={{
                borderColor: '#20C997',
                color: '#20C997',
                '&:hover': {
                  borderColor: '#17A085',
                  backgroundColor: 'rgba(32, 201, 151, 0.04)',
                },
              }}
            >
              Manage Users
            </Button>
          </Box>
        </Box>
      )}
    </Container>
  );
};

export default OrganizationChart;
