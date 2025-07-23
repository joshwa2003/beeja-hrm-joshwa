import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Typography,
  Divider,
  Avatar,
  Chip,
  useTheme,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People,
  PersonAdd,
  Badge,
  Business,
  Groups,
  AccountTree,
  CalendarMonth,
  RequestPage,
  History,
  AttachMoney,
  Work,
  TrendingUp,
  School,
  Assessment,
  Settings,
  Chat,
  Help,
  Person,
  ExpandLess,
  ExpandMore,
} from '@mui/icons-material';

const Sidebar = ({ isOpen, onToggle }) => {
  const { user, hasRole, hasAnyRole, getRoleLevel } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedMenus, setExpandedMenus] = useState({});

  const toggleSubmenu = (menuKey) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  const isActiveRoute = (path) => {
    return location.pathname.startsWith(path);
  };

  const getMenuItems = () => {
    const menuItems = [];

    // Dashboard - Available to all
    menuItems.push({
      key: 'dashboard',
      title: 'Dashboard',
      icon: 'bi-speedometer2',
      path: '/dashboard',
      roles: ['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader', 'Employee']
    });

    // User Management - Admin, VP, HR roles, Team Leaders, Team Managers
    if (hasAnyRole(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader'])) {
      menuItems.push({
        key: 'user-management',
        title: 'User Management',
        icon: 'bi-people',
        submenu: [
          { title: 'All Users', path: '/admin/users', icon: 'bi-person-lines-fill' },
          { title: 'Add User', path: '/admin/users/add', icon: 'bi-person-plus' },
          { title: 'User Roles', path: '/admin/users/roles', icon: 'bi-person-badge' }
        ]
      });
    }

    // Department & Team Management - Admin, VP, HR roles
    if (hasAnyRole(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive'])) {
      menuItems.push({
        key: 'dept-team',
        title: 'Departments & Teams',
        icon: 'bi-diagram-3',
        submenu: [
          { title: 'Departments', path: '/admin/departments', icon: 'bi-building' },
          { title: 'Teams', path: '/admin/teams', icon: 'bi-people' },
          { title: 'Organization Chart', path: '/admin/org-chart', icon: 'bi-diagram-2' }
        ]
      });
    }

    // Team Management for Team Managers
    if (hasRole('Team Manager')) {
      menuItems.push({
        key: 'my-teams',
        title: 'My Teams',
        icon: 'bi-diagram-3',
        path: '/my-teams'
      });
    }

    // Team Management for Team Leaders
    if (hasRole('Team Leader')) {
      menuItems.push({
        key: 'my-team',
        title: 'My Team',
        icon: 'bi-people',
        path: '/my-team'
      });
    }

    // Leave & Attendance Management
    if (hasAnyRole(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader'])) {
      const leaveSubmenu = [
        { title: 'Leave Requests', path: '/admin/leave/requests', icon: 'bi-calendar-check' },
        { title: 'Leave Policies', path: '/admin/leave/policies', icon: 'bi-file-text' },
        { title: 'Holiday Calendar', path: '/admin/leave/holidays', icon: 'bi-calendar-event' }
      ];

      const attendanceSubmenu = [
        { title: 'Attendance Records', path: '/admin/attendance/records', icon: 'bi-clock-history' },
        { title: 'Attendance Reports', path: '/admin/attendance/reports', icon: 'bi-graph-up' },
        { title: 'Regularization', path: '/admin/attendance/regularization', icon: 'bi-pencil-square' }
      ];

      menuItems.push({
        key: 'leave-attendance',
        title: 'Leave & Attendance',
        icon: 'bi-calendar3',
        submenu: [...leaveSubmenu, ...attendanceSubmenu]
      });
    }

    // Employee self-service (available to all roles for their own leave management)
    if (hasAnyRole(['Employee', 'Team Leader', 'Team Manager', 'HR Executive', 'HR Manager', 'HR BP', 'Vice President', 'Admin'])) {
      menuItems.push({
        key: 'my-leave-attendance',
        title: 'My Leave & Attendance',
        icon: 'bi-calendar3',
        submenu: [
          { title: 'Apply Leave', path: '/employee/leave/apply', icon: 'bi-calendar-plus' },
          { title: 'My Leave History', path: '/employee/leave/history', icon: 'bi-calendar-check' },
          { title: 'My Attendance', path: '/employee/attendance', icon: 'bi-clock' }
        ]
      });
    }

    // Payroll Management - Admin, VP, HR roles
    if (hasAnyRole(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive'])) {
      menuItems.push({
        key: 'payroll',
        title: 'Payroll Management',
        icon: 'bi-currency-dollar',
        submenu: [
          { title: 'Salary Structure', path: '/admin/payroll/structure', icon: 'bi-calculator' },
          { title: 'Process Payroll', path: '/admin/payroll/process', icon: 'bi-gear' },
          { title: 'Payslips', path: '/admin/payroll/payslips', icon: 'bi-file-earmark-text' },
          { title: 'Reimbursements', path: '/admin/payroll/reimbursements', icon: 'bi-receipt' }
        ]
      });
    }

    // Recruitment Management - Admin, VP, HR roles
    if (hasAnyRole(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive'])) {
      menuItems.push({
        key: 'recruitment',
        title: 'Recruitment',
        icon: 'bi-person-plus',
        submenu: [
          { title: 'Job Postings', path: '/admin/recruitment/jobs', icon: 'bi-briefcase' },
          { title: 'Applications', path: '/admin/recruitment/applications', icon: 'bi-file-person' },
          { title: 'Interviews', path: '/admin/recruitment/interviews', icon: 'bi-chat-dots' },
          { title: 'Offer Letters', path: '/admin/recruitment/offers', icon: 'bi-envelope-check' }
        ]
      });
    }

    // Performance Management
    if (hasAnyRole(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader'])) {
      menuItems.push({
        key: 'performance',
        title: 'Performance',
        icon: 'bi-graph-up-arrow',
        submenu: [
          { title: 'Performance Reviews', path: '/admin/performance/reviews', icon: 'bi-clipboard-check' },
          { title: 'Goals & KPIs', path: '/admin/performance/goals', icon: 'bi-target' },
          { title: 'Appraisals', path: '/admin/performance/appraisals', icon: 'bi-star' },
          { title: 'Feedback', path: '/admin/performance/feedback', icon: 'bi-chat-square-text' }
        ]
      });
    } else if (hasRole('Employee')) {
      menuItems.push({
        key: 'my-performance',
        title: 'My Performance',
        icon: 'bi-graph-up-arrow',
        submenu: [
          { title: 'My Goals', path: '/employee/performance/goals', icon: 'bi-target' },
          { title: 'My Reviews', path: '/employee/performance/reviews', icon: 'bi-clipboard-check' },
          { title: 'Self Assessment', path: '/employee/performance/self-assessment', icon: 'bi-pencil-square' }
        ]
      });
    }

    // Training Management
    if (hasAnyRole(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader'])) {
      menuItems.push({
        key: 'training',
        title: 'Training',
        icon: 'bi-book',
        submenu: [
          { title: 'Training Programs', path: '/admin/training/programs', icon: 'bi-collection' },
          { title: 'Training Calendar', path: '/admin/training/calendar', icon: 'bi-calendar-week' },
          { title: 'Certifications', path: '/admin/training/certifications', icon: 'bi-award' },
          { title: 'Training Reports', path: '/admin/training/reports', icon: 'bi-graph-up' }
        ]
      });
    } else if (hasRole('Employee')) {
      menuItems.push({
        key: 'my-training',
        title: 'My Training',
        icon: 'bi-book',
        submenu: [
          { title: 'Available Trainings', path: '/employee/training/available', icon: 'bi-collection' },
          { title: 'My Trainings', path: '/employee/training/enrolled', icon: 'bi-bookmark-check' },
          { title: 'Certificates', path: '/employee/training/certificates', icon: 'bi-award' }
        ]
      });
    }

    // Reports & Analytics
    if (hasAnyRole(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader'])) {
      const reportSubmenu = [
        { title: 'Employee Reports', path: '/admin/reports/employees', icon: 'bi-people' },
        { title: 'Attendance Reports', path: '/admin/reports/attendance', icon: 'bi-clock' },
        { title: 'Leave Reports', path: '/admin/reports/leave', icon: 'bi-calendar' },
        { title: 'Performance Reports', path: '/admin/reports/performance', icon: 'bi-graph-up' }
      ];

      if (hasAnyRole(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive'])) {
        reportSubmenu.push(
          { title: 'Payroll Reports', path: '/admin/reports/payroll', icon: 'bi-currency-dollar' },
          { title: 'Training Reports', path: '/admin/reports/training', icon: 'bi-book' },
          { title: 'Custom Reports', path: '/admin/reports/custom', icon: 'bi-sliders' }
        );
      }

      menuItems.push({
        key: 'reports',
        title: 'Reports & Analytics',
        icon: 'bi-bar-chart',
        submenu: reportSubmenu
      });
    }

    // System Settings - Admin only
    if (hasRole('Admin')) {
      menuItems.push({
        key: 'settings',
        title: 'System Settings',
        icon: 'bi-gear',
        submenu: [
          { title: 'General Settings', path: '/admin/settings/general', icon: 'bi-sliders' },
          { title: 'User Roles & Permissions', path: '/admin/settings/roles', icon: 'bi-shield-check' },
          { title: 'Approval Workflows', path: '/admin/settings/workflows', icon: 'bi-diagram-2' },
          { title: 'Email Templates', path: '/admin/settings/email-templates', icon: 'bi-envelope' },
          { title: 'Audit Logs', path: '/admin/settings/audit-logs', icon: 'bi-journal-text' },
          { title: 'Backup & Restore', path: '/admin/settings/backup', icon: 'bi-cloud-download' }
        ]
      });
    }

    // Chat System - Available to all
    if (hasAnyRole(['Employee', 'Team Leader', 'Team Manager', 'HR Executive', 'HR Manager', 'HR BP', 'Vice President', 'Admin'])) {
      menuItems.push({
        key: 'chat',
        title: 'Messages',
        icon: 'bi-chat-dots',
        path: '/chat'
      });
    }

    // Helpdesk - Available to all
    if (hasAnyRole(['Employee', 'Team Leader', 'Team Manager', 'HR Executive', 'HR Manager', 'HR BP', 'Vice President', 'Admin'])) {
      const helpdeskSubmenu = [
        { title: 'Dashboard', path: '/helpdesk', icon: 'bi-speedometer2' },
        { title: 'Create Ticket', path: '/helpdesk/create', icon: 'bi-plus-circle' },
        { title: 'My Tickets', path: '/helpdesk/my-tickets', icon: 'bi-ticket-perforated' },
        { title: 'FAQ', path: '/helpdesk/faq', icon: 'bi-question-circle' }
      ];

      // Add HR-specific helpdesk items
      if (hasAnyRole(['HR Executive', 'HR Manager', 'HR BP', 'Vice President', 'Admin'])) {
        helpdeskSubmenu.push(
          { title: 'All Tickets', path: '/helpdesk/all-tickets', icon: 'bi-list-ul' },
          { title: 'Manage FAQs', path: '/helpdesk/manage-faq', icon: 'bi-gear' },
          { title: 'Reports', path: '/helpdesk/reports', icon: 'bi-graph-up' }
        );
      }

      menuItems.push({
        key: 'helpdesk',
        title: 'Helpdesk',
        icon: 'bi-headset',
        submenu: helpdeskSubmenu
      });
    }

    // My Profile - Available to all
    menuItems.push({
      key: 'profile',
      title: 'My Profile',
      icon: 'bi-person-circle',
      path: '/profile'
    });

    return menuItems;
  };

  const getIconComponent = (iconName) => {
    const iconMap = {
      'bi-speedometer2': DashboardIcon,
      'bi-people': People,
      'bi-person-plus': PersonAdd,
      'bi-person-badge': Badge,
      'bi-building': Business,
      'bi-diagram-3': Groups,
      'bi-diagram-2': AccountTree,
      'bi-calendar3': CalendarMonth,
      'bi-calendar-plus': RequestPage,
      'bi-calendar-check': History,
      'bi-currency-dollar': AttachMoney,
      'bi-briefcase': Work,
      'bi-graph-up-arrow': TrendingUp,
      'bi-book': School,
      'bi-bar-chart': Assessment,
      'bi-gear': Settings,
      'bi-chat-dots': Chat,
      'bi-headset': Help,
      'bi-person-circle': Person,
    };
    return iconMap[iconName] || DashboardIcon;
  };

  const theme = useTheme();

  const renderMenuItem = (item) => {
    if (item.submenu) {
      const isExpanded = expandedMenus[item.key];
      const hasActiveSubmenu = item.submenu.some(subItem => isActiveRoute(subItem.path));
      const IconComponent = getIconComponent(item.icon);

      return (
        <React.Fragment key={item.key}>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => toggleSubmenu(item.key)}
              selected={hasActiveSubmenu}
              sx={{
                borderRadius: 2,
                mx: 1,
                mb: 0.5,
                py: 1.5,
                transition: 'all 0.2s ease-in-out',
                '&.Mui-selected': {
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  transform: 'translateX(4px)',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.25)',
                  },
                },
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  transform: 'translateX(2px)',
                },
              }}
            >
              <ListItemIcon 
                sx={{ 
                  color: 'inherit', 
                  minWidth: 40,
                  '& .MuiSvgIcon-root': {
                    fontSize: '1.3rem',
                    filter: hasActiveSubmenu ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' : 'none',
                  }
                }}
              >
                <IconComponent />
              </ListItemIcon>
              <ListItemText 
                primary={item.title}
                primaryTypographyProps={{
                  fontSize: '0.9rem',
                  fontWeight: hasActiveSubmenu ? 600 : 500,
                  color: 'white',
                  textShadow: hasActiveSubmenu ? '0 1px 2px rgba(0,0,0,0.2)' : 'none',
                }}
              />
              <Box 
                sx={{ 
                  transition: 'transform 0.2s ease-in-out',
                  transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                }}
              >
                <ExpandLess sx={{ fontSize: '1.2rem' }} />
              </Box>
            </ListItemButton>
          </ListItem>
          <Collapse in={isExpanded} timeout={300} unmountOnExit>
            <List component="div" disablePadding sx={{ pl: 1 }}>
              {item.submenu.map((subItem) => {
                const SubIconComponent = getIconComponent(subItem.icon);
                const isSubActive = isActiveRoute(subItem.path);
                return (
                  <ListItem key={subItem.path} disablePadding>
                    <ListItemButton
                      onClick={() => navigate(subItem.path)}
                      selected={isSubActive}
                      sx={{
                        pl: 3,
                        py: 1,
                        borderRadius: 2,
                        mx: 1,
                        mb: 0.3,
                        transition: 'all 0.2s ease-in-out',
                        '&.Mui-selected': {
                          backgroundColor: 'rgba(255,255,255,0.25)',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                          transform: 'translateX(6px)',
                          '&:hover': {
                            backgroundColor: 'rgba(255,255,255,0.3)',
                          },
                        },
                        '&:hover': {
                          backgroundColor: 'rgba(255,255,255,0.15)',
                          transform: 'translateX(3px)',
                        },
                      }}
                    >
                      <ListItemIcon 
                        sx={{ 
                          color: 'inherit', 
                          minWidth: 36,
                          '& .MuiSvgIcon-root': {
                            fontSize: '1.1rem',
                            filter: isSubActive ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' : 'none',
                          }
                        }}
                      >
                        <SubIconComponent />
                      </ListItemIcon>
                      <ListItemText 
                        primary={subItem.title}
                        primaryTypographyProps={{
                          fontSize: '0.85rem',
                          fontWeight: isSubActive ? 600 : 400,
                          color: 'white',
                          textShadow: isSubActive ? '0 1px 2px rgba(0,0,0,0.2)' : 'none',
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Collapse>
        </React.Fragment>
      );
    } else {
      const IconComponent = getIconComponent(item.icon);
      const isActive = isActiveRoute(item.path);
      return (
        <ListItem key={item.key} disablePadding>
          <ListItemButton
            onClick={() => navigate(item.path)}
            selected={isActive}
            sx={{
              borderRadius: 2,
              mx: 1,
              mb: 0.5,
              py: 1.5,
              transition: 'all 0.2s ease-in-out',
              '&.Mui-selected': {
                backgroundColor: 'rgba(255,255,255,0.2)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                transform: 'translateX(4px)',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.25)',
                },
              },
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.1)',
                transform: 'translateX(2px)',
              },
            }}
          >
            <ListItemIcon 
              sx={{ 
                color: 'inherit', 
                minWidth: 40,
                '& .MuiSvgIcon-root': {
                  fontSize: '1.3rem',
                  filter: isActive ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' : 'none',
                }
              }}
            >
              <IconComponent />
            </ListItemIcon>
            <ListItemText 
              primary={item.title}
              primaryTypographyProps={{
                fontSize: '0.9rem',
                fontWeight: isActive ? 600 : 500,
                color: 'white',
                textShadow: isActive ? '0 1px 2px rgba(0,0,0,0.2)' : 'none',
              }}
            />
          </ListItemButton>
        </ListItem>
      );
    }
  };

  const getInitials = (firstName, lastName) => {
    if (!firstName && !lastName) return 'U';
    const first = firstName ? firstName.charAt(0).toUpperCase() : '';
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';
    return first + last;
  };

  const getRoleColor = (role) => {
    const roleColors = {
      'Admin': 'error',
      'Vice President': 'primary',
      'HR BP': 'info',
      'HR Manager': 'success',
      'HR Executive': 'warning',
      'Team Manager': 'secondary',
      'Team Leader': 'default',
      'Employee': 'default',
    };
    return roleColors[role] || 'default';
  };

  return (
    <Box 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
      }}
    >
      {/* User Info Section */}
      <Box 
        sx={{ 
          p: 3, 
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar
            sx={{
              width: 48,
              height: 48,
              bgcolor: 'rgba(255,255,255,0.15)',
              color: 'white',
              mr: 2,
              fontWeight: 700,
              fontSize: '1.2rem',
              border: '2px solid rgba(255,255,255,0.2)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            {getInitials(user?.firstName, user?.lastName)}
          </Avatar>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                fontWeight: 700, 
                color: 'white',
                fontSize: '0.95rem',
                lineHeight: 1.2,
                textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user?.firstName} {user?.lastName}
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'rgba(255,255,255,0.8)',
                fontSize: '0.75rem',
                display: 'block',
                mt: 0.5,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user?.email}
            </Typography>
            <Chip
              label={user?.role}
              size="small"
              sx={{ 
                height: 22, 
                fontSize: '0.7rem',
                fontWeight: 600,
                mt: 1,
                bgcolor: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                '& .MuiChip-label': {
                  px: 1.5,
                },
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.25)',
                }
              }}
            />
          </Box>
        </Box>
      </Box>

      {/* Navigation Menu */}
      <Box 
        sx={{ 
          flexGrow: 1, 
          overflow: 'auto',
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'rgba(255,255,255,0.1)',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(255,255,255,0.3)',
            borderRadius: '3px',
            '&:hover': {
              background: 'rgba(255,255,255,0.4)',
            },
          },
        }}
      >
        <List sx={{ py: 2, px: 1 }}>
          {getMenuItems().map(renderMenuItem)}
        </List>
      </Box>
    </Box>
  );
};

export default Sidebar;
