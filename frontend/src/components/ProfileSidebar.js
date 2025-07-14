import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

const ProfileSidebar = ({ isOpen, onToggle }) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  const profileMenuItems = [
    {
      key: 'personal-info',
      title: 'Personal Info',
      icon: 'bi-person',
      path: '/profile',
      section: 'personal'
    },
    {
      key: 'work-info',
      title: 'Work Info',
      icon: 'bi-briefcase',
      path: '/profile',
      section: 'work'
    },
    {
      key: 'documents',
      title: 'Documents',
      icon: 'bi-file-earmark',
      path: '/profile',
      section: 'documents'
    },
    {
      key: 'emergency-contact',
      title: 'Emergency Contact',
      icon: 'bi-person-exclamation',
      path: '/profile',
      section: 'emergency'
    },
    {
      key: 'bank-salary',
      title: 'Bank & Salary',
      icon: 'bi-bank',
      path: '/profile',
      section: 'bank'
    },
    {
      key: 'leave-summary',
      title: 'Leave Summary',
      icon: 'bi-calendar-check',
      path: '/profile',
      section: 'leave'
    },
    {
      key: 'attendance',
      title: 'Attendance',
      icon: 'bi-clock',
      path: '/profile',
      section: 'attendance'
    },
    {
      key: 'payslips',
      title: 'Payslips',
      icon: 'bi-receipt',
      path: '/profile',
      section: 'payslips'
    },
    {
      key: 'performance',
      title: 'Performance',
      icon: 'bi-graph-up',
      path: '/profile',
      section: 'performance'
    }
  ];

  const handleSectionClick = (section) => {
    // Navigate to profile with section hash
    navigate(`/profile#${section}`);
    
    // Communicate with MyProfile component to change the active section
    if (window.profileSectionChange) {
      window.profileSectionChange(section);
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

      {/* Profile Sidebar */}
      <div 
        className={`bg-light border-end position-fixed start-0 overflow-auto`}
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
        <div className="p-3 border-bottom">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <i className="bi bi-person-circle text-primary me-2" style={{ fontSize: '1.5rem' }}></i>
              <h5 className="mb-0 text-dark">Profile Sections</h5>
            </div>
            <button 
              className="btn btn-sm btn-outline-secondary d-lg-none"
              onClick={onToggle}
            >
              <i className="bi bi-x"></i>
            </button>
          </div>
        </div>

        {/* User Info */}
        <div className="p-3 border-bottom bg-primary text-white">
          <div className="d-flex align-items-center">
            <div className="bg-white rounded-circle d-flex align-items-center justify-content-center me-3"
                 style={{ width: '50px', height: '50px' }}>
              <i className="bi bi-person text-primary" style={{ fontSize: '1.5rem' }}></i>
            </div>
            <div className="flex-grow-1">
              <div className="fw-bold">{user?.firstName} {user?.lastName}</div>
              <small className="opacity-75">{user?.email}</small>
              <div className="mt-1">
                <span className="badge bg-light text-primary">{user?.role}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-3">
          <ul className="nav flex-column">
            {profileMenuItems.map((item) => (
              <li key={item.key} className="nav-item mb-1">
                <button
                  className={`nav-link d-flex align-items-center w-100 border-0 bg-transparent text-start rounded ${
                    isActiveRoute(item.path) && location.hash === `#${item.section}` ? 'active bg-primary text-white' : 'text-dark'
                  }`}
                  onClick={() => handleSectionClick(item.section)}
                  style={{ 
                    padding: '12px 16px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!e.target.classList.contains('active')) {
                      e.target.style.backgroundColor = '#f8f9fa';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!e.target.classList.contains('active')) {
                      e.target.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <i className={`${item.icon} me-3`} style={{ fontSize: '1.1rem', width: '20px' }}></i>
                  <span>{item.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Quick Actions */}
        <div className="p-3 border-top mt-auto">
          <h6 className="text-muted mb-3">Quick Actions</h6>
          <div className="d-grid gap-2">
            <button 
              className="btn btn-outline-primary btn-sm"
              onClick={() => navigate('/dashboard')}
            >
              <i className="bi bi-speedometer2 me-2"></i>
              Go to Dashboard
            </button>
            <button 
              className="btn btn-outline-secondary btn-sm"
              onClick={() => window.print()}
            >
              <i className="bi bi-printer me-2"></i>
              Print Profile
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfileSidebar;
