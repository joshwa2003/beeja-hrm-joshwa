import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { userAPI } from '../../utils/api';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  ButtonGroup,
  Pagination,
  Container,
  Paper,
  Divider,
  IconButton,
} from '@mui/material';
import {
  People,
  Security,
  Business,
  Groups,
  Info,
  CheckCircle,
  Cancel,
  Close,
  Person,
  Phone,
  Email,
  CalendarToday,
} from '@mui/icons-material';

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

  const getRoleChipColor = (role) => {
    const colors = {
      'Admin': 'error',
      'Vice President': 'primary',
      'HR BP': 'info',
      'HR Manager': 'success',
      'HR Executive': 'warning',
      'Team Manager': 'secondary',
      'Team Leader': 'default',
      'Employee': 'default'
    };
    return colors[role] || 'default';
  };

  const getInitials = (firstName, lastName) => {
    if (!firstName && !lastName) return 'U';
    const first = firstName ? firstName.charAt(0).toUpperCase() : '';
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';
    return first + last;
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
        }}
      >
        <CircularProgress size={60} sx={{ color: '#20C997' }} />
      </Box>
    );
  }

  return (
    <Container maxWidth={false} sx={{ py: 3 }}>
      {/* Header Section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#0A192F', mb: 1 }}>
            User Roles Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage user roles, permissions, and role-based access control
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Chip label={`${summary.totalUsers} Total Users`} color="primary" sx={{ fontWeight: 600 }} />
          <Chip label={`${summary.activeUsers} Active`} color="success" sx={{ fontWeight: 600 }} />
          <Chip label={`${summary.inactiveUsers} Inactive`} color="error" sx={{ fontWeight: 600 }} />
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert
          severity="error"
          onClose={() => setError('')}
          sx={{ mb: 3 }}
        >
          {error}
        </Alert>
      )}

      {/* Role Statistics Overview */}
      <Card sx={{ mb: 4, borderRadius: 3 }}>
        <CardHeader
          title={
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', fontWeight: 600 }}>
              <People sx={{ mr: 1 }} />
              Role Distribution Overview
            </Typography>
          }
        />
        <CardContent>
          <Grid container spacing={3}>
            {roleStats
              .sort((a, b) => getRoleHierarchyLevel(a.role) - getRoleHierarchyLevel(b.role))
              .map((roleStat) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={roleStat.role}>
                  <Card
                    sx={{
                      height: '100%',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 4,
                      },
                    }}
                    onClick={() => handleRoleSelect(roleStat.role)}
                  >
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Chip
                          label={roleStat.role}
                          color={getRoleChipColor(roleStat.role)}
                          sx={{ fontWeight: 600 }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          Level {getRoleHierarchyLevel(roleStat.role)}
                        </Typography>
                      </Box>
                      <Typography variant="h3" sx={{ color: '#20C997', mb: 1, fontWeight: 700 }}>
                        {roleStat.totalCount}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Total Users
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', color: 'success.main' }}>
                          <CheckCircle sx={{ fontSize: '1rem', mr: 0.5 }} />
                          <Typography variant="caption">
                            {roleStat.activeCount} Active
                          </Typography>
                        </Box>
                        {roleStat.inactiveCount > 0 && (
                          <Box sx={{ display: 'flex', alignItems: 'center', color: 'error.main' }}>
                            <Cancel sx={{ fontSize: '1rem', mr: 0.5 }} />
                            <Typography variant="caption">
                              {roleStat.inactiveCount} Inactive
                            </Typography>
                          </Box>
                        )}
                      </Box>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="caption" color="text.secondary">
                        {getRoleDescription(roleStat.role)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Role Hierarchy Information */}
      <Card sx={{ mb: 4, borderRadius: 3 }}>
        <CardHeader
          title={
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', fontWeight: 600 }}>
              <Security sx={{ mr: 1 }} />
              Role Hierarchy & Permissions
            </Typography>
          }
        />
        <CardContent>
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Info sx={{ mr: 1 }} />
              Role Hierarchy Levels
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Lower numbers indicate higher authority levels. Users can typically manage users with higher level numbers.
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
                  <li><strong>Level 1:</strong> Admin - Full system control</li>
                  <li><strong>Level 2:</strong> Vice President - Executive oversight</li>
                  <li><strong>Level 3:</strong> HR BP - HR Business Partner</li>
                  <li><strong>Level 4:</strong> HR Manager - HR Management</li>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
                  <li><strong>Level 5:</strong> HR Executive - HR Operations</li>
                  <li><strong>Level 6:</strong> Team Manager - Multi-team management</li>
                  <li><strong>Level 7:</strong> Team Leader - Team leadership</li>
                  <li><strong>Level 8:</strong> Employee - Standard access</li>
                </Box>
              </Grid>
            </Grid>
          </Alert>
        </CardContent>
      </Card>

      {/* Selected Role Details */}
      {selectedRole && (
        <Card sx={{ borderRadius: 3 }}>
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Chip
                  label={selectedRole}
                  color={getRoleChipColor(selectedRole)}
                  sx={{ mr: 2, fontWeight: 600 }}
                />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Role Details
                </Typography>
              </Box>
            }
            action={
              <IconButton
                onClick={() => setSelectedRole('')}
                sx={{ color: 'text.secondary' }}
              >
                <Close />
              </IconButton>
            }
          />
          <CardContent>
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={8}>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  {getRoleDescription(selectedRole)}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Chip
                    label={`Hierarchy Level: ${getRoleHierarchyLevel(selectedRole)}`}
                    color="primary"
                    variant="outlined"
                  />
                  <Chip
                    label={`Total Users: ${roleStats.find(r => r.role === selectedRole)?.totalCount || 0}`}
                    color="info"
                    variant="outlined"
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <ButtonGroup fullWidth>
                  <Button
                    variant={statusFilter === 'all' ? 'contained' : 'outlined'}
                    onClick={() => handleStatusFilter('all')}
                    sx={{
                      backgroundColor: statusFilter === 'all' ? '#20C997' : 'transparent',
                      '&:hover': {
                        backgroundColor: statusFilter === 'all' ? '#17A085' : 'rgba(32, 201, 151, 0.04)',
                      },
                    }}
                  >
                    All Users
                  </Button>
                  <Button
                    variant={statusFilter === 'active' ? 'contained' : 'outlined'}
                    color="success"
                    onClick={() => handleStatusFilter('active')}
                  >
                    Active
                  </Button>
                  <Button
                    variant={statusFilter === 'inactive' ? 'contained' : 'outlined'}
                    color="error"
                    onClick={() => handleStatusFilter('inactive')}
                  >
                    Inactive
                  </Button>
                </ButtonGroup>
              </Grid>
            </Grid>

            {loadingUsers ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={60} sx={{ color: '#20C997' }} />
              </Box>
            ) : roleUsers.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <People sx={{ fontSize: '4rem', color: 'text.disabled', mb: 2 }} />
                <Typography variant="h5" sx={{ color: 'text.secondary', mb: 1 }}>
                  No users found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  No users with {selectedRole} role match the current filter
                </Typography>
              </Box>
            ) : (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600, color: '#0A192F' }}>Employee</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#0A192F' }}>Employee ID</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#0A192F' }}>Department</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#0A192F' }}>Team</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#0A192F' }}>Contact</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#0A192F' }}>Joining Date</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#0A192F' }}>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {roleUsers.map((userData) => (
                        <TableRow key={userData._id} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Avatar
                                sx={{
                                  bgcolor: '#0A192F',
                                  color: 'white',
                                  width: 40,
                                  height: 40,
                                  mr: 2,
                                  fontWeight: 600,
                                }}
                              >
                                {getInitials(userData.firstName, userData.lastName)}
                              </Avatar>
                              <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                  {userData.firstName} {userData.lastName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {userData.email}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={userData.employeeId || 'Not assigned'}
                              variant="outlined"
                              size="small"
                              sx={{ fontFamily: 'monospace' }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {userData.department?.name || 'Not assigned'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {userData.team?.name || 'Not assigned'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                <Phone sx={{ fontSize: '0.875rem', mr: 0.5, color: 'text.secondary' }} />
                                {userData.phoneNumber || 'Not provided'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {userData.designation || 'Not specified'}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                              <CalendarToday sx={{ fontSize: '0.875rem', mr: 0.5, color: 'text.secondary' }} />
                              {formatDate(userData.joiningDate)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={userData.isActive ? 'Active' : 'Inactive'}
                              color={userData.isActive ? 'success' : 'error'}
                              size="small"
                              sx={{ fontWeight: 500 }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {totalPages > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                    <Pagination
                      count={totalPages}
                      page={currentPage}
                      onChange={(event, page) => setCurrentPage(page)}
                      color="primary"
                      size="large"
                      sx={{
                        '& .MuiPaginationItem-root': {
                          '&.Mui-selected': {
                            backgroundColor: '#20C997',
                            '&:hover': {
                              backgroundColor: '#17A085',
                            },
                          },
                        },
                      }}
                    />
                  </Box>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default UserRoles;
