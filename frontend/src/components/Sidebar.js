import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

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

    // My Profile - Available to all
    menuItems.push({
      key: 'profile',
      title: 'My Profile',
      icon: 'bi-person-circle',
      path: '/profile'
    });

    return menuItems;
  };

  const renderMenuItem = (item) => {
    if (item.submenu) {
      const isExpanded = expandedMenus[item.key];
      const hasActiveSubmenu = item.submenu.some(subItem => isActiveRoute(subItem.path));

      return (
        <li key={item.key} className="nav-item">
          <button
            className={`nav-link d-flex align-items-center w-100 border-0 bg-transparent ${
              hasActiveSubmenu ? 'active' : ''
            }`}
            onClick={() => toggleSubmenu(item.key)}
            style={{ textAlign: 'left' }}
          >
            <i className={`${item.icon} me-2`}></i>
            <span className="flex-grow-1">{item.title}</span>
            <i className={`bi bi-chevron-${isExpanded ? 'down' : 'right'} ms-auto`}></i>
          </button>
          <div className={`collapse ${isExpanded ? 'show' : ''}`}>
            <ul className="nav flex-column ms-3">
              {item.submenu.map((subItem) => (
                <li key={subItem.path} className="nav-item">
                  <button
                    className={`nav-link d-flex align-items-center w-100 border-0 bg-transparent ${
                      isActiveRoute(subItem.path) ? 'active' : ''
                    }`}
                    onClick={() => navigate(subItem.path)}
                    style={{ textAlign: 'left' }}
                  >
                    <i className={`${subItem.icon} me-2`}></i>
                    {subItem.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </li>
      );
    } else {
      return (
        <li key={item.key} className="nav-item">
          <button
            className={`nav-link d-flex align-items-center w-100 border-0 bg-transparent ${
              isActiveRoute(item.path) ? 'active' : ''
            }`}
            onClick={() => navigate(item.path)}
            style={{ textAlign: 'left' }}
          >
            <i className={`${item.icon} me-2`}></i>
            {item.title}
          </button>
        </li>
      );
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 d-lg-none"
          style={{ zIndex: 1040 }}
          onClick={onToggle}
        ></div>
      )}

      {/* Sidebar */}
      <div 
        className={`bg-dark text-white position-fixed start-0 overflow-auto`}
        style={{ 
          width: '280px', 
          top: '56px', // Start below the navbar
          height: 'calc(100vh - 56px)', // Full height minus navbar
          zIndex: 1050,
          transition: 'transform 0.3s ease-in-out',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)'
        }}
      >
        {/* Sidebar Header */}
        <div className="p-3 border-bottom border-secondary">
          <div className="d-flex align-items-center justify-content-between">

            <button 
              className="btn btn-sm btn-outline-light d-lg-none"
              onClick={onToggle}
            >
              <i className="bi bi-x"></i>
            </button>
          </div>
        </div>

        {/* User Info */}
        <div className="p-3 border-bottom border-secondary">
          <div className="d-flex align-items-center">
            <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center me-3"
                 style={{ width: '40px', height: '40px' }}>
              <i className="bi bi-person text-white"></i>
            </div>
            <div className="flex-grow-1">
              <div className="fw-semibold">{user?.firstName} {user?.lastName}</div>
              <small className="text-muted">{user?.role}</small>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-3">
          <ul className="nav flex-column">
            {getMenuItems().map(renderMenuItem)}
          </ul>
        </nav>
      </div>
    </>
  );
};

export default Sidebar;
