import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userAPI, teamAPI } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Button,
  Paper,
  useTheme,
  CircularProgress,
  Container,
} from '@mui/material';
import {
  People,
  PersonAdd,
  Business,
  Dashboard as DashboardIcon,
  TrendingUp,
  Groups,
  Person,
  ArrowForward,
  Settings,
  Assessment,
  Security,
  BarChart,
  Speed,
  CheckCircle,
  Headset,
  Description,
  Book,
  CheckCircle as CheckCircleIcon,
  ArrowRightAlt,
} from '@mui/icons-material';

const Dashboard = () => {
  const { user, logout, hasRole, hasAnyRole, getRoleLevel } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
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

  const getRoleColor = (role) => {
    const colors = {
      'Admin': 'error',
      'Vice President': 'primary',
      'HR BP': 'info',
      'HR Manager': 'success',
      'HR Executive': 'warning',
      'Team Manager': 'secondary',
      'Team Leader': 'default',
      'Employee': 'default',
    };
    return colors[role] || 'default';
  };

  const getRoleIcon = (role) => {
    const iconMap = {
      'Admin': Security,
      'Vice President': Speed,
      'HR BP': Business,
      'HR Manager': People,
      'HR Executive': CheckCircleIcon,
      'Team Manager': Groups,
      'Team Leader': CheckCircleIcon,
      'Employee': Person,
    };
    return iconMap[role] || Person;
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

    if (hasRole('Admin')) {
      features.push(
        { name: 'User Management', icon: People, description: 'Manage all users and roles', path: '/admin/users' },
        { name: 'System Settings', icon: Settings, description: 'Configure system settings', path: '/admin/settings' },
        { name: 'Reports & Analytics', icon: Assessment, description: 'View detailed reports', path: '/admin/reports' },
        { name: 'Audit Logs', icon: Description, description: 'View system audit logs', path: '/admin/settings/audit-logs' }
      );
    } else if (hasRole('Vice President')) {
      features.push(
        { name: 'Executive Dashboard', icon: Speed, description: 'High-level overview', path: '/dashboard' },
        { name: 'Department Reports', icon: BarChart, description: 'Department performance', path: '/admin/reports' },
        { name: 'Strategic Planning', icon: Groups, description: 'Strategic initiatives', path: '/admin/org-chart' }
      );
    } else if (hasAnyRole(['HR BP', 'HR Manager'])) {
      features.push(
        { name: 'Employee Records', icon: People, description: 'Manage employee data', path: '/admin/users' },
        { name: 'Recruitment', icon: PersonAdd, description: 'Hiring and onboarding', path: '/admin/recruitment' },
        { name: 'Performance Reviews', icon: CheckCircle, description: 'Employee evaluations', path: '/admin/performance' }
      );
    } else if (hasRole('HR Executive')) {
      features.push(
        { name: 'Employee Support', icon: Headset, description: 'Employee assistance', path: '/helpdesk' },
        { name: 'Documentation', icon: Description, description: 'HR documentation', path: '/helpdesk/faq' },
        { name: 'Training Records', icon: Book, description: 'Training management', path: '/admin/training' }
      );
    } else if (hasRole('Team Manager')) {
      features.push(
        { name: 'My Teams Dashboard', icon: Groups, description: 'Manage your teams', path: '/my-teams' },
        { name: 'Team Performance', icon: TrendingUp, description: 'Team performance metrics', path: '/admin/reports' },
        { name: 'Member Management', icon: People, description: 'Manage team members', path: '/my-teams' },
        { name: 'Team Reports', icon: BarChart, description: 'Generate team reports', path: '/admin/reports' }
      );
    } else if (hasRole('Team Leader')) {
      features.push(
        { name: 'My Team Dashboard', icon: People, description: 'Manage your team', path: '/my-team' },
        { name: 'Team Performance', icon: TrendingUp, description: 'Monitor team performance', path: '/my-team' },
        { name: 'Member Support', icon: CheckCircle, description: 'Support team members', path: '/my-team' },
        { name: 'Team Activities', icon: CheckCircle, description: 'Track team activities', path: '/my-team' }
      );
    } else {
      features.push(
        { name: 'My Profile', icon: Person, description: 'View and edit your profile', path: '/profile' },
        { name: 'Leave Management', icon: CheckCircle, description: 'Apply for leave and view history', path: '/employee/leave/apply' },
        { name: 'Help & Support', icon: Headset, description: 'Get help and support', path: '/helpdesk' },
        { name: 'Chat', icon: People, description: 'Connect with colleagues', path: '/chat' }
      );
    }

    return features;
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
          minHeight: '80vh',
        }}
      >
        <CircularProgress size={60} sx={{ color: '#20C997' }} />
      </Box>
    );
  }

  return (
    <Container maxWidth={false} sx={{ py: 3 }}>
      {/* Welcome Section */}
      <Paper
        elevation={0}
        sx={{
          mb: 4,
          background: 'linear-gradient(135deg, #0A192F 0%, #1A2B47 100%)',
          color: '#FFFFFF',
          borderRadius: 3,
          overflow: 'hidden',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.1)',
            zIndex: 1,
          },
        }}
      >
        <CardContent sx={{ p: 4, position: 'relative', zIndex: 2 }}>
          <Grid container alignItems="center" spacing={3}>
            <Grid item xs={12} md={8}>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 700,
                  mb: 1,
                  fontSize: { xs: '1.8rem', md: '2.2rem' },
                  color: '#FFFFFF',
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                  letterSpacing: '0.5px',
                }}
              >
                {getWelcomeMessage()}
              </Typography>
              <Typography 
                variant="h6" 
                sx={{ 
                  mb: 2, 
                  color: '#FFFFFF',
                  opacity: 1,
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
                  fontWeight: 500,
                }}
              >
                Welcome to your HRM dashboard. You're logged in as{' '}
                <Chip
                  label={user?.role}
                  size="small"
                  sx={{
                    bgcolor: '#20C997',
                    color: '#FFFFFF',
                    fontWeight: 600,
                    ml: 1,
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                  }}
                />
              </Typography>
              {user?.department && (
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#FFFFFF',
                    opacity: 1,
                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
                    fontWeight: 400,
                  }}
                >
                  Department: {user.department}
                </Typography>
              )}
            </Grid>
            <Grid item xs={12} md={4} sx={{ textAlign: 'center' }}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  bgcolor: 'rgba(255,255,255,0.15)',
                  border: '2px solid rgba(255,255,255,0.3)',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                }}
              >
                {React.createElement(getRoleIcon(user?.role), {
                  sx: { 
                    fontSize: '2.5rem', 
                    color: '#FFFFFF',
                    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))',
                  }
                })}
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Paper>

      {/* Stats Cards (Admin and VP only) */}
      {hasAnyRole(['Admin', 'Vice President']) && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Card
              elevation={0}
              sx={{
                textAlign: 'center',
                border: `1px solid ${theme.palette.grey[200]}`,
                borderRadius: 3,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <People sx={{ fontSize: '3rem', color: '#20C997', mb: 2 }} />
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#0A192F', mb: 1 }}>
                  {stats.totalUsers}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Total Users
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card
              elevation={0}
              sx={{
                textAlign: 'center',
                border: `1px solid ${theme.palette.grey[200]}`,
                borderRadius: 3,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <CheckCircle sx={{ fontSize: '3rem', color: '#20C997', mb: 2 }} />
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#0A192F', mb: 1 }}>
                  {stats.activeUsers}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Active Users
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card
              elevation={0}
              sx={{
                textAlign: 'center',
                border: `1px solid ${theme.palette.grey[200]}`,
                borderRadius: 3,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Business sx={{ fontSize: '3rem', color: '#20C997', mb: 2 }} />
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#0A192F', mb: 1 }}>
                  {stats.departments}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Departments
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Grid container spacing={3}>
        {/* Available Features */}
        <Grid item xs={12} lg={8}>
          <Card
            elevation={0}
            sx={{
              border: `1px solid ${theme.palette.grey[200]}`,
              borderRadius: 3,
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <DashboardIcon sx={{ color: '#20C997', mr: 2 }} />
                <Typography variant="h5" sx={{ fontWeight: 600, color: '#0A192F' }}>
                  Available Features
                </Typography>
              </Box>
              <Grid container spacing={3}>
                {getAccessibleFeatures().map((feature, index) => (
                  <Grid item xs={12} sm={6} key={index}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        border: `1px solid ${theme.palette.grey[100]}`,
                        borderRadius: 2,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                          borderColor: '#20C997',
                          boxShadow: '0 2px 8px rgba(32, 201, 151, 0.1)',
                          transform: 'translateY(-1px)',
                        },
                      }}
                      onClick={() => navigate(feature.path)}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 48,
                            height: 48,
                            borderRadius: 2,
                            bgcolor: 'rgba(32, 201, 151, 0.1)',
                            mr: 2,
                            flexShrink: 0,
                          }}
                        >
                          {React.createElement(feature.icon, {
                            sx: { fontSize: '1.5rem', color: '#20C997' }
                          })}
                        </Box>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: 600, color: '#0A192F', mb: 0.5 }}
                          >
                            {feature.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {feature.description}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                            <Typography variant="caption" sx={{ color: '#20C997', fontWeight: 500 }}>
                              Click to access
                            </Typography>
                            <ArrowRightAlt sx={{ fontSize: '1rem', color: '#20C997', ml: 0.5 }} />
                          </Box>
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Sidebar Content */}
        <Grid item xs={12} lg={4}>
          {/* Recent Users (Admin and VP only) */}
          {hasAnyRole(['Admin', 'Vice President']) && (
            <Card
              elevation={0}
              sx={{
                border: `1px solid ${theme.palette.grey[200]}`,
                borderRadius: 3,
                mb: 3,
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <People sx={{ color: '#20C997', mr: 2 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#0A192F' }}>
                    Recent Users
                  </Typography>
                </Box>
                {recentUsers.length > 0 ? (
                  <List sx={{ p: 0 }}>
                    {recentUsers.map((recentUser, index) => (
                      <ListItem key={recentUser._id} sx={{ px: 0, py: 1 }}>
                        <ListItemAvatar>
                          <Avatar
                            sx={{
                              bgcolor: '#0A192F',
                              color: 'white',
                              width: 40,
                              height: 40,
                            }}
                          >
                            {getInitials(recentUser.firstName, recentUser.lastName)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {recentUser.firstName} {recentUser.lastName}
                            </Typography>
                          }
                          secondary={recentUser.role}
                        />
                        <Chip
                          label={recentUser.isActive ? 'Active' : 'Inactive'}
                          size="small"
                          color={recentUser.isActive ? 'success' : 'default'}
                          sx={{ fontSize: '0.75rem' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                    No users found
                  </Typography>
                )}
              </CardContent>
            </Card>
          )}

          {/* Team Leader Dashboard Widget */}
          {hasRole('Team Leader') && teamData && (
            <Card
              elevation={0}
              sx={{
                border: `1px solid ${theme.palette.grey[200]}`,
                borderRadius: 3,
                mb: 3,
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Groups sx={{ color: '#20C997', mr: 2 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#0A192F' }}>
                    My Team
                  </Typography>
                </Box>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  {teamData.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Code: {teamData.code}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Team Size:
                  </Typography>
                  <Chip
                    label={`${teamData.members?.length || 0} / ${teamData.maxSize}`}
                    size="small"
                    sx={{ bgcolor: '#20C997', color: 'white' }}
                  />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    Department:
                  </Typography>
                  <Typography variant="body2">
                    {teamData.department || 'Not assigned'}
                  </Typography>
                </Box>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => navigate('/my-team')}
                  sx={{
                    bgcolor: '#20C997',
                    color: 'white',
                    '&:hover': {
                      bgcolor: '#17A085',
                    },
                  }}
                  endIcon={<ArrowForward />}
                >
                  Manage Team
                </Button>
              </CardContent>
            </Card>
          )}

          {/* User Profile Card (for other users) */}
          {!hasAnyRole(['Admin', 'Vice President']) && !hasRole('Team Leader') && !hasRole('Team Manager') && (
            <Card
              elevation={0}
              sx={{
                border: `1px solid ${theme.palette.grey[200]}`,
                borderRadius: 3,
              }}
            >
              <CardContent sx={{ p: 3, textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Person sx={{ color: '#20C997', mr: 2 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#0A192F' }}>
                    Your Profile
                  </Typography>
                </Box>
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    bgcolor: '#0A192F',
                    color: 'white',
                    mx: 'auto',
                    mb: 2,
                    fontSize: '2rem',
                    fontWeight: 700,
                  }}
                >
                  {getInitials(user?.firstName, user?.lastName)}
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  {user?.firstName} {user?.lastName}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {user?.email}
                </Typography>
                <Chip
                  label={user?.role}
                  color={getRoleColor(user?.role)}
                  sx={{ mb: 2 }}
                />
                {user?.department && (
                  <Typography variant="body2" color="text.secondary">
                    Department: {user.department}
                  </Typography>
                )}
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;
